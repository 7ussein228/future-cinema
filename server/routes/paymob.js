import express from 'express'
import { getDb, saveDb } from '../db.js'
import { verifyHmacTransaction, verifyHmacQuery } from '../paymob.js'

const router = express.Router()

function findBooking(db, { orderId, txnId, merchantRef }) {
  if (orderId) {
    const byOrder = db.bookings.find((b) => b.paymobOrderId && b.paymobOrderId === String(orderId))
    if (byOrder) return byOrder
  }
  if (txnId) {
    const byTxn = db.bookings.find((b) => b.paymobTxnId === String(txnId))
    if (byTxn) return byTxn
  }
  if (merchantRef) {
    const prefix = String(merchantRef).split('-').slice(0, -1).join('-')
    return db.bookings.find((b) => b.id === prefix)
  }
  return null
}

function applyResult(booking, success) {
  booking.paymobTxnId = booking.paymobTxnId || ''
  booking.status = success ? 'confirmed' : 'cancelled'
  if (success) booking.paidAt = new Date().toISOString()
  saveDb()
}

router.post('/callback', express.json(), (req, res) => {
  const { hmac, obj } = req.body || {}
  if (!obj) return res.status(400).json({ message: 'Missing transaction payload' })
  if (!verifyHmacTransaction(obj, hmac)) {
    console.warn('Paymob callback HMAC verification failed')
    return res.status(403).json({ message: 'Invalid signature' })
  }
  const db = getDb()
  const booking = findBooking(db, { orderId: obj.order?.id, txnId: obj.id })
  if (booking) {
    applyResult(booking, obj.success === true)
    console.log(`Paymob callback: booking ${booking.id} -> ${booking.status}`)
  }
  res.sendStatus(200)
})

router.get('/redirect', (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  res.redirect(`${clientUrl}/payment/unknown${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`)
})

router.post('/confirm', express.json(), async (req, res) => {
  const search = String(req.body?.search || '')
  if (!search.includes('hmac=')) return res.status(400).json({ message: 'Missing payment data' })

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const hmac = params.get('hmac')
  if (!verifyHmacQuery(search, hmac)) {
    return res.status(403).json({ message: 'Invalid signature' })
  }

  const db = getDb()
  const booking = findBooking(db, {
    orderId: params.get('order') || params.get('order_id'),
    txnId: params.get('id') || params.get('transaction_id'),
    merchantRef: params.get('merchant_order_id') || params.get('special_reference')
  })

  if (!booking) return res.status(404).json({ message: 'Booking not found for this transaction' })

  const success = ['true', 'True', 'TRUE', '1'].includes(params.get('success'))
  applyResult(booking, success)
  console.log(`Paymob redirect confirm: booking ${booking.id} -> ${booking.status}`)

  res.json({ id: booking.id, status: booking.status })
})

export default router
