const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => {
    BattleUI.prototype.awaitPlayerTurn = function (u) { return game.battle.aiTurn(u); };
    game.state.party.forEach(u => { u.level = 12; game.syncGear(u); game.optimize(u); });
    game.runBattle(MAPS.thornwall, CAMPAIGN[6].enemies, 0, CAMPAIGN[6].objective ? { objective: CAMPAIGN[6].objective } : {});
  });
  await beginBattle(page);
  const before = await page.evaluate(() => { const b = game.battle.units.find(u => u.boss); window.__boss = b; return { name: b.name, job: b.job, hp: b.maxHp }; });
  console.log('first form:', JSON.stringify(before));
  // Drive him to the threshold and watch the change happen live.
  await page.evaluate(() => { const b = game.battle.units.find(u => u.boss); b.hp = Math.floor(b.maxHp * 0.3); });
  await page.waitForFunction(() => window.__boss.job === 'darkKnightRisen', null, { timeout: 120000 })
    .catch(() => console.log('(phase not reached within the window)'));
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => { const b = (game.battle && game.battle.units.find(u => u.boss)) || window.__boss; return { name: b.name, job: b.job, hp: b.hp + '/' + b.maxHp, gear: Object.keys(b.gear).length }; });
  console.log('second form:', JSON.stringify(after));
  console.log('objective bar still reads:', await page.textContent('#objective'));
  console.log('turn order shows the new name:', (await page.textContent('#turn-order')).includes('Unbound'));
  await page.screenshot({ path: `${S}/shot-boss.png` });
  const logs = await page.evaluate(() => [...document.querySelectorAll('#log .log-line')].map(l => l.textContent));
  console.log('change announced:', logs.some(l => /stands up in his armour/.test(l)));
  await page.waitForSelector('#screen-results.active', { timeout: 240000 });
  console.log('result:', (await page.textContent('#results-title')).trim());
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
