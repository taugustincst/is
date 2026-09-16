const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(ALT + '/index.html');
  await page.waitForSelector('#screen-title.active');
  const shot = await page.evaluate(() => {
    const picks = [
      ['knight', {}, 'Knight bare'],
      ['knight', { weapon: 'broadsword', offhand: 'buckler', head: 'leatherCap', body: 'leatherArmor' }, 'Knight iron'],
      ['knight', { weapon: 'longsword', offhand: 'kiteShield', head: 'ironHelm', body: 'plateMail' }, 'Knight plate'],
      ['knight', { weapon: 'runeBlade', offhand: 'aegisShield', head: 'goldenHelm', body: 'crystalMail' }, 'Knight mythril'],
      ['dragoon', { weapon: 'dragonLance', head: 'goldenHelm', body: 'plateMail' }, 'Dragoon lance'],
      ['archer', { weapon: 'yoichiBow', head: 'featherHat', body: 'chainMail' }, 'Archer bow'],
      ['blackMage', { weapon: 'sageStaff', head: 'wizardHat', body: 'wizardRobe' }, 'Mage staff'],
      ['whiteMage', { weapon: 'healingStaff', head: 'ribbon', body: 'robeOfLords' }, 'W.Mage ribbon'],
      ['monk', {}, 'Monk fists'],
      ['thief', { weapon: 'assassinDagger', offhand: 'flameShield', body: 'leatherArmor' }, 'Thief flame'],
      ['ninja', { weapon: 'ninjaBlade', offhand: 'iceShield', body: 'wardingCloak' }, 'Ninja ice'],
      ['squire', { weapon: 'warAxe', head: 'ironHelm', body: 'chainMail' }, 'Squire axe'],
    ];
    const Z = 5, cw = 20 * 2 * Z + 16, ch = 21 * 2 * Z + 34;
    const cols = 6, rows = Math.ceil(picks.length * 2 / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * cw; cv.height = rows * ch;
    const c = cv.getContext('2d');
    c.fillStyle = '#20223c'; c.fillRect(0, 0, cv.width, cv.height);
    c.imageSmoothingEnabled = false;
    c.font = '13px monospace'; c.textAlign = 'center';
    let i = 0;
    for (const [jid, kit, label] of picks) {
      const job = JOBS[jid];
      for (const view of ['front', 'back']) {
        const gear = {};
        for (const slot of ['weapon', 'offhand', 'head', 'body']) gear[slot] = kit[slot] ? ITEMS[kit[slot]] : null;
        if (!gear.weapon) gear.weapon = job.weapon;
        const spr = getSprite(job, 'player', view, false, gear);
        const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
        c.drawImage(spr, x + 8, y + 8, spr.width * Z, spr.height * Z);
        c.fillStyle = '#cfd0e8';
        c.fillText(`${label} ${view}`, x + cw / 2, y + ch - 8);
        i++;
      }
    }
    return cv.toDataURL('image/png');
  });
  require('fs').writeFileSync(`${S}/zoom.png`, Buffer.from(shot.split(',')[1], 'base64'));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
