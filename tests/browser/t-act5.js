/* Act V through the real screens: the common road to the capital, the fork
   and its five roads, each walked to its ending and recorded, the Iron Crown
   taking three companions and another road giving them back, the map's spurs,
   the new trades, cities and gear, and every new field drawing. */
const { BASE, open } = require('./lib');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  const shape = await page.evaluate(() => ({ common: CAMPAIGN.length, acts: ACTS.length, lastAct: ACTS[ACTS.length - 1], roads: ROAD_ORDER, act4End: CAMPAIGN[21].outro.join(' ').includes('END OF ACT IV.'), noEnd: !CAMPAIGN.some(c => c.final), endings: ROAD_ORDER.map(id => ROADS[id].ending.title), route: WORLD_ROUTE.length }));
  ok('twenty-four common chapters in five acts, then five roads with five endings', shape.common === 24 && shape.acts === 5 && shape.lastAct.to === 25 && shape.roads.length === 5 && shape.act4End && shape.noEnd && new Set(shape.endings).size === 5 && shape.route === 24, JSON.stringify(shape));
  // Stand at the capital with a full company, geared and levelled.
  await page.evaluate(() => {
    const s = game.state; s.chapter = 24; s.gil = 60000;
    for (const c of CAMPAIGN.slice(1)) if (c.recruit && !s.party.some(u => u.name === c.recruit.name)) s.party.push(new Unit({ name: c.recruit.name, job: c.recruit.job, level: 27, team: 'player' }));
    // A company that has walked four acts: the front five in their summit
    // trades with everything learned, and the rest levelled with them.
    const trades = ['dragonlord', 'hierophant', 'fellKnight', 'sage', 'paladin', 'marshal', 'inquisitor', 'duelist', 'runeblade', 'corsair', 'artificer', 'tidecaller', 'warden'];
    s.party.forEach((u, i) => { u.level = 34; u.job = trades[i % trades.length]; u.autoLearn(1); for (const id of Object.keys(u.learned)) u.learned[id] = true; const kit = bestGearFor(u.job, null, 7); u.gear = {}; for (const [slot, id] of Object.entries(kit)) if (id) u.gear[slot] = id; u.resetBattleState(); });
    game.showWorld();
  });
  const fork = await page.evaluate(() => ({ atFork: game.atFork(), button: document.getElementById('btn-battle').textContent, title: document.querySelector('#world-next .chapter-title').textContent, party: game.state.party.length }));
  ok('at the capital the road card offers the choice', fork.atFork && fork.button === 'Choose a Road' && fork.title === 'Five Roads' && fork.party === 13, JSON.stringify(fork));
  // The map shows the capital with five spurs and no chapter beyond it.
  await page.waitForTimeout(200);
  const mapBox = await page.$eval('#world-map', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  await page.screenshot({ path: `${require('./lib').OUT}/act5-fork.png`, clip: mapBox });
  await page.click('#btn-battle'); await page.waitForSelector('#screen-choice.active');
  const roads = await page.evaluate(() => [...document.querySelectorAll('#choice-list .road')].map(r => r.dataset.road));
  ok('the choice screen lists the five roads', roads.join(',') === 'crown,council,exile,quiet,iron', roads.join(','));
  ok('Back leaves the choice for camp', await page.evaluate(() => handleBack() && game.screen === 'world'));
  // Walk every road with the engine, and record each ending.
  const walk = async (id) => page.evaluate(async (id) => {
    const s = game.state; s.chapter = 24; s.branch = null;
    for (const saved of s.exiled || []) if (!s.party.some(u => u.name === saved.name)) s.party.push(Unit.fromSave(Object.assign({ team: 'player' }, saved)));
    s.exiled = [];
    game.chooseRoad(id);
    const out = { id, branch: s.branch, party: s.party.length, exiled: (s.exiled || []).map(u => u.name), fights: [] };
    for (let i = 0; i < 2; i++) {
      const ch = game.chapterAt(24 + i);
      const b = Battle.setup(MAPS[ch.map], s.party, ch.enemies, { log: () => {}, awaitPlayerTurn: async (u) => b.aiTurn(u) }, ch.objective, 'knight');
      // The road logic is under test, not the AI's fencing: the foes fall to
      // a blow and land none worth counting (the leader, protected by the
      // objective, is AI-driven here and would otherwise sometimes be lost).
      for (const u of b.units) if (u.team === 'enemy') { u.hp = 1; u.level = 1; if (u.phases) u.phases = []; }
      const res = await b.run();
      out.fights.push(`${ch.id}:${res}:${b.turnNo}${res === 'victory' ? '' : ':' + b.endReason}`);
      if (res !== 'victory') break;
      s.chapter++;
      if (ch.final) { s.endings[s.branch] = true; }
    }
    for (const u of s.party) u.resetBattleState();
    out.done = game.roadDone(); out.endings = Object.keys(s.endings);
    game.showWorld();
    out.card = document.querySelector('#world-next .chapter-num').textContent;
    out.another = !!document.getElementById('btn-another');
    return out;
  }, id);
  const results = {};
  for (const id of ['crown', 'council', 'exile', 'quiet', 'iron']) {
    results[id] = await walk(id);
    const r = results[id];
    ok(`the ${ROADS_TITLE(id)} road is fought to its ending, recorded, and offers another road while one is left`, r.branch === id && r.fights.length === 2 && r.fights.every(f => /:victory:/.test(f)) && r.done && r.endings.includes(id) && r.another === (r.endings.length < 5) && r.card.includes(ROADS_TITLE(id)), JSON.stringify(r));
  }
  ok('the Iron Crown sends Garret, Tamsin and Ingrid away, and another road brings them back', results.iron.exiled.join(',') === 'Garret,Tamsin,Ingrid' && results.iron.party === 10 && results.crown.party === 13, JSON.stringify({ iron: results.iron.party, exiled: results.iron.exiled, crown: results.crown.party }));
  const seen = await page.evaluate(() => ({ n: Object.keys(game.state.endings).length, text: document.querySelector('#world-next .revisit-row').textContent, another: !!document.getElementById('btn-another') }));
  ok('with every road walked, the road card says so and offers no more', seen.n === 5 && /5 of 5/.test(seen.text) && /Every road has been walked/.test(seen.text) && !seen.another, JSON.stringify(seen));
  // Saving and loading keeps the road, the endings and the exiles.
  await page.evaluate(async () => { const s = game.state; s.chapter = 24; s.branch = null; game.chooseRoad('iron'); game.saveGame(); });
  await page.reload(); await page.waitForSelector('#screen-title.active');
  await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
  const loaded = await page.evaluate(() => ({ branch: game.state.branch, endings: Object.keys(game.state.endings).length, exiled: game.state.exiled.map(u => u.name).join(','), party: game.state.party.length, next: game.chapterAt(game.state.chapter).id }));
  ok('a save keeps the chosen road, the endings seen and those who left', loaded.branch === 'iron' && loaded.endings === 5 && loaded.exiled === 'Garret,Tamsin,Ingrid' && loaded.party === 10 && loaded.next === 'iron1', JSON.stringify(loaded));
  await page.evaluate(() => { game.anotherRoad(); });
  const back = await page.evaluate(() => ({ party: game.state.party.length, fork: game.atFork(), exiled: game.state.exiled.length }));
  ok('another road returns to the capital with everyone back', back.party === 13 && back.fork && back.exiled === 0, JSON.stringify(back));
  // The trades open from the tree; the cities and the wagon carry the crown's gear.
  await page.evaluate(() => { const u = game.state.party[0]; u.jpTotal.knight = 700; u.jpTotal.warden = 260; u.jpTotal.whiteMage = 450; u.jpTotal.arcanist = 260; u.jpTotal.samurai = 260; u.jpTotal.corsair = 260; game.showWorld(); });
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  await page.click('#btn-tree'); await page.waitForTimeout(150);
  const openJobs = await page.evaluate(() => Object.fromEntries(['marshal', 'inquisitor', 'duelist'].map(j => [j, document.querySelector(`.job-card[data-job="${j}"]`).className.includes('open')])));
  ok('Marshal, Inquisitor and Duelist open from their requirements', openJobs.marshal && openJobs.inquisitor && openJobs.duelist, JSON.stringify(openJobs));
  await page.click('#btn-formation-back');
  const cities = await page.evaluate(() => { game.showCampTab('cities'); return [...document.querySelectorAll('.cities-card [data-city]')].map(e => e.dataset.city); });
  ok('Aldermere and Elderon City are on the road', cities.includes('aldermere') && cities.includes('elderonCity'), cities.join(','));
  await page.click('#btn-shop'); await page.waitForSelector('#screen-shop.active');
  const stocked = await page.evaluate(() => [...document.querySelectorAll('#shop-list button[data-buy]')].map(b => b.dataset.buy));
  ok('the wagon carries the crown\'s arms and not the cities\' own', ['marshalsBlade', 'rodOfOffice', 'rapier', 'regentsPlate', 'griffonMantle'].every(i => stocked.includes(i)) && !stocked.includes('courtBlade') && !stocked.includes('charterRing'), stocked.filter(i => /marshal|office|rapier|regent|griffon|golem|court|charter|league|kings/.test(i)).join(','));
  await page.click('#btn-shop-back');
  // Every new field draws, in its own mood.
  const moods = await page.evaluate(async () => {
    const out = {};
    for (const m of ['kingsroad', 'capital', 'gardens', 'throne', 'guildhall', 'senate', 'harbourgate', 'blockade', 'homestead', 'forge']) {
      const ch = [...CAMPAIGN, ...ROAD_ORDER.flatMap(id => ROADS[id].chapters)].find(c => c.map === m);
      game.battle = Battle.setup(MAPS[m], game.state.party, ch.enemies, { log: () => {}, awaitPlayerTurn: async () => {} }, ch.objective, 'knight');
      game.renderer.setBattle(game.battle); game.renderer.mood = MAPS[m].mood; game.renderer.fit(); game.renderer.draw();
      out[m] = MAPS[m].mood;
      await new Promise(r => setTimeout(r, 40));
    }
    return { moods: out, tracks: !!TRACKS.crown, dawn: !!MOODS.dawn && !!MOODS.court, sprites: ['griffon', 'golem'].every(k => SPRITE_TEMPLATES[k] && SPRITE_TEMPLATES[k].front.length === 18) };
  });
  ok('every field of the crown draws under its own sky, with the march and the new sprites in place', Object.keys(moods.moods).length === 10 && moods.tracks && moods.dawn && moods.sprites && errors.length === 0, JSON.stringify(moods));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'all Act V checks passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
function ROADS_TITLE(id) { return { crown: 'The Crown', council: 'The Free Cities', exile: 'The Long Road', quiet: 'The Quiet', iron: 'The Iron Crown' }[id]; }
