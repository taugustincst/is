const { BASE, ALT } = require('./lib');
const { open, beginBattle } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(BASE + '/index.html');
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  const step = async (label) => {
    const before = await page.evaluate(() => game.screen);
    const handled = await page.evaluate(() => handleBack());
    await page.waitForTimeout(80);
    const after = await page.evaluate(() => game.screen);
    console.log(`${label.padEnd(22)} ${before} -> ${after}  (handled: ${handled})`);
  };
  await page.click('#btn-shop'); await page.waitForSelector('#screen-shop.active');
  await step('back from shop');
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  await step('back from formation');
  await step('back from camp');
  await page.evaluate(() => game.showWorld());
  // In battle it cancels rather than leaving.
  await page.evaluate(() => { game.state.party.forEach(u => { u.level = 6; game.syncGear(u); });
    game.runBattle(MAPS.verdant, CAMPAIGN[0].enemies, 0, { objective: { type: 'rout' } }); });
  await beginBattle(page);
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.click('#action-menu button[data-a="move"]');
  await page.waitForFunction(() => game.ui.turn.mode === 'move');
  const h1 = await page.evaluate(() => handleBack());
  await page.waitForTimeout(100);
  console.log('back in battle (move mode) ->', await page.evaluate(() => game.ui.turn.mode), '| handled:', h1, '| still in battle:', await page.evaluate(() => game.screen === 'battle'));
  // Help overlay closes first.
  await page.click('#btn-help');
  const h2 = await page.evaluate(() => handleBack());
  console.log('back with help open -> help closed:', await page.evaluate(() => !document.getElementById('help').classList.contains('open')), '| handled:', h2);
  // A browser back gesture must not leave the page.
  const url = page.url();
  await page.goBack().catch(() => {});
  await page.waitForTimeout(200);
  console.log('browser back stayed on the game:', page.url() === url);
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
