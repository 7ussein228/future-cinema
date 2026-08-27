import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useLang } from '../i18n'
import { useAuth } from '../contexts/AuthContext'

export default function ChangePassword() {
  const { t } = useLang()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (next.length < 3) return setError('كلمة المرور الجديدة قصيرة جداً')
    if (next !== confirm) return setError('كلمتا المرور غير متطابقتين')
    setLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
              <i className="fa-solid fa-key" />
            </div>
            <h1 className="text-xl font-black">تغيير كلمة المرور مطلوب</h1>
            <p className="mt-1 text-sm text-white/50">تم إعادة تعيين كلمة مرورك إلى <span className="font-mono font-bold text-white">123</span> — يجب تغييرها الآن</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">كلمة المرور الحالية (123)</label>
              <input type="password" value={current} onChange={e=>setCurrent(e.target.value)} className="input" dir="ltr" placeholder="123" />
            </div>
            <div>
              <label className="label">كلمة المرور الجديدة</label>
              <input type="password" value={next} onChange={e=>setNext(e.target.value)} className="input" dir="ltr" required />
            </div>
            <div>
              <label className="label">تأكيد الجديدة</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="input" dir="ltr" required />
            </div>
            {error && <p className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <i className="fa-solid fa-spinner fa-spin"/> : 'حفظ كلمة المرور الجديدة'}
            </button>
          </form>
          <button onClick={()=>{logout(); navigate('/login')}} className="mt-4 w-full text-center text-xs text-white/40 hover:text-white">تسجيل خروج</button>
        </div>
      </div>
    </main>
  )
}
