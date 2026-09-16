const { open, beginBattle } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => { BattleUI.prototype.awaitPlayerTurn = function (u) { return game.battle.aiTurn(u); }; });
  // Walk into a fight far above the party's weight so it is lost.
  await page.click('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await beginBattle(page);
  await page.evaluate(() => { game.battle.units.filter(u => u.team === 'enemy').forEach(e => { e.level = 20; }); });
  await page.waitForSelector('#screen-results.active', { timeout: 120000 });
  const res = (await page.textContent('#results-title')).trim();
  const before = await page.evaluate(() => game.state.party.map(u => u.exp + '/' + (u.jp.squire || u.jp.chemist || 0)).join(' '));
  await page.click('#btn-results');
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  await page.reload();
  await page.click('#btn-continue');
  await page.waitForSelector('#screen-world.active');
  const after = await page.evaluate(() => game.state.party.map(u => u.exp + '/' + (u.jp.squire || u.jp.chemist || 0)).join(' '));
  console.log('battle:', res);
  console.log('exp/jp before reload:', before);
  console.log('exp/jp after  reload:', after);
  console.log('progress kept through a defeat:', before === after && /[1-9]/.test(before));
  console.log('chapter still 0:', await page.evaluate(() => game.state.chapter));
  console.log('party healed:', await page.evaluate(() => game.state.party.every(u => u.hp === u.maxHp)));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
