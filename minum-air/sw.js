// Offline shell for Minum Air. Weather calls go straight to the network.
const CACHE = 'minum-air-v44';
const SHELL = ['/', '/styles.css?v=44', '/meowie.js?v=44', '/i18n.js?v=44', '/app.js?v=44', '/manifest.webmanifest', '/sound.js?v=44', '/favicon.png', '/icon-192.png', '/meowie-photo.jpg', '/meowie-avatar.jpg',
  '/meowie-sit.webp', '/meowie-pet.webp', '/meowie-swim.webp?v=2', '/meowie-peek.webp', '/meowie-turn.webp', '/meowie-drink-mask.webp', '/bg-reef.webp', '/bg-pool.webp', '/bg-reef-s.webp', '/bg-pool-s.webp',
  ...Array.from({ length: 16 }, (_, i) => `/av/${String(i + 1).padStart(2, '0')}.jpg`)];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // The leaderboard is always live; never answer it from the cache.
  if (url.pathname.startsWith('/api/')) return;
  // Audio streams with range requests; leave those to the browser's own cache.
  if (e.request.headers.has('range')) return;
  // Network first so updates land quickly; cache as offline fallback.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/')))
  );
});
