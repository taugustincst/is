const { BASE, ALT } = require('./lib');
/* Auto-place places the company afresh; the camp and the unit page are tabbed. */
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
  // Camp tabs: Road is the default and only its cards show.
  const vis = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-camp-tab]')].map(el => [el.dataset.campTab + ':' + (el.id || el.className.split(' ')[1]), !el.classList.contains('tab-hidden')])));
  const road = await vis();
  ok('the camp opens on Road with only its cards showing', road['road:campfire'] && !road['company:tavern'] && !road['cities:cities-card'] && !road['options:difficulty'], JSON.stringify(road));
  await page.click('#camp-tabs button[data-camp="company"]');
  const company = await vis();
  ok('the Company tab shows the tavern and errands and hides the rest', company['company:tavern'] && company['company:errands-card'] && !company['road:campfire'], JSON.stringify(company));
  await page.evaluate(() => { game.state.chapter = 1; game.showWorld(); });
  const kept = await page.evaluate(() => ({ tab: game.campTab, badge: document.querySelector('#camp-tabs button[data-camp="cities"] .badge') && document.querySelector('#camp-tabs button[data-camp="cities"] .badge').textContent, still: !document.querySelector('.card.tavern').classList.contains('tab-hidden') }));
  ok('the tab is kept across a redraw and Cities shows how many wait to be opened', kept.tab === 'company' && kept.still && kept.badge === '1', JSON.stringify(kept));
  await page.screenshot({ path: `${S}/camp-tabs.png`, clip: { x: 150, y: 400, width: 660, height: 380 } });
  // Unit page tabs.
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  const unitTab = await page.evaluate(() => ({ unit: !document.querySelector('[data-form-tab="unit"]').classList.contains('tab-hidden'), gear: !document.querySelector('[data-form-tab="gear"]').classList.contains('tab-hidden'), skills: !document.querySelector('[data-form-tab="skills"]').classList.contains('tab-hidden') }));
  ok('the unit page opens on Unit', unitTab.unit && !unitTab.gear && !unitTab.skills, JSON.stringify(unitTab));
  await page.click('#form-tabs button[data-form="skills"]'); await page.waitForTimeout(100);
  await page.evaluate(() => { const u = game.state.party[game.formSel]; u.jp[u.job] = 500; game.renderFormationDetail(); });
  const skills = await page.evaluate(() => ({ shown: !document.querySelector('[data-form-tab="skills"]').classList.contains('tab-hidden'), badge: !!document.querySelector('#form-tabs button[data-form="skills"] .badge'), learn: document.querySelectorAll('button[data-learn]:not([disabled])').length }));
  ok('Skills stays selected across a redraw and is marked when JP can be spent', skills.shown && skills.badge && skills.learn > 0, JSON.stringify(skills));
  await page.click('button[data-learn]:not([disabled])'); await page.waitForTimeout(100);
  ok('learning keeps you on Skills', await page.evaluate(() => !document.querySelector('[data-form-tab="skills"]').classList.contains('tab-hidden')));
  await page.click('#form-tabs button[data-form="gear"]'); await page.waitForTimeout(100);
  ok('Gear shows the equipment and Optimize', await page.isVisible('#btn-optimize') && await page.isVisible('select[data-slot="weapon"]'));
  await page.screenshot({ path: `${S}/formation-tabs.png` });
  await page.click('#btn-formation-back'); await page.waitForSelector('#screen-world.active');
  // Auto-place: moves a hand-placed party back to the anchors, and fills from a cleared field.
  await page.click('#btn-train'); await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 6; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  const start = await page.evaluate(() => game.battle.units.filter(u => u.team === 'player' && u.x >= 0).map(u => `${u.name}@${u.x},${u.y}`).join(' '));
  await page.evaluate(() => { const b = game.battle; const u = b.units.find(x => x.team === 'player' && x.x >= 0); const spot = b.deployZone.find(t => !b.occupantAt(t.x, t.y)); b.withdraw(u); b.placeUnit(u, spot.x, spot.y); game.ui.renderDeploy(); });
  const moved = await page.evaluate(() => game.battle.units.filter(u => u.team === 'player' && u.x >= 0).map(u => `${u.name}@${u.x},${u.y}`).join(' '));
  await page.click('#deploy-panel button[data-a="auto"]'); await page.waitForTimeout(150);
  const auto = await page.evaluate(() => ({ placed: game.battle.units.filter(u => u.team === 'player' && u.x >= 0).map(u => `${u.name}@${u.x},${u.y}`).join(' '), hint: document.getElementById('hint').textContent }));
  ok('Auto-place places the party afresh after a hand move', moved !== start && auto.placed === start, `${moved} -> ${auto.placed}`);
  ok('Auto-place says what it did', /Placed 4 of 4/.test(auto.hint), auto.hint);
  await page.click('#deploy-panel button[data-a="clear"]'); await page.waitForTimeout(100);
  await page.click('#deploy-panel button[data-a="auto"]'); await page.waitForTimeout(150);
  const refilled = await page.evaluate(() => game.battle.units.filter(u => u.team === 'player' && u.x >= 0).length);
  ok('Auto-place fills a cleared field', refilled === 4, `${refilled} placed`);
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'all tab checks passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
