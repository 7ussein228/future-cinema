import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang } from '../i18n'
import { useAuth } from '../contexts/AuthContext'

const ERR = {
  short_name: 'auth.errShortName',
  invalid_phone: 'auth.errInvalidPhone',
  weak_password: 'auth.errWeakPass',
  name_taken: 'auth.errNameTaken',
  phone_taken: 'auth.errPhoneTaken'
}

export default function Register() {
  const { t } = useLang()
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (name.trim().length < 3) return setError(t('auth.errShortName'))
    if (!/^01[0125][0-9]{8}$/.test(phone.trim())) return setError(t('auth.errInvalidPhone'))
    if (password.length < 6) return setError(t('auth.errWeakPass'))
    if (password !== confirm) return setError(t('auth.errMismatch'))
    setLoading(true)
    try {
      await register(name.trim(), phone.trim(), password)
      navigate('/profile')
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
            <h1 className="text-2xl font-black">{t('auth.registerTitle')}</h1>
            <p className="mt-1 text-sm text-white/50">{t('auth.signUpSub')}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">{t('auth.name')}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.namePlaceholder')}
                minLength={3}
                maxLength={40}
                className="input"
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label className="label">{t('auth.phone')}</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                inputMode="tel"
                maxLength={11}
                className="input"
                dir="ltr"
                autoComplete="tel"
                required
              />
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="input"
                dir="ltr"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="label">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                className="input"
                dir="ltr"
                autoComplete="new-password"
                required
              />
            </div>
            {error && <p className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <i className="fa-solid fa-spinner fa-spin" /> : t('auth.signUp')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/50">
            {t('auth.haveAccount')} <Link to="/login" className="font-bold text-brand-pink hover:underline">{t('auth.signIn')}</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
