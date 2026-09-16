const { BASE, ALT } = require('./lib');
// Hammers the battle UI with random but legal interactions, looking for
// exceptions, stuck states, or a turn that never resolves.
const { open, beginBattle } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.goto(BASE + '/index.html');
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => {
    game.state.gil = 99999;
    for (let i = 0; i < 4; i++) game.hire(i % 2 ? 'chemist' : 'squire');
    const jobs = ['knight', 'archer', 'whiteMage', 'blackMage', 'monk', 'ninja', 'dragoon', 'timeMage'];
    game.state.party.forEach((u, i) => {
      u.level = 9; u.job = jobs[i % jobs.length]; u.autoLearn(1);
      for (const k of ['reaction', 'support', 'movement']) {
        const opts = Object.keys(PASSIVES).filter(p => PASSIVES[p].kind === k);
        const id = opts[i % opts.length]; u.learned[id] = true; u.passives[k] = id;
      }
      game.syncGear(u); game.optimize(u);
    });
    game.runBattle(MAPS.thornwall, CAMPAIGN[6].enemies, 0, CAMPAIGN[6].objective);
  });
  await beginBattle(page);

  let acted = 0, stalls = 0;
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    const over = await page.evaluate(() => !game.battle || game.battle.over);
    if (over) break;
    // Wait for the player's turn, but never forever.
    const ready = await page.waitForFunction(
      () => game.ui.turn && ['menu', 'act', 'abilities', 'target', 'move', 'wait'].includes(game.ui.turn.mode),
      null, { timeout: 25000 }).then(() => true).catch(() => false);
    if (!ready) {
      // The battle finishing during the wait is not a stall.
      const ended = await page.evaluate(() => !game.battle || game.battle.over);
      if (!ended) stalls++;
      break;
    }
    const mode = await page.evaluate(() => game.ui.turn && game.ui.turn.mode);
    if (!mode) continue;
    // Take a random legal action for whatever mode we are in.
    const did = await page.evaluate((mode) => {
      const pickBtn = (sel) => {
        const bs = [...document.querySelectorAll(sel)].filter(b => !b.disabled);
        if (!bs.length) return false;
        bs[Math.floor(Math.random() * bs.length)].click();
        return true;
      };
      const tapTile = (tiles) => {
        if (!tiles || !tiles.length) return false;
        const t = tiles[Math.floor(Math.random() * tiles.length)];
        game.ui.onClick(game.battle.grid.tile(t.x, t.y));
        return true;
      };
      const t = game.ui.turn;
      if (mode === 'menu') return pickBtn('#action-menu button');
      if (mode === 'act') return pickBtn('#action-menu button');
      if (mode === 'abilities') return pickBtn('#action-menu button');
      if (mode === 'move') return tapTile([...t.reach.values()]) || pickBtn('#action-menu button');
      if (mode === 'target') return tapTile(t.targets) || pickBtn('#action-menu button');
      if (mode === 'wait') return pickBtn('#action-menu button');
      return false;
    }, mode);
    if (did) acted++;
    await page.waitForTimeout(120);
    // Occasionally jiggle the camera and the log, as a player would.
    if (acted % 7 === 0) {
      await page.evaluate(() => { game.renderer.setZoom(game.renderer.zoom * (Math.random() < 0.5 ? 1.2 : 0.85));
        game.renderer.cam.x += (Math.random() - 0.5) * 200; game.renderer.clampCamera();
        document.getElementById('btn-log').click(); });
    }
  }
  const state = await page.evaluate(() => ({
    over: !game.battle || game.battle.over,
    result: game.battle && game.battle.result,
    turns: game.battle && game.battle.turnNo,
    screen: game.screen,
    stuckAirborne: game.battle ? game.battle.units.filter(u => u.airborne).length : 0,
    overlaps: (() => {
      if (!game.battle) return 0;
      const seen = new Set(); let n = 0;
      for (const u of game.battle.units) { if (u.x < 0 || !u.alive) continue;
        const k = u.x + ',' + u.y; if (seen.has(k)) n++; seen.add(k); }
      return n;
    })(),
  }));
  console.log('interactions taken:', acted, '| stalls:', stalls);
  console.log('final:', JSON.stringify(state));
  console.log('ERRORS:', errors.length ? errors.slice(0, 5).join('\n') : 'none');
  await browser.close();
  if (stalls || state.overlaps || errors.length) process.exit(1);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
