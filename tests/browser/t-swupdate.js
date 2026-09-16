const { BASE, ALT } = require('./lib');
// Installs the worker, changes a shipped file, and checks the player receives
// the new bytes without the cache version being bumped.
const { open } = require('./lib');
const fs = require('fs');
const CSS = '/home/user/is/css/style.css';
(async () => {
  const original = fs.readFileSync(CSS, 'utf8');
  const { browser, page, errors } = await open();
  try {
    await page.goto(BASE + '/index.html');
    await page.waitForFunction(async () => {
      const c = await caches.open('elderon-v1');
      return (await c.keys()).length >= 15;
    }, null, { timeout: 20000 });
    const before = await page.evaluate(async () => {
      const c = await caches.open('elderon-v1');
      const r = await c.match(new Request(location.origin + '/css/style.css'), { ignoreSearch: true });
      return r ? (await r.text()).includes('MARKER-OF-A-NEW-BUILD') : null;
    });
    // Ship a change, exactly as a release would, without touching sw.js.
    fs.writeFileSync(CSS, original + '\n/* MARKER-OF-A-NEW-BUILD */\n');
    // Two loads: the first refreshes the cache behind the request, the second serves it.
    await page.reload();
    await page.waitForTimeout(1200);
    await page.reload();
    await page.waitForTimeout(600);
    const after = await page.evaluate(async () => {
      const c = await caches.open('elderon-v1');
      const r = await c.match(new Request(location.origin + '/css/style.css'), { ignoreSearch: true });
      return r ? (await r.text()).includes('MARKER-OF-A-NEW-BUILD') : null;
    });
    console.log('cached copy had the change before shipping it:', before);
    console.log('cached copy has it after two loads:', after);
    // And it must still work with no network at all.
    await page.context().setOffline(true);
    await page.reload();
    await page.waitForSelector('#screen-title.active', { timeout: 15000 });
    await page.click('#btn-new');
    await page.waitForSelector('#screen-world.active');
    console.log('still boots and plays offline: true');
    await page.context().setOffline(false);
    console.log('ERRORS:', errors.filter(e => !/Failed to fetch|net::/i.test(e)).join('; ') || 'none');
    if (before !== false || after !== true) process.exitCode = 1;
  } finally {
    fs.writeFileSync(CSS, original);
    await browser.close();
  }
})().catch(e => { console.error('FAILED', e); process.exit(1); });
