const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  for (const vp of [{ n: 'desk', width: 1280, height: 800, m: false }, { n: 'phone', width: 412, height: 915, m: true }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.m, isMobile: vp.m, deviceScaleFactor: 3 });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('PAGEERROR', e.message));
    await page.goto(ALT + '/index.html');
    await page.waitForSelector('#screen-title.active');
    await (vp.m ? page.tap('#btn-new') : page.click('#btn-new'));
    await page.waitForSelector('#screen-world.active');
    await (vp.m ? page.tap('#btn-battle') : page.click('#btn-battle'));
    await page.waitForSelector('#screen-story.active');
    for (let i = 0; i < 10; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
    await page.waitForSelector('#deploy-panel.open');
    await page.screenshot({ path: `${S}/queue-${vp.n}-deploy.png` });
    await page.click('#deploy-panel button[data-a="go"]');
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
    await page.waitForTimeout(300);
    await page.locator('#turn-order').screenshot({ path: `${S}/queue-${vp.n}.png` });
    await ctx.close();
  }
  await browser.close();
  console.log('ok');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
