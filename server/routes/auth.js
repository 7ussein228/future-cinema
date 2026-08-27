import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb, saveDb, nextId } from '../db.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'vox-cinema-demo-secret-change-me'
const TOKEN_TTL = '30d'
const PHONE_RE = /^01[0125][0-9]{8}$/

// --- Rate limiting & login lock helpers (in-memory) ---
const FAILED_MAX = 5
const FAILED_WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000
const GLOBAL_WINDOW_MS = 60 * 1000
const GLOBAL_MAX = 20

const failedMap = new Map() // key: phoneLower + ':' + ip -> { count, firstAt, blockedUntil }
const globalMap = new Map() // ip -> [timestamps]

function cleanOld() {
  const now = Date.now()
  for (const [k, v] of failedMap.entries()) {
    if (v.blockedUntil && v.blockedUntil > now) continue
    if (v.blockedUntil && v.blockedUntil <= now) {
      if (now - v.firstAt > FAILED_WINDOW_MS) failedMap.delete(k)
      else {
        // block expired -> reset to allow new attempts
        failedMap.delete(k)
      }
      continue
    }
    if (now - v.firstAt > FAILED_WINDOW_MS) failedMap.delete(k)
  }
  for (const [ip, arr] of globalMap.entries()) {
    const filtered = arr.filter((t) => now - t < GLOBAL_WINDOW_MS)
    if (filtered.length === 0) globalMap.delete(ip)
    else globalMap.set(ip, filtered)
  }
}

function checkGlobalRateLimit(req, res) {
  const ip = req.ip
  const now = Date.now()
  let arr = globalMap.get(ip) || []
  arr = arr.filter((t) => now - t < GLOBAL_WINDOW_MS)
  if (arr.length >= GLOBAL_MAX) {
    globalMap.set(ip, arr)
    res.status(429).json({ message: 'محاولات كثيرة', code: 'too_many' })
    return false
  }
  arr.push(now)
  globalMap.set(ip, arr)
  return true
}

function loginKey(phone, ip) {
  return `${String(phone || '').toLowerCase()}:${ip}`
}

function isBlocked(key) {
  const entry = failedMap.get(key)
  if (!entry) return false
  const now = Date.now()
  if (entry.blockedUntil && now < entry.blockedUntil) return true
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    failedMap.delete(key)
    return false
  }
  if (now - entry.firstAt > FAILED_WINDOW_MS) {
    failedMap.delete(key)
    return false
  }
  return false
}

function recordFailed(key) {
  const now = Date.now()
  let entry = failedMap.get(key)
  if (!entry || now - entry.firstAt > FAILED_WINDOW_MS) {
    entry = { count: 1, firstAt: now, blockedUntil: null }
  } else {
    entry.count += 1
  }
  if (entry.count >= FAILED_MAX) {
    entry.blockedUntil = now + BLOCK_MS
  }
  failedMap.set(key, entry)
}

function clearFailed(key) {
  failedMap.delete(key)
}

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Authentication required', code: 'auth_required' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const db = getDb()
    const user = db.users.find((u) => u.id === payload.id)
    if (!user) return res.status(401).json({ message: 'User not found', code: 'auth_required' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token', code: 'auth_required' })
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      const db = getDb()
      const user = db.users.find((u) => u.id === payload.id)
      if (user) req.user = user
    } catch {}
  }
  next()
}

export function adminRequired(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}

export function adminOrCashier(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'cashier') {
    return res.status(403).json({ message: 'Cashier or Admin access required' })
  }
  next()
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone || null,
    role: user.role,
    mustChangePassword: !!user.mustChangePassword,
    createdAt: user.createdAt
  }
}

