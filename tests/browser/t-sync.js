const { open } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  const r = await page.evaluate(() => {
    const u = game.state.party[0];
    const before = JSON.stringify(game.state.inventory);
    game.invAdd('dagger'); game.invAdd('clothes');   // stock has a chemist-usable kit
    u.job = 'chemist'; game.syncGear(u);
    const afterA = { gear: JSON.stringify(u.gear), inv: JSON.stringify(game.state.inventory) };
    // Now with nothing in stock at all, the free kit must still arm the unit.
    game.state.inventory = {}; u.gear = {}; u.job = 'blackMage'; game.syncGear(u);
    return { before, afterA, afterB: { gear: JSON.stringify(u.gear), inv: JSON.stringify(game.state.inventory) }, wp: u.weapon.name };
  });
  console.log('took from stock:', JSON.stringify(r.afterA));
  console.log('fell back to kit:', JSON.stringify(r.afterB), '| weapon', r.wp);
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
