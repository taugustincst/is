const { open, beginBattle } = require('./lib');
/* A battle can be put down and picked up: Suspend saves it as it stands
   and goes to the title, Continue brings it back with the same turn in
   hand; and the save is written at every turn in hand anyway, so a
   closed tab loses nothing. */
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
const slot = (page) => page.evaluate(() => { const raw = localStorage.getItem('elderon-tactics-save'); if (!raw) return null; const d = JSON.parse(raw); return { chapter: d.chapter, battle: d.battle ? { map: d.battle.map, units: d.battle.units.length, active: d.battle.active, turnNo: d.battle.turnNo } : null, flow: d.flow || null, log: (d.battleLog || []).length }; });
const inHand = (page) => page.evaluate(() => { const b = game.battle, t = game.ui.turn; return { map: Object.keys(MAPS).find(k => MAPS[k] === b.mapDef), turnNo: b.turnNo, round: b.round, active: t && t.unit.name, at: t && [t.unit.x, t.unit.y], moved: t && t.unit.turnFlags.moved, mode: t && t.mode, enemies: b.units.filter(u => u.team === 'enemy').length, foeHp: b.units.filter(u => u.team === 'enemy').map(u => u.hp), log: document.querySelectorAll('#log .log-line').length, moveOff: !!document.querySelector('#action-menu button[data-a="move"][disabled]') }; });
(async () => {
  const { browser, page, errors } = await open();
  await page.evaluate(() => { localStorage.clear(); game.syncTitleButtons(); });
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  // Chapter one, by the road.
  await page.click('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 20; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  ok('during deployment nothing is saved yet', (await slot(page)) === null || !(await slot(page)).battle);
  await page.click('#deploy-panel button[data-a="auto"]');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  const s1 = await slot(page);
  ok('the first turn in hand writes the battle into the save', s1 && s1.battle && s1.battle.units >= 5 && s1.flow && s1.flow.kind === 'chapter', JSON.stringify(s1));
  // Move the unit in hand, then suspend.
  await page.keyboard.press('1'); await page.waitForTimeout(150);
  const dest = await page.evaluate(() => { const t = game.ui.turn; const n = [...t.reach.values()].filter(c => c.cost > 0).sort((a, b) => a.cost - b.cost)[0]; return n ? { x: n.x, y: n.y } : null; });
  await page.evaluate((d) => game.ui.placeCursor(d.x, d.y), dest);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu' && game.ui.turn.unit.turnFlags.moved, null, { timeout: 10000 });
  const before = await inHand(page);
  await page.click('#btn-suspend');
  await page.waitForSelector('#ask:not([hidden])');
  const askText = await page.textContent('#ask-text');
  ok('Suspend asks, in words that say where it goes', /Continue picks it up/.test(askText), askText);
  await page.click('#ask-yes');
  await page.waitForSelector('#screen-title.active', { timeout: 10000 });
  const s2 = await slot(page);
  ok('the save holds the battle with the moved unit\'s turn in hand', s2 && s2.battle && s2.battle.turnNo === before.turnNo && s2.log > 0, JSON.stringify(s2));
  const summary = await page.evaluate(() => game.slotSummary(JSON.parse(localStorage.getItem('elderon-tactics-save'))).where);
  ok('the slot says the game is in battle', /in battle at Verdant Road/.test(summary), summary);
  // Continue: back on the field, same turn, same ground.
  await page.click('#btn-continue');
  await page.waitForSelector('#screen-battle.active', { timeout: 15000 });
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 20000 });
  const after = await inHand(page);
  ok('the same unit has the turn, where it had moved to, with Move already spent', after.active === before.active && after.at[0] === before.at[0] && after.at[1] === before.at[1] && after.moved && after.moveOff, JSON.stringify({ before, after }));
  ok('the foes, the round and the log are as they were', after.enemies === before.enemies && after.round === before.round && after.turnNo === before.turnNo && JSON.stringify(after.foeHp) === JSON.stringify(before.foeHp) && after.log === before.log, JSON.stringify(after));
  ok('no deployment and no opening words the second time', await page.evaluate(() => !game.ui.deploy && document.getElementById('speech').hidden));
  // Finish the chapter: the save no longer holds a battle.
  await page.evaluate(() => { for (const u of game.battle.units) if (u.team === 'enemy') u.hp = 0; game.battle.checkEnd(); game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  for (let i = 0; i < 12 && (await page.evaluate(() => game.screen)) === 'story'; i++) { await page.click('#btn-story-next').catch(() => {}); await page.waitForTimeout(100); }
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  const s3 = await slot(page);
  ok('a finished battle leaves the save with the chapter won and no battle in it', s3 && !s3.battle && s3.chapter === 1, JSON.stringify(s3));
  // Autosave alone: a training battle, the tab closed, Continue picks it up.
  await page.evaluate(() => { game.startTraining(); });
  await page.waitForSelector('#screen-story.active');
  await page.click('#btn-story-next');
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  await page.click('#deploy-panel button[data-a="auto"]');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  const t1 = await inHand(page);
  const s4 = await slot(page);
  ok('a training battle is in the save at the turn in hand', s4 && s4.battle && s4.flow.kind === 'training', JSON.stringify(s4));
  await page.reload();
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-continue');
  await page.waitForSelector('#screen-battle.active', { timeout: 15000 });
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 20000 });
  const t2 = await inHand(page);
  ok('after a reload, Continue picks the training battle up with the same turn in hand', t2.map === t1.map && t2.active === t1.active && t2.turnNo === t1.turnNo && t2.enemies === t1.enemies, JSON.stringify({ t1, t2 }));
  // Retreat from it: the save is clean again.
  await page.evaluate(() => { game.battle.over = true; game.battle.result = 'defeat'; game.battle.retreated = true; game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  ok('after the fight the save holds no battle', !(await slot(page)).battle);
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  if (fails) { console.log(`${fails} check(s) FAILED`); process.exit(1); }
  console.log('all checks passed');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
