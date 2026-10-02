#!/usr/bin/env node
/* Renders the store assets into store/: the Google Play feature graphic,
   phone and tablet screenshots taken from the running game, Steam's capsules
   at every size the store asks for, and the icon.

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
  // From the title a new game is started; from the camp the road is taken as it is.
  if (await page.evaluate(() => game.screen === 'title')) {
    await page.click('#btn-new');
    await page.waitForSelector('#screen-world.active');
  }
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
  await page.click('#btn-retreat'); await page.click('#ask-yes');
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
}
async function toMenu(page) {
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.waitForTimeout(300);
}
// A company that has fought its way to `chapter`: levelled, in advanced
// jobs, wearing what the wagon sells there. The screenshots show the game
// as it is a few hours in, not the first field with four footmen on it.
async function midCampaign(page, chapter) {
  await page.evaluate((ch) => {
    const s = game.state;
    s.chapter = ch; s.gil = 4000;
    const jobs = ['knight', 'blackMage', 'archer', 'whiteMage', 'monk'];
    s.party.forEach((u, i) => { u.job = jobs[i % jobs.length]; u.level = ch + 2; u.jp[u.job] = 400; u.jpTotal[u.job] = 400; const kit = bestGearFor(u.job, null, Math.min(6, ch)); for (const [slot, id] of Object.entries(kit)) if (id) u.gear[slot] = id; u.resetBattleState(); });
    // The mage knows Fire, so the spell in the shot is one she could cast.
    const mage = s.party.find(u => u.job === 'blackMage'); if (mage) mage.learned.fire = true;
    game.showWorld();
  }, chapter);
}
// A spell landing among the enemy, mid-flight, with the numbers coming off.
async function spellShot(page, name, shot) {
  await page.waitForTimeout(1400);   // the turn banner
  // Bring the enemy into the picture first: on a phone the board is wider
  // than the screen and they start off its edge.
  await page.evaluate(async () => { const b = game.battle; const foe = b.units.filter(u => u.team === 'enemy' && u.alive && u.x >= 0)[0]; await game.renderer.focus(foe, 0); });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const b = game.battle, r = game.renderer;
    const foe = b.units.filter(u => u.team === 'enemy' && u.alive && u.x >= 0)[0];
    const tiles = b.grid.areaTiles(foe.x, foe.y, 1);
    r.landFx(ABILITIES.fire, tiles);
    r.burst(tiles, ELEMENTS.fire.color, 400);
    for (const t of tiles) { const hit = b.unitAt(t.x, t.y); if (hit) { r.showFloat(hit, String(40 + Math.round(Math.random() * 30)), '#ffd8a0'); hit.hitAt = performance.now(); } }
  });
  await page.waitForTimeout(160);
  await shot(page, name);
  await page.waitForTimeout(900);
}
// Attack chosen, a target under the finger, the forecast open.
async function attackPreview(page) {
  // An enemy stands beside the active unit, back turned: the forecast then
  // has a target, and shows what a blow from behind is worth.
  await page.evaluate(async () => {
    const b = game.battle, u = game.ui.turn.unit;
    const foe = b.units.filter(x => x.team === 'enemy' && x.alive && x.x >= 0)[0];
    // Of the free neighbouring tiles, the one lowest on screen is nearest
    // the viewer: the foe stands in front of the company, not behind it.
    const spots = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => b.grid.tile(u.x + dx, u.y + dy)).filter(t => t && t.t !== 'x' && t.t !== 'w' && t.t !== 't' && !b.unitAt(t.x, t.y));
    const spot = spots.sort((p, q) => game.renderer.toScreen(q.x, q.y, q.h).sy - game.renderer.toScreen(p.x, p.y, p.h).sy)[0];
    if (spot) { foe.x = spot.x; foe.y = spot.y; foe.facing = facingFromDelta(spot.x - u.x, spot.y - u.y); }
    // Everyone else steps back a row, so the two of them stand clear.
    for (const m of b.units) if (m.team === 'player' && m !== u && m.x >= 0) { const back = [[0, -1], [-1, 0], [0, -2], [-1, -1]].map(([dx, dy]) => b.grid.tile(m.x + dx, m.y + dy)).find(t => t && t.t !== 'x' && t.t !== 'w' && !b.unitAt(t.x, t.y) && (t.x !== spot.x || t.y !== spot.y)); if (back) { m.x = back.x; m.y = back.y; } }
    // Closer in: the two figures and the forecast are the picture.
    game.renderer.zoom = Math.min(1.7, game.renderer.zoom * 1.4);
    await game.renderer.focus(u, 0);
  });
  await page.click('#action-menu button[data-a="act"]');
  await page.waitForTimeout(200);
  // The first skillset is the weapon; a lone Attack goes straight to targets.
  await page.click('#action-menu button[data-i="0"]');
  await page.waitForFunction(() => game.ui.turn && (game.ui.turn.mode === 'target' || game.ui.turn.mode === 'abilities'));
  if (await page.evaluate(() => game.ui.turn.mode === 'abilities')) {
    await page.click('#action-menu button[data-id]:not([disabled])');
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'target');
  }
  await page.evaluate(() => { const t = game.ui.turn; const b = game.battle; const target = t.targets.find(x => { const u = b.unitAt(x.x, x.y); return u && u.team === 'enemy'; }) || t.targets[0]; if (target) game.ui.previewTarget(target); });
  await page.waitForTimeout(500);
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
  //    Eight of them, the most Play shows, and each one the game's best
  //    face: a spell landing, not a menu; the five roads, not the shop.
  {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept());
    await page.goto(`${base}/index.html`);
    await page.waitForSelector('#screen-title.active');
    await page.waitForTimeout(300);
    await shot(page, 'phone-1-title.jpg');
    // A company a few chapters in, dressed for it, at the Foundry at Ironhold.
    await page.click('#btn-new');
    await page.waitForSelector('#screen-world.active');
    await midCampaign(page, 8);
    await toDeploy(page);
    await toMenu(page);
    await spellShot(page, 'phone-2-spell.jpg', shot);
    await page.click('#action-menu button[data-a="move"]');
    await page.waitForTimeout(1600);   // let the turn banner fade first
    await page.evaluate(() => { const t = game.ui.turn; const far = [...t.reach.values()].sort((a, b) => b.cost - a.cost)[0]; game.ui.previewMove(far); });
    await page.waitForTimeout(150);
    await shot(page, 'phone-3-move.jpg');
    await page.click('#action-menu button[data-a="cancel"]');
    await page.waitForTimeout(200);
    await attackPreview(page);
    await shot(page, 'phone-4-attack.jpg');
    await leaveBattle(page);
    // The realm, with two acts walked and a city opened.
    await page.evaluate(() => { game.state.chapter = 14; game.state.cities.redwater = true; game.state.cities.fordwaterTown = true; game.showWorld(); });
    await page.waitForTimeout(300);
    await shot(page, 'phone-5-realm.jpg');
    // The forge at Fordwater, with something to better and something to make.
    await page.evaluate(() => { game.invAdd('ironIngot', 3); game.invAdd('brassFitting', 2); game.invAdd('steelIngot', 1); game.forgeTab = 'improve'; game.goToCity('fordwaterTown'); });
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('cities').scrollIntoView());
    await shot(page, 'phone-6-forge.jpg');
    // The five roads.
    await page.evaluate(() => { game.showWorld(); game.state.chapter = CAMPAIGN.length; game.state.branch = null; game.openChoice(); });
    await page.waitForTimeout(300);
    await shot(page, 'phone-7-roads.jpg');
    // The job tree.
    await page.evaluate(() => { game.showWorld(); game.openFormation(0); game.renderJobTree(game.state.party[0].job); });
    await page.waitForTimeout(300);
    await shot(page, 'phone-8-jobs.jpg');
    written.push('phone-1-title.jpg', 'phone-2-spell.jpg', 'phone-3-move.jpg', 'phone-4-attack.jpg', 'phone-5-realm.jpg', 'phone-6-forge.jpg', 'phone-7-roads.jpg', 'phone-8-jobs.jpg');
    await ctx.close();
  }

  // 3. Tablet screenshots, 2560x1600 landscape (16:10, fine for 7" and 10").
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept());
    await page.goto(`${base}/index.html`);
    await page.waitForSelector('#screen-title.active');
    await page.click('#btn-new');
    await page.waitForSelector('#screen-world.active');
    await midCampaign(page, 8);
    await toDeploy(page);
    await toMenu(page);
    await spellShot(page, 'tablet-1-battle.jpg', shot);
    await leaveBattle(page);
    await page.evaluate(() => { game.state.chapter = 14; game.state.cities.redwater = true; game.state.cities.fordwaterTown = true; game.showWorld(); });
    await page.waitForTimeout(300);
    await shot(page, 'tablet-2-realm.jpg');
    written.push('tablet-1-battle.jpg', 'tablet-2-realm.jpg');
    await ctx.close();
  }

  // 4. Steam's capsules, from tools/store/capsule.html at each size the
  //    store asks for, and the library logo on a transparent ground. The
  //    client icon (.ico) and the community icon are cut from the 512 icon.
  {
    const page = await browser.newPage({ viewport: { width: 920, height: 430 }, deviceScaleFactor: 1 });
    const capsules = [
      ['steam-header-920x430.jpg', 920, 430, 'header', 'jpeg'],
      ['steam-small-462x174.jpg', 462, 174, 'header', 'jpeg'],
      ['steam-main-1232x706.jpg', 1232, 706, 'header', 'jpeg'],
      ['steam-vertical-748x896.jpg', 748, 896, 'vertical', 'jpeg'],
      ['steam-library-600x900.jpg', 600, 900, 'vertical', 'jpeg'],
      ['steam-library-header-920x430.jpg', 920, 430, 'header', 'jpeg'],
      ['steam-hero-3840x1240.jpg', 3840, 1240, 'hero', 'jpeg'],
      ['steam-logo-1280x720.png', 1280, 720, 'logo', 'png'],
      ['steam-community-184x184.jpg', 184, 184, 'icon', 'jpeg'],
    ];
    for (const [name, w, h, kind, type] of capsules) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${base}/tools/store/capsule.html?w=${w}&h=${h}&kind=${kind}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(OUT, name), type, ...(type === 'png' ? { omitBackground: true } : { quality: 92 }) });
      written.push(name);
    }
    await page.close();
  }

  // 5. The 512x512 icon is the one the web app already uses.
  fs.copyFileSync(path.join(ROOT, 'icons/icon-512.png'), path.join(OUT, 'icon-512.png'));
  written.push('icon-512.png');

  await browser.close();
  srv.close();
  console.log(`wrote ${written.length} files into store/:\n  ` + written.join('\n  '));
})().catch(e => { console.error('FAILED', e); process.exit(1); });
