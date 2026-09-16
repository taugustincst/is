const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  for (const [name, vp, touch] of [['desk', { width: 1280, height: 860 }, false], ['phone', { width: 412, height: 915 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(ALT + '/index.html');
    await page.waitForSelector('#screen-title.active');
    await page.click('#btn-new');
    await page.waitForSelector('#screen-world.active');
    // Dress the leader so the portrait has something to show.
    await page.evaluate(() => {
      const u = game.state.party[0];
      game.state.gil = 99999;
      for (const [slot, id] of [['weapon', 'longsword'], ['offhand', 'kiteShield'], ['head', 'ironHelm'], ['body', 'plateMail']]) {
        game.invAdd(id, 1);
        game.equip(u, slot, id);
      }
    });
    await page.click('#btn-formation');
    await page.waitForSelector('#screen-formation.active');
    await page.waitForTimeout(300);
    const shown = await page.evaluate(() => {
      const p = document.getElementById('form-portrait');
      const rows = document.querySelectorAll('canvas[data-portrait]');
      const c = p.getContext('2d').getImageData(0, 0, p.width, p.height).data;
      let lit = 0; for (let i = 3; i < c.length; i += 4) if (c[i]) lit++;
      return { w: p.width, h: p.height, litPixels: lit, rowPortraits: rows.length };
    });
    console.log(name, JSON.stringify(shown), 'errors:', errs.length ? errs : 'none');
    await page.screenshot({ path: `${S}/portrait-${name}.png` });
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
