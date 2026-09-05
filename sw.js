/* Service worker: the game is a fixed set of files with no backend, so it is
   cached whole on install and served from the cache thereafter. That makes it
   work offline and start instantly once installed.

   Updates do not depend on anyone remembering to bump a version. The cache is
   served immediately and refreshed behind the request, so a player who is
   online gets the current files on their next launch. A cache-first worker
   with a hand-maintained version freezes whoever installed it on whatever
   shipped that day, which is exactly what happened twice here. */
const CACHE = 'elderon-v1';

const ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/audio.js',
  'js/data.js',
  'js/sprites.js',
  'js/unit.js',
  'js/map.js',
  'js/battle.js',
  'js/render.js',
  'js/ui.js',
  'js/game.js',
  'icons/icon-64.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll fails the whole install if any one file 404s, so add them
      // individually and let the fetch handler fall back for stragglers.
      // `reload` bypasses the HTTP cache, so a stale copy there cannot be
      // baked into a fresh install.
      .then(c => Promise.all(ASSETS.map(a =>
        c.add(new Request(a, { cache: 'reload' })).catch(() => c.add(a).catch(() => {})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      // Always ask the network as well, and store what comes back. When the
      // cache has a copy it is served straight away and the refresh happens
      // behind the request, so the page stays instant and offline-proof while
      // still picking up a new build on the following load.
      // Revalidate against the server rather than the browser's own HTTP
      // cache, which would otherwise hand back the same stale bytes.
      const probe = hit ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : req;
      const fresh = fetch(probe).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit || caches.match('index.html'));

      if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
      return fresh;
    })
  );
});
