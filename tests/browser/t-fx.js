const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
const fs = require('fs');
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

  // Drive each effect directly against a live battle and grab a frame partway
  // through, which is the only way to see what a 300ms animation looks like.
  // Each effect is caught at the moment it owns the screen: after the
  // wind-up, before it fades. A ranged case keeps its distance so the shot
  // is actually in the air when the shutter opens.
  const cases = [
    ['sword', 'shortSword', 'attack', 300, true], ['spear', 'spear', 'attack', 290, true],
    ['axe', 'battleAxe', 'attack', 390, true], ['knife', 'dagger', 'attack', 200, true],
    ['fist', null, 'attack', 190, true], ['bow', 'shortbow', 'attack', 400, false],
    ['stone', null, 'throwStone', 300, false],
    ['fire', null, 'fire', 400, false], ['ice', null, 'blizzard', 400, false],
    ['thunder', null, 'thunder', 330, false], ['earth', null, 'stone', 400, false],
    ['holy', null, 'holyBolt', 400, false], ['dark', null, 'blackTide', 400, false],
    ['heal', null, 'cure', 400, false],
  ];
  const grabs = [];
  const shots = [];
  const labels = [];
  for (const [label, weapon, abId, delay, melee] of cases) {
    const ok = await page.evaluate(async ({ weapon, abId, melee }) => {
      const b = game.battle, r = game.ui.r;
      const me = b.units.find(u => u.team === 'player' && u.alive);
      const foe = b.units.find(u => u.team !== 'player' && u.alive);
      if (!me || !foe || !ABILITIES[abId]) return false;
      if (weapon) me.gear.weapon = weapon;
      r.fx = []; r.shake = null;
      // Stand next to the target so melee has somewhere to swing.
      if (!melee) {
        // A shot needs room to be seen crossing the board.
        const far = [];
        for (let dx = -5; dx <= 5; dx++) for (let dy = -5; dy <= 5; dy++) {
          const d = Math.abs(dx) + Math.abs(dy);
          if (d < 3 || d > 5) continue;
          const t = b.grid.tile(foe.x + dx, foe.y + dy);
          if (t && t.t !== 'x' && !b.units.some(o => o.alive && o !== me && o.x === t.x && o.y === t.y)) far.push(t);
        }
        if (far.length) { me.x = far[0].x; me.y = far[0].y; }
      }
      if (melee) {
        const adj = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => b.grid.tile(foe.x+dx, foe.y+dy)).find(t => t && t.t !== 'x' && !b.units.some(o => o.alive && o !== me && o.x === t.x && o.y === t.y));
        if (adj) { me.x = adj.x; me.y = adj.y; }
      }
      window.__anim = r.animateAction(me, ABILITIES[abId], foe.x, foe.y);
      return true;
    }, { weapon, abId, melee });
    if (!ok) { grabs.push(`${label}: SKIPPED`); continue; }
    labels.push(label);
    await page.waitForTimeout(delay);
    const clip = await page.evaluate(() => {
      // Crop tight around the two combatants so the effect fills the frame.
      const b = game.battle, r = game.ui.r;
      const me = b.units.find(u => u.team === 'player' && u.alive);
      const foe = b.units.find(u => u.team !== 'player' && u.alive);
      const a = r.unitScreenPos(me), c = r.unitScreenPos(foe);
      const z = r.zoom || 1, W = r.cv.width, H = r.cv.height;
      const to = (p) => ({ x: (p.sx - W / 2) * z + W / 2, y: (p.sy - H / 2) * z + H / 2 });
      const pa = to(a), pc = to(c);
      const cx = (pa.x + pc.x) / 2, cy = (pa.y + pc.y) / 2 - 20;
      return { x: Math.max(0, cx - 150), y: Math.max(0, cy - 105), width: 300, height: 210 };
    });
    shots.push(`data:image/png;base64,${(await page.screenshot({ clip })).toString('base64')}`);
    await page.evaluate(() => window.__anim);
    grabs.push(`${label}: ok`);
  }
  const sheet = await page.evaluate(async ({ shots, labels }) => {
    const cols = 4, CW = 300, CH = 210, PAD = 20;
    const rows = Math.ceil(shots.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * CW; cv.height = rows * (CH + PAD);
    const c = cv.getContext('2d');
    c.fillStyle = '#0d0e18'; c.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < shots.length; i++) {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = shots[i]; });
      const x = (i % cols) * CW, y = Math.floor(i / cols) * (CH + PAD);
      c.drawImage(img, x, y);
      c.fillStyle = '#e8e6f0'; c.font = 'bold 14px monospace'; c.textAlign = 'center';
      c.fillText(labels[i], x + CW / 2, y + CH + 15);
    }
    return cv.toDataURL('image/png');
  }, { shots, labels });
  require('fs').writeFileSync(`${S}/fx-sheet.png`, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log(grabs.join(' | '));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
