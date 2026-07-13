import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { login as apiLogin, resendVerification } from '../../api/auth'
import useAuthStore from '../../stores/useAuthStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function LoginPage() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((s) => s.setAuth)
  const [form, setForm]             = useState({ email: '', password: '' })
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [unverified, setUnverified] = useState(false)
  const [resending, setResending]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setUnverified(false)
    try {
      toast('Verificando credenciales papu XD XD XD')
      const { data } = await apiLogin(form)
      localStorage.setItem('token', data.token)
      setAuth(data)
      toast.success(`¡Bienvenido, ${data.user.first_name}!`)
      const redirects = { admin: '/admin', delivery: '/delivery', owner: '/owner', client: '/' }
      navigate(redirects[data.user.role] ?? '/')
    } catch (err) {
      if (err.response?.data?.email_not_verified) {
        setUnverified(true)
      } else {
        setError(err.response?.data?.non_field_errors?.[0] ?? err.response?.data?.detail ?? 'Error al iniciar sesión')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await resendVerification(form.email)
      toast.success('Email de verificación reenviado. Revisa tu bandeja.')
    } catch {
      toast.error('No se pudo reenviar el email.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <span className="text-5xl">🛵</span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-3">DeliveryApp</h1>
          <p className="text-gray-500 text-sm mt-1">Bienvenido, ingresa tus dastos </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tu@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <div>
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <div className="text-right mt-1">
              <Link to="/forgot-password" className="text-xs text-orange-500 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {unverified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-amber-800 mb-1">📧 Email sin verificar</p>
              <p className="text-xs text-amber-700 mb-3">
                Debes verificar tu email antes de ingresar. Revisa tu bandeja de entrada.
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || !form.email}
                className="text-xs font-semibold text-amber-700 underline hover:no-underline disabled:opacity-50"
              >
                {resending ? 'Reenviando...' : 'Reenviar email de verificación'}
              </button>
            </div>
          )}

          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
            Ingresar
          </Button>
          <Button type="button" variant="secondary" size="lg" className="mt-2 w-full"> 
          </Button>

        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-orange-500 font-semibold hover:underline">
            Regístrate
          </Link>
        </div>
      </div>
    </div>
  )
}
