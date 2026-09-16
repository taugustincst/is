const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
// Where the game is served from. run.sh starts two static servers on these
// ports; a CI job or a developer can point the tests elsewhere.
const BASE = process.env.ELDERON_URL || 'http://localhost:8123';
const ALT = process.env.ELDERON_ALT_URL || 'http://localhost:8124';
// Screenshots and other output land here, outside the source tree.
const OUT = process.env.ELDERON_OUT || path.join(__dirname, '..', 'out');
fs.mkdirSync(OUT, { recursive: true });
function chromePath() {
  const cands = [];
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (fs.existsSync(root)) {
    for (const d of fs.readdirSync(root)) {
      cands.push(`${root}/${d}/chrome-linux/chrome`, `${root}/${d}/chrome-linux/headless_shell`);
    }
  }
  const p = cands.find(c => fs.existsSync(c));
  if (p) return p;
  // Whatever `npx playwright-core install chromium` put in the default cache.
  try { const e = chromium.executablePath(); if (e && fs.existsSync(e)) return e; } catch (err) { /* fall through */ }
  throw new Error('no chromium found: run `npx playwright-core install chromium`');
}
async function open() {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html');
  return { browser, page, errors };
}
// Click the canvas at a grid tile, accounting for renderer zoom.
async function clickTile(page, tx, ty) {
  const pt = await page.evaluate(([tx, ty]) => {
    const s = game.renderer.toScreen(tx, ty, game.battle.grid.height(tx, ty));
    const cv = document.getElementById('battle-canvas'), r = cv.getBoundingClientRect(), z = game.renderer.zoom;
    const W = game.renderer.W || cv.width, H = game.renderer.H || cv.height;
    const px = (s.sx - W / 2) * z + W / 2, py = (s.sy - H / 2) * z + H / 2;
    return { x: r.left + px * r.width / W, y: r.top + py * r.height / H };
  }, [tx, ty]);
  await page.mouse.move(pt.x, pt.y); await page.waitForTimeout(60);
  await page.mouse.click(pt.x, pt.y);
}
// Click through the deployment phase to start the fight.
async function beginBattle(page) {
  await page.waitForSelector('#deploy-panel.open', { timeout: 15000 });
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => !game.ui.deploy, null, { timeout: 10000 });
}
module.exports = { BASE, ALT, OUT, open, clickTile, chromePath, beginBattle };
