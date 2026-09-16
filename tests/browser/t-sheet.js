const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 760 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(ALT + '/index.html');
  await page.waitForSelector('#screen-title.active');
  const shot = await page.evaluate(() => {
    const jobs = ['squire','knight','archer','monk','thief','whiteMage','blackMage','ninja','dragoon','chemist','timeMage','goblin','wolf','skeleton','bomb','wisp','treant','darkKnight'];
    const kits = [
      { label: 'bare', gear: {} },
      { label: 'sword+buckler', gear: { weapon: 'broadsword', offhand: 'buckler', head: 'leatherCap', body: 'leatherArmor' } },
      { label: 'plate+kite', gear: { weapon: 'longsword', offhand: 'kiteShield', head: 'ironHelm', body: 'plateMail' } },
      { label: 'mythril', gear: { weapon: 'runeBlade', offhand: 'aegisShield', head: 'goldenHelm', body: 'crystalMail' } },
      { label: 'spear', gear: { weapon: 'dragonLance', head: 'goldenHelm', body: 'plateMail' } },
      { label: 'bow', gear: { weapon: 'yoichiBow', head: 'featherHat', body: 'chainMail' } },
      { label: 'staff+robe', gear: { weapon: 'sageStaff', head: 'wizardHat', body: 'wizardRobe' } },
      { label: 'axe', gear: { weapon: 'warAxe', body: 'plateMail' } },
      { label: 'flame shield', gear: { weapon: 'assassinDagger', offhand: 'flameShield', body: 'leatherArmor' } },
      { label: 'ice shield', gear: { weapon: 'ninjaBlade', offhand: 'iceShield', body: 'wardingCloak' } },
    ];
    const cell = 56, top = 40, left = 130;
    const cv = document.createElement('canvas');
    cv.width = left + kits.length * cell + 10;
    cv.height = top + jobs.length * cell + 10;
    const c = cv.getContext('2d');
    c.fillStyle = '#20223c'; c.fillRect(0, 0, cv.width, cv.height);
    c.font = '10px monospace'; c.textAlign = 'left';
    kits.forEach((k, i) => {
      c.save(); c.translate(left + i * cell + cell / 2, top - 6); c.rotate(-0.5);
      c.fillStyle = '#cfd0e8'; c.fillText(k.label, 0, 0); c.restore();
    });
    jobs.forEach((jid, r) => {
      const job = JOBS[jid];
      c.fillStyle = '#cfd0e8';
      c.fillText(job.name, 6, top + r * cell + cell / 2 + 4);
      kits.forEach((k, i) => {
        const gear = {};
        for (const slot of ['weapon', 'offhand', 'head', 'body']) gear[slot] = k.gear[slot] ? ITEMS[k.gear[slot]] : null;
        if (!gear.weapon) gear.weapon = job.weapon;
        const spr = getSprite(job, r % 2 ? 'enemy' : 'player', 'front', false, job.kind === 'human' ? gear : null);
        c.drawImage(spr, left + i * cell + 6, top + r * cell + 2);
      });
    });
    return cv.toDataURL('image/png');
  });
  require('fs').writeFileSync(`${S}/sheet.png`, Buffer.from(shot.split(',')[1], 'base64'));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
