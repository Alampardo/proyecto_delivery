import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import LoginPage          from './pages/auth/LoginPage'
import RegisterPage       from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage  from './pages/auth/ResetPasswordPage'
import VerifyEmailPage    from './pages/auth/VerifyEmailPage'
import HomePage           from './pages/client/HomePage'
import CartPage           from './pages/client/CartPage'
import DeliveryDashboard  from './pages/delivery/DeliveryDashboard'
import AdminDashboard     from './pages/admin/AdminDashboard'
import OwnerDashboard     from './pages/owner/OwnerDashboard'
import ProtectedRoute     from './routes/ProtectedRoute'

export default function App() {
  // Registra el Service Worker para toda la app (instalable como PWA en cualquier
  // página, no solo donde se usan notificaciones push). Solo en producción: en
  // dev interfiere con el HMR de Vite.
  useEffect(() => {
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px' },
          success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Públicas */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/verify-email"    element={<VerifyEmailPage />} />
        <Route path="/"                element={<HomePage />} />
        <Route path="/cart"            element={<CartPage />} />

        {/* Delivery */}
        <Route path="/delivery" element={
          <ProtectedRoute allowedRoles={['delivery']}>
            <DeliveryDashboard />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* Dueño de Negocio */}
        <Route path="/owner" element={
          <ProtectedRoute allowedRoles={['owner']}>
            <OwnerDashboard />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
