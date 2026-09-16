/* A new build is fetched whole into a cache of its own, waits until the
   player agrees, and then replaces the old build completely; and the game
   still boots and plays with no network at all. The test ships a change the
   way a release does: change a file, re-stamp sw.js. */
const { BASE, open } = require('./lib');
const fs = require('fs');
const path = require('path');
const stamp = require('../../tools/stamp');
const ROOT = path.join(__dirname, '..', '..');
const CSS = path.join(ROOT, 'css/style.css'), SW = path.join(ROOT, 'sw.js');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const cssOriginal = fs.readFileSync(CSS, 'utf8'), swOriginal = fs.readFileSync(SW, 'utf8');
  const { browser, page, errors } = await open();
  try {
    // The game decides for itself in this test; the prompt is declined.
    await page.addInitScript(() => { window.confirm = () => false; });
    await page.goto(BASE + '/index.html');
    const v1 = stamp.stampedHash();
    await page.waitForFunction(async (v) => { const c = await caches.open('elderon-' + v); return (await c.keys()).length >= 15; }, v1, { timeout: 20000 });
    const before = await page.evaluate(async (v) => { const c = await caches.open('elderon-' + v); const r = await c.match(new Request(location.origin + '/css/style.css'), { ignoreSearch: true }); return r ? (await r.text()).includes('MARKER-OF-A-NEW-BUILD') : null; }, v1);
    ok('the first build is cached whole under its own name', before === false, `v${v1}`);
    // Ship a change, as a release does: the file and the stamp.
    fs.writeFileSync(CSS, cssOriginal + '\n/* MARKER-OF-A-NEW-BUILD */\n');
    const v2 = stamp.currentHash();
    fs.writeFileSync(SW, swOriginal.replace(/const VERSION = '[0-9a-f]+';/, `const VERSION = '${v2}';`));
    ok('a changed file changes the stamp', v2 !== v1, `${v1} -> ${v2}`);
    await page.reload();
    await page.waitForFunction(() => !!window.__updateWaiting, null, { timeout: 20000 });
    const staged = await page.evaluate(async (v) => { const names = await caches.keys(); const c = await caches.open('elderon-' + v); const r = await c.match(new Request(location.origin + '/css/style.css'), { ignoreSearch: true }); const served = await (await fetch('/css/style.css')).text(); return { names, newHas: r ? (await r.text()).includes('MARKER-OF-A-NEW-BUILD') : null, servedOld: !served.includes('MARKER-OF-A-NEW-BUILD') }; }, v2);
    ok('the new build waits in its own cache while the old one keeps serving', staged.names.includes('elderon-' + v1) && staged.names.includes('elderon-' + v2) && staged.newHas === true && staged.servedOld, JSON.stringify(staged));
    // The player agrees: the new worker takes over and the old cache goes.
    await page.evaluate(() => new Promise(res => { navigator.serviceWorker.addEventListener('controllerchange', () => res(), { once: true }); window.__updateWaiting.postMessage('skipWaiting'); }));
    await page.reload();
    await page.waitForFunction(async (v) => !(await caches.keys()).includes('elderon-' + v), v1, { timeout: 20000 });
    const swapped = await page.evaluate(async () => ({ names: await caches.keys(), served: (await (await fetch('/css/style.css')).text()).includes('MARKER-OF-A-NEW-BUILD') }));
    ok('after the switch only the new build remains and its files are served', swapped.names.length === 1 && swapped.names[0] === 'elderon-' + v2 && swapped.served, JSON.stringify(swapped));
    // And it must still work with no network at all.
    await page.context().setOffline(true);
    await page.reload();
    await page.waitForSelector('#screen-title.active', { timeout: 15000 });
    await page.click('#btn-new');
    await page.waitForSelector('#screen-world.active');
    // Playwright's offline switch does not reach a worker's own fetches, so
    // the honest-failure path is checked in the worker's source instead.
    const src = fs.readFileSync(SW, 'utf8');
    ok('offline, the game boots from the cache; a miss that is not a page is a 504, not index.html', /req\.mode === 'navigate'\) return caches\.match\('index\.html'\)/.test(src) && /status: 504/.test(src));
    await page.context().setOffline(false);
    ok('no page errors', errors.filter(e => !/Failed to fetch|net::/i.test(e)).length === 0, errors.join('; '));
  } finally {
    fs.writeFileSync(CSS, cssOriginal);
    fs.writeFileSync(SW, swOriginal);
    await browser.close();
  }
  console.log(fails ? `${fails} FAILED` : 'all update checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); fs.writeFileSync(CSS, fs.readFileSync(CSS, 'utf8')); process.exit(1); });
