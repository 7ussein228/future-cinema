import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { useLang } from '../i18n'
import MoviePoster from '../components/MoviePoster'
import { getHallById } from '../halls'

function dateKey(d) {
  return d.toISOString().slice(0, 10)
}

function parseTrailerId(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (/^[\w-]{11}$/.test(s)) return s
  const m = s.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)
  return m ? m[1] : ''
}

export default function MovieDetails() {
  const { id } = useParams()
  const { t, L, N } = useLang()
  const [movie, setMovie] = useState(null)
  const [showtimes, setShowtimes] = useState([])
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [muted, setMuted] = useState(true)
  const playerRef = useRef(null)

  const unmuteTrailer = () => {
    try {
      playerRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
        '*'
      )
      playerRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
        '*'
      )
    } catch { /* ignore */ }
    setMuted(false)
  }

  useEffect(() => {
    axios.get(`/api/movies/${id}`).then(({ data }) => setMovie(data))
    axios.get(`/api/movies/${id}/showtimes`).then(({ data }) => {
      setShowtimes(data)
      if (data.length) {
        const months = [...new Set(data.map((s) => s.date.slice(0, 7)))].sort()
        const firstMonth = months[0]
        setSelectedMonth(firstMonth)
        const monthDates = [...new Set(data.filter((s) => s.date.slice(0, 7) === firstMonth).map((s) => s.date))].sort()
        setDates(monthDates)
        setSelectedDate(monthDates[0] || null)
      } else {
        setDates([])
        setSelectedDate(null)
        setSelectedMonth('')
      }
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!showtimes.length || !selectedMonth) return
    const monthDates = [...new Set(showtimes.filter((s) => s.date.slice(0, 7) === selectedMonth).map((s) => s.date))].sort()
    setDates(monthDates)
    if (!monthDates.includes(selectedDate)) setSelectedDate(monthDates[0] || null)
  }, [selectedMonth, showtimes])

  const dayLabel = (d) => {
    const today = dateKey(new Date())
    const tomorrow = dateKey(new Date(Date.now() + 86400000))
    const date = new Date(d + 'T12:00:00')
    if (d === today) return t('booking.dateToday')
    if (d === tomorrow) return t('booking.dateTomorrow')
    return date.toLocaleDateString(L({ en: 'en-US', ar: 'ar-EG' }), { weekday: 'short' })
  }

  const dateNum = (d) => {
    const date = new Date(d + 'T12:00:00')
    return date.toLocaleDateString(L({ en: 'en-US', ar: 'ar-EG' }), { day: 'numeric', month: 'short' })
  }

  const dayShowtimes = showtimes.filter((s) => s.date === selectedDate)
  const trailerId = parseTrailerId(movie?.trailer)

  if (loading) {
    return <div className="flex justify-center py-32 text-white/50"><i className="fa-solid fa-spinner fa-spin text-3xl" /></div>
  }
  if (!movie) return null

  return (
    <main className="pb-20">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-25">
          <div className="absolute -left-40 top-0 h-[400px] w-[400px] rounded-full bg-brand-purple/50 blur-[120px]" />
          <div className="absolute -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-brand-pink/50 blur-[120px]" />
        </div>
        <div className="container-x relative grid gap-10 py-12 md:grid-cols-[260px_1fr]">
          <MoviePoster movie={movie} className="aspect-[2/3] w-52 max-w-full shadow-glow md:w-full lg:sticky lg:top-24 lg:self-start" />
          <div className="flex flex-col justify-center">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-brand-purple/20 px-3 py-1 font-bold text-brand-pink">{N(movie.genre, movie)}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 font-bold text-white/70">{movie.ageRating}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 font-bold text-white/70">
                {movie.status === 'now_showing' ? t('movie.nowShowingLabel') : t('movie.comingSoonLabel')}
              </span>
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">{N(movie.title, movie)}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/60">
              <span className="flex items-center gap-1.5 text-amber-300"><i className="fa-solid fa-star" /> {movie.rating.toFixed(1)}</span>
              <span><i className="fa-regular fa-clock" /> {movie.duration} {t('movie.duration')}</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link to={`/movie/${movie.id}#showtimes`} onClick={(e) => { e.preventDefault(); document.getElementById('showtimes')?.scrollIntoView({ behavior: 'smooth' }) }} className="btn-primary px-8">
                {t('hero.bookTickets')}
              </Link>
            </div>
            <div className="mt-6">
              <h3 className="text-sm font-black text-white/50">{t('movie.cast')}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {movie.cast.map((c) => (
                  <span key={c} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {trailerId && (
        <section className="border-b border-white/10 py-12">
          <div className="container-x grid items-center gap-10 lg:grid-cols-[1fr_380px]">
            <div>
              <h2 className="section-title">{t('movie.about')}</h2>
              <p className="mt-4 leading-relaxed text-white/70">{N(movie.description, movie)}</p>
            </div>
            <div className="relative">
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 shadow-glow">
                <iframe
                  ref={playerRef}
                  src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&mute=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
                  className="h-full w-full"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  title={N(movie.title, movie)}
                />
              </div>
              {muted && (
                <button
                  onClick={unmuteTrailer}
                  className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/70 px-3.5 py-1.5 text-xs font-bold text-brand-gold backdrop-blur transition hover:bg-black"
                >
                  <i className="fa-solid fa-volume-xmark" /> {t('movie.unmute')}
                </button>
              )}
            </div>
          </div>
        </section>
      )}
      {!trailerId && (
        <section className="border-b border-white/10 py-12">
          <div className="container-x">
            <h2 className="section-title">{t('movie.about')}</h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-white/70">{N(movie.description, movie)}</p>
          </div>
        </section>
      )}

      <section id="showtimes" className="container-x pt-12">
        <h2 className="section-title">{t('movie.showtimes')}</h2>
        {showtimes.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">{t('movie.noShowtimes')}</p>
        ) : (
          <>
            <div className="mt-5">
              <label className="label">اختر الشهر</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input max-w-xs"
              >
                {[...new Set(showtimes.map((s) => s.date.slice(0, 7)))].sort().map((m) => (
                  <option key={m} value={m}>
                    {new Date(m + '-01T12:00:00').toLocaleDateString(L({ en: 'en-US', ar: 'ar-EG' }), { month: 'long', year: 'numeric' })} — {showtimes.filter((s) => s.date.slice(0, 7) === m).length} عروض
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {dates.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`rounded-2xl border px-5 py-3 text-center transition ${
                    selectedDate === d
                      ? 'border-transparent bg-gradient-to-br from-brand-purple to-brand-pink shadow-glow'
                      : 'border-white/10 bg-white/5 hover:border-brand-purple'
                  }`}
                >
                  <span className="block text-xs font-bold text-white/60">{dayLabel(d)}</span>
                  <span className="block text-lg font-black">{dateNum(d)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {showtimes.length > 0 && (
          <div className="mt-8">
            {dayShowtimes.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">لا توجد مواعيد في هذا الشهر — جرّب شهراً آخر</p>
            ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dayShowtimes.map((st) => {
                const hall = getHallById(st.hall)
                return (
                <Link
                  key={st.id}
                  to={`/booking/${st.id}`}
                  className="card group flex items-center justify-between p-5 transition hover:-translate-y-0.5 hover:border-brand-purple"
                >
                  <div>
                    <p className="text-xl font-black text-white">{st.time} <span className="ms-2 text-xs font-bold text-brand-pink">{st.price ? `${st.price} EGP` : ''}</span></p>
                    <p className="mt-1 text-xs text-white/50">
                      {t('admin.hall')} {st.hall} • {st.format} • {hall.rows}×{hall.cols}
                    </p>
                  </div>
                  <div className="text-end">
                    <span className="block text-xs text-white/40">{st.bookedSeats}/{st.capacity}</span>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink px-3 py-1 text-xs font-bold text-white">
                      {t('movie.bookNow')} <i className="fa-solid fa-arrow-right rtl:rotate-180" />
                    </span>
                  </div>
                </Link>
              )})}
            </div>
           )}
          </div>
        )}
      </section>
     </main>
   )
}
