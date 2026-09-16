const { open } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  console.log('start gil:', await page.evaluate(() => game.state.gil));
  await page.click('#btn-shop');
  await page.waitForSelector('#screen-shop.active');
  const stock = await page.evaluate(() => document.querySelectorAll('#shop-list button[data-buy]').length);
  console.log('shop stock entries:', stock);
  await page.screenshot({ path: `${S}/shot-shop.png` });
  // Buy the first affordable item, then check gil and inventory.
  const bought = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#shop-list button[data-buy]')].find(x => !x.disabled);
    const id = b.dataset.buy; b.click(); return id;
  });
  await page.waitForTimeout(150);
  console.log('bought', bought, '| gil now', await page.evaluate(() => game.state.gil), '| inv', await page.evaluate(() => JSON.stringify(game.state.inventory)));
  // Sell tab
  await page.click('#shop-tabs button[data-tab="sell"]');
  await page.waitForTimeout(100);
  console.log('sell rows:', await page.evaluate(() => document.querySelectorAll('#shop-list button[data-sell]').length));
  await page.evaluate(() => document.querySelector('#shop-list button[data-sell]').click());
  await page.waitForTimeout(120);
  console.log('after sell: gil', await page.evaluate(() => game.state.gil), 'inv', await page.evaluate(() => JSON.stringify(game.state.inventory)));
  // Buy a set, then equip in formation
  await page.evaluate(() => { game.state.gil = 5000; ['broadsword','buckler','ironHelm','leatherArmor','leatherBoots'].forEach(i => game.invAdd(i)); });
  await page.click('#btn-shop-back');
  await page.click('#btn-formation');
  await page.waitForSelector('#screen-formation.active');
  const before = await page.evaluate(() => { const u = game.state.party[0]; return { hp: u.maxHp, pa: u.pa, gear: JSON.stringify(u.gear) }; });
  await page.evaluate(() => document.getElementById('btn-optimize').click());
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => { const u = game.state.party[0]; return { hp: u.maxHp, pa: u.pa, gear: JSON.stringify(u.gear), ev: u.evade }; });
  console.log('optimize:', JSON.stringify(before), '->', JSON.stringify(after));
  await page.screenshot({ path: `${S}/shot-equip.png` });
  // Manual equip via select
  const slots = await page.evaluate(() => [...document.querySelectorAll('select[data-slot]')].map(s => s.dataset.slot));
  console.log('equip slots rendered:', slots.join(','));
  await page.evaluate(() => { game.formTab = 'gear'; game.renderFormationDetail(); });
  await page.selectOption('select[data-slot="head"]', '');
  await page.waitForTimeout(120);
  console.log('after unequip head:', await page.evaluate(() => JSON.stringify(game.state.party[0].gear)), 'inv', await page.evaluate(() => JSON.stringify(game.state.inventory)));
  // Job change should return incompatible gear to stock
  await page.selectOption('#sel-job', 'chemist').catch(() => {});
  await page.waitForTimeout(150);
  console.log('after job change to chemist:', await page.evaluate(() => JSON.stringify(game.state.party[0].gear)), '| job', await page.evaluate(() => game.state.party[0].job));
  console.log('inv now:', await page.evaluate(() => JSON.stringify(game.state.inventory)));
  // Save/load round trip keeps gear
  await page.click('#btn-formation-back');
  await page.click('#btn-save');
  await page.reload();
  await page.click('#btn-continue');
  await page.waitForSelector('#screen-world.active');
  console.log('after reload gear:', await page.evaluate(() => JSON.stringify(game.state.party[0].gear)), 'inv', await page.evaluate(() => JSON.stringify(game.state.inventory)));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
