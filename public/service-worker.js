const CACHE_NAME = 'medik-v2'
const CORE = ['/manifest.webmanifest', '/favicon.svg']

// Activate immediately on update so stale shells can't linger across deploys.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Only intercept same-origin http(s) GET requests. Everything else
  // (chrome-extension://, POST /api/*, cross-origin) passes through untouched.
  let url = null
  try { url = new URL(request.url) } catch { return }
  if (request.method !== 'GET') return
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // App shell: network-first so new deploys take effect immediately.
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/app' || url.pathname.startsWith('/app/')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() => caches.match(request).then((cached) => cached ?? caches.match('/'))),
    )
    return
  }

  // Versioned static assets: cache-first (filenames are content-hashed).
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
      }
      return response
    })),
  )
})
