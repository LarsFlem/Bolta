// Bolt Browser service worker — network-first for the page, cache-first for static assets
const CACHE = "bolter-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-maskable.svg",
  "./logo-mark.jpg",
  "./logo-text.png",
];

self.addEventListener("install", e => {
  // cache: "reload" bypasses the HTTP cache (GitHub Pages sends max-age=600),
  // so a new cache version never gets filled with a stale index.html
  e.waitUntil(caches.open(CACHE).then(c =>
    c.addAll(ASSETS.map(url => new Request(url, { cache: "reload" })))
  ));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function putInCache(req, resp) {
  if (resp && resp.ok && new URL(req.url).origin === location.origin) {
    const clone = resp.clone();
    caches.open(CACHE).then(c => c.put(req, clone));
  }
  return resp;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // The page itself: always try the network first so updates show up at once;
  // fall back to the cached copy when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then(resp => putInCache(req, resp))
        .catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // Static assets (icons, logos, manifest): cache-first
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => putInCache(req, resp)))
  );
});
