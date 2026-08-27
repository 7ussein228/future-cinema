import bcrypt from 'bcryptjs'
import express from 'express'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { getDb, saveDb, nextId } from '../db.js'
import { authRequired, adminRequired, adminOrCashier, publicUser } from './auth.js'
import { xpayConfigured, refundPayment } from '../xpay.js'

const router = express.Router()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isRenderUpload = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_HOSTNAME
const UPLOADS_DIR = process.env.NETLIFY ? path.join('/tmp', 'uploads') : isRenderUpload ? path.join(__dirname, '..', 'data', 'uploads') : path.join(__dirname, '..', 'uploads')
const MAX_IMAGE_BYTES = 3 * 1024 * 1024

// Upload an image (base64 data URL) and return its public URL
router.post('/upload', authRequired, adminRequired, (req, res) => {
  const data = String(req.body?.data || '')
  const match = data.match(/^data:(image\/(png|jpe?g|webp|gif));base64,(.+)$/)
  if (!match) {
    return res.status(400).json({ message: 'Only png/jpg/webp/gif images are allowed' })
  }
  const buffer = Buffer.from(match[3], 'base64')
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    return res.status(400).json({ message: 'Image must be under 3MB' })
  }
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  const ext = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1]
  const name = `p${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`
  fs.writeFileSync(path.join(UPLOADS_DIR, name), buffer)
  res.json({ url: `/uploads/${name}` })
})

router.get('/stats', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const active = db.bookings.filter((b) => b.status !== 'cancelled')
  const revenue = active.reduce((sum, b) => sum + b.total, 0)
  res.json({
    movies: db.movies.length,
    showtimes: db.showtimes.length,
    users: db.users.length,
    bookings: active.length,
    revenue
  })
})

router.get('/movies', authRequired, adminRequired, (req, res) => {
  res.json(getDb().movies)
})

router.post('/movies', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const body = req.body || {}
  if (!body.title || !body.title.en) {
    return res.status(400).json({ message: 'English title is required' })
  }
  const movie = {
    id: `m${nextId('movie')}`,
    title: { en: body.title.en, ar: body.title.ar || body.title.en },
    lang: body.lang === 'ar' ? 'ar' : 'en',
    description: { en: body.description?.en || '', ar: body.description?.ar || '' },
    genre: { en: body.genre?.en || 'Drama', ar: body.genre?.ar || 'دراما' },
    duration: Number(body.duration) || 120,
    rating: Number(body.rating) || 0,
    ageRating: body.ageRating || 'PG',
    status: body.status === 'coming_soon' ? 'coming_soon' : 'now_showing',
    cast: Array.isArray(body.cast) ? body.cast : [],
    featured: !!body.featured,
    trailer: typeof body.trailer === 'string' ? body.trailer.trim() : '',
    poster: typeof body.poster === 'string' ? body.poster.trim() : '',
    gradient: body.gradient || ['#6d28d9', '#ec4899']
  }
  db.movies.push(movie)
  saveDb()
  res.status(201).json({ movie })
})

router.put('/movies/:id', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const movie = db.movies.find((m) => m.id === req.params.id)
  if (!movie) return res.status(404).json({ message: 'Movie not found' })
  const body = req.body || {}
  const bilingual = (v, fallback) => (v && typeof v === 'object' ? v : { en: v, ar: v })
  movie.title = { ...movie.title, ...bilingual(body.title, movie.title.en) }
  movie.lang = body.lang === 'ar' ? 'ar' : body.lang === 'en' ? 'en' : movie.lang
  movie.description = { ...movie.description, ...bilingual(body.description, movie.description.en) }
  movie.genre = { ...movie.genre, ...bilingual(body.genre, movie.genre.en) }
  if (body.duration != null) movie.duration = Number(body.duration)
  if (body.rating != null) movie.rating = Number(body.rating)
  if (body.ageRating) movie.ageRating = body.ageRating
  if (body.status) movie.status = body.status
  if (Array.isArray(body.cast)) movie.cast = body.cast
  if (body.featured != null) movie.featured = !!body.featured
  if (body.trailer != null) movie.trailer = String(body.trailer).trim()
  if (body.poster != null) movie.poster = String(body.poster).trim()
  if (body.gradient) movie.gradient = body.gradient
  saveDb()
  res.json({ movie })
})

