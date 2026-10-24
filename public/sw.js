// Service worker: guarda la web y los catálogos para usarla sin conexión.
// Precarga lo que lista asset-manifest.json (lo genera Vite) y después sirve desde caché.

const VERSION = 'v1'
const CACHE = `painter-${VERSION}`
const CORE = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png',
  './images/the-painter-collection-claro.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(CORE)
      try {
        const manifest = await (await fetch('./asset-manifest.json', { cache: 'no-store' })).json()
        const files = new Set()
        for (const entry of Object.values(manifest)) {
          files.add(entry.file)
          for (const css of entry.css ?? []) files.add(css)
        }
        await cache.addAll([...files].map((f) => `./${f}`))
      } catch {
        // Sin manifiesto (modo desarrollo): se irá guardando lo que se visite
      }
      self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return

  // La página: primero la red (para recibir actualizaciones) y si falla, la copia guardada
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  // Recursos con hash en el nombre: caché primero
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
