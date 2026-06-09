import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getBusinesses } from '../../api/businesses'
import Navbar from '../../components/layout/Navbar'
import ProductCard from './ProductCard'
import QuantityModal from './QuantityModal'
import useCartStore from '../../stores/useCartStore'

export default function HomePage() {
  const [businesses, setBusinesses]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalAction, setModalAction]   = useState(null) // 'cart' | 'now'
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    loadBusinesses()
  }, [activeCategory])

  const loadBusinesses = async () => {
    setLoading(true)
    try {
      const { data } = await getBusinesses(activeCategory)
      setBusinesses(data)
    } catch {
      toast.error('No se pudo cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }

  const handleProductAction = (product, action) => {
    setSelectedProduct(product)
    setModalAction(action)
  }

  const handleQuantityConfirm = (quantity) => {
    if (!selectedProduct) return
    addItem(selectedProduct, quantity)
    toast.success(`${quantity}x ${selectedProduct.name} añadido al carrito`)
    setSelectedProduct(null)
    setModalAction(null)
    if (modalAction === 'now') {
      // Redirige directo al carrito
      window.location.href = '/cart'
    }
  }

  // Productos destacados de todos los negocios
  const featured = businesses.flatMap((b) =>
    (b.products ?? []).filter((p) => p.is_featured && p.is_available).map((p) => ({
      ...p,
      business_name: b.name,
    }))
  )

  const allProducts = businesses.flatMap((b) =>
    (b.products ?? []).filter((p) => p.is_available).map((p) => ({
      ...p,
      business_name: b.name,
    }))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        activeCategory={activeCategory}
        onCategorySelect={setActiveCategory}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Banner hero */}
        {!activeCategory && (
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 mb-8 text-white">
            <h1 className="text-3xl font-extrabold mb-2">
              Todo lo que necesitas, <br />a domicilio 🚀
            </h1>
            <p className="text-orange-100 text-sm">Restaurantes, farmacias y encomiendas en un solo lugar</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Ofertas destacadas */}
            {featured.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  🔥 Ofertas destacadas
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {featured.map((p) => (
                    <ProductCard
                      key={`feat-${p.id}`}
                      product={p}
                      onAddToCart={() => handleProductAction(p, 'cart')}
                      onBuyNow={() => handleProductAction(p, 'now')}
                      featured
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Todos los productos */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {activeCategory
                  ? { farmacia: '💊 Farmacias', restaurante: '🍔 Restaurantes', encomienda: '📦 Encomiendas' }[activeCategory]
                  : '🛍️ Todo el catálogo'}
              </h2>
              {allProducts.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-4xl mb-3">🔍</p>
                  <p>No hay productos disponibles en esta categoría</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {allProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAddToCart={() => handleProductAction(p, 'cart')}
                      onBuyNow={() => handleProductAction(p, 'now')}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Modal de cantidad */}
      <QuantityModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => { setSelectedProduct(null); setModalAction(null) }}
        onConfirm={handleQuantityConfirm}
        action={modalAction}
      />
    </div>
  )
}
