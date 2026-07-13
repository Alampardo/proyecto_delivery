import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../../api/auth'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <span className="text-5xl">🔑</span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-3">Olvidé mi contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">
            Te enviaremos un enlace para crear una nueva
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
              <p className="text-4xl mb-3">📧</p>
              <p className="font-bold text-green-800 mb-1">¡Email enviado!</p>
              <p className="text-sm text-green-700">
                Revisa tu bandeja de entrada en <strong>{email}</strong>.
                El enlace expira en 1 hora.
              </p>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              ¿No llegó? Revisa spam o{' '}
              <button
                onClick={() => setSent(false)}
                className="text-orange-500 font-semibold hover:underline"
              >
                intenta de nuevo
              </button>
            </p>
            <Link to="/login">
              <Button variant="secondary" className="w-full">Volver al login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Enviar enlace de recuperación
            </Button>

            <div className="text-center text-sm text-gray-500">
              <Link to="/login" className="text-orange-500 font-semibold hover:underline">
                ← Volver al login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
