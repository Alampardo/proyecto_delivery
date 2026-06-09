import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import useCartStore from '../../stores/useCartStore'
import useAuthStore from '../../stores/useAuthStore'
import Navbar from '../../components/layout/Navbar'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const ADMIN_WHATSAPP = import.meta.env.VITE_ADMIN_WHATSAPP ?? '591XXXXXXXXX'

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, buildWhatsAppMessage } = useCartStore()
  const { user } = useAuthStore()
  const [form, setForm]   = useState({
    name:    user ? `${user.first_name} ${user.last_name}` : '',
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

  const handleCheckout = () => {
    if (!form.name.trim() || !form.address.trim()) {
      toast.error('Completa tu nombre y dirección de entrega')
      return
    }
    const message = buildWhatsAppMessage(form.name, form.address)
    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    clearCart()
    toast.success('¡Pedido enviado por WhatsApp!')
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
                  label="Dirección de entrega"
                  placeholder="Calle, zona, referencia..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Subtotal</span>
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
                onClick={handleCheckout}
              >
                <span className="text-lg">📲</span>
                Enviar pedido por WhatsApp
              </Button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Se abrirá WhatsApp con tu pedido listo
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
