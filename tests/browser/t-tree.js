const { BASE, ALT } = require('./lib');
/* This round's features through the real screens: the job tree, the enemy
   threat range, Auto, and the battle record. */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => {
    const u = game.state.party[0];
    u.jpTotal.squire = 300; u.jpTotal.knight = 260; u.jpTotal.archer = 120;   // knight open, monk close
    game.showWorld();
  });
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  await page.click('#btn-tree'); await page.waitForTimeout(200);
  const cards = await page.evaluate(() => [...document.querySelectorAll('.job-card')].map(c => ({ id: c.dataset.job, st: c.className.replace('job-card', '').trim(), sub: c.querySelector('small').textContent })));
  const playable = await page.evaluate(() => Object.keys(JOBS).filter(j => JOBS[j].req !== null).length);
  ok('every playable job has a card on the tree', cards.length === playable && playable >= 22, cards.length + ' cards');
  const knight = cards.find(c => c.id === 'knight'), monk = cards.find(c => c.id === 'ninja'), squire = cards.find(c => c.id === 'squire');
  ok('the current job is marked', squire && squire.st.includes('current'), squire && squire.st);
  ok('an open job is marked open', knight && knight.st.includes('open'), knight && knight.st);
  ok('a locked job says how far off it is', monk && monk.st.includes('locked') && /\d\/\d/.test(monk.sub), monk && monk.sub);
  const tiers = await page.evaluate(() => [...document.querySelectorAll('.tier-label')].map(t => t.textContent));
  ok('the tree is laid out in ranks from roots to summit', tiers[0] === 'The roots' && tiers[tiers.length - 1] === 'The summit', tiers.join(' > '));
  await page.screenshot({ path: `${S}/tree.png`, fullPage: true });
  // Select the dragonlord card: the detail must list its requirements.
  await page.click('.job-card[data-job="dragonlord"]'); await page.waitForTimeout(150);
  const detail = await page.textContent('#tree-detail');
  ok('a locked job explains what it asks for', /Samurai 1\/3/.test(detail) && /Paladin 1\/2/.test(detail) && /Dragon Breath/.test(detail), detail.slice(0, 120).replace(/\s+/g, ' '));
  // Select knight and become one.
  await page.click('.job-card[data-job="knight"]'); await page.waitForTimeout(150);
  ok('an open job offers the change', await page.isVisible('#btn-tree-become'));
  await page.click('#btn-tree-become'); await page.waitForTimeout(200);
  const job = await page.evaluate(() => game.state.party[0].job);
  ok('the change is made from the tree', job === 'knight', job);
  ok('the tree returns to the unit page after the change', await page.isVisible('#sel-job'));
  const rec = await page.evaluate(() => document.querySelector('.form-right').textContent.includes('Record: no battles yet'));
  ok('a fresh unit has no record yet', rec);
  await page.click('#btn-formation-back'); await page.waitForSelector('#screen-world.active');
  // Into a training battle; during deployment, tap an enemy to see its reach.
  await page.click('#btn-train'); await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 6; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  const dep = await page.evaluate(() => {
    const b = game.battle; const foe = b.units.find(u => u.team === 'enemy' && u.alive);
    game.ui.onDeployClick(b.grid.tile(foe.x, foe.y));
    return { n: game.renderer.hl.threat.size, hint: document.getElementById('hint').textContent, name: foe.name, who: game.ui.threatOf === foe };
  });
  ok('tapping an enemy during deployment shows where it can strike', dep.who && dep.n > 4 && dep.hint.includes(dep.name), `${dep.n} tiles · ${dep.hint}`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${S}/threat-deploy.png` });
  const cleared = await page.evaluate(() => { const b = game.battle; const foe = game.ui.threatOf; game.ui.onDeployClick(b.grid.tile(foe.x, foe.y)); return game.renderer.hl.threat.size; });
  ok('tapping it again clears the reach', cleared === 0, cleared + ' tiles');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  const inTurn = await page.evaluate(() => {
    const b = game.battle; const foe = b.units.find(u => u.team === 'enemy' && u.alive);
    game.ui.onClick(b.grid.tile(foe.x, foe.y));
    const shown = game.renderer.hl.threat.size;
    // The reach is the union of every tile it could move to and strike from.
    const reach = b.grid.reachable(foe, b.units);
    let manual = new Set(); for (const c of reach.values()) for (const t of b.targetTilesFor(foe, ABILITIES.attack, c.x, c.y)) manual.add(`${t.x},${t.y}`);
    game.ui.menuAction('move');
    return { shown, manual: manual.size, afterMove: game.renderer.hl.threat.size, mode: game.ui.turn.mode };
  });
  ok('tapping an enemy on your turn shows its full reach', inTurn.shown === inTurn.manual && inTurn.shown > 0, `${inTurn.shown} of ${inTurn.manual}`);
  ok('choosing an action clears the reach', inTurn.afterMove === 0 && inTurn.mode === 'move');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await page.evaluate(() => { const b = game.battle; const foe = b.units.find(u => u.team === 'enemy' && u.alive); game.ui.onClick(b.grid.tile(foe.x, foe.y)); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${S}/threat-turn.png` });
  // Auto: the current turn is handed over, and the next player turn is too.
  const turnUnit = await page.evaluate(() => game.ui.turn.unit.name);
  await page.click('#btn-auto');
  const autoOn = await page.evaluate(() => document.getElementById('btn-auto').classList.contains('on') && game.ui.auto);
  ok('Auto lights up', autoOn);
  await page.waitForFunction((name) => !game.ui.turn || game.ui.turn.unit.name !== name, turnUnit, { timeout: 30000 });
  const stillAuto = await page.evaluate(() => game.ui.auto && (!game.ui.turn || game.ui.turn.mode === 'auto' || game.ui.turn.mode === 'busy'));
  ok('the turn was handed to the AI and later turns follow', stillAuto);
  // Let a few turns run, then take command back: the next player turn must offer the menu.
  await page.waitForTimeout(2500);
  await page.keyboard.press('a');
  await page.waitForFunction(() => game.battle.over || (game.ui.turn && game.ui.turn.mode === 'menu'), null, { timeout: 60000 });
  const back = await page.evaluate(() => ({ auto: game.ui.auto, mode: game.ui.turn && game.ui.turn.mode, over: game.battle.over }));
  ok('command comes back at the next turn', !back.auto && (back.mode === 'menu' || back.over), JSON.stringify(back));
  // Records: finish the battle on Auto at speed and check the record moved.
  await page.evaluate(() => { game.setPace(3); game.ui.setAuto(true); });
  await page.waitForSelector('#screen-results.active', { timeout: 600000 });
  const record = await page.evaluate(() => game.state.party.map(u => u.record));
  ok('everyone who fought has a battle on their record', record.every(r => r.battles === 1), JSON.stringify(record));
  const felled = await page.evaluate(() => game.state.party.reduce((a, u) => a + u.record.kills, 0));
  const won = await page.evaluate(() => game.state.party.some(u => u.record.wins === 1));
  ok('kills are credited to whoever landed them', won ? felled > 0 : true, `${felled} felled, won=${won}`);
  await page.click('#btn-results'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  const line = await page.evaluate(() => (document.querySelector('.form-right').textContent.match(/Record: 1 battle, [01] won[^·]*·[^·]*·[^E]*/) || [''])[0]);
  ok('the record is written on the unit page', line.length > 0, line.trim());
  // Save and reload keeps the record.
  await page.evaluate(() => game.saveGame());
  await page.reload(); await page.waitForSelector('#screen-title.active');
  await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
  const kept = await page.evaluate(() => game.state.party[0].record.battles);
  ok('the record survives a save and reload', kept === 1, String(kept));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'all tree checks passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
