const { BASE, ALT } = require('./lib');
/* Act III through the real screens: the north's fields, weather and theme,
   the three new trades, the Court's creatures, and the Regent's last shape. */
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
  const shape = await page.evaluate(() => ({ chapters: CAMPAIGN.length, acts: ACTS.map(a => [a.from, a.to]), last: CAMPAIGN[CAMPAIGN.length - 1].id, end: CAMPAIGN[CAMPAIGN.length - 1].outro.join(' ').includes('THE END.'), north: CAMPAIGN.slice(12, 17).map(c => MAPS[c.map].mood), act3End: CAMPAIGN[16].outro.join(' ').includes('END OF ACT III.') }));
  ok('the north is the third act, ending at Starfall', shape.chapters >= 22 && shape.acts.length >= 4 && shape.acts[2][1] === 16 && shape.act3End && shape.north.every(m => m === 'snow' || m === 'aurora'), JSON.stringify(shape));
  // The trades unlock from the tree.
  await page.evaluate(() => { const u = game.state.party[0]; u.jpTotal.blackMage = 260; u.jpTotal.timeMage = 120; u.jpTotal.archer = 260; u.jpTotal.knight = 120; u.jpTotal.samurai = 120; u.jpTotal.arcanist = 120; game.state.gil = 30000; game.state.chapter = 13; game.showWorld(); });
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  await page.click('#btn-tree'); await page.waitForTimeout(150);
  const open = await page.evaluate(() => Object.fromEntries(['frostweaver', 'warden', 'runeblade'].map(j => [j, document.querySelector(`.job-card[data-job="${j}"]`).className.includes('open')])));
  ok('Frostweaver, Warden and Runeblade open from their requirements', open.frostweaver && open.warden && open.runeblade, JSON.stringify(open));
  await page.click('.job-card[data-job="warden"]'); await page.click('#btn-tree-become'); await page.waitForTimeout(150);
  await page.evaluate(() => { const u = game.state.party[1]; u.jpTotal.blackMage = 260; u.jpTotal.timeMage = 120; game.equip(u, 'weapon', null); u.job = 'frostweaver'; game.syncGear(u); });
  await page.click('#btn-formation-back');
  await page.click('#btn-shop'); await page.waitForSelector('#screen-shop.active');
  const stocked = await page.evaluate(() => [...document.querySelectorAll('#shop-list button[data-buy]')].map(b => b.dataset.buy));
  ok('the wagon carries the north\'s arms and star-iron late in the war', ['wardenSpear', 'frostRod', 'snowcloak', 'warmthStone', 'starIronBlade'].every(i => stocked.includes(i)), stocked.filter(i => /warden|frost|snow|fur|star|rune|warmth|icicle|rime/.test(i)).join(','));
  await page.click('#btn-shop-back');
  // Chapter 14: Frostholm, in the snow, with the frost theme playing.
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  const title = await page.textContent('#story-title');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  const field = await page.evaluate(() => { audio.init(); return { mood: game.renderer.mood, music: game.battleMusic, track: !!TRACKS.frost, foes: game.battle.units.filter(u => u.team === 'enemy').map(u => u.job), terrain: [...new Set(MAPS.frostholm.terrain.join(''))].join('') }; });
  ok('Frostholm is fought in the snow under the frost theme against the Court', title === 'Frostholm' && field.mood === 'snow' && field.music === 'frost' && field.track && field.foes.includes('hollowKnight') && field.foes.includes('rimeWight') && field.terrain.includes('n'), JSON.stringify(field));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${S}/act3-frostholm.png` });
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  // A hollow knight absorbs ice and fears fire; Iron Footing shrugs off Stop; Cold Blood adds to ice.
  const rules = await page.evaluate(() => {
    const b = game.battle; const hk = b.units.find(u => u.job === 'hollowKnight');
    const w = b.units.find(u => u.job === 'warden' && u.team === 'player');
    w.learned.ironFooting = true; w.setPassive('movement', 'ironFooting'); w.addStatus('stop'); const stopped = w.hasStatus('stop'); w.setPassive('movement', null);
    const fw = b.units.find(u => u.job === 'frostweaver' && u.team === 'player'); fw.learned.rime = true;
    const plain = b.computeEffect(fw, ABILITIES.rime, ABILITIES.rime.effects[0], b.units.find(u => u.job === 'squire' && u.team === 'enemy') || hk);
    return { ice: affinityOf(hk, 'ice'), fire: affinityOf(hk, 'fire'), stopped, plain };
  });
  ok('a hollow knight drinks ice and burns; Iron Footing refuses Stop', rules.ice < 0 && rules.fire > 1 && rules.stopped === false, JSON.stringify(rules));
  await page.evaluate(() => { game.battle.over = true; game.battle.result = 'defeat'; game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 }); await page.click('#btn-results'); await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  // Starfall: aurora sky, and the Regent becomes the Nameless Cold at 40%.
  const phase = await page.evaluate(async () => {
    const ch = CAMPAIGN[16];
    const b = Battle.setup(MAPS[ch.map], game.state.party, ch.enemies, { log: () => {}, awaitPlayerTurn: async () => {} }, ch.objective, 'knight');
    const boss = b.units.find(u => u.boss);
    boss.hp = Math.floor(boss.maxHp * 0.38);
    b.checkPhase(boss);
    game.renderer.mood = 'aurora'; const sky = skyLayer(200, 100, 'aurora'); let lit = 0; const d = sky.getContext('2d').getImageData(0, 0, 200, 40).data; for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 60) lit++;
    return { job: boss.job, name: boss.name, alive: boss.alive, hpPct: boss.hp / boss.maxHp, mood: MAPS[ch.map].mood, auroraLit: lit };
  });
  ok('at Starfall the Regent folds into the Nameless Cold under the aurora', phase.job === 'namelessCold' && phase.alive && phase.hpPct >= 0.45 && phase.hpPct <= 0.55 && phase.mood === 'aurora' && phase.auroraLit > 100, JSON.stringify(phase));
  // Unmake can never end a commander.
  const slay = await page.evaluate(() => { const ch = CAMPAIGN[16]; const b = Battle.setup(MAPS[ch.map], game.state.party, ch.enemies, { log: () => {}, awaitPlayerTurn: async () => {} }, ch.objective, 'knight'); const boss = b.units.find(u => u.boss); const p = b.predict(game.state.party[0], ABILITIES.unmake, boss.x, boss.y); return p.length ? p[0].notes.join(',') : 'none'; });
  ok('Unmake cannot fell a commander', /immune/.test(slay), slay);
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'all Act III checks passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
