// Network first, cache as an offline fallback: a fresh deploy is always
// picked up, and the app shell still opens without a connection.
// Only same-origin files are cached; Supabase and map tiles go straight
// to the network.

const CACHE_NAME = 'lavochki-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }

        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached

        // Offline start from the home screen: serve the cached page
        if (request.mode === 'navigate') {
          const page = await caches.match(self.registration.scope)
          if (page) return page
        }

        return Response.error()
      }),
  )
})
