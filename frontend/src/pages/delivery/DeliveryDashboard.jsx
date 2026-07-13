import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getMyProfile, toggleShift, updateMyProfile, getHistory, getMyActiveOrders, getMyPayout } from '../../api/deliveries'
import { useOrdersWebSocket } from '../../hooks/useWebSocket'
import useAuthStore from '../../stores/useAuthStore'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'

const STATUS_CONFIG = {
  disponible:     { color: 'green',  label: 'Disponible',        dot: true },
  ocupado:        { color: 'yellow', label: 'Ocupado',           dot: true },
  fuera_servicio: { color: 'gray',   label: 'Fuera de servicio', dot: false },
}

const DAYS_OPTIONS = [
  { value: 1, label: 'Hoy' },
  { value: 2, label: 'Últimos 2 días' },
  { value: 3, label: 'Últimos 3 días' },
]

export default function DeliveryDashboard() {
  const { user, updateProfile } = useAuthStore()
  const [profile, setProfile]   = useState(null)
  const [orders, setOrders]     = useState([])
  const [activeOrders, setActiveOrders] = useState([])
  const [payout, setPayout]     = useState(null)
  const [days, setDays]         = useState(1)
  const [tab, setTab]           = useState('home')
  const [toggling, setToggling] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [editForm, setEditForm] = useState({})

  const loadActiveOrders = useCallback(async () => {
    try { const { data } = await getMyActiveOrders(); setActiveOrders(data) }
    catch { toast.error('No se pudieron cargar tus pedidos') }
  }, [])

  const loadPayout = useCallback(async () => {
    try { const { data } = await getMyPayout(); setPayout(data) }
    catch { /* silencioso: no bloquea el resto del panel */ }
  }, [])

  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'order_assigned') {
      toast.success('¡Nuevo pedido asignado! 📦')
      loadActiveOrders()
    }
  }, [loadActiveOrders])

  useOrdersWebSocket(handleWsMessage, true)

  useEffect(() => { loadProfile(); loadActiveOrders(); loadPayout() }, [])
  useEffect(() => { if (tab === 'history') loadHistory() }, [tab, days])
  useEffect(() => { if (tab === 'active') loadActiveOrders() }, [tab, loadActiveOrders])

  const loadProfile = async () => {
    try {
      const { data } = await getMyProfile()
      setProfile(data)
      setEditForm({
        ci: data.ci, drivers_license: data.drivers_license,
        license_plate: data.license_plate, has_ruat: data.has_ruat,
      })
    } catch { toast.error('No se pudo cargar el perfil') }
  }

  const loadHistory = async () => {
    try {
      const { data } = await getHistory(days)
      setOrders(data)
    } catch { toast.error('No se pudo cargar el historial') }
  }

  const handleToggle = async () => {
    setToggling(true)
    try {
      const { data } = await toggleShift()
      setProfile((p) => ({ ...p, ...data }))
      const msg = data.status === 'disponible' ? '¡Turno iniciado! Estás disponible 🟢' : 'Turno finalizado. ¡Descansa! 🔴'
      toast.success(msg)
    } catch { toast.error('Error al cambiar estado') } finally { setToggling(false) }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(editForm).forEach(([k, v]) => { if (v !== undefined) fd.append(k, v) })
      const { data } = await updateMyProfile(fd)
      setProfile(data)
      toast.success('Perfil actualizado')
    } catch { toast.error('Error al guardar') } finally { setSaving(false) }
  }

  const isOnShift = profile?.status === 'disponible' || profile?.status === 'ocupado'
  const statusCfg = STATUS_CONFIG[profile?.status] ?? STATUS_CONFIG.fuera_servicio

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Panel Delivery</p>
            <h1 className="font-extrabold text-gray-900">Hola, {user?.first_name} 👋</h1>
          </div>
          {profile && <Badge color={statusCfg.color} dot={statusCfg.dot}>{statusCfg.label}</Badge>}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b px-4">
        <div className="max-w-2xl mx-auto flex">
          {[['home','🏠 Inicio'],['active','🚚 Mis pedidos'],['history','📋 Historial'],['profile','👤 Perfil']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* HOME */}
        {tab === 'home' && (
          <div className="flex flex-col items-center gap-6">
            {/* Botón de turno */}
            <div className="bg-white rounded-3xl p-8 shadow-sm w-full text-center">
              <p className="text-gray-500 text-sm mb-2">Estado de tu turno</p>
              <div className={`text-6xl font-extrabold mb-6 ${isOnShift ? 'text-green-500' : 'text-gray-300'}`}>
                {isOnShift ? '🟢' : '⚪'}
              </div>
              <p className="text-lg font-bold text-gray-700 mb-6">
                {isOnShift ? 'Estás disponible para pedidos' : 'Fuera de turno'}
              </p>
              <Button
                size="xl"
                variant={isOnShift ? 'danger' : 'green'}
                loading={toggling}
                onClick={handleToggle}
                className="w-full rounded-2xl text-base"
              >
                {isOnShift ? '⏹ Finalizar turno' : '▶ Iniciar turno'}
              </Button>
              {profile?.shift_started_at && isOnShift && (
                <p className="text-xs text-gray-400 mt-3">
                  Turno iniciado: {new Date(profile.shift_started_at).toLocaleTimeString('es-BO')}
                </p>
              )}
            </div>

            {/* Info rápida */}
            {profile && (
              <div className="bg-white rounded-2xl p-5 shadow-sm w-full grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Placa</p>
                  <p className="font-bold text-gray-900">{profile.license_plate}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">RUAT</p>
                  <p className="font-bold text-gray-900">{profile.has_ruat ? '✅ Sí' : '❌ No'}</p>
                </div>
              </div>
            )}

            {/* Ganancia pendiente */}
            {payout && (
              <div className="bg-white rounded-2xl p-5 shadow-sm w-full text-center">
                <p className="text-xs text-gray-400 mb-1">Ganancia pendiente por cobrar</p>
                <p className="font-extrabold text-2xl text-green-600">Bs. {Number(payout.total_pending).toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">{payout.orders_count} pedidos entregados sin pagar</p>
              </div>
            )}
          </div>
        )}

        {/* MIS PEDIDOS (activos) */}
        {tab === 'active' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Pedidos asignados</h2>
              <button onClick={loadActiveOrders} className="text-xs text-orange-500 font-semibold hover:underline">Recargar</button>
            </div>
            {activeOrders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-2">🚚</p>
                <p>No tienes pedidos asignados por ahora</p>
              </div>
            ) : (
              activeOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">Pedido #{order.id}</p>
                      <p className="text-xs text-gray-400">{order.status_display}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">Tu ganancia: Bs. {Number(order.shipping_cost).toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">👤 {order.client_name} • 📞 {order.client_phone}</p>
                  <p className="text-sm text-gray-600 mb-1">📍 {order.delivery_address}</p>
                  <p className="text-xs text-gray-400">
                    Anillo {order.ring_number ?? '—'} • Pago: {order.payment_method_display}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* HISTORIAL */}
        {tab === 'history' && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {DAYS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDays(value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${days === value ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-2">📋</p>
                <p>Sin pedidos en este período</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">Pedido #{order.id}</p>
                      <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString('es-BO')}</p>
                    </div>
                    <span className="text-sm font-bold text-orange-600">Bs. {Number(order.grand_total ?? order.total).toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">📍 {order.delivery_address}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* PERFIL */}
        {tab === 'profile' && profile && (
          <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <h2 className="font-bold text-gray-900">Mis datos</h2>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Carnet (CI)" value={editForm.ci ?? ''} onChange={(e) => setEditForm({ ...editForm, ci: e.target.value })} />
              <Input label="Nro. permiso" value={editForm.drivers_license ?? ''} onChange={(e) => setEditForm({ ...editForm, drivers_license: e.target.value })} />
              <Input label="Placa de moto" value={editForm.license_plate ?? ''} onChange={(e) => setEditForm({ ...editForm, license_plate: e.target.value })} />
            </div>
            <div className="flex items-center gap-3 py-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setEditForm({ ...editForm, has_ruat: !editForm.has_ruat })}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${editForm.has_ruat ? 'bg-green-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${editForm.has_ruat ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Tengo RUAT</span>
              </label>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">QR Bancario</label>
              <input
                type="file"
                accept="image/*"
                className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium hover:file:bg-orange-100 w-full"
                onChange={(e) => setEditForm({ ...editForm, bank_qr_image: e.target.files[0] })}
              />
              {profile.bank_qr_image && (
                <img src={profile.bank_qr_image} alt="QR" className="mt-2 w-32 h-32 object-contain rounded-xl border" />
              )}
            </div>
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </form>
        )}
      </main>
    </div>
  )
}
