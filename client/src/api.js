import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
const api = axios.create({ baseURL: API_URL ? `${API_URL}/api` : '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cinevox-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const onAuthPages = window.location.pathname.includes('/login') || window.location.pathname.includes('/register')
      if (!onAuthPages) {
        localStorage.removeItem('cinevox-token')
        localStorage.removeItem('cinevox-user')
      }
    }
    return Promise.reject(err)
  }
)

export default api
