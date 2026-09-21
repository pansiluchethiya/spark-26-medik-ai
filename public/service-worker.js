const CACHE_NAME = 'medik-v1'
const ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))))
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
    return
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
      if (response.ok && event.request.method === 'GET') {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
      }
      return response
    }).catch(() => caches.match('/')))
  )
})
