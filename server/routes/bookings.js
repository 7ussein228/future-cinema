import express from 'express'
import { getDb, saveDb, nextId, withBookingLock } from '../db.js'
import { xpayConfigured, createPayment, inquiryOrder, refundPayment } from '../xpay.js'
import { optionalAuth, authRequired } from './auth.js'

// Simple in-memory rate limiter for Avengers surge: 10 bookings/min per IP
const rateMap = new Map()
function bookingRateLimit(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown'
  const now = Date.now()
  const windowMs = 60 * 1000
  const max = 12
  let rec = rateMap.get(ip)
  if (!rec || now - rec.start > windowMs) rec = { start: now, count: 0 }
  rec.count += 1
  rateMap.set(ip, rec)
  if (rec.count > max) return res.status(429).json({ message: 'Too many requests, please try again shortly' })
  next()
}

function parseShowtimeDateTime(booking) {
  if (!booking || !booking.date || !booking.time) return null
  const dateStr = String(booking.date).trim()
  const timeStr = String(booking.time).trim()
  // Handle YYYY-MM-DD + HH:mm (or HH:mm:ss)
  let iso = `${dateStr}T${timeStr}`
  // Ensure seconds present for consistent parsing
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(iso)) iso += ':00'
  let d = new Date(iso)
  if (!isNaN(d.getTime())) return d
  // Fallback: try with space separator
  d = new Date(`${dateStr} ${timeStr}`)
  if (!isNaN(d.getTime())) return d
  return null
}

async function refundXPay(booking) {
  const sid = booking.xpaySessionId || booking.paymobOrderId || booking.xpayTxnId
  if (!sid) return null
  if (!xpayConfigured()) {
    console.log(`refundXPay skipped (not configured) for booking ${booking.id}`)
    return null
  }
  try {
    const result = await refundPayment({ sessionId: sid, amount: booking.total })
    console.log(`XPay refund success for booking ${booking.id}`, result?.id || '')
    return result
  } catch (e) {
    console.error(`XPay refund failed for booking ${booking.id}:`, e.message)
    throw e
  }
}

const router = express.Router()

const PENDING_TTL_MS = 30 * 60 * 1000

function releaseStalePending(db) {
  const now = Date.now()
  for (const b of db.bookings) {
    if (b.status === 'pending' && b.createdAt && now - new Date(b.createdAt).getTime() > PENDING_TTL_MS) {
      b.status = 'cancelled'
    }
  }
}

function validateCoupon(db, code, subtotal, seatPrice, seatCount) {
  if (!code) return { coupon: null, discountAmount: 0 }
  const couponCode = String(code).trim().toUpperCase()
  if (!couponCode) return { coupon: null, discountAmount: 0 }
  const coupon = (db.coupons || []).find(c => c.code === couponCode)
  if (!coupon || !coupon.active) throw Object.assign(new Error('Invalid coupon'), { status: 400 })
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) throw Object.assign(new Error('Coupon expired'), { status: 400 })
  if ((coupon.minAmount || 0) > subtotal) throw Object.assign(new Error(`Coupon requires minimum ${coupon.minAmount} EGP`), { status: 400 })
  let discount = 0
  if (coupon.type === 'seats_free') {
    // خصم كامل على الكراسي بحد أقصى (maxSeats) كرسي
    const maxSeats = Number(coupon.maxSeats) > 0 ? Number(coupon.maxSeats) : 2
    const n = Math.max(0, Number(seatCount) || 0)
    discount = Math.min(n, maxSeats) * (Number(seatPrice) || 0)
  } else if (coupon.type === 'percent') {
    discount = Math.round(subtotal * coupon.discount)
  } else {
    discount = Math.min(coupon.discount, subtotal)
  }
  return { coupon: coupon.code, discountAmount: discount, couponObj: coupon }
}

