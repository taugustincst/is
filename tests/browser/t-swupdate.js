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
// Poll an async condition in the page until it holds, riding out the page's
// own reloads (waitForFunction treats a returned promise as already true).
async function until(page, fn, arg, timeout) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (await page.evaluate(fn, arg)) return true; } catch (err) { /* the page is navigating */ }
    await page.waitForTimeout(250);
  }
  return false;
}
(async () => {
  const cssOriginal = fs.readFileSync(CSS, 'utf8'), swOriginal = fs.readFileSync(SW, 'utf8');
  const { browser, page, errors } = await open();
  try {
    // The test switches builds itself; the game's own update question is
    // left unanswered, which neither blocks nor declines anything.
    await page.goto(BASE + '/index.html');
    const v1 = stamp.stampedHash();
    ok('the first build is fetched into its cache', await until(page, async (v) => { const c = await caches.open('elderon-' + v); return (await c.keys()).length >= 15; }, v1, 20000));
    // The first worker must be in control before a second is staged, or the page is still served by the network and the 'old keeps serving' check has nothing to compare.
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 });
    const before = await page.evaluate(async (v) => { const c = await caches.open('elderon-' + v); const r = await c.match(new Request(location.origin + '/css/style.css'), { ignoreSearch: true }); return r ? (await r.text()).includes('MARKER-OF-A-NEW-BUILD') : null; }, v1);
    ok('the first build is cached whole under its own name', before === false, `v${v1}`);
    // Ship a change, as a release does: the file and the stamp. The test
    // server revalidates sw.js by Last-Modified, to the second, so a new
    // build written in the same second as the old one would look unchanged
    // to the browser's update check (a 304): let that second pass first.
    await new Promise(r => setTimeout(r, 1050 - (fs.statSync(SW).mtimeMs % 1000)));
    fs.writeFileSync(CSS, cssOriginal + '\n/* MARKER-OF-A-NEW-BUILD */\n');
    const v2 = stamp.currentHash();
    fs.writeFileSync(SW, swOriginal.replace(/const VERSION = '[0-9a-f]+';/, `const VERSION = '${v2}';`));
    ok('a changed file changes the stamp', v2 !== v1, `${v1} -> ${v2}`);
    await page.reload();
    // At the title with no game open there is nothing to lose, so the page
    // takes the new build at once: the new worker takes over and the page
    // reloads itself into it, with the old cache gone.
    const taken = await until(page, async (v) => { const names = await caches.keys(); return names.length === 1 && names[0] === 'elderon-' + v && !!navigator.serviceWorker.controller && !window.__reloadOnControl && !!document.querySelector('#screen-title.active'); }, v2, 40000);
    if (!taken) {
      // Say what the registration looked like, not just that it timed out.
      const st = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); const d = w => w ? { state: w.state, url: w.scriptURL } : null; const sw = await (await fetch('sw.js', { cache: 'no-store' })).text(); return { installing: d(r && r.installing), waiting: d(r && r.waiting), active: d(r && r.active), controller: !!navigator.serviceWorker.controller, swVersion: (sw.match(/VERSION = '([0-9a-f]+)'/) || [])[1], caches: await caches.keys() }; });
      throw new Error(`the new build was not taken at the title: ${JSON.stringify(st)}`);
    }
    const swapped = await page.evaluate(async () => ({ names: await caches.keys(), served: (await (await fetch('/css/style.css')).text()).includes('MARKER-OF-A-NEW-BUILD') }));
    ok('at the title with no game open, the new build is taken at once and only it remains', swapped.names.length === 1 && swapped.names[0] === 'elderon-' + v2 && swapped.served, JSON.stringify(swapped));
    // In a game, a newer build waits in its own cache and the page asks
    // first, with the old build still serving until the player agrees.
    await page.waitForSelector('#screen-title.active', { timeout: 15000 });
    await page.click('#btn-new');
    await page.waitForSelector('#screen-world.active');
    await new Promise(r => setTimeout(r, 1050 - (fs.statSync(SW).mtimeMs % 1000)));
    fs.writeFileSync(CSS, cssOriginal + '\n/* MARKER-OF-A-NEW-BUILD */\n/* MARKER-OF-A-THIRD-BUILD */\n');
    const v3 = stamp.currentHash();
    fs.writeFileSync(SW, swOriginal.replace(/const VERSION = '[0-9a-f]+';/, `const VERSION = '${v3}';`));
    ok('a third build has a stamp of its own', v3 !== v2 && v3 !== v1, `${v2} -> ${v3}`);
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
    ok('the game asks before switching mid-game', await until(page, () => !!window.__updateWaiting && !document.getElementById('ask').hidden, null, 30000));
    const asked = await page.evaluate(async (v) => ({ text: document.getElementById('ask-text').textContent, names: await caches.keys(), newHas: (await (await (await caches.open('elderon-' + v)).match(new Request(location.origin + '/css/style.css'), { ignoreSearch: true })).text()).includes('THIRD'), servedOld: !(await (await fetch('/css/style.css')).text()).includes('THIRD') }), v3);
    ok('in a game, the newer build waits in its own cache and the page asks before switching', /new version/.test(asked.text) && asked.names.includes('elderon-' + v2) && asked.names.includes('elderon-' + v3) && asked.newHas && asked.servedOld, JSON.stringify(asked));
    // Later: nothing changes.
    await page.evaluate(() => game.answerAsk(false));
    const later = await page.evaluate(async () => ({ asked: document.getElementById('ask').hidden, servedOld: !(await (await fetch('/css/style.css')).text()).includes('THIRD'), screen: game.screen }));
    ok('"Later" keeps the running build and the game', later.asked && later.servedOld && later.screen === 'world', JSON.stringify(later));
    // The player agrees: the new worker takes over and the old cache goes.
    await page.evaluate(() => new Promise(res => { navigator.serviceWorker.addEventListener('controllerchange', () => res(), { once: true }); window.__updateWaiting.postMessage('skipWaiting'); }));
    await page.reload();
    ok('the old cache goes once the player agrees', await until(page, async (v) => !(await caches.keys()).includes('elderon-' + v), v2, 20000));
    const swapped3 = await page.evaluate(async () => ({ names: await caches.keys(), served: (await (await fetch('/css/style.css')).text()).includes('THIRD') }));
    ok('after the switch only the newest build remains and its files are served', swapped3.names.length === 1 && swapped3.names[0] === 'elderon-' + v3 && swapped3.served, JSON.stringify(swapped3));
    // And it must still work with no network at all.
    await page.context().setOffline(true);
    await page.reload();
    await page.waitForSelector('#screen-title.active', { timeout: 15000 });
    await page.click('#btn-new');
    await page.waitForSelector('#screen-world.active');
    // Playwright's offline switch does not reach a worker's own fetches, so
    // the honest-failure path is checked in the worker's source instead.
    const src = fs.readFileSync(SW, 'utf8');
    ok('offline, the game boots from the cache; a miss that is not a page is a 504, not index.html', /req\.mode === 'navigate'\) return caches\.open\(CACHE\)\.then\(c => c\.match\('index\.html'\)\)/.test(src) && /status: 504/.test(src));
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
