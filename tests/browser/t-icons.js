const { BASE } = require('./lib');
/* Item icons: every item and every one of the apothecary's items paints a
   glyph, the kinds look different from one another, and the icons appear in
   the shop, the baggage, a city's market and forge, the unit's gear page,
   the results screen and the battle's Items menu. A contact sheet of every
   base item goes to tests/out/icons-sheet.png. */
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

  // 1. Every key paints something, and the kinds are told apart.
  const cover = await page.evaluate(() => {
    const keys = Object.keys(ITEMS).concat(Object.keys(ABILITIES).filter(id => ABILITIES[id].kind === 'item').map(id => 'ab:' + id));
    const blank = [], kinds = {}, sigs = {};
    const cv = document.createElement('canvas');
    for (const k of keys) {
      if (!paintIcon(cv, k, 1)) { blank.push(k); continue; }
      const d = cv.getContext('2d').getImageData(0, 0, 16, 16).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      if (n < 24) blank.push(k + ':' + n);
      const kind = iconKind(k);
      kinds[kind] = (kinds[kind] || 0) + 1;
      // The shape of a kind: which cells are filled.
      let sig = ''; for (let i = 3; i < d.length; i += 4) sig += d[i] > 0 ? '1' : '0';
      sigs[kind] = sig;
    }
    const shapes = new Set(Object.values(sigs));
    return { total: keys.length, blank, kinds: Object.keys(kinds).length, shapes: shapes.size, glyphs: Object.keys(ICON_GLYPHS).length };
  });
  ok('every item and chemist\'s item paints an icon', cover.blank.length === 0 && cover.total > 800, `${cover.total} keys, blank: ${cover.blank.slice(0, 8).join(',') || 'none'}`);
  ok('every kind of glyph has its own shape', cover.shapes === cover.kinds && cover.kinds >= 45, `${cover.kinds} kinds, ${cover.shapes} shapes, ${cover.glyphs} glyphs`);
  // Two pieces of one kind still differ where they should: tier, element, a forge's work.
  const diff = await page.evaluate(() => {
    const px = (k) => { const cv = document.createElement('canvas'); paintIcon(cv, k, 1); return Array.from(cv.getContext('2d').getImageData(0, 0, 16, 16).data).join(','); };
    return { tier: px('shortSword') !== px('runeBlade'), plus: px('shortSword') !== px('shortSword+1') && px('shortSword+1') !== px('shortSword+3'), element: px('kiteShield') !== px(Object.keys(ITEMS).find(id => ITEMS[id].otype === 'shield' && ITEMS[id].resist && !ITEMS[id].base)) };
  });
  ok('tier, element and a forge\'s pips tell pieces of one kind apart', diff.tier && diff.plus && diff.element, JSON.stringify(diff));

  // 2. A contact sheet of every base item, for the eye.
  await page.evaluate(() => {
    const ids = Object.keys(ITEMS).filter(id => !ITEMS[id].base).concat(Object.keys(ABILITIES).filter(id => ABILITIES[id].kind === 'item').map(id => 'ab:' + id));
    const cols = 24, cell = 44, rows = Math.ceil(ids.length / cols);
    const sheet = document.createElement('canvas'); sheet.id = 'icon-sheet';
    sheet.width = cols * cell; sheet.height = rows * cell;
    const c = sheet.getContext('2d'); c.fillStyle = '#1a1a2a'; c.fillRect(0, 0, sheet.width, sheet.height);
    c.imageSmoothingEnabled = false;
    ids.forEach((id, i) => { const src = iconCanvas(id); c.drawImage(src, (i % cols) * cell + 6, Math.floor(i / cols) * cell + 6, 32, 32); });
    Object.assign(sheet.style, { position: 'fixed', left: '0', top: '0', zIndex: 99 });
    document.body.appendChild(sheet);
  });
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.locator('#icon-sheet').screenshot({ path: `${S}/icons-sheet.png` });
  await page.evaluate(() => document.getElementById('icon-sheet').remove());
  await page.setViewportSize({ width: 1280, height: 800 });

  // 3. Where they show.
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  const painted = (sel) => page.evaluate((sel) => { const all = [...document.querySelectorAll(sel + ' canvas[data-icon]')]; return { n: all.length, done: all.filter(c => c.dataset.painted === '1').length }; }, sel);
  await page.evaluate(() => { game.state.gil = 9000; game.invAdd('holyPendant'); game.invAdd('ironIngot', 3); game.openShop('buy'); });
  const shop = await painted('#shop-list');
  ok('the shop shows an icon on every row', shop.n >= 8 && shop.done === shop.n, JSON.stringify(shop));
  await page.screenshot({ path: `${S}/icons-shop.png` });
  await page.evaluate(() => game.openBaggage());
  const bag = await painted('#bag-list'), worn = await painted('#bag-worn');
  ok('the baggage shows icons on its shelf and in the worn table', bag.n >= 2 && bag.done === bag.n && worn.n >= 4 && worn.done === worn.n, JSON.stringify({ bag, worn }));
  await page.screenshot({ path: `${S}/icons-baggage.png` });
  await page.evaluate(() => { game.showWorld(); game.state.cities.redwater = true; game.state.chapter = 2; game.goToCity('redwater'); });
  const city = await painted('#cities');
  ok('a city\'s market and forge show icons', city.n >= 6 && city.done === city.n, JSON.stringify(city));
  await page.evaluate(() => { game.forgeTab = 'materials'; game.renderCityPanel(CITIES.find(c => c.id === 'redwater')); });
  const mats = await painted('#cities .forge-body');
  ok('the forge\'s materials show icons', mats.n >= 2 && mats.done === mats.n, JSON.stringify(mats));
  await page.screenshot({ path: `${S}/icons-forge.png` });
  await page.evaluate(() => { game.showWorld(); game.openFormation(0); game.formTab = 'gear'; game.renderFormationDetail(); });
  const gear = await painted('#form-detail');
  ok('the gear page shows the worn piece beside each slot', gear.n >= 2 && gear.done === gear.n, JSON.stringify(gear));
  await page.screenshot({ path: `${S}/icons-gear.png` });

  // 4. The battle: the apothecary's Items menu, and the results' finds.
  await page.evaluate(() => {
    const mira = game.state.party.find(u => u.job === 'chemist');
    mira.learned.potion = true; mira.learned.ether = true; mira.learned.phoenixDown = true;
    BattleUI.prototype.awaitPlayerTurn = function (u) { return game.battle.aiTurn(u); };
    game.showScreen('world');
    window.__ran = game.runBattle(MAPS.verdant, [{ job: 'squire', level: 1, x: 4, y: 1 }], 400, { objective: { type: 'rout' } });
  });
  await page.waitForSelector('#deploy-panel.open', { timeout: 15000 });
  const menu = await page.evaluate(() => {
    const mira = game.state.party.find(u => u.job === 'chemist');
    game.ui.turn = { unit: mira, set: { label: 'Items', abilities: ['potion', 'ether', 'phoenixDown'] } };
    game.ui.setMode('abilities');
    const all = [...document.querySelectorAll('#action-menu canvas[data-icon]')];
    return { n: all.length, done: all.filter(c => c.dataset.painted === '1').length, keys: all.map(c => c.dataset.icon).join(',') };
  });
  ok('the Items menu shows an icon on each of the chemist\'s items', menu.n === 3 && menu.done === 3, JSON.stringify(menu));
  await page.screenshot({ path: `${S}/icons-menu.png` });
  await page.evaluate(() => game.ui.setMode('menu'));
  await page.click('#deploy-panel button[data-a="go"]');
  await page.evaluate(() => game.setPace(3));
  await page.waitForSelector('#screen-results.active', { timeout: 120000 });
  const res = await painted('#results-body');
  ok('the results show icons on what was found', res.n >= 1 && res.done === res.n, JSON.stringify(res));
  await page.screenshot({ path: `${S}/icons-results.png` });

  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  if (errors.length) fails++;
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'all icon checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
