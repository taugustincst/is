const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.setViewportSize({ width: 414, height: 800 });
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.screenshot({ path: `${S}/shot-m-world.png` });
  await page.evaluate(() => { game.state.party.forEach(u => { u.level = 5; game.syncGear(u); });
    game.runBattle(MAPS.hollowmere, CAMPAIGN[2].enemies, 0, { objective: { type: 'rout' } }); });
  await page.waitForSelector('#deploy-panel.open');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${S}/shot-m-deploy.png` });
  await beginBattle(page);
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${S}/shot-m-battle.png` });
  // Panels must not overlap the top bar.
  const boxes = await page.evaluate(() => {
    const g = id => { const r = document.getElementById(id).getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) }; };
    return { top: g('battle-top'), order: g('turn-order'), card: g('unit-card'), log: g('log'), cmd: g('command') };
  });
  const overlap = (a, b) => !(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t);
  console.log('top vs order overlap:', overlap(boxes.top, boxes.order));
  console.log('top vs card overlap:', overlap(boxes.top, boxes.card));
  console.log('log vs command overlap:', overlap(boxes.log, boxes.cmd));
  console.log('order vs card overlap:', overlap(boxes.order, boxes.card));
  console.log('horizontal overflow:', await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1));
  console.log('zoom fits board:', await page.evaluate(() => game.renderer.zoom.toFixed(2)));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
