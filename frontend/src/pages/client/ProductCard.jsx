import Button from '../../components/ui/Button'

export default function ProductCard({ product, onAddToCart, onBuyNow, featured }) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${featured ? 'ring-2 ring-orange-300' : ''}`}>
      {featured && (
        <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 text-center">
          🔥 OFERTA
        </span>
      )}
      <div className="bg-gray-100 h-40 flex items-center justify-center overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl">
            {product.business_name?.toLowerCase().includes('farmacia') ? '💊' :
             product.business_name?.toLowerCase().includes('encomienda') ? '📦' : '🍽️'}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1 gap-2">
        <div>
          <p className="text-xs text-orange-500 font-medium truncate">{product.business_name}</p>
          <h3 className="font-bold text-gray-900 text-sm leading-tight">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{product.description}</p>
          )}
        </div>

        <div className="mt-auto">
          <p className="text-lg font-extrabold text-gray-900 mb-2">
            Bs. {Number(product.price).toFixed(2)}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={onAddToCart}
            >
              + Carrito
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={onBuyNow}
            >
              Pedir ya
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
