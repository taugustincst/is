const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => {
    BattleUI.prototype.awaitPlayerTurn = function (u) { return game.battle.aiTurn(u); };
    game.state.party.forEach(u => { u.level = 8; game.syncGear(u); });
    game.runBattle(MAPS.hollowmere, [
      { job: 'skeleton', level: 6, x: 3, y: 3 },
      { job: 'wisp', level: 6, x: 6, y: 3 },
      { job: 'treant', level: 6, x: 8, y: 6 },
      { job: 'bomb', level: 6, x: 2, y: 7 },
    ], 0, { objective: { type: 'rout' } });
  });
  await beginBattle(page);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${S}/shot-monsters2.png` });
  console.log('sprites rendered without error');
  await page.waitForSelector('#screen-results.active', { timeout: 180000 });
  const lines = await page.evaluate(() => [...document.querySelectorAll('#log .log-line')].map(l => l.textContent));
  const used = ['Bone Toss', 'Grave Pull', "Will o' Wisp", 'Drain Light', 'Root Snare', 'Bark Skin'].filter(a => lines.some(l => l.includes(a)));
  console.log('new monster abilities seen in play:', used.join(', ') || 'none');
  console.log('element notes seen:', lines.filter(l => /weakness|blunted|drinks in|untouched/.test(l)).length);
  console.log('result:', (await page.textContent('#results-title')).trim());
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
