/* Service worker for Pantry Scan.

   The app's own files are cached on install and served cache-first, refreshed
   behind the request so an online user picks up new versions on their next
   launch without anyone bumping a version string.

   The text recogniser is different: Tesseract.js, its WebAssembly core and the
   English model live under vendor/ and total several megabytes, so they are
   not precached; the first scan fetches them and they are then kept in their
   own cache and served from it, which makes every later scan work offline. */
const APP_CACHE = 'pantry-app-v1';
const OCR_CACHE = 'pantry-ocr-v1';

const ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/foods.js',
  'js/recipes.js',
  'js/match.js',
  'js/inventory.js',
  'js/ocr.js',
  'js/app.js',
  'icons/icon.svg',
];


self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(APP_CACHE)
      .then(c => Promise.all(ASSETS.map(a => c.add(new Request(a, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== APP_CACHE && k !== OCR_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  if (url.origin === self.location.origin && url.pathname.includes('/vendor/')) {
    e.respondWith(
      caches.open(OCR_CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) c.put(e.request, res.clone());
        return res;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(APP_CACHE).then(async (c) => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const refresh = fetch(e.request).then((res) => {
        if (res.ok) c.put(e.request, res.clone());
        return res;
      }).catch(() => hit);
      return hit || refresh;
    }),
  );
});
