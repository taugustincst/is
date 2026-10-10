const { open } = require('./lib');
const S = require('./lib').OUT;
/* The road is walked: after a chapter is won, the company's marker goes
   along the road from the old stop to the new over a still map, and the
   next chapter's card slides in when it arrives. A camp opened later
   draws the marker at the stop with no walk. */
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  ok('a fresh camp draws the company at its stop with no walk', await page.evaluate(() => !game._travelAnim && !game.travel));
  // A chapter won: the walk from stop one to stop two.
  await page.evaluate(() => { game.travel = { from: 0, to: 1 }; game.state.chapter = 1; game.showWorld(); });
  await page.waitForTimeout(80);
  const early = await page.evaluate(() => ({ anim: !!game._travelAnim, pos: game.travelPos && { x: Math.round(game.travelPos.x), y: Math.round(game.travelPos.y), t: game.travelPos.t } }));
  ok('the marker sets out along the road', early.anim && early.pos && early.pos.t < 0.5, JSON.stringify(early));
  await page.waitForTimeout(400);
  const mid = await page.evaluate(() => ({ pos: game.travelPos && { x: Math.round(game.travelPos.x), y: Math.round(game.travelPos.y), t: game.travelPos.t } }));
  await page.screenshot({ path: `${S}/road-walk.png` });
  ok('and is on its way a moment later', mid.pos && mid.pos.t > early.pos.t && (mid.pos.x !== early.pos.x || mid.pos.y !== early.pos.y), JSON.stringify({ early, mid }));
  await page.waitForFunction(() => !game._travelAnim, null, { timeout: 5000 });
  const done = await page.evaluate(() => ({ travel: game.travel, pos: game.travelPos, arrive: document.getElementById('world-next').classList.contains('arrive'), title: document.querySelector('#world-next .chapter-title').textContent }));
  ok('it arrives: the walk is over, the map is drawn afresh and the chapter\'s card slides in', !done.travel && !done.pos && done.arrive && /Millbrook/.test(done.title), JSON.stringify(done));
  // The real path: a chapter won through the flow sets the walk up.
  await page.evaluate(() => { game.state.chapter = 0; game.showWorld(); });
  await page.evaluate(() => { game.startNextChapter(); });
  await page.waitForSelector('#screen-story.active');
  await page.click('#btn-story-skip'); await page.click('#btn-story-next');
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  await page.click('#deploy-panel button[data-a="auto"]');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.evaluate(() => { for (const u of game.battle.units) if (u.team === 'enemy') u.hp = 0; game.battle.checkEnd(); game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.waitForSelector('#screen-story.active', { timeout: 20000 });
  const pending = await page.evaluate(() => game.travel);
  ok('a chapter won sets the walk up for the camp', pending && pending.from === 0 && pending.to === 1, JSON.stringify(pending));
  await page.click('#btn-story-skip'); await page.click('#btn-story-next');
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  await page.waitForTimeout(100);
  ok('and the camp walks it', await page.evaluate(() => !!game._travelAnim || !!game.travelPos));
  await page.waitForFunction(() => !game._travelAnim, null, { timeout: 5000 });
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  if (fails) { console.log(`${fails} check(s) FAILED`); process.exit(1); }
  console.log('all checks passed');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
