import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useLang } from '../i18n'
import { useAuth } from '../contexts/AuthContext'
import MoviePoster from '../components/MoviePoster'
import { HALLS } from '../halls'

const emptyMovie = {
  title: { en: '', ar: '' },
  description: { en: '', ar: '' },
  genre: { en: '', ar: '' },
  lang: 'en',
  duration: 120,
  rating: 7,
  ageRating: 'PG-13',
  status: 'now_showing',
  cast: '',
  trailer: '',
  poster: '',
  featured: false
}

export default function Admin() {
  const { t, L, N, money: moneyFmt } = useLang()
  const { token, user } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [movies, setMovies] = useState([])
  const [showtimes, setShowtimes] = useState([])
  const [bookings, setBookings] = useState([])
  const [editing, setEditing] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyMovie)
  const [newShowtime, setNewShowtime] = useState({ movieId: '', date: '', time: '18:00', hall: '1', format: '2D', price: 100 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [users, setUsers] = useState([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', phone: '', password: '', role: 'cashier' })
  const [refundingId, setRefundingId] = useState(null)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterMethod, setFilterMethod] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const onPosterFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setError('')
    if (!f.type.startsWith('image/')) return setError(t('admin.posterImageOnly'))
    if (f.size > 3 * 1024 * 1024) return setError(t('admin.posterTooBig'))
    setUploading(true)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result)
        r.onerror = reject
        r.readAsDataURL(f)
      })
      const { data } = await axios.post('/api/admin/upload', { data: dataUrl }, { headers })
      setForm((p) => ({ ...p, poster: data.url }))
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'))
    } finally {
      setUploading(false)
    }
  }

  const headers = { Authorization: `Bearer ${token}` }
  const money = moneyFmt

  const load = async () => {
    setLoading(true)
    try {
      const [s, m, st, b, u] = await Promise.all([
        axios.get('/api/admin/stats', { headers }),
        axios.get('/api/admin/movies', { headers }),
        axios.get('/api/admin/showtimes', { headers }),
        axios.get('/api/admin/bookings', { headers }),
        axios.get('/api/admin/users', { headers })
      ])
      setStats(s.data)
      setMovies(m.data)
      setShowtimes(st.data)
      setBookings(b.data)
      setUsers(u.data)
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') load()
  }, [user])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyMovie)
    setShowModal(true)
  }
  const openEdit = (m) => {
    setEditing(m)
    setForm({
      title: { ...m.title },
      description: { ...m.description },
      genre: { ...m.genre },
      lang: m.lang || 'en',
      duration: m.duration,
      rating: m.rating,
      ageRating: m.ageRating,
      status: m.status,
      cast: (m.cast || []).join(', '),
      trailer: m.trailer || '',
      poster: m.poster || '',
      featured: !!m.featured
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
  }

  const saveMovie = async () => {
    setError('')
    try {
      const payload = {
        ...form,
        cast: form.cast.split(',').map((c) => c.trim()).filter(Boolean)
      }
      if (editing) await axios.put(`/api/admin/movies/${editing.id}`, payload, { headers })
      else await axios.post('/api/admin/movies', payload, { headers })
      closeModal()
      load()
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'))
    }
  }

  const deleteMovie = async (id) => {
    if (!confirm(t('admin.delete'))) return
    try {
      await axios.delete(`/api/admin/movies/${id}`, { headers })
      load()
    } catch (e) {
      alert(e.response?.data?.message || t('common.error'))
    }
  }

  const addShowtime = async () => {
    setError('')
    if (!newShowtime.movieId || !newShowtime.date) return
    try {
      await axios.post('/api/admin/showtimes', { ...newShowtime, price: Number(newShowtime.price) || 100 }, { headers })
      setNewShowtime({ movieId: '', date: '', time: '18:00', hall: '1', format: '2D', price: 100 })
      load()
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'))
    }
  }

  const createUser = async () => {
    setError('')
    if (!newUser.name.trim() || !newUser.phone.trim() || !newUser.password.trim()) {
      return setError('جميع الحقول مطلوبة')
    }
    try {
      await axios.post('/api/admin/users', newUser, { headers })
      setShowUserModal(false)
      setNewUser({ name: '', phone: '', password: '', role: 'cashier' })
      load()
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'))
    }
  }

  const resetPassword = async (id) => {
    if (!confirm('إعادة تعيين كلمة المرور إلى 123؟ سيُطلب من المستخدم تغييرها عند الدخول القادم.')) return
    setError('')
    try {
      await axios.post(`/api/admin/users/${id}/reset-password`, {}, { headers })
      alert('تمت إعادة التعيين إلى 123')
      load()
    } catch (e) {
      setError(e.response?.data?.message || t('common.error'))
    }
  }

  const deleteShowtime = async (id) => {
    if (!confirm(t('admin.delete'))) return
    try {
      await axios.delete(`/api/admin/showtimes/${id}`, { headers })
      load()
    } catch (e) {
      alert(e.response?.data?.message || t('common.error'))
    }
  }

  const handleRefund = async (id) => {
    if (!confirm('تأكيد استرجاع الحجز؟ سيتم إلغاء الحجز ومحاولة استرجاع المبلغ عبر XPay.')) return
    setRefundingId(id)
    setError('')
    try {
      const { data } = await axios.post(`/api/admin/bookings/${id}/refund`, {}, { headers })
      const updated = data.booking || data
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated, movie: b.movie || updated.movie, user: b.user || updated.user } : b)))
    } catch (e) {
      const msg = e.response?.data?.message || t('common.error')
      setError(msg)
      alert(msg)
    } finally {
      setRefundingId(null)
    }
  }

  if (!user) return null

  const tabs = [
    { id: 'dashboard', label: t('admin.dashboard'), icon: 'fa-gauge-high' },
    { id: 'movies', label: t('admin.movies'), icon: 'fa-film' },
    { id: 'showtimes', label: t('admin.showtimes'), icon: 'fa-clock' },
    { id: 'bookings', label: t('admin.bookings'), icon: 'fa-ticket' },
    { id: 'users', label: t('admin.users'), icon: 'fa-users' }
  ]

  const today = new Date().toISOString().slice(0, 10)

  // helpers for filters
  const getPaymentMethod = (b) => {
    if (b.paymentMethod === 'cash' || b.paymentMethod === 'visa' || b.paymentMethod === 'online') return b.paymentMethod
    // cashier bookings have explicit method, others are online
    if (b.paymobOrderId || b.xpaySessionId) return 'online'
    return 'online'
  }
  const inDateRange = (b) => {
    if (filterFrom && b.date < filterFrom) return false
    if (filterTo && b.date > filterTo) return false
    return true
  }
  const isDateFiltered = !!(filterFrom || filterTo)
  const filteredActive = bookings.filter((b) => b.status !== 'cancelled' && inDateRange(b))
  const filteredRevenue = filteredActive.reduce((s, b) => s + (Number(b.total) || 0), 0)
  const filteredCount = filteredActive.length
  const filteredBookings = bookings.filter((b) => {
    if (filterFrom && b.date < filterFrom) return false
    if (filterTo && b.date > filterTo) return false
    if (filterMethod !== 'all' && getPaymentMethod(b) !== filterMethod) return false
    if (filterStatus !== 'all' && b.status !== filterStatus) return false
    return true
  })
  // cashier shift summary: if date filtered use that range, else today
  const shiftScope = isDateFiltered ? filteredActive : bookings.filter((b) => b.status !== 'cancelled' && b.date === today)
  const cashTotal = shiftScope.filter((b) => getPaymentMethod(b) === 'cash').reduce((s, b) => s + (Number(b.total) || 0), 0)
  const visaTotal = shiftScope.filter((b) => getPaymentMethod(b) === 'visa').reduce((s, b) => s + (Number(b.total) || 0), 0)
  const onlineTotal = shiftScope.filter((b) => getPaymentMethod(b) === 'online').reduce((s, b) => s + (Number(b.total) || 0), 0)
  const changeSum = shiftScope.reduce((s, b) => s + (Number(b.change) || 0), 0)
  const shiftCount = shiftScope.length

  const clearFilters = () => {
    setFilterFrom('')
    setFilterTo('')
    setFilterMethod('all')
    setFilterStatus('all')
  }

  const exportCSV = () => {
    const cols = ['id', 'movie', 'date', 'time', 'seats', 'total', 'paymentMethod', 'status']
    const escape = (v) => {
      const s = String(v ?? '')
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const header = cols.join(',')
    const rows = filteredBookings.map((b) => {
      const movieName = b.movie ? N(b.movie.title, b.movie) : (b.movieId || '—')
      const seats = Array.isArray(b.seats) ? b.seats.join(' ') : ''
      return [b.id, movieName, b.date, b.time, seats, b.total, getPaymentMethod(b), b.status].map(escape).join(',')
    })
    const csv = '\ufeff' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'future-cinema-bookings.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const title = 'Future Cinema - Bookings'
    const movieName = (b) => (b.movie ? N(b.movie.title, b.movie) : (b.movieId || '—'))
    const rowsHtml = filteredBookings.map((b) => `
      <tr>
        <td>${b.id}</td>
        <td>${movieName(b)}</td>
        <td>${b.date}</td>
        <td>${b.time}</td>
        <td>${Array.isArray(b.seats) ? b.seats.join(', ') : ''}</td>
        <td>${b.total}</td>
        <td>${getPaymentMethod(b)}</td>
        <td>${b.status}</td>
      </tr>
    `).join('')
    const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${title}</title>
      <style>
        body{font-family:system-ui,Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 8px}
        p{font-size:12px;color:#555;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:start}
        th{background:#f3f3f3}
        @media print{button{display:none}}
      </style></head><body>
      <h1>${title}</h1>
      <p>من: ${filterFrom || '—'} إلى: ${filterTo || '—'} | طريقة الدفع: ${filterMethod} | الحالة: ${filterStatus} | العدد: ${filteredBookings.length}</p>
      <table><thead><tr><th>id</th><th>movie</th><th>date</th><th>time</th><th>seats</th><th>total</th><th>paymentMethod</th><th>status</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan=8 style=text-align:center>لا يوجد حجوزات</td></tr>'}</tbody></table>
      <script>window.onload=()=>window.print()</script>
      </body></html>`
    const w = window.open('', '_blank')
    if (w) {
      w.document.open()
      w.document.write(html)
      w.document.close()
    } else {
      // fallback to print current
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      document.body.appendChild(iframe)
      iframe.contentDocument.open()
      iframe.contentDocument.write(html)
      iframe.contentDocument.close()
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    }
  }

  return (
    <main className="pb-20">
      <section className="border-b border-white/10 bg-gradient-to-b from-brand-purple/15 to-transparent py-8">
        <div className="container-x flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="section-title">{t('nav.admin')}</h1>
            <p className="mt-1 text-sm text-white/50">{user.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  tab === tb.id ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white' : 'bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                <i className={`fa-solid ${tb.icon} me-1.5`} /> {tb.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x pt-8">
        {error && <p className="mb-6 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-20 text-white/50"><i className="fa-solid fa-spinner fa-spin text-3xl" /></div>
        ) : (
          <>
            {tab === 'dashboard' && stats && (
              <div className="space-y-6">
                <div className="card flex flex-wrap items-end gap-3 p-4">
                  <div className="flex flex-1 flex-wrap gap-3">
                    <div>
                      <label className="label">من</label>
                      <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label">إلى</label>
                      <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="input" />
                    </div>
                    {(filterFrom || filterTo) && (
                      <button onClick={clearFilters} className="self-end rounded-full bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20">مسح الفلتر</button>
                    )}
                  </div>
                  <p className="text-xs text-white/50">يتم فلترة الإيراد وعدد الحجوزات حسب التاريخ (حقل date للحجز). الكلي vs المفلتر.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="card p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                      <i className="fa-solid fa-sack-dollar" />
                    </span>
                    <p className="mt-4 text-3xl font-black">{money(isDateFiltered ? filteredRevenue : stats.revenue)}</p>
                    <p className="mt-1 text-sm text-white/50">{t('admin.totalRevenue')}</p>
                    {isDateFiltered && <p className="mt-1 text-xs text-white/40">المفلتر: {money(filteredRevenue)} | الإجمالي: {money(stats.revenue)}</p>}
                  </div>
                  <div className="card p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-brand-pink text-white">
                      <i className="fa-solid fa-ticket" />
                    </span>
                    <p className="mt-4 text-3xl font-black">{isDateFiltered ? filteredCount : stats.bookings}</p>
                    <p className="mt-1 text-sm text-white/50">{t('admin.activeBookings')}</p>
                    {isDateFiltered && <p className="mt-1 text-xs text-white/40">المفلتر: {filteredCount} | الإجمالي: {stats.bookings}</p>}
                  </div>
                  <div className="card p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                      <i className="fa-solid fa-users" />
                    </span>
                    <p className="mt-4 text-3xl font-black">{stats.users}</p>
                    <p className="mt-1 text-sm text-white/50">{t('admin.registeredUsers')}</p>
                  </div>
                  <div className="card p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white">
                      <i className="fa-solid fa-clock" />
                    </span>
                    <p className="mt-4 text-3xl font-black">{stats.showtimes}</p>
                    <p className="mt-1 text-sm text-white/50">{t('admin.activeShowtimes')}</p>
                  </div>
                </div>

                <div className="card p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-black">وردية الكاشير <span className="text-xs font-normal text-white/40">({isDateFiltered ? `${filterFrom || '—'} → ${filterTo || '—'}` : `اليوم ${today}`} • {shiftCount} حجوزات)</span></h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                      <p className="text-xs text-white/50">نقدي (cash)</p>
                      <p className="mt-1 text-lg font-black text-emerald-300">{money(cashTotal)}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                      <p className="text-xs text-white/50">فيزا</p>
                      <p className="mt-1 text-lg font-black text-sky-300">{money(visaTotal)}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                      <p className="text-xs text-white/50">أونلاين</p>
                      <p className="mt-1 text-lg font-black text-amber-300">{money(onlineTotal)}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                      <p className="text-xs text-white/50">الباقي (change) • العدد</p>
                      <p className="mt-1 text-lg font-black">{money(changeSum)} <span className="text-xs font-normal text-white/40">• {shiftCount} حجز</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'movies' && (
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-black">{t('admin.movies')} ({movies.length})</h2>
                  <button onClick={openAdd} className="btn-primary px-5 py-2 text-sm">
                    <i className="fa-solid fa-plus" /> {t('admin.addMovie')}
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {movies.map((m) => (
                    <div key={m.id} className="card flex gap-4 p-4">
                      <MoviePoster movie={m} rounded className="h-28 w-20 shrink-0" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="truncate font-bold">{N(m.title, m)}</h3>
                        <p className="mt-1 text-xs text-white/50">{L(m.genre)} • {m.duration} {t('movie.duration')}</p>
                        <p className="mt-1 text-xs text-amber-300"><i className="fa-solid fa-star" /> {m.rating}</p>
                        <span className="mt-2 w-fit rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/70">
                          {m.status === 'now_showing' ? t('admin.nowShowing') : t('admin.comingSoon')}
                        </span>
                        <div className="mt-auto flex gap-2 pt-3">
                          <button onClick={() => openEdit(m)} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold transition hover:bg-white/20">
                            <i className="fa-solid fa-pen" /> {t('admin.edit')}
                          </button>
                          <button onClick={() => deleteMovie(m.id)} className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300 transition hover:bg-red-500/30">
                            <i className="fa-solid fa-trash" /> {t('admin.delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'showtimes' && (
              <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
                <div className="card h-fit p-5">
                  <h2 className="mb-4 text-lg font-black">{t('admin.newShowtime')}</h2>
                  <label className="label">{t('admin.movie')}</label>
                  <select value={newShowtime.movieId} onChange={(e) => setNewShowtime({ ...newShowtime, movieId: e.target.value })} className="input mb-3">
                    <option value="">--</option>
                    {movies.map((m) => <option key={m.id} value={m.id}>{N(m.title, m)}</option>)}
                  </select>
                  <label className="label">{t('admin.date')}</label>
                  <input type="date" min={today} value={newShowtime.date} onChange={(e) => setNewShowtime({ ...newShowtime, date: e.target.value })} className="input mb-3" />
                  <label className="label">{t('admin.time')}</label>
                  <input type="time" value={newShowtime.time} onChange={(e) => setNewShowtime({ ...newShowtime, time: e.target.value })} className="input mb-3" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">{t('admin.hall')}</label>
                      <select value={newShowtime.hall} onChange={(e) => setNewShowtime({ ...newShowtime, hall: e.target.value })} className="input">
                        {HALLS.map((h) => <option key={h.id} value={h.id}>Hall {h.name} — {h.rows}×{h.cols} ({h.capacity}) VIP:{h.vipRows.join(',')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">{t('admin.format')}</label>
                      <select value={newShowtime.format} onChange={(e) => setNewShowtime({ ...newShowtime, format: e.target.value })} className="input">
                        {['2D', '3D', 'IMAX', '4DX'].map((f) => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="label">Ticket Price (EGP)</label>
                    <input type="number" min="10" max="1000" value={newShowtime.price} onChange={(e) => setNewShowtime({ ...newShowtime, price: e.target.value })} className="input" placeholder="100" />
                    <p className="mt-1 text-[10px] text-white/40">Variable per showtime — e.g. 100 for 2D, 120 for 3D, 150 for IMAX</p>
                  </div>
                  <button onClick={addShowtime} className="btn-primary mt-5 w-full"><i className="fa-solid fa-plus" /> {t('admin.addShowtime')}</button>
                </div>

                <div className="space-y-3">
                  {showtimes.map((s) => {
                    const hallInfo = HALLS.find((h) => h.id === String(s.hall))
                    return (
                    <div key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-brand-pink text-sm font-black">{s.hall}</span>
                        <div>
                          <p className="text-sm font-bold">{s.movie ? N(s.movie.title, s.movie) : s.movieId} <span className="ms-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-black text-brand-pink">{money(s.price || 100)}</span></p>
                          <p className="text-xs text-white/50">{s.date} • {s.time} • {s.format} • {hallInfo ? `${hallInfo.rows}×${hallInfo.cols} (${hallInfo.capacity})` : ''}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteShowtime(s.id)} className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/30">
                        <i className="fa-solid fa-trash" /> {t('admin.delete')}
                      </button>
                    </div>
                  )})}
                  {showtimes.length === 0 && <p className="py-10 text-center text-white/40">{t('admin.noBookings')}</p>}
                </div>
              </div>
            )}

            {tab === 'bookings' && (
              <>
                <div className="card mb-4 flex flex-col gap-4 p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="label">من</label>
                      <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label">إلى</label>
                      <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label">طريقة الدفع</label>
                      <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="input">
                        <option value="all">الكل</option>
                        <option value="cash">cash</option>
                        <option value="visa">visa</option>
                        <option value="online">online</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">الحالة</label>
                      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input">
                        <option value="all">الكل</option>
                        <option value="confirmed">confirmed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="pending">pending</option>
                      </select>
                    </div>
                    <button onClick={clearFilters} className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20">مسح</button>
                    <div className="ms-auto flex flex-wrap gap-2">
                      <button onClick={exportCSV} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"><i className="fa-solid fa-file-csv me-1.5" />تصدير CSV</button>
                      <button onClick={exportPDF} className="rounded-full bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700"><i className="fa-solid fa-file-pdf me-1.5" />تصدير PDF</button>
                    </div>
                  </div>
                  <p className="text-xs text-white/40">المعروض: {filteredBookings.length} من {bookings.length} حجز | المفلتر بإيراد: {money(filteredBookings.filter(b=>b.status!=='cancelled').reduce((s,b)=>s+(Number(b.total)||0),0))}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="text-xs text-white/50">وردية الكاشير — نقدي</p>
                      <p className="mt-1 text-sm font-black text-emerald-300">{money(cashTotal)}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="text-xs text-white/50">وردية الكاشير — فيزا</p>
                      <p className="mt-1 text-sm font-black text-sky-300">{money(visaTotal)}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="text-xs text-white/50">وردية الكاشير — أونلاين</p>
                      <p className="mt-1 text-sm font-black text-amber-300">{money(onlineTotal)}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="text-xs text-white/50">الباقي + العدد ({isDateFiltered ? 'المحدد' : `اليوم ${today}`})</p>
                      <p className="mt-1 text-sm font-black">{money(changeSum)} <span className="text-xs font-normal text-white/40">• {shiftCount} حجز</span></p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 md:hidden">
                  {filteredBookings.map((b) => (
                    <div key={b.id} className="card space-y-3 p-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold">{b.movie ? N(b.movie.title, b.movie) : '—'}</p>
                          <p className="mt-0.5 text-xs text-white/50">{b.date} • {b.time} • {t('admin.hall')} {b.hall || '—'} • {getPaymentMethod(b)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                          b.status === 'cancelled' ? 'bg-red-500/15 text-red-300' : b.status === 'pending' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
                        }`}>
                          {b.status === 'cancelled' ? t('profile.cancelled') : b.status === 'pending' ? 'pending' : t('profile.confirmed')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/10 pt-3 text-xs">
                        <span className="text-white/40">{t('booking.bookingId')}: <span className="font-bold text-brand-pink">{b.id}</span></span>
                        <span className="truncate text-white/40">{t('admin.user')}: <span className="font-bold text-white/80">{b.customerName || b.user?.name || '—'}<br/><span dir='ltr' className='text-xs text-white/40'>{b.customerPhone || ''}</span></span></span>
                        <span className="text-white/40">{t('profile.seats')}: <span className="font-bold text-white/80">{Array.isArray(b.seats) ? b.seats.join(', ') : '—'}</span></span>
                        <span className="text-white/40">{t('profile.total')}: <span className="font-bold text-brand-pink">{money(b.total)}</span> <span className="text-white/40">({getPaymentMethod(b)})</span></span>
                      </div>
                      {b.status !== 'cancelled' && (
                        <div className="flex justify-end border-t border-white/10 pt-3">
                          <button
                            disabled={refundingId === b.id}
                            onClick={() => handleRefund(b.id)}
                            className="rounded-full bg-red-500/15 px-4 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                          >
                            {refundingId === b.id ? <i className="fa-solid fa-spinner fa-spin me-1.5" /> : <i className="fa-solid fa-rotate-left me-1.5" />}
                            استرجاع
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredBookings.length === 0 && (
                    <div className="card p-10 text-center text-white/40">{t('admin.noBookings')}</div>
                  )}
                </div>

                <div className="card hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-start text-xs text-white/40">
                      <th className="p-4 text-start">{t('booking.bookingId')}</th>
                      <th className="p-4 text-start">{t('admin.user')}</th>
                      <th className="p-4 text-start">{t('admin.movieCol')}</th>
                      <th className="p-4 text-start">{t('admin.date')}</th>
                      <th className="p-4 text-start">{t('admin.time')}</th>
                      <th className="p-4 text-start">{t('profile.seats')}</th>
                      <th className="p-4 text-start">{t('profile.total')}</th>
                      <th className="p-4 text-start">{t('profile.status')}</th>
                      <th className="p-4 text-start">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="border-b border-white/5 text-white/80">
                        <td className="p-4 font-bold text-brand-pink">{b.id}</td>
                        <td className="p-4">{b.customerName || b.user?.name || '—'}<br/><span dir='ltr' className='text-xs text-white/40'>{b.customerPhone || ''}</span></td>
                        <td className="p-4">{b.movie ? N(b.movie.title, b.movie) : '—'}</td>
                        <td className="p-4">{b.date}</td>
                        <td className="p-4">{b.time}</td>
                        <td className="p-4">{Array.isArray(b.seats) ? b.seats.join(', ') : '—'}</td>
                        <td className="p-4 font-bold">{money(b.total)}<br/><span className="text-xs font-normal text-white/40">{getPaymentMethod(b)}</span></td>
                        <td className="p-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            b.status === 'cancelled' ? 'bg-red-500/15 text-red-300' : b.status === 'pending' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
                          }`}>
                            {b.status === 'cancelled' ? t('profile.cancelled') : b.status === 'pending' ? 'pending' : t('profile.confirmed')}
                          </span>
                        </td>
                        <td className="p-4">
                          {b.status !== 'cancelled' ? (
                            <button
                              disabled={refundingId === b.id}
                              onClick={() => handleRefund(b.id)}
                              className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                            >
                              {refundingId === b.id ? <i className="fa-solid fa-spinner fa-spin me-1" /> : <i className="fa-solid fa-rotate-left me-1" />}
                              استرجاع
                            </button>
                          ) : (
                            <span className="text-xs text-white/30">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredBookings.length === 0 && (
                      <tr><td colSpan={9} className="p-10 text-center text-white/40">{t('admin.noBookings')}</td></tr>
                    )}
                  </tbody>
                </table>
                </div>
              </>
            )}

            {tab === 'users' && (
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-black">{t('admin.users')} ({users.length})</h2>
                  <button onClick={() => setShowUserModal(true)} className="btn-primary px-5 py-2 text-sm">
                    <i className="fa-solid fa-user-plus" /> {t('admin.addUser')}
                  </button>
                </div>

                <div className="card overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-start text-xs text-white/40">
                        <th className="p-4 text-start">{t('auth.name')}</th>
                        <th className="p-4 text-start">{t('auth.phone')}</th>
                        <th className="p-4 text-start">الدور</th>
                        <th className="p-4 text-start">{t('profile.memberSince')}</th>
                        <th className="p-4 text-start">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-white/5 text-white/80">
                          <td className="p-4 font-bold">{u.name}</td>
                          <td className="p-4" dir="ltr">{u.phone || '—'}</td>
                          <td className="p-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                              u.role === 'admin' ? 'bg-red-500/15 text-red-300' : u.role === 'cashier' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/10 text-white/70'
                            }`}>
                              {u.role === 'admin' ? 'أدمن' : u.role === 'cashier' ? 'كاشير' : 'مستخدم'}
                            </span>
                            {u.mustChangePassword && <span className="ms-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">يجب التغيير</span>}
                          </td>
                          <td className="p-4 text-xs text-white/50">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
                          <td className="p-4">
                            {u.id !== user.id && (
                              <button onClick={() => resetPassword(u.id)} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold hover:bg-white/20">
                                <i className="fa-solid fa-key me-1"/> Reset 123
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan={5} className="p-10 text-center text-white/40">لا يوجد مستخدمون</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShowUserModal(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-5 text-xl font-black">{t('admin.addUser')}</h2>
            <div className="grid gap-4">
              <div><label className="label">{t('auth.name')}</label><input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="input" placeholder={t('auth.namePlaceholder')} /></div>
              <div><label className="label">{t('auth.phone')}</label><input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className="input" dir="ltr" placeholder="01xxxxxxxxx" /></div>
              <div><label className="label">{t('auth.password')}</label><input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="input" dir="ltr" placeholder="••••••" /></div>
              <div>
                <label className="label">الدور</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="input">
                  <option value="cashier">كاشير</option>
                  <option value="admin">أدمن</option>
                  <option value="user">مستخدم</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={createUser} className="btn-primary flex-1">{t('admin.save')}</button>
              <button onClick={() => setShowUserModal(false)} className="btn-outline">{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-5 text-xl font-black">{editing ? t('admin.editMovie') : t('admin.addMovie')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">{t('admin.titleEn')}</label><input value={form.title.en} onChange={(e) => setForm({ ...form, title: { ...form.title, en: e.target.value } })} className="input" dir="ltr" /></div>
              <div><label className="label">{t('admin.titleAr')}</label><input value={form.title.ar} onChange={(e) => setForm({ ...form, title: { ...form.title, ar: e.target.value } })} className="input" /></div>
              <div className="sm:col-span-2"><label className="label">{t('admin.descEn')}</label><textarea value={form.description.en} onChange={(e) => setForm({ ...form, description: { ...form.description, en: e.target.value } })} className="input min-h-[80px]" dir="ltr" /></div>
              <div className="sm:col-span-2"><label className="label">{t('admin.descAr')}</label><textarea value={form.description.ar} onChange={(e) => setForm({ ...form, description: { ...form.description, ar: e.target.value } })} className="input min-h-[80px]" /></div>
              <div><label className="label">{t('admin.genreEn')}</label><input value={form.genre.en} onChange={(e) => setForm({ ...form, genre: { ...form.genre, en: e.target.value } })} className="input" dir="ltr" /></div>
              <div><label className="label">{t('admin.genreAr')}</label><input value={form.genre.ar} onChange={(e) => setForm({ ...form, genre: { ...form.genre, ar: e.target.value } })} className="input" /></div>
              <div><label className="label">{t('admin.duration')}</label><input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="input" /></div>
              <div><label className="label">{t('admin.rating')}</label><input type="number" step="0.1" min="0" max="10" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="input" /></div>
              <div><label className="label">{t('admin.ageRating')}</label><select value={form.ageRating} onChange={(e) => setForm({ ...form, ageRating: e.target.value })} className="input">{[['G'], ['PG'], ['PG-13'], ['R']].flat().map((a) => <option key={a}>{a}</option>)}</select></div>
              <div>
                <label className="label">{t('admin.status')}</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
                  <option value="now_showing">{t('admin.nowShowing')}</option>
                  <option value="coming_soon">{t('admin.comingSoon')}</option>
                </select>
              </div>
              <div>
                <label className="label">Original language</label>
                <select value={form.lang} onChange={(e) => setForm({ ...form, lang: e.target.value })} className="input">
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
              <div className="sm:col-span-2"><label className="label">{t('admin.cast')}</label><input value={form.cast} onChange={(e) => setForm({ ...form, cast: e.target.value })} className="input" dir="ltr" /></div>
              <div className="sm:col-span-2"><label className="label">{t('admin.trailer')}</label><input value={form.trailer} onChange={(e) => setForm({ ...form, trailer: e.target.value })} className="input" dir="ltr" placeholder="https://www.youtube.com/watch?v=..." /></div>
              <div className="sm:col-span-2">
                <label className="label">{t('admin.poster')}</label>
                <div className="flex items-start gap-4">
                  <div className="h-32 w-[86px] shrink-0 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                    {form.poster ? (
                      <img src={form.poster} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/20"><i className="fa-solid fa-image text-2xl" /></div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input value={form.poster} onChange={(e) => setForm({ ...form, poster: e.target.value })} className="input" dir="ltr" placeholder="https://... (poster URL)" />
                    <label className={`btn-outline inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-xs ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                      {uploading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />}
                      {t('admin.uploadPoster')}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onPosterFile} />
                    </label>
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-white/70 sm:col-span-2">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-4 w-4 accent-brand-purple" />
                {t('admin.featured')}
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={saveMovie} className="btn-primary flex-1">{t('admin.save')}</button>
              <button onClick={closeModal} className="btn-outline">{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
