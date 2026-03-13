/**
 * Luna HRM Service Worker
 * Cache-first for static assets only.
 * Network-first for all other requests (including /api/*).
 * Salary/payslip data is sensitive — NEVER cached.
 */

const CACHE_NAME = 'luna-hrm-static-v1'

// Static asset extensions to cache
const STATIC_EXTENSIONS = ['.js', '.css', '.woff', '.woff2', '.ttf', '.ico', '.png', '.svg', '.webp']

function isStaticAsset(url) {
  const pathname = new URL(url).pathname
  // Never cache API routes — salary data is sensitive
  if (pathname.startsWith('/api/')) return false
  // Never cache Next.js server-rendered pages
  if (pathname.startsWith('/_next/data/')) return false
  // Cache static build assets (_next/static/)
  if (pathname.startsWith('/_next/static/')) return true
  // Cache known static file extensions in /public
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))
}

// Install: skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate: claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch: cache-first for static assets, network-first for everything else
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET requests
  if (request.method !== 'GET') return

  if (isStaticAsset(request.url)) {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
  }
  // All other requests (pages, API) use default network behavior
})
