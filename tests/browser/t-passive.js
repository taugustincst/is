const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  // Give JP so passives can be learned through the real UI.
  await page.evaluate(() => { const u = game.state.party[0]; u.jp.squire = 900; u.jpTotal.squire = 900; });
  await page.click('#btn-formation');
  await page.waitForSelector('#screen-formation.active');
  const rows = await page.evaluate(() => [...document.querySelectorAll('button[data-learn]')].map(b => b.dataset.learn));
  console.log('learnable in Squire:', rows.join(','));
  await page.evaluate(() => document.querySelector('button[data-learn="defend"]').click());
  await page.waitForTimeout(150);
  console.log('learned defend:', await page.evaluate(() => !!game.state.party[0].learned.defend), '| jp left', await page.evaluate(() => game.state.party[0].jp.squire));
  await page.evaluate(() => { game.formTab = 'gear'; game.renderFormationDetail(); });
  await page.selectOption('select[data-passive="support"]', 'defend');
  await page.waitForTimeout(150);
  console.log('equipped:', await page.evaluate(() => JSON.stringify(game.state.party[0].passives)));
  await page.screenshot({ path: `${S}/shot-passives.png`, fullPage: true });
  // Two Hands must clear the offhand and boost weapon power.
  const th = await page.evaluate(() => {
    const u = game.state.party[0];
    game.invAdd('buckler'); game.equip(u, 'offhand', 'buckler');
    const before = { pow: u.weapon.power, off: u.gear.offhand || null };
    u.learned.twoHands = true; u.setPassive('support', 'twoHands'); game.syncGear(u);
    return { before, after: { pow: u.weapon.power, off: u.gear.offhand || null, inv: game.invCount('buckler') } };
  });
  console.log('two hands:', JSON.stringify(th));
  // Movement and equip-armor passives
  const mv = await page.evaluate(() => {
    const u = game.state.party[1];
    const before = { move: u.move, jump: u.jump };
    u.learned.movePlus1 = true; u.setPassive('movement', 'movePlus1');
    const mid = { move: u.move };
    u.learned.sureFooting = true; u.setPassive('movement', 'sureFooting');
    return { before, mid, after: { move: u.move, jump: u.jump } };
  });
  console.log('movement:', JSON.stringify(mv));
  // Battle: Counter, Auto-Potion, Parry, Concentrate in a live fight
  await page.click('#btn-formation-back');
  const log = await page.evaluate(async () => {
    // Hand the player's turns to the AI before the battle starts, so no turn is
    // ever left waiting on a click.
    BattleUI.prototype.awaitPlayerTurn = function (u) { return game.battle.aiTurn(u); };
    const p = game.state.party;
    p[0].job = 'monk'; p[0].level = 8; p[0].learned.counter = true; p[0].setPassive('reaction', 'counter');
    p[1].job = 'chemist'; p[1].level = 8; p[1].learned.autoPotion = true; p[1].setPassive('reaction', 'autoPotion');
    p[2].job = 'archer'; p[2].level = 8; p[2].learned.concentrate = true; p[2].setPassive('support', 'concentrate');
    for (const u of p) game.syncGear(u);
    game.runBattle(MAPS.verdant, [
      { job: 'knight', level: 6, x: 2, y: 2, name: 'Bruiser', passives: ['parry'] },
      { job: 'knight', level: 6, x: 3, y: 2, name: 'Basher' },
    ], 0);
    return true;
  });
  await page.waitForSelector('#screen-battle.active');
  await beginBattle(page);
  await page.waitForFunction(() => game.battle === null || (game.battle && game.battle.over), null, { timeout: 90000 });
  await page.waitForTimeout(500);
  const lines = await page.evaluate(() => [...document.querySelectorAll('#log .log-line')].map(l => l.textContent));
  const seen = { counter: 0, potion: 0, parry: 0 };
  for (const l of lines) {
    if (/counterattacks/.test(l)) seen.counter++;
    if (/downs a potion/.test(l)) seen.potion++;
    if (/parries/.test(l)) seen.parry++;
  }
  console.log('reaction triggers seen:', JSON.stringify(seen), 'of', lines.length, 'log lines');
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
