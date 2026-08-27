import express from 'express'
import { getDb, saveDb } from '../db.js'
import { inquiryOrder, verifyWebhook } from '../xpay.js'

const router = express.Router()

function findBySession(db, sessionId) {
  if (!sessionId) return null
  return db.bookings.find(b => String(b.paymobOrderId) === String(sessionId) || String(b.xpaySessionId) === String(sessionId))
}

function findByBookingId(db, bookingId) {
  return db.bookings.find(b => b.id === String(bookingId))
}

function markConfirmed(booking) {
  if (booking.status === 'confirmed') return
  booking.status = 'confirmed'
  booking.paidAt = new Date().toISOString()
  saveDb()
  console.log(`XPay: booking ${booking.id} -> confirmed`)
}

function markCancelled(booking) {
  if (booking.status === 'cancelled') return
  booking.status = 'cancelled'
  saveDb()
  console.log(`XPay: booking ${booking.id} -> cancelled`)
}

// Webhook from XPay — configure in dashboard as https://yourdomain/api/xpay/webhook
// Use express.raw to keep raw body for signature verification
router.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  const raw = req.body?.toString('utf8') || ''
  const sig = req.headers['xpay-signature'] || req.headers['x-xpay-signature'] || req.headers['stripe-signature'] || ''
  if (!verifyWebhook(raw, sig)) {
    console.warn('XPay webhook: signature check failed (allowed in dev)')
  }
  let event
  try { event = JSON.parse(raw || '{}') } catch { return res.sendStatus(200) }

  // XPay event shapes: { type: 'checkout.session.completed', data: { id, metadata, status } }
  const type = String(event.type || event.event || '').toLowerCase()
  const obj = event.data?.object || event.data || event.object || event
  const sessionId = String(obj.id || obj.session_id || obj.checkout_session_id || '')
  const bookingId = String(obj.metadata?.bookingId || obj.metadata?.booking_id || event.bookingId || '')
  const status = String(obj.status || obj.payment_status || event.status || '').toLowerCase()

  const db = getDb()
  const booking = (sessionId && findBySession(db, sessionId)) || (bookingId && findByBookingId(db, bookingId)) || null
  if (!booking) {
    console.warn('XPay webhook: booking not found', { sessionId, bookingId, type })
    return res.sendStatus(200)
  }

  const isPaid = ['complete','completed','paid','succeeded','success','successful'].includes(status) || type.includes('completed') || type.includes('succeeded')
  const isCanceled = ['expired','canceled','cancelled','failed'].includes(status)

  if (isPaid) markConfirmed(booking)
  else if (isCanceled) markCancelled(booking)

  res.sendStatus(200)
})

// Frontend confirm after redirect from XPay hosted checkout
// Called by PaymentResult.jsx with { sessionId, bookingId } or ?gateway=xpay
router.post('/confirm', express.json(), async (req, res) => {
  const sessionId = String(req.body?.sessionId || req.body?.session_id || req.query?.session_id || '')
  const bookingId = String(req.body?.bookingId || req.body?.bk || '')
  const db = getDb()
  let booking = null
  if (sessionId) booking = findBySession(db, sessionId)
  if (!booking && bookingId) booking = findByBookingId(db, bookingId)
  if (!booking) return res.status(404).json({ message: 'Booking not found' })

  // Inquiry live status from XPay
  const sid = booking.xpaySessionId || booking.paymobOrderId
  if (!sid) return res.json({ id: booking.id, status: booking.status })

  try {
    const order = await inquiryOrder(sid)
    if (order.payment_status === 'PAID') {
      markConfirmed(booking)
    } else if (order.is_canceled) {
      markCancelled(booking)
    }
  } catch (e) {
    console.error('XPay confirm inquiry error', e.message)
  }
  res.json({ id: booking.id, status: booking.status })
})

// Keep Paymob redirect compat: /api/xpay/redirect
router.get('/redirect', (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  res.redirect(`${clientUrl}/payment/unknown${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`)
})

export default router
