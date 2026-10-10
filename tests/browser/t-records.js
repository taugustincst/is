const { open } = require('./lib');
const S = require('./lib').OUT;
/* The record: what a campaign keeps of itself, on its own camp tab, and
   New Game + once an ending has been seen: the same company with every
   job, ability and passive, at level one on Paladin, in the same slot. */
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  await page.evaluate(() => { localStorage.clear(); game.syncTitleButtons(); });
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  const tabs = await page.evaluate(() => [...document.querySelectorAll('#camp-tabs button')].map(b => b.dataset.camp));
  ok('the camp has a Records tab', tabs.join() === 'road,company,cities,records,options', tabs.join());
  await page.click('#camp-tabs button[data-camp="records"]');
  const empty = await page.evaluate(() => ({ text: document.getElementById('records').textContent, plus: !!document.querySelector('#btn-plus') }));
  ok('a fresh campaign has an empty record, with no New Game + yet', /No chapter cleared yet/.test(empty.text) && /Endings seen: 0 of 5/.test(empty.text) && !empty.plus, empty.text.slice(0, 80));
  // Battles noted: a chapter lost twice then won, a training win, kills by trade.
  await page.evaluate(() => {
    game.noteBattle({ kind: 'chapter', index: 0, gil: 0 }, 'defeat', 1, { turns: 30, killsBy: { squire: 1 } });
    game.noteBattle({ kind: 'chapter', index: 0, gil: 0 }, 'victory', 2, { turns: 18, killsBy: { squire: 2, chemist: 1 } });
    game.noteBattle({ kind: 'chapter', index: 1, gil: 0 }, 'victory', 1, { turns: 22, killsBy: { squire: 3 } });
    game.noteBattle({ kind: 'training', gil: 0 }, 'victory', 1, { turns: 9, killsBy: { chemist: 2 } });
    game.noteBattle({ kind: 'chapter', index: 0, gil: 0 }, 'victory', 1, { turns: 12, killsBy: {} });
    game.renderRecords();
  });
  const rec = await page.evaluate(() => ({ text: document.getElementById('records').textContent.replace(/\s+/g, ' '), rows: [...document.querySelectorAll('.rec-table tbody tr')].map(r => [...r.children].map(c => c.textContent)), r: game.state.records }));
  ok('battles fought and won are counted, with first tries and best clears per chapter', /Battles: 4 won of 5/.test(rec.text) && /first try: 1 of 2/.test(rec.text) && rec.rows.length === 2 && rec.rows[0][1] === '3×' && rec.rows[0][2] === '12 turns' && rec.rows[1][1] === '✓', JSON.stringify(rec.rows) + ' ' + rec.text.slice(0, 120));
  ok('kills are kept by trade', rec.r.kills.squire === 6 && rec.r.kills.chemist === 3 && /Kills by trade/.test(rec.text) && /Footman 6/.test(rec.text), JSON.stringify(rec.r.kills));
  // The record survives a save.
  await page.evaluate(() => game.saveGame());
  await page.reload(); await page.waitForSelector('#screen-title.active');
  await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
  const kept = await page.evaluate(() => game.state.records);
  ok('the record survives a save and a reload', kept.fought === 5 && kept.won === 4 && kept.chapters.ch1 && kept.chapters.ch1.bestTurns === 12 && kept.kills.squire === 6, JSON.stringify(kept.chapters));
  // An ending seen opens New Game +.
  await page.evaluate(() => { const s = game.state; s.endings = { crown: true }; s.chapter = 10; s.gil = 9000; s.party.forEach(u => { u.level = 20; }); const u = s.party[1]; u.job = 'knight'; u.learned.firstAid = true; u.learned.throwStone = true; u.jpTotal.knight = 400; u.secondary = 'squire'; game.showCampTab('records'); game.renderRecords(); });
  await page.waitForSelector('#btn-plus');
  await page.screenshot({ path: `${S}/records.png` });
  const before = await page.evaluate(() => ({ names: game.state.party.map(u => u.name), learned: Object.keys(game.state.party[1].learned).length, slot: game.state.slot }));
  await page.click('#btn-plus');
  await page.waitForSelector('#ask:not([hidden])');
  await page.click('#ask-yes');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => { const s = game.state; const u = s.party[1]; return { chapter: s.chapter, gil: s.gil, difficulty: s.difficulty, levels: s.party.map(u => u.level), names: s.party.map(u => u.name), job: u.job, learned: Object.keys(u.learned).length, secondary: u.secondary, jpTotal: u.jpTotal.knight, plus: s.records.plus, endings: Object.keys(s.endings), gear: u.gear.weapon, screen: game.screen, saved: JSON.parse(localStorage.getItem('elderon-tactics-save')).records.plus }; });
  ok('New Game + starts over on Paladin with the same company at level one', after.chapter === 0 && after.gil === 500 && after.difficulty === 'paladin' && after.levels.every(l => l === 1) && after.names.join() === before.names.join() && after.screen === 'world', JSON.stringify(after));
  ok('jobs, abilities, passives and job levels are kept; gear is the starter kit', after.job === 'knight' && after.learned === before.learned && after.secondary === 'squire' && after.jpTotal === 400 && after.gear === 'shortSword', JSON.stringify(after));
  ok('the endings seen and the count of new games are kept and saved', after.endings.join() === 'crown' && after.plus === 1 && after.saved === 1, JSON.stringify(after));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  if (fails) { console.log(`${fails} check(s) FAILED`); process.exit(1); }
  console.log('all checks passed');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
