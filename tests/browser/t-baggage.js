const { BASE, ALT } = require('./lib');
/* The baggage through the real screens: shelved by category and kind,
   equipping and selling from the shelf, the worn table, and the shop and
   Formation menus shelved the same way. */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-baggage'); await page.waitForSelector('#screen-inventory.active');
  ok('an empty baggage says so', (await page.textContent('#bag-list')).includes('empty'));
  await page.click('#btn-bag-back'); await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => { game.state.gil = 9000; for (const id of ['longsword', 'longsword', 'longbow', 'plateMail', 'wizardRobe', 'powerGlove', 'kiteShield', 'ironHelm']) game.invAdd(id); game.showWorld(); });
  const stock = await page.textContent('#world-stock');
  ok('the camp counts the baggage and offers it', /Baggage: 8 spare items/.test(stock), stock);
  await page.click('#world-stock'); await page.waitForSelector('#screen-inventory.active');
  const tabs = await page.evaluate(() => [...document.querySelectorAll('#bag-tabs button')].map(b => b.textContent));
  ok('categories appear as tabs, only those with something in them', tabs.join(',') === 'All,Weapons,Shields,Head,Body,Accessories', tabs.join(','));
  const heads = await page.evaluate(() => [...document.querySelectorAll('#bag-list h3')].map(h => h.textContent));
  ok('the shelves are kinds in order', heads.join(',') === 'Swords,Bows,Heavy Armour,Robes,Helms,Shields,Accessories', heads.join(','));
  await page.click('#bag-tabs button[data-cat="weapon"]'); await page.waitForTimeout(100);
  const chips = await page.evaluate(() => [...document.querySelectorAll('#bag-types .chip')].map(b => b.textContent));
  ok('a category offers its kinds as chips', chips.join(',') === 'Every kind,Swords,Bows', chips.join(','));
  await page.click('#bag-types .chip[data-type="bow"]'); await page.waitForTimeout(100);
  const rows = await page.evaluate(() => [...document.querySelectorAll('#bag-list .inv-row')].map(r => r.dataset.item));
  ok('a kind chip narrows the shelf', rows.join(',') === 'longbow', rows.join(','));
  await page.screenshot({ path: `${S}/baggage.png` });
  // Equip from the shelf: the sword goes to Garret, the count drops, the worn table shows it.
  await page.click('#bag-tabs button[data-cat="all"]'); await page.waitForTimeout(100);
  const garret = await page.evaluate(() => game.state.party.find(u => u.name === 'Garret').id);
  await page.selectOption('.inv-row[data-item="longsword"] select[data-wearer]', garret);
  await page.click('.inv-row[data-item="longsword"] button[data-equip]'); await page.waitForTimeout(100);
  const after = await page.evaluate(() => ({ worn: game.state.party.find(u => u.name === 'Garret').gear.weapon, spare: game.invCount('longsword'), returned: game.invCount('shortSword'), cell: [...document.querySelectorAll('#bag-worn tr')].find(r => r.textContent.includes('Garret')).textContent }));
  // A free starter piece belongs to its unit and is not kept in the shared baggage.
  ok('a piece handed over from the shelf is worn, and the worn table shows it', after.worn === 'longsword' && after.spare === 1 && after.returned === 0 && /Longsword/.test(after.cell), JSON.stringify(after));
  // Take it off again from the worn table.
  await page.click(`#bag-worn button[data-unequip="${garret}:weapon"]`); await page.waitForTimeout(100);
  const off = await page.evaluate(() => ({ worn: game.state.party.find(u => u.name === 'Garret').gear.weapon, spare: game.invCount('longsword') }));
  ok('the worn table returns a piece to the baggage', off.worn === undefined && off.spare === 2, JSON.stringify(off));
  // Sell from the shelf.
  const gil0 = await page.evaluate(() => game.state.gil);
  await page.click('.inv-row[data-item="powerGlove"] button[data-sell]'); await page.waitForTimeout(100);
  const sold = await page.evaluate(() => ({ have: game.invCount('powerGlove'), gil: game.state.gil }));
  ok('selling from the shelf pays half', sold.have === 0 && sold.gil === gil0 + 450, JSON.stringify(sold));
  ok('the baggage stays on its shelf after a sale', await page.isVisible('#screen-inventory.active'));
  // The shop shelves by kind within each slot; Formation groups the dropdowns.
  await page.click('#btn-bag-shop'); await page.waitForSelector('#screen-shop.active');
  const shopHeads = await page.evaluate(() => ({ h3: [...document.querySelectorAll('#shop-list h3')].map(h => h.textContent), h4: [...document.querySelectorAll('#shop-list h4')].map(h => h.textContent).slice(0, 6) }));
  ok('the shop shelves by category and, within it, by kind', shopHeads.h3[0] === 'Weapons' && shopHeads.h4.includes('Swords') && shopHeads.h4.includes('Knives'), JSON.stringify(shopHeads));
  await page.click('#shop-tabs button[data-tab="sell"]'); await page.waitForTimeout(100);
  const sellHeads = await page.evaluate(() => [...document.querySelectorAll('#shop-list h3')].map(h => h.textContent));
  ok('the sell tab shelves by kind too', sellHeads.includes('Swords') && sellHeads.includes('Robes'), sellHeads.join(','));
  await page.click('#btn-shop-back'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  const groups = await page.evaluate(() => [...document.querySelectorAll('select[data-slot="weapon"] optgroup')].map(g => g.label));
  ok('Formation groups the weapon dropdown by kind', groups.length >= 1 && groups.includes('Swords'), groups.join(','));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'all baggage checks passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
