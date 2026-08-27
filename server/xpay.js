import crypto from 'crypto'

const BASE = 'https://api.xpay.app'
const SECRET_KEY = process.env.XPAY_SECRET_KEY || ''
const WEBHOOK_SECRET = process.env.XPAY_WEBHOOK_SECRET || ''

// keep env names flexible: also accept XPAY_API_KEY alias
const SECRET = SECRET_KEY || process.env.XPAY_API_KEY || ''

export function xpayConfigured() {
  return Boolean(SECRET && !SECRET.includes('REPLACE_ME'))
}

export async function createPayment({ booking, user, phone }) {
  if (!xpayConfigured()) throw new Error('XPay not configured: set XPAY_SECRET_KEY')

  const amountPiastres = Math.round(booking.total * 100) // EGP -> piasters
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3001'

  // XPay Checkout Session — docs: POST /checkout/sessions
  // https://docs.xpay.app/en/api-reference/checkout-sessions/createCheckoutSession
  const body = {
    currency: 'EGP',
    afterCompletion: {
      type: 'redirect',
      redirect: { url: `${clientUrl}/payment/${booking.id}?gateway=xpay` }
    },
    cancelUrl: `${clientUrl}/payment/${booking.id}?gateway=xpay&status=cancel`,
    lineItems: [
      {
        priceData: {
          currency: 'EGP',
          unitAmount: amountPiastres,
          productData: { name: `Future Cinema — Booking ${booking.id} (${booking.seats.length} tickets)` }
        },
        quantity: 1
      }
    ],
    customerDetails: {
      name: String(user.name || booking.customerName || 'Guest'),
      email: String(user.email || `${phone}@guest.futurecinema.com`),
      phone: String(phone || '')
    },
    metadata: {
      bookingId: booking.id,
      showtimeId: booking.showtimeId,
      seats: booking.seats.join(',')
    },
    locale: 'ar'
  }

  const res = await fetch(`${BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`XPay create session failed (${res.status}): ${text.slice(0, 300)}`)
  }

  const session = await res.json()

  // XPay returns: { id: 'cs_...', url: 'https://checkout.xpay.app/c/...', client_secret: '...' }
  const sessionId = String(session.id || session.session_id || '')
  const redirectUrl = String(session.url || session.checkout_url || session.redirect_url || '')

  if (!sessionId || !redirectUrl) {
    throw new Error(`XPay bad response: ${JSON.stringify(session).slice(0, 300)}`)
  }

  return {
    // keep legacy field name for bookings.js compat, plus xpay specific
    paymobOrderId: sessionId,
    xpaySessionId: sessionId,
    redirectUrl,
    raw: session,
  }
}

export async function inquiryOrder(sessionId) {
  if (!SECRET) throw new Error('XPay not configured')
  const res = await fetch(`${BASE}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  })
  if (!res.ok) throw new Error(`XPay inquiry failed (${res.status})`)
  const data = await res.json()
  // normalize to Paymob-like shape for bookings.js
  // XPay session status: 'complete' | 'open' | 'expired'
  // payment_status mapping
  const rawStatus = String(data.status || data.payment_status || '').toLowerCase()
  const isPaid = ['complete', 'completed', 'paid', 'succeeded', 'success'].includes(rawStatus)
  const isCanceled = ['expired', 'canceled', 'cancelled', 'failed'].includes(rawStatus)

  return {
    payment_status: isPaid ? 'PAID' : rawStatus,
    is_canceled: isCanceled,
    is_cancel: isCanceled,
    data,
    raw: data,
  }
}

// Optional: verify webhook signature (XPay sends Stripe-style signature)
// Header: Xpay-Signature or Stripe-Signature
export async function refundPayment({ sessionId, amount }) {
  if (!xpayConfigured() || !sessionId) return null
  let paymentIntentId = String(sessionId)
  // Try to resolve paymentIntentId from checkout session details for XPay checkout sessions
  try {
    const inquiryRes = await fetch(`${BASE}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${SECRET}` },
    })
    if (inquiryRes.ok) {
      const sess = await inquiryRes.json()
      const pid = sess.payment_intent || sess.paymentIntentId || sess.payment_intent_id || sess.data?.payment_intent || sess.data?.id
      if (pid) paymentIntentId = String(pid)
    }
  } catch (_) {
    // fallback to sessionId as paymentIntentId
  }
  const body = { paymentIntentId }
  // also send checkoutSessionId for gateways that accept it
  body.checkoutSessionId = String(sessionId)
  if (amount != null && !Number.isNaN(Number(amount))) {
    body.amount = Math.round(Number(amount) * 100)
  }
  try {
    const res = await fetch(`${BASE}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    if (!res.ok) {
      console.error(`XPay refund failed (${res.status}): ${text.slice(0, 500)}`)
      throw new Error(`XPay refund failed (${res.status}): ${text.slice(0, 300)}`)
    }
    try {
      return JSON.parse(text)
    } catch {
      return { raw: text }
    }
  } catch (e) {
    console.error('XPay refund error:', e.message)
    throw e
  }
}

export function verifyWebhook(rawBody, signature) {
  if (!WEBHOOK_SECRET || !signature) return true // skip if not configured — allow for testing
  // XPay uses HMAC SHA256 of raw body with webhook secret
  try {
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)))
  } catch {
    return false
  }
}
