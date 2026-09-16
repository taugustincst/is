const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  // Survive objective: the bar counts up and the battle ends on schedule.
  await page.evaluate(() => {
    BattleUI.prototype.awaitPlayerTurn = function (u) { return game.battle.aiTurn(u); };
    game.state.party.forEach(u => { u.level = 8; game.syncGear(u); });
    game.runBattle(MAPS.dunmarch, CAMPAIGN[4].enemies, 0, { objective: { type: 'survive', turns: 8, protectLeader: true } });
  });
  await beginBattle(page);
  console.log('objective bar:', await page.textContent('#objective'));
  await page.waitForTimeout(2500);
  console.log('mid-battle bar:', await page.textContent('#objective'));
  await page.waitForSelector('#screen-results.active', { timeout: 90000 });
  console.log('result:', await page.textContent('#results-title'), '| reason:', (await page.textContent('.res-reason').catch(() => '(none)')).trim());
  await page.screenshot({ path: `${S}/shot-results.png` });
  await page.click('#btn-results');
  await page.evaluate(() => game.showWorld());
  await page.waitForSelector('#screen-world.active');
  // Leader lost ends the battle even with allies standing.
  await page.evaluate(() => {
    game.runBattle(MAPS.verdant, [{ job: 'knight', level: 9, x: 3, y: 2 }], 0, { objective: { type: 'rout', protectLeader: true } });
  });
  await beginBattle(page);
  const r = await page.evaluate(async () => {
    const b = game.battle, lead = b.objective.leader;
    lead.hp = 0; b.onUnitKO(lead);
    const koShown = lead.koCount;
    // Run the countdown out.
    for (let i = 0; i < 3; i++) await b.tickDown(lead);
    b.checkEnd();
    return { koShown, over: b.over, result: b.result, why: b.endReason, onField: b.onField(lead) };
  });
  console.log('leader lost:', JSON.stringify(r));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
