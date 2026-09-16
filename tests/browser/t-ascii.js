const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto(ALT + '/index.html');
  await page.waitForSelector('#screen-title.active');
  const out = await page.evaluate((kits) => {
    const dump = [];
    for (const [jid, kit, label] of kits) {
      const job = JOBS[jid];
      const gear = {};
      for (const s of ['weapon','offhand','head','body']) gear[s] = kit[s] ? ITEMS[kit[s]] : null;
      if (!gear.weapon) gear.weapon = job.weapon;
      const spr = getSprite(job, 'player', 'front', false, gear);
      const c = spr.getContext('2d');
      const d = c.getImageData(0, 0, spr.width, spr.height).data;
      // Read back one character per cell: '.' empty, '#' outline, else a letter
      // keyed on the colour so the shape is legible as text.
      const seen = new Map(); const letters = 'abcdefghijklmnopqrstuvwxyz';
      const rows = [];
      for (let gy = 0; gy < 21; gy++) {
        let line = '';
        for (let gx = 0; gx < 20; gx++) {
          const px = gx * 2 + 1, py = gy * 2 + 1, i = (py * spr.width + px) * 4;
          if (d[i + 3] === 0) { line += '.'; continue; }
          const key = `${d[i]},${d[i+1]},${d[i+2]}`;
          if (key === '20,20,20') { line += '#'; continue; }
          if (!seen.has(key)) seen.set(key, letters[seen.size % 26]);
          line += seen.get(key);
        }
        rows.push(line);
      }
      dump.push(label + '\n' + rows.join('\n'));
    }
    return dump.join('\n\n');
  }, [
    ['knight', {}, '--- knight bare'],
    ['knight', { weapon: 'longsword', offhand: 'kiteShield', head: 'ironHelm', body: 'plateMail' }, '--- knight plate'],
  ]);
  console.log(out);
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
