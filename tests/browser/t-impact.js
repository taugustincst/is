const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 620 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });

  // Run a real blow all the way through the engine, so the impact hook fires.
  await page.evaluate(() => {
    const b = game.battle;
    const me = b.units.find(u => u.team === 'player' && u.alive);
    const foe = b.units.find(u => u.team !== 'player' && u.alive);
    const adj = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => b.grid.tile(foe.x+dx, foe.y+dy))
      .find(t => t && t.t !== 'x' && !b.units.some(o => o.alive && o !== me && o.x === t.x && o.y === t.y));
    if (adj) { me.x = adj.x; me.y = adj.y; }
    me.gear.weapon = 'broadsword';
    b.hitChance = () => 100;                       // this frame is about the reaction, not the roll
    window.__done = b.applyAbility(me, ABILITIES.attack, foe.x, foe.y);
    window.__foe = foe;
  });
  // Sample the reaction: flash, recoil and shake all live in the same window.
  const seen = [];
  for (let i = 0; i < 14; i++) {
    const st = await page.evaluate(() => {
      const r = game.ui.r, f = window.__foe;
      return { flash: !!f.hitAt, recoil: !!f.recoil, shake: r.shake ? Math.round(r.shake.mag * 10) / 10 : 0, fx: r.fx.length };
    });
    seen.push(st);
    if (st.flash) await page.screenshot({ path: `${S}/fx-impact.png` });
    await page.waitForTimeout(45);
  }
  await page.evaluate(() => window.__done);
  console.log('flash frames:', seen.filter(s => s.flash).length,
              '| recoil frames:', seen.filter(s => s.recoil).length,
              '| peak shake:', Math.max(...seen.map(s => s.shake)),
              '| max fx alive:', Math.max(...seen.map(s => s.fx)));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
