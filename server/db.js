import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { supabase, hasSupabase } from './supabase.js'

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
  { code: 'FUTURE20', discount: 0.2, type: 'percent', active: true, expiresAt: null, minAmount: 0 },
  { code: 'RORO100', type: 'seats_free', maxSeats: 2, active: true, expiresAt: null, minAmount: 0 }
]

let db = null

function getDefaultDb() {
  return {
    users: [],
    movies: [],
    showtimes: [],
    bookings: [],
    halls: DEFAULT_HALLS,
    concessions: DEFAULT_CONCESSIONS,
    coupons: DEFAULT_COUPONS,
    nextIds: { user: 1, movie: 1, showtime: 1, booking: 1, concession: 7, coupon: 2 }
  }
}

function runMigrations(d) {
  if (!d.halls || !Array.isArray(d.halls) || d.halls.length === 0) {
    d.halls = DEFAULT_HALLS
  } else {
    for (const h of d.halls) {
      if (!h.vipRows) h.vipRows = ['A']
      if (!h.capacity) h.capacity = h.rows * h.cols
    }
  }
  if (Array.isArray(d.showtimes)) {
    for (const s of d.showtimes) {
      if (s.price == null) {
        const fmt = s.format || '2D'
        s.price = fmt === 'IMAX' ? 150 : fmt === '3D' ? 120 : 100
      }
    }
  }
  if (!d.concessions || !Array.isArray(d.concessions) || d.concessions.length === 0) {
    d.concessions = DEFAULT_CONCESSIONS
    if (!d.nextIds) d.nextIds = {}
    d.nextIds.concession = 7
  }
  if (!d.coupons || !Array.isArray(d.coupons) || d.coupons.length === 0) {
    d.coupons = DEFAULT_COUPONS
    if (!d.nextIds) d.nextIds = {}
    d.nextIds.coupon = 2
  }
  if (!d.nextIds) d.nextIds = {}
  if (d.nextIds.concession == null) d.nextIds.concession = (d.concessions?.length || 6) + 1
  if (d.nextIds.coupon == null) d.nextIds.coupon = (d.coupons?.length || 1) + 1
  if (d.nextIds.user == null) d.nextIds.user = (d.users?.length || 0) + 1
  if (d.nextIds.movie == null) d.nextIds.movie = (d.movies?.length || 0) + 1
  if (d.nextIds.showtime == null) d.nextIds.showtime = (d.showtimes?.length || 0) + 1
  if (d.nextIds.booking == null) d.nextIds.booking = (d.bookings?.length || 0) + 1
}

async function loadFromSupabase() {
  if (!hasSupabase) return null
  try {
    const { data, error } = await supabase.from('app_state').select('data').eq('id', 'main').single()
    if (error) {
      console.error('Supabase read error:', error.message)
      return null
    }
    return data?.data || null
  } catch (e) {
    console.error('Supabase read failed:', e.message)
    return null
  }
}

function loadFromFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('File read error:', e.message)
  }
  return null
}

function saveToFile(d) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2))
  } catch (e) {
    console.error('File write error:', e.message)
  }
}

async function saveToSupabase(d) {
  if (!hasSupabase) return
  try {
    const { error } = await supabase
      .from('app_state')
      .upsert({ id: 'main', data: d }, { onConflict: 'id' })
    if (error) console.error('Supabase write error:', error.message)
  } catch (e) {
    console.error('Supabase write failed:', e.message)
  }
}

export async function initDb() {
  if (db) return db

  if (hasSupabase) {
    console.log('Loading database from Supabase...')
    db = await loadFromSupabase()
    if (db) {
      console.log('Database loaded from Supabase')
      runMigrations(db)
      return db
    }
    console.log('No Supabase data, creating default...')
    db = getDefaultDb()
    runMigrations(db)
    await saveToSupabase(db)
    return db
  }

  console.log('No Supabase, loading from file...')
  db = loadFromFile()
  if (db) {
    runMigrations(db)
    return db
  }
  db = getDefaultDb()
  runMigrations(db)
  saveToFile(db)
  return db
}

export function loadDb() {
  if (db) return db
  if (hasSupabase) {
    loadFromSupabase().then((data) => {
      if (data) {
        db = data
        runMigrations(db)
      }
    })
  } else {
    db = loadFromFile()
    if (db) {
      runMigrations(db)
    }
  }
  if (!db) {
    db = getDefaultDb()
    runMigrations(db)
  }
  return db
}

export function saveDb() {
  if (hasSupabase) {
    saveToSupabase(db)
  }
  saveToFile(db)
}

export function getDb() {
  return loadDb()
}

export function nextId(collection) {
  const d = getDb()
  if (!d.nextIds) d.nextIds = {}
  const id = d.nextIds[collection] || 1
  d.nextIds[collection] = id + 1
  saveDb()
  return id
}
