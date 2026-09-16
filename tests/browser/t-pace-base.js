const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE + '/index.html');
  await p.waitForSelector('#screen-title.active');
  await p.click('#btn-new');
  await p.waitForSelector('#screen-world.active');
  await p.click('#btn-battle');
  await p.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await p.textContent('#btn-story-next'); await p.click('#btn-story-next'); if (t === 'Onward') break; }
  await p.waitForSelector('#deploy-panel.open');
  await p.click('#deploy-panel button[data-a="go"]');
  await p.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  const r = await p.evaluate(async () => {
    const bt = game.battle, rd = game.ui.r;
    const me = bt.units.find(u => u.team === 'player' && u.alive);
    const foe = bt.units.find(u => u.team !== 'player' && u.alive);
    const adj = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => bt.grid.tile(foe.x+dx, foe.y+dy))
      .find(t => t && t.t !== 'x' && !bt.units.some(o => o.alive && o !== me && o.x === t.x && o.y === t.y));
    if (adj) { me.x = adj.x; me.y = adj.y; }
    const timed = async (label, ab, tx, ty) => {
      const t0 = performance.now();
      await rd.animateAction(me, ab, tx, ty);
      return [label, Math.round(performance.now() - t0)];
    };
    const out = [];
    me.gear.weapon = 'broadsword';
    out.push(await timed('melee', ABILITIES.attack, foe.x, foe.y));
    out.push(await timed('spell', ABILITIES.fire, foe.x, foe.y));
    me.gear.weapon = 'longbow';
    // A shot from across the board is the slowest case there is.
    const far = bt.grid.tile(foe.x + 5, foe.y);
    if (far && far.t !== 'x') { me.x = far.x; me.y = far.y; }
    out.push(await timed('bow (5 tiles)', ABILITIES.attack, foe.x, foe.y));
    // Frame cost while a wide spell is on screen.
    return { timings: out };
    rd.fx = [];
    rd.landFx(ABILITIES.fira, bt.grid.areaTiles(foe.x, foe.y, 2));
    const n = rd.fx.length;
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) rd.draw();
    return { timings: out, effectsOnScreen: n, msPerFrameWithFx: +((performance.now() - t0) / 200).toFixed(2) };
  });
  console.log(JSON.stringify(r), 'errors:', errs.length ? errs : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
