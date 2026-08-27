import crypto from 'crypto'

const BASE = 'https://accept.paymob.com'
const SECRET_KEY = process.env.PAYMOB_SECRET_KEY || ''
const PUBLIC_KEY = process.env.PAYMOB_PUBLIC_KEY || ''
const INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID || ''
const HMAC_SECRET = process.env.PAYMOB_HMAC || ''

export function paymobConfigured() {
  return Boolean(SECRET_KEY && PUBLIC_KEY && INTEGRATION_ID)
}

const LEGACY_API_KEY = process.env.PAYMOB_API_KEY || ''
let cachedLegacyToken = null
let legacyTokenExpiry = 0

async function legacyToken() {
  if (cachedLegacyToken && Date.now() < legacyTokenExpiry) return cachedLegacyToken
  const res = await fetch(`${BASE}/api/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: LEGACY_API_KEY })
  })
  if (!res.ok) throw new Error(`Paymob legacy auth failed (${res.status})`)
  const data = await res.json()
  cachedLegacyToken = data.token
  legacyTokenExpiry = Date.now() + 50 * 60 * 1000
  return cachedLegacyToken
}

export async function inquiryOrder(paymobOrderId) {
  const token = await legacyToken()
  const res = await fetch(`${BASE}/api/ecommerce/orders/${paymobOrderId}?token=${token}`)
  if (!res.ok) throw new Error(`Paymob order inquiry failed (${res.status})`)
  return res.json()
}

function billingData(user, phone) {
  const name = String(user.name || 'Seaway Customer').trim().split(/\s+/)
  return {
    first_name: name[0] || 'Seaway',
    last_name: name.slice(1).join(' ') || 'Customer',
    email: String(user.email || 'customer@seawaysuez.com'),
    phone_number: phone || '+201000000000',
    street: 'Corneish St',
    city: 'Suez',
    country: 'EG',
    state: 'Suez',
    building: '1',
    floor: '1',
    apartment: '1',
    postal_code: '41511'
  }
}

export async function createPayment({ booking, user, phone }) {
  const amountCents = Math.round(booking.total * 100)
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  const body = {
    amount: amountCents,
    currency: 'EGP',
    payment_methods: [Number(INTEGRATION_ID)],
    special_reference: `${booking.id}-${booking.paymentAttempts || 1}`,
    redirection_url: `${clientUrl}/payment/${booking.id}`,
    notification_url: `${process.env.PUBLIC_URL || 'http://localhost:3001'}/api/paymob/callback`,
    items: [
      {
        name: `Cinema ticket${booking.seats.length > 1 ? 's' : ''}`,
        amount: amountCents,
        description: `Booking ${booking.id} | ${booking.date} ${booking.time} | Seats ${booking.seats.join('+')}`,
        quantity: 1
      }
    ],
    billing_data: billingData(user, phone)
  }

  const res = await fetch(`${BASE}/v1/intention/`, {
    method: 'POST',
    headers: { Authorization: `Token ${SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Paymob intention failed: ${text.slice(0, 200)}`)
  }
  const intent = await res.json()

  return {
    paymobOrderId: String(intent.intention_order_id ?? intent.order_id ?? ''),
    redirectUrl: `${BASE}/unifiedcheckout/?publicKey=${PUBLIC_KEY}&clientSecret=${intent.client_secret}`
  }
}

export function verifyHmacTransaction(transaction, receivedHmac) {
  if (!HMAC_SECRET || !receivedHmac) return false
  const keys = [
    'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
    'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
    'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
    'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success'
  ]
  const concatenated = keys
    .map((key) => {
      const value = key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), transaction)
      return value == null ? '' : String(value)
    })
    .join('')
  const digest = crypto.createHmac('sha512', HMAC_SECRET).update(concatenated).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(String(receivedHmac).toLowerCase()))
  } catch {
    return false
  }
}

export function verifyHmacQuery(search, receivedHmac) {
  if (!HMAC_SECRET || !receivedHmac) return false
  const params = {}
  for (const [k, v] of new URLSearchParams(search)) {
    if (k !== 'hmac') params[k] = v ?? ''
  }
  const concatenated = Object.keys(params)
    .sort()
    .map((k) => String(params[k]))
    .join('')
  const digest = crypto.createHmac('sha512', HMAC_SECRET).update(concatenated).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(String(receivedHmac).toLowerCase()))
  } catch {
    return false
  }
}
