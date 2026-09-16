const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const b = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(ALT + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 10; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  // Re-cast the enemies as every monster the game has, side by side with allies.
  await page.evaluate(() => {
    const b = game.battle, g = b.grid, r = game.renderer;
    const kinds = ['goblin', 'direWolf', 'skeleton', 'wisp', 'treant', 'bomb'].filter(k => JOBS[k]);
    const cy = Math.floor(g.h / 2);
    const foes = b.units.filter(u => u.team === 'enemy');
    kinds.forEach((k, i) => {
      let u = foes[i];
      if (!u) { u = new Unit({ name: JOBS[k].name, job: k, level: 5, team: 'enemy' }); b.units.push(u); }
      u.job = k; u.jobData = JOBS[k]; u.x = 2 + i * 2; u.y = cy; u.facing = 'S'; u.alive = true; u.hp = u.maxHp;
    });
    b.units.filter(u => u.team === 'player').forEach((u, i) => { u.x = 2 + i * 2; u.y = cy + 1; u.facing = 'N'; });
    r.frameTiles(b.units.filter(u => u.x >= 0).map(u => ({ x: u.x, y: u.y })), 0);
    return kinds;
  });
  await page.waitForTimeout(500);
  await page.locator('#battle-canvas').screenshot({ path: `${S}/monsters.png` });
  await b.close();
  console.log('ok');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
