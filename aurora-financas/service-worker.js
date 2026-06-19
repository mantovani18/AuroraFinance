/* =========================================================
   service-worker.js
   Habilita funcionamento 100% offline do Aurora Finanças.
   Estratégia:
   - App shell (HTML/CSS/JS/ícones): cache-first, com
     atualização em segundo plano (stale-while-revalidate).
   - Bibliotecas externas (Chart.js, jsPDF, fontes): cache
     em runtime, servidas do cache quando offline.
   - Nenhum dado do usuário passa pelo Service Worker —
     tudo fica em IndexedDB/localStorage no próprio dispositivo.
   ========================================================= */

const CACHE_VERSION = "aurora-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/storage.js",
  "./js/finance.js",
  "./js/chat.js",
  "./js/dashboard.js",
  "./js/tasks.js",
  "./js/studies.js",
  "./js/export.js",
  "./js/pwa.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

/* ---------- INSTALL ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("aurora-") && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ---------- FETCH ---------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // App shell: cache-first + atualização silenciosa
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              caches.open(STATIC_CACHE).then((cache) => cache.put(req, res.clone()));
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  } else {
    // Recursos externos (CDN de libs, fontes): stale-while-revalidate
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
