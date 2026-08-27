import React, { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useLang } from '../i18n'
import TicketQR from '../components/TicketQR'

export default function PaymentResult() {
  const { bookingId } = useParams()
  const location = useLocation()
  const { t, N, money } = useLang()
  const [booking, setBooking] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!bookingId || bookingId === 'unknown') return setNotFound(true)
    let stop = false

    async function check() {
      try {
        if (!stop && location.search.includes('gateway=xpay')) {
          const p = new URLSearchParams(location.search)
          await axios.post('/api/xpay/confirm', {
            bookingId,
            sessionId: p.get('session_id') || p.get('sessionId') || p.get('id') || ''
          }).catch(() => {})
        } else if (!stop && location.search.includes('hmac=')) {
          await axios.post('/api/paymob/confirm', {
            search: location.search,
            bk: bookingId
          }).catch(() => {})
        }
        const { data } = await axios.get(`/api/bookings/${bookingId}`)
        if (stop) return
        setBooking(data)
        if (data.status === 'pending') setTimeout(check, 2500)
      } catch {
        if (!stop) setNotFound(true)
      }
    }

    check()
    return () => { stop = true }
  }, [bookingId])

  if (notFound) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="card w-full max-w-md p-10 text-center">
          <i className="fa-solid fa-circle-exclamation text-4xl text-red-400" />
          <h1 className="mt-4 text-xl font-black">{t('booking.failedTitle')}</h1>
          <Link to="/movies" className="btn-primary mt-6">{t('profile.browseMovies')}</Link>
        </div>
      </main>
    )
  }

  if (!booking || booking.status === 'pending') {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="card w-full max-w-md p-10 text-center">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-brand-pink" />
          <h1 className="mt-4 text-xl font-black">{t('booking.pendingTitle')}</h1>
          <p className="mt-2 text-sm text-white/50">{t('booking.pendingMsg')}</p>
        </div>
      </main>
    )
  }

  if (booking.status !== 'confirmed') {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="card w-full max-w-md p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-2xl text-red-300">
            <i className="fa-solid fa-xmark" />
          </div>
          <h1 className="text-2xl font-black">{t('booking.failedTitle')}</h1>
          <p className="mt-2 text-sm text-white/50">{t('booking.failedMsg')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/movies" className="btn-primary">{t('common.backHome')}</Link>
            <Link to="/profile" className="btn-outline">{t('booking.myTickets')}</Link>
          </div>
        </div>
      </main>
    )
  }

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
              <p className="font-black text-brand-pink">{booking.id}</p>
            </div>
            <div className="text-end">
              <p className="text-xs text-white/50">{t('profile.total')}</p>
              <p className="font-black">{money(booking.total)}</p>
            </div>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4 text-start">
            <p className="font-bold">{N(booking.movie?.title, booking.movie)}</p>
            <p className="mt-1 text-sm text-white/60">
              {booking.date} • {booking.time} • {t('admin.hall')} {booking.hall} • {booking.format}
            </p>
            <p className="mt-1 text-sm text-white/60">{t('profile.seats')}: <span className="font-bold text-white">{booking.seats.join(', ')}</span></p>
            <div className="mt-4 flex justify-center">
              <TicketQR booking={booking} />
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
