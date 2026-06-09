/* Service Worker — DeliveryApp Push Notifications */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

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
    icon:    payload.icon  ?? '/favicon.ico',
    badge:   payload.badge ?? '/favicon.ico',
    vibrate: [200, 100, 200],
    data:    payload.data  ?? {},
    actions: [
      { action: 'open', title: '👀 Ver pedido' },
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

  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url) && 'focus' in c)
      return existing ? existing.focus() : self.clients.openWindow(url)
    })
  )
})
