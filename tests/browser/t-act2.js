const { BASE, ALT } = require('./lib');
/* Act II through the real screens: the road has twelve stops, the Concord's
   trades unlock and arm, guns fire, the story threads from Thornwall to
   Brassgate, and the Director's machine phase comes when it should. */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  const road = await page.evaluate(() => ({ chapters: CAMPAIGN.length, stops: WORLD_ROUTE.length, maps: CAMPAIGN.map(c => c.map).every(m => !!MAPS[m]), finale: ROAD_ORDER.every(id => ROADS[id].chapters[ROADS[id].chapters.length - 1].final === true), only: CAMPAIGN.filter(c => c.final).length }));
  ok('the road has a stop for every chapter and every chapter has a field', road.chapters >= 12 && road.stops === road.chapters && road.maps && road.finale && road.only === 0, JSON.stringify(road));
  // Story threads: the cog appears in Act I, and Thornwall names the Concord.
  const thread = await page.evaluate(() => ({ coin: CAMPAIGN[0].outro.join(' ').includes('cog'), marsh: CAMPAIGN[3].outro.join(' ').includes('cog'), thorn: CAMPAIGN[6].outro.join(' ').includes('Brass Concord'), end: CAMPAIGN[6].outro.join(' ').includes('THE END'), brass: CAMPAIGN[11].outro.join(' ').includes('END OF ACT II') }));
  ok('the story plants the cog early and names the Concord at Thornwall', thread.coin && thread.marsh && thread.thorn && !thread.end && thread.brass, JSON.stringify(thread));
  // The night before at camp: the chapter's talk, then the act on the card.
  const fire = await page.evaluate(() => ({ lines: document.querySelectorAll('#campfire p').length, act: document.querySelector('.chapter-num').textContent }));
  ok('the campfire carries the chapter\'s talk and the card names the act', fire.lines >= 2 && /Act 1 · The War of Princes · Chapter 1/.test(fire.act), JSON.stringify(fire));
  const after = await page.evaluate(() => { game.state.branch = 'crown'; game.state.chapter = game.roadLength(); game.state.trials = 3; game.showWorld(); return { lines: document.querySelectorAll('#campfire p').length, after: !!document.querySelector('.act-after'), act: document.querySelector('.chapter-num').textContent }; });
  ok('after the war the fire tells the epilogue a line at a time and the card says so', after.lines === 5 && after.after && /The Crown · Trial 4/.test(after.act), JSON.stringify(after));
  await page.evaluate(() => { game.state.chapter = 0; game.state.branch = null; game.state.trials = 0; game.showWorld(); });
  // The trades unlock from the tree with the right job levels.
  await page.evaluate(() => { const u = game.state.party[0]; u.jpTotal.chemist = 260; u.jpTotal.archer = 260; u.jpTotal.thief = 120; game.state.gil = 20000; game.state.chapter = 8; game.showWorld(); });
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  await page.click('#btn-tree'); await page.waitForTimeout(150);
  const open = await page.evaluate(() => Object.fromEntries(['engineer', 'gunner', 'aeronaut', 'artificer'].map(j => [j, document.querySelector(`.job-card[data-job="${j}"]`).className.includes('open')])));
  ok('Engineer and Gunner open from Chemist and Archer; the rest wait', open.engineer && open.gunner && !open.aeronaut && !open.artificer, JSON.stringify(open));
  await page.click('.job-card[data-job="gunner"]'); await page.click('#btn-tree-become'); await page.waitForTimeout(150);
  const gunner = await page.evaluate(() => ({ job: game.state.party[0].job, weapon: game.state.party[0].weapon.name, wtype: game.state.party[0].weapon.wtype, range: game.state.party[0].weapon.range }));
  ok('a new Gunner is handed a flintlock that reaches four tiles', gunner.job === 'gunner' && gunner.wtype === 'gun' && gunner.range === 4, JSON.stringify(gunner));
  await page.evaluate(() => { const u = game.state.party[1]; u.jpTotal.chemist = 260; game.equip(u, 'weapon', null); u.job = 'engineer'; game.syncGear(u); });
  await page.click('#btn-formation-back');
  await page.click('#btn-shop'); await page.waitForSelector('#screen-shop.active');
  const stocked = await page.evaluate(() => [...document.querySelectorAll('#shop-list button[data-buy]')].map(b => b.dataset.buy));
  ok('the wagon carries guns and brass in Act II', ['musket', 'blunderbuss', 'goggles', 'boilerplate', 'monkeyWrench'].every(i => stocked.includes(i)), stocked.filter(i => /musket|blunder|carbine|goggles|boiler|wrench|aviator|oilskin/.test(i)).join(','));
  await page.click('#btn-shop-back');
  // Chapter 9: the intro names Ironhold, the roster is the Concord's.
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  const title = await page.textContent('#story-title');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  const foes = await page.evaluate(() => game.battle.units.filter(u => u.team === 'enemy').map(u => u.job));
  ok('chapter 9 is fought at Ironhold against sentinels and gunners', title === 'The Foundry at Ironhold' && foes.includes('sentinel') && foes.includes('gunner'), `${title}: ${foes.join(',')}`);
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  // A gun fires: the shot streaks and the shot sounds like a gun.
  const fired = await page.evaluate(async () => {
    audio.init(); const orig = audio.sfx.bind(audio); window.__sfx = []; audio.sfx = (n) => { window.__sfx.push(n); return orig(n); };
    const b = game.battle; const g = b.units.find(u => u.job === 'gunner' && u.team === 'player'); const foe = b.units.find(u => u.team === 'enemy' && u.alive);
    await game.renderer.animateAction(g, ABILITIES.attack, foe.x, foe.y);
    return { sfx: window.__sfx.slice(), shape: throwShape(g, ABILITIES.attack), fx: WEAPON_FX.gun.shot };
  });
  ok('a gun fires with its own crack and a streaking shot', fired.sfx.includes('gunshot') && fired.fx === 'bullet', JSON.stringify(fired));
  // The sentinel is weak to lightning and shrugs off fire: the preview says so.
  const aff = await page.evaluate(() => { const s = game.battle.units.find(u => u.job === 'sentinel'); return { thunder: affinityOf(s, 'thunder'), fire: affinityOf(s, 'fire') }; });
  ok('a sentinel takes more from lightning and less from fire', aff.thunder > 1 && aff.fire < 1, JSON.stringify(aff));
  // Deadeye adds a tile to weapon range.
  const reach = await page.evaluate(() => { const b = game.battle; const g = b.units.find(u => u.job === 'gunner' && u.team === 'player'); const before = b.abilityRange(g, ABILITIES.attack); g.learned.deadeye = true; g.setPassive('support', 'deadeye'); const after = b.abilityRange(g, ABILITIES.attack); g.setPassive('support', null); return { before, after }; });
  ok('Deadeye adds a tile to weapon range', reach.after === reach.before + 1, JSON.stringify(reach));
  await page.evaluate(() => { game.battle.over = true; game.battle.result = 'defeat'; game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  // The Director's phase: at 40% he climbs into the Colossus.
  const phase = await page.evaluate(async () => {
    game.state.chapter = 11;
    const ch = CAMPAIGN[11];
    const roster = game.state.party;
    const b = Battle.setup(MAPS[ch.map], roster, ch.enemies, { log: () => {}, awaitPlayerTurn: async () => {} }, ch.objective, 'knight');
    const boss = b.units.find(u => u.boss);
    boss.hp = Math.floor(boss.maxHp * 0.42);
    const hitter = roster[0]; hitter.x = boss.x; hitter.y = boss.y + 1; hitter.mods.pa = 40;
    await b.applyAbility(hitter, ABILITIES.attack, boss.x, boss.y);
    return { job: boss.job, name: boss.name, alive: boss.alive, hpPct: boss.hp / boss.maxHp };
  });
  ok('the Director climbs into the Colossus when brought low', phase.job === 'colossus' && phase.alive && phase.hpPct > 0.9, JSON.stringify(phase));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'all Act II checks passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
