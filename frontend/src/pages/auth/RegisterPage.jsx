import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { registerClient, registerDelivery, registerOwner } from '../../api/auth'
import useAuthStore from '../../stores/useAuthStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

const TABS = [
  { key: 'client',   label: '👤 Cliente',    desc: 'Registro libre' },
  { key: 'delivery', label: '🛵 Delivery',   desc: 'Requiere código del admin' },
  { key: 'owner',    label: '🏪 Mi Negocio', desc: 'Requiere token de comercio' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const [tab, setTab]         = useState('client')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})

  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '', phone: '',
    password: '', password2: '',
    // Delivery
    registration_code: '', birth_date: '', ci: '', drivers_license: '', license_plate: '',
    // Owner
    business_token: '',
  })

  const f = (field) => ({ value: form[field], error: errors[field], onChange: (e) => setForm({ ...form, [field]: e.target.value }) })

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

      const { data } = await apiFn(payload)
      localStorage.setItem('token', data.token)
      setAuth(data)
      toast.success('¡Cuenta creada con éxito!')
      const redirects = { admin: '/admin', delivery: '/delivery', owner: '/owner', client: '/' }
      navigate(redirects[data.user.role] ?? '/')
    } catch (err) {
      setErrors(err.response?.data ?? {})
      toast.error('Revisa los datos del formulario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
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
          {/* Campos comunes */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre" placeholder="Juan" {...f('first_name')} required />
            <Input label="Apellido" placeholder="Perez" {...f('last_name')} required />
          </div>
          <Input label="Correo electrónico" type="email" placeholder="tu@email.com" {...f('email')} required />
          <Input label="Teléfono" type="tel" placeholder="70012345" {...f('phone')} />
          <Input label="Contraseña" type="password" placeholder="Mínimo 8 caracteres" {...f('password')} required />
          <Input label="Confirmar contraseña" type="password" placeholder="Repite tu contraseña" {...f('password2')} required />

          {/* Campos Delivery */}
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

          {/* Campos Dueño */}
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
