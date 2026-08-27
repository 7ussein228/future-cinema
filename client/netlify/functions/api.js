import serverless from 'serverless-http'
import app from '../../../server/index.js'
import { seed } from '../../../server/seed.js'

let seeded = false

export const handler = async (event, context) => {
  if (!seeded) {
    try { await seed() } catch {}
    seeded = true
  }
  if (event.path && !event.path.startsWith('/api/') && !event.path.startsWith('/uploads/') && !event.path.startsWith('/.netlify')) {
    const raw = event.rawUrl || event.path
    if (raw.includes('/api/') || event.path.startsWith('/movies') || event.path.startsWith('/bookings') || event.path.startsWith('/admin') || event.path.startsWith('/auth') || event.path.startsWith('/halls') || event.path.startsWith('/concessions') || event.path.startsWith('/showtimes') || event.path.startsWith('/tickets')) {
      event.path = '/api' + (event.path.startsWith('/') ? event.path : '/' + event.path)
    }
  }
  const handlerFn = serverless(app)
  return handlerFn(event, context)
}
