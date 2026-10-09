const CACHE = 'deju-shell-v2'
// The Vite dev server serves unhashed modules that must never come from cache.
const DEV = ['localhost', '127.0.0.1'].includes(self.location.hostname)

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon.svg'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Hashed build assets never change: serve them straight from cache.
// Everything else (the app shell, icons) is stale-while-revalidate so the app
// opens instantly and picks up a new deploy on the next launch.
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (DEV || request.method !== 'GET' || url.origin !== self.location.origin) return

  // Every route is served the same SPA shell, so they share one cache entry.
  const key = request.mode === 'navigate' ? '/' : request
  const fetchAndCache = () =>
    fetch(request).then(async (res) => {
      if (res.ok) await (await caches.open(CACHE)).put(key, res.clone())
      return res
    })

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request).then((hit) => hit ?? fetchAndCache()))
    return
  }

  const network = fetchAndCache()
  event.waitUntil(network.catch(() => {}))
  event.respondWith(
    caches
      .match(key)
      .then((hit) => hit ?? network),
  )
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Deju', {
      body: data.body,
      tag: data.tag,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => 'focus' in c)
      if (client) {
        client.navigate(url)
        return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
