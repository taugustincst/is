const { BASE, ALT } = require('./lib');
/* Every mood dresses the field and plays its theme without error; the
   results screen shows everyone who fought. Screenshots for the eye. */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 10; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  const moods = await page.evaluate(() => Object.keys(MOODS));
  let fails = 0;
  const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
  for (const m of moods) {
    const before = errors.length;
    const r = await page.evaluate(async (m) => {
      audio.init();
      game.renderer.mood = m;
      audio.playMusic(MOODS[m].music);
      await new Promise(r => setTimeout(r, 700));
      // Three frames of weather, timed.
      const rd = game.renderer, t0 = performance.now();
      for (let i = 0; i < 60; i++) { rd.time = performance.now(); rd.draw(); }
      return { ms: +((performance.now() - t0) / 60).toFixed(2), track: audio.track ? MOODS[m].music : 'none' };
    }, m);
    await page.locator('#battle-canvas').screenshot({ path: `${S}/mood-${m}.png` });
    ok(`mood ${m} draws and plays ${r.track}`, errors.length === before && r.ms < 16, `${r.ms} ms/frame`);
  }
  // Results roll-call.
  await page.evaluate(() => { window.__fought = game.battle.units.filter(u => u.team === 'player' && u.x >= 0).length; });
  await page.click('#btn-retreat'); await page.click('#ask-yes');
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.waitForTimeout(300);
  const roll = await page.evaluate(() => ({ n: document.querySelectorAll('.res-unit').length, canvases: document.querySelectorAll('.res-unit canvas').length, fought: window.__fought }));
  await page.screenshot({ path: `${S}/results.png` });
  ok('the results screen shows everyone who fought', roll.n === roll.fought && roll.canvases === roll.n && roll.n > 0, JSON.stringify(roll));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'all mood checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