router.delete('/movies/:id', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const idx = db.movies.findIndex((m) => m.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Movie not found' })
  const hasBookings = db.bookings.some((b) => b.movieId === req.params.id && b.status !== 'cancelled')
  if (hasBookings) {
    return res.status(400).json({ message: 'Cannot delete a movie that has active bookings' })
  }
  db.movies.splice(idx, 1)
  db.showtimes = db.showtimes.filter((s) => s.movieId !== req.params.id)
  saveDb()
  res.json({ ok: true })
})

router.get('/halls', authRequired, adminRequired, (req, res) => {
  res.json(getDb().halls || [])
})

// Concessions CRUD - admin only
router.get('/concessions', authRequired, adminRequired, (req, res) => {
  res.json(getDb().concessions || [])
})
router.post('/concessions', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const body = req.body || {}
  const price = Number(body.price)
  if (!body.name || (!body.name.en && !body.name.ar)) return res.status(400).json({ message: 'Name is required' })
  if (isNaN(price) || price < 0) return res.status(400).json({ message: 'Valid price required' })
  const item = {
    id: body.id ? String(body.id) : `c${nextId('concession')}`,
    name: { en: body.name.en || body.name.ar, ar: body.name.ar || body.name.en },
    price: Math.round(price),
    image: body.image || null
  }
  // ensure unique id
  if (db.concessions.some(c => c.id === item.id)) return res.status(409).json({ message: 'Concession id already exists' })
  db.concessions.push(item)
  saveDb()
  res.status(201).json({ concession: item })
})
router.put('/concessions/:id', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const item = db.concessions.find(c => c.id === req.params.id)
  if (!item) return res.status(404).json({ message: 'Concession not found' })
  const body = req.body || {}
  if (body.name) {
    if (body.name.en) item.name.en = String(body.name.en)
    if (body.name.ar) item.name.ar = String(body.name.ar)
  }
  if (body.price != null) {
    const p = Number(body.price)
    if (!isNaN(p) && p >= 0) item.price = Math.round(p)
  }
  if (body.image !== undefined) item.image = body.image || null
  saveDb()
  res.json({ concession: item })
})
router.delete('/concessions/:id', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const idx = db.concessions.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Concession not found' })
  db.concessions.splice(idx, 1)
  saveDb()
  res.json({ ok: true })
})

// Coupons CRUD - admin only
router.get('/coupons', authRequired, adminRequired, (req, res) => {
  res.json(getDb().coupons || [])
})
router.post('/coupons', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const body = req.body || {}
  const code = String(body.code || '').trim().toUpperCase()
  if (!code) return res.status(400).json({ message: 'code is required' })
  if (db.coupons.some(c => c.code === code)) return res.status(409).json({ message: 'Coupon code already exists' })
  const discount = Number(body.discount)
  if (isNaN(discount) || discount <= 0) return res.status(400).json({ message: 'Valid discount required' })
  const type = body.type === 'fixed' ? 'fixed' : 'percent'
  const coupon = {
    code,
    discount: type === 'percent' && discount > 1 ? discount / 100 : discount,
    type,
    active: body.active !== false,
    expiresAt: body.expiresAt || null,
    minAmount: Number(body.minAmount) || 0
  }
  // normalize percent discount to 0-1
  if (coupon.type === 'percent' && coupon.discount > 1) coupon.discount = coupon.discount / 100
  db.coupons.push(coupon)
  saveDb()
  res.status(201).json({ coupon })
})
router.delete('/coupons/:code', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const code = String(req.params.code || '').trim().toUpperCase()
  const idx = db.coupons.findIndex(c => c.code === code)
  if (idx === -1) return res.status(404).json({ message: 'Coupon not found' })
  db.coupons.splice(idx, 1)
  saveDb()
  res.json({ ok: true })
})

router.get('/showtimes', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const showtimes = [...db.showtimes]
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .map((s) => ({ ...s, price: s.price != null ? Number(s.price) : 100, movie: db.movies.find((m) => m.id === s.movieId) }))
  res.json(showtimes)
})

