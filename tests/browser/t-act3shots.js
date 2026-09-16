const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(ALT + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => { game.state.chapter = 15; game.showWorld(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${S}/act3-world.png`, clip: { x: 150, y: 20, width: 660, height: 470 } });
  for (const [idx, name] of [[12, 'rimewater'], [16, 'starfall']]) {
    await page.evaluate((i) => { game.state.chapter = i; game.showWorld(); }, idx);
    await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
    for (let k = 0; k < 8; k++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
    await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${S}/act3-map-${name}.png` });
    await page.evaluate(() => { game.battle.over = true; game.battle.result = 'defeat'; game.ui.abort(); });
    await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  }
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
