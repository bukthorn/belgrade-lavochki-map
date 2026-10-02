// Network first, cache as an offline fallback: a fresh deploy is always
// picked up, and the app shell still opens without a connection.
// Only same-origin files are cached; Supabase and map tiles go straight
// to the network.

// v2: v1 kept every deployed bundle forever; changing the name makes
// 'activate' delete that cache
const CACHE_NAME = 'lavochki-v2'

// Vite names bundles "name-<8-char hash>.ext", e.g. assets/index-B1aCd3eF.js.
// Returns "index.js" for that, or null for files without a hash.
function bundleName(url) {
  const match = new URL(url).pathname.match(/\/assets\/(.+)-[\w-]{8}\.(\w+)$/)
  return match ? `${match[1]}.${match[2]}` : null
}

// Every deploy brings bundles with new hashes; the previous build's copy
// of the same bundle is dropped so the cache doesn't grow with each deploy
async function putInCache(request, response) {
  const cache = await caches.open(CACHE_NAME)
  const name = bundleName(request.url)

  if (name) {
    const keys = await cache.keys()
    const stale = keys.filter(
      (key) => key.url !== request.url && bundleName(key.url) === name,
    )
    await Promise.all(stale.map((key) => cache.delete(key)))
  }

  await cache.put(request, response)
}

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
          event.waitUntil(putInCache(request, response.clone()))
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
