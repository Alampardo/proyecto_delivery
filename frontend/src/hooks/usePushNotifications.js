import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(Notification.permission)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading]       = useState(false)

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window

  useEffect(() => {
    if (!isSupported || import.meta.env.DEV) return
    // Registra el Service Worker (solo en producción: en dev interfiere con el HMR de Vite)
    navigator.serviceWorker.register('/sw.js').catch(() => {})
    // Verifica si ya hay una suscripción activa
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    )
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)
      if (permission !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subJson = sub.toJSON()
      await api.post('/push/subscribe/', {
        endpoint: subJson.endpoint,
        keys:     subJson.keys,
      })
      setSubscribed(true)
    } catch (err) {
      console.error('Error al suscribirse a notificaciones:', err)
    } finally {
      setLoading(false)
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.delete('/push/unsubscribe/', { data: { endpoint: sub.endpoint } })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [])

  return { isSupported, permission, subscribed, loading, subscribe, unsubscribe }
}
