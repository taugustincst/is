const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };

async function toBattle(page, opts = {}) {
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  if (opts.stopAtDeploy) return;
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const errs = [];
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 660 } })).newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await toBattle(page);

  // Every square must still answer to a tap on itself, from every side.
  const pick = await page.evaluate(async () => {
    const r = game.ui.r, g = game.battle.grid;
    const out = [];
    for (let rot = 0; rot < 4; rot++) {
      r.rot = rot; r.centerCamera();
      let total = 0, right = 0, covered = 0;
      const z = r.zoom || 1, W = r.cv.width, H = r.cv.height;
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        const t = g.tiles[y][x];
        if (t.t === 'x') continue;
        const s = r.toScreen(t.x, t.y, t.h);
        // pickTile takes canvas pixels; toScreen gives world coordinates.
        const px = (s.sx - W / 2) * z + W / 2, py = (s.sy - H / 2) * z + H / 2;
        // A figure standing in front legitimately answers for the square
        // behind it, so those are not this check's business.
        let hidden = false;
        for (const u of game.battle.units) {
          if (!u.alive || u.x < 0 || (u.x === t.x && u.y === t.y)) continue;
          const q = r.unitScreenPos(u);
          if (s.sx >= q.sx - 13 && s.sx <= q.sx + 13 && s.sy >= q.sy - 32 && s.sy <= q.sy + 8) { hidden = true; break; }
        }
        if (hidden) { covered++; continue; }
        total++;
        const got = r.pickTile(px, py);
        // A tap on a square resolves to that square, or to something standing
        // genuinely in front of it -- a nearer, taller tile whose wall rises
        // over it. Never to something behind it, which is what a projection
        // and a picker that disagreed would produce.
        if (got === t || (got && r.depthOf(got.x, got.y) > r.depthOf(t.x, t.y) && got.h > t.h)) right++;
      }
      out.push({ rot, total, right, covered });
    }
    r.rot = 0; r.centerCamera();
    return out;
  });
  const wrong = pick.filter(p => p.right !== p.total);
  ok('a tap never resolves to a square behind the one tapped', wrong.length === 0,
     pick.map(p => `rot${p.rot} ${p.right}/${p.total}`).join(' '));

  // Nothing may be drawn over something that is in front of it.
  const order = await page.evaluate(() => {
    const r = game.ui.r, g = game.battle.grid;
    const bad = [];
    for (let rot = 0; rot < 4; rot++) {
      r.rot = rot;
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
          const a = g.tile(x, y), b = g.tile(x + dx, y + dy);
          if (!a || !b || a.t === 'x' || b.t === 'x') continue;
          // Whichever of two neighbours sits lower on screen is nearer, and
          // must therefore sort later.
          const sa = r.toScreen(a.x, a.y, 0), sb = r.toScreen(b.x, b.y, 0);
          const da = r.depthOf(a.x, a.y), db = r.depthOf(b.x, b.y);
          if (Math.abs(sa.sy - sb.sy) < 0.01) continue;
          if ((sa.sy > sb.sy) !== (da > db)) bad.push(`rot${rot} ${a.x},${a.y} vs ${b.x},${b.y}`);
        }
      }
    }
    r.rot = 0;
    return bad;
  });
  ok('depth order follows the screen at every rotation', order.length === 0, order.slice(0, 3).join(' ') || 'all pairs agree');

  // A figure keeps its facing; the side of it you see moves with the camera.
  const facing = await page.evaluate(() => {
    const r = game.ui.r;
    const seenAt = (f, rot) => { r.rot = rot; return apparentFacing(f, rot); };
    const out = { e0: seenAt('E', 0), e1: seenAt('E', 1), e2: seenAt('E', 2), e3: seenAt('E', 3) };
    r.rot = 0;
    return out;
  });
  ok('a quarter turn moves which side of a figure you see',
     facing.e0 === 'E' && facing.e1 === 'S' && facing.e2 === 'W' && facing.e3 === 'N', JSON.stringify(facing));

  // Four turns come back to where it started, and a turn cannot be re-entered
  // while one is running.
  const spin = await page.evaluate(async () => {
    const r = game.ui.r;
    const started = r.rot;
    const p = r.rotate(1);
    const reentered = r.rotate(1);        // must be refused while turning
    await Promise.all([p, reentered]);
    const afterOne = r.rot;
    for (let i = 0; i < 3; i++) await r.rotate(1);
    return { started, afterOne, afterFour: r.rot, rotating: r.rotating };
  });
  ok('a turn cannot be started on top of another', spin.afterOne === 1, JSON.stringify(spin));
  ok('four turns come back round', spin.afterFour === 0 && !spin.rotating, JSON.stringify(spin));

  // The compass buttons point at the board, so they must follow it round.
  const arrows = await page.evaluate(() => ({
    n0: dirArrow('N', 0), n1: dirArrow('N', 1), e0: dirArrow('E', 0), e2: dirArrow('E', 2),
  }));
  ok('the compass arrows turn with the board',
     arrows.n0 === '↗' && arrows.n1 === '↘' && arrows.e0 === '↘' && arrows.e2 === '↖',
     JSON.stringify(arrows));

  console.log('ERRORS:', errs.length ? errs : 'none');
  if (errs.length) fails++;
  await browser.close();
  console.log(fails ? `\n${fails} rotation check(s) FAILED` : '\nall rotation checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
