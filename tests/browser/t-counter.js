const { open, beginBattle } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  const r = await page.evaluate(async () => {
    BattleUI.prototype.awaitPlayerTurn = function (u) { return game.battle.aiTurn(u); };
    const p = game.state.party.slice(0, 1);
    p[0].job = 'monk'; p[0].level = 10;
    p[0].learned.counter = true; p[0].setPassive('reaction', 'counter');
    p[0].learned.autoPotion = true; p[0].setPassive('support', null);
    game.syncGear(p[0]);
    game.state.party = p;
    game.runBattle(MAPS.verdant, [{ job: 'knight', level: 4, x: 2, y: 2, name: 'Melee' }], 0);
    return true;
  });
  await page.waitForSelector('#screen-battle.active');
  await beginBattle(page);
  await page.waitForFunction(() => game.battle === null, null, { timeout: 90000 });
  const lines = await page.evaluate(() => [...document.querySelectorAll('#log .log-line')].map(l => l.textContent));
  console.log('counters:', lines.filter(l => /counterattacks/.test(l)).length);
  console.log('sample:', lines.slice(0, 10).join(' | '));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
