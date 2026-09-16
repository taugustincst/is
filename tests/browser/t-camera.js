const { BASE, ALT } = require('./lib');
// Checks the two camera findings: the board must stay visible however far you
// drag, and the desktop framing must not be squeezed by corner panels.
const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  let bad = 0;
  const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? '  [' + d + ']' : '')); if (!c) bad++; };

  for (const [label, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 412, height: 915 }]]) {
    await page.setViewportSize(vp);
    await page.goto(BASE + '/index.html');
    await page.evaluate(() => document.getElementById('btn-new').click());
    await page.waitForSelector('#screen-world.active');
    await page.evaluate(() => { game.state.party.forEach(u => { u.level = 6; game.syncGear(u); });
      game.runBattle(MAPS.thornwall, CAMPAIGN[6].enemies, 0, { objective: { type: 'rout' } }); });
    await beginBattle(page);
    await page.waitForTimeout(400);
    const framed = await page.evaluate(() => ({ zoom: game.renderer.zoom, insets: game.renderer.insets }));
    ok(`${label}: the board is framed at a usable zoom`, framed.zoom > 0.6,
       `zoom ${framed.zoom.toFixed(2)} insets ${JSON.stringify(framed.insets)}`);

    // Drag hard in each direction; some of the board must remain on screen.
    const onScreen = await page.evaluate(() => {
      const visible = () => {
        const g = game.battle.grid, r = game.renderer, z = r.zoom;
        const W = r.cv.width, H = r.cv.height;
        for (const row of g.tiles) for (const t of row) {
          if (t.t === 'x') continue;
          const s = r.toScreen(t.x, t.y, t.h);
          const px = (s.sx - W / 2) * z + W / 2, py = (s.sy - H / 2) * z + H / 2;
          if (px > -40 && px < W + 40 && py > -40 && py < H + 40) return true;
        }
        return false;
      };
      const out = {};
      for (const [dir, dx, dy] of [['right', 9000, 0], ['left', -9000, 0], ['down', 0, 9000], ['up', 0, -9000]]) {
        game.renderer.centerCamera();
        game.renderer.cam.x += dx; game.renderer.cam.y += dy;
        game.renderer.clampCamera();
        out[dir] = visible();
      }
      game.renderer.centerCamera();
      return out;
    });
    ok(`${label}: dragging any distance leaves the board on screen`,
       Object.values(onScreen).every(Boolean), JSON.stringify(onScreen));

    // A small resize (an address bar sliding away) must not reset the view.
    const resize = await page.evaluate(async ([w, h]) => {
      game.renderer.cam.x -= 120; game.renderer.setZoom(1.6);
      const before = { x: Math.round(game.renderer.cam.x), z: +game.renderer.zoom.toFixed(2) };
      const cv = document.getElementById('battle-canvas');
      Object.defineProperty(cv, 'clientHeight', { value: h - 60, configurable: true });
      game.renderer.fit();
      const afterSmall = { x: Math.round(game.renderer.cam.x), z: +game.renderer.zoom.toFixed(2) };
      // Now a real change of shape, as when the phone turns.
      Object.defineProperty(cv, 'clientWidth', { value: h, configurable: true });
      Object.defineProperty(cv, 'clientHeight', { value: w, configurable: true });
      game.renderer.fit();
      const afterTurn = { z: +game.renderer.zoom.toFixed(2) };
      return { before, afterSmall, afterTurn };
    }, [vp.width, vp.height]);
    ok(`${label}: a small resize keeps the player's zoom`, resize.afterSmall.z === resize.before.z,
       JSON.stringify(resize));
    ok(`${label}: turning the device re-frames`, resize.afterTurn.z !== resize.before.z, JSON.stringify(resize.afterTurn));
    await page.screenshot({ path: `${S}/cam-${label}.png` });
  }
  console.log('ERRORS:', errors.length ? errors.join('; ') : 'none');
  await browser.close();
  if (bad) process.exit(1);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
