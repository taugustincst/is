const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
require('fs').mkdirSync(S, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  for (const [tag, vp, mobile] of [['desk', { width: 1280, height: 800 }, false], ['phone', { width: 412, height: 915 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('dialog', d => d.accept());
    await page.goto(BASE + '/index.html');
    await page.waitForSelector('#screen-title.active');
    await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
    await page.evaluate(() => {
      for (const u of game.state.party) for (const j of ['knight', 'dragoon', 'blackMage', 'timeMage', 'monk', 'whiteMage', 'archer', 'samurai', 'summoner', 'geomancer', 'bard', 'ninja', 'paladin', 'arcanist', 'assassin', 'sage']) { u.jpTotal[j] = 1000; u.jp[j] = 1000; }
      game.state.gil = 20000; game.state.chapter = 4;
      for (const u of game.state.party) { u.level = 9; }
      const [a, b, c] = game.state.party;
      game.equip(a, 'weapon', null); a.job = 'dragonlord'; game.syncGear(a); a.jp.dragonlord = 900; a.jpTotal.dragonlord = 900;
      game.equip(b, 'weapon', null); b.job = 'hierophant'; game.syncGear(b);
      game.equip(c, 'weapon', null); c.job = 'sage'; game.syncGear(c);
      game.showWorld();
    });
    await page.screenshot({ path: `${S}/${tag}-camp.png` });
    await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${S}/${tag}-formation.png`, fullPage: true });
    await page.click('#btn-formation-back');
    await page.click('#btn-shop'); await page.waitForSelector('#screen-shop.active');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${S}/${tag}-shop.png` });
    await page.click('#btn-shop-back');
    await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
    await page.screenshot({ path: `${S}/${tag}-story.png` });
    for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
    await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${S}/${tag}-deploy.png` });
    await page.click('#deploy-panel button[data-a="go"]');
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${S}/${tag}-menu.png` });
    // Open the ability list and aim one at an enemy.
    const hasAb = await page.evaluate(() => !!document.querySelector('#action-menu button[data-a="ability"]'));
    if (hasAb) { await page.click('#action-menu button[data-a="ability"]'); await page.waitForTimeout(300); await page.screenshot({ path: `${S}/${tag}-abilities.png` }); }
    await page.evaluate(() => { const b = game.battle; const u = game.ui.turn.unit; const foe = b.units.find(x => x.team === 'enemy' && x.alive); game.ui.hover && game.ui.hover(foe.x, foe.y); });
    if (await page.isVisible('#btn-log')) { await page.click('#btn-log'); await page.waitForTimeout(300); }
    await page.screenshot({ path: `${S}/${tag}-log.png` });
    await page.click('#btn-help'); await page.waitForTimeout(300);
    await page.screenshot({ path: `${S}/${tag}-help.png` });
    console.log(tag, 'errors:', errs.length ? errs : 'none');
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
