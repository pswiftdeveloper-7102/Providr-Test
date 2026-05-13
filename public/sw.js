// Providr service worker — v1. Kept deliberately minimal: cache the app
// shell and static assets so the PWA installs and opens fast, but pass
// all data requests straight to the network. This avoids serving stale
// participant / incident / shift data offline (correctness > freshness
// in a clinical-compliance product).

const CACHE_NAME = "providr-v1";
const APP_SHELL = ["/", "/manifest.json", "/logo.webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only cache GET requests for static assets we control.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Static assets / Next.js bundles: network-first with cache fallback.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached ?? network;
      })
    );
    return;
  }

  // Everything else — let the browser handle it (network). Data and HTML
  // pages stay live; we don't want a stale cached incident list to mask
  // changes another teammate just made.
});