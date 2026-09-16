const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  const shot = await page.evaluate(() => {
    const jobs = ['dragonlord','hierophant','fellKnight','paladin','sage'];
    const kits = [
      { label: 'bare', gear: {} },
      { label: 'legend plate', gear: { weapon: 'ragnarok', offhand: 'escutcheon', body: 'dragonMail', head: 'crownOfKings' } }, { label: 'gungnir+genji', gear: { weapon: 'gungnir', body: 'genjiArmor', head: 'genjiHelm' } }, { label: 'apocrypha', gear: { weapon: 'apocrypha', body: 'archmageRobe', head: 'crownOfKings' } }, { label: 'chaos blade', gear: { weapon: 'chaosBlade', body: 'nightweave' } },
      { label: 'plate', gear: { weapon: 'longsword', offhand: 'kiteShield', head: 'ironHelm', body: 'plateMail' } },
      { label: 'robe', gear: { weapon: 'sageStaff', head: 'wizardHat', body: 'wizardRobe' } },
    ];
    const Z = 2, cw = 26 * Z, ch = 24 * Z, top = 44, left = 120, gap = 16;
    const cv = document.createElement('canvas');
    cv.width = left + kits.length * (cw * 2 + gap) + 10;
    cv.height = top + jobs.length * ch + 10;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#20223c'; c.fillRect(0, 0, cv.width, cv.height);
    c.font = '11px monospace'; c.textAlign = 'left'; c.fillStyle = '#cfd0e8';
    kits.forEach((k, i) => c.fillText(k.label + '  (ally | foe)', left + i * (cw * 2 + gap), top - 12));
    jobs.forEach((jid, r) => {
      const job = JOBS[jid];
      c.fillStyle = '#cfd0e8'; c.fillText(job.name, 6, top + r * ch + ch / 2 + 4);
      kits.forEach((k, i) => {
        const gear = {};
        for (const slot of ['weapon', 'offhand', 'head', 'body']) gear[slot] = k.gear[slot] ? ITEMS[k.gear[slot]] : null;
        if (!gear.weapon) gear.weapon = job.weapon;
        ['player', 'enemy'].forEach((team, t) => {
          const spr = getSprite(job, team, 'front', false, gear, jid + team);
          c.drawImage(spr, 0, 0, spr.width, spr.height,
            left + i * (cw * 2 + gap) + t * cw, top + r * ch, spr.width * Z / 2, spr.height * Z / 2);
        });
      });
    });
    return cv.toDataURL('image/png');
  });
  require('fs').writeFileSync(`${S}/jobsheet4.png`, Buffer.from(shot.split(',')[1], 'base64'));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
