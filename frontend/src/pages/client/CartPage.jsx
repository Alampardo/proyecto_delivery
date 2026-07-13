import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import useCartStore from '../../stores/useCartStore'
import useAuthStore from '../../stores/useAuthStore'
import { createOrder } from '../../api/orders'
import { getPublicPricing } from '../../api/pricing'
import Navbar from '../../components/layout/Navbar'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

const ADMIN_WHATSAPP = import.meta.env.VITE_ADMIN_WHATSAPP ?? '591XXXXXXXXX'

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, buildWhatsAppMessage } = useCartStore()
  const { user } = useAuthStore()
  const [form, setForm]   = useState({
    name:    user ? `${user.first_name} ${user.last_name}` : '',
    phone:   user?.phone ?? '',
    address: '',
  })

  const total = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0)

  // Agrupa los ítems por negocio para mostrarlos organizados
  const byBusiness = items.reduce((acc, item) => {
    const key = item.product.business_name ?? 'Sin negocio'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const [checkoutOpen, setCheckoutOpen]       = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [pricing, setPricing]                 = useState(null)
  const [selectedRing, setSelectedRing]       = useState(null)
  const [paymentMethod, setPaymentMethod]     = useState('efectivo')

  useEffect(() => {
    getPublicPricing()
      .then(({ data }) => { setPricing(data); if (data.rings?.length) setSelectedRing(data.rings[0].id) })
      .catch(() => {})
  }, [])

  const ringObj = pricing?.rings.find((r) => r.id === selectedRing)
  const shippingCost = ringObj
    ? Number(ringObj.price)
      + (pricing.is_rainy_day ? Number(pricing.rain_surcharge) : 0)
      + (pricing.is_holiday ? Number(pricing.holiday_surcharge) : 0)
      + (pricing.is_night_now ? Number(pricing.night_surcharge) : 0)
    : 0
  const grandTotal = total + shippingCost

  const openCheckout = () => {
    if (!form.name.trim() || !form.address.trim()) {
      toast.error('Completa tu nombre y dirección de entrega')
      return
    }
    setCheckoutOpen(true)
  }

  const handleCheckout = async () => {
    if (!selectedRing) {
      toast.error('Selecciona el anillo de tu zona')
      return
    }
    setCheckoutLoading(true)
    try {
      const payload = {
        client_name:      form.name.trim(),
        client_phone:     form.phone.trim(),
        delivery_address: form.address.trim(),
        ring:             selectedRing,
        payment_method:   paymentMethod,
        items: items.map((i) => ({ product: i.product.id, quantity: i.quantity })),
      }
      const { data: order } = await createOrder(payload)
      const message = buildWhatsAppMessage(form.name, form.address, order.id, order.shipping_cost, order.grand_total)
      const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`
      window.open(url, '_blank')
      clearCart()
      setCheckoutOpen(false)
      toast.success(`Pedido #${order.id} registrado. ¡Abriendo WhatsApp!`)
    } catch (err) {
      const apiMsg = err.response?.data?.detail
        ?? Object.values(err.response?.data ?? {}).flat()[0]
      toast.error(apiMsg ?? `Error ${err.response?.status ?? 'de red'}: no se pudo registrar el pedido.`, { duration: 6000 })
      console.error('[checkout]', err.response?.status, err.response?.data)
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center px-4">
          <span className="text-7xl">🛒</span>
          <h2 className="text-2xl font-bold text-gray-900">Tu carrito está vacío</h2>
          <p className="text-gray-500">Explora nuestros productos y añade lo que deseas</p>
          <Link to="/">
            <Button size="lg">Ver productos</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Tu carrito</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Lista de productos */}
          <div className="flex-1 flex flex-col gap-4">
            {Object.entries(byBusiness).map(([bizName, bizItems]) => (
              <div key={bizName} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
                  <p className="text-sm font-bold text-orange-700">{bizName}</p>
                </div>
                {bizItems.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                      {product.image
                        ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        : '🍽️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
                      <p className="text-xs text-gray-400">Bs. {Number(product.price).toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 font-bold flex items-center justify-center text-sm"
                      >−</button>
                      <span className="w-6 text-center font-bold text-sm tabular-nums">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="w-7 h-7 rounded-full bg-orange-100 hover:bg-orange-200 font-bold flex items-center justify-center text-sm text-orange-600"
                      >+</button>
                    </div>
                    <div className="text-right w-20">
                      <p className="font-bold text-sm text-gray-900">Bs. {(Number(product.price) * quantity).toFixed(2)}</p>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="text-xs text-red-400 hover:text-red-600 mt-0.5"
                      >Quitar</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Resumen y checkout */}
          <div className="lg:w-72 flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Datos de entrega</h3>
              <div className="flex flex-col gap-3">
                <Input
                  label="Tu nombre"
                  placeholder="Juan Pérez"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Input
                  label="Teléfono"
                  type="tel"
                  placeholder="70012345"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <Input
                  label="Dirección de entrega"
                  placeholder="Calle, zona, referencia..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Subtotal productos</span>
                <span>Bs. {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-gray-900 text-lg border-t pt-2">
                <span>Total</span>
                <span>Bs. {total.toFixed(2)}</span>
              </div>
              <Button
                size="lg"
                variant="green"
                className="w-full mt-4"
                onClick={openCheckout}
              >
                Continuar
              </Button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Elige tu zona de entrega y método de pago
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de checkout: anillo, clima/noche, pago */}
      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Confirmar pedido">
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          {!pricing ? (
            <p className="text-sm text-gray-400 text-center py-6">Cargando opciones de envío...</p>
          ) : (
            <>
              {/* Anillo */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Zona de entrega (anillo)</p>
                <div className="grid grid-cols-2 gap-2">
                  {pricing.rings.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRing(r.id)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        selectedRing === r.id
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                      }`}
                    >
                      Anillo {r.number} — Bs. {Number(r.price).toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avisos de recargo */}
              {(pricing.is_rainy_day || pricing.is_holiday || pricing.is_night_now) && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col gap-1.5">
                  {pricing.is_rainy_day && (
                    <p className="text-xs text-blue-700">☔ Recargo por lluvia activo (+Bs. {Number(pricing.rain_surcharge).toFixed(2)})</p>
                  )}
                  {pricing.is_holiday && (
                    <p className="text-xs text-blue-700">🎉 Recargo por feriado activo (+Bs. {Number(pricing.holiday_surcharge).toFixed(2)})</p>
                  )}
                  {pricing.is_night_now && (
                    <p className="text-xs text-blue-700">🌙 Recargo nocturno activo (+Bs. {Number(pricing.night_surcharge).toFixed(2)})</p>
                  )}
                </div>
              )}

              {/* Método de pago */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Método de pago</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{ key: 'efectivo', label: '💵 Efectivo' }, { key: 'qr', label: '📱 QR' }].map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setPaymentMethod(m.key)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        paymentMethod === m.key
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {paymentMethod === 'qr' && (
                  pricing.admin_qr_image ? (
                    <div className="mt-3 flex flex-col items-center bg-gray-50 rounded-xl p-3">
                      <img src={pricing.admin_qr_image} alt="QR de pago" className="w-48 h-48 object-contain rounded-lg" />
                      <p className="text-xs text-gray-500 mt-2">Escanea para pagar</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-2">El admin aún no subió su QR de pago.</p>
                  )
                )}
              </div>

              {/* Totales */}
              <div className="border-t pt-3 flex flex-col gap-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal productos</span>
                  <span>Bs. {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Envío</span>
                  <span>Bs. {shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-gray-900 text-lg border-t pt-2 mt-1">
                  <span>Total</span>
                  <span>Bs. {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button
                size="lg"
                variant="green"
                className="w-full"
                onClick={handleCheckout}
                loading={checkoutLoading}
              >
                <span className="text-lg">📲</span>
                Confirmar pedido
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
