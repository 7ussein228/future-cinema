import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useLang } from '../i18n'
import { useAuth } from '../contexts/AuthContext'
import TicketQR from '../components/TicketQR'

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const COLS = 12

function MiniSeats({ selected }) {
  const set = new Set(selected)
  return (
    <div className="grid grid-cols-12 gap-1">
      {ROWS.flatMap((row) =>
        Array.from({ length: COLS }, (_, i) => {
          const seat = `${row}${i + 1}`
          return (
            <span
              key={seat}
              className={`aspect-square rounded-t ${set.has(seat) ? 'bg-gradient-to-br from-brand-purple to-brand-pink' : 'bg-white/10'}`}
            />
          )
        })
      )}
    </div>
  )
}

function parseShowtimeDateTime(b) {
  if (!b || !b.date || !b.time) return null
  const dateStr = String(b.date).trim()
  const timeStr = String(b.time).trim()
  let iso = `${dateStr}T${timeStr}`
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(iso)) iso += ':00'
  let d = new Date(iso)
  if (!isNaN(d.getTime())) return d
  d = new Date(`${dateStr} ${timeStr}`)
  if (!isNaN(d.getTime())) return d
  return null
}
function canCancelBooking(b) {
  if (!b) return false
  if (!['confirmed', 'pending'].includes(b.status)) return false
  const dt = parseShowtimeDateTime(b)
  if (!dt) return false
  return dt.getTime() - Date.now() > 2 * 60 * 60 * 1000
}

export default function Profile() {
  const { t, N, money } = useLang()
  const { user } = useAuth()
  const [bookings, setBookings] = useState(null)
  const [modal, setModal] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    api
      .get('/bookings')
      .then(({ data }) => setBookings(data))
      .catch(() => setBookings([]))
  }, [])

  const handleCancel = async (id) => {
    if (!confirm(t('profile.cancelConfirm'))) return
    setCancelError('')
    setCancelling(id)
    try {
      const { data } = await api.post(`/bookings/${id}/cancel`)
      const updated = data.booking || data
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)))
    } catch (e) {
      const msg = e.response?.data?.message || t('common.error')
      setCancelError(msg)
      alert(msg)
    } finally {
      setCancelling(null)
    }
  }

  return (
    <main className="pb-20">
      <section className="border-b border-white/10 bg-gradient-to-b from-brand-purple/15 to-transparent py-10">
        <div className="container-x">
          <h1 className="text-3xl font-black">
            {t('profile.hello')} {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-white/50">{t('booking.myTickets')}</p>
        </div>
      </section>

      <section className="container-x pt-8">
        {cancelError && <p className="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">{cancelError}</p>}
        {bookings && bookings.length === 0 && (
          <div className="card flex flex-col items-center gap-4 p-12 text-center">
            <i className="fa-solid fa-ticket text-5xl text-white/20" />
            <p className="text-white/50">{t('profile.noBookings')}</p>
            <Link to="/movies" className="btn-primary">{t('profile.browseMovies')}</Link>
          </div>
        )}

        {bookings && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className={`card p-5 sm:p-6 ${b.status === 'cancelled' ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-brand-pink text-black">
                      <i className="fa-solid fa-film" />
                    </span>
                    <div>
                      <p className="font-black">{b.movie ? N(b.movie.title, b.movie) : b.movieId}</p>
                      <p className="mt-0.5 text-sm text-white/50">
                        {b.date} • {b.time} • {t('admin.hall')} {b.hall} • {b.format}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
                    <div className="text-end">
                      <p className="text-xs text-white/40">{t('profile.seats')}</p>
                      <p className="font-bold">{b.seats.join(', ')}</p>
                    </div>
                    <div className="text-end">
                      <p className="text-xs text-white/40">{t('profile.total')}</p>
                      <p className="font-bold text-brand-pink">{money(b.total)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${
                      b.status === 'cancelled' ? 'bg-red-500/15 text-red-300' : b.status === 'pending' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
                    }`}>
                      {b.status === 'cancelled' ? t('profile.cancelled') : b.status === 'pending' ? t('profile.pending') : t('profile.confirmed')}
                    </span>
                  </div>
                </div>

                {b.status !== 'cancelled' && (
                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setModal({ type: 'details', b })} className="flex-1 rounded-full bg-white/10 px-4 py-2 text-xs font-bold transition hover:bg-white/20">
                        <i className="fa-solid fa-chair me-1.5" /> {t('profile.details')}
                      </button>
                      {b.status === 'confirmed' && (
                        <button onClick={() => setModal({ type: 'qr', b })} className="flex-1 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink px-4 py-2 text-xs font-bold text-black transition hover:opacity-90">
                          <i className="fa-solid fa-qrcode me-1.5" /> {t('profile.showQr')}
                        </button>
                      )}
                      {canCancelBooking(b) && (
                        <button
                          disabled={cancelling === b.id}
                          onClick={() => handleCancel(b.id)}
                          className="flex-1 rounded-full bg-red-500/15 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {cancelling === b.id ? <i className="fa-solid fa-spinner fa-spin me-1.5" /> : <i className="fa-solid fa-ban me-1.5" />}
                          {t('profile.cancel')}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-white/40">{t('booking.bookingId')}: <span className="font-bold text-white/70">{b.id}</span></p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="card relative w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setModal(null)}
              className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm transition hover:bg-white/20"
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            {modal.type === 'qr' ? (
              <div className="pt-6">
                <TicketQR booking={modal.b} size={150} />
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-black">{t('profile.details')}</h3>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black ${
                    modal.b.status === 'cancelled' ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'
                  }`}>
                    <i className={`fa-solid ${modal.b.status === 'cancelled' ? 'fa-ban' : 'fa-circle-check'} me-1`} />
                    {modal.b.status === 'cancelled' ? t('profile.cancelled') : t('profile.confirmed')}
                  </span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <MiniSeats selected={modal.b.seats} />
                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {modal.b.seats.sort().map((s) => (
                      <span key={s} className="rounded-md bg-gradient-to-br from-brand-purple to-brand-pink px-2 py-0.5 text-[10px] font-black text-black">{s}</span>
                    ))}
                  </p>
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="flex justify-between"><span className="text-white/40">{t('admin.date')}</span><span>{modal.b.date}</span></p>
                  <p className="flex justify-between"><span className="text-white/40">{t('admin.time')}</span><span>{modal.b.time}</span></p>
                  <p className="flex justify-between"><span className="text-white/40">{t('admin.hall')}</span><span>{modal.b.hall} • {modal.b.format}</span></p>
                  <p className="flex justify-between"><span className="text-white/40">{t('auth.name')}</span><span>{modal.b.customerName || user?.name}</span></p>
                  <p className="flex justify-between border-t border-white/10 pt-2"><span className="text-white/40">{t('profile.total')}</span><span className="font-black text-brand-pink">{money(modal.b.total)}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
