// Offline shell for Minum Air. Weather calls go straight to the network.
const CACHE = 'minum-air-v21';
const SHELL = ['/', '/styles.css', '/meowie.js', '/i18n.js', '/app.js', '/manifest.webmanifest', '/sound.js', '/favicon.png', '/icon-192.png', '/meowie-photo.jpg', '/meowie-avatar.jpg',
  '/meowie-idle.webp', '/meowie-pet.webp', '/meowie-happy.webp', '/meowie-swim.webp', '/meowie-peek.webp', '/meowie-turn.webp', '/meowie-drink-mask.webp'];

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
