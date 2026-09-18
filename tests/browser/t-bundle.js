const { BASE, ALT } = require('./lib');
// Plays the single-file build straight off the filesystem, with no server,
// by touch, on a phone-sized screen.
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const path = require('path');
const S = require('./lib').OUT;
// The repository root, wherever it is checked out, not a path baked in for
// one machine: run.sh builds dist/elderon.html there before this test runs.
const ROOT = path.join(__dirname, '..', '..');
const FILE = process.env.TARGET || 'file://' + path.join(ROOT, 'dist', 'elderon.html');

// Pick the destination a player would actually tap: the furthest one whose
// point on screen belongs to the board rather than to a panel sitting over it.
async function pickDest(page) {
  await page.waitForFunction(() => !game.renderer.camAnim, null, { timeout: 5000 }).catch(() => {});
  return page.evaluate(() => {
    const r = game.renderer, g = game.battle.grid, z = r.zoom || 1;
    const cv = document.getElementById('battle-canvas'), rc = cv.getBoundingClientRect();
    const W = r.W, H = r.H;
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
    const W = game.renderer.W || cv.width, H = game.renderer.H || cv.height;
    const px = (s.sx - W / 2) * z + W / 2, py = (s.sy - H / 2) * z + H / 2;
    return { x: r.left + px * r.width / W, y: r.top + py * r.height / H };
  }, [tx, ty]);
  await page.touchscreen.tap(pt.x, pt.y);
  await page.waitForTimeout(120);
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  let bad = 0;
  const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? '  [' + d + ']' : '')); if (!c) bad++; };

  for (const [label, vp] of [['portrait', { width: 412, height: 915 }], ['landscape', { width: 915, height: 412 }]]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    // No requests may leave the file: everything is inlined.
    const external = [];
    page.on('request', r => { const u = r.url();
      if (!u.startsWith('file://') && !u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith(ALT + '')) external.push(u); });

    await page.goto(FILE);
    await page.waitForSelector('#screen-title.active');
    ok(`${label}: the file opens with no server`, true);
    ok(`${label}: nothing is fetched from outside the file`, external.length === 0, external.slice(0, 3).join(', '));

    await page.tap('#btn-new');
    await page.waitForSelector('#screen-world.active');
    await page.tap('#btn-battle');
    await page.waitForSelector('#screen-story.active');
    for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.tap('#btn-story-next'); if (t === 'Onward') break; }
    await page.waitForSelector('#deploy-panel.open');

    // Deploy by tapping the board, then start.
    await page.tap('#deploy-panel button[data-a="clear"]');
    await page.waitForTimeout(120);
    const zone = await page.evaluate(() => game.battle.deployZone.slice(0, 3).map(t => [t.x, t.y]));
    for (const [x, y] of zone) await tapTile(page, x, y);
    const placed = await page.evaluate(() => game.battle.deployed().length);
    ok(`${label}: units deploy by tapping the board`, placed === 3, `placed ${placed}`);
    await page.tap('#deploy-panel button[data-a="go"]');
    await page.waitForFunction(() => !game.ui.deploy, null, { timeout: 15000 });

    // Take a turn.
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
    await page.tap('#action-menu button[data-a="move"]');
    await page.waitForFunction(() => game.ui.turn.mode === 'move');
    const dest = await pickDest(page);
    await tapTile(page, dest[0], dest[1]);
    await page.waitForFunction(() => game.ui.turn && ['menu', 'wait', 'act'].includes(game.ui.turn.mode), null, { timeout: 15000 });
    const moved = await page.evaluate(([x, y]) => { const u = game.ui.turn.unit; return u.x === x && u.y === y; }, dest);
    ok(`${label}: a unit moves where it is tapped`, moved);

    // Saving must survive a reload, which is what makes it feel like an app.
    await page.evaluate(() => { game.state.gil = 4242; game.saveGame(); });
    await page.reload();
    await page.waitForSelector('#screen-title.active');
    const continued = await page.evaluate(() => {
      if (document.getElementById('btn-continue').disabled) return null;
      game.loadGame();
      return game.state.gil;
    });
    ok(`${label}: the save survives a reload`, continued === 4242, `gil ${continued}`);

    // The install metadata a phone needs.
    const meta = await page.evaluate(() => ({
      manifest: !!document.querySelector('link[rel="manifest"]'),
      icon: !!document.querySelector('link[rel="apple-touch-icon"]'),
      theme: !!document.querySelector('meta[name="theme-color"]'),
      capable: !!document.querySelector('meta[name="mobile-web-app-capable"]'),
    }));
    ok(`${label}: it offers itself as an installable app`, Object.values(meta).every(Boolean), JSON.stringify(meta));
    ok(`${label}: no console errors`, errors.length === 0, errors.slice(0, 2).join('; '));
    await page.screenshot({ path: `${S}/bundle-${label}.png` });
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? `\n${bad} FAILED` : '\nthe single file plays on its own');
  if (bad) process.exit(1);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
