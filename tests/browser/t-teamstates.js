const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 10; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${S}/st-deploy.png`, clip: { x: 140, y: 60, width: 900, height: 560 } });
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });

  await page.evaluate(() => {
    const b = game.battle, g = b.grid, r = game.renderer;
    const cx = Math.floor(g.w / 2), cy = Math.floor(g.h / 2);
    const spots = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) spots.push([cx + dx, cy + dy]);
    const P = b.units.filter(u => u.team === 'player' && u.alive), E = b.units.filter(u => u.team === 'enemy' && u.alive);
    const order = []; for (let i = 0; i < spots.length; i++) order.push(i % 2 ? E[Math.floor(i / 2) % E.length] : P[Math.floor(i / 2) % P.length]);
    const placed = new Set(); let si = 0;
    for (const u of order) {
      if (!u || placed.has(u)) continue;
      const [x, y] = spots[si++];
      if (!g.inBounds(x, y) || !g.passable(x, y)) continue;
      u.x = x; u.y = y; u.facing = ['E', 'S', 'W', 'N'][(x + y) % 4]; placed.add(u);
    }
    // One body on the field, to see the faded base under a downed unit.
    const dead = [...placed][placed.size - 1];
    if (dead) { dead.alive = false; dead.hp = 0; dead.koCount = 3; }
    // Paint both kinds of highlight under the melee.
    r.hl.move = new Set(); r.hl.target = new Set();
    for (let dx = -3; dx <= 3; dx++) for (let dy = -2; dy <= 2; dy++) {
      const x = cx + dx, y = cy + dy;
      if (!g.inBounds(x, y)) continue;
      ((dx + dy) % 2 ? r.hl.target : r.hl.move).add(`${x},${y}`);
    }
    r.frameTiles([...placed].map(u => ({ x: u.x, y: u.y })), 0);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${S}/st-highlights.png`, clip: { x: 300, y: 180, width: 700, height: 340 } });

  // The same melee, seen from another quarter.
  await page.evaluate(() => game.renderer.rotate(1));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${S}/st-rot.png`, clip: { x: 300, y: 180, width: 700, height: 340 } });
  await browser.close();
  console.log('ok');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
