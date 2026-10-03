// Label Log service worker: caches the app so it works offline.
// To push an update to installed copies, change VERSION below.
const VERSION = 'v1';
const CACHE = 'label-log-' + VERSION;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './vendor/fonts/archivo.woff2'];
const SCANNER = ['./vendor/tesseract.min.js', './vendor/worker.min.js', './vendor/core/tesseract-core-lstm.wasm.js', './vendor/core/tesseract-core-simd-lstm.wasm.js', './vendor/lang/eng.traineddata.gz'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    // Scanner files are large; cache them best-effort so a flaky connection can't block install.
    await Promise.all(SCANNER.map((u) => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('label-log-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') return caches.match('./index.html');
      throw err;
    }
  })());
});
