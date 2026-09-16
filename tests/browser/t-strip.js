const { BASE, ALT } = require('./lib');
const { open } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(BASE + '/index.html');
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => {
    BattleUI.prototype.awaitPlayerTurn = function () { return new Promise(() => {}); };
    game.state.party.forEach(u => { u.level = 6; game.syncGear(u); });
    game.runBattle(MAPS.hollowmere, CAMPAIGN[2].enemies, 0, { objective: { type: 'rout' } });
  });
  await page.waitForSelector('#deploy-panel.open');
  await page.waitForTimeout(200);
  const info = await page.evaluate(() => {
    const el = document.getElementById('turn-order');
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { rect: { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) },
             width: cs.width, display: cs.display, left: cs.left, right: cs.right, overflowX: cs.overflowX,
             scrollW: el.scrollWidth, rows: el.querySelectorAll('.order-row').length };
  });
  console.log('turn-order:', JSON.stringify(info));
  const insets = await page.evaluate(() => game.renderer.insets);
  console.log('renderer insets:', JSON.stringify(insets), '| zoom', await page.evaluate(() => game.renderer.zoom.toFixed(2)));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
