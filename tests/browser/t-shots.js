const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(ALT + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.screenshot({ path: `${S}/final-title.png` });
  await page.tap('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.screenshot({ path: `${S}/final-camp.png` });
  await page.tap('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.tap('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${S}/final-deploy.png` });
  await page.tap('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.tap('#action-menu button[data-a="move"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${S}/final-move.png` });
  console.log('screenshots taken');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
