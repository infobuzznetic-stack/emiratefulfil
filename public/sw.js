// EmirateFulfil service worker
// Caches the app shell (JS/CSS/fonts/images) so the app loads instantly
// and can install as a PWA. Supabase API calls always go straight to the
// network — seller/order data must stay live, never served from cache.

const CACHE_NAME = "emiratefulfil-v1";
const APP_SHELL = ["/", "/site.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache Supabase (auth/data must always be live).
  if (url.hostname.includes("supabase.co")) return;

  // Only handle same-origin GET requests.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Navigation requests: try network first, fall back to cached shell
  // (so the installed app still shows something if opened offline).
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/"))
    );
    return;
  }

  // Static assets (JS/CSS/images/fonts): cache-first, update in background.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
