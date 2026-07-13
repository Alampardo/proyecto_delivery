/* Service Worker — DeliveryApp (PWA + Push Notifications) */

const CACHE_NAME = 'delivery-app-v1'
const SHELL = ['/', '/index.html', '/manifest.json']

// ── Instalación: pre-cachea el shell de la app ────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  )
  self.skipWaiting()
})

// ── Activación: elimina cachés viejas ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: estrategia por tipo de recurso ────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API y WebSocket → siempre red (nunca cachear datos dinámicos)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) return

  // Archivos de media (imágenes subidas) → red con fallback
  if (url.pathname.startsWith('/media/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
    return
  }

  // Assets estáticos (JS, CSS, SVG, fonts) → Cache First
  if (
    request.destination === 'script' ||
    request.destination === 'style'  ||
    request.destination === 'image'  ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) return response
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // Navegación (HTML) → Network First con fallback a / para SPA
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match('/'))
    )
    return
  }
})

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'DeliveryApp', body: event.data.text() }
  }

  const options = {
    body:    payload.body  ?? '',
    icon:    payload.icon  ?? '/icons/icon-192.svg',
    badge:   '/icons/icon-192.svg',
    vibrate: [200, 100, 200],
    data:    payload.data  ?? {},
    actions: [
      { action: 'open',  title: '👀 Ver pedido' },
      { action: 'close', title: 'Cerrar' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Nuevo pedido', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'close') return

  const url = event.notification.data?.url ?? '/owner'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url) && 'focus' in c)
      return existing ? existing.focus() : self.clients.openWindow(url)
    })
  )
})
