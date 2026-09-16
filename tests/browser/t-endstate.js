const { open } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  // Shop stock should widen as chapters pass.
  for (const ci of [0, 3, 6]) {
    const n = await page.evaluate((ci) => { game.state.chapter = ci; game.state.gil = 99999; game.openShop('buy');
      return document.querySelectorAll('#shop-list button[data-buy]').length; }, ci);
    console.log(`chapter ${ci + 1}: ${n} items in stock (tier ${await page.evaluate(() => game.shopTier())})`);
  }
  await page.click('#btn-shop-back');
  // End state after the final chapter.
  await page.evaluate(() => { game.state.chapter = 7; game.showWorld(); });
  await page.waitForTimeout(100);
  console.log('end card:', (await page.textContent('#world-next')).replace(/\s+/g, ' ').trim());
  console.log('march button disabled:', await page.isDisabled('#btn-battle'), '| label:', await page.textContent('#btn-battle'));
  console.log('training still available:', !(await page.isDisabled('#btn-train')));
  // Hiring cap and cost
  await page.evaluate(() => { game.state.gil = 99999; while (game.state.party.length < 8) game.hire('squire'); game.showWorld(); });
  await page.waitForTimeout(80);
  console.log('party at cap:', await page.evaluate(() => game.state.party.length), '| hire disabled:', await page.isDisabled('#btn-hire-squire'));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
