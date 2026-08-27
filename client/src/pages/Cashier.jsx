import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { useLang } from '../i18n'
import SeatMap from '../components/SeatMap'
import TicketQR from '../components/TicketQR'
import { HALLS, getHallById } from '../halls'

function dateKey(d) { return d.toISOString().slice(0,10) }

export default function Cashier() {
  const { t, N, lang } = useLang()
  const [movies, setMovies] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [showtimes, setShowtimes] = useState([])
  const [dates, setDates] = useState([])
  const [activeDate, setActiveDate] = useState(null)
  const [selectedShowtime, setSelectedShowtime] = useState(null)
  const [taken, setTaken] = useState([])
  const [selected, setSelected] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [error, setError] = useState('')
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(false)
  // concessions + coupon
  const [concessions, setConcessions] = useState([])
  const [selectedConcessions, setSelectedConcessions] = useState([])
  const [coupon, setCoupon] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponMsg, setCouponMsg] = useState('')

  const seatPrice = Number(selectedShowtime?.price) || 100
  const concessionsTotal = useMemo(() => {
    const map = new Map(concessions.map(c=>[c.id,c.price]))
    return selectedConcessions.reduce((s,id)=> s + (map.get(id)||0), 0)
  }, [selectedConcessions, concessions])
  const seatsTotal = selected.length * seatPrice
  const subtotal = seatsTotal + concessionsTotal
  const total = Math.max(0, subtotal - discountAmount)
  const paidNum = Number(amountPaid) || 0
  const change = paymentMethod === 'cash' ? Math.max(0, paidNum - total) : 0
  const hallConfig = getHallById(selectedShowtime?.hall || '1')

  useEffect(() => {
    api.get('/movies').then(({data}) => {
      const now = data.filter(m=>m.status==='now_showing')
      setMovies(now)
      if(now[0]) setSelectedMovie(now[0])
    })
    const d=[]
    for(let i=0;i<5;i++){ const x=new Date(); x.setDate(x.getDate()+i); d.push(dateKey(x))}
    setDates(d)
    setActiveDate(d[0])
    api.get('/concessions').then(({data})=> setConcessions(data)).catch(()=> api.get('/movies/concessions').then(({data})=>setConcessions(data)).catch(()=>{}))
  }, [])

  useEffect(() => {
    if(!selectedMovie) return
    api.get(`/movies/${selectedMovie.id}/showtimes`).then(({data})=>{
      setShowtimes(data)
      const first = data.filter(s=>s.date===activeDate)[0] || data[0]
      setSelectedShowtime(first || null)
      setSelected([])
      setSelectedConcessions([])
      setAppliedCoupon(''); setDiscountAmount(0); setCoupon(''); setCouponMsg('')
    })
  }, [selectedMovie?.id, activeDate])

  useEffect(() => {
    if(!selectedMovie || !selectedShowtime) return
    setSelected([])
    api.get(`/movies/${selectedMovie.id}/showtimes/${selectedShowtime.id}/seats`).then(({data})=> setTaken(data.takenSeats||[])).catch(()=>setTaken([]))
  }, [selectedShowtime?.id])

  useEffect(()=> {
    if (appliedCoupon === 'FUTURE20') setDiscountAmount(Math.round(subtotal * 0.2))
  }, [subtotal])

  const dayLabel = (d) => {
    const today=dateKey(new Date())
    const tomorrow=dateKey(new Date(Date.now()+86400000))
    if(d===today) return 'اليوم'
    if(d===tomorrow) return 'غداً'
    return new Date(d+'T12:00:00').toLocaleDateString('ar-EG',{weekday:'short'})
  }

  const toggleConcession = (id) => setSelectedConcessions(prev=> prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id])

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase()
    if(!code) return
    setCouponMsg('')
    try{
      const {data} = await api.post('/bookings/validate-coupon', { code, concessions: selectedConcessions, showtimeId: selectedShowtime?.id, seats: selected })
      if(data.valid){
        setAppliedCoupon(data.coupon)
        setDiscountAmount(data.discountAmount||0)
        setCouponMsg(`✓ ${data.coupon} — ${data.discountAmount} ج خصم`)
      }
    }catch(e){
      if(code==='FUTURE20'){
        setAppliedCoupon('FUTURE20')
        const d = Math.round(subtotal*0.2)
        setDiscountAmount(d)
        setCouponMsg(`✓ FUTURE20 — ${d} ج خصم`)
      } else {
        setAppliedCoupon(''); setDiscountAmount(0)
        setCouponMsg(e.response?.data?.message || 'كود غير صحيح')
      }
    }
  }
  const removeCoupon = ()=>{ setAppliedCoupon(''); setDiscountAmount(0); setCoupon(''); setCouponMsg('') }

  const handlePay = async () => {
    setError('')
    if(!selectedShowtime) return setError('اختر موعد العرض')
    if(selected.length===0) return setError('اختر مقعد واحد على الأقل')
    if(!customerName.trim()) return setError('اكتب اسم العميل')
    if(paymentMethod==='cash' && paidNum < total) return setError(`المبلغ المدفوع أقل من الإجمالي (${total} ج.م)`)
    setLoading(true)
    try{
      const {data} = await api.post('/admin/cashier/bookings', {
        showtimeId: selectedShowtime.id,
        seats: selected,
        name: customerName.trim(),
        phone: phone.trim(),
        paymentMethod,
        amountPaid: paymentMethod==='cash' ? paidNum : total,
        concessions: selectedConcessions,
        coupon: appliedCoupon || undefined
      })
      setBooking(data.booking)
      const {data:seatData} = await api.get(`/movies/${selectedMovie.id}/showtimes/${selectedShowtime.id}/seats`)
      setTaken(seatData.takenSeats||[])
    }catch(e){
      setError(e.response?.data?.message || 'حدث خطأ')
    }finally{ setLoading(false)}
  }

  const handlePrint = () => window.print()
  const resetBooking = () => {
    setBooking(null)
    setSelected([])
    setSelectedConcessions([])
    setAppliedCoupon(''); setDiscountAmount(0); setCoupon(''); setCouponMsg('')
    setCustomerName('')
    setPhone('')
    setAmountPaid('')
    setError('')
  }

  if(booking){
    return (
      <main className="min-h-screen bg-white text-black">
        <style>{`@media print {
          body * { visibility: hidden; }
          #receipt-print, #receipt-print * { visibility: visible; }
          #receipt-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display:none !important; }
        }`}</style>
        <div className="container-x py-8">
          <div className="mx-auto max-w-[420px]">
            <div id="receipt-print">
              <div className="overflow-hidden rounded-xl border-2 border-black bg-white text-black">
                <div className="border-b-2 border-dashed border-black px-4 py-3 text-center">
                  <p className="text-sm font-black tracking-[0.3em]">{t('brand')}</p>
                  <p className="mt-0.5 text-[10px] tracking-[0.2em] text-black/60">XCJG+RHC، مدينة نصر، القاهرة — 0227613045</p>
                  <p className="mt-1 text-[9px] text-black/50">{booking.date} • {booking.time} • صالة {booking.hall} • {booking.format}</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-center text-xs font-black">فاتورة حجز — إيصال</p>
                  <p className="mt-1 text-center font-mono text-[11px]">{booking.id}</p>
                  <div className="mt-3 space-y-1.5 border-t border-black/10 pt-3 text-xs">
                    <div className="flex justify-between"><span className="font-bold">اسم الحجز</span><span className="font-medium">{booking.customerName}</span></div>
                    <div className="flex justify-between"><span className="font-bold">الفيلم</span><span className="max-w-[55%] truncate text-end">{booking.movie ? N(booking.movie.title, booking.movie) : ''}</span></div>
                    <div className="flex justify-between"><span className="font-bold">عدد الكراسي</span><span className="font-black">{booking.seats.length} — {booking.seats.join(', ')}</span></div>
                    <div className="flex justify-between text-[11px] text-black/70"><span>سعر التذكرة</span><span>{seatPrice} ج.م × {booking.seats.length}</span></div>
                    {booking.concessions && booking.concessions.length>0 && (
                      <div className="flex justify-between text-[11px]"><span>سناكس</span><span>{booking.concessions.map(c=> c.name?.ar || c.name?.en || c.id).join(', ')} — {booking.concessionsTotal} ج.م</span></div>
                    )}
                    {booking.coupon && (
                      <div className="flex justify-between text-emerald-700"><span>كوبون {booking.coupon}</span><span>-{booking.discountAmount} ج.م</span></div>
                    )}
                    <div className="flex justify-between border-t border-dashed border-black/20 pt-1.5 font-black"><span>الإجمالي</span><span>{booking.total} ج.م</span></div>
                    <div className="flex justify-between text-xs"><span>طريقة الدفع</span><span className="font-bold">{booking.paymentMethod==='cash'?'كاش':'فيزا'}</span></div>
                    {booking.paymentMethod==='cash' && (
                      <>
                        <div className="flex justify-between"><span>المدفوع</span><span>{booking.paidAmount} ج.م</span></div>
                        <div className="flex justify-between font-black"><span>الباقي</span><span>{booking.change} ج.م</span></div>
                      </>
                    )}
                  </div>
                  <div className="mt-4 flex justify-center border border-black p-2">
                    <TicketQR booking={booking} size={170} showHint={false} />
                  </div>
                  <p className="mt-2 text-center font-mono text-[10px] tracking-widest">{booking.id}</p>
                </div>
                <div className="border-t-2 border-dashed border-black bg-black/[0.04] px-4 py-2 text-center text-[8px] font-bold tracking-[0.25em] text-black/50">
                  شكراً لزيارتكم — FUTURE CINEMA
                </div>
              </div>
            </div>
            <div className="no-print mt-6 flex gap-3">
              <button onClick={handlePrint} className="flex-1 rounded-xl bg-black py-3 text-sm font-black text-white"><i className="fa-solid fa-print me-2"/> طباعة الريسيت</button>
              <button onClick={resetBooking} className="flex-1 rounded-xl border-2 border-black py-3 text-sm font-black">حجز جديد</button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-dark pb-10">
      <header className="border-b border-white/10 bg-brand-darker">
        <div className="container-x flex items-center justify-between py-4">
          <h1 className="text-xl font-black">Future Cinema — <span className="text-brand-pink">الكاشير</span></h1>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs">الكاشير — كاش / فيزا</span>
        </div>
      </header>
      <div className="container-x mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="mb-3 text-sm font-black text-white/80"><i className="fa-solid fa-film me-2 text-brand-pink"/>الأفلام</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {movies.map(m=>(
              <button key={m.id} onClick={()=>setSelectedMovie(m)} className={`overflow-hidden rounded-xl border-2 text-start transition ${selectedMovie?.id===m.id ? 'border-brand-pink' : 'border-white/10 hover:border-white/20'}`}>
                <div className="aspect-[2/3] bg-white/5">
                  {m.poster ? <img src={m.poster} alt="" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-white/20"><i className="fa-solid fa-image text-2xl"/></div>}
                </div>
                <div className="bg-brand-card p-2">
                  <p className="line-clamp-1 text-xs font-bold">{N(m.title,m)}</p>
                  <p className="text-[10px] text-white/50">{m.duration} د • {m.ageRating}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-5">
          {selectedMovie ? (
            <>
              <h2 className="mb-3 text-sm font-black text-white/80">الكراسي — <span className="text-white">{N(selectedMovie.title,selectedMovie)}</span></h2>
              <div className="mb-3 flex gap-2 overflow-auto pb-1">
                {dates.map(d=>(
                  <button key={d} onClick={()=>setActiveDate(d)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${activeDate===d ? 'bg-brand-pink text-black' : 'bg-white/10 text-white/70'}`}>
                    <span className="block text-[10px] opacity-70">{dayLabel(d)}</span>
                    <span>{new Date(d+'T12:00:00').toLocaleDateString(lang==='ar'?'ar-EG':'en-US',{day:'numeric', month:'short'})}</span>
                  </button>
                ))}
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {showtimes.filter(s=>s.date===activeDate).map(s=>(
                  <button key={s.id} onClick={()=>setSelectedShowtime(s)} className={`rounded-full px-4 py-1.5 text-xs font-bold ${selectedShowtime?.id===s.id ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>
                    {s.time} <span className="opacity-60">{s.format}</span> • صالة {s.hall} • {s.price || 100} ج.م
                  </button>
                ))}
                {showtimes.filter(s=>s.date===activeDate).length===0 && <p className="text-xs text-white/40">لا توجد عروض في هذا اليوم</p>}
              </div>
              {selectedShowtime ? (
                <div className="rounded-2xl border border-white/10 bg-brand-card p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
                    <span>صالة {hallConfig.name} — {hallConfig.rows}×{hallConfig.cols} ({hallConfig.capacity} مقعد)</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold text-brand-pink">{seatPrice} ج.م / تذكرة {selectedShowtime.price ? '' : ''}</span>
                  </div>
                  <SeatMap takenSeats={taken} selected={selected} onToggle={(s)=> setSelected(prev=> prev.includes(s) ? prev.filter(x=>x!==s) : [...prev,s])} rows={hallConfig.rows} cols={hallConfig.cols} vipRows={hallConfig.vipRows} />
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {selected.length>0 ? selected.sort().map(s=>(
                      <span key={s} className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-black">{s}</span>
                    )) : <span className="text-xs text-white/40">لم يتم اختيار مقاعد بعد</span>}
                  </div>
                  {/* Concessions simple list */}
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-black"><i className="fa-solid fa-popcorn text-amber-300" /> سناكس</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {concessions.map(c=>{
                        const checked = selectedConcessions.includes(c.id)
                        return (
                          <label key={c.id} className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-xs ${checked ? 'border-brand-pink bg-brand-pink/15' : 'border-white/10 bg-white/5'}`}>
                            <span className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={()=>toggleConcession(c.id)} className="accent-brand-pink" />{c.name.ar || c.name.en}</span>
                            <span className="font-bold text-white/70">{c.price}ج</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : <div className="rounded-xl bg-white/5 p-6 text-center text-sm text-white/40">اختر موعد العرض</div>}
            </>
          ) : <div className="rounded-xl bg-white/5 p-10 text-center text-sm text-white/40">اختر فيلماً من القائمة</div>}
        </div>
        <div className="lg:col-span-3">
          <div className="sticky top-6 rounded-2xl border border-white/10 bg-brand-card p-5">
            <h2 className="font-black">الدفع</h2>
            <label className="label mt-4">اسم العميل</label>
            <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="اسم الحجز" className="input" />
            <label className="label mt-3">رقم الموبايل (اختياري)</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" className="input" />
            <div className="mt-4 rounded-xl bg-white/5 p-3 text-sm">
              <div className="flex justify-between"><span className="text-white/60">عدد الكراسي</span><span className="font-bold">{selected.length}</span></div>
              <div className="flex justify-between"><span className="text-white/60">سعر التذكرة</span><span>{seatPrice} ج.م</span></div>
              {concessionsTotal>0 && <div className="flex justify-between"><span className="text-white/60">سناكس</span><span>{concessionsTotal} ج.م</span></div>}
              {discountAmount>0 && <div className="flex justify-between text-emerald-300"><span>خصم {appliedCoupon}</span><span>-{discountAmount} ج.م</span></div>}
              <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-base font-black"><span>الإجمالي</span><span className="text-brand-pink">{total} ج.م</span></div>
            </div>
            {/* coupon */}
            <div className="mt-3">
              <label className="label">كوبون</label>
              <div className="flex gap-2">
                <input value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())} placeholder="FUTURE20" dir="ltr" className="input flex-1" disabled={!!appliedCoupon} />
                {!appliedCoupon ? <button onClick={applyCoupon} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">تطبيق</button> : <button onClick={removeCoupon} className="rounded-xl bg-red-500/20 px-3 py-2 text-xs">إزالة</button>}
              </div>
              {couponMsg && <p className={`mt-1 text-xs ${appliedCoupon?'text-emerald-300':'text-red-300'}`}>{couponMsg}</p>}
              {!appliedCoupon && <p className="mt-1 text-[10px] text-white/40">جرب FUTURE20 خصم 20%</p>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={()=>setPaymentMethod('cash')} className={`rounded-xl py-2.5 text-sm font-black ${paymentMethod==='cash' ? 'bg-brand-pink text-black' : 'bg-white/10 text-white/70'}`}><i className="fa-solid fa-money-bill me-1"/> كاش</button>
              <button onClick={()=>setPaymentMethod('visa')} className={`rounded-xl py-2.5 text-sm font-black ${paymentMethod==='visa' ? 'bg-brand-pink text-black' : 'bg-white/10 text-white/70'}`}><i className="fa-solid fa-credit-card me-1"/> فيزا</button>
            </div>
            {paymentMethod==='cash' && (
              <div className="mt-3">
                <label className="label">المبلغ المدفوع</label>
                <input type="number" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)} placeholder={String(total)} className="input" dir="ltr" />
                <div className={`mt-2 rounded-xl p-3 text-center font-black ${paidNum >= total && selected.length>0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-white/50'}`}>
                  الباقي: {change} ج.م
                </div>
              </div>
            )}
            {paymentMethod==='visa' && (
              <div className="mt-3 rounded-xl bg-blue-500/10 p-3 text-center text-xs text-blue-300">
                سيتم الدفع عبر ماكينة الفيزا — الحجز سيُسجل كمؤكد
              </div>
            )}
            {error && <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-300">{error}</p>}
            <button onClick={handlePay} disabled={loading || !selectedShowtime || selected.length===0} className="btn-primary mt-4 w-full disabled:opacity-40">
              {loading ? <i className="fa-solid fa-spinner fa-spin"/> : `تأكيد الحجز — ${total} ج.م`}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
