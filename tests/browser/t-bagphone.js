const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  for (let i = 0; i < 20; i++) { try { await page.goto(ALT + '/index.html'); break; } catch (e) { await page.waitForTimeout(500); } }
  await page.waitForSelector('#screen-title.active');
  await page.tap('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => { for (const id of ['longsword', 'longbow', 'plateMail', 'wizardRobe', 'powerGlove', 'kiteShield', 'ironHelm', 'musket']) game.invAdd(id); game.openBaggage(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${S}/baggage-phone.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  console.log('overflow:', overflow, 'errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
