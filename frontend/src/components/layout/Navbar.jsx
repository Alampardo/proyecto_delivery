import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../stores/useAuthStore'
import useCartStore from '../../stores/useCartStore'
import { logout as apiLogout } from '../../api/auth'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { label: 'Restaurantes', value: 'restaurante', emoji: '🍔' },
  { label: 'Farmacias',    value: 'farmacia',    emoji: '💊' },
  { label: 'Encomiendas',  value: 'encomienda',  emoji: '📦' },
]

export default function Navbar({ onCategorySelect, activeCategory }) {
  const { user, clearAuth } = useAuthStore()
  const items = useCartStore((s) => s.items)
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await apiLogout() } catch (_) {}
    clearAuth()
    navigate('/login')
    toast.success('Sesión cerrada')
  }

  const dashboardPath =
    user?.role === 'admin'    ? '/admin' :
    user?.role === 'delivery' ? '/delivery' :
    user?.role === 'owner'    ? '/owner' : null

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🛵</span>
            <span className="font-extrabold text-xl text-orange-500">DeliveryApp</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Carrito — solo para clientes/público */}
            {(!user || user.role === 'client') && (
              <Link
                to="/cart"
                className="relative p-2 rounded-xl hover:bg-orange-50 transition-colors"
              >
                <span className="text-xl">🛒</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                {dashboardPath && (
                  <Link
                    to={dashboardPath}
                    className="text-sm font-medium text-gray-700 hover:text-orange-500 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    Mi panel
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Salir
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>

        {/* Categorías — solo en la vista pública */}
        {(!user || user.role === 'client') && (
          <nav className="flex gap-1 pb-3 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => onCategorySelect?.(cat.value === activeCategory ? null : cat.value)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                  ${activeCategory === cat.value
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                    : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                  }
                `}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