router.post('/register', async (req, res) => {
  if (!checkGlobalRateLimit(req, res)) return
  cleanOld()
  const { name, phone, password } = req.body || {}
  const nameNorm = String(name || '').trim().replace(/\s+/g, ' ')
  const phoneNorm = String(phone || '').trim()

  if (nameNorm.length < 3) return res.status(400).json({ message: 'Name must be at least 3 characters', code: 'short_name' })
  if (!PHONE_RE.test(phoneNorm)) return res.status(400).json({ message: 'Enter a valid Egyptian mobile number', code: 'invalid_phone' })
  if (String(password || '').length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters', code: 'weak_password' })

  const db = getDb()
  if (db.users.some((u) => (u.name || '').toLowerCase() === nameNorm.toLowerCase())) {
    return res.status(409).json({ message: 'This name is already taken', code: 'name_taken' })
  }
  if (db.users.some((u) => u.phone === phoneNorm)) {
    return res.status(409).json({ message: 'This phone number is already registered', code: 'phone_taken' })
  }

  const hash = await bcrypt.hash(String(password), 10)
  const user = {
    id: nextId('user'),
    name: nameNorm,
    phone: phoneNorm,
    password: hash,
    role: 'user',
    mustChangePassword: false,
    createdAt: new Date().toISOString()
  }
  db.users.push(user)
  saveDb()
  res.status(201).json({ token: signToken(user), user: publicUser(user) })
})

router.post('/login', async (req, res) => {
  if (!checkGlobalRateLimit(req, res)) return
  cleanOld()
  const identifierRaw = String(req.body?.phone ?? req.body?.email ?? '').trim().replace(/\s+/g, '')
  const password = String(req.body?.password || '')
  if (!identifierRaw || !password) {
    return res.status(400).json({ message: 'Phone and password are required', code: 'bad_credentials' })
  }
  const key = loginKey(identifierRaw, req.ip)
  if (isBlocked(key)) {
    return res.status(429).json({ message: 'محاولات كثيرة', code: 'too_many' })
  }
  const db = getDb()
  const norm = (s) => String(s || '').toLowerCase().replace(/[\s_-]/g, '')
  const identNorm = norm(identifierRaw)
  const user = db.users.find(
    (u) => u.phone === identifierRaw || norm(u.name) === identNorm || norm(u.email) === identNorm
  )
  if (!user || !user.password) {
    recordFailed(key)
    return res.status(401).json({ message: 'Wrong phone or password', code: 'bad_credentials' })
  }
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) {
    recordFailed(key)
    return res.status(401).json({ message: 'Wrong phone or password', code: 'bad_credentials' })
  }
  clearFailed(key)
  res.json({ token: signToken(user), user: publicUser(user) })
})

router.get('/me', authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

router.post('/change-password', authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  const newPass = String(newPassword || '')
  if (newPass.length < 3) return res.status(400).json({ message: 'كلمة المرور الجديدة قصيرة جداً', code: 'weak_password' })
  const user = req.user
  // if not forced, require current password verification
  if (!user.mustChangePassword) {
    if (!currentPassword) return res.status(400).json({ message: 'كلمة المرور الحالية مطلوبة', code: 'bad_credentials' })
    const ok = await bcrypt.compare(String(currentPassword), user.password)
    if (!ok) return res.status(401).json({ message: 'كلمة المرور الحالية غير صحيحة', code: 'bad_credentials' })
  }
  user.password = await bcrypt.hash(newPass, 10)
  user.mustChangePassword = false
  saveDb()
  res.json({ user: publicUser(user) })
})

// Forgot password via phone OTP (dev: code logged to console)
router.post('/forgot', async (req, res) => {
  if (!checkGlobalRateLimit(req, res)) return
  cleanOld()
  const phone = String(req.body?.phone || '').trim()
  if (!PHONE_RE.test(phone)) return res.status(400).json({ message: 'رقم موبايل مصري صحيح مطلوب', code: 'invalid_phone' })
  const db = getDb()
  const user = db.users.find(u => u.phone === phone)
  if (!user) return res.status(404).json({ message: 'الرقم غير مسجل', code: 'not_found' })
  if (!db.otpCodes) db.otpCodes = {}
  const code = String(Math.floor(100000 + Math.random() * 900000))
  db.otpCodes[phone] = { hash: await bcrypt.hash(code, 8), expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 }
  saveDb()
  console.log(`[OTP forgot] ${phone} -> ${code}`)
  // in production send SMS via provider; in dev return channel
  res.json({ sent: true, channel: 'dev', hint: 'الكود في سيرفر الكونسول (وضع التجربة)' })
})

router.post('/reset-with-otp', async (req, res) => {
  const phone = String(req.body?.phone || '').trim()
  const code = String(req.body?.code || '').trim()
  const newPass = String(req.body?.newPassword || '')
  if (!PHONE_RE.test(phone)) return res.status(400).json({ message: 'رقم غير صحيح', code: 'invalid_phone' })
  if (newPass.length < 3) return res.status(400).json({ message: 'كلمة المرور قصيرة', code: 'weak_password' })
  const db = getDb()
  const entry = db.otpCodes?.[phone]
  if (!entry) return res.status(400).json({ message: 'اطلب كود جديد أولاً', code: 'no_otp' })
  if (Date.now() > entry.expiresAt) { delete db.otpCodes[phone]; saveDb(); return res.status(400).json({ message: 'انتهت صلاحية الكود', code: 'expired' }) }
  if (entry.attempts >= 5) { delete db.otpCodes[phone]; saveDb(); return res.status(429).json({ message: 'محاولات كثيرة، اطلب كود جديد', code: 'too_many' }) }
  entry.attempts += 1
  const ok = await bcrypt.compare(code, entry.hash)
  if (!ok) { saveDb(); return res.status(400).json({ message: 'كود غير صحيح', code: 'bad_code' }) }
  delete db.otpCodes[phone]
  const user = db.users.find(u => u.phone === phone)
  if (!user) return res.status(404).json({ message: 'المستخدم غير موجود', code: 'not_found' })
  user.password = await bcrypt.hash(newPass, 10)
  user.mustChangePassword = false
  saveDb()
  res.json({ ok: true, token: signToken(user), user: publicUser(user) })
})

export default router
