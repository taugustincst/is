const { BASE, ALT } = require('./lib');
/* Cities through the real screens: listed as the road reaches them, fought
   open, then hiring trained hands and selling what the wagon does not. */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  const none = await page.evaluate(() => document.querySelectorAll('.city[data-city]').length);
  ok('no city is reachable before the road reaches one', none === 0, `${none} listed`);
  await page.evaluate(() => { game.state.chapter = 1; game.state.gil = 6000; for (const u of game.state.party) { u.level = 6; const kit = bestGearFor(u.job, null, 2); for (const [slot, id] of Object.entries(kit)) if (id) u.gear[slot] = id; u.resetBattleState(); } game.showWorld(); });
  const listed = await page.evaluate(() => [...document.querySelectorAll('.city[data-city]')].map(e => e.dataset.city + ':' + e.className.replace('city', '').trim()));
  ok('Redwater is listed as held once the road reaches it', listed.length === 1 && listed[0] === 'redwater:held', listed.join(','));
  const wagon = await page.evaluate(() => { game.openShop('buy'); const ids = [...document.querySelectorAll('#shop-list button[data-buy]')].map(b => b.dataset.buy); game.showWorld(); return ids; });
  ok('the wagon does not carry city stock', !wagon.includes('redwaterSteel') && !wagon.includes('reaverCloak'));
  // Fight it open (retrying if the reavers get lucky).
  let opened = false;
  for (let attempt = 0; attempt < 3 && !opened; attempt++) {
    await page.evaluate(() => game.showCampTab('cities'));
    await page.click('.city[data-city="redwater"] button[data-city-go]');
    await page.waitForSelector('#screen-story.active');
    const title = await page.textContent('#story-title');
    if (attempt === 0) ok('the liberation opens with the city\'s story', /Redwater, held by/.test(title), title);
    for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
    await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
    if (attempt === 0) {
      const foes = await page.evaluate(() => game.battle.units.filter(u => u.team === 'enemy').map(u => `${u.name}:${u.level}`));
      ok('the reavers hold the quarry at the city\'s level or a step under the party', foes.length === 4 && foes.every(f => +f.split(':')[1] === 5), foes.join(','));
      await page.screenshot({ path: `${S}/city-battle.png` });
    }
    await page.click('#deploy-panel button[data-a="go"]');
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
    await page.evaluate(() => { game.setPace(3); game.ui.setAuto(true); });
    await page.waitForSelector('#screen-results.active', { timeout: 600000 });
    const won = await page.evaluate(() => document.getElementById('results-title').textContent === 'Victory!');
    console.log(`  attempt ${attempt + 1}: ${won ? 'won' : 'lost'}`);
    if (!won) console.log('   ', await page.evaluate(() => JSON.stringify({ reason: (document.querySelector('.res-reason') || {}).textContent, log: [...document.querySelectorAll('#log div')].slice(-6).map(d => d.textContent) })));
    await page.click('#btn-results');
    await page.waitForSelector('#screen-world.active, #screen-story.active', { timeout: 20000 });
    for (let i = 0; i < 6 && await page.isVisible('#screen-story.active'); i++) { await page.click('#btn-story-next'); await page.waitForTimeout(100); }
    await page.waitForSelector('#screen-world.active');
    opened = await page.evaluate(() => game.cityOpen('redwater'));
    if (!won) await page.evaluate(() => { for (const u of game.state.party) { u.level += 4; u.resetBattleState(); } });
  }
  ok('a won battle opens the city and it stays open', opened);
  await page.screenshot({ path: `${S}/city-camp.png`, clip: { x: 150, y: 20, width: 660, height: 470 } });
  await page.evaluate(() => game.showCampTab('cities'));
  await page.click('.city[data-city="redwater"] button[data-city-go]'); await page.waitForTimeout(150);
  const panel = await page.evaluate(() => ({ hires: [...document.querySelectorAll('button[data-hire-at]')].map(b => b.dataset.hireAt), stock: [...document.querySelectorAll('button[data-buy-at]')].map(b => b.dataset.buyAt) }));
  ok('an open city offers its trades and its own market', panel.hires.join(',') === 'knight,archer,thief' && panel.stock.join(',') === 'redwaterSteel,reaverCloak', JSON.stringify(panel));
  await page.screenshot({ path: `${S}/city-panel.png`, fullPage: true });
  const gil0 = await page.evaluate(() => game.state.gil), size0 = await page.evaluate(() => game.state.party.length);
  await page.click('button[data-hire-at="knight"]'); await page.waitForTimeout(150);
  const hired = await page.evaluate(() => { const u = game.state.party[game.state.party.length - 1]; return { job: u.job, level: u.level, jp: u.jp.knight, canUse: u.canUseJob('knight') }; });
  ok('a city hire arrives trained in the trade', hired.job === 'knight' && hired.jp >= 100 && hired.canUse && (await page.evaluate(() => game.state.party.length)) === size0 + 1, JSON.stringify(hired));
  ok('the city panel stays open after a hire', await page.isVisible('#btn-city-back'));
  await page.click('button[data-buy-at="redwaterSteel"]'); await page.waitForTimeout(150);
  const bought = await page.evaluate(() => ({ have: game.invCount('redwaterSteel'), gil: game.state.gil }));
  ok('the market sells its own steel', bought.have === 1 && bought.gil === gil0 - 450 - 700, JSON.stringify(bought));
  // Save, reload: the city is still open.
  await page.evaluate(() => game.saveGame());
  await page.reload(); await page.waitForSelector('#screen-title.active');
  await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
  ok('an open city survives a save and reload', await page.evaluate(() => game.cityOpen('redwater')));
  // The map knows the city: a click on its marker opens the panel.
  const clicked = await page.evaluate(() => { const cv = document.getElementById('world-map'); const r = cv.getBoundingClientRect(); const c = CITIES[0]; const x = r.left + c.pos[0] * r.width, y = r.top + c.pos[1] * r.height; cv.onclick({ clientX: x, clientY: y }); return !!document.getElementById('btn-city-back'); });
  ok('the city\'s marker on the map opens it', clicked);
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'all city checks passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
