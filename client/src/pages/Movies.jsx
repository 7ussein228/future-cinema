import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useLang } from '../i18n'
import MovieCard from '../components/MovieCard'

export default function Movies() {
  const { t, L } = useLang()
  const [params, setParams] = useSearchParams()
  const [movies, setMovies] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)

  const status = params.get('status') || 'all'
  const genre = params.get('genre') || 'all'
  const q = params.get('q') || ''

  useEffect(() => {
    setLoading(true)
    const g = genre === 'all' ? undefined : genre
    const s = status === 'all' ? undefined : status
    const query = new URLSearchParams()
    if (g) query.set('genre', g)
    if (s) query.set('status', s)
    if (q) query.set('q', q)
    axios.get(`/api/movies?${query.toString()}`).then(({ data }) => setMovies(data)).finally(() => setLoading(false))
  }, [status, genre, q])

  useEffect(() => {
    axios.get('/api/genres').then(({ data }) => setGenres(data))
  }, [])

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  return (
    <main className="pb-20">
      <section className="border-b border-white/10 bg-gradient-to-b from-brand-purple/15 to-transparent pb-10 pt-12">
        <div className="container-x">
          <h1 className="section-title">{t('nav.movies')}</h1>
          <p className="mt-2 text-white/50">{t('tagline')}</p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={q}
                onChange={(e) => setParam('q', e.target.value)}
                placeholder={t('common.search')}
                className="input !pl-11"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-full border border-white/15 bg-white/5">
                {['all', 'now_showing', 'coming_soon'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setParam('status', s)}
                    className={`px-4 py-2 text-xs font-bold transition ${status === s ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    {s === 'all' ? t('common.all') : s === 'now_showing' ? t('admin.nowShowing') : t('admin.comingSoon')}
                  </button>
                ))}
              </div>

              <select
                value={genre}
                onChange={(e) => setParam('genre', e.target.value)}
                className="input !w-auto cursor-pointer !py-2 text-sm"
              >
                <option value="all">{t('common.allGenres')}</option>
                {genres.map((g) => (
                  <option key={g.en} value={g.en}>{L(g)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x pt-10">
        {loading ? (
          <div className="flex justify-center py-20 text-white/50"><i className="fa-solid fa-spinner fa-spin text-3xl" /></div>
        ) : movies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-white/50">
            <i className="fa-solid fa-film text-4xl" />
            <p>{t('common.error')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((m) => <MovieCard key={m.id} movie={m} showStatus />)}
          </div>
        )}
      </section>
    </main>
  )
}
