import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cinevox-user') || 'null')
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('cinevox-token'))

  useEffect(() => {
    if (token) {
      api.get('/auth/me').then(({ data }) => setUser(data.user)).catch(() => {})
    }
  }, [token])

  const login = async (phone, password) => {
    const { data } = await api.post('/auth/login', { phone, password })
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('cinevox-token', data.token)
    localStorage.setItem('cinevox-user', JSON.stringify(data.user))
    return data.user
  }

  const register = async (name, phone, password) => {
    const { data } = await api.post('/auth/register', { name, phone, password })
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('cinevox-token', data.token)
    localStorage.setItem('cinevox-user', JSON.stringify(data.user))
    return data.user
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('cinevox-token')
    localStorage.removeItem('cinevox-user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
