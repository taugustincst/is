const { BASE, ALT } = require('./lib');
const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
// Real device sizes, CSS pixels.
const SIZES = [
  { name: 'pixel-portrait', w: 412, h: 915 },
  { name: 'pixel-landscape', w: 915, h: 412 },
  { name: 'small-portrait', w: 360, h: 740 },
];
(async () => {
  const { browser, page, errors } = await open();
  for (const s of SIZES) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE + '/index.html');
    await page.click('#btn-new');
    await page.waitForSelector('#screen-world.active');
    const worldOverflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth > window.innerWidth + 1,
      y: document.documentElement.scrollHeight > window.innerHeight + 1,
    }));
    await page.screenshot({ path: `${S}/ph-${s.name}-world.png` });
    await page.evaluate(() => {
      BattleUI.prototype.awaitPlayerTurn = function () { return new Promise(() => {}); };
      game.state.party.forEach(u => { u.level = 6; game.syncGear(u); });
      game.runBattle(MAPS.hollowmere, CAMPAIGN[2].enemies, 0, { objective: { type: 'rout' } });
    });
    await page.waitForSelector('#deploy-panel.open');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${S}/ph-${s.name}-deploy.png` });
    const boxes = await page.evaluate(() => {
      const g = id => { const e = document.getElementById(id); if (!e || !e.offsetParent && getComputedStyle(e).display === 'none') return null;
        const r = e.getBoundingClientRect(); return { id, t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; };
      return ['battle-top', 'turn-order', 'unit-card', 'log', 'deploy-panel', 'hint'].map(g).filter(Boolean);
    });
    const over = (a, b) => !(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t);
    const clashes = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      if (over(boxes[i], boxes[j])) clashes.push(`${boxes[i].id}/${boxes[j].id}`);
    }
    const offscreen = boxes.filter(b => b.r > s.w + 1 || b.b > s.h + 1 || b.l < -1 || b.t < -1).map(b => b.id);
    const canvasArea = await page.evaluate(() => { const c = document.getElementById('battle-canvas').getBoundingClientRect(); return Math.round(c.width) + 'x' + Math.round(c.height); });
    console.log(`${s.name.padEnd(18)} world overflow ${JSON.stringify(worldOverflow)}  canvas ${canvasArea}`);
    console.log(`  panel clashes: ${clashes.join(', ') || 'none'}   offscreen: ${offscreen.join(', ') || 'none'}`);
  }
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
