const { open, beginBattle } = require('./lib');
/* The second-tier systems are taught the first time each opens: a city,
   its forge, SP to spend, a beast that could be won over. Each tip is said
   once, one at a time, and a second campaign on the same device is not
   told again. */
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
const tip = (page) => page.evaluate(() => { const el = document.getElementById('tip'); return el.hidden ? null : { key: el.dataset.key, text: el.querySelector('.tip-text').textContent.slice(0, 50) }; });
(async () => {
  const { browser, page, errors } = await open();
  await page.evaluate(() => { localStorage.clear(); game.syncTitleButtons(); });
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  ok('a fresh camp has nothing to tell yet', (await tip(page)) === null);
  // A city opened for the first time: the city, then the forge.
  await page.evaluate(() => { game.state.cities.redwater = true; game.state.chapter = 2; game.goToCity('redwater'); });
  await page.waitForTimeout(150);
  const t1 = await tip(page);
  ok('the first open city is explained', t1 && t1.key === 'city' && /tavern/.test(t1.text), JSON.stringify(t1));
  await page.click('#btn-tip-ok'); await page.waitForTimeout(100);
  const t2 = await tip(page);
  ok('then the forge, one tip at a time', t2 && t2.key === 'forge', JSON.stringify(t2));
  await page.click('#btn-tip-ok'); await page.waitForTimeout(100);
  await page.evaluate(() => { game.showWorld(); game.goToCity('redwater'); });
  await page.waitForTimeout(150);
  ok('a second visit says nothing', (await tip(page)) === null);
  // SP to spend.
  await page.evaluate(() => { const u = game.state.party[0]; u.jp[u.job] = 500; game.showWorld(); });
  await page.waitForTimeout(150);
  const t3 = await tip(page);
  ok('SP to spend is pointed out at camp', t3 && t3.key === 'learn' && /✦/.test(t3.text), JSON.stringify(t3));
  await page.click('#btn-tip-ok'); await page.waitForTimeout(100);
  // A beast that could be tamed, with someone who knows Tame.
  await page.evaluate(() => {
    const u = game.state.party[0]; u.job = 'archer'; u.learned.tame = true; game.syncGear(u);
    game.runBattle(MAPS.verdant, [{ job: 'wolf', level: 2, x: 8, y: 2 }], 0, { objective: { type: 'rout' } });
  });
  await beginBattle(page);
  await page.waitForTimeout(300);
  const t4 = await tip(page);
  ok('a beast on the field with a tamer in the company brings the taming tip', t4 && t4.key === 'tame', JSON.stringify(t4));
  await page.click('#btn-tip-ok');
  // Remembered on the device: a new game is not told again.
  const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('elderon.tips')));
  ok('seen tips are remembered on the device', seen.length === 4 && seen.includes('city') && seen.includes('tame'), JSON.stringify(seen));
  await page.evaluate(() => { game.battle.over = true; game.battle.result = 'victory'; game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.evaluate(() => { game.showWorld(); game.newGame(2); game.state.cities.redwater = true; game.state.chapter = 2; game.goToCity('redwater'); });
  await page.waitForTimeout(150);
  ok('a second campaign on the same device is not told again', (await tip(page)) === null);
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  if (fails) { console.log(`${fails} check(s) FAILED`); process.exit(1); }
  console.log('all checks passed');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
