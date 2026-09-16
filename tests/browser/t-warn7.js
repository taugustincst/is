const { BASE, ALT } = require('./lib');
const { open } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.goto(BASE + '/index.html');
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  const r = await page.evaluate(() => {
    const out = [];
    game.state.chapter = 6;
    // The party the playthrough actually arrived with: level 8, mid-tier kit.
    game.state.party.forEach(u => { u.level = 8; u.gear = bestGearFor(u.job, null, 3); });
    out.push({ case: 'level 8, tier-3 kit (as the playthrough arrived)', warn: game.readiness(CAMPAIGN[6]) });
    game.state.party.forEach(u => { u.level = 11; u.gear = bestGearFor(u.job, null, 6); });
    out.push({ case: 'level 11, best kit (as it eventually won)', warn: game.readiness(CAMPAIGN[6]) });
    game.showWorld();
    return { out, shown: document.getElementById('world-next').textContent.includes('hard fight') };
  });
  for (const c of r.out) console.log(c.case.padEnd(44), '->', c.warn || '(no warning)');
  console.log('warning hidden once the party is ready:', !r.shown);
  console.log('ERRORS:', errors.length ? errors.join('; ') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
