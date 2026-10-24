// Offline shell for Minum Air. Weather calls go straight to the network.
const CACHE = 'minum-air-v51';
const SHELL = ['/', '/styles.css?v=51', '/meowie.js?v=51', '/i18n.js?v=51', '/app.js?v=51', '/manifest.webmanifest', '/sound.js?v=51', '/favicon.png', '/icon-192.png', '/meowie-photo.jpg', '/meowie-avatar.jpg',
  '/meowie-sit.webp', '/meowie-pet.webp', '/meowie-swim.webp?v=3', '/meowie-peek.webp', '/meowie-turn.webp', '/meowie-full.webp?v=2', '/meowie-fullb.webp?v=2', '/meowie-fullc.webp', '/meowie-drink-mask.webp', '/meowie-drink-fg.webp?v=2', '/bg-reef.webp', '/bg-pool.webp', '/bg-reef-s.webp', '/bg-pool-s.webp',
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

// Lock-screen reminders from the server (pace-based, see api/push-cron.js).
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  const av = String(d.av || 1).padStart(2, '0');
  e.waitUntil(self.registration.showNotification(d.title || 'Meowie 🦈', {
    body: d.body || '', icon: `/av/${av}.jpg`, badge: '/icon-192.png?v=51', tag: d.tag || 'minum', renotify: true, data: { url: '/' },
  }));
});

// Tapping a reminder opens the app (or brings it forward if it's already open).
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => new URL(c.url).origin === location.origin);
    return open ? open.focus() : self.clients.openWindow('/');
  }));
});
