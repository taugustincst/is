const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };

async function toBattle(page) {
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
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const errs = [];

  // --- normal motion -------------------------------------------------------
  {
    const page = await (await browser.newContext({ viewport: { width: 1000, height: 660 } })).newPage();
    page.on('pageerror', e => errs.push(String(e)));
    await toBattle(page);
    const r = await page.evaluate(async () => {
      const b = game.battle, rd = game.ui.r;
      const me = b.units.find(u => u.team === 'player' && u.alive);
      const foe = b.units.find(u => u.team !== 'player' && u.alive);
      const adj = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => b.grid.tile(foe.x+dx, foe.y+dy))
        .find(t => t && t.t !== 'x' && !b.units.some(o => o.alive && o !== me && o.x === t.x && o.y === t.y));
      if (adj) { me.x = adj.x; me.y = adj.y; }
      const kindsFor = async (weapon, abId) => {
        if (weapon) me.gear.weapon = weapon;
        rd.fx = [];
        const p = rd.animateAction(me, ABILITIES[abId], foe.x, foe.y);
        const seen = new Set();
        for (let i = 0; i < 26; i++) { rd.fx.forEach(f => seen.add(f.kind)); await new Promise(r => setTimeout(r, 30)); }
        await p;
        return [...seen];
      };
      const out = {};
      out.sword = await kindsFor('broadsword', 'attack');
      out.spear = await kindsFor('spear', 'attack');
      out.bow = await kindsFor('shortbow', 'attack');
      out.fire = await kindsFor(null, 'fire');
      out.cure = await kindsFor(null, 'cure');
      // Nothing may outlive its own duration.
      await new Promise(r => setTimeout(r, 700));
      rd.draw();
      out.leftOver = rd.fx.length;
      // A landed blow must be visible on the one who took it.
      b.hitChance = () => 100;
      me.gear.weapon = 'broadsword';
      const before = foe.hp;
      const done = b.applyAbility(me, ABILITIES.attack, foe.x, foe.y);
      let flash = false, recoil = false, shook = 0;
      for (let i = 0; i < 24; i++) {
        if (foe.hitAt) flash = true;
        if (foe.recoil) recoil = true;
        if (rd.shake) shook = Math.max(shook, rd.shake.mag);
        await new Promise(r => setTimeout(r, 35));
      }
      await done;
      out.impact = { flash, recoil, shook: Math.round(shook), damaged: foe.hp < before };
      return out;
    });
    ok('a sword sweeps an arc', r.sword.includes('slash'), r.sword.join(','));
    ok('a spear thrusts rather than throwing', r.spear.includes('thrust') && !r.spear.includes('shot'), r.spear.join(','));
    ok('a bow puts an arrow in the air', r.bow.includes('shot'), r.bow.join(','));
    ok('fire burns where it lands', r.fire.includes('flame'), r.fire.join(','));
    ok('a cure mends rather than cursing', r.cure.includes('motes') && !r.cure.includes('column'), r.cure.join(','));
    ok('no effect outlives its duration', r.leftOver === 0, `${r.leftOver} left`);
    ok('a landed blow flashes the one who took it', r.impact.flash && r.impact.damaged, JSON.stringify(r.impact));
    ok('a landed blow knocks the target back', r.impact.recoil, JSON.stringify(r.impact));
    ok('a landed blow shakes the view', r.impact.shook > 0, `mag ${r.impact.shook}`);

    // A figure is drawn taller than its own square, so it covers the tiles
    // behind it. While the game offers a choice, what is on offer must win.
    await page.click('#action-menu button[data-a="move"]').catch(() => {});
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'move', null, { timeout: 10000 });
    await page.waitForFunction(() => !game.renderer.camAnim, null, { timeout: 5000 }).catch(() => {});
    const reach = await page.evaluate(() => {
      const b = game.battle, r = game.ui.r;
      const W = r.cv.width, H = r.cv.height, z = r.zoom || 1;
      let total = 0, answered = 0, behindSomeone = 0;
      for (const n of game.ui.turn.reach.values()) {
        if (n.cost <= 0) continue;
        const t = b.grid.tile(n.x, n.y);
        if (!t) continue;
        const s = r.toScreen(t.x, t.y, t.h);
        const px = (s.sx - W / 2) * z + W / 2, py = (s.sy - H / 2) * z + H / 2;
        if (px < 0 || px > W || py < 0 || py > H) continue;
        total++;
        // The tap must not be swallowed by something that is not on offer.
        // Where two offered tiles overlap on screen either answer is fair, so
        // the requirement is that a destination resolves to *a* destination.
        const got = r.pickTile(px, py);
        if (got && (got === t || r.hl.move.has(`${got.x},${got.y}`))) answered++;
        const w = r.toWorld(px, py);
        for (const o of b.units) {
          if (!o.alive || o.x < 0 || (o.x === t.x && o.y === t.y)) continue;
          const q = r.unitScreenPos(o);
          if (w.x >= q.sx - 13 && w.x <= q.sx + 13 && w.y >= q.sy - 32 && w.y <= q.sy + 8) { behindSomeone++; break; }
        }
      }
      return { total, answered, behindSomeone };
    });
    // A pinch fires many times a second. A camera animation per event left
    // eight of them fighting over the same value.
    const pinch = await page.evaluate(async () => {
      const r = game.ui.r;
      let peak = 0, biggest = 0, last = r.cam.x;
      for (let i = 0; i < 24; i++) {
        r.setZoom((r.zoom || 1) * 1.02);
        peak = Math.max(peak, r.camAnim);
        await new Promise(res => requestAnimationFrame(res));
        biggest = Math.max(biggest, Math.abs(r.cam.x - last));
        last = r.cam.x;
      }
      for (let i = 0; i < 40; i++) await new Promise(res => setTimeout(res, 10));
      return { peak, after: r.camAnim };
    });
    ok('a pinch never stacks camera animations', pinch.peak === 0 && pinch.after === 0,
       `peak ${pinch.peak}, ${pinch.after} left running`);

    // Party units outlive a battle, and so did the state hung on them.
    const fresh = await page.evaluate(async () => {
      const b = game.battle, r = game.ui.r;
      const u = b.units.find(x => x.team === 'player' && x.alive);
      r.animateMove(u, [{ x: u.x, y: u.y }, { x: u.x + 1, y: u.y }]);
      await new Promise(res => setTimeout(res, 40));
      const caught = !!u.anim;
      u.hitAt = performance.now();
      u.recoil = { a: 0, t0: performance.now(), dur: 9e9, mag: 8 };
      const genBefore = r.camGen;
      r.setBattle(b);
      return { caught, anim: !!u.anim, hit: !!u.hitAt, recoil: !!u.recoil, genRose: r.camGen > genBefore };
    });
    ok('a new battle starts with nothing left over from the last',
       fresh.caught && !fresh.anim && !fresh.hit && !fresh.recoil && fresh.genRose,
       JSON.stringify(fresh));

    ok('a tap on a visible destination is never swallowed by a figure',
       reach.total > 0 && reach.answered === reach.total,
       `${reach.answered}/${reach.total} reachable, ${reach.behindSomeone} of them behind a figure`);
  }

  // --- reduced motion ------------------------------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 660 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(String(e)));
    await toBattle(page);
    const r = await page.evaluate(async () => {
      const b = game.battle, rd = game.ui.r;
      const me = b.units.find(u => u.team === 'player' && u.alive);
      const foe = b.units.find(u => u.team !== 'player' && u.alive);
      const t0 = performance.now();
      await rd.animateAction(me, ABILITIES.fire, foe.x, foe.y);
      const ms = performance.now() - t0;
      b.hitChance = () => 100;
      const done = b.applyAbility(me, ABILITIES.attack, foe.x, foe.y);
      let shook = false, recoil = false, flash = false;
      for (let i = 0; i < 10; i++) {
        if (rd.shake) shook = true;
        if (foe.recoil) recoil = true;
        if (foe.hitAt) flash = true;
        await new Promise(r => setTimeout(r, 30));
      }
      await done;
      return { ms: Math.round(ms), shook, recoil, flash, reduced: reducedMotion() };
    });
    ok('reduced motion is detected', r.reduced, JSON.stringify(r));
    ok('reduced motion keeps a spell brief', r.ms < 260, `${r.ms}ms`);
    ok('reduced motion does not shake the view', !r.shook);
    ok('reduced motion does not shove the target', !r.recoil);
    ok('reduced motion still says who was hit', r.flash);
    const cam = await page.evaluate(async () => {
      const r = game.ui.r;
      r.cam.x = 0; r.cam.y = 0;
      const p = r.panTo(300, 200, 300);
      const during = { x: r.cam.x, anim: r.camAnim };
      await p;
      return { during, after: { x: r.cam.x, anim: r.camAnim } };
    });
    ok('reduced motion moves the camera without sliding it',
       cam.during.anim === 0 && cam.during.x !== 0, JSON.stringify(cam));
    await ctx.close();
  }

  console.log('ERRORS:', errs.length ? errs : 'none');
  if (errs.length) fails++;
  await browser.close();
  console.log(fails ? `\n${fails} animation check(s) FAILED` : '\nall animation checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
