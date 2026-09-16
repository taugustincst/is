const { BASE, ALT } = require('./lib');
/* Every figure on the field must carry its team in its own pixels. The test
   samples the canvas where the base ring is drawn and asks the only question
   the player asks: is this blue or is this red? */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');

const SAMPLE = `(() => {
  const r = game.renderer, b = game.battle, cv = r.cv;
  const g = cv.getContext('2d');
  const out = [];
  for (const u of b.units) {
    if (u.x < 0 || !u.alive) continue;
    const p = r.unitScreenPos(u);
    // The ring's left and right extremes, in canvas pixels after the zoom.
    const z = r.zoom, W = cv.width, H = cv.height;
    const hits = [];
    for (const dx of [-15, -11, 11, 15]) {
      const px = Math.round((p.sx + dx - W / 2) * z + W / 2);
      const py = Math.round((p.sy + 6 - H / 2) * z + H / 2);
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const d = g.getImageData(px, py, 1, 1).data;
      hits.push([d[0], d[1], d[2]]);
    }
    /* The frame around the HP bar, sampled inside the band itself rather than
       across the whole bar: grass behind an unframed bar is red-dominant too,
       and a check a bare background can satisfy proves nothing. */
    const band = [];
    for (const [dx, dy] of [[0, -36.5], [0, -31.5], [-13.5, -34], [13.5, -34]]) {
      const px = Math.round((p.sx + dx - W / 2) * z + W / 2);
      const py = Math.round((p.sy + dy - H / 2) * z + H / 2);
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const d = g.getImageData(px, py, 1, 1).data;
      band.push([d[0], d[1], d[2]]);
    }
    out.push({ name: u.name, team: u.team, ring: hits, frame: band });
  }
  return out;
})()`;

(async () => {
  const b = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 10; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.evaluate(() => {
    const b = game.battle, g = b.grid, r = game.renderer;
    const cx = Math.floor(g.w / 2), cy = Math.floor(g.h / 2);
    const spots = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) spots.push([cx + dx, cy + dy]);
    const P = b.units.filter(u => u.team === 'player'), E = b.units.filter(u => u.team === 'enemy');
    const order = []; for (let i = 0; i < spots.length; i++) order.push(i % 2 ? E[Math.floor(i / 2) % E.length] : P[Math.floor(i / 2) % P.length]);
    const placed = new Set(); let si = 0;
    for (const u of order) { if (!u || placed.has(u)) continue; const [x, y] = spots[si++]; if (!g.inBounds(x, y) || !g.passable(x, y)) continue; u.x = x; u.y = y; u.facing = ['E','S','W','N'][(x+y)%4]; placed.add(u); }
    r.frameTiles([...placed].map(u => ({ x: u.x, y: u.y })), 0);
  });
  await page.waitForTimeout(500);
  const rows = await page.evaluate(SAMPLE);
  let bad = 0;
  for (const u of rows) {
    const want = u.team === 'enemy' ? 'red' : 'blue';
    const ringVotes = u.ring.map(([r0, g0, b0]) => (r0 - b0 > 25 ? 'red' : b0 - r0 > 25 ? 'blue' : '-'));
    const ringOk = ringVotes.includes(want) && !ringVotes.includes(want === 'red' ? 'blue' : 'red');
    // A team hue has to beat both other channels, so grass and bare canvas
    // cannot answer for a frame that is not there.
    const hue = ([r0, g0, b0]) =>
      (r0 - b0 > 40 && r0 - g0 > 40) ? 'red' : (b0 - r0 > 40 && b0 - g0 > 20) ? 'blue' : '-';
    const frameVotes = u.frame.map(hue);
    const frameOk = frameVotes.filter(v => v === want).length >= 2;
    const ok = ringOk || frameOk;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${u.team.padEnd(6)} ${u.name.padEnd(14)} ring=${ringVotes.join(',')} frame=${frameVotes.join(',')}`);
  }
  await b.close();
  console.log(bad ? `FAILED ${bad} unit(s) unreadable` : `ok: all ${rows.length} figures read their team`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
