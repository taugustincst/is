const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => { game.state.chapter = 9; game.showWorld(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${S}/act2-world.png`, clip: { x: 150, y: 20, width: 660, height: 380 } });
  // Sprite sheet: the four new jobs with guns and brass, and the machines.
  const shot = await page.evaluate(() => {
    const jobs = ['engineer', 'gunner', 'aeronaut', 'artificer', 'sentinel', 'ironhound', 'colossus'];
    const kits = [{ label: 'bare', gear: {} }, { label: 'gun+goggles', gear: { weapon: 'musket', head: 'goggles', body: 'aviatorCoat' } }, { label: 'brass', gear: { weapon: 'aetherRifle', head: 'brassHelm', body: 'boilerplate' } }];
    const Z = 3, cw = 26 * Z, ch = 24 * Z, top = 30, left = 110, gap = 16;
    const cv = document.createElement('canvas'); cv.width = left + kits.length * (cw * 2 + gap); cv.height = top + jobs.length * ch;
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#20223c'; c.fillRect(0, 0, cv.width, cv.height);
    c.font = '11px monospace'; c.fillStyle = '#cfd0e8';
    kits.forEach((k, i) => c.fillText(k.label, left + i * (cw * 2 + gap), top - 10));
    jobs.forEach((jid, r) => {
      const job = JOBS[jid]; c.fillStyle = '#cfd0e8'; c.fillText(job.name.slice(0, 14), 4, top + r * ch + ch / 2);
      kits.forEach((k, i) => {
        const gear = {}; for (const slot of ['weapon', 'offhand', 'head', 'body']) gear[slot] = k.gear[slot] ? ITEMS[k.gear[slot]] : null;
        if (!gear.weapon) gear.weapon = job.weapon;
        ['player', 'enemy'].forEach((team, t) => { const spr = getSprite(job, team, 'front', false, job.kind === 'human' ? gear : null, jid + team); c.drawImage(spr, 0, 0, spr.width, spr.height, left + i * (cw * 2 + gap) + t * cw, top + r * ch, spr.width * Z / 2, spr.height * Z / 2); });
      });
    });
    return cv.toDataURL('image/png');
  });
  require('fs').writeFileSync(`${S}/act2-sheet.png`, Buffer.from(shot.split(',')[1], 'base64'));
  // Each new map, rendered at deployment.
  for (const [i, id] of ['ironhold', 'cogsworth', 'aetheryards', 'brassgate'].entries()) {
    await page.evaluate((id) => { game.state.chapter = ['ironhold', 'cogsworth', 'aetheryards', 'brassgate'].indexOf(id) + 8; game.showWorld(); }, id);
    await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
    for (let k = 0; k < 8; k++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
    await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${S}/act2-map-${id}.png` });
    await page.evaluate(() => { game.battle.over = true; game.battle.result = 'defeat'; game.ui.abort(); });
    await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  }
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
