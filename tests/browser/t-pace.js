/* The speed toggle must make a battle actually faster -- every animation
   and every engine pause -- and must be remembered. */
const { open, beginBattle } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 10; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await beginBattle(page);
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  const timeMove = async () => page.evaluate(async () => {
    const u = game.battle.units.find(x => x.team === 'player' && x.alive);
    const path = [{ x: u.x, y: u.y }, { x: u.x + 1, y: u.y }, { x: u.x + 2, y: u.y }, { x: u.x + 1, y: u.y }, { x: u.x, y: u.y }];
    const t0 = performance.now();
    await game.renderer.animateMove(u, path);
    return performance.now() - t0;
  });
  const timeSleep = async () => page.evaluate(async () => { const t0 = performance.now(); await sleep(300); return performance.now() - t0; });
  const label = () => page.textContent('#btn-speed');
  const slow = await timeMove(), slowSleep = await timeSleep();
  const l1 = await label();
  await page.keyboard.press('f');
  await page.keyboard.press('f');
  const fast = await timeMove(), fastSleep = await timeSleep();
  const l3 = await label();
  await page.reload(); await page.waitForSelector('#screen-title.active');
  const remembered = await page.evaluate(() => PACE.scale);
  let fails = 0;
  const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? '  [' + d + ']' : '')); if (!c) fails++; };
  ok('the button shows 1x then 3x', l1 === '1×' && l3 === '3×', `${l1} -> ${l3}`);
  ok('a walk runs about three times faster', fast < slow / 2.2 && fast > slow / 4, `${slow.toFixed(0)}ms -> ${fast.toFixed(0)}ms`);
  ok('an engine pause runs about three times faster', fastSleep < slowSleep / 2.2, `${slowSleep.toFixed(0)}ms -> ${fastSleep.toFixed(0)}ms`);
  ok('the speed is remembered across a reload', remembered === 3, `scale=${remembered}`);
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'all pace checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
