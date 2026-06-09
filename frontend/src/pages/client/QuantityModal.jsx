import { useState, useEffect } from 'react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

export default function QuantityModal({ product, open, onClose, onConfirm, action }) {
  const [quantity, setQuantity] = useState(1)

  useEffect(() => { if (open) setQuantity(1) }, [open])

  if (!product) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={action === 'now' ? '⚡ Pedir ahora' : '🛒 Añadir al carrito'}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
          <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-xl" />
            ) : '🍽️'}
          </div>
          <div>
            <p className="text-xs text-orange-500 font-medium">{product.business_name}</p>
            <p className="font-bold text-gray-900">{product.name}</p>
            <p className="text-sm text-gray-500">Bs. {Number(product.price).toFixed(2)} c/u</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3 text-center">
            ¿Cuántas unidades deseas?
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-xl flex items-center justify-center transition-colors"
            >
              −
            </button>
            <span className="text-3xl font-extrabold text-gray-900 w-16 text-center tabular-nums">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-full bg-orange-100 hover:bg-orange-200 font-bold text-xl flex items-center justify-center transition-colors text-orange-600"
            >
              +
            </button>
          </div>
          <p className="text-center text-sm text-gray-400 mt-2">
            Subtotal: <span className="font-bold text-gray-700">Bs. {(Number(product.price) * quantity).toFixed(2)}</span>
          </p>
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={() => onConfirm(quantity)}
        >
          {action === 'now' ? '⚡ Confirmar pedido' : '🛒 Añadir al carrito'}
        </Button>
      </div>
    </Modal>
  )
}
