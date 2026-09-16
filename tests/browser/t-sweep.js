const { BASE, ALT } = require('./lib');
/* A console sweep: every screen, every panel, a full battle on Auto, with
   every console error and warning recorded. */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  for (const [tag, vp, mobile] of [['desk', { width: 1280, height: 800 }, false], ['phone', { width: 412, height: 915 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile });
    const page = await ctx.newPage();
    const log = [];
    page.on('pageerror', e => log.push('PAGEERROR ' + e));
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(m.type().toUpperCase() + ' ' + m.text()); });
    page.on('requestfailed', r => log.push('REQFAIL ' + r.url()));
    page.on('response', r => { if (r.status() >= 400) log.push('HTTP ' + r.status() + ' ' + r.url()); });
    await page.goto(BASE + '/index.html');
    await page.waitForSelector('#screen-title.active');
    await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
    await page.evaluate(() => { audio.init(); game.state.gil = 5000; for (const u of game.state.party) { u.jpTotal.squire = 300; u.jp.squire = 300; } game.showWorld(); });
    await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
    await page.click('#btn-tree'); await page.click('.job-card[data-job="knight"]'); await page.click('#btn-tree-become');
    await page.evaluate(() => { game.formTab = 'gear'; game.renderFormationDetail(); });
    await page.click('#btn-optimize');
    await page.click('#btn-formation-back');
    await page.click('#btn-shop'); await page.waitForSelector('#screen-shop.active');
    await page.click('#shop-list button[data-buy]');
    await page.click('#shop-tabs button:nth-child(2)'); await page.waitForTimeout(100);
    await page.click('#btn-shop-back');
    await page.evaluate(() => game.showCampTab('company'));
    await page.click('#btn-hire-squire');
    await page.evaluate(() => { const u = game.state.party[4]; game.sendOnErrand(game.offeredErrands()[0], u); });
    await page.click('#btn-save');
    await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
    for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
    await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
    await page.click('#deploy-panel button[data-a="go"]');
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
    // Walk the menus: act -> abilities -> back, threat, help, log, rotate, zoom.
    await page.click('#action-menu button[data-a="act"]'); await page.waitForTimeout(80);
    const sets = await page.$$('#action-menu button[data-i]');
    if (sets.length > 1) { await sets[1].click(); await page.waitForTimeout(80); await page.keyboard.press('Escape'); }
    await page.keyboard.press('Escape');
    await page.evaluate(() => { const b = game.battle; const foe = b.units.find(u => u.team === 'enemy' && u.alive); game.ui.onClick(b.grid.tile(foe.x, foe.y)); });
    await page.click('#btn-help'); await page.click('#btn-help-close');
    if (await page.isVisible('#btn-log')) { await page.click('#btn-log'); await page.click('#btn-log'); }
    await page.click('#btn-rot-l'); await page.click('#btn-rot-r'); await page.keyboard.press('+'); await page.keyboard.press('0');
    await page.evaluate(() => { game.setPace(3); game.ui.setAuto(true); });
    await page.waitForSelector('#screen-results.active', { timeout: 600000 });
    await page.click('#btn-results');
    await page.waitForSelector('#screen-world.active, #screen-story.active');
    for (let i = 0; i < 10 && await page.isVisible('#screen-story.active'); i++) { await page.click('#btn-story-next'); await page.waitForTimeout(100); }
    await page.waitForSelector('#screen-world.active');
    await page.click('#btn-title'); await page.waitForSelector('#screen-title.active');
    await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
    console.log(tag, log.length ? 'ISSUES:\n' + log.join('\n') : 'clean console');
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
