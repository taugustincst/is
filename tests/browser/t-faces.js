const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 700 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  const sheet = await page.evaluate(() => {
    const jobs = ['squire', 'knight', 'archer', 'monk', 'thief', 'whiteMage', 'blackMage', 'ninja'];
    const Z = 4, cw = 20 * 2 * Z + 12, ch = 21 * 2 * Z + 26;
    const cols = 8;
    const cv = document.createElement('canvas');
    cv.width = cols * cw + 110; cv.height = jobs.length * ch;
    const c = cv.getContext('2d');
    c.fillStyle = '#20223c'; c.fillRect(0, 0, cv.width, cv.height);
    c.imageSmoothingEnabled = false;
    c.font = '13px monospace';
    jobs.forEach((jid, row) => {
      const job = JOBS[jid];
      c.fillStyle = '#cfd0e8'; c.textAlign = 'left';
      c.fillText(job.name, 6, row * ch + ch / 2);
      for (let i = 0; i < cols; i++) {
        // Eight different recruits in the same job.
        const spr = getSprite(job, 'player', 'front', false, { weapon: job.weapon }, `recruit-${row}-${i}`);
        c.drawImage(spr, 110 + i * cw + 6, row * ch + 6, spr.width * Z, spr.height * Z);
      }
    });
    return cv.toDataURL('image/png');
  });
  require('fs').writeFileSync(`${S}/faces.png`, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
