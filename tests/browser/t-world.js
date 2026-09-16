const { open } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  console.log('ch1 card:', (await page.textContent('#world-next')).replace(/\s+/g, ' ').trim());
  for (const ci of [4, 6]) {
    await page.evaluate((ci) => { game.state.chapter = ci; game.showWorld(); }, ci);
    await page.waitForTimeout(80);
    console.log(`ch${ci + 1} card:`, (await page.textContent('#world-next')).replace(/\s+/g, ' ').trim());
  }
  await page.evaluate(() => { game.state.chapter = 0; game.showWorld(); });
  await page.screenshot({ path: `${S}/shot-world.png` });
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
