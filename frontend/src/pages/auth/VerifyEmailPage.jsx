import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../../api/auth'
import useAuthStore from '../../stores/useAuthStore'
import Button from '../../components/ui/Button'

export default function VerifyEmailPage() {
  const navigate       = useNavigate()
  const setAuth        = useAuthStore((s) => s.setAuth)
  const [searchParams] = useSearchParams()
  const token          = searchParams.get('token') ?? ''
  const [status, setStatus] = useState('loading') // loading | success | error | expired

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    verifyEmail(token)
      .then(({ data }) => {
        localStorage.setItem('token', data.token)
        setAuth(data)
        setStatus('success')
        const redirects = { admin: '/admin', delivery: '/delivery', owner: '/owner', client: '/' }
        setTimeout(() => navigate(redirects[data.user.role] ?? '/'), 2000)
      })
      .catch((err) => {
        const expired = err.response?.data?.expired
        setStatus(expired ? 'expired' : 'error')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Verificando tu email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <p className="text-6xl mb-4">✅</p>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">¡Email verificado!</h2>
            <p className="text-gray-500 text-sm">Redirigiendo a tu panel...</p>
          </>
        )}

        {status === 'expired' && (
          <>
            <p className="text-6xl mb-4">⏰</p>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Enlace expirado</h2>
            <p className="text-gray-500 text-sm mb-6">
              Este enlace de verificación ya expiró. Solicita uno nuevo.
            </p>
            <Link to="/login">
              <Button className="w-full">Ir al login y reenviar email</Button>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="text-6xl mb-4">❌</p>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Enlace inválido</h2>
            <p className="text-gray-500 text-sm mb-6">
              Este enlace no es válido o ya fue utilizado.
            </p>
            <Link to="/login">
              <Button className="w-full">Ir al login</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
