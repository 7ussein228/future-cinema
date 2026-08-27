import React from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../i18n'
import MoviePoster from './MoviePoster'

export default function MovieCard({ movie, showStatus = false }) {
  const { N, t } = useLang()

  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group block transition duration-300 hover:-translate-y-1"
    >
      <div className="relative">
        <MoviePoster movie={movie} className="aspect-[2/3]" />
        {showStatus && movie.status === 'coming_soon' && (
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
            {t('movie.comingSoonLabel')}
          </span>
        )}
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      </div>
      <h3 className="mt-3 text-sm font-bold leading-snug transition group-hover:text-brand-pink">
        {N(movie.title, movie)}
      </h3>
      <p className="mt-1 flex items-center gap-2 text-xs text-white/50">
        <span className="flex items-center gap-1 text-amber-300">
          <i className="fa-solid fa-star" /> {movie.rating?.toFixed(1)}
        </span>
        <span>•</span>
        <span>{movie.duration} {t('movie.duration')}</span>
      </p>
    </Link>
  )
}
