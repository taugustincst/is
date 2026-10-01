/* The forge, through the real screens: a city's smith betters what the
   company carries, makes what the city alone can make, breaks spare gear
   down and sells materials; a won field leaves materials; the baggage keeps
   them; a save keeps an improved piece; and no shelf or enemy ever sees a
   forge's work. */
const { BASE, open } = require('./lib');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  // A clean slate once, not on every load: the save made below must survive the reload.
  await page.evaluate(() => { localStorage.clear(); game.syncTitleButtons(); });
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  // Redwater open, a purse, and a baggage with the plain materials in it.
  await page.evaluate(() => {
    const s = game.state; s.chapter = 2; s.gil = 4000; s.cities.redwater = true;
    game.invAdd('ironIngot', 4); game.invAdd('oakHeartwood', 2); game.invAdd('broadsword', 1);
    game.showWorld(); game.goToCity('redwater');
  });
  const panel = await page.evaluate(() => ({ tabs: [...document.querySelectorAll('button[data-forge]')].map(b => b.dataset.forge), heads: [...document.querySelectorAll('#cities h4')].map(h => h.firstChild.textContent.trim()) }));
  ok('an open city has a forge with four pages beside its tavern, kennel and market', panel.heads.join(',') === 'Tavern,Kennel,Market,Forge' && panel.tabs.join(',') === 'improve,craft,salvage,materials', JSON.stringify(panel));

  // Improve: Rowan's short sword, worn, becomes Short Sword +1 and hits harder.
  const before = await page.evaluate(() => { const u = game.state.party[0]; return { id: u.gear.weapon, power: u.weapon.power, gil: game.state.gil, iron: game.invCount('ironIngot'), rows: document.querySelectorAll('button[data-improve]').length }; });
  ok('the Improve page lists what the company wears and holds', before.rows >= 5, `${before.rows} rows`);
  await page.click(`button[data-improve="u:${await page.evaluate(() => game.state.party[0].id)}:weapon"]`);
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => { const u = game.state.party[0]; return { id: u.gear.weapon, power: u.weapon.power, name: ITEMS[u.gear.weapon].name, gil: game.state.gil, iron: game.invCount('ironIngot'), toast: $('toast').textContent }; });
  ok('a worn piece is bettered where it is worn', after.id === before.id + '+1' && after.name === 'Short Sword +1' && after.power === before.power + 1, JSON.stringify(after));
  ok('the smith is paid in the piece\'s own material and gil', after.iron === before.iron - 1 && after.gil === before.gil - 120, `iron ${before.iron}->${after.iron}, gil ${before.gil}->${after.gil}`);
  ok('the toast says what it became', /Short Sword is now Short Sword \+1\./.test(after.toast), after.toast);
  // The third step wants ember glass, and is dimmed without it.
  const third = await page.evaluate(() => { const u = game.state.party[0]; u.gear.weapon = 'shortSword+2'; game.renderCities(); const b = document.querySelector(`button[data-improve="u:${u.id}:weapon"]`); const row = b.closest('.shop-row'); return { disabled: b.disabled, dim: row.classList.contains('unfit'), cost: row.querySelector('.cost').textContent }; });
  ok('the last step asks for ember glass, and waits without it', third.disabled && third.dim && /Ember Glass.*have 0/.test(third.cost), third.cost);
  await page.evaluate(() => { game.invAdd('emberGlass', 1); game.renderCities(); });
  await page.click(`button[data-improve="u:${await page.evaluate(() => game.state.party[0].id)}:weapon"]`);
  await page.waitForTimeout(150);
  const top = await page.evaluate(() => { const u = game.state.party[0]; return { id: u.gear.weapon, power: u.weapon.power, glass: game.invCount('emberGlass'), more: document.querySelector(`button[data-improve="u:${u.id}:weapon"]`) }; });
  ok('+3 is the top, and it is off the Improve page once reached', top.id === 'shortSword+3' && top.power === 8 && top.glass === 0 && top.more === null, JSON.stringify(top));

  // Craft: Redwater's recipes, and one made. The +3 took the iron; restock.
  await page.evaluate(() => game.invAdd('ironIngot', 3));
  await page.click('button[data-forge="craft"]');
  const craft = await page.evaluate(() => [...document.querySelectorAll('button[data-craft]')].map(b => b.dataset.craft + (b.disabled ? ':off' : '')));
  ok('the Craft page is the city\'s own recipes', craft.join(',') === 'quarryMaul,reaverMail', craft.join(','));
  const purse = await page.evaluate(() => game.state.gil);
  await page.click('button[data-craft="reaverMail"]'); await page.waitForTimeout(150);
  const made = await page.evaluate(() => ({ have: game.invCount('reaverMail'), iron: game.invCount('ironIngot'), gil: game.state.gil, fits: game.fitsList('reaverMail') }));
  ok('a recipe takes its materials and half its worth in gil, and the piece goes to the baggage', made.have === 1 && made.iron === 0 && made.gil === purse - 350 && made.fits.includes('Squire'), JSON.stringify(made));
  ok('a recipe cannot be made twice without the materials', await page.evaluate(() => document.querySelector('button[data-craft="reaverMail"]').disabled));

  // Salvage: the spare broadsword comes apart into iron.
  await page.click('button[data-forge="salvage"]');
  const listed = await page.evaluate(() => [...document.querySelectorAll('button[data-salvage]')].map(b => b.dataset.salvage));
  ok('the Salvage page lists spare gear, not materials', listed.includes('broadsword') && listed.includes('reaverMail') && !listed.includes('oakHeartwood'), listed.join(','));
  await page.click('button[data-salvage="broadsword"]'); await page.waitForTimeout(150);
  const broke = await page.evaluate(() => ({ sword: game.invCount('broadsword'), iron: game.invCount('ironIngot') }));
  ok('a spare piece breaks down into its own material', broke.sword === 0 && broke.iron === 1, JSON.stringify(broke));

  // Materials: what Redwater sells, and what it does not.
  await page.click('button[data-forge="materials"]');
  const shop = await page.evaluate(() => ({ sold: [...document.querySelectorAll('button[data-mat]')].map(b => b.dataset.mat), text: $('cities').innerText }));
  ok('a small town\'s forge sells the plain materials and not ember glass', shop.sold.join(',') === 'ironIngot,oakHeartwood,silkBolt' && !shop.sold.includes('emberGlass'), shop.sold.join(','));
  const gilBefore = await page.evaluate(() => game.state.gil);
  await page.click('button[data-mat="silkBolt"]'); await page.waitForTimeout(150);
  ok('buying a material costs its price and puts it in the baggage', await page.evaluate((g) => game.invCount('silkBolt') === 1 && game.state.gil === g - 140, gilBefore));

  // No shelf, no wagon find, no enemy carries a forge's work.
  const shelves = await page.evaluate(() => {
    game.openShop('buy'); const wagon = [...document.querySelectorAll('#shop-list button[data-buy]')].map(b => b.dataset.buy); game.showWorld();
    const stray = wagon.filter(id => ITEMS[id].base || ITEMS[id].forge || ITEMS[id].slot === 'material');
    const finds = []; for (let i = 0; i < 60; i++) { const id = game.rollLoot(true); if (ITEMS[id].base || ITEMS[id].forge || ITEMS[id].slot === 'material') finds.push(id); }
    const foes = []; for (const job of ['knight', 'gunner', 'archer', 'corsair']) for (const id of Object.values(enemyGearFor(job, 24, 1))) if (ITEMS[id].base || ITEMS[id].forge) foes.push(id);
    return { wagon: wagon.length, stray, finds, foes };
  });
  ok('the wagon, the field\'s finds and the enemy never carry a forge\'s work', shelves.wagon > 20 && !shelves.stray.length && !shelves.finds.length && !shelves.foes.length, JSON.stringify(shelves));

  // The baggage shelves materials on their own page, with no one to equip them.
  await page.evaluate(() => game.openBaggage()); await page.waitForSelector('#screen-inventory.active');
  const bag = await page.evaluate(() => ({ tabs: [...document.querySelectorAll('#bag-tabs button')].map(b => b.dataset.cat), count: $('bag-count').textContent }));
  ok('the baggage has a Materials page and counts them apart', bag.tabs.includes('material') && /material/.test(bag.count), JSON.stringify(bag));
  await page.click('#bag-tabs button[data-cat="material"]');
  const matRows = await page.evaluate(() => [...document.querySelectorAll('.inv-row')].map(r => ({ id: r.dataset.item, material: ITEMS[r.dataset.item].slot === 'material', equip: !!r.querySelector('button[data-equip]'), sell: !!r.querySelector('button[data-sell]'), dim: r.classList.contains('unfit'), note: r.querySelector('.fits').textContent })));
  ok('a material can be sold but not worn, and is not dimmed for it', matRows.length >= 2 && matRows.every(r => r.material && !r.equip && r.sell && !r.dim && /for the forge/.test(r.note)), JSON.stringify(matRows));
  await page.click('#btn-bag-back'); await page.waitForSelector('#screen-world.active');
  ok('the camp counts materials apart from spare gear', /spare item.*material/.test(await page.evaluate(() => $('world-stock').textContent)), await page.evaluate(() => $('world-stock').textContent));

  // A won field leaves materials, and the results screen says so.
  const field = await page.evaluate(() => { const d = fieldMaterials(3, true, () => 0.49); return { d, n: Object.values(d).reduce((a, b) => a + b, 0), low: Object.keys(d).every(m => MATERIALS[m].tier <= 3) }; });
  ok('a rich field leaves three materials of the wagon\'s tiers', field.n === 3 && field.low, JSON.stringify(field.d));
  await page.evaluate(() => { game.results('victory', { exp: 10, gil: 100, events: [], materials: { ironIngot: 2, oakHeartwood: 1 } }, '', []); });
  ok('the results screen lists what was left for the forge', /For the forge: 2× Iron Ingot, 1× Oak Heartwood/.test(await page.evaluate(() => $('results-body').innerText)));
  await page.click('#btn-results');

  // A save keeps an improved piece and the materials, through a reload.
  await page.evaluate(() => game.showWorld());
  await page.click('#btn-save');
  await page.reload(); await page.waitForSelector('#screen-title.active');
  await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
  const kept = await page.evaluate(() => ({ weapon: game.state.party[0].gear.weapon, power: game.state.party[0].weapon.power, iron: game.invCount('ironIngot'), silk: game.invCount('silkBolt'), mail: game.invCount('reaverMail') }));
  ok('a save keeps the +3 and the baggage', kept.weapon === 'shortSword+3' && kept.power === 8 && kept.iron === 1 && kept.silk === 1 && kept.mail === 1, JSON.stringify(kept));
  // And the improved piece equips, shows and optimises like any other.
  const worn = await page.evaluate(() => { game.openFormation(0); game.formTab = 'gear'; game.renderFormationDetail(); const sel = document.querySelector('select[data-slot="weapon"]'); return { chosen: sel.value, label: sel.selectedOptions[0].textContent }; });
  ok('the Gear page shows the improved piece worn', worn.chosen === 'shortSword+3' && /Short Sword \+3/.test(worn.label), JSON.stringify(worn));

  // On a phone the forge fits the width.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { game.showWorld(); game.goToCity('redwater'); game.forgeTab = 'improve'; game.renderCities(); });
  await page.waitForTimeout(200);
  const wide = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, view: window.innerWidth, rows: document.querySelectorAll('button[data-improve]').length }));
  ok('the forge fits a phone', wide.page <= wide.view && wide.rows >= 4, JSON.stringify(wide));

  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(fails ? `${fails} forge check(s) FAILED` : 'all forge checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
