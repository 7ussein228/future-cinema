import express from 'express'
import { getDb } from '../db.js'

const router = express.Router()

// public concessions list for upsell
router.get('/concessions', (req, res) => {
  res.json(getDb().concessions || [])
})

router.get('/', (req, res) => {
  const db = getDb()
  const { q, genre, status } = req.query
  let movies = [...db.movies]
  if (status) movies = movies.filter((m) => m.status === status)
  if (genre) movies = movies.filter((m) => m.genre.en === genre)
  if (q) {
    const needle = String(q).toLowerCase()
    movies = movies.filter(
      (m) =>
        m.title.en.toLowerCase().includes(needle) ||
        m.title.ar.includes(needle) ||
        m.genre.en.toLowerCase().includes(needle) ||
        m.genre.ar.includes(needle)
    )
  }
  res.json(movies)
})

router.get('/genres', (req, res) => {
  const db = getDb()
  const genres = []
  for (const m of db.movies) {
    if (!genres.some((g) => g.en === m.genre.en)) {
      genres.push(m.genre)
    }
  }
  res.json(genres)
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const movie = db.movies.find((m) => m.id === req.params.id)
  if (!movie) return res.status(404).json({ message: 'Movie not found' })
  res.json(movie)
})

function getHallCapacity(db, hallId) {
  const hall = (db.halls || []).find((h) => h.id === String(hallId))
  if (hall) return hall.capacity || hall.rows * hall.cols
  return 96
}

router.get('/halls', (req, res) => {
  res.json(getDb().halls || [])
})

router.get('/:id/showtimes', (req, res) => {
  const db = getDb()
  const { date } = req.query
  const movie = db.movies.find((m) => m.id === req.params.id)
  if (!movie) return res.status(404).json({ message: 'Movie not found' })
  let showtimes = db.showtimes.filter((st) => st.movieId === movie.id)
  if (date) showtimes = showtimes.filter((st) => st.date === date)
  const booked = {}
  for (const b of db.bookings) {
    if (b.status !== 'cancelled') {
      booked[b.showtimeId] = (booked[b.showtimeId] || 0) + (b.seats ? b.seats.length : 0)
    }
  }
  res.json(
    showtimes.map((st) => ({
      ...st,
      price: st.price != null ? Number(st.price) : 100,
      bookedSeats: booked[st.id] || 0,
      capacity: getHallCapacity(db, st.hall)
    }))
  )
})

router.get('/:id/showtimes/:showtimeId/seats', (req, res) => {
  const db = getDb()
  const showtime = db.showtimes.find((s) => s.id === req.params.showtimeId)
  if (!showtime) return res.status(404).json({ message: 'Showtime not found' })
  const taken = []
  for (const b of db.bookings) {
    if (b.showtimeId === showtime.id && b.status !== 'cancelled') {
      taken.push(...(b.seats || []))
    }
  }
  res.json({ showtime, takenSeats: taken })
})

export default router
