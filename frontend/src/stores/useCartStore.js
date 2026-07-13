import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],  // [{ product, quantity }]

      addItem: (product, quantity) => {
        const items = get().items
        const existing = items.find((i) => i.product.id === product.id)
        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          })
        } else {
          set({ items: [...items, { product, quantity }] })
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        })
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.product.id !== productId) }),

      clearCart: () => set({ items: [] }),

      get total() {
        return get().items.reduce(
          (sum, i) => sum + Number(i.product.price) * i.quantity,
          0
        )
      },

      get itemCount() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },

      // Construye el mensaje de WhatsApp con el resumen del carrito
      buildWhatsAppMessage: (clientName, address, orderId, shippingCost = 0, grandTotal = null) => {
        const items = get().items
        const lines = items.map(
          (i) =>
            `• ${i.quantity}x ${i.product.name} (${i.product.business_name}) — Bs. ${(Number(i.product.price) * i.quantity).toFixed(2)}`
        )
        const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0)
        const total = grandTotal !== null ? Number(grandTotal) : subtotal + Number(shippingCost)

        return [
          orderId ? `*NUEVO PEDIDO #${orderId}*` : '*NUEVO PEDIDO*',
          `Cliente: ${clientName}`,
          `Dirección: ${address}`,
          '',
          '*Productos:*',
          ...lines,
          '',
          `Subtotal: Bs. ${subtotal.toFixed(2)}`,
          `Envío: Bs. ${Number(shippingCost).toFixed(2)}`,
          `*Total: Bs. ${total.toFixed(2)}*`,
        ].join('\n')
      },
    }),
    { name: 'delivery-cart' }
  )
)

export default useCartStore
