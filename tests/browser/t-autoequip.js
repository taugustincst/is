const { open } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => { const u = game.state.party[0]; u.jp.squire = 2000; u.jpTotal.squire = 2000; });
  await page.click('#btn-formation');
  await page.waitForSelector('#screen-formation.active');
  await page.evaluate(() => document.querySelector('button[data-learn="defend"]').click());
  await page.waitForTimeout(150);
  console.log('after learning Defend:', await page.evaluate(() => JSON.stringify(game.state.party[0].passives)));
  console.log('toast:', await page.textContent('#toast'));
  // A second support passive must not displace the first.
  await page.evaluate(() => { const u = game.state.party[0]; u.job = 'chemist'; u.jp.chemist = 2000; game.syncGear(u); game.openFormation(0); });
  await page.waitForTimeout(120);
  await page.evaluate(() => { const b = document.querySelector('button[data-learn="autoPotion"]'); if (b) b.click(); });
  await page.waitForTimeout(150);
  console.log('after learning Auto-Potion (a reaction):', await page.evaluate(() => JSON.stringify(game.state.party[0].passives)));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
