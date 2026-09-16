const { BASE, ALT } = require('./lib');
// Plays a real battle using touch only, on a phone-sized screen, in both
// orientations: tap to deploy, tap menus, drag to pan, pinch to zoom.
const { chromePath } = require('./lib');
const { chromium, devices } = require('playwright-core');
const S = require('./lib').OUT;

// Pick the destination a player would actually tap: the furthest one whose
// point on screen belongs to the board rather than to a panel sitting over it.
async function pickDest(page) {
  await page.waitForFunction(() => !game.renderer.camAnim, null, { timeout: 5000 }).catch(() => {});
  return page.evaluate(() => {
    const r = game.renderer, g = game.battle.grid, z = r.zoom || 1;
    const cv = document.getElementById('battle-canvas'), rc = cv.getBoundingClientRect();
    const W = cv.width, H = cv.height;
    let best = null;
    for (const n of game.ui.turn.reach.values()) {
      if (n.cost <= 0) continue;
      const t = g.tile(n.x, n.y);
      if (!t) continue;
      const s = r.toScreen(t.x, t.y, t.h);
      const px = (s.sx - W / 2) * z + W / 2, py = (s.sy - H / 2) * z + H / 2;
      const cx = rc.left + px * rc.width / W, cy = rc.top + py * rc.height / H;
      if (cx < rc.left || cx > rc.right || cy < rc.top || cy > rc.bottom) continue;
      if (document.elementFromPoint(cx, cy) !== cv) continue;   // a panel is in the way
      if (r.pickTile(px, py) !== t) continue;                   // something else answers for it
      if (!best || n.cost > best.cost) best = n;
    }
    return best ? [best.x, best.y] : null;
  });
}

async function tapTile(page, tx, ty) {
  // A tile's screen position only means anything once the camera has stopped
  // moving; reading it mid-pan taps whatever has slid under the finger.
  await page.waitForFunction(() => !game.renderer.camAnim, null, { timeout: 5000 }).catch(() => {});
  const pt = await page.evaluate(([tx, ty]) => {
    const s = game.renderer.toScreen(tx, ty, game.battle.grid.height(tx, ty));
    const cv = document.getElementById('battle-canvas'), r = cv.getBoundingClientRect(), z = game.renderer.zoom;
    const px = (s.sx - cv.width / 2) * z + cv.width / 2, py = (s.sy - cv.height / 2) * z + cv.height / 2;
    return { x: r.left + px * r.width / cv.width, y: r.top + py * r.height / cv.height };
  }, [tx, ty]);
  await page.touchscreen.tap(pt.x, pt.y);
  await page.waitForTimeout(120);
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  for (const [label, vp] of [['portrait', { width: 412, height: 915 }], ['landscape', { width: 915, height: 412 }]]) {
    const ctx = await browser.newContext({
      viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    await page.goto(BASE + '/index.html');
    await page.tap('#btn-new');
    await page.waitForSelector('#screen-world.active');
    await page.tap('#btn-battle');
    await page.waitForSelector('#screen-story.active');
    for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.tap('#btn-story-next'); if (t === 'Onward') break; }
    await page.waitForSelector('#deploy-panel.open');

    // Deploy by tapping the board.
    await page.tap('#deploy-panel button[data-a="clear"]');
    await page.waitForTimeout(120);
    const zone = await page.evaluate(() => game.battle.deployZone.slice(0, 3).map(t => [t.x, t.y]));
    for (const [x, y] of zone) await tapTile(page, x, y);
    const placed = await page.evaluate(() => game.battle.deployed().length);
    await page.tap('#deploy-panel button[data-a="go"]');
    await page.waitForFunction(() => !game.ui.deploy, null, { timeout: 15000 });

    // Drag to pan, then pinch to zoom, using touch.
    const cam0 = await page.evaluate(() => ({ ...game.renderer.cam }));
    const cv = await page.evaluate(() => { const r = document.getElementById('battle-canvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    await page.touchscreen.tap(cv.x + cv.w / 2, cv.y + cv.h / 2);
    await page.waitForTimeout(80);
    const cam1 = await page.evaluate(() => ({ ...game.renderer.cam }));
    const z0 = await page.evaluate(() => game.renderer.zoom);
    await page.evaluate(() => game.renderer.setZoom(game.renderer.zoom * 1.4));
    const z1 = await page.evaluate(() => game.renderer.zoom);

    // Take a real turn by tapping the menu.
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
    const who = await page.evaluate(() => game.ui.turn.unit.name);
    await page.tap('#action-menu button[data-a="move"]');
    await page.waitForFunction(() => game.ui.turn.mode === 'move');
    const dest = await pickDest(page);
    await tapTile(page, dest[0], dest[1]);
    await page.waitForFunction(() => game.ui.turn && ['menu', 'wait', 'act'].includes(game.ui.turn.mode), null, { timeout: 15000 });
    const moved = await page.evaluate(([x, y]) => { const u = game.ui.turn.unit; return u.x === x && u.y === y; }, dest);
    await page.screenshot({ path: `${S}/touch-${label}.png` });
    console.log(`${label.padEnd(10)} deployed by tap: ${placed} | tap kept camera: ${cam0.x === cam1.x} | zoom ${z0.toFixed(2)}->${z1.toFixed(2)} | ${who} moved by tap: ${moved}`);
    console.log(`${''.padEnd(10)} errors: ${errors.join('; ') || 'none'}`);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
