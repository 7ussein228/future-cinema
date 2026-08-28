import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { useLang } from '../i18n'
import { useAuth } from '../contexts/AuthContext'
import SeatMap from '../components/SeatMap'
import MoviePoster from '../components/MoviePoster'
import TicketQR from '../components/TicketQR'
import { getHallById } from '../halls'

function dateKey(d) {
  return d.toISOString().slice(0, 10)
}

export default function Booking() {
  const { showtimeId } = useParams()
  const { t, L, N, money } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [showtime, setShowtime] = useState(null)
  const [movie, setMovie] = useState(null)
  const [taken, setTaken] = useState([])
  const [selected, setSelected] = useState([])
  const [phone, setPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [dates, setDates] = useState([])
  const [date, setDate] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [allShowtimes, setAllShowtimes] = useState([])
  const [dayShowtimes, setDayShowtimes] = useState([])
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  // concessions + coupon
  const [concessions, setConcessions] = useState([])
  const [selectedConcessions, setSelectedConcessions] = useState([])
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponMsg, setCouponMsg] = useState('')
  const [couponValidating, setCouponValidating] = useState(false)

  const seatPrice = Number(showtime?.price) || 100
  const serviceFee = 0

  useEffect(() => {
    axios.get(`/api/showtimes/${showtimeId}`).then(async ({ data: st }) => {
      setShowtime(st)
      setDate((prev) => prev ?? st.date)
      setSelectedMonth((prev) => prev ?? st.date.slice(0, 7))
      const [seatsRes, movieRes] = await Promise.all([
        axios.get(`/api/movies/${st.movieId}/showtimes/${st.id}/seats`),
        axios.get(`/api/movies/${st.movieId}`)
      ])
      setTaken(seatsRes.data.takenSeats)
      setMovie(movieRes.data)
    })

    if (user) {
      setCustomerName((p) => p || user.name)
      setPhone((p) => p || user.phone || '')
    }
  }, [showtimeId])

  useEffect(() => {
    // fetch concessions public endpoint
    axios.get('/api/concessions').then(({ data }) => setConcessions(data)).catch(() => {
      axios.get('/api/movies/concessions').then(({ data }) => setConcessions(data)).catch(() => {})
    })
  }, [])

  const movieId = showtime?.movieId

  useEffect(() => {
    if (!movieId) return
    axios.get(`/api/movies/${movieId}/showtimes`).then(({ data }) => {
      setAllShowtimes(data)
      if (data.length && !selectedMonth) {
        const m = date ? date.slice(0, 7) : data[0].date.slice(0, 7)
        setSelectedMonth(m)
      }
    })
  }, [movieId])

  useEffect(() => {
    if (!allShowtimes.length || !selectedMonth) return
    const monthDates = [...new Set(allShowtimes.filter((s) => s.date.slice(0, 7) === selectedMonth).map((s) => s.date))].sort()
    setDates(monthDates)
    if (!date || !monthDates.includes(date)) {
      setDate(monthDates[0] || null)
    }
  }, [allShowtimes, selectedMonth])

  useEffect(() => {
    if (!date) { setDayShowtimes([]); return }
    setDayShowtimes(allShowtimes.filter((s) => s.date === date))
  }, [allShowtimes, date])

  const concessionsTotal = useMemo(() => {
    const map = new Map(concessions.map(c => [c.id, c.price]))
    return selectedConcessions.reduce((sum, id) => sum + (map.get(id) || 0), 0)
  }, [selectedConcessions, concessions])

  const seatsTotal = selected.length * seatPrice
  const subtotal = seatsTotal + concessionsTotal
  const total = Math.max(0, subtotal - discountAmount)
  const hallConfig = getHallById(showtime?.hall || '1')

  const timePicked = dayShowtimes.some((s) => s.id === showtimeId)
  const canPay = timePicked && selected.length > 0

  // reset discount if concessions/seats change after coupon applied - re-validate locally
  useEffect(() => {
    if (!appliedCoupon) return
    // recompute discount for percent coupons (FUTURE20 = 20%)
    // we keep discountAmount as is but if subtotal changed, discount should update for percent
    // easiest: if FUTURE20, recompute 20%
    if (appliedCoupon === 'FUTURE20') {
      setDiscountAmount(Math.round(subtotal * 0.2))
    }
  }, [subtotal, appliedCoupon])

  const toggleConcession = (id) => {
    setSelectedConcessions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    // if coupon applied, keep but discount will be recalculated via effect
  }

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponValidating(true)
    setCouponMsg('')
    try {
      const { data } = await axios.post('/api/bookings/validate-coupon', {
        code,
        concessions: selectedConcessions,
        showtimeId,
        seats: selected
      })
      if (data.valid) {
        setAppliedCoupon(data.coupon)
        setDiscountAmount(data.discountAmount || 0)
        setCouponMsg(`✓ ${data.coupon} applied — ${money(data.discountAmount)} off`)
      } else {
        setCouponMsg(data.message || 'Invalid coupon')
      }
    } catch (e) {
      // fallback: client side check for FUTURE20 if server fails
      if (code === 'FUTURE20') {
        setAppliedCoupon('FUTURE20')
        const d = Math.round(subtotal * 0.2)
        setDiscountAmount(d)
        setCouponMsg(`✓ FUTURE20 applied — ${money(d)} off`)
      } else {
        setAppliedCoupon('')
        setDiscountAmount(0)
        setCouponMsg(e.response?.data?.message || 'Invalid coupon')
      }
    } finally {
      setCouponValidating(false)
    }
  }
  const removeCoupon = () => {
    setAppliedCoupon('')
    setCouponInput('')
    setDiscountAmount(0)
    setCouponMsg('')
  }

  const dayLabel = (d) => {
    const today = dateKey(new Date())
    const tomorrow = dateKey(new Date(Date.now() + 86400000))
    const dd = new Date(d + 'T12:00:00')
    if (d === today) return t('booking.dateToday')
    if (d === tomorrow) return t('booking.dateTomorrow')
    return dd.toLocaleDateString(L({ en: 'en-US', ar: 'ar-EG' }), { weekday: 'short' })
  }

  const placeOrder = async () => {
    if (selected.length === 0) return setError(t('booking.chooseSeatHint'))
    if (!customerName.trim()) return setError(t('booking.nameRequired'))
    setError('')
    setPlacing(true)
    try {
      const token = localStorage.getItem('cinevox-token')
      const { data } = await axios.post(
        '/api/bookings',
        { showtimeId, seats: selected, name: customerName, phone, concessions: selectedConcessions, coupon: appliedCoupon || undefined },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      )
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }
      setSuccess(data.booking)
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'))
    } finally {
      setPlacing(false)
    }
  }

  const steps = [
    { num: '1', label: t('booking.selectDate') },
    { num: '2', label: t('booking.selectTime') },
    { num: '3', label: t('booking.selectSeats') },
    { num: '4', label: t('booking.payment') }
  ]

  if (success) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="card w-full max-w-lg p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-2xl text-white shadow-glow">
            <i className="fa-solid fa-check" />
          </div>
          <h1 className="text-2xl font-black">{t('booking.successTitle')}</h1>
          <p className="mt-2 text-sm text-white/50">{t('booking.successMsg')}</p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-brand-purple/20 to-brand-pink/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="text-start">
                <p className="text-xs text-white/50">{t('booking.bookingId')}</p>
                <p className="font-black text-brand-pink">{success.id}</p>
              </div>
              <div className="text-end">
                <p className="text-xs text-white/50">{t('profile.total')}</p>
                <p className="font-black">{money(success.total)}</p>
              </div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-4 text-start">
              <p className="font-bold">{N(movie?.title, movie)}</p>
              <p className="mt-1 text-sm text-white/60">
                {success.date} • {success.time} • {t('admin.hall')} {success.hall} • {success.format}
              </p>
              <p className="mt-1 text-sm text-white/60">{t('profile.seats')}: <span className="font-bold text-white">{success.seats.join(', ')}</span></p>
              {success.concessions && success.concessions.length > 0 && (
                <p className="mt-1 text-sm text-white/60">Concessions: <span className="font-bold text-white">{success.concessions.map(c => L(c.name) || c.name?.en || c.id).join(', ')}</span></p>
              )}
              {success.coupon && (
                <p className="mt-1 text-sm text-emerald-300">Coupon {success.coupon} — {money(success.discountAmount)} off</p>
              )}
              <div className="mt-4 flex justify-center">
                <TicketQR booking={success} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/profile" className="btn-primary">{t('booking.myTickets')}</Link>
            <Link to="/" className="btn-outline">{t('common.backHome')}</Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="pb-20">
      <section className="border-b border-white/10 bg-gradient-to-b from-brand-purple/15 to-transparent pb-6 pt-8">
        <div className="container-x">
          <div className="flex items-center gap-4">
            {movie && <MoviePoster movie={movie} rounded className="h-24 w-16" />}
            <div>
              <Link to={`/movie/${movie?.id}`} className="text-xs text-brand-pink transition hover:underline">{t('movie.back')}</Link>
              <h1 className="text-2xl font-black">{movie ? N(movie.title, movie) : ''}</h1>
              {showtime && (
                <p className="mt-1 text-sm text-white/60">
                  {showtime.date} • {showtime.time} • {t('admin.hall')} {showtime.hall} • {showtime.format} • {money(Number(showtime.price) || 100)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container-x pt-8">
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                i === 3 ? 'bg-gradient-to-br from-brand-purple to-brand-pink text-white shadow-glow' : 'bg-white/10 text-white/60'
              }`}>
                {s.num}
              </span>
              <span className="text-xs font-bold text-white/60">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <div>
              <h2 className="mb-3 text-lg font-black">{t('booking.selectDate')}</h2>
              {/* Month picker — supports even 10 years ahead: any month with showtimes appears */}
              <div className="mb-3">
                <label className="label">اختر الشهر</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="month"
                    value={selectedMonth || ''}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="input max-w-[200px]"
                  />
                  <span className="text-xs text-white/40">حتى لو بعد 10 سنين — لو فيه مواعيد هتظهر</span>
                </div>
                {allShowtimes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[...new Set(allShowtimes.map((s) => s.date.slice(0, 7)))].sort().map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedMonth(m)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${selectedMonth === m ? 'bg-brand-pink text-black' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                      >
                        {new Date(m + '-01T12:00:00').toLocaleDateString(L({ en: 'en-US', ar: 'ar-EG' }), { month: 'long', year: 'numeric' })}
                        <span className="ms-1 opacity-60">({allShowtimes.filter((s) => s.date.slice(0, 7) === m).length})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {dates.length ? dates.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDate(d)}
                    className={`rounded-2xl border px-4 py-2 text-center transition ${
                      date === d ? 'border-transparent bg-gradient-to-br from-brand-purple to-brand-pink' : 'border-white/10 bg-white/5 hover:border-brand-purple'
                    }`}
                  >
                    <span className="block text-xs text-white/60">{dayLabel(d)}</span>
                    <span className="block text-sm font-black">{new Date(d + 'T12:00:00').toLocaleDateString(L({ en: 'en-US', ar: 'ar-EG' }), { day: 'numeric', month: 'short' })}</span>
                  </button>
                )) : (
                  <p className="text-sm text-white/40">لا توجد مواعيد في هذا الشهر — جرّب شهراً آخر فيه مواعيد</p>
                )}
              </div>
            </div>

            {date && (
              <div>
                <h2 className="mb-3 text-lg font-black">{t('booking.selectTime')}</h2>
                <div className="flex flex-wrap gap-2">
                  {dayShowtimes.map((s) => (
                    <Link
                      key={s.id}
                      to={`/booking/${s.id}`}
                      className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                        s.id === showtimeId
                          ? 'border-transparent bg-gradient-to-r from-brand-purple to-brand-pink text-black'
                          : 'border-white/10 bg-white/5 hover:border-brand-purple hover:bg-brand-purple/10'
                      }`}
                    >
                      {s.time} <span className="text-[10px] font-normal opacity-60">{s.format}</span>
                    </Link>
                  ))}
                  {dayShowtimes.length === 0 && (
                    <p className="text-sm text-white/40">{t('movie.noShowtimes')}</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-3 text-lg font-black">{t('booking.selectSeats')}</h2>
              {timePicked ? (
                <div className="card p-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
                    <span>Hall {hallConfig.name} — {hallConfig.rows}×{hallConfig.cols} ({hallConfig.capacity} seats) • {seatPrice} EGP / ticket</span>
                    {hallConfig.vipRows?.length ? <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-300">VIP rows: {hallConfig.vipRows.join(', ')}</span> : null}
                  </div>
                  <SeatMap takenSeats={taken} selected={selected} onToggle={(s) => setSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])} rows={hallConfig.rows} cols={hallConfig.cols} vipRows={hallConfig.vipRows} />
                </div>
              ) : (
                <div className="card flex flex-col items-center gap-2 p-10 text-center">
                  <i className="fa-solid fa-lock text-xl text-white/40" />
                  <p className="text-sm text-white/50">{t('booking.lockedSeats')}</p>
                </div>
              )}
            </div>

            {/* Concessions upsell */}
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-black"><i className="fa-solid fa-popcorn text-amber-300" /> Popcorn & Concessions</h2>
              <div className="card p-4">
                {concessions.length === 0 ? (
                  <p className="text-sm text-white/40">Loading concessions...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {concessions.map(c => {
                      const checked = selectedConcessions.includes(c.id)
                      return (
                        <label key={c.id} className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition ${checked ? 'border-brand-pink bg-brand-pink/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} onChange={() => toggleConcession(c.id)} className="h-4 w-4 accent-brand-pink" />
                            <span className="text-sm font-bold">{L(c.name) || c.name.en}</span>
                          </div>
                          <span className="text-xs text-white/60">{money(c.price)}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
                {selectedConcessions.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-white/50">Selected:</span>
                    {selectedConcessions.map(id => {
                      const c = concessions.find(x => x.id === id)
                      return <span key={id} className="rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-200">{c ? (L(c.name) || c.name.en) : id}</span>
                    })}
                  </div>
                )}
                <p className="mt-3 text-xs text-white/40">Add snacks to your order — will be ready at the counter.</p>
              </div>
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-black">{t('booking.payment')}</h2>
              <label className="label">{t('booking.customerName')}</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t('auth.name')}
                className="input"
              />
              <label className="label mt-4">{t('booking.phone')}</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                inputMode="tel"
                maxLength={11}
                className="input"
                dir="ltr"
              />
              <p className="mt-2 text-xs text-white/40">{t('booking.payWithPaymob')}</p>

              <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>{t('booking.pricePerTicket')} × {selected.length} {seatPrice !== 100 ? `(${money(seatPrice)} each)` : ''}</span>
                  <span>{money(seatsTotal)}</span>
                </div>
                {concessionsTotal > 0 && (
                  <div className="flex justify-between text-white/60">
                    <span>Concessions ({selectedConcessions.length})</span>
                    <span>{money(concessionsTotal)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between font-bold text-emerald-300">
                    <span>Discount {appliedCoupon && `(${appliedCoupon})`}</span>
                    <span>-{money(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-lg font-black">
                  <span>{t('booking.total')}</span>
                  <span className="text-brand-pink">{money(total)}</span>
                </div>
              </div>

              {/* Coupon input */}
              <div className="mt-4">
                <label className="label">Coupon</label>
                <div className="flex gap-2">
                  <input value={couponInput} onChange={(e)=>setCouponInput(e.target.value.toUpperCase())} placeholder="FUTURE20" className="input flex-1" dir="ltr" disabled={!!appliedCoupon} />
                  {!appliedCoupon ? (
                    <button onClick={applyCoupon} disabled={couponValidating || !couponInput.trim()} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-black hover:bg-white/20 disabled:opacity-40">
                      {couponValidating ? <i className="fa-solid fa-spinner fa-spin" /> : 'Apply'}
                    </button>
                  ) : (
                    <button onClick={removeCoupon} className="rounded-xl bg-red-500/20 px-4 py-2 text-xs font-bold text-red-300">Remove</button>
                  )}
                </div>
                {couponMsg && <p className={`mt-1 text-xs ${appliedCoupon ? 'text-emerald-300' : 'text-red-300'}`}>{couponMsg}</p>}
                <p className="mt-1 text-[11px] text-white/40">Try FUTURE20 for 20% off</p>
              </div>

              {error && <p className="mt-3 rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-300">{error}</p>}

              {!canPay && (
                <p className="mt-3 text-center text-xs text-white/40">
                  <i className="fa-solid fa-lock" /> {timePicked ? t('booking.chooseSeatHint') : t('booking.lockedPay')}
                </p>
              )}

              <button
                onClick={placeOrder}
                disabled={placing || !canPay}
                className={`btn-primary mt-3 w-full ${!canPay ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {placing ? <i className="fa-solid fa-spinner fa-spin" /> : t('booking.pay')}
              </button>
            </div>

            {selected.length > 0 && (
              <div className="card flex flex-wrap items-center gap-2 p-4">
                <span className="text-xs font-bold text-white/50">{t('booking.selected')}:</span>
                {selected.sort().map((s) => (
                  <span key={s} className="rounded-full bg-gradient-to-br from-brand-purple to-brand-pink px-2.5 py-1 text-xs font-black">{s}</span>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}
