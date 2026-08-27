import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!/^01[0125][0-9]{8}$/.test(phone.trim())) return setError('رقم موبايل مصري صحيح مطلوب')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot', { phone: phone.trim() })
      setInfo(data.hint ? 'تم إرسال الكود — ' + data.hint : 'تم إرسال الكود')
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ')
    } finally { setLoading(false) }
  }

  const reset = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 3) return setError('كلمة المرور قصيرة')
    if (newPassword !== confirm) return setError('كلمتا المرور غير متطابقتين')
    setLoading(true)
    try {
      await api.post('/auth/reset-with-otp', { phone: phone.trim(), code: code.trim(), newPassword })
      setInfo('تم تغيير كلمة المرور — يمكنك الدخول الآن')
      setTimeout(()=> navigate('/login'), 1200)
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ')
    } finally { setLoading(false) }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-black">نسيت كلمة المرور</h1>
            <p className="mt-1 text-sm text-white/50">أدخل رقمك لإرسال كود التحقق</p>
          </div>
          {step === 1 ? (
            <form onSubmit={send} className="space-y-4">
              <div>
                <label className="label">رقم الموبايل</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" className="input" required />
              </div>
              {error && <p className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-300">{error}</p>}
              {info && <p className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm text-emerald-300">{info}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? <i className="fa-solid fa-spinner fa-spin"/> : 'إرسال الكود'}</button>
              <Link to="/login" className="block text-center text-sm text-brand-pink hover:underline">العودة للدخول</Link>
            </form>
          ) : (
            <form onSubmit={reset} className="space-y-4">
              <p className="text-center text-sm text-white/60">الكود أُرسل إلى <span dir="ltr" className="font-bold text-white">{phone}</span> — في التجربة تجده في كونسول السيرفر</p>
              <div>
                <label className="label">الكود (6 أرقام)</label>
                <input value={code} onChange={e=>setCode(e.target.value)} placeholder="------" dir="ltr" className="input text-center tracking-[0.4em] font-mono" maxLength={6} required />
              </div>
              <div>
                <label className="label">كلمة المرور الجديدة</label>
                <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="input" dir="ltr" required />
              </div>
              <div>
                <label className="label">تأكيد الجديدة</label>
                <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="input" dir="ltr" required />
              </div>
              {error && <p className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-300">{error}</p>}
              {info && <p className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm text-emerald-300">{info}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? <i className="fa-solid fa-spinner fa-spin"/> : 'تغيير كلمة المرور'}</button>
              <button type="button" onClick={()=>setStep(1)} className="w-full text-center text-sm text-white/50 hover:text-white">إعادة إرسال</button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