router.post('/showtimes', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const { movieId, date, time, hall, format, price } = req.body || {}
  if (!movieId || !date || !time) {
    return res.status(400).json({ message: 'movieId, date and time are required' })
  }
  let parsedPrice = Number(price)
  if (price == null || price === '' || isNaN(parsedPrice)) parsedPrice = 100
  if (parsedPrice < 10 || parsedPrice > 1000) {
    return res.status(400).json({ message: 'price must be between 10 and 1000' })
  }
  // validate hall exists if provided
  const validHalls = (db.halls || []).map((h) => h.id)
  const finalHall = hall ? String(hall) : '1'
  if (validHalls.length && !validHalls.includes(finalHall)) {
    return res.status(400).json({ message: `Invalid hall id. Valid: ${validHalls.join(', ')}` })
  }
  const showtime = {
    id: `st${nextId('showtime')}`,
    movieId,
    date,
    time,
    hall: finalHall,
    format: format || '2D',
    price: Math.round(parsedPrice)
  }
  db.showtimes.push(showtime)
  saveDb()
  res.status(201).json({ showtime })
})

router.delete('/showtimes/:id', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const idx = db.showtimes.findIndex((s) => s.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Showtime not found' })
  const hasBookings = db.bookings.some((b) => b.showtimeId === req.params.id && b.status !== 'cancelled')
  if (hasBookings) {
    return res.status(400).json({ message: 'Cannot delete a showtime that has bookings' })
  }
  db.showtimes.splice(idx, 1)
  saveDb()
  res.json({ ok: true })
})

router.get('/bookings', authRequired, adminRequired, (req, res) => {
  const db = getDb()
  const bookings = [...db.bookings]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((b) => ({
      ...b,
      user: db.users.find((u) => u.id === b.userId),
      movie: db.movies.find((m) => m.id === b.movieId)
    }))
  res.json(bookings)
})

router.get('/users', authRequired, adminRequired, (req, res) => {
  res.json(getDb().users.map(publicUser))
})

router.post('/users', authRequired, adminRequired, async (req, res) => {
  const { name, phone, password, role } = req.body || {}
  const nameNorm = String(name || '').trim().replace(/\s+/g, ' ')
  const phoneNorm = String(phone || '').trim()
  const pass = String(password || '')
  const allowedRoles = ['admin', 'cashier', 'user']
  const finalRole = allowedRoles.includes(role) ? role : 'user'

  if (nameNorm.length < 3) return res.status(400).json({ message: 'الاسم يجب ألا يقل عن 3 أحرف', code: 'short_name' })
  if (!/^01[0125][0-9]{8}$/.test(phoneNorm)) return res.status(400).json({ message: 'رقم موبايل مصري صحيح مطلوب', code: 'invalid_phone' })
  if (pass.length < 3) return res.status(400).json({ message: 'كلمة المرور قصيرة جداً', code: 'weak_password' })

  const db = getDb()
  if (db.users.some(u => (u.name || '').toLowerCase() === nameNorm.toLowerCase())) {
    return res.status(409).json({ message: 'الاسم مستخدم من قبل', code: 'name_taken' })
  }
  if (db.users.some(u => u.phone === phoneNorm)) {
    return res.status(409).json({ message: 'رقم الموبايل مسجل من قبل', code: 'phone_taken' })
  }

  const hash = await bcrypt.hash(pass, 10)
  const user = {
    id: nextId('user'),
    name: nameNorm,
    phone: phoneNorm,
    password: hash,
    role: finalRole,
    mustChangePassword: false,
    createdAt: new Date().toISOString()
  }
  db.users.push(user)
  saveDb()
  res.status(201).json({ user: publicUser(user) })
})

router.post('/users/:id/reset-password', authRequired, adminRequired, async (req, res) => {
  const db = getDb()
  const user = db.users.find(u => String(u.id) === String(req.params.id))
  if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' })
  if (user.id === req.user.id) return res.status(400).json({ message: 'لا يمكن إعادة تعيين كلمة مرور نفسك' })
  user.password = await bcrypt.hash('123', 10)
  user.mustChangePassword = true
  saveDb()
  res.json({ user: publicUser(user), tempPassword: '123' })
})

