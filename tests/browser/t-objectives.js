const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
/* The marked objectives: a charge to escort, a mark to reach, a mark to hold,
   and reinforcements that arrive on their round. The mark is drawn on the
   field, the charge stands in the turn order as such and is not one of the
   deployed, and each objective ends the battle for the right reason. */
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
// Is there gold at the mark? Samples the canvas around the goal tile's top.
const goldAt = (page) => page.evaluate(() => {
  const r = game.renderer, b = game.battle, g = b.objective.goal;
  r.time = performance.now(); r.draw();
  const s = r.toScreen(g.x, g.y, b.grid.height(g.x, g.y));
  const z = r.zoom, W = r.W, H = r.H;
  const px = Math.round(((s.sx - W / 2) * z + W / 2) * r.dpr), py = Math.round(((s.sy - H / 2) * z + H / 2) * r.dpr);
  const d = r.ctx.getImageData(px - 14 * r.dpr, py - 34 * r.dpr, 28 * r.dpr, 40 * r.dpr).data;
  let gold = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] > 170 && d[i + 1] > 140 && d[i + 2] < 120 && d[i] - d[i + 2] > 80) gold++;
  return gold;
});
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  // ---- escort -------------------------------------------------------------
  await page.evaluate(() => {
    game.state.party.forEach(u => { u.level = 6; game.syncGear(u); });
    game.runBattle(MAPS.verdant, [{ job: 'knight', level: 5, x: 8, y: 2 }], 0, { objective: { type: 'escort', protectLeader: true, goal: 'far', escort: { name: 'Pell', job: 'chemist', level: 5 } } });
  });
  await page.waitForSelector('#deploy-panel.open', { timeout: 15000 });
  const dep = await page.evaluate(() => { const b = game.battle, c = b.objective.charge; return { goal: b.objective.goal, charge: c && { name: c.name, team: c.team, escort: c.escort, onField: c.x >= 0, inZone: b.deployKeys.has(`${c.x},${c.y}`) }, deployed: b.deployed().length, placed: b.units.filter(u => u.team === 'player' && u.x >= 0).length, roster: game.ui.deploy.roster.some(u => u.escort), counter: document.querySelector('#deploy-panel .panel-title small').textContent }; });
  ok('the charge stands in the deploy zone before anyone is placed, on the company\'s side', dep.charge && dep.charge.team === 'player' && dep.charge.escort && dep.charge.onField && dep.charge.inZone, JSON.stringify(dep.charge));
  ok('the charge is not one of the deployed, nor on the roster', dep.deployed === dep.placed - 1 && !dep.roster && dep.counter.startsWith(`${dep.deployed}/`), `${dep.deployed} of ${dep.placed} ${dep.roster} ${dep.counter}`);
  ok('the mark is resolved to a tile far from the deploy zone', dep.goal && dep.goal.x >= 0, JSON.stringify(dep.goal));
  const gold = await goldAt(page);
  ok('the mark is drawn in gold on the field', gold > 40, `${gold} gold pixels`);
  await page.click('#deploy-panel button[data-a="auto"]');
  await page.screenshot({ path: `${S}/objective-escort-deploy.png` });
  await beginBattle(page);
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 30000 });
  const bar = await page.textContent('#objective');
  ok('the objective bar names the charge', /Pell/.test(bar), bar);
  const order = await page.evaluate(() => { const row = [...document.querySelectorAll('#turn-order .order-row')].find(r => r.textContent.includes('Pell')); return row ? { cls: row.className, sub: row.querySelector('.sub').textContent } : null; });
  ok('in the turn order the charge is neither side, and labelled as the charge', order && /neutral/.test(order.cls) && order.sub === 'charge', JSON.stringify(order));
  const win = await page.evaluate(() => { const b = game.battle, c = b.objective.charge, g = b.objective.goal; c.x = g.x; c.y = g.y; b.checkEnd(); return { over: b.over, result: b.result, why: b.endReason }; });
  ok('the charge on the mark wins the battle', win.over && win.result === 'victory' && /reaches the mark/.test(win.why), JSON.stringify(win));
  await page.evaluate(() => game.ui.abort());
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.evaluate(() => game.showWorld());
  await page.waitForSelector('#screen-world.active');
  // The charge lost is the battle lost.
  await page.evaluate(() => { game.runBattle(MAPS.verdant, [{ job: 'knight', level: 5, x: 8, y: 2 }], 0, { objective: { type: 'escort', goal: 'far', escort: { name: 'Pell', job: 'chemist', level: 5 } } }); });
  await beginBattle(page);
  const lost = await page.evaluate(async () => { const b = game.battle, c = b.objective.charge; c.hp = 0; b.onUnitKO(c); for (let i = 0; i < 3; i++) await b.tickDown(c); b.checkEnd(); return { over: b.over, result: b.result, why: b.endReason }; });
  ok('the charge carried off is the road lost', lost.over && lost.result === 'defeat' && /lost/.test(lost.why), JSON.stringify(lost));
  await page.evaluate(() => game.ui.abort());
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.evaluate(() => game.showWorld());
  await page.waitForSelector('#screen-world.active');
  // ---- reach --------------------------------------------------------------
  await page.evaluate(() => { game.runBattle(MAPS.verdant, [{ job: 'knight', level: 5, x: 8, y: 2 }], 0, { objective: { type: 'reach', protectLeader: true, goal: 'far' } }); });
  await beginBattle(page);
  const reach = await page.evaluate(() => { const b = game.battle, o = b.objective; const other = b.units.find(u => u.team === 'player' && u !== o.leader && u.x >= 0); const r = {}; if (other) { other.x = o.goal.x; other.y = o.goal.y; b.checkEnd(); r.otherEnds = b.over; other.x = 0; other.y = 0; } o.leader.x = o.goal.x; o.leader.y = o.goal.y; b.checkEnd(); r.over = b.over; r.result = b.result; r.why = b.endReason; r.bar = document.querySelector('#objective').textContent; return r; });
  ok('reach: only the leader on the mark ends it, and ends it won', reach.otherEnds === false && reach.over && reach.result === 'victory', JSON.stringify(reach));
  await page.evaluate(() => game.ui.abort());
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.evaluate(() => game.showWorld());
  await page.waitForSelector('#screen-world.active');
  // ---- hold ---------------------------------------------------------------
  await page.evaluate(() => { game.runBattle(MAPS.verdant, [{ job: 'knight', level: 5, x: 8, y: 2 }], 0, { objective: { type: 'hold', rounds: 3, goal: 'centre' } }); });
  await beginBattle(page);
  const hold = await page.evaluate(() => {
    const b = game.battle, o = b.objective, me = b.units.find(u => u.team === 'player' && u.x >= 0), foe = b.units.find(u => u.team === 'enemy');
    const bars = [];
    me.x = o.goal.x; me.y = o.goal.y;
    b.round = 2; b.checkEnd(); game.ui.showObjective(); bars.push(document.querySelector('#objective').textContent); const h1 = o.held;
    b.round = 3; b.checkEnd(); const h2 = o.held;
    me.x = 0; me.y = 0; foe.x = o.goal.x; foe.y = o.goal.y; b.round = 4; b.checkEnd(); const reset = o.held;
    foe.x = 8; foe.y = 2; me.x = o.goal.x; me.y = o.goal.y;
    for (let r = 5; r < 9 && !b.over; r++) { b.round = r; b.checkEnd(); }
    return { h1, h2, reset, over: b.over, result: b.result, why: b.endReason, bar: bars[0] };
  });
  ok('hold: a round on the mark counts, the other side on it resets the count', hold.h1 === 1 && hold.h2 === 2 && hold.reset === 0, JSON.stringify(hold));
  ok('hold: the rounds held win it', hold.over && hold.result === 'victory' && /held/.test(hold.why), hold.why);
  ok('the objective bar counts the rounds held', /1/.test(hold.bar), hold.bar);
  await page.evaluate(() => game.ui.abort());
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.evaluate(() => game.showWorld());
  await page.waitForSelector('#screen-world.active');
  // ---- reinforcements -----------------------------------------------------
  await page.evaluate(() => { game.runBattle(MAPS.verdant, [{ job: 'knight', level: 5, x: 8, y: 2 }], 0, { objective: { type: 'rout', reinforcements: [{ round: 2, text: 'More of them over the hill!', enemies: [{ job: 'archer', level: 5, x: 8, y: 1, name: 'Late Archer' }, { job: 'knight', level: 5, x: 8, y: 2, name: 'Late Knight' }] }] } }); });
  await beginBattle(page);
  const re = await page.evaluate(() => {
    const b = game.battle; const before = b.units.filter(u => u.team === 'enemy').length;
    b.checkEnd(); b.arriveReinforcements(); const early = b.units.filter(u => u.team === 'enemy').length;
    b.round = 2; b.arriveReinforcements();
    const now = b.units.filter(u => u.team === 'enemy');
    const banner = document.getElementById('banner');
    const late = now.filter(u => /Late/.test(u.name));
    const spots = late.map(u => `${u.x},${u.y}`);
    const distinct = new Set(spots).size === spots.length && late.every(u => b.grid.passable(u.x, u.y));
    const log = [...document.querySelectorAll('#log .log-line')].map(l => l.textContent).join(' | ');
    b.arriveReinforcements();
    return { before, early, after: now.length, again: b.units.filter(u => u.team === 'enemy').length, distinct, banner: banner.textContent, shown: /show/.test(banner.className), logged: /over the hill/.test(log), order: [...document.querySelectorAll('#turn-order .order-row')].some(r => /Late/.test(r.textContent)) };
  });
  ok('reinforcements wait for their round, then take the field once', re.early === re.before && re.after === re.before + 2 && re.again === re.after, JSON.stringify(re));
  ok('each arrives on a free, walkable tile (the knight\'s was taken)', re.distinct, JSON.stringify(re));
  ok('their arrival is announced on the field, in the log and in the turn order', re.shown && /over the hill/.test(re.banner) && re.logged && re.order, JSON.stringify(re));
  await page.screenshot({ path: `${S}/objective-reinforcements.png` });
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  if (fails) { console.log(`${fails} check(s) FAILED`); process.exit(1); }
  console.log('all checks passed');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
