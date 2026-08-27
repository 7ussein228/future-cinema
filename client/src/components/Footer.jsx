import React from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../i18n'

export default function Footer() {
  const { t } = useLang()

  return (
    <footer className="border-t border-white/10 bg-brand-darker">
      <div className="container-x py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black">{t('brand')}</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">{t('footer.about')}</p>
          </div>

          <div>
            <h4 className="text-sm font-black text-white">{t('footer.quickLinks')}</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/50">
              <li><Link to="/" className="transition hover:text-brand-pink">{t('nav.home')}</Link></li>
              <li><Link to="/movies" className="transition hover:text-brand-pink">{t('nav.movies')}</Link></li>
              <li><Link to="/profile" className="transition hover:text-brand-pink">{t('nav.myBookings')}</Link></li>
              <li><Link to="/terms" className="transition hover:text-brand-pink">الشروط والأحكام</Link></li>
              <li><Link to="/privacy" className="transition hover:text-brand-pink">الخصوصية</Link></li>
              <li><Link to="/refund" className="transition hover:text-brand-pink">سياسة الاسترجاع</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-black text-white">{t('footer.contact')}</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/50">
              <li className="flex items-center gap-2"><i className="fa-solid fa-phone text-brand-pink" /> <a href="tel:0227613045" dir="ltr" className="transition hover:text-brand-pink">0227613045</a></li>
              <li className="flex items-center gap-2">
                <i className="fa-brands fa-facebook text-brand-pink" />
                <a href="https://www.facebook.com/profile.php?id=61561010575571" target="_blank" rel="noreferrer" className="transition hover:text-brand-pink">{t('brand')}</a>
              </li>
              <li className="flex items-center gap-2"><i className="fa-solid fa-location-dot text-brand-pink" /> <a href="https://www.google.com/maps/search/XCJG%2BRHC" target="_blank" rel="noreferrer" className="transition hover:text-brand-pink">مول فيوتشر، التجمع الخامس — XCJG+RHC</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <div className="text-center sm:text-start">
            <p>© {new Date().getFullYear()} {t('brand')}. {t('footer.rights')}</p>
            <p className="mt-1 text-white/30">
              {t('footer.developer')} <a href="https://www.facebook.com/hussein.ali.666057/" target="_blank" rel="noreferrer" className="font-bold text-brand-pink/80 transition hover:text-brand-pink" dir="ltr">Hussein Ali</a>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="transition hover:text-brand-pink"><i className="fa-brands fa-facebook-f" /></a>
            <a href="#" className="transition hover:text-brand-pink"><i className="fa-brands fa-instagram" /></a>
            <a href="#" className="transition hover:text-brand-pink"><i className="fa-brands fa-x-twitter" /></a>
            <a href="#" className="transition hover:text-brand-pink"><i className="fa-brands fa-youtube" /></a>
          </div>
        </div>
      </div>
    </footer>
  )
}
