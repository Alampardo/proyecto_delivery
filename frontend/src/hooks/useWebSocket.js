import { useEffect, useRef, useCallback } from 'react'
import useAuthStore from '../stores/useAuthStore'

const WS_BASE = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/orders/`

/**
 * Hook para conectarse al WebSocket de pedidos.
 * @param {function} onMessage  Callback que recibe { type, data }
 * @param {boolean}  enabled    Si false, no conecta (ej. roles que no necesitan)
 */
export function useOrdersWebSocket(onMessage, enabled = true) {
  const token  = useAuthStore((s) => s.token)
  const wsRef  = useRef(null)
  const pingRef = useRef(null)

  const connect = useCallback(() => {
    if (!token || !enabled) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_BASE}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      // Ping cada 25s para mantener viva la conexión
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 25000)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type !== 'pong' && msg.type !== 'connected') {
          onMessage(msg)
        }
      } catch {}
    }

    ws.onclose = (e) => {
      clearInterval(pingRef.current)
      // Reconexión automática con backoff si no fue cierre intencional
      if (e.code !== 1000 && e.code !== 4001 && e.code !== 4002 && e.code !== 4003) {
        setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => ws.close()
  }, [token, enabled, onMessage])

  useEffect(() => {
    connect()
    return () => {
      clearInterval(pingRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null  // evita reconexión al desmontar
        wsRef.current.close(1000)
      }
    }
  }, [connect])
}
