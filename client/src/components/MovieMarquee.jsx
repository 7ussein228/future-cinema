import React from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../i18n'
import MoviePoster from './MoviePoster'

export default function MovieMarquee({ movies, title, speed = 45 }) {
  const { N, t } = useLang()
  if (!movies || movies.length === 0) return null

  const doubled = [...movies, ...movies]
  const items = doubled.map((m, i) => (
    <Link key={`${m.id}-${i}`} to={`/movie/${m.id}`} className="group w-40 shrink-0 sm:w-48">
      <div className="relative">
        <MoviePoster movie={m} className="aspect-[2/3] transition duration-300 group-hover:scale-[1.03]" />
        {m.status === 'coming_soon' && (
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur">
            {t('movie.comingSoonLabel')}
          </span>
        )}
      </div>
      <h3 className="mt-2 truncate text-center text-xs font-bold text-white/80 transition group-hover:text-brand-pink">
        {N(m.title, m)}
      </h3>
    </Link>
  ))

  return (
    <section className="relative overflow-hidden border-b border-white/10 py-14">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-brand-dark to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-brand-dark to-transparent" />

      <div className="container-x mb-8 flex items-end justify-between gap-4">
        <h2 className="section-title">{title}</h2>
        <span className="hidden items-center gap-2 text-xs font-bold text-white/40 sm:flex">
          <i className="fa-solid fa-arrows-left-right animate-pulse" />
          {t('home.marqueeHint')}
        </span>
      </div>

      <div
        className="movie-posters-track flex w-max gap-5 px-8"
        style={{ animationDuration: `${speed}s` }}
      >
        {items}
      </div>
    </section>
  )
}