router.post('/validate-coupon', (req, res) => {
  const { code, concessions, showtimeId, seats } = req.body || {}
  const db = getDb()
  try {
    // compute subtotal for validation if showtime provided
    let concessionsTotal = 0
    if (Array.isArray(concessions) && concessions.length) {
      const map = new Map((db.concessions || []).map(c => [c.id, c]))
      for (const id of concessions) {
        const item = map.get(String(id))
        if (!item) return res.status(400).json({ valid: false, message: `Invalid concession ${id}` })
        concessionsTotal += item.price
      }
    }
    let seatsTotal = 0
    let seatPrice = 0
    const serviceFee = 0
    if (showtimeId && Array.isArray(seats)) {
      const showtime = db.showtimes.find(s => s.id === showtimeId)
      if (showtime) {
        seatPrice = Number(showtime.price) || 100
        seatsTotal = seats.length * seatPrice
      }
    }
    const seatCount = Array.isArray(seats) ? seats.length : 0
    const subtotal = seatsTotal + concessionsTotal
    const { coupon, discountAmount, couponObj } = validateCoupon(db, code, subtotal || Number(code && db.coupons?.find(c=>c.code===String(code).toUpperCase())?.minAmount || 0), seatPrice, seatCount)
    if (!coupon) return res.status(400).json({ valid: false, message: 'Invalid coupon' })
    res.json({ valid: true, coupon, discountAmount, discount: couponObj.discount, type: couponObj.type })
  } catch (e) {
    return res.status(e.status || 400).json({ valid: false, message: e.message || 'Invalid coupon' })
  }
})

router.post('/', optionalAuth, bookingRateLimit, async (req, res) => {
  const { showtimeId, seats, phone, name, concessions, coupon } = req.body || {}
  const customerPhone = String(phone || '').replace(/[\s-]/g, '')
  const customerName = String(name || '').trim()
  if (!showtimeId || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ message: 'Showtime and seats are required' })
  }
  if (!/^01[0125][0-9]{8}$/.test(customerPhone)) {
    return res.status(400).json({ message: 'Valid Egyptian mobile number is required (e.g. 01012345678)' })
  }
  if (!customerName || customerName.length < 3) {
    return res.status(400).json({ message: 'Full name is required' })
  }

  // Quick showtime existence check before lock (fail fast)
  const db0 = getDb()
  const showtime0 = db0.showtimes.find((s) => s.id === showtimeId)
  if (!showtime0) return res.status(404).json({ message: 'Showtime not found' })

  // Critical section: seat check + booking creation serialized per showtime (Avengers Doomsday ready)
  let booking
  try {
    booking = await withBookingLock(showtimeId, async () => {
      const db = getDb()
      releaseStalePending(db)
      const showtime = db.showtimes.find((s) => s.id === showtimeId)
      if (!showtime) throw Object.assign(new Error('Showtime not found'), { status: 404 })

      const taken = new Set()
      for (const b of db.bookings) {
        if (b.showtimeId === showtime.id && b.status !== 'cancelled') {
          for (const seat of b.seats) taken.add(seat)
        }
      }
      const conflicts = seats.filter((s) => taken.has(s))
      if (conflicts.length) {
        throw Object.assign(new Error(`Seats already booked: ${conflicts.join(', ')}`), { status: 409 })
      }

      const seatPrice = Number(showtime.price) || 100
      const serviceFee = 0
      const concessionIds = Array.isArray(concessions) ? concessions : []
      const concessionMap = new Map((db.concessions || []).map(c => [c.id, c]))
      const invalidConcessions = concessionIds.filter(id => !concessionMap.has(String(id)))
      if (invalidConcessions.length) throw Object.assign(new Error(`Invalid concessions: ${invalidConcessions.join(', ')}`), { status: 400 })
      const concessionsTotal = concessionIds.reduce((sum, id) => sum + (concessionMap.get(String(id))?.price || 0), 0)
      const concessionItems = concessionIds.map(id => concessionMap.get(String(id))).filter(Boolean)
      const subtotal = seats.length * seatPrice + concessionsTotal
      let couponCode = null
      let discountAmount = 0
      if (coupon) {
        const validated = validateCoupon(db, coupon, subtotal, seatPrice, seats.length)
        couponCode = validated.coupon
        discountAmount = validated.discountAmount
      }
      const total = Math.max(0, subtotal - discountAmount)

      // atomic id generation inside lock (avoid separate saveDb race)
      if (!db.nextIds) db.nextIds = {}
      const idNum = db.nextIds.booking || (db.bookings.length + 1)
      db.nextIds.booking = idNum + 1

      const b = {
        id: `bk${idNum}`,
        userId: req.user ? req.user.id : null,
        customerName,
        customerPhone,
        showtimeId,
        movieId: showtime.movieId,
        date: showtime.date,
        time: showtime.time,
        hall: showtime.hall,
        format: showtime.format,
        seats,
        seatPrice,
        serviceFee,
        concessions: concessionItems,
        concessionsTotal,
        coupon: couponCode,
        discountAmount,
        total,
        status: xpayConfigured() ? 'pending' : 'confirmed',
        paymentAttempts: 0,
        paymobOrderId: null,
        xpaySessionId: null,
        createdAt: new Date().toISOString()
      }
      db.bookings.push(b)
      saveDb()
      return b
    })
  } catch (e) {
    return res.status(e.status || 400).json({ message: e.message || 'Booking failed' })
  }

  if (!xpayConfigured()) {
    return res.status(201).json({ booking })
  }

  try {
    booking.paymentAttempts += 1
    const guestUser = {
      name: customerName,
      email: `${customerPhone}@guest.futurecinema.com`
    }
    const { paymobOrderId, xpaySessionId, redirectUrl } = await createPayment({ booking, user: guestUser, phone: customerPhone })
    const sid = String(xpaySessionId || paymobOrderId)
    booking.paymobOrderId = sid
    booking.xpaySessionId = sid
    saveDb()
    res.status(201).json({ booking, redirectUrl })
  } catch (e) {
    booking.status = 'cancelled'
    saveDb()
    console.error('XPay error:', e.message)
    return res.status(502).json({ message: 'Payment gateway error (XPay). Please try again.', debug: e.message })
  }
})

