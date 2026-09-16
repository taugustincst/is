const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const errs = [];
  const shoot = async (w, h, mobile, chapter, cities, name) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); page.on('pageerror', e => errs.push(String(e)));
    await page.goto(BASE + '/index.html'); await page.waitForSelector('#screen-title.active');
    await page.evaluate(() => { localStorage.clear(); game.newGame(1); });
    await page.waitForSelector('#screen-world.active');
    await page.evaluate(([ch, cs]) => { game.state.chapter = ch; game.state.cities = cs; game.showWorld(); }, [chapter, cities]);
    await page.waitForTimeout(300);
    const box = await page.$eval('#world-map', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    await page.screenshot({ path: `${S}/${name}.png`, clip: box });
    // Every placed label must be inside the canvas and clear of every other label.
    const report = await page.evaluate(() => {
      const cv = document.getElementById('world-map'); const c = cv.getContext('2d');
      return { w: cv.clientWidth, h: cv.clientHeight, ratio: (cv.clientHeight / cv.clientWidth).toFixed(2) };
    });
    console.log(name, JSON.stringify(report));
    await ctx.close();
  };
  await shoot(412, 915, true, 7, { redwater: true, dunmarchTown: true }, 'map-phone-ch8');
  await shoot(412, 915, true, 16, { redwater: true, dunmarchTown: true, fordwaterTown: true, hollowmereTown: true, greywatch: true, frosthold: true }, 'map-phone-ch17');
  await shoot(360, 740, true, 3, { redwater: true }, 'map-phone-small-ch4');
  await shoot(1100, 800, false, 7, { redwater: true, dunmarchTown: true }, 'map-desk-ch8');
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
