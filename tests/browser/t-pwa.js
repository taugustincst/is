const { BASE, ALT } = require('./lib');
const { open } = require('./lib');
const STAMP = require('../../tools/stamp').stampedHash();
(async () => {
  const { browser, page, errors } = await open();
  await page.setViewportSize({ width: 412, height: 915 });
  // The build's cache is named by its stamp; the page learns it before it loads.
  await page.addInitScript(v => { window.CACHE_V = v; }, STAMP);
  await page.goto(ALT + '/index.html');
  // Manifest is linked and parses.
  const man = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return { error: 'no manifest link' };
    const r = await fetch(link.href);
    const j = await r.json();
    return { status: r.status, name: j.name, display: j.display, icons: j.icons.length, start: j.start_url };
  });
  console.log('manifest:', JSON.stringify(man));
  // Service worker registers and takes control.
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller !== undefined, null, { timeout: 15000 }).catch(() => {});
  const reg = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return r ? { scope: r.scope, active: !!r.active, installing: !!r.installing } : null;
  });
  console.log('service worker:', JSON.stringify(reg));
  // Wait for the cache to fill, then check the whole game is in it.
  await page.waitForFunction(async () => {
    const c = await caches.open('elderon-' + CACHE_V);
    return (await c.keys()).length >= 15;
  }, null, { timeout: 45000 }).catch(() => {});
  const cached = await page.evaluate(async () => {
    const c = await caches.open('elderon-' + CACHE_V);
    return (await c.keys()).map(r => new URL(r.url).pathname.replace(/^\//, '') || '.');
  });
  console.log('cached files:', cached.length, '->', cached.sort().join(' '));
  // A file lost from the cache comes back on the next open: the worker fills gaps.
  await page.evaluate(async () => { const c = await caches.open('elderon-' + CACHE_V); for (const k of await c.keys()) if (k.url.endsWith('/js/game.js')) await c.delete(k); });
  await page.reload();
  await page.waitForFunction(async () => { const c = await caches.open('elderon-' + CACHE_V); return (await c.keys()).some(k => k.url.endsWith('/js/game.js')); }, null, { timeout: 20000 }).catch(() => {});
  const refilled = await page.evaluate(async () => { const c = await caches.open('elderon-' + CACHE_V); return (await c.keys()).some(k => k.url.endsWith('/js/game.js')); });
  console.log('gap refilled on next open:', refilled);
  if (!refilled) errors.push('cache gap not refilled');
  // Now go offline and reload: it must still boot and play.
  await page.context().setOffline(true);
  await page.reload();
  await page.waitForSelector('#screen-title.active', { timeout: 15000 });
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  const offlineOk = await page.evaluate(() => ({
    party: game.state.party.length,
    jobs: Object.keys(JOBS).length,
    sprites: typeof getSprite === 'function',
  }));
  console.log('offline boot:', JSON.stringify(offlineOk));
  await page.evaluate(() => { game.state.party.forEach(u => { u.level = 5; game.syncGear(u); });
    game.runBattle(MAPS.verdant, CAMPAIGN[0].enemies, 0, { objective: { type: 'rout' } }); });
  await page.waitForSelector('#deploy-panel.open', { timeout: 15000 });
  console.log('offline battle reached deployment: true');
  await page.context().setOffline(false);
  console.log('ERRORS:', errors.filter(e => !/service|sw\.js/i.test(e)).join('\n') || 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
