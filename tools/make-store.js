#!/usr/bin/env node
/* Renders the Google Play listing assets into store/: the feature graphic,
   phone and tablet screenshots taken from the running game, and the icon.

   This is the one tool in the project with a dependency: it drives a headless
   Chromium through playwright-core, because the screenshots have to be of the
   real game. Install it once, next to the repository or globally:

       npm install playwright-core            # the driver
       npx playwright-core install chromium   # a browser, if none is present

   or point CHROME at any Chrome or Chromium you already have:

       CHROME=/usr/bin/google-chrome node tools/make-store.js

   Every image lands at a size Play accepts: screenshots are JPEG with sides
   between 320 and 3840 px and no side more than twice the other; the feature
   graphic is 1024x500. See store/LISTING.md for what goes where. */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { ROOT } = require('./load');

const OUT = path.join(ROOT, 'store');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, base: `http://127.0.0.1:${srv.address().port}` }));
  });
}

function chromePath(chromium) {
  if (process.env.CHROME) return process.env.CHROME;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean);
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const d of fs.readdirSync(r)) {
      for (const f of ['chrome-linux/chrome', 'chrome-linux/headless_shell', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) {
        const p = path.join(r, d, f);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  try { return chromium.executablePath(); } catch (e) { return undefined; }
}

// Walks the game to the first battle, through the story, to the deployment
// panel. The same path on a phone and a tablet.
async function toDeploy(page) {
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 12; i++) {
    const t = await page.textContent('#btn-story-next');
    await page.click('#btn-story-next');
    if (t === 'Onward') break;
  }
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  await page.waitForTimeout(500);
}
// Retreat counts as a defeat: a results screen comes before the camp.
async function leaveBattle(page) {
  await page.click('#btn-retreat');
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
}
async function toMenu(page) {
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.waitForTimeout(300);
}

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright-core')); }
  catch (e) { console.error('playwright-core is not installed; see the note at the top of this file.'); process.exit(1); }
  const exe = chromePath(chromium);
  if (!exe) { console.error('no Chromium found; set CHROME=/path/to/chrome'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, base } = await serve();
  const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
  const shot = (page, name) => page.screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: 92 });
  const written = [];

  // 1. Feature graphic, 1024x500.
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
    await page.goto(`${base}/tools/store/feature.html`);
    await page.waitForTimeout(400);
    await shot(page, 'feature-graphic-1024x500.jpg'); written.push('feature-graphic-1024x500.jpg');
    await page.close();
  }

  // 2. Phone screenshots, 1200x2400: a 400x800 viewport at 3x. Exactly 2:1
  //    is the tallest Play allows, and the width a current phone lays out at.
  {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept());
    await page.goto(`${base}/index.html`);
    await page.waitForSelector('#screen-title.active');
    await page.waitForTimeout(300);
    await shot(page, 'phone-1-title.jpg');
    await toDeploy(page);
    await shot(page, 'phone-2-deploy.jpg');
    await toMenu(page);
    await page.click('#action-menu button[data-a="move"]');
    await page.waitForTimeout(2000);   // let the turn banner fade first
    await shot(page, 'phone-3-move.jpg');
    await page.click('#action-menu button[data-a="cancel"]');
    await page.waitForTimeout(200);
    await page.click('#action-menu button[data-a="act"]');
    await page.waitForTimeout(200);
    // The first skillset is the weapon; a lone Attack goes straight to targets.
    await page.click('#action-menu button[data-i="0"]');
    await page.waitForFunction(() => game.ui.turn && (game.ui.turn.mode === 'target' || game.ui.turn.mode === 'abilities'));
    if (await page.evaluate(() => game.ui.turn.mode === 'abilities')) {
      await page.click('#action-menu button[data-id]:not([disabled])');
      await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'target');
    }
    await page.waitForTimeout(600);
    await shot(page, 'phone-4-attack.jpg');
    await leaveBattle(page);
    await page.click('#btn-formation');
    await page.waitForSelector('#screen-formation.active');
    await page.waitForTimeout(300);
    await shot(page, 'phone-5-formation.jpg');
    await page.click('#btn-formation-back');
    await page.waitForSelector('#screen-world.active');
    await page.click('#btn-shop');
    await page.waitForSelector('#screen-shop.active');
    await page.waitForTimeout(300);
    await shot(page, 'phone-6-shop.jpg');
    written.push('phone-1-title.jpg', 'phone-2-deploy.jpg', 'phone-3-move.jpg', 'phone-4-attack.jpg', 'phone-5-formation.jpg', 'phone-6-shop.jpg');
    await ctx.close();
  }

  // 3. Tablet screenshots, 2560x1600 landscape (16:10, fine for 7" and 10").
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept());
    await page.goto(`${base}/index.html`);
    await toDeploy(page);
    await toMenu(page);
    await page.click('#action-menu button[data-a="move"]');
    await page.waitForTimeout(2000);
    await shot(page, 'tablet-1-battle.jpg');
    await leaveBattle(page);
    await page.click('#btn-formation');
    await page.waitForSelector('#screen-formation.active');
    await page.waitForTimeout(300);
    await shot(page, 'tablet-2-formation.jpg');
    written.push('tablet-1-battle.jpg', 'tablet-2-formation.jpg');
    await ctx.close();
  }

  // 4. The 512x512 icon is the one the web app already uses.
  fs.copyFileSync(path.join(ROOT, 'icons/icon-512.png'), path.join(OUT, 'icon-512.png'));
  written.push('icon-512.png');

  await browser.close();
  srv.close();
  console.log(`wrote ${written.length} files into store/:\n  ` + written.join('\n  '));
})().catch(e => { console.error('FAILED', e); process.exit(1); });
