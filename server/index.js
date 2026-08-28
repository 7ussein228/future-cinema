import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import authRoutes, { authRequired, adminRequired } from './routes/auth.js'
import movieRoutes from './routes/movies.js'
import bookingRoutes from './routes/bookings.js'
import adminRoutes from './routes/admin.js'
import paymobRoutes from './routes/paymob.js'
import xpayRoutes from './routes/xpay.js'
import { seed } from './seed.js'
import { getDb, initDb } from './db.js'

export const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json({ limit: '6mb' }))

let seedPromise = null
async function ensureSeeded() {
  await initDb()
  if (!seedPromise) seedPromise = seed()
  return seedPromise
}

const isVercel = !!process.env.VERCEL
const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_HOSTNAME

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads') : process.env.NETLIFY ? path.join('/tmp', 'uploads') : isRender ? path.join(__dirname, 'data', 'uploads') : path.join(__dirname, 'uploads')
fs.mkdirSync(UPLOADS_DIR, { recursive: true })
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }))

if (isVercel) {
  app.use(async (req, res, next) => {
    try { await ensureSeeded() } catch (e) { console.error('seed error', e) }
    next()
  })
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'Future Cinema API' })
})

app.get('/api/halls', (req, res) => {
  res.json(getDb().halls || [])
})

app.get('/api/concessions', (req, res) => {
  res.json(getDb().concessions || [])
})

app.get('/api/showtimes/:id', (req, res) => {
  const showtime = getDb().showtimes.find((s) => s.id === req.params.id)
  if (!showtime) return res.status(404).json({ message: 'Showtime not found' })
  res.json({ ...showtime, price: showtime.price != null ? Number(showtime.price) : 100 })
})

app.get('/api/tickets/:id', (req, res) => {
  const db = getDb()
  const b = db.bookings.find((x) => x.id === req.params.id)
  if (!b) return res.status(404).json({ message: 'Ticket not found' })
  const movie = db.movies.find((m) => m.id === b.movieId)
  res.json({
    id: b.id,
    status: b.status,
    date: b.date,
    time: b.time,
    hall: b.hall,
    format: b.format,
    seats: b.seats,
    total: b.total,
    movie: movie ? { title: movie.title } : null
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/movies', movieRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/paymob', paymobRoutes)
app.use('/api/xpay', xpayRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Internal server error', debug: String(err?.stack || err).slice(0, 400) })
})

export default app

if (!process.env.NETLIFY && !process.env.VERCEL) {
  ensureSeeded().then(() => {
    app.listen(PORT, () => {
      console.log(`CineVox API listening on http://localhost:${PORT}`)
    })
  })
}
