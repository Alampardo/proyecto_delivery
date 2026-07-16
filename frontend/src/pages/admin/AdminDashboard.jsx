import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getDeliveries, generateCode, generateBizToken } from '../../api/deliveries'
import {
  getAdminOrders, getAdminReports, assignDelivery,
  getBusinessPayouts, markBusinessPaid, getDeliveryPayouts, markDeliveryPaid,
} from '../../api/orders'
import { getAdminBusinesses, createAdminBusiness, updateAdminBusiness, deleteAdminBusiness } from '../../api/adminBusinesses'
import { getAdminPricing, updateAdminPricing, getAdminRings, updateRing } from '../../api/pricing'
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
  const [catalogBusiness, setCatalogBusiness] = useState(null) // negocio cuyo catálogo se está viendo
  const [realtimeEvents, setRealtimeEvents] = useState([])
  const [deliveryFilter, setDeliveryFilter] = useState('all') // 'all' | 'active' | 'inactive'
  const [reports, setReports]         = useState(null)
  const [loadingReports, setLoadingReports] = useState(false)
  const now = new Date()
  const [reportYear, setReportYear]   = useState(now.getFullYear())
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1)

  // Envíos (pricing) y pagos pendientes
  const [pricingConfig, setPricingConfig]   = useState(null)
  const [pricingForm, setPricingForm]       = useState(null)
  const [savingPricing, setSavingPricing]   = useState(false)
  const [rings, setRings]                   = useState([])
  const [businessPayouts, setBusinessPayouts] = useState([])
  const [deliveryPayouts, setDeliveryPayouts] = useState([])
  const [loadingPayouts, setLoadingPayouts]   = useState(false)
  const [assignSelection, setAssignSelection] = useState({}) // { [orderId]: deliveryUserId }

  const loadDeliveries  = useCallback(async () => { try { const { data } = await getDeliveries(); setDeliveries(data) } catch {} }, [])
  const loadOrders      = useCallback(async () => { try { const { data } = await getAdminOrders(); setOrders(data) } catch { toast.error('Error cargando pedidos') } }, [])
  const loadBusinesses  = useCallback(async () => { try { const { data } = await getAdminBusinesses(); setBusinesses(data) } catch {} }, [])
  const loadReports     = useCallback(async () => {
    setLoadingReports(true)
    try { const { data } = await getAdminReports({ year: reportYear, month: reportMonth }); setReports(data) }
    catch { toast.error('Error cargando reportes') }
    finally { setLoadingReports(false) }
  }, [reportYear, reportMonth])
  const loadPricing     = useCallback(async () => {
    try {
      const [cfg, ringsRes] = await Promise.all([getAdminPricing(), getAdminRings()])
      setPricingConfig(cfg.data)
      setPricingForm(cfg.data)
      setRings(ringsRes.data)
    } catch { toast.error('Error cargando configuración de envío') }
  }, [])
  const loadPayouts     = useCallback(async () => {
    setLoadingPayouts(true)
    try {
      const [biz, del] = await Promise.all([getBusinessPayouts(), getDeliveryPayouts()])
      setBusinessPayouts(biz.data)
      setDeliveryPayouts(del.data)
    } catch { toast.error('Error cargando pagos pendientes') }
    finally { setLoadingPayouts(false) }
  }, [])

  // ── WebSocket ──────────────────────────────────────────────────────────
  const handleWsMessage = useCallback((msg) => {
    const ts = new Date().toLocaleTimeString('es-BO')

    if (msg.type === 'new_order') {
      toast(`Nuevo pedido de ${msg.data.client_name}`, { icon: '📦' })
      loadOrders()
      setRealtimeEvents((e) => [{ ts, text: `Nuevo pedido #${msg.data.order_id} — ${msg.data.business_name}`, type: 'order' }, ...e.slice(0, 19)])
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
  }, [loadOrders])

  useOrdersWebSocket(handleWsMessage, true)

  useEffect(() => { loadDeliveries(); loadBusinesses() }, [])
  useEffect(() => { if (tab === 'orders') loadOrders() }, [tab])
  useEffect(() => { if (tab === 'reports') loadReports() }, [tab, reportYear, reportMonth])
  useEffect(() => { if (tab === 'pricing') loadPricing() }, [tab, loadPricing])
  useEffect(() => { if (tab === 'payouts') loadPayouts() }, [tab, loadPayouts])

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

  const handleSavePricing = async (e) => {
    e.preventDefault()
    setSavingPricing(true)
    const fd = new FormData()
    const editableFields = [
      'is_rainy_day', 'is_holiday', 'rain_surcharge', 'holiday_surcharge',
      'night_surcharge', 'night_start', 'night_end', 'admin_commission_pct',
    ]
    editableFields.forEach((k) => fd.append(k, pricingForm[k]))
    if (pricingForm.admin_qr_image instanceof File) fd.append('admin_qr_image', pricingForm.admin_qr_image)
    try {
      await updateAdminPricing(fd)
      toast.success('Configuración de envío guardada')
      loadPricing()
    } catch { toast.error('Error al guardar configuración') } finally { setSavingPricing(false) }
  }

  const handleUpdateRingPrice = async (ring) => {
    try { await updateRing(ring.id, ring.price); toast.success(`Anillo ${ring.number} actualizado`) }
    catch { toast.error('Error al actualizar anillo') }
  }

  const handleAssignDelivery = async (orderId) => {
    const deliveryId = assignSelection[orderId]
    if (!deliveryId) { toast.error('Selecciona un repartidor'); return }
    try { await assignDelivery(orderId, deliveryId); toast.success('Repartidor asignado'); loadOrders() }
    catch { toast.error('Error al asignar repartidor') }
  }

  const handleMarkBusinessPaid = async (businessId) => {
    try { await markBusinessPaid(businessId); toast.success('Marcado como pagado'); loadPayouts() }
    catch { toast.error('Error') }
  }

  const handleMarkDeliveryPaid = async (userId) => {
    try { await markDeliveryPaid(userId); toast.success('Marcado como pagado'); loadPayouts() }
    catch { toast.error('Error') }
  }

  const TABS = [
    { key: 'deliveries', label: '🛵 Deliverys' },
    { key: 'businesses', label: '🏪 Negocios' },
    { key: 'codes',      label: '🔑 Códigos' },
    { key: 'orders',     label: '📦 Pedidos' },
    { key: 'reports',    label: '📊 Reportes' },
    { key: 'pricing',    label: '⚙️ Envíos' },
    { key: 'payouts',    label: '💰 Pagos' },
    { key: 'realtime',   label: '⚡ Tiempo real' },
  ]

  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

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
        {tab === 'deliveries' && (() => {
          const activeStatuses  = ['disponible', 'ocupado']
          const filtered = deliveries.filter((d) =>
            deliveryFilter === 'all'      ? true :
            deliveryFilter === 'active'   ? activeStatuses.includes(d.status) :
                                            d.status === 'fuera_servicio'
          )
          const countAll      = deliveries.length
          const countActive   = deliveries.filter((d) => activeStatuses.includes(d.status)).length
          const countInactive = deliveries.filter((d) => d.status === 'fuera_servicio').length

          const filterBtns = [
            { key: 'all',      label: 'Todos',           count: countAll },
            { key: 'active',   label: '🟢 En turno',     count: countActive },
            { key: 'inactive', label: '⚫ Fuera turno',  count: countInactive },
          ]

          return (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
                <h2 className="font-bold text-gray-900">Repartidores</h2>
                <span className="text-xs text-gray-400 hidden sm:block">Actualiza en tiempo real via WebSocket</span>
              </div>

              {/* Filtros */}
              <div className="flex gap-2 flex-wrap">
                {filterBtns.map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setDeliveryFilter(key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      deliveryFilter === key
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
                    }`}
                  >
                    {label}
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      deliveryFilter === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-2">🛵</p>
                  <p>{deliveries.length === 0 ? 'Sin repartidores registrados' : 'No hay repartidores en esta categoría'}</p>
                </div>
              ) : filtered.map((d) => {
                const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.fuera_servicio
                return (
                  <div key={d.id} className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-opacity ${d.status === 'fuera_servicio' ? 'opacity-60' : ''}`}>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-xl font-bold text-orange-500 shrink-0">
                      {d.full_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{d.full_name}</p>
                      <p className="text-sm text-gray-500 truncate">{d.phone} • {d.license_plate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge color={cfg.color} dot>{cfg.label}</Badge>
                      {d.whatsapp_url && (
                        <a href={d.whatsapp_url} target="_blank" rel="noreferrer"
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1">
                          <span>📲</span> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

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
                      <button onClick={() => setCatalogBusiness(b)} className="text-xs text-orange-500 hover:underline">Ver catálogo</button>
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
              <Button onClick={handleGenerateCode}  loading={loadingCode}>Generar código</Button>
              
              {generatedCode && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-xs text-orange-500 font-semibold mb-1">Código:</p>
                  <p className="font-mono text-sm break-all text-gray-800 select-all">{generatedCode}</p>
                  <button onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success('Copiado') }} className="mt-2 text-xs text-orange-600 hover:underline">📋 Copiar</button>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <Button type='secundary' size='lg'> </Button>

              <h3 className="font-bold text-gray-900">🏪 Token para Dueño</h3>
              <p className="text-sm text-gray-500">Genera un codigo de registro para un nuevo repartidor.</p>
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
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-900">Todos los pedidos ({orders.length})</h2>
              <button onClick={loadOrders} className="text-xs text-orange-500 font-semibold hover:underline">Recargar</button>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">📦</p><p>Sin pedidos aún</p></div>
            ) : orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-gray-900">Pedido #{order.id}</span>
                    <span className="ml-3 text-xs text-gray-400">{new Date(order.created_at).toLocaleString('es-BO')}</span>
                  </div>
                  <span className="font-bold text-orange-600">Bs. {Number(order.grand_total ?? order.total).toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">👤 {order.client_name} • 📞 {order.client_phone}</p>
                <p className="text-sm text-gray-600 mb-1">📍 {order.delivery_address}</p>
                {order.delivery_lat && order.delivery_lng && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${order.delivery_lat}&mlon=${order.delivery_lng}#map=17/${order.delivery_lat}/${order.delivery_lng}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline mb-1"
                  >
                    🗺️ Ver ubicación exacta en el mapa
                  </a>
                )}
                <p className="text-xs text-gray-400 mb-3">
                  Anillo {order.ring_number ?? '—'} • Envío Bs. {Number(order.shipping_cost).toFixed(2)} • Pago: {order.payment_method_display}
                </p>
                <div className="flex flex-col gap-2 mb-3">
                  {order.business_orders?.map((bo) => (
                    <div key={bo.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-800">🏪 {bo.business_name}</span>
                        <span className="text-xs font-bold text-gray-500">{bo.status_display}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {bo.items?.map((it) => (
                          <div key={it.id} className="flex items-center justify-between text-xs text-gray-600">
                            <span>{it.quantity}x {it.product_name}</span>
                            <span>Bs. {Number(it.subtotal).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-700 border-t border-gray-200 mt-1.5 pt-1.5">
                        <span>Subtotal</span>
                        <span>Bs. {Number(bo.subtotal).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {order.delivery ? (
                  <p className="text-xs text-green-600 font-semibold">🛵 Repartidor asignado</p>
                ) : (
                  <div className="flex items-center gap-2 border-t pt-3">
                    <select
                      value={assignSelection[order.id] ?? ''}
                      onChange={(e) => setAssignSelection({ ...assignSelection, [order.id]: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-orange-400"
                    >
                      <option value="">Asignar repartidor...</option>
                      {deliveries.filter((d) => d.status === 'disponible').map((d) => (
                        <option key={d.id} value={d.user_id}>{d.full_name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssignDelivery(order.id)}
                      className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-xl"
                    >
                      Asignar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* REPORTES */}
        {tab === 'reports' && (() => {
          const variTag = (pct) => {
            if (pct === null || pct === undefined) return <span className="text-xs text-gray-400">Sin datos del mes anterior</span>
            const up = pct >= 0
            return (
              <span className={`text-xs font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
                {up ? '▲' : '▼'} {Math.abs(pct)}% vs. mes anterior
              </span>
            )
          }
          return (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-bold text-gray-900">Reportes mensuales</h2>
                <div className="flex gap-2">
                  <select value={reportMonth} onChange={(e) => setReportMonth(Number(e.target.value))}
                    className="px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-400">
                    {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <select value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))}
                    className="px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-400">
                    {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {loadingReports || !reports ? (
                <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">📊</p><p>Cargando reportes...</p></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <p className="text-xs text-gray-400 mb-1">Pedidos del mes</p>
                      <p className="font-extrabold text-2xl text-gray-900">{reports.total_orders}</p>
                      {variTag(reports.variacion_pedidos_pct)}
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <p className="text-xs text-gray-400 mb-1">Monto total</p>
                      <p className="font-extrabold text-2xl text-gray-900">Bs. {Number(reports.total_amount).toFixed(2)}</p>
                      {variTag(reports.variacion_monto_pct)}
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <p className="text-xs text-gray-400 mb-1">Ticket promedio</p>
                      <p className="font-extrabold text-2xl text-gray-900">Bs. {Number(reports.ticket_promedio).toFixed(2)}</p>
                      <span className="text-xs text-gray-400">por pedido</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-3">🏪 Pedidos por negocio</h3>
                      {reports.by_business.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">Sin pedidos este mes</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {reports.by_business.map((b) => (
                            <div key={b.business_id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                              <span className="text-gray-700 truncate">{b.business__name}</span>
                              <span className="text-gray-500 shrink-0 ml-2">{b.total_pedidos} pedidos · <strong className="text-gray-900">Bs. {Number(b.monto).toFixed(2)}</strong></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-3">🔥 Productos más pedidos</h3>
                      {reports.top_products.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">Sin datos este mes</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {reports.top_products.map((p, i) => (
                            <div key={p.product_id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                              <span className="text-gray-700 truncate">{i + 1}. {p.product__name}</span>
                              <span className="text-gray-500 shrink-0 ml-2"><strong className="text-gray-900">{p.total_cantidad}</strong> uds. · Bs. {Number(p.total_monto).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })()}

        {/* ENVÍOS (pricing) */}
        {tab === 'pricing' && (
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-gray-900">Configuración de envío</h2>

            {!pricingForm ? (
              <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">⚙️</p><p>Cargando...</p></div>
            ) : (
              <>
                {/* Anillos */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3">Precio por anillo</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {rings.map((r, idx) => (
                      <div key={r.id} className="flex flex-col gap-1.5">
                        <label className="text-xs text-gray-500">Anillo {r.number}</label>
                        <div className="flex gap-1">
                          <input
                            type="number" step="0.01" value={r.price}
                            onChange={(e) => {
                              const next = [...rings]; next[idx] = { ...r, price: e.target.value }; setRings(next)
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-orange-400"
                          />
                          <button onClick={() => handleUpdateRingPrice(rings[idx])} className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold px-2 rounded-lg">✓</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSavePricing} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                  {/* Switches clima/feriado */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex items-center gap-2 flex-1 bg-blue-50 rounded-xl px-3 py-2.5 cursor-pointer">
                      <input type="checkbox" checked={pricingForm.is_rainy_day}
                        onChange={(e) => setPricingForm({ ...pricingForm, is_rainy_day: e.target.checked })}
                        className="accent-blue-500" />
                      <span className="text-sm text-gray-700">☔ Hoy es día lluvioso</span>
                    </label>
                    <label className="flex items-center gap-2 flex-1 bg-blue-50 rounded-xl px-3 py-2.5 cursor-pointer">
                      <input type="checkbox" checked={pricingForm.is_holiday}
                        onChange={(e) => setPricingForm({ ...pricingForm, is_holiday: e.target.checked })}
                        className="accent-blue-500" />
                      <span className="text-sm text-gray-700">🎉 Hoy es feriado</span>
                    </label>
                  </div>

                  {/* Montos de recargo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input label="Recargo lluvia (Bs.)" type="number" step="0.01"
                      value={pricingForm.rain_surcharge}
                      onChange={(e) => setPricingForm({ ...pricingForm, rain_surcharge: e.target.value })} />
                    <Input label="Recargo feriado (Bs.)" type="number" step="0.01"
                      value={pricingForm.holiday_surcharge}
                      onChange={(e) => setPricingForm({ ...pricingForm, holiday_surcharge: e.target.value })} />
                    <Input label="Recargo nocturno (Bs.)" type="number" step="0.01"
                      value={pricingForm.night_surcharge}
                      onChange={(e) => setPricingForm({ ...pricingForm, night_surcharge: e.target.value })} />
                  </div>

                  {/* Horario nocturno */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Inicio horario nocturno</label>
                      <input type="time" value={pricingForm.night_start}
                        onChange={(e) => setPricingForm({ ...pricingForm, night_start: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Fin horario nocturno</label>
                      <input type="time" value={pricingForm.night_end}
                        onChange={(e) => setPricingForm({ ...pricingForm, night_end: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-400" />
                    </div>
                  </div>

                  <Input label="Comisión admin sobre venta (%)" type="number" step="0.01"
                    value={pricingForm.admin_commission_pct}
                    onChange={(e) => setPricingForm({ ...pricingForm, admin_commission_pct: e.target.value })} />

                  {/* QR de pago */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">QR de pago del admin</label>
                    {pricingConfig?.admin_qr_image && !(pricingForm.admin_qr_image instanceof File) && (
                      <img src={pricingConfig.admin_qr_image} alt="QR actual" className="w-24 h-24 object-contain rounded-lg border mb-2" />
                    )}
                    <input type="file" accept="image/*"
                      onChange={(e) => setPricingForm({ ...pricingForm, admin_qr_image: e.target.files[0] })}
                      className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium w-full" />
                  </div>

                  <Button type="submit" loading={savingPricing}>Guardar configuración</Button>
                </form>
              </>
            )}
          </div>
        )}

        {/* PAGOS PENDIENTES */}
        {tab === 'payouts' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Pagos pendientes</h2>
              <button onClick={loadPayouts} className="text-xs text-orange-500 font-semibold hover:underline">Recargar</button>
            </div>

            {loadingPayouts ? (
              <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">💰</p><p>Cargando...</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3">🏪 A negocios</h3>
                  {businessPayouts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Nada pendiente</p>
                  ) : businessPayouts.map((b) => (
                    <div key={b.business_id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 py-2">
                      <div>
                        <p className="text-gray-700">{b.business__name}</p>
                        <p className="text-xs text-gray-400">{b.orders_count} pedidos</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <strong className="text-gray-900">Bs. {Number(b.total_pending).toFixed(2)}</strong>
                        <button onClick={() => handleMarkBusinessPaid(b.business_id)} className="text-xs bg-green-500 hover:bg-green-600 text-white font-bold px-2 py-1 rounded-lg">Marcar pagado</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3">🛵 A repartidores</h3>
                  {deliveryPayouts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Nada pendiente</p>
                  ) : deliveryPayouts.map((d) => (
                    <div key={d.delivery_id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 py-2">
                      <div>
                        <p className="text-gray-700">{d.delivery__first_name} {d.delivery__last_name}</p>
                        <p className="text-xs text-gray-400">{d.orders_count} pedidos entregados</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <strong className="text-gray-900">Bs. {Number(d.total_pending).toFixed(2)}</strong>
                        <button onClick={() => handleMarkDeliveryPaid(d.delivery_id)} className="text-xs bg-green-500 hover:bg-green-600 text-white font-bold px-2 py-1 rounded-lg">Marcar pagado</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      {/* Modal catálogo de negocio */}
      <Modal open={!!catalogBusiness} onClose={() => setCatalogBusiness(null)} title={catalogBusiness ? `Catálogo — ${catalogBusiness.name}` : ''}>
        <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
          {!catalogBusiness?.products?.length ? (
            <p className="text-sm text-gray-400 text-center py-8">Este negocio no tiene productos cargados</p>
          ) : catalogBusiness.products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : '🍽️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                {p.description && <p className="text-xs text-gray-400 truncate">{p.description}</p>}
                <p className="text-xs text-gray-500">Stock: {p.stock}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-sm font-bold text-orange-600">Bs. {Number(p.price).toFixed(2)}</span>
                <Badge color={p.is_available ? 'green' : 'gray'}>{p.is_available ? 'Disponible' : 'Agotado'}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
