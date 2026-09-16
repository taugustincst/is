const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
const TAG = process.argv[2] || 'before';

// Build a deliberately hard case: allies and enemies interleaved on adjacent
// tiles, which is exactly the melee the player complained about.
async function melee(page) {
  return page.evaluate(() => {
    const b = game.battle, g = b.grid;
    const cx = Math.floor(g.w / 2), cy = Math.floor(g.h / 2);
    // A checkerboard of the two sides, alternating so no two neighbours share
    // a team; this is the worst case for telling them apart.
    const spots = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) spots.push([cx + dx, cy + dy]);
    const P = b.units.filter(u => u.team === 'player' && u.alive);
    const E = b.units.filter(u => u.team === 'enemy' && u.alive);
    const order = [];
    for (let i = 0; i < spots.length; i++) order.push(i % 2 ? E[Math.floor(i / 2) % E.length] : P[Math.floor(i / 2) % P.length]);
    const placed = new Set();
    let si = 0;
    for (const u of order) {
      if (!u || placed.has(u)) continue;
      const [x, y] = spots[si++];
      if (!g.inBounds(x, y) || !g.passable(x, y)) continue;
      u.x = x; u.y = y; u.facing = ['E', 'S', 'W', 'N'][(x + y) % 4];
      placed.add(u);
    }
    game.renderer.frameTiles(b.units.filter(u => placed.has(u)).map(u => ({ x: u.x, y: u.y })), 0);
    return { placed: placed.size, units: b.units.map(u => ({ n: u.name, t: u.team, x: u.x, y: u.y, alive: u.alive, h: game.battle.grid.height(u.x, u.y), anim: !!u.anim, air: !!u.airborne })) };
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  for (const vp of [{ n: 'desk', width: 1280, height: 800, m: false }, { n: 'phone', width: 412, height: 915, m: true }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.m, isMobile: vp.m, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('PAGEERROR', e.message));
    await page.goto(BASE + '/index.html');
    await page.waitForSelector('#screen-title.active');
    await page.click('#btn-new');
    await page.waitForSelector('#screen-world.active');
    await page.click('#btn-battle');
    await page.waitForSelector('#screen-story.active');
    for (let i = 0; i < 10; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
    await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
    await page.click('#deploy-panel button[data-a="go"]');
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
    const info = await melee(page);
    console.log(vp.n, JSON.stringify(info.placed), info.units.map(u => `${u.t[0]}:${u.n}@${u.x},${u.y} h${u.h}${u.alive ? '' : ' DEAD'}${u.anim ? ' ANIM' : ''}${u.air ? ' AIR' : ''}`).join(' | '));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${S}/${TAG}-${vp.n}.png` });
    // A tight crop of the melee, at 1:1 canvas pixels, is what the eye gets.
    const box = await page.$eval('#battle-canvas', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    await page.screenshot({ path: `${S}/${TAG}-${vp.n}-crop.png`, clip: { x: box.x + box.width * 0.25, y: box.y + box.height * 0.25, width: box.width * 0.5, height: box.height * 0.5 } });
    await ctx.close();
  }
  await browser.close();
  console.log('ok');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
