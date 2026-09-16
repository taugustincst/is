const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 760, height: 560 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  const shots = [];
  for (let i = 0; i < 4; i++) {
    await page.waitForFunction(() => !game.renderer.rotating && !game.renderer.camAnim, null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(150);
    shots.push(`data:image/png;base64,${(await page.screenshot()).toString('base64')}`);
    if (i < 3) await page.evaluate(() => game.ui.turnField(1));
    await page.waitForTimeout(450);
  }
  // And one frame caught mid-turn, to see whether a turn is watchable.
  await page.evaluate(() => game.ui.turnField(1));
  await page.waitForTimeout(140);
  shots.push(`data:image/png;base64,${(await page.screenshot()).toString('base64')}`);
  await page.waitForTimeout(400);
  const sheet = await page.evaluate(async ({ shots, labels }) => {
    const cols = 3, W = 380, H = 280, PAD = 20;
    const rows = Math.ceil(shots.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * W; cv.height = rows * (H + PAD);
    const c = cv.getContext('2d');
    c.fillStyle = '#0d0e18'; c.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < shots.length; i++) {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = shots[i]; });
      const x = (i % cols) * W, y = Math.floor(i / cols) * (H + PAD);
      c.drawImage(img, x, y, W, H);
      c.fillStyle = '#e8e6f0'; c.font = 'bold 15px monospace'; c.textAlign = 'center';
      c.fillText(labels[i], x + W / 2, y + H + 15);
    }
    return cv.toDataURL('image/png');
  }, { shots, labels: ['rot 0', 'rot 1', 'rot 2', 'rot 3', 'mid-turn'] });
  require('fs').writeFileSync(`${S}/rot-sheet.png`, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
