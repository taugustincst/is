const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  for (const [tag, vp, mobile] of [['desk', { width: 1280, height: 800 }, false], ['phone', { width: 412, height: 915 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    const page = await ctx.newPage();
    await page.goto(BASE + '/index.html');
    await page.waitForSelector('#screen-title.active');
    await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
    await page.evaluate(() => { game.state.chapter = 3; game.showWorld(); });
    await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
    for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
    await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
    await page.click('#deploy-panel button[data-a="go"]');
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
    await page.evaluate(() => { const b = game.battle; const foe = b.units.find(u => u.team === 'enemy' && u.alive && u.job === 'blackMage') || b.units.find(u => u.team === 'enemy' && u.alive); game.ui.hover = b.grid.tile(foe.x, foe.y); game.ui.refresh(); game.ui.banner(`${game.ui.turn.unit.name}'s turn`, 'player'); });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${S}/${tag}-enemycard.png` });
    await page.click('#btn-help'); await page.waitForTimeout(200);
    const closeVisible = await page.evaluate(() => { const r = document.getElementById('btn-help-close').getBoundingClientRect(); return r.bottom <= window.innerHeight; });
    await page.evaluate(() => document.querySelector('.help-box').scrollTo(0, 99999));
    await page.waitForTimeout(100);
    const closeReachable = await page.evaluate(() => { const r = document.getElementById('btn-help-close').getBoundingClientRect(); return r.bottom <= window.innerHeight && r.top >= 0; });
    await page.screenshot({ path: `${S}/${tag}-help.png` });
    console.log(tag, 'help close visible at open:', closeVisible, 'reachable after scroll:', closeReachable);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
