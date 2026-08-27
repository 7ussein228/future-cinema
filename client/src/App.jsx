import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LanguageProvider, useLang } from './i18n'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Movies from './pages/Movies'
import MovieDetails from './pages/MovieDetails'
import Booking from './pages/Booking'
import PaymentResult from './pages/PaymentResult'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import Cashier from './pages/Cashier'
import ChangePassword from './pages/ChangePassword'
import TicketView from './pages/TicketView'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Refund from './pages/Refund'

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function RequireCashier({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin' && user.role !== 'cashier') return <Navigate to="/" replace />
  return children
}

function Shell() {
  const { lang } = useLang()
  const { user } = useAuth()
  const location = useLocation()
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  if (user?.role === 'cashier' && !location.pathname.startsWith('/cashier') && !location.pathname.startsWith('/ticket') && location.pathname !== '/change-password') {
    return <Navigate to="/cashier" replace />
  }
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/booking/:showtimeId" element={<Booking />} />
          <Route path="/payment/:bookingId" element={<PaymentResult />} />
          <Route path="/ticket/:bookingId" element={<TicketView />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="/cashier" element={<RequireCashier><Cashier /></RequireCashier>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {user?.role !== 'cashier' && <Footer />}
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}
