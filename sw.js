/* Service worker: the game is a fixed set of files with no backend, so it is
   cached whole on install and served from the cache thereafter. That makes it
   work offline and start instantly once installed.

   Bump CACHE when the files change; the old cache is deleted on activate. */
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
      .then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {}))))
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
      if (hit) return hit;
      return fetch(req).then(res => {
        // Cache anything new we fetch, so a partial install still fills in.
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
