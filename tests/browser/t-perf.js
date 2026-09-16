const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE + '/index.html');
  await p.waitForSelector('#screen-title.active');
  await p.click('#btn-new');
  await p.waitForSelector('#screen-world.active');
  await p.click('#btn-battle');
  await p.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await p.textContent('#btn-story-next'); await p.click('#btn-story-next'); if (t === 'Onward') break; }
  await p.waitForSelector('#deploy-panel.open');
  await p.click('#deploy-panel button[data-a="go"]');
  await p.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  const r = await p.evaluate(() => {
    const rd = game.ui.r, units = game.battle.units.filter(u => u.alive);
    const t0 = performance.now();
    for (let i = 0; i < 300; i++) rd.draw();
    const ms = (performance.now() - t0) / 300;
    // How many distinct sprites the cache is holding for this field.
    return { unitsOnField: units.length, msPerFrame: +ms.toFixed(3), cached: spriteCache.size };
  });
  console.log(JSON.stringify(r), 'errors:', errs.length ? errs : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
