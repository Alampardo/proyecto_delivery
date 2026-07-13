import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { resetPassword } from '../../api/auth'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function ResetPasswordPage() {
  const navigate          = useNavigate()
  const [searchParams]    = useSearchParams()
  const token             = searchParams.get('token') ?? ''
  const [form, setForm]   = useState({ new_password: '', new_password2: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    if (form.new_password !== form.new_password2) {
      setErrors({ new_password2: ['Las contraseñas no coinciden.'] })
      return
    }
    setLoading(true)
    try {
      await resetPassword({ token, ...form })
      toast.success('Contraseña actualizada. Ya puedes ingresar.')
      navigate('/login')
    } catch (err) {
      const data = err.response?.data ?? {}
      if (data.detail) setErrors({ detail: data.detail })
      else setErrors(data)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-linear-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center">
          <p className="text-5xl mb-4">❌</p>
          <h2 className="font-bold text-gray-900 mb-2">Enlace inválido</h2>
          <p className="text-gray-500 text-sm mb-6">Este enlace no es válido o ya expiró.</p>
          <Link to="/forgot-password">
            <Button className="w-full">Solicitar nuevo enlace</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <span className="text-5xl">🔒</span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-3">Nueva contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">Elige una contraseña segura</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nueva contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={form.new_password}
            error={errors.new_password?.[0]}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            required
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            placeholder="Repite tu nueva contraseña"
            value={form.new_password2}
            error={errors.new_password2?.[0]}
            onChange={(e) => setForm({ ...form, new_password2: e.target.value })}
            required
          />

          {errors.detail && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {errors.detail}{' '}
              {errors.detail.toLowerCase().includes('expiró') && (
                <Link to="/forgot-password" className="font-semibold underline">Solicitar nuevo enlace</Link>
              )}
            </div>
          )}

          <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
            Guardar nueva contraseña
          </Button>
        </form>
      </div>
    </div>
  )
}
