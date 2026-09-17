const { BASE, ALT } = require('./lib');
/* Act IV through the real screens: the sea's fields, weather and themes, the
   three new trades, the water element, the sea's creatures, the two cities,
   and the queen's second shape. */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  const shape = await page.evaluate(() => ({ chapters: CAMPAIGN.length, acts: ACTS.map(a => [a.from, a.to]), tidestone: CAMPAIGN[21].id, act4End: CAMPAIGN[21].outro.join(' ').includes('END OF ACT IV.'), sea: CAMPAIGN.slice(17, 22).map(c => MAPS[c.map].mood), finals: CAMPAIGN.filter(c => c.final).map(c => c.id), route: WORLD_ROUTE.length, cities: CITIES.length, water: !!ELEMENTS.water && !!ELEMENT_FX.water && typeof FX_DRAW.wave === 'function' && !!TRACKS.tide && !!TRACKS.deep }));
  ok('the sea is the fourth act, ending at the Tidestone with the summons', shape.chapters >= 22 && shape.acts[3][0] === 17 && shape.acts[3][1] === 21 && shape.tidestone === 'ch22' && shape.act4End && shape.finals.length === 0 && shape.route === shape.chapters && shape.cities === 10 && shape.sea.every(m => ['tide', 'storm', 'abyss'].includes(m)) && shape.water, JSON.stringify(shape));
  // Late in the war, on the coast: the map shows the sea, the new cities and the road out onto it.
  await page.evaluate(() => { const u = game.state.party[0]; u.jpTotal.thief = 450; u.jpTotal.gunner = 260; u.jpTotal.blackMage = 450; u.jpTotal.summoner = 260; u.jpTotal.dragoon = 260; u.jpTotal.archer = 260; game.state.gil = 40000; game.state.chapter = 18; game.state.cities = { redwater: true, dunmarchTown: true, fordwaterTown: true, cogsworthTown: true, hearthold: true, hollowMarket: true }; game.showWorld(); });
  await page.waitForTimeout(300);
  const mapBox = await page.$eval('#world-map', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  await page.screenshot({ path: `${S}/act4-worldmap.png`, clip: mapBox });
  const seaPix = await page.evaluate(() => { const cv = document.getElementById('world-map'); const c = cv.getContext('2d'); const d = c.getImageData(Math.floor(cv.width * 0.5), Math.floor(cv.height * 0.05), 1, 1).data; return [d[0], d[1], d[2]]; });
  ok('the top of the map is sea', seaPix[2] > seaPix[0] + 20, seaPix.join(','));
  await page.evaluate(() => game.showCampTab('cities'));
  const cityRows = await page.evaluate(() => [...document.querySelectorAll('.cities-card [data-city]')].map(e => e.dataset.city));
  ok('Saltwick is reachable from the coast, and Tessaly is not yet', cityRows.includes('saltwick') && !cityRows.includes('tessaly'), cityRows.join(','));
  // The trades open from the tree.
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  await page.click('#btn-tree'); await page.waitForTimeout(150);
  const open = await page.evaluate(() => Object.fromEntries(['corsair', 'tidecaller', 'harpooner'].map(j => [j, document.querySelector(`.job-card[data-job="${j}"]`).className.includes('open')])));
  ok('Corsair, Tidecaller and Harpooner open from their requirements', open.corsair && open.tidecaller && open.harpooner, JSON.stringify(open));
  await page.click('.job-card[data-job="harpooner"]'); await page.click('#btn-tree-become'); await page.waitForTimeout(150);
  await page.evaluate(() => { const u = game.state.party[1]; u.jpTotal.blackMage = 450; u.jpTotal.summoner = 260; game.equip(u, 'weapon', null); u.job = 'tidecaller'; game.syncGear(u); const v = game.state.party[2]; v.jpTotal.thief = 450; v.jpTotal.gunner = 260; game.equip(v, 'weapon', null); v.job = 'corsair'; game.syncGear(v); });
  await page.click('#btn-formation-back');
  await page.click('#btn-shop'); await page.waitForSelector('#screen-shop.active');
  const stocked = await page.evaluate(() => [...document.querySelectorAll('#shop-list button[data-buy]')].map(b => b.dataset.buy));
  ok('the wagon carries the coast\'s arms late in the war', ['cutlass', 'harpoonSpear', 'tideRod', 'seaOilskin', 'pearlOfTheDeep', 'leviathanScale'].every(i => stocked.includes(i)) && !stocked.includes('saltwickSabre') && !stocked.includes('queensTrident'), stocked.filter(i => /cutlass|harpoon|tide|oilskin|pearl|leviathan|salt|queen|storm|drowned/.test(i)).join(','));
  await page.click('#btn-shop-back');
  // Chapter 19: the wreck, in the storm, under the tide theme, against the drowned.
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  const title = await page.textContent('#story-title');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  const field = await page.evaluate(() => { audio.init(); return { mood: game.renderer.mood, music: game.battleMusic, foes: game.battle.units.filter(u => u.team === 'enemy').map(u => u.job), terrain: [...new Set(MAPS.wreck.terrain.join(''))].join(''), objective: game.battle.objective.type, sprites: ['crab', 'serpent'].every(k => SPRITE_TEMPLATES[k] && SPRITE_TEMPLATES[k].front.length === 18) }; });
  ok('the wreck is held in the storm under the tide theme against the drowned', title === 'The Wreck of the Concord Star' && field.mood === 'storm' && field.music === 'tide' && field.foes.includes('drownedKnight') && field.foes.includes('siren') && field.foes.includes('reefCrab') && field.terrain.includes('r') && field.objective === 'survive' && field.sprites, JSON.stringify(field));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${S}/act4-wreck.png` });
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  // The drowned drink water and fear thunder; Salt Blood adds to water; Monster Hunter adds against the crab; Freebooter doubles a steal.
  const rules = await page.evaluate(() => {
    const b = game.battle; const dk = b.units.find(u => u.job === 'drownedKnight'); const crab = b.units.find(u => u.job === 'reefCrab');
    const tc = b.units.find(u => u.job === 'tidecaller' && u.team === 'player'); tc.learned.brine = true;
    const plain = b.computeEffect(tc, ABILITIES.brine, ABILITIES.brine.effects[0], crab);
    const hp = b.units.find(u => u.job === 'harpooner' && u.team === 'player');
    const base = b.computeEffect(hp, ABILITIES.harpoon, ABILITIES.harpoon.effects[0], crab);
    hp.learned.monsterHunter = true; hp.setPassive('support', 'monsterHunter');
    const hunted = b.computeEffect(hp, ABILITIES.harpoon, ABILITIES.harpoon.effects[0], crab);
    const co = b.units.find(u => u.job === 'corsair' && u.team === 'player'); co.learned.freebooter = true; co.setPassive('support', 'freebooter');
    const steal = b.predict(co, ABILITIES.plunder, dk.x, dk.y).map(p => p.notes.join(',')).join(';');
    return { water: affinityOf(dk, 'water'), thunder: affinityOf(dk, 'thunder'), plain, base, hunted, steal, level: dk.level };
  });
  ok('the drowned drink water and burn in thunder; Monster Hunter and Freebooter tell', rules.water < 0 && rules.thunder > 1 && rules.plain > 0 && rules.hunted >= Math.floor(rules.base * 1.4) && rules.steal.includes(`steal ${rules.level * 40} gil`), JSON.stringify(rules));
  // A water spell draws its wave and plays its sound.
  const wave = await page.evaluate(async () => { const tc = game.battle.units.find(u => u.job === 'tidecaller' && u.team === 'player'); const t = game.battle.units.find(u => u.team === 'enemy'); const before = game.renderer.fx.length; game.renderer.landFx(ABILITIES.brine, [{ x: t.x, y: t.y }]); await new Promise(r => setTimeout(r, 120)); return { spawned: game.renderer.fx.length > before, kinds: game.renderer.fx.map(f => f.kind).join(','), sound: !!COMBAT_SFX['el-water'] }; });
  ok('water arrives as a wave with its own sound', wave.spawned && /wave/.test(wave.kinds) && wave.sound, JSON.stringify(wave));
  await page.evaluate(() => { game.battle.over = true; game.battle.result = 'defeat'; game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 }); await page.click('#btn-results'); await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  // The Tidestone: the queen becomes the Deep at 40%, the abyss theme plays, and Unmake still spares a commander.
  const phase = await page.evaluate(() => {
    const ch = CAMPAIGN[21];
    const b = Battle.setup(MAPS[ch.map], game.state.party, ch.enemies, { log: () => {}, awaitPlayerTurn: async () => {} }, ch.objective, 'knight');
    const boss = b.units.find(u => u.boss);
    boss.hp = Math.floor(boss.maxHp * 0.38);
    b.checkPhase(boss);
    const p = b.predict(game.state.party[0], ABILITIES.unmake, boss.x, boss.y);
    return { job: boss.job, name: boss.name, alive: boss.alive, hpPct: boss.hp / boss.maxHp, mood: MAPS[ch.map].mood, music: MOODS[MAPS[ch.map].mood].music, unmake: p.length ? p[0].notes.join(',') : 'none' };
  });
  ok('at the Tidestone the queen folds into the Deep under the abyss theme', phase.job === 'theDeep' && phase.name === 'The Deep' && phase.alive && phase.hpPct >= 0.45 && phase.hpPct <= 0.55 && phase.mood === 'abyss' && phase.music === 'deep' && /immune/.test(phase.unmake), JSON.stringify(phase));
  // Tessaly opens once the Priory falls, and can be fought.
  await page.evaluate(() => { game.state.chapter = 21; game.showWorld(); game.showCampTab('cities'); });
  const rows2 = await page.evaluate(() => [...document.querySelectorAll('.cities-card [data-city]')].map(e => e.dataset.city));
  ok('Tessaly is reachable once the Priory has fallen', rows2.includes('tessaly') && rows2.includes('saltwick'), rows2.join(','));
  // The three sea fields not yet seen render without error.
  for (const m of ['saltwick', 'priory', 'tessaly', 'tidestone']) {
    await page.evaluate(async (m) => { const ch = CAMPAIGN.find(c => c.map === m); game.battle = Battle.setup(MAPS[m], game.state.party, ch.enemies, { log: () => {}, awaitPlayerTurn: async () => {} }, ch.objective, 'knight'); game.renderer.setBattle(game.battle); game.renderer.mood = MAPS[m].mood; game.renderer.draw(); }, m);
    await page.waitForTimeout(80);
  }
  ok('every sea field draws', errors.length === 0, errors.join(' | '));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'all Act IV checks passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
