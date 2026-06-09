import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { login as apiLogin } from '../../api/auth'
import useAuthStore from '../../stores/useAuthStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function LoginPage() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((s) => s.setAuth)
  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await apiLogin(form)
      localStorage.setItem('token', data.token)
      setAuth(data)
      toast.success(`¡Bienvenido, ${data.user.first_name}!`)
      const redirects = { admin: '/admin', delivery: '/delivery', owner: '/owner', client: '/' }
      navigate(redirects[data.user.role] ?? '/')
    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <span className="text-5xl">🛵</span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-3">DeliveryApp</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresa a tu cuenta</p>
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
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
            Ingresar
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
