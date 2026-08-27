import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLang } from '../i18n'
import { useAuth } from '../contexts/AuthContext'

const ERR = {
  bad_credentials: 'auth.errBadCreds',
  auth_required: 'auth.errBadCreds'
}

export default function Login() {
  const { t } = useLang()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/profile'

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(phone.trim(), password)
      if (user.mustChangePassword) return navigate('/change-password')
      if (user.role === 'admin') return navigate('/admin')
      if (user.role === 'cashier') return navigate('/cashier')
      navigate(from)
    } catch (err) {
      setError(t(ERR[err.response?.data?.code] || 'common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-black">{t('auth.loginTitle')}</h1>
            <p className="mt-1 text-sm text-white/50">{t('auth.signInSub')}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">{t('auth.phone')}</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                inputMode="tel"
                maxLength={20}
                className="input"
                dir="ltr"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                dir="ltr"
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <i className="fa-solid fa-spinner fa-spin" /> : t('auth.signIn')}
            </button>
          </form>

          <p className="mt-2 text-center text-sm">
            <Link to="/forgot" className="text-white/60 hover:text-brand-pink hover:underline">نسيت كلمة المرور؟</Link>
          </p>
          <p className="mt-4 text-center text-sm text-white/50">
            {t('auth.noAccount')} <Link to="/register" className="font-bold text-brand-pink hover:underline">{t('auth.createOne')}</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
