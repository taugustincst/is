/* Service worker: the game is a fixed set of files with no backend, so each
   build is cached whole and served from that cache thereafter. That makes it
   work offline and start instantly once installed.

   Every build has its own cache, named by a hash of its files that
   tools/stamp.js writes into VERSION below (tools/regress.js fails if the
   stamp is stale). A new build is fetched in full before it is used and the
   old cache is deleted only when the new one is complete, so a player never
   runs half of one build and half of another. The page is told when a new
   build is waiting and asks before switching to it. */
const VERSION = 'fc685037d5';
const CACHE = 'elderon-' + VERSION;

const ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/audio.js',
  'js/data.js',
  'js/maps.js',
  'js/story.js',
  'js/color.js',
  'js/sprites.js',
  'js/unit.js',
  'js/map.js',
  'js/battle.js',
  'js/fx.js',
  'js/render.js',
  'js/ui.js',
  'js/game.js',
  'icons/icon-64.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

// The whole build, or nothing: one file failing fails the install, and the
// worker that is already serving keeps serving until the next attempt.
// `reload` bypasses the HTTP cache, so a stale copy there cannot be baked in.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(new Request(a, { cache: 'reload' })))))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page asks for the switch once the player has agreed to it.
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Looked up in this worker's own cache, never the global CacheStorage:
  // caches.match() searches every cache that exists, and while a new build
  // is staged its cache sits right alongside this one under a different
  // name. The global lookup can hand an old, still-active worker a file
  // from the new build before the player has agreed to it, breaking the
  // one guarantee this file exists for.
  e.respondWith(
    caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true })).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        // Something outside the build (a screenshot, a store page): pass it
        // through and keep a copy for next time.
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy)));
        }
        return res;
      }).catch(() => {
        // Offline with nothing cached: a page can fall back to the game's own
        // page, but a script or image must fail honestly rather than arrive
        // as HTML with a 200.
        if (req.mode === 'navigate') return caches.open(CACHE).then(c => c.match('index.html'));
        return new Response('', { status: 504, statusText: 'Offline and not cached' });
      });
    })
  );
});
