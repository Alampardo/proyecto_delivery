import { Navigate } from 'react-router-dom'
import useAuthStore from '../stores/useAuthStore'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, user } = useAuthStore()

  if (!token || !user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirects = {
      admin:    '/admin',
      delivery: '/delivery',
      owner:    '/owner',
      client:   '/',
    }
    return <Navigate to={redirects[user.role] ?? '/'} replace />
  }

  return children
}
