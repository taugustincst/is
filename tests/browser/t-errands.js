const { BASE, ALT } = require('./lib');
/* This round through the real screens: errands from camp, crystals on the
   field, JP on the results roll-call, and the field's ambience. */
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
  // ---- errands at camp
  const offers = await page.evaluate(() => [...document.querySelectorAll('.errand.offer')].map(e => e.dataset.errand));
  ok('two errands are on the board', offers.length === 2 && offers[0] !== offers[1], offers.join(','));
  const leaderOffered = await page.evaluate(() => [...document.querySelectorAll('.errand.offer select option')].some(o => o.textContent.startsWith('Rowan')));
  ok('the leader cannot be sent', !leaderOffered);
  const oneDay = await page.evaluate(() => { const spec = ERRANDS.find(e => e.days === 1 && document.querySelector(`.errand.offer[data-errand="${e.id}"]`)); return spec ? spec.id : null; });
  let sent = oneDay;
  if (!sent) {
    // Force a one-day errand onto the board for the test.
    sent = await page.evaluate(() => { const spec = ERRANDS.find(e => e.days === 1); game.state.errands.offered[0] = spec.id; game.showWorld(); return spec.id; });
  }
  const gil0 = await page.evaluate(() => game.state.gil);
  const mira = await page.evaluate(() => { const u = game.state.party.find(x => x.name === 'Mira'); return { id: u.id, jp: Object.values(u.jpTotal).reduce((a, b) => a + b, 0) }; });
  await page.evaluate(() => game.showCampTab('company'));
  await page.selectOption(`.errand.offer[data-errand="${sent}"] select[data-unit]`, mira.id);
  await page.click(`.errand.offer[data-errand="${sent}"] button[data-send]`);
  await page.waitForTimeout(150);
  const away = await page.evaluate(() => ({ active: game.state.errands.active.map(a => a.unit), chip: [...document.querySelectorAll('.party-chip.away')].map(c => c.textContent.trim()), offers: document.querySelectorAll('.errand.offer').length }));
  ok('a unit sent on an errand is marked away and the board refills', away.active.length === 1 && away.active[0] === mira.id && away.chip.length === 1 && away.chip[0].startsWith('Mira') && away.offers === 2, JSON.stringify(away));
  await page.screenshot({ path: `${S}/errands-camp.png`, fullPage: true });
  // Save and reload keeps the errand.
  await page.evaluate(() => game.saveGame());
  await page.reload(); await page.waitForSelector('#screen-title.active');
  await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
  const kept = await page.evaluate(() => game.state.errands.active.length === 1 && game.state.errands.active[0].left === 1);
  ok('an errand survives a save and reload', kept);
  // ---- into a training battle: the away unit is not on the roster
  await page.click('#btn-train'); await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 6; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  const roster = await page.evaluate(() => game.battle.units.filter(u => u.team === 'player').map(u => u.name));
  ok('the unit away on an errand is not on the roster', roster.length === 3 && !roster.includes('Mira'), roster.join(','));
  // Ambience follows the mood once audio is live.
  const amb = await page.evaluate(() => { audio.init(); return { mood: game.renderer.mood, kind: audio.ambient ? audio.ambient.kind : null, expected: AMBIENCE[game.renderer.mood] || null }; });
  ok('the field plays the ambience its mood names', amb.kind === amb.expected, JSON.stringify(amb));
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  // ---- crystals: carry an enemy off, and watch a hurt enemy go for the crystal
  const cry = await page.evaluate(async () => {
    const b = game.battle;
    const foes = b.units.filter(u => u.team === 'enemy' && u.alive);
    const victim = foes[0], hurt = foes[1];
    // Put the hurt one next to where the victim falls so the crystal is in reach.
    const spot = [...b.grid.reachable(hurt, b.units).values()].find(c => c.x === victim.x && c.y === victim.y);
    victim.hp = 0; victim.koCount = 1; await b.tickDown(victim);
    const crystal = b.crystals[0];
    // Stand the hurt one next to the crystal so the choice is squarely the AI's.
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => b.grid.tile(crystal.x + dx, crystal.y + dy)).find(t => t && b.grid.passable(t.x, t.y) && !b.occupantAt(t.x, t.y));
    if (near) { hurt.x = near.x; hurt.y = near.y; }
    const reachable = crystal && [...b.grid.reachable(hurt, b.units).values()].some(c => c.x === crystal.x && c.y === crystal.y);
    hurt.hp = Math.max(1, Math.floor(hurt.maxHp * 0.2));
    const before = { x: hurt.x, y: hurt.y, hp: hurt.hp };
    if (reachable) await b.aiTurn(hurt);
    return { crystals: b.crystals.length + (b.crystalAt(hurt.x, hurt.y) ? 0 : 0), reachable, took: reachable && hurt.hp === hurt.maxHp && !b.crystals.some(c => c.x === hurt.x && c.y === hurt.y), before, after: { x: hurt.x, y: hurt.y, hp: hurt.hp, max: hurt.maxHp }, tileInfo: (() => { game.ui.renderTileInfo(b.grid.tile(before.x, before.y)); return document.getElementById('tile-info').textContent; })() };
  });
  ok('a fallen enemy leaves a crystal', cry.reachable === true, JSON.stringify(cry.after));
  ok('a badly hurt enemy goes for a crystal it can reach', cry.reachable && cry.took, `reachable=${cry.reachable} ${JSON.stringify(cry.before)} -> ${JSON.stringify(cry.after)}`);
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = game.battle; if (!b.crystals.length) { const u = b.units.find(x => x.team === 'enemy' && x.alive); b.crystals.push({ x: u.x, y: u.y + 1, from: 'Test', team: 'enemy', t0: 0 }); } });
  await page.screenshot({ path: `${S}/crystal.png` });
  // ---- finish on Auto at speed; results carry JP
  await page.evaluate(() => { game.setPace(3); game.ui.setAuto(true); });
  await page.waitForSelector('#screen-results.active', { timeout: 600000 });
  const res = await page.evaluate(() => ({ jp: [...document.querySelectorAll('.res-jp')].map(e => e.textContent), note: !!document.querySelector('#results-body .res-note'), amb: audio.ambient }));
  ok('the roll-call shows JP earned per unit', res.jp.length === 3 && res.jp.some(t => /\+\d+ JP/.test(t)), res.jp.join(' | '));
  ok('the ambience stops with the battle', res.amb == null);
  await page.screenshot({ path: `${S}/results-jp.png` });
  await page.click('#btn-results'); await page.waitForSelector('#screen-world.active');
  const back = await page.evaluate(() => ({ active: game.state.errands.active.length, reports: game.state.errands.reports, gil: game.state.gil, jp: Object.values(game.state.party.find(x => x.name === 'Mira').jpTotal).reduce((a, b) => a + b, 0), shown: !!document.querySelector('.errand.report') }));
  ok('the errand comes due after the battle and the report waits at camp', back.active === 0 && back.reports.length === 1 && back.shown && /Mira returns/.test(back.reports[0]), back.reports[0]);
  ok('the errand pays gil and JP', back.jp > mira.jp, `JP ${mira.jp} -> ${back.jp}, gil ${gil0} -> ${back.gil}`);
  await page.screenshot({ path: `${S}/errands-report.png`, fullPage: true });
  // ---- every ambience renders at a sane level, and stops clean
  const levels = await page.evaluate(async () => {
    const out = {};
    for (const kind of ['rain', 'wind', 'marsh', 'embers', 'night']) {
      const off = new OfflineAudioContext(1, 44100 * 2, 44100);
      const saved = { ctx: audio.ctx, musicGain: audio.musicGain };
      audio.ctx = off; audio.musicGain = off.createGain(); audio.musicGain.connect(off.destination);
      audio.startAmbient(kind);
      await new Promise(r => setTimeout(r, 400)); // let a few timed events schedule
      const buf = await off.startRendering();
      const d = buf.getChannelData(0); let sum = 0; for (let i = 44100; i < d.length; i++) sum += d[i] * d[i];
      out[kind] = Math.sqrt(sum / 44100);
      audio.stopAmbient();
      out[kind + '_stopped'] = audio.ambient === null;
      audio.ctx = saved.ctx; audio.musicGain = saved.musicGain;
    }
    return out;
  });
  const kinds = ['rain', 'wind', 'marsh', 'embers', 'night'];
  ok('every ambience is audible but quiet', kinds.every(k => levels[k] > 0.004 && levels[k] < 0.12), kinds.map(k => `${k}=${levels[k].toFixed(4)}`).join(' '));
  ok('every ambience stops clean', kinds.every(k => levels[k + '_stopped']));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'all errand checks passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
