const { open } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  const r = await page.evaluate(() => {
    const out = [];
    // Fresh party at chapter 1: nothing to warn about.
    out.push({ case: 'chapter 1, fresh party', warn: game.readiness(CAMPAIGN[0]) });
    // Walking into chapter 7 at level 1 in starter rags: both levers behind.
    game.state.chapter = 6; game.showWorld();
    out.push({ case: 'chapter 7, level 1 in rags', warn: game.readiness(CAMPAIGN[6]) });
    // Levelled but still in starter kit: only the gear note.
    game.state.party.forEach(u => { u.level = 12; });
    out.push({ case: 'chapter 7, levelled but unequipped', warn: game.readiness(CAMPAIGN[6]) });
    // Properly kitted: no warning at all.
    game.state.party.forEach(u => { u.gear = bestGearFor(u.job, null, 6); });
    out.push({ case: 'chapter 7, levelled and kitted', warn: game.readiness(CAMPAIGN[6]) });
    game.showWorld();
    return out;
  });
  for (const c of r) console.log(c.case.padEnd(36), '->', c.warn || '(no warning)');
  console.log('shown on the card:', /hard fight/.test(await page.textContent('#world-next')) === false ? 'hidden when ready' : 'visible');
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
