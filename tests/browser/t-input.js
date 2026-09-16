const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => { game.state.party.forEach(u => { u.level = 5; game.syncGear(u); });
    game.runBattle(MAPS.verdant, [{ job: 'squire', level: 3, x: 8, y: 2 }], 0, { objective: { type: 'rout' } }); });
  await beginBattle(page);
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  // Mouse click still selects a tile and opens Move.
  const zoom0 = await page.evaluate(() => game.renderer.zoom);
  await page.keyboard.press('=');
  await page.keyboard.press('=');
  const zoom1 = await page.evaluate(() => game.renderer.zoom);
  await page.keyboard.press('0');
  const zoom2 = await page.evaluate(() => game.renderer.zoom);
  console.log('keyboard zoom:', zoom0.toFixed(2), '->', zoom1.toFixed(2), '-> recentre', zoom2.toFixed(2));
  const cam0 = await page.evaluate(() => ({ ...game.renderer.cam }));
  await page.keyboard.press('ArrowLeft');
  const cam1 = await page.evaluate(() => ({ ...game.renderer.cam }));
  console.log('arrow pan moved camera:', cam1.x !== cam0.x);
  // Digit keys drive the command menu.
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  console.log('digit 1 opened:', await page.evaluate(() => game.ui.turn.mode));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  console.log('escape returned to:', await page.evaluate(() => game.ui.turn.mode));
  // Touch: a tap on a reachable tile moves; a drag pans without moving.
  await page.keyboard.press('2');
  await page.waitForTimeout(120);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { game.ui.setMode('move'); });
  await page.waitForTimeout(100);
  const target = await page.evaluate(() => {
    let best = null;
    for (const n of game.ui.turn.reach.values()) if (n.cost > 0 && (!best || n.cost > best.cost)) best = n;
    const s = game.renderer.toScreen(best.x, best.y, game.battle.grid.height(best.x, best.y));
    const cv = document.getElementById('battle-canvas'), r = cv.getBoundingClientRect(), z = game.renderer.zoom;
    const px = (s.sx - cv.width / 2) * z + cv.width / 2, py = (s.sy - cv.height / 2) * z + cv.height / 2;
    return { x: r.left + px * r.width / cv.width, y: r.top + py * r.height / cv.height, tx: best.x, ty: best.y };
  });
  const camBefore = await page.evaluate(() => ({ ...game.renderer.cam }));
  // Drag with touch: camera moves, no move command issued.
  await page.touchscreen.tap(10, 400).catch(() => {});
  const cd = await page.evaluate(() => document.getElementById('battle-canvas').getBoundingClientRect());
  await page.mouse.move(cd.x + 200, cd.y + 300);
  await page.mouse.down();
  await page.mouse.move(cd.x + 320, cd.y + 340, { steps: 6 });
  await page.mouse.up();
  const camAfter = await page.evaluate(() => ({ ...game.renderer.cam }));
  console.log('drag panned camera:', Math.abs(camAfter.x - camBefore.x) > 20, '| still in move mode:', await page.evaluate(() => game.ui.turn.mode));
  // Tap (no drag) commits the move. Recompute the point: the drag moved the camera.
  const target2 = await page.evaluate(() => {
    let best = null;
    for (const n of game.ui.turn.reach.values()) if (n.cost > 0 && (!best || n.cost > best.cost)) best = n;
    const s = game.renderer.toScreen(best.x, best.y, game.battle.grid.height(best.x, best.y));
    const cv = document.getElementById('battle-canvas'), r = cv.getBoundingClientRect(), z = game.renderer.zoom;
    const px = (s.sx - cv.width / 2) * z + cv.width / 2, py = (s.sy - cv.height / 2) * z + cv.height / 2;
    return { x: r.left + px * r.width / cv.width, y: r.top + py * r.height / cv.height, tx: best.x, ty: best.y };
  });
  target.tx = target2.tx; target.ty = target2.ty;
  await page.mouse.click(target2.x, target2.y);
  // Wait for the move animation to finish committing, not just to start.
  await page.waitForFunction(() => game.ui.turn && ['menu', 'wait', 'act'].includes(game.ui.turn.mode), null, { timeout: 15000 });
  console.log('tap result:', await page.evaluate(([tx, ty]) => {
    const u = game.ui.turn.unit;
    return { want: tx + ',' + ty, got: u.x + ',' + u.y, moved: u.turnFlags.moved, mode: game.ui.turn.mode };
  }, [target.tx, target.ty]));
  await page.screenshot({ path: `${S}/shot-input.png` });
  // Narrow viewport should not overflow horizontally.
  await page.setViewportSize({ width: 420, height: 780 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  console.log('mobile horizontal overflow:', overflow);
  await page.screenshot({ path: `${S}/shot-mobile.png` });
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