router.post('/bookings/:id/refund', authRequired, adminRequired, async (req, res) => {
  const db = getDb()
  const booking = db.bookings.find((b) => b.id === req.params.id)
  if (!booking) return res.status(404).json({ message: 'Booking not found' })
  if (booking.status === 'cancelled') {
    return res.status(400).json({ message: 'Booking already cancelled' })
  }
  const sid = booking.xpaySessionId || booking.paymobOrderId
  if (sid && xpayConfigured()) {
    try {
      await refundPayment({ sessionId: sid, amount: booking.total })
      console.log(`Admin refund success for booking ${booking.id}`)
    } catch (e) {
      console.error(`Admin XPay refund failed for ${booking.id}:`, e.message)
      // still proceed to mark cancelled but log failure
    }
  }
  booking.status = 'cancelled'
  booking.cancelledAt = new Date().toISOString()
  booking.refundedAt = new Date().toISOString()
  booking.refundedBy = req.user.id
  saveDb()
  res.json({ booking: { ...booking, movie: db.movies.find((m) => m.id === booking.movieId), user: db.users.find((u) => u.id === booking.userId) } })
})

router.post('/cashier/bookings', authRequired, adminOrCashier, (req, res) => {
  const { showtimeId, seats, name, phone, paymentMethod, amountPaid, concessions, coupon } = req.body || {}
  const customerName = String(name || '').trim()
  const customerPhone = String(phone || '').replace(/[\s-]/g, '')
  const method = paymentMethod === 'visa' ? 'visa' : 'cash'
  if (!showtimeId || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ message: 'Showtime and seats are required' })
  }
  if (!customerName || customerName.length < 2) {
    return res.status(400).json({ message: 'اسم العميل مطلوب' })
  }
  const db = getDb()
  const showtime = db.showtimes.find(s => s.id === showtimeId)
  if (!showtime) return res.status(404).json({ message: 'Showtime not found' })
  const taken = new Set()
  for (const b of db.bookings) {
    if (b.showtimeId === showtime.id && b.status !== 'cancelled') {
      for (const s of b.seats) taken.add(s)
    }
  }
  const conflicts = seats.filter(s => taken.has(s))
  if (conflicts.length) return res.status(409).json({ message: `Seats already booked: ${conflicts.join(', ')}` })
  const seatPrice = Number(showtime.price) || 100
  const serviceFee = 0
  // concessions
  const concessionIds = Array.isArray(concessions) ? concessions : []
  const validConcessionMap = new Map((db.concessions || []).map(c => [c.id, c]))
  const invalid = concessionIds.filter(id => !validConcessionMap.has(String(id)))
  if (invalid.length) return res.status(400).json({ message: `Invalid concessions: ${invalid.join(', ')}` })
  const concessionsTotal = concessionIds.reduce((sum, id) => sum + (validConcessionMap.get(String(id))?.price || 0), 0)
  const concessionItems = concessionIds.map(id => validConcessionMap.get(String(id))).filter(Boolean)
  // coupon
  let couponCode = String(coupon || '').trim().toUpperCase() || null
  let discountAmount = 0
  let couponObj = null
  if (couponCode) {
    couponObj = (db.coupons || []).find(c => c.code === couponCode)
    if (!couponObj || !couponObj.active) return res.status(400).json({ message: 'Invalid coupon' })
    if (couponObj.expiresAt && new Date(couponObj.expiresAt).getTime() < Date.now()) return res.status(400).json({ message: 'Coupon expired' })
    const subtotal = seats.length * seatPrice + concessionsTotal + serviceFee
    if ((couponObj.minAmount || 0) > subtotal) return res.status(400).json({ message: `Coupon requires minimum ${couponObj.minAmount} EGP` })
    if (couponObj.type === 'percent') discountAmount = Math.round(subtotal * couponObj.discount)
    else discountAmount = Math.min(couponObj.discount, subtotal)
  }
  const subtotal = seats.length * seatPrice + concessionsTotal + serviceFee
  const total = Math.max(0, subtotal - discountAmount)
  const paid = method === 'cash' ? Number(amountPaid) || 0 : total
  if (method === 'cash' && paid < total) {
    return res.status(400).json({ message: `المبلغ المدفوع أقل من الإجمالي (${total} ج.م)` })
  }
  const change = method === 'cash' ? Math.max(0, paid - total) : 0
  const booking = {
    id: `bk${nextId('booking')}`,
    userId: null,
    customerName,
    customerPhone: customerPhone || null,
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
    coupon: couponObj ? couponObj.code : null,
    discountAmount,
    total,
    status: 'confirmed',
    paymentMethod: method,
    paidAmount: paid,
    change,
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    source: 'cashier',
    cashierId: req.user.id
  }
  db.bookings.push(booking)
  saveDb()
  const movie = db.movies.find(m => m.id === booking.movieId)
  res.status(201).json({ booking: { ...booking, movie } })
})

export default router
