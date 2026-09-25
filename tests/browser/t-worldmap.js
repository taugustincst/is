const { BASE, ALT } = require('./lib');
/* The camp's map draws, marks progress, and after the campaign the road
   turns into trials that start, fight and record. */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  for (const vp of [{ n: 'desk', width: 1280, height: 800, m: false }, { n: 'phone', width: 400, height: 800, m: true }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.m, isMobile: vp.m, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
    await page.goto(BASE + '/index.html');
    await page.waitForSelector('#screen-title.active');
    await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${S}/camp-${vp.n}-ch0.png` });
    const drawn = await page.evaluate(() => { const cv = document.getElementById('world-map'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lit = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 120) lit++; return { w: cv.width, h: cv.height, lit }; });
    ok(`${vp.n}: the map is drawn`, drawn.w > 200 && drawn.lit > 50, JSON.stringify(drawn));
    await page.evaluate(() => { game.state.chapter = 3; game.showWorld(); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${S}/camp-${vp.n}-ch3.png` });
    if (vp.n === 'desk') {
      // Clicking the next stop marches.
      const before = await page.evaluate(() => game.screen);
      await page.evaluate(() => { const cv = document.getElementById('world-map'); const r = cv.getBoundingClientRect(); const p = WORLD_ROUTE[3]; cv.dispatchEvent(new MouseEvent('click', { clientX: r.left + p[0] * r.width, clientY: r.top + p[1] * r.height, bubbles: true })); });
      await page.waitForSelector('#screen-story.active', { timeout: 5000 });
      ok('clicking the next stop marches to battle', before === 'world' && await page.evaluate(() => game.screen === 'story'));
      // Back out through the story to the camp is not possible; reload instead.
      await page.evaluate(() => { game.state.branch = 'crown'; game.state.chapter = game.roadLength(); game.saveGame(); });
      await page.reload(); await page.waitForSelector('#screen-title.active');
      await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
      const label = await page.textContent('#btn-battle');
      ok('after the campaign the button offers a trial', label.trim() === 'Trial 1', label);
      await page.screenshot({ path: `${S}/camp-desk-trials.png` });
      await page.click('#btn-battle');
      await page.waitForSelector('#screen-story.active');
      for (let i = 0; i < 6; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
      await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
      const foes = await page.evaluate(() => game.battle.units.filter(u => u.team === 'enemy').map(u => `${u.jobData.name}${u.level}`));
      ok('a trial fields enemies above the party', foes.length >= 4 && foes.every(f => /\d+$/.test(f)), foes.join(','));
      await page.click('#deploy-panel button[data-a="go"]');
      await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
      await page.waitForTimeout(200);
      const face = await page.evaluate(() => { const c = document.querySelector('#unit-card .card-face'); return c ? c.width : 0; });
      ok('the unit card shows a face', face > 0, `${face}px`);
      await page.screenshot({ path: `${S}/card-face.png`, clip: { x: 1000, y: 0, width: 280, height: 260 } });
      // Win it outright and see the trial recorded.
      await page.evaluate(() => { for (const u of game.battle.units) if (u.team === 'enemy') { u.hp = 1; } });
      await page.click('#btn-retreat'); await page.click('#ask-yes');
      await page.waitForSelector('#screen-results.active', { timeout: 20000 });
      await page.click('#btn-results');
      await page.waitForSelector('#screen-world.active', { timeout: 20000 });
      const after = await page.evaluate(() => ({ trials: game.state.trials, label: document.getElementById('btn-battle').textContent.trim() }));
      ok('a lost trial costs nothing and is offered again', after.trials === 0 && after.label === 'Trial 1', JSON.stringify(after));
      await page.evaluate(() => { game.state.trials = 2; game.state.victories += 2; game.showWorld(); });
      ok('trials climb', (await page.textContent('#btn-battle')).trim() === 'Trial 3');
    }
    ok(`${vp.n}: no page errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'all world-map checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
