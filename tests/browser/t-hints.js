const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  for (const [label, opts] of [
    ['desktop', { viewport: { width: 1280, height: 800 } }],
    ['phone', { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true }],
  ]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(BASE + '/index.html');
    await page.evaluate(() => { document.getElementById('btn-new').click(); });
    await page.waitForSelector('#screen-world.active');
    await page.evaluate(() => { game.state.party.forEach(u => { u.level = 5; game.syncGear(u); });
      game.runBattle(MAPS.verdant, CAMPAIGN[0].enemies, 0, { objective: { type: 'rout' } }); });
    await page.waitForSelector('#deploy-panel.open');
    const deployHint = (await page.textContent('#hint')).trim();
    await page.evaluate(() => document.querySelector('#deploy-panel button[data-a="go"]').click());
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
    const menuHint = (await page.textContent('#hint')).trim();
    await page.evaluate(() => document.querySelector('#action-menu button[data-a="move"]').click());
    await page.waitForTimeout(100);
    const moveHint = (await page.textContent('#hint')).trim();
    console.log(`${label.padEnd(8)} touchOnly=${await page.evaluate(() => TOUCH_ONLY)}`);
    console.log(`         deploy: ${deployHint.slice(0, 62)}`);
    console.log(`         menu:   ${menuHint}`);
    console.log(`         move:   ${moveHint}`);
    console.log(`         errors: ${errors.join('; ') || 'none'}`);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
