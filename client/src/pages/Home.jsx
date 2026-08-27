import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useLang } from '../i18n'
import MovieCard from '../components/MovieCard'
import MoviePoster from '../components/MoviePoster'

export default function Home() {
  const { t, L, N } = useLang()
  const [allMovies, setAllMovies] = useState([])
  const [nowShowing, setNowShowing] = useState([])
  const [comingSoon, setComingSoon] = useState([])
  const [tab, setTab] = useState('now')

  useEffect(() => {
    axios.get('/api/movies').then(({ data }) => {
      setAllMovies(data)
      setNowShowing(data.filter((m) => m.status === 'now_showing'))
      setComingSoon(data.filter((m) => m.status === 'coming_soon'))
    })
  }, [])

  const featured = allMovies.find((m) => m.featured && m.status === 'now_showing') || nowShowing[0]

  return (
    <main>
      <section className="relative min-h-[78vh] overflow-hidden border-b border-white/10">
        {featured?.poster ? (
          <>
            <img src={featured.poster} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-[6px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/70 to-brand-dark/30" />
          </>
        ) : (
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-brand-purple/40 blur-[120px]" />
          </div>
        )}

        <div className="container-x relative flex min-h-[78vh] items-center py-16">
          {featured ? (
            <div className="hero-fade grid w-full items-center gap-10 md:grid-cols-[240px_1fr]">
              <MoviePoster movie={featured} className="hidden aspect-[2/3] w-full shadow-glow md:block" />
              <div>
                <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-gold/15 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-brand-gold">
                  <i className="fa-solid fa-star" /> {t('home.nowShowing')}
                </span>
                <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">{N(featured.title, featured)}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/70">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-bold text-amber-300"><i className="fa-solid fa-star" /> {featured.rating.toFixed(1)}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1">{L(featured.genre)}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1"><i className="fa-regular fa-clock" /> {featured.duration} {t('movie.duration')}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1">{featured.ageRating}</span>
                </div>
                <p className="mt-5 max-w-2xl leading-relaxed text-white/70 line-clamp-3">{L(featured.description)}</p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link to={`/movie/${featured.id}`} className="btn-primary px-8">{t('hero.bookTickets')}</Link>
                  <Link to="/movies" className="btn-outline px-8">{t('home.viewAll')}</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="hero-fade mx-auto text-center">
              <h1 className="section-title">{t('brand')}</h1>
              <p className="mt-3 text-lg text-white/60">{t('tagline')}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link to="/movies" className="btn-primary">{t('home.viewAll')}</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="now-showing" className="border-b border-white/10 py-14">
        <div className="container-x">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex overflow-hidden rounded-full border border-white/15 bg-white/5">
              <button
                onClick={() => setTab('now')}
                className={`px-6 py-2.5 text-sm font-bold transition ${tab === 'now' ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-black' : 'text-white/60 hover:text-white'}`}
              >
                {t('home.nowShowing')}
              </button>
              <button
                onClick={() => setTab('soon')}
                className={`px-6 py-2.5 text-sm font-bold transition ${tab === 'soon' ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-black' : 'text-white/60 hover:text-white'}`}
              >
                {t('home.comingSoon')}
              </button>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {(tab === 'now' ? nowShowing : comingSoon).map((m) => <MovieCard key={m.id} movie={m} showStatus />)}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 py-16">
        <div className="container-x">
          <h2 className="section-title">{t('home.cinemas')}</h2>
          <p className="mt-2 text-white/50">{t('home.cinemaSub')}</p>
          <div className="mt-6">
            <div className="card relative overflow-hidden p-6 sm:p-8">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-purple/20 blur-[70px]" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-glow">
                  <i className="fa-solid fa-map-location-dot text-xl text-black" />
                </span>
                <div className="flex-1">
                  <h3 className="text-xl font-black">{t('home.cinema1')}</h3>
                  <p className="mt-1 text-sm text-white/50"><a href="https://www.google.com/maps/search/XCJG%2BRHC" target="_blank" rel="noreferrer" className="transition hover:text-brand-pink">مول فيوتشر، التجمع الخامس — XCJG+RHC، القاهرة</a> • <a href="tel:0227613045" dir="ltr" className="transition hover:text-brand-pink">0227613045</a></p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-bold"><i className="fa-solid fa-video text-brand-gold" /> 8 {t('admin.hall')}</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-bold"><i className="fa-solid fa-crown text-brand-gold" /> IMAX</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-bold"><i className="fa-solid fa-wind text-brand-gold" /> 4DX</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 py-16">
        <div className="container-x">
          <h2 className="section-title">{t('home.offers')}</h2>
          <p className="mt-2 text-white/50">{t('home.offersSub')}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { title: t('home.offer1'), desc: t('home.offer1Desc'), icon: 'fa-graduation-cap' },
              { title: t('home.offer2'), desc: t('home.offer2Desc'), icon: 'fa-users' },
              { title: t('home.offer3'), desc: t('home.offer3Desc'), icon: 'fa-gift' }
            ].map((o) => (
              <div key={o.title} className="card relative overflow-hidden p-6">
                <div className="absolute -right-6 -top-6 text-[80px] text-brand-purple/20">
                  <i className={`fa-solid ${o.icon}`} />
                </div>
                <div className="relative">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-brand-pink">
                    <i className={`fa-solid ${o.icon} text-black`} />
                  </div>
                  <h3 className="text-lg font-bold">{o.title}</h3>
                  <p className="mt-1 text-sm text-white/50">{o.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-x">
          <div className="rounded-3xl bg-gradient-to-br from-brand-purple to-brand-pink px-8 py-12 text-center sm:px-12 md:flex md:items-center md:justify-between md:px-16">
            <div className="md:flex-1 md:text-start">
              <h2 className="text-2xl font-black text-black sm:text-3xl">{t('home.ready')}</h2>
              <p className="mt-2 text-black/70">{t('home.readySub')}</p>
            </div>
            <div className="mt-6 md:mt-0 md:flex-none">
              <Link to="/movies" className="rounded-full border-2 border-black bg-black px-8 py-3 text-sm font-black text-brand-gold transition hover:bg-transparent hover:text-black">
                {t('home.viewAll')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
