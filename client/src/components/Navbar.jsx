import React, { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useLang } from '../i18n'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { t, lang, setLang, L } = useLang()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [canInstall, setCanInstall] = useState(false)
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }
    const onAppInstalled = () => {
      setCanInstall(false)
      setDeferredPrompt(null)
      console.log('[PWA] app installed')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
    // keep permission in sync
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission)
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try {
      const { outcome } = await deferredPrompt.userChoice
      console.log('[PWA] userChoice', outcome)
    } catch {}
    setDeferredPrompt(null)
    setCanInstall(false)
  }

  const handleBellClick = async () => {
    if (!('Notification' in window)) {
      alert('المتصفح لا يدعم الإشعارات')
      return
    }
    let perm = Notification.permission
    if (perm !== 'granted') {
      try {
        perm = await Notification.requestPermission()
      } catch (e) {
        console.error(e)
      }
      setNotifPermission(perm)
    } else {
      setNotifPermission(perm)
    }

    if (perm === 'granted') {
      // schedule demo notification after 5 seconds
      setTimeout(async () => {
        const title = 'Future Cinema'
        const options = {
          body: 'فيلمك بعد ساعة',
          icon: '/logo.png',
          badge: '/logo.png',
          dir: 'rtl',
          lang: 'ar',
          tag: 'demo-movie-reminder'
        }
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready
            if (reg && reg.showNotification) {
              await reg.showNotification(title, options)
              return
            }
          }
          new Notification(title, options)
        } catch (err) {
          try {
            new Notification(title, options)
          } catch (e2) {
            console.warn('[Notify] failed', e2, err)
          }
        }
      }, 5000)
    } else if (perm === 'denied') {
      alert('تم رفض الإشعارات. فعّلها من إعدادات المتصفح.')
    }
  }

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/movies', label: t('nav.movies') }
  ]

  const handleLogout = () => {
    logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-dark/80 backdrop-blur-xl">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link to={user?.role === 'cashier' ? '/cashier' : '/'} className="flex items-center gap-2.5">
          <span className="text-xl font-black tracking-tight">
            {t('brand')}
            <span className="ml-1 bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {user?.role !== 'cashier' && links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-sm font-semibold transition hover:text-brand-pink ${isActive ? 'text-brand-pink' : 'text-white/70'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {user && user.role !== 'cashier' && (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `text-sm font-semibold transition hover:text-brand-pink ${isActive ? 'text-brand-pink' : 'text-white/70'}`
              }
            >
              {t('nav.myBookings')}
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `text-sm font-semibold transition hover:text-brand-pink ${isActive ? 'text-brand-pink' : 'text-white/70'}`
              }
            >
              {t('nav.admin')}
            </NavLink>
          )}
          {(user?.role === 'admin' || user?.role === 'cashier') && (
            <NavLink
              to="/cashier"
              className={({ isActive }) =>
                `text-sm font-black transition hover:text-brand-pink ${isActive ? 'text-brand-pink' : 'text-white'}`
              }
            >
              الكاشير
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install prompt */}
          {canInstall && (
            <button
              onClick={handleInstallClick}
              className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink px-4 py-1.5 text-xs font-black text-black shadow-md transition hover:opacity-90 sm:inline-flex"
              title="Install Future Cinema app"
            >
              <i className="fa-solid fa-download text-[11px]" />
              Install app
            </button>
          )}
          {/* Notification bell */}
          <button
            onClick={handleBellClick}
            className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:border-brand-purple hover:text-white"
            aria-label="Enable notifications"
            title={notifPermission === 'granted' ? 'الإشعارات مفعّلة — اضغط لتجربة تنبيه "فيلمك بعد ساعة"' : 'تفعيل الإشعارات'}
          >
            <i className={`fa-solid fa-bell text-sm ${notifPermission === 'granted' ? 'text-brand-pink' : ''}`} />
            {notifPermission === 'granted' && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-brand-dark" />
            )}
          </button>
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:border-brand-purple hover:text-white"
            aria-label="Switch language"
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              {user.role === 'cashier' ? (
                <span className="flex items-center gap-2 rounded-full bg-white/5 py-1.5 pl-1.5 pr-3 text-sm font-bold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-brand-pink text-xs text-black">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
                </span>
              ) : (
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-full bg-white/5 py-1.5 pl-1.5 pr-3 text-sm font-bold transition hover:bg-white/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-brand-pink text-xs text-black">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
                </Link>
              )}
              <button onClick={handleLogout} title={t('nav.signOut')} className="text-white/50 transition hover:text-brand-pink">
                <i className="fa-solid fa-right-from-bracket" />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="rounded-full px-4 py-2 text-sm font-bold text-white/80 transition hover:text-white">
                {t('auth.signIn')}
              </Link>
              <Link to="/register" className="btn-primary px-5 py-2 text-sm">
                {t('auth.signUp')}
              </Link>
            </div>
          )}

          <button onClick={() => setOpen(!open)} className="-m-2 p-2 md:hidden" aria-label="Menu">
            <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-bars'} text-xl`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-brand-dark px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {/* Mobile PWA actions */}
            {canInstall && (
              <button
                onClick={() => { handleInstallClick(); setOpen(false) }}
                className="mb-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-purple to-brand-pink px-3 py-2.5 text-sm font-black text-black"
              >
                <i className="fa-solid fa-download" /> Install app
              </button>
            )}
            <button
              onClick={() => { handleBellClick(); setOpen(false) }}
              className="mb-2 inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-bold text-white"
            >
              <i className="fa-solid fa-bell" /> {notifPermission === 'granted' ? 'الإشعارات مفعّلة — جرّب تنبيه' : 'تفعيل الإشعارات'}
            </button>
            {user?.role !== 'cashier' && links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/5">
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                {user.role !== 'cashier' && (
                  <Link to="/profile" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/5">
                    {t('nav.myBookings')}
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/5">
                    {t('nav.admin')}
                  </Link>
                )}
                {(user.role === 'admin' || user.role === 'cashier') && (
                  <Link to="/cashier" onClick={() => setOpen(false)} className="rounded-lg bg-brand-pink px-3 py-2 text-sm font-black text-black">
                    الكاشير
                  </Link>
                )}
                <button onClick={handleLogout} className="rounded-lg px-3 py-2 text-start text-sm font-semibold text-brand-pink hover:bg-white/5">
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/5">
                  {t('auth.signIn')}
                </Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-primary mt-1 py-2 text-sm">
                  {t('auth.signUp')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
