// FitNote service worker.
// - Never caches /api/* (personal data stays out of the cache, and is always fresh).
// - Navigations: network first, fall back to the cached app shell, then the offline page.
// - Hashed build assets: cache first (they are immutable).
const CACHE_NAME = "fitnote-shell-v3"
const SHELL_ASSETS = ["/", "/offline.html", "/manifest.webmanifest", "/icon.svg", "/icon-192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put("/", copy))
          }
          return response
        })
        .catch(async () => (await caches.match("/")) ?? caches.match("/offline.html")),
    )
    return
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
    return
  }

  event.respondWith(fetch(request).catch(async () => (await caches.match(request)) ?? Response.error()))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients[0]
      return client ? client.focus() : self.clients.openWindow("/")
    }),
  )
})
