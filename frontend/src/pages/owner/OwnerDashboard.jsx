import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getMyProducts, createProduct, updateProduct, deleteProduct, toggleAvailability } from '../../api/businesses'
import { getOwnerOrders, startPreparation, handToDelivery } from '../../api/orders'
import useAuthStore from '../../stores/useAuthStore'
import { useOrdersWebSocket } from '../../hooks/useWebSocket'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

const ORDER_STATUS_CONFIG = {
  pendiente:            { color: 'orange', label: '⏳ Pendiente' },
  en_preparacion:       { color: 'yellow', label: '👨‍🍳 En preparación' },
  entregado_repartidor: { color: 'blue',   label: '🛵 Listo' },
  cancelado:            { color: 'red',    label: '❌ Cancelado' },
}

export default function OwnerDashboard() {
  const { user, profile } = useAuthStore()
  const [tab, setTab]         = useState('orders')
  const [orders, setOrders]   = useState([])
  const [products, setProducts] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [productModal, setProductModal] = useState(null)
  const [productForm, setProductForm]   = useState({})
  const [saving, setSaving]   = useState(false)
  const push = usePushNotifications()

  // ── WebSocket: recibe nuevos pedidos y cambios de estado ─────────────────
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'new_order') {
      toast(
        (t) => (
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-bold text-gray-900">Nuevo pedido</p>
              <p className="text-sm text-gray-600">{msg.data.client_name} • Bs. {msg.data.subtotal}</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} className="text-gray-400 text-lg">✕</button>
          </div>
        ),
        { duration: 8000, style: { background: '#fff7ed', border: '1px solid #fb923c' } }
      )
      setOrders((prev) => {
        const exists = prev.find((o) => o.id === msg.data.id)
        return exists ? prev : [msg.data, ...prev]
      })
    }
    if (msg.type === 'order_status_changed') {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === msg.data.id ? { ...o, status: msg.data.status, status_display: msg.data.status_display } : o
        )
      )
    }
  }, [])

  useOrdersWebSocket(handleWsMessage, true)

  useEffect(() => { loadOrders() }, [showAll])
  useEffect(() => { if (tab === 'products') loadProducts() }, [tab])

  const loadOrders = async () => {
    try { const { data } = await getOwnerOrders(showAll); setOrders(data) }
    catch { toast.error('Error al cargar pedidos') }
  }

  const loadProducts = async () => {
    try { const { data } = await getMyProducts(); setProducts(data) }
    catch { toast.error('Error al cargar productos') }
  }

  const handleStartPrep = async (id) => {
    try { await startPreparation(id); toast.success('En preparación 👨‍🍳'); loadOrders() }
    catch (e) { toast.error(e.response?.data?.detail ?? 'Error') }
  }

  const handleHandOver = async (id) => {
    try { await handToDelivery(id); toast.success('Entregado al repartidor 🛵'); loadOrders() }
    catch (e) { toast.error(e.response?.data?.detail ?? 'Error') }
  }

  const handleToggle = async (id) => {
    try {
      const { data } = await toggleAvailability(id)
      setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, is_available: data.is_available } : p)))
    } catch { toast.error('Error al cambiar disponibilidad') }
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData()
    Object.entries(productForm).forEach(([k, v]) => {
      if (k === 'image' && v instanceof File) fd.append(k, v)
      else if (k !== 'image') fd.append(k, v)
    })
    try {
      if (productModal === 'create') { await createProduct(fd); toast.success('Producto creado') }
      else { await updateProduct(productModal.id, fd); toast.success('Producto actualizado') }
      setProductModal(null); loadProducts()
    } catch { toast.error('Error al guardar') } finally { setSaving(false) }
  }

  const bizName = profile?.business?.name ?? 'Mi Negocio'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-start">
          <div>
            <p className="text-xs text-orange-500 font-medium">Panel del Negocio</p>
            <h1 className="font-extrabold text-gray-900 text-xl">{bizName}</h1>
            <p className="text-xs text-gray-400">Hola, {user?.first_name}</p>
          </div>
          {/* Botón de notificaciones push */}
          {push.isSupported && (
            <button
              onClick={push.subscribed ? push.unsubscribe : push.subscribe}
              disabled={push.loading}
              title={push.subscribed ? 'Desactivar notificaciones' : 'Activar notificaciones push'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                push.subscribed
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{push.subscribed ? '🔔' : '🔕'}</span>
              {push.subscribed ? 'Notificaciones ON' : 'Activar notificaciones'}
            </button>
          )}
        </div>
      </header>

      <div className="bg-white border-b px-4">
        <div className="max-w-4xl mx-auto flex">
          {[['orders','📦 Pedidos'],['products','🍽️ Productos']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
              {key === 'orders' && orders.filter(o => o.status === 'pendiente').length > 0 && (
                <span className="ml-2 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full inline-flex items-center justify-center">
                  {orders.filter(o => o.status === 'pendiente').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* PEDIDOS */}
        {tab === 'orders' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">
                {showAll ? 'Historial completo' : `Pedidos activos (${orders.length})`}
              </h2>
              <button onClick={() => setShowAll(!showAll)} className="text-sm text-orange-500 hover:underline">
                {showAll ? 'Ver activos' : 'Ver historial'}
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-5xl mb-3">📭</p>
                <p className="font-medium">Sin pedidos {showAll ? '' : 'activos'} por ahora</p>
                <p className="text-xs mt-1">Los nuevos pedidos aparecerán aquí automáticamente</p>
              </div>
            ) : (
              orders.map((bo) => {
                const cfg = ORDER_STATUS_CONFIG[bo.status] ?? ORDER_STATUS_CONFIG.pendiente
                return (
                  <div key={bo.id} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 transition-all ${
                    bo.status === 'pendiente' ? 'border-orange-400 shadow-orange-100' :
                    bo.status === 'en_preparacion' ? 'border-yellow-400' : 'border-blue-300'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-gray-900">Sub-pedido #{bo.id}</p>
                        <p className="text-xs text-gray-400">{new Date(bo.order_created_at).toLocaleString('es-BO')}</p>
                      </div>
                      <div className="text-right">
                        <Badge color={cfg.color}>{cfg.label}</Badge>
                        <p className="font-bold text-gray-900 text-sm mt-1">Bs. {Number(bo.subtotal).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-3 space-y-0.5">
                      <p>👤 {bo.client_name} • 📞 {bo.client_phone}</p>
                      <p>📍 {bo.delivery_address}</p>
                      {bo.notes && <p>📝 {bo.notes}</p>}
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1">
                      {bo.items?.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">{item.quantity}x {item.product_name}</span>
                          <span className="text-gray-500">Bs. {Number(item.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {bo.status === 'pendiente' && (
                        <Button size="sm" variant="secondary" onClick={() => handleStartPrep(bo.id)} className="flex-1">
                          👨‍🍳 Iniciar preparación
                        </Button>
                      )}
                      {bo.status === 'en_preparacion' && (
                        <Button size="sm" variant="green" onClick={() => handleHandOver(bo.id)} className="flex-1">
                          🛵 Entregar al repartidor
                        </Button>
                      )}
                      {bo.handed_at && (
                        <p className="text-xs text-gray-400 self-center">
                          Entregado: {new Date(bo.handed_at).toLocaleTimeString('es-BO')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* PRODUCTOS */}
        {tab === 'products' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-900">Mis productos ({products.length})</h2>
              <Button size="sm" onClick={() => { setProductForm({ name:'',description:'',price:'',stock:0,is_available:true,is_featured:false }); setProductModal('create') }}>
                + Nuevo producto
              </Button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">🍽️</p><p>Aún no tienes productos</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map((p) => (
                  <div key={p.id} className={`bg-white rounded-2xl p-4 shadow-sm flex gap-3 ${!p.is_available ? 'opacity-60' : ''}`}>
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                      {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : '🍽️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 mb-1">Bs. {Number(p.price).toFixed(2)} • Stock: {p.stock}</p>
                      <button onClick={() => handleToggle(p.id)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${p.is_available ? 'bg-green-500' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${p.is_available ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { setProductForm({...p}); setProductModal(p) }} className="text-xs text-blue-500 hover:underline">Editar</button>
                      <button onClick={async () => { if(confirm('¿Eliminar?')) { await deleteProduct(p.id); loadProducts() }}} className="text-xs text-red-400 hover:underline">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Modal open={!!productModal} onClose={() => setProductModal(null)} title={productModal === 'create' ? 'Nuevo producto' : 'Editar producto'}>
        <form onSubmit={handleSaveProduct} className="flex flex-col gap-3">
          <Input label="Nombre" value={productForm.name ?? ''} onChange={(e) => setProductForm({...productForm, name: e.target.value})} required />
          <Input label="Descripción" value={productForm.description ?? ''} onChange={(e) => setProductForm({...productForm, description: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Precio (Bs.)" type="number" step="0.01" value={productForm.price ?? ''} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required />
            <Input label="Stock" type="number" value={productForm.stock ?? 0} onChange={(e) => setProductForm({...productForm, stock: e.target.value})} />
          </div>
          <input type="file" accept="image/*" className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium w-full" onChange={(e) => setProductForm({...productForm, image: e.target.files[0]})} />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={productForm.is_featured ?? false} onChange={(e) => setProductForm({...productForm, is_featured: e.target.checked})} className="accent-orange-500" />
              <span className="text-sm">Oferta destacada</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={productForm.is_available ?? true} onChange={(e) => setProductForm({...productForm, is_available: e.target.checked})} className="accent-green-500" />
              <span className="text-sm">Disponible</span>
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setProductModal(null)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
