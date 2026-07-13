import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { registerClient, registerDelivery, registerOwner, resendVerification } from '../../api/auth'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

const TABS = [
  { key: 'client',   label: '👤 Cliente',    desc: 'Registro libre' },
  { key: 'delivery', label: '🛵 Delivery',   desc: 'Requiere código del admin' },
  { key: 'owner',    label: '🏪 Mi Negocio', desc: 'Requiere token de comercio' },
]

export default function RegisterPage() {
  const [tab, setTab]           = useState('client')
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState({})
  const [emailSent, setEmailSent] = useState(null) // email address after success
  const [resending, setResending] = useState(false)

  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '', phone: '',
    password: '', password2: '',
    registration_code: '', birth_date: '', ci: '', drivers_license: '', license_plate: '',
    business_token: '',
  })

  const f = (field) => ({
    value: form[field],
    error: errors[field],
    onChange: (e) => setForm({ ...form, [field]: e.target.value }),
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const apiFn = tab === 'client' ? registerClient : tab === 'delivery' ? registerDelivery : registerOwner
      const payload = tab === 'client'
        ? { email: form.email, first_name: form.first_name, last_name: form.last_name, phone: form.phone, password: form.password, password2: form.password2 }
        : tab === 'delivery'
        ? { email: form.email, first_name: form.first_name, last_name: form.last_name, phone: form.phone, password: form.password, password2: form.password2, registration_code: form.registration_code, birth_date: form.birth_date, ci: form.ci, drivers_license: form.drivers_license, license_plate: form.license_plate }
        : { email: form.email, first_name: form.first_name, last_name: form.last_name, phone: form.phone, password: form.password, password2: form.password2, business_token: form.business_token }

      await apiFn(payload)
      setEmailSent(form.email)
    } catch (err) {
      const data = err.response?.data ?? {}
      setErrors(data)
      const first = Object.values(data).flat()[0]
      toast.error(first ?? 'Revisa los datos del formulario')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await resendVerification(emailSent)
      toast.success('Email reenviado. Revisa tu bandeja.')
    } catch {
      toast.error('No se pudo reenviar.')
    } finally {
      setResending(false)
    }
  }

  // Pantalla de éxito — esperando verificación
  if (emailSent) {
    return (
      <div className="min-h-screen bg-linear-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center">
          <p className="text-6xl mb-4">📧</p>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">¡Revisa tu email!</h1>
          <p className="text-gray-500 text-sm mb-1">
            Enviamos un enlace de verificación a:
          </p>
          <p className="font-bold text-gray-800 mb-6">{emailSent}</p>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-orange-700 mb-6">
            <p>Haz click en el enlace del email para activar tu cuenta. El enlace expira en 24 horas.</p>
          </div>

          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-orange-500 font-semibold hover:underline disabled:opacity-50 mb-4 block w-full"
          >
            {resending ? 'Reenviando...' : '¿No llegó? Reenviar email'}
          </button>

          <Link to="/login" className="text-sm text-gray-400 hover:text-gray-600">
            Volver al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <span className="text-4xl">🛵</span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-2">Crear cuenta</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all text-center ${
                tab === t.key ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              <div className="text-xs font-normal text-gray-400 hidden sm:block">{t.desc}</div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre" placeholder="Juan" {...f('first_name')} required />
            <Input label="Apellido" placeholder="Perez" {...f('last_name')} required />
          </div>
          <Input label="Correo electrónico" type="email" placeholder="tu@email.com" {...f('email')} required />
          <Input label="Teléfono" type="tel" placeholder="70012345" {...f('phone')} />
          <Input label="Contraseña" type="password" placeholder="Mínimo 8 caracteres" {...f('password')} required />
          <Input label="Confirmar contraseña" type="password" placeholder="Repite tu contraseña" {...f('password2')} required />

          {tab === 'delivery' && (
            <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
              <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">Datos de repartidor</p>
              <Input label="Código de registro (Admin)" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...f('registration_code')} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Fecha de nacimiento" type="date" {...f('birth_date')} required />
                <Input label="Carnet de Identidad" placeholder="1234567" {...f('ci')} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Permiso de conducir" placeholder="Nro. permiso" {...f('drivers_license')} required />
                <Input label="Placa de moto" placeholder="123ABC" {...f('license_plate')} required />
              </div>
            </div>
          )}

          {tab === 'owner' && (
            <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
              <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">Token de tu comercio</p>
              <Input label="Token de Comercio (Admin)" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...f('business_token')} required />
            </div>
          )}

          {errors.non_field_errors && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {errors.non_field_errors[0]}
            </div>
          )}

          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
            Crear cuenta
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-orange-500 font-semibold hover:underline">Ingresar</Link>
        </div>
      </div>
    </div>
  )
}
