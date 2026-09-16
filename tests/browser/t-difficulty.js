const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  console.log('default:', await page.evaluate(() => game.state.difficulty));
  console.log('buttons:', await page.evaluate(() => [...document.querySelectorAll('#world-difficulty button')].map(b => b.dataset.diff).join(',')));
  const stats = {};
  for (const d of ['squire', 'knight', 'paladin']) {
    await page.evaluate(() => game.showCampTab('options'));
    await page.click(`#world-difficulty button[data-diff="${d}"]`);
    await page.waitForTimeout(80);
    stats[d] = await page.evaluate(() => {
      const foes = CAMPAIGN[4].enemies.map(sp => makeEnemy(sp, game.state.difficulty));
      return { lv: foes.map(f => f.level).join('/'), hp: foes.reduce((a, f) => a + f.maxHp, 0),
               wpn: foes.map(f => f.weapon.power).join('/') };
    });
  }
  for (const [d, v] of Object.entries(stats)) console.log(d.padEnd(8), 'levels', v.lv, '| total HP', v.hp, '| weapon power', v.wpn);
  // The boss must never drop below its written level.
  const boss = await page.evaluate(() => {
    const spec = CAMPAIGN[6].enemies.find(e => e.boss);
    return ['squire', 'knight', 'paladin'].map(d => makeEnemy(spec, d).level).join('/');
  });
  console.log('boss level by difficulty (squire/knight/paladin):', boss);
  // Reward multiplier and persistence.
  await page.evaluate(() => game.showCampTab('options'));
  await page.click('#world-difficulty button[data-diff="squire"]');
  await page.click('#btn-save');
  await page.reload();
  await page.click('#btn-continue');
  await page.waitForSelector('#screen-world.active');
  console.log('difficulty survived reload:', await page.evaluate(() => game.state.difficulty));
  // An old save without the field falls back safely.
  const legacy = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('elderon-tactics-save'));
    delete raw.difficulty; localStorage.setItem('elderon-tactics-save', JSON.stringify(raw));
    game.loadGame(); return game.state.difficulty;
  });
  console.log('legacy save defaults to:', legacy);
  // A real battle runs on the chosen setting.
  await page.evaluate(() => { BattleUI.prototype.awaitPlayerTurn = function (u) { return game.battle.aiTurn(u); };
    game.state.difficulty = 'squire';
    game.state.party.forEach(u => { u.level = 6; game.syncGear(u); });
    game.runBattle(MAPS.verdant, CAMPAIGN[0].enemies, 100, { objective: { type: 'rout' } }); });
  await beginBattle(page);
  console.log('enemy levels in play:', await page.evaluate(() => game.battle.units.filter(u => u.team === 'enemy').map(u => u.level).join(',')));
  await page.waitForSelector('#screen-results.active', { timeout: 90000 });
  console.log('result:', (await page.textContent('#results-title')).trim());
  await page.screenshot({ path: `${S}/shot-difficulty.png` });
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
