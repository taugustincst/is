const { open, beginBattle, clickTile } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  // Shop shows what a piece answers.
  await page.evaluate(() => { game.state.chapter = 5; game.state.gil = 99999; game.openShop('buy'); });
  await page.waitForTimeout(120);
  const shopText = await page.textContent('#shop-list');
  console.log('shop lists resistances:', /Fire resists|Thunder absorbs|Ice resists/.test(shopText));
  console.log('sample:', (shopText.match(/Storm Mail[^\n]*/) || ['(none)'])[0].trim().slice(0, 80));
  await page.click('#btn-shop-back');
  // Formation lists a unit's affinities once it wears elemental gear.
  await page.evaluate(() => { const u = game.state.party[0];
    game.invAdd('stormMail'); game.equip(u, 'body', 'stormMail'); game.openFormation(0); });
  await page.waitForTimeout(120);
  console.log('formation shows elements:', /Elements:/.test(await page.textContent('#form-detail')));
  await page.click('#btn-formation-back');
  // Battle: unit card and ability info name the element.
  await page.evaluate(() => {
    game.state.party[0].job = 'blackMage'; game.state.party[0].level = 9;
    game.state.party[0].learned.fire = true; game.state.party[0].learned.blizzard = true;
    game.syncGear(game.state.party[0]);
    game.state.party.forEach(u => { u.level = 9; game.syncGear(u); });
    game.runBattle(MAPS.verdant, [{ job: 'bomb', level: 6, x: 4, y: 1 }], 0, { objective: { type: 'rout' } });
  });
  await beginBattle(page);
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  // Hover the bomb to read its card.
  const bomb = await page.evaluate(() => { const e = game.battle.units.find(u => u.team === 'enemy'); return [e.x, e.y]; });
  await clickTile(page, bomb[0], bomb[1]).catch(() => {});
  await page.waitForTimeout(150);
  const card = await page.textContent('#unit-card');
  console.log('unit card shows affinity:', /Fire absorbs|Ice weak/.test(card), '|', card.replace(/\s+/g, ' ').slice(-60));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await page.screenshot({ path: `${S}/shot-elements.png` });
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
