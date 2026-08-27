import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { useLang } from '../i18n'

export default function TicketView() {
  const { bookingId } = useParams()
  const { t, N, money } = useLang()
  const [ticket, setTicket] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    axios.get(`/api/tickets/${bookingId}`)
      .then(({ data }) => { setTicket(data); setState('ok') })
      .catch(() => setState('notfound'))
  }, [bookingId])

  if (state === 'loading') {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-white/50" />
      </main>
    )
  }

  if (state === 'notfound') {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="card p-10 text-center">
          <i className="fa-solid fa-circle-question text-4xl text-white/30" />
          <h1 className="mt-4 text-xl font-black">{t('ticket.notFound')}</h1>
        </div>
      </main>
    )
  }

  const confirmed = ticket.status === 'confirmed'

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className={`w-full max-w-md overflow-hidden rounded-3xl border bg-brand-card/80 ${confirmed ? 'border-emerald-500/40' : 'border-red-500/40'}`}>
        <div className={`flex items-center justify-center px-6 py-4 ${confirmed ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
          <span className="text-sm font-black tracking-wide">{t('brand')}</span>
        </div>

        <div className="px-6 py-8 text-center">
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-glow ${
            confirmed ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-red-400 to-rose-600'
          }`}>
            <i className={`fa-solid ${confirmed ? 'fa-check' : 'fa-xmark'}`} />
          </div>
          <h1 className="mt-4 text-2xl font-black">{confirmed ? t('ticket.validTitle') : t('ticket.cancelledTitle')}</h1>
          <p className="mt-1 text-sm text-white/50">{confirmed ? t('ticket.validMsg') : t('ticket.cancelledMsg')}</p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-start">
            <p className="text-lg font-black">{ticket.movie ? N(ticket.movie.title, ticket.movie) : '—'}</p>
            <p className="mt-1 text-sm text-white/60">
              {ticket.date} • {ticket.time} • {t('admin.hall')} {ticket.hall} • {ticket.format}
            </p>
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-xs font-bold text-white/40">{t('profile.seats')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(ticket.seats || []).sort().map((s) => (
                  <span key={s} className="rounded-lg bg-gradient-to-br from-brand-purple to-brand-pink px-3 py-1.5 text-xs font-black text-black">{s}</span>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
              <span className="text-white/40">{t('profile.total')}</span>
              <span className="font-black text-brand-pink">{money(ticket.total)}</span>
            </div>
            <p className="mt-3 text-center text-[10px] tracking-widest text-white/30">#{ticket.id}</p>
          </div>
        </div>
      </div>
    </main>
  )
}
