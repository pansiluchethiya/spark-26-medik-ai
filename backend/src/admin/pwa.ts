// PWA shell for the admin dashboard (public files — no auth needed,
// they contain no sensitive data). Installable via PWABuilder / browsers.
export function adminManifest() {
  return {
    name: 'Medik Admin',
    short_name: 'Medik',
    description: 'Monitoring dashboard for the Medik AI backend.',
    start_url: '/admin',
    scope: '/admin/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0e1513',
    theme_color: '#0e1513',
    icons: [
      { src: '/admin/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/admin/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/admin/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

export function adminServiceWorker(): string {
  return `const CACHE = 'medik-admin-v1';
const CORE = ['/admin/manifest.webmanifest', '/admin/icon-192.png', '/admin/icon-512.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
const OFFLINE = '<!DOCTYPE html><html><head><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>Medik Admin — offline</title></head><body style=\"margin:0;display:grid;place-items:center;min-height:100vh;background:#0e1513;color:#e8f0ee;font-family:system-ui,sans-serif\"><p>Medik Admin is offline. Reconnect to resume monitoring.</p></body></html>';
self.addEventListener('fetch', (event) => {
  const { request } = event;
  let url = null;
  try { url = new URL(request.url); } catch { return; }
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/admin/')) return;
  // Stats are live-only; never serve them stale.
  if (url.pathname === '/admin/api/stats') {
    event.respondWith(fetch(request));
    return;
  }
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
    }).catch(() => caches.match(request).then((cached) => cached ?? new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))),
  );
});
`
}
