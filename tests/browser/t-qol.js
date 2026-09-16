const { BASE, ALT } = require('./lib');
/* Quality of life through the real screens: three save slots, Skip on the
   story, Try again after a defeat, Undo Move, revisiting a won chapter, and
   status descriptions on the card. */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  let dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  ok('Continue and Load are offered on the title; Continue is off with nothing saved', await page.isVisible('#btn-load') && await page.evaluate(() => document.getElementById('btn-continue').disabled));
  // Slot 1: a new game, saved at chapter 3.
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => { game.state.chapter = 3; game.state.gil = 1234; game.saveGame(); });
  const slot1 = await page.evaluate(() => game.state.slot);
  ok('the first game takes slot 1', slot1 === 1, String(slot1));
  await page.click('#btn-title'); await page.waitForSelector('#screen-title.active');
  // New Game again does not touch slot 1: it takes slot 2.
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  const slot2 = await page.evaluate(() => { game.saveGame(); return { slot: game.state.slot, s1: JSON.parse(localStorage.getItem('elderon-tactics-save')).chapter }; });
  ok('a second new game takes slot 2 and leaves slot 1 alone', slot2.slot === 2 && slot2.s1 === 3, JSON.stringify(slot2));
  await page.click('#btn-title'); await page.waitForSelector('#screen-title.active');
  await page.click('#btn-load'); await page.waitForSelector('#screen-slots.active');
  const rows = await page.evaluate(() => [...document.querySelectorAll('.slot')].map(r => r.className.includes('empty') ? 'empty' : r.querySelector('.slot-where').textContent));
  ok('Load lists the three slots with where each game stands', rows.length === 3 && /Chapter 4/.test(rows[0]) && /Chapter 1/.test(rows[1]) && rows[2] === 'empty', rows.join(' | '));
  await page.screenshot({ path: `${S}/slots.png` });
  await page.click('button[data-slot-load="1"]'); await page.waitForSelector('#screen-world.active');
  ok('Load opens the chosen slot', await page.evaluate(() => game.state.slot === 1 && game.state.chapter === 3 && game.state.gil === 1234));
  await page.click('#btn-title'); await page.waitForSelector('#screen-title.active');
  await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
  // Leaving for the title saves the game played, so Continue returns to it.
  ok('Continue opens the slot played last, which Title saved on the way out', await page.evaluate(() => game.state.slot === 1));
  await page.click('#btn-title'); await page.click('#btn-load'); await page.waitForSelector('#screen-slots.active');
  dialogs = [];
  await page.click('button[data-slot-del="2"]'); await page.waitForTimeout(100);
  const afterDel = await page.evaluate(() => ({ s2: localStorage.getItem('elderon-tactics-save-2'), rows: document.querySelectorAll('.slot.empty').length }));
  ok('Delete asks, then empties the slot', dialogs.length === 1 && afterDel.s2 === null && afterDel.rows === 2, JSON.stringify(afterDel));
  // With slot 1 full and two empty, New Game still starts without a prompt; fill them all and it asks.
  await page.evaluate(() => { localStorage.setItem('elderon-tactics-save-2', localStorage.getItem('elderon-tactics-save')); localStorage.setItem('elderon-tactics-save-3', localStorage.getItem('elderon-tactics-save')); });
  await page.click('#btn-slots-back'); await page.click('#btn-new'); await page.waitForSelector('#screen-slots.active');
  ok('with every slot taken, New Game asks which gives way', /gives way/.test(await page.textContent('#slots-title')));
  dialogs = [];
  await page.click('button[data-slot-new="3"]'); await page.waitForSelector('#screen-world.active');
  ok('overwriting asks first, then starts there', dialogs.length === 1 && await page.evaluate(() => game.state.slot === 3 && game.state.chapter === 0));
  await page.evaluate(() => { localStorage.removeItem('elderon-tactics-save-2'); localStorage.removeItem('elderon-tactics-save-3'); });
  // Story skip.
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  const lines = await page.evaluate(() => CAMPAIGN[0].intro.length);
  await page.click('#btn-story-skip'); await page.waitForTimeout(100);
  const skipped = await page.evaluate(() => ({ shown: document.querySelectorAll('#story-text p').length, btn: document.getElementById('btn-story-next').textContent, skipHidden: document.getElementById('btn-story-skip').hidden }));
  ok('Skip lays out the whole page and leaves Onward', skipped.shown === lines && skipped.btn === 'Onward' && skipped.skipHidden, JSON.stringify(skipped));
  await page.click('#btn-story-next');
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  // Undo Move: move the acting unit, take it back.
  const undo = await page.evaluate(async () => {
    const t = game.ui.turn, u = t.unit, from = { x: u.x, y: u.y };
    game.ui.setMode('move');
    const dest = [...t.reach.values()].find(c => c.x !== u.x || c.y !== u.y);
    await game.ui.confirmMove(game.battle.grid.tile(dest.x, dest.y));
    const moved = { x: u.x, y: u.y, flag: u.turnFlags.moved, btn: !!document.querySelector('#action-menu button[data-a="undo"]') };
    game.ui.menuAction('undo');
    return { from, moved, back: { x: u.x, y: u.y, flag: u.turnFlags.moved, btn: !!document.querySelector('#action-menu button[data-a="undo"]') } };
  });
  ok('a move can be taken back before acting', undo.moved.btn && (undo.moved.x !== undo.from.x || undo.moved.y !== undo.from.y) && undo.back.x === undo.from.x && undo.back.y === undo.from.y && undo.back.flag === false && !undo.back.btn, JSON.stringify(undo));
  // Status tooltip on the card.
  const tip = await page.evaluate(() => { const u = game.ui.turn.unit; u.addStatus('haste'); game.ui.renderCard(u); const s = document.querySelector('#unit-card .status'); u.removeStatus('haste'); return s && s.title; });
  ok('a status on the card says what it does', /Charge Time fills 50% faster/.test(tip || ''), tip);
  // Try again: lose (retreat), then fight again without the story.
  await page.evaluate(() => { game.battle.over = true; game.battle.result = 'defeat'; game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  ok('a defeat offers Try again', await page.isVisible('#btn-retry'));
  await page.click('#btn-retry');
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  ok('Try again goes straight back to the field', await page.evaluate(() => game.battle && game.ui.deploy && document.querySelector('#screen-battle.active') !== null));
  await page.evaluate(() => { game.battle.over = true; game.battle.result = 'defeat'; game.ui.abort(); });
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  // Revisit: with chapter 2 reached, tapping stop 1 on the map offers the old field.
  await page.evaluate(() => { game.state.chapter = 2; game.showWorld(); });
  dialogs = [];
  await page.evaluate(() => { const cv = document.getElementById('world-map'); const r = cv.getBoundingClientRect(); const [fx, fy] = WORLD_ROUTE[0]; cv.onclick({ clientX: r.left + fx * r.width, clientY: r.top + fy * r.height }); });
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  const revisit = await page.evaluate(() => ({ map: document.getElementById('battle-name').textContent, chapter: game.state.chapter, foes: game.battle.units.filter(u => u.team === 'enemy').length }));
  ok('a flagged stop can be fought again, with nothing in the story changed', dialogs.length === 1 && /Revisit/.test(dialogs[0]) && revisit.map === 'Verdant Road' && revisit.chapter === 2 && revisit.foes === 3, JSON.stringify(revisit));
  await page.evaluate(() => { game.battle.over = true; game.battle.result = 'defeat'; game.ui.abort(); });
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'all quality-of-life checks passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
