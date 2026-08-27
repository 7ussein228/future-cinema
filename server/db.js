import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isNetlify = !!process.env.NETLIFY
const isVercel = !!process.env.VERCEL
const isRender = !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_HOSTNAME
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : isNetlify ? path.join('/tmp', 'data') : isRender ? path.join(__dirname, 'data') : path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

export const DEFAULT_HALLS = [
  { id: '1', name: '1', rows: 8, cols: 12, vipRows: ['A'], capacity: 96 },
  { id: '2', name: '2', rows: 6, cols: 10, vipRows: ['A'], capacity: 60 },
  { id: '3', name: '3', rows: 10, cols: 14, vipRows: ['A', 'B'], capacity: 140 },
  { id: '4', name: '4', rows: 7, cols: 12, vipRows: ['A'], capacity: 84 }
]

export const DEFAULT_CONCESSIONS = [
  { id: 'pop_sm', name: { en: 'Popcorn Small', ar: 'فشار صغير' }, price: 50, image: null },
  { id: 'pop_md', name: { en: 'Popcorn Medium', ar: 'فشار وسط' }, price: 80, image: null },
  { id: 'pop_lg', name: { en: 'Popcorn Large', ar: 'فشار كبير' }, price: 110, image: null },
  { id: 'nachos', name: { en: 'Nachos', ar: 'ناتشوز' }, price: 70, image: null },
  { id: 'soda', name: { en: 'Soda', ar: 'مشروب غازي' }, price: 40, image: null },
  { id: 'water', name: { en: 'Water', ar: 'مياه' }, price: 30, image: null }
]

export const DEFAULT_COUPONS = [
  { code: 'FUTURE20', discount: 0.2, type: 'percent', active: true, expiresAt: null, minAmount: 0 }
]

let db = null

export function loadDb() {
  if (db) return db
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
    // migration: ensure halls exists
    if (!db.halls || !Array.isArray(db.halls) || db.halls.length === 0) {
      db.halls = DEFAULT_HALLS
      saveDb()
    } else {
      // ensure each hall has vipRows and capacity
      let mutated = false
      for (const h of db.halls) {
        if (!h.vipRows) { h.vipRows = ['A']; mutated = true }
        if (!h.capacity) { h.capacity = h.rows * h.cols; mutated = true }
      }
      if (mutated) saveDb()
    }
    // migration: ensure existing showtimes have price
    if (Array.isArray(db.showtimes)) {
      let mutated = false
      for (const s of db.showtimes) {
        if (s.price == null) {
          // default price by format fallback
          const fmt = s.format || '2D'
          s.price = fmt === 'IMAX' ? 150 : fmt === '3D' ? 120 : 100
          mutated = true
        }
      }
      if (mutated) saveDb()
    }
  } else {
    db = {
      users: [],
      movies: [],
      showtimes: [],
      bookings: [],
      halls: DEFAULT_HALLS,
      concessions: DEFAULT_CONCESSIONS,
      coupons: DEFAULT_COUPONS,
      nextIds: { user: 1, movie: 1, showtime: 1, booking: 1, concession: 7, coupon: 2 }
    }
    saveDb()
  }
  // migration: ensure concessions exists
  if (!db.concessions || !Array.isArray(db.concessions) || db.concessions.length === 0) {
    db.concessions = DEFAULT_CONCESSIONS
    if (!db.nextIds.concession) db.nextIds.concession = 7
    saveDb()
  }
  if (!db.coupons || !Array.isArray(db.coupons) || db.coupons.length === 0) {
    db.coupons = DEFAULT_COUPONS
    if (!db.nextIds.coupon) db.nextIds.coupon = 2
    saveDb()
  }
  if (db.nextIds && db.nextIds.concession == null) { db.nextIds.concession = (db.concessions?.length || 6) + 1; saveDb() }
  if (db.nextIds && db.nextIds.coupon == null) { db.nextIds.coupon = (db.coupons?.length || 1) + 1; saveDb() }
  return db
}

export function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

export function getDb() {
  return loadDb()
}

export function nextId(collection) {
  const d = getDb()
  const id = d.nextIds[collection] || 1
  d.nextIds[collection] = id + 1
  saveDb()
  return id
}
