import React, { useState } from 'react'
import { useLang } from '../i18n'

export default function MoviePoster({ movie, className = '', rounded = true }) {
  const { N } = useLang()
  const [imgError, setImgError] = useState(false)
  const [from, to] = movie?.gradient || ['#6d28d9', '#ec4899']
  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  const posterSrc = movie?.poster?.startsWith('/uploads') && API_URL ? `${API_URL}${movie.poster}` : movie?.poster

  const fallback = (
    <div className="relative flex h-full w-full flex-col justify-between p-4">
      <div className="flex items-start justify-between">
        <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur">
          {N(movie?.genre, movie)}
        </span>
        {movie?.rating != null && (
          <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-bold text-amber-300 backdrop-blur">
            <i className="fa-solid fa-star" /> {movie.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div>
        <div className="mb-2 h-1 w-8 rounded-full bg-white/40" />
        <h3 className="text-sm font-black leading-snug text-white drop-shadow">{N(movie?.title, movie)}</h3>
      </div>
    </div>
  )

  if (posterSrc && !imgError) {
    return (
      <div className={`relative overflow-hidden ${rounded ? 'rounded-xl' : ''} ${className}`}>
        <img
          src={posterSrc}
          alt={N(movie.title, movie)}
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {movie?.rating != null && (
          <span className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-amber-300 backdrop-blur">
            <i className="fa-solid fa-star" /> {movie.rating.toFixed(1)}
          </span>
        )}
        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden ${rounded ? 'rounded-xl' : ''} ${className}`}
      style={{ background: `linear-gradient(140deg, ${from} 0%, #0a0a12 55%, ${to} 130%)` }}
    >
      <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(circle at 30% 20%, ${to}, transparent 60%)` }} />
      <div className="absolute -right-6 -top-6 text-[120px] text-white/10 select-none">✦</div>
      {fallback}
      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
    </div>
  )
}
