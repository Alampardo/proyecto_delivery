import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getDeliveries, generateCode, generateBizToken } from '../../api/deliveries'
import { getAdminOrders } from '../../api/orders'
import { getAdminBusinesses, createAdminBusiness, updateAdminBusiness, deleteAdminBusiness } from '../../api/adminBusinesses'
import { useOrdersWebSocket } from '../../hooks/useWebSocket'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

const STATUS_CONFIG = {
  disponible:     { color: 'green',  label: 'Disponible' },
  ocupado:        { color: 'yellow', label: 'Ocupado' },
  fuera_servicio: { color: 'gray',   label: 'Fuera de servicio' },
}

const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
const CATEGORIES = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'farmacia',    label: 'Farmacia' },
  { value: 'encomienda',  label: 'Encomienda' },
]

const emptyBizForm = () => ({
  name: '', category: 'restaurante', description: '', address: '',
  phone: '', whatsapp: '', is_active: true,
  schedules: DAYS.map((_, i) => ({ day: i, open_time: '08:00', close_time: '20:00', is_closed: false })),
})

export default function AdminDashboard() {
  const [tab, setTab]               = useState('deliveries')
  const [deliveries, setDeliveries] = useState([])
  const [orders, setOrders]         = useState([])
  const [businesses, setBusinesses] = useState([])
  const [generatedCode, setGeneratedCode]   = useState(null)
  const [generatedToken, setGeneratedToken] = useState(null)
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [loadingCode, setLoadingCode]   = useState(false)
  const [loadingToken, setLoadingToken] = useState(false)
  const [bizModal, setBizModal]         = useState(null) // null | 'create' | business
  const [bizForm, setBizForm]           = useState(emptyBizForm())
  const [savingBiz, setSavingBiz]       = useState(false)
  const [realtimeEvents, setRealtimeEvents] = useState([])

  // ── WebSocket ──────────────────────────────────────────────────────────
  const handleWsMessage = useCallback((msg) => {
    const ts = new Date().toLocaleTimeString('es-BO')

    if (msg.type === 'new_order') {
      toast(`🆕 Nuevo pedido de ${msg.data.client_name}`, { icon: '📦' })
      setOrders((prev) => {
        const exists = prev.find((o) => o.id === msg.data.order_id)
        return exists ? prev : prev
      })
      setRealtimeEvents((e) => [{ ts, text: `Nuevo pedido #${msg.data.id} — ${msg.data.business_name}`, type: 'order' }, ...e.slice(0, 19)])
    }
    if (msg.type === 'order_status_changed') {
      setRealtimeEvents((e) => [{ ts, text: `Pedido #${msg.data.id} → ${msg.data.status_display}`, type: 'status' }, ...e.slice(0, 19)])
    }
    if (msg.type === 'delivery_status_changed') {
      setDeliveries((prev) =>
        prev.map((d) => d.id === msg.data.id
          ? { ...d, status: msg.data.status, status_display: msg.data.status_display }
          : d
        )
      )
      setRealtimeEvents((e) => [{ ts, text: `🛵 ${msg.data.full_name} → ${msg.data.status_display}`, type: 'delivery' }, ...e.slice(0, 19)])
    }
  }, [])

  useOrdersWebSocket(handleWsMessage, true)

  const loadDeliveries  = useCallback(async () => { try { const { data } = await getDeliveries(); setDeliveries(data) } catch {} }, [])
  const loadOrders      = useCallback(async () => { try { const { data } = await getAdminOrders(); setOrders(data) } catch { toast.error('Error cargando pedidos') } }, [])
  const loadBusinesses  = useCallback(async () => { try { const { data } = await getAdminBusinesses(); setBusinesses(data) } catch {} }, [])

  useEffect(() => { loadDeliveries(); loadBusinesses() }, [])
  useEffect(() => { if (tab === 'orders') loadOrders() }, [tab])

  const handleGenerateCode = async () => {
    setLoadingCode(true)
    try { const { data } = await generateCode(); setGeneratedCode(data.code); toast.success('Código generado') }
    catch { toast.error('Error') } finally { setLoadingCode(false) }
  }

  const handleGenerateToken = async () => {
    if (!selectedBusiness) { toast.error('Selecciona un negocio'); return }
    setLoadingToken(true)
    try { const { data } = await generateBizToken(selectedBusiness); setGeneratedToken(data.code); toast.success('Token generado') }
    catch { toast.error('Error') } finally { setLoadingToken(false) }
  }

  const handleSaveBiz = async (e) => {
    e.preventDefault()
    setSavingBiz(true)
    const fd = new FormData()
    const { schedules, logo, ...rest } = bizForm
    Object.entries(rest).forEach(([k, v]) => fd.append(k, v))
    if (logo instanceof File) fd.append('logo', logo)
    fd.append('schedules', JSON.stringify(schedules))
    try {
      if (bizModal === 'create') { await createAdminBusiness(fd); toast.success('Negocio creado') }
      else { await updateAdminBusiness(bizModal.id, fd); toast.success('Negocio actualizado') }
      setBizModal(null); loadBusinesses()
    } catch { toast.error('Error al guardar') } finally { setSavingBiz(false) }
  }

  const handleDeleteBiz = async (id) => {
    if (!confirm('¿Desactivar este negocio?')) return
    try { await deleteAdminBusiness(id); toast.success('Negocio desactivado'); loadBusinesses() }
    catch { toast.error('Error') }
  }

  const TABS = [
    { key: 'deliveries', label: '🛵 Deliverys' },
    { key: 'businesses', label: '🏪 Negocios' },
    { key: 'codes',      label: '🔑 Códigos' },
    { key: 'orders',     label: '📦 Pedidos' },
    { key: 'realtime',   label: '⚡ Tiempo real' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Panel de Administración</p>
            <h1 className="font-extrabold text-gray-900 text-xl">🛵 DeliveryApp</h1>
          </div>
          {realtimeEvents.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              WebSocket activo
            </span>
          )}
        </div>
      </header>

      <div className="bg-white border-b overflow-x-auto">
        <div className="max-w-5xl mx-auto flex min-w-max">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* DELIVERYS */}
        {tab === 'deliveries' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-900">Repartidores</h2>
              <span className="text-xs text-gray-400">Actualiza en tiempo real via WebSocket</span>
            </div>
            {deliveries.length === 0 ? (
              <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">🛵</p><p>Sin repartidores</p></div>
            ) : deliveries.map((d) => {
              const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.fuera_servicio
              return (
                <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-xl font-bold text-orange-500">{d.full_name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{d.full_name}</p>
                    <p className="text-sm text-gray-500 truncate">{d.phone} • {d.license_plate}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={cfg.color} dot>{cfg.label}</Badge>
                    {d.whatsapp_url && (
                      <a href={d.whatsapp_url} target="_blank" rel="noreferrer" className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1">
                        <span>📲</span> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* NEGOCIOS */}
        {tab === 'businesses' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-900">Negocios ({businesses.length})</h2>
              <Button size="sm" onClick={() => { setBizForm(emptyBizForm()); setBizModal('create') }}>+ Nuevo negocio</Button>
            </div>
            {businesses.length === 0 ? (
              <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">🏪</p><p>Sin negocios creados</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {businesses.map((b) => (
                  <div key={b.id} className={`bg-white rounded-2xl p-4 shadow-sm flex gap-3 items-start ${!b.is_active ? 'opacity-50' : ''}`}>
                    <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-2xl overflow-hidden shrink-0">
                      {b.logo ? <img src={b.logo} alt={b.name} className="w-full h-full object-cover rounded-xl" /> :
                        b.category === 'farmacia' ? '💊' : b.category === 'encomienda' ? '📦' : '🍔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{b.name}</p>
                      <p className="text-xs text-orange-500 capitalize">{b.category_display}</p>
                      <p className="text-xs text-gray-400 truncate">{b.address}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge color={b.is_active ? 'green' : 'gray'}>{b.is_active ? 'Activo' : 'Inactivo'}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => { setBizForm({...b, schedules: b.schedules?.length ? b.schedules : emptyBizForm().schedules}); setBizModal(b) }} className="text-xs text-blue-500 hover:underline">Editar</button>
                      <button onClick={() => handleDeleteBiz(b.id)} className="text-xs text-red-400 hover:underline">Desactivar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CÓDIGOS */}
        {tab === 'codes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="font-bold text-gray-900">🛵 Código para Delivery</h3>
              <p className="text-sm text-gray-500">Genera un código de registro para un nuevo repartidor.</p>
              <Button onClick={handleGenerateCode} loading={loadingCode}>Generar código</Button>
              {generatedCode && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-xs text-orange-500 font-semibold mb-1">Código:</p>
                  <p className="font-mono text-sm break-all text-gray-800 select-all">{generatedCode}</p>
                  <button onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success('Copiado') }} className="mt-2 text-xs text-orange-600 hover:underline">📋 Copiar</button>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="font-bold text-gray-900">🏪 Token para Dueño</h3>
              <select value={selectedBusiness} onChange={(e) => setSelectedBusiness(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200">
                <option value="">Seleccionar negocio...</option>
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.category_display})</option>)}
              </select>
              <Button onClick={handleGenerateToken} loading={loadingToken} variant="secondary">Generar token</Button>
              {generatedToken && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs text-blue-500 font-semibold mb-1">Token:</p>
                  <p className="font-mono text-sm break-all text-gray-800 select-all">{generatedToken}</p>
                  <button onClick={() => { navigator.clipboard.writeText(generatedToken); toast.success('Copiado') }} className="mt-2 text-xs text-blue-600 hover:underline">📋 Copiar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PEDIDOS */}
        {tab === 'orders' && (
          <div className="flex flex-col gap-3">
            <h2 className="font-bold text-gray-900 mb-2">Todos los pedidos</h2>
            {orders.length === 0 ? (
              <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">📦</p><p>Sin pedidos aún</p></div>
            ) : orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-gray-900">Pedido #{order.id}</span>
                    <span className="ml-3 text-xs text-gray-400">{new Date(order.created_at).toLocaleString('es-BO')}</span>
                  </div>
                  <span className="font-bold text-orange-600">Bs. {Number(order.total).toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">👤 {order.client_name} • 📞 {order.client_phone}</p>
                <p className="text-sm text-gray-600 mb-3">📍 {order.delivery_address}</p>
                <div className="flex flex-wrap gap-2">
                  {order.business_orders?.map((bo) => (
                    <span key={bo.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                      {bo.business_name}: <strong>{bo.status_display}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TIEMPO REAL */}
        {tab === 'realtime' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Actividad en tiempo real</h2>
              <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Conectado via WebSocket
              </span>
            </div>
            {realtimeEvents.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-2">⚡</p>
                <p>Esperando eventos...</p>
                <p className="text-xs mt-1">Los eventos aparecen aquí cuando ocurren pedidos o cambios de estado</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {realtimeEvents.map((ev, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${i === 0 ? 'bg-green-50' : ''}`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${ev.type === 'order' ? 'bg-orange-400' : ev.type === 'delivery' ? 'bg-blue-400' : 'bg-yellow-400'}`} />
                    <span className="text-sm text-gray-700 flex-1">{ev.text}</span>
                    <span className="text-xs text-gray-400 shrink-0">{ev.ts}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal negocio */}
      <Modal open={!!bizModal} onClose={() => setBizModal(null)} title={bizModal === 'create' ? 'Nuevo negocio' : 'Editar negocio'}>
        <form onSubmit={handleSaveBiz} className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="Nombre del negocio" value={bizForm.name} onChange={(e) => setBizForm({...bizForm, name: e.target.value})} required />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Categoría</label>
            <select value={bizForm.category} onChange={(e) => setBizForm({...bizForm, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-400">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <Input label="Dirección" value={bizForm.address} onChange={(e) => setBizForm({...bizForm, address: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono" value={bizForm.phone} onChange={(e) => setBizForm({...bizForm, phone: e.target.value})} />
            <Input label="WhatsApp" value={bizForm.whatsapp} onChange={(e) => setBizForm({...bizForm, whatsapp: e.target.value})} />
          </div>
          <Input label="Descripción" value={bizForm.description} onChange={(e) => setBizForm({...bizForm, description: e.target.value})} />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Logo</label>
            <input type="file" accept="image/*" className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium w-full" onChange={(e) => setBizForm({...bizForm, logo: e.target.files[0]})} />
          </div>

          {/* Horarios */}
          <div className="border-t pt-3">
            <p className="text-sm font-semibold text-gray-700 mb-2">Horarios de atención</p>
            {bizForm.schedules.map((sch, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-gray-500 w-16">{DAYS[sch.day]}</span>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sch.is_closed} onChange={(e) => {
                    const s = [...bizForm.schedules]; s[idx] = {...s[idx], is_closed: e.target.checked}; setBizForm({...bizForm, schedules: s})
                  }} className="accent-red-400" />
                  <span className="text-xs text-gray-400">Cerrado</span>
                </label>
                {!sch.is_closed && (
                  <>
                    <input type="time" value={sch.open_time} onChange={(e) => { const s=[...bizForm.schedules]; s[idx]={...s[idx],open_time:e.target.value}; setBizForm({...bizForm,schedules:s}) }} className="text-xs border rounded-lg px-2 py-1 focus:outline-none focus:border-orange-400" />
                    <span className="text-xs text-gray-400">—</span>
                    <input type="time" value={sch.close_time} onChange={(e) => { const s=[...bizForm.schedules]; s[idx]={...s[idx],close_time:e.target.value}; setBizForm({...bizForm,schedules:s}) }} className="text-xs border rounded-lg px-2 py-1 focus:outline-none focus:border-orange-400" />
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setBizModal(null)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={savingBiz}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
