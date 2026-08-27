import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useLang } from '../i18n'

export function ticketPayload(b) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/ticket/${b.id}`
}

export default function TicketQR({ booking, size = 150, showHint = true }) {
  const { t } = useLang()
  const name = booking?.customerName || booking?.name || booking?.userName || '—'
  const seats = booking?.seats || []
  const count = seats.length

  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-xl border-2 border-black bg-white text-black">
      {/* Header */}
      <div className="border-b-2 border-dashed border-black px-4 py-3 text-center">
        <p className="text-[11px] font-black tracking-[0.35em]">{t('brand')}</p>
        <p className="mt-0.5 text-[9px] tracking-[0.25em] text-black/60">ADMIT ONE — تذكرة دخول</p>
      </div>

      {/* Details */}
      <div className="px-5 py-4">
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-1.5">
            <span className="font-bold">اسم الحجز</span>
            <span className="max-w-[60%] truncate text-end font-medium">{name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-bold">عدد الكراسي</span>
            <span className="font-black">{count} — {seats.join(', ')}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] text-black/60">
            <span>رقم الحجز</span>
            <span className="font-mono font-bold text-black">{booking?.id}</span>
          </div>
        </div>

        {/* QR */}
        <div className="mt-4 flex justify-center border border-black p-2">
          <QRCodeSVG value={ticketPayload(booking)} size={size} level="M" bgColor="#ffffff" fgColor="#000000" marginSize={0} />
        </div>

        {showHint && (
          <p className="mt-2 text-center text-[10px] leading-tight text-black/50">اعرض هذه التذكرة عند بوابة الدخول — تُمسح للتحقق</p>
        )}
      </div>

      {/* Footer perforation */}
      <div className="border-t-2 border-dashed border-black bg-black/[0.03] px-4 py-2 text-center text-[8px] font-bold tracking-[0.3em] text-black/40">
        FUTURE CINEMA • SUEZ
      </div>
    </div>
  )
}
