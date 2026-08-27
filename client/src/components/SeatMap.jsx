import React from 'react'
import { useLang } from '../i18n'

export default function SeatMap({ takenSeats = [], selected = [], onToggle, maxSelectable = 10, rows = 8, cols = 12, vipRows = ['A'] }) {
  const { t } = useLang()
  const takenSet = new Set(takenSeats)
  const vipSet = new Set((vipRows || []).map((r) => String(r).toUpperCase()))

  const ROWS = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i))
  const COLS = cols

  const toggle = (seat) => {
    if (takenSet.has(seat)) return
    if (selected.includes(seat)) onToggle(seat)
    else if (selected.length < maxSelectable) onToggle(seat)
  }

  return (
    <div className="select-none">
      <div className="mb-6 flex justify-center">
        <div className="w-4/5 rounded-t-3xl border-4 border-b-0 border-white/20 px-6 py-3 text-center text-xs font-black tracking-[0.4em] text-white/60">
          {t('booking.screen')}
        </div>
      </div>

      <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {ROWS.flatMap((row) =>
          Array.from({ length: COLS }, (_, i) => {
            const seat = `${row}${i + 1}`
            const isTaken = takenSet.has(seat)
            const isSelected = selected.includes(seat)
            const isVip = vipSet.has(row)
            return (
              <button
                key={seat}
                onClick={() => toggle(seat)}
                disabled={isTaken}
                title={isVip ? `${seat} — VIP` : seat}
                aria-label={isTaken ? `${seat} - ${t('booking.taken')}` : seat}
                className={`aspect-square rounded-t-lg font-bold transition sm:aspect-[1.6] sm:text-[10px] ${
                  isTaken
                    ? 'cursor-not-allowed bg-white/10 text-white/35'
                    : isSelected
                      ? 'scale-110 bg-gradient-to-br from-brand-purple to-brand-pink text-white shadow-glow ring-1 ring-white/20'
                      : isVip
                        ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40 hover:scale-110 hover:bg-amber-400/30'
                        : 'bg-white/25 text-white/70 hover:scale-110 hover:bg-white/40'
                }`}
              >
                {isTaken
                  ? <i className="fa-solid fa-xmark" aria-hidden="true" />
                  : <span className="hidden text-[9px] sm:inline">{seat}{isVip ? '★' : ''}</span>}
              </button>
            )
          })
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs text-white/50">
        <span className="flex items-center gap-2"><span className="h-4 w-6 rounded-md bg-white/25" /> {t('booking.available')}</span>
        <span className="flex items-center gap-2"><span className="h-4 w-6 rounded-md bg-amber-400/20 ring-1 ring-amber-400/40" /> VIP</span>
        <span className="flex items-center gap-2"><span className="h-4 w-6 rounded-md bg-gradient-to-br from-brand-purple to-brand-pink" /> {t('booking.selected')}</span>
        <span className="flex items-center gap-2"><span className="h-4 w-6 rounded-md bg-white/10" /> {t('booking.taken')}</span>
      </div>
    </div>
  )
}