async function resolvePending(db, booking) {
  const sid = booking.xpaySessionId || booking.paymobOrderId
  if (booking.status !== 'pending' || !sid) return
  try {
    const order = await inquiryOrder(sid)
    booking.lastInquiryAt = new Date().toISOString()
    if (order.payment_status === 'PAID') {
      booking.status = 'confirmed'
      booking.paidAt = new Date().toISOString()
      if (order.data?.id) booking.xpayTxnId = String(order.data.id)
      console.log(`XPay inquiry: booking ${booking.id} -> confirmed`)
    } else if (order.is_canceled || order.is_cancel) {
      booking.status = 'cancelled'
      console.log(`XPay inquiry: booking ${booking.id} -> cancelled`)
    }
    saveDb()
  } catch (e) {
    console.error('XPay inquiry error:', e.message)
  }
}

router.get('/', authRequired, async (req, res) => {
  const db = getDb()
  releaseStalePending(db)
  saveDb()
  const mine = db.bookings.filter((b) => b.userId === req.user.id)
  for (const b of mine.filter((x) => x.status === 'pending')) {
    await resolvePending(db, b)
  }
  const list = [...mine]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((b) => ({ ...b, movie: db.movies.find((m) => m.id === b.movieId) }))
  res.json(list)
})

router.get('/by-phone/:phone', async (req, res) => {
  const phone = String(req.params.phone || '').replace(/[\s-]/g, '')
  const db = getDb()
  releaseStalePending(db)
  saveDb()
  const mine = db.bookings.filter((b) => b.customerPhone === phone)
  for (const b of mine.filter((x) => x.status === 'pending')) {
    await resolvePending(db, b)
  }
  const list = [...mine]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((b) => ({ ...b, movie: db.movies.find((m) => m.id === b.movieId) }))
  res.json(list)
})

router.post('/:id/cancel', authRequired, async (req, res) => {
  const db = getDb()
  const booking = db.bookings.find((x) => x.id === req.params.id)
  if (!booking) return res.status(404).json({ message: 'Booking not found' })
  // Only owner can cancel own booking (admin refund is via /admin/bookings/:id/refund)
  if (String(booking.userId) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Not allowed to cancel this booking' })
  }
  if (booking.status === 'cancelled') {
    return res.status(400).json({ message: 'Booking already cancelled' })
  }
  if (!['confirmed', 'pending'].includes(booking.status)) {
    return res.status(400).json({ message: `Cannot cancel booking with status ${booking.status}` })
  }
  const showtimeDate = parseShowtimeDateTime(booking)
  if (showtimeDate) {
    const diffMs = showtimeDate.getTime() - Date.now()
    if (diffMs < 2 * 60 * 60 * 1000) {
      return res.status(400).json({ message: 'Cancellation not allowed within 2 hours of showtime' })
    }
  }
  // Try refund if paid via XPay — failure should not block cancellation
  const sid = booking.xpaySessionId || booking.paymobOrderId
  if (sid && xpayConfigured()) {
    try {
      await refundXPay(booking)
    } catch (e) {
      console.error(`Cancel refund failed for ${booking.id} but continuing:`, e.message)
    }
  }
  booking.status = 'cancelled'
  booking.cancelledAt = new Date().toISOString()
  saveDb()
  res.json({ booking: { ...booking, movie: db.movies.find((m) => m.id === booking.movieId) } })
})

router.get('/:id', async (req, res) => {
  const db = getDb()
  const b = db.bookings.find((x) => x.id === req.params.id)
  if (!b) return res.status(404).json({ message: 'Booking not found' })
  await resolvePending(db, b)
  res.json({ ...b, movie: db.movies.find((m) => m.id === b.movieId) })
})

export default router
