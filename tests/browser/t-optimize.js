const { open } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  const r = await page.evaluate(() => {
    const out = [];
    const u = game.state.party[0];
    // 1. Optimize with an empty baggage must not strip the free starter kit.
    const before = JSON.stringify(u.gear);
    game.optimize(u);
    out.push({ case: 'empty stock keeps the starter kit', before, after: JSON.stringify(u.gear), ok: !!u.gear.weapon });
    // 2. Optimize repeatedly must not create or destroy stock.
    ['broadsword', 'buckler', 'ironHelm', 'leatherArmor'].forEach(i => game.invAdd(i));
    const stockBefore = JSON.stringify(game.state.inventory);
    for (let i = 0; i < 5; i++) game.optimize(u);
    out.push({ case: 'repeat optimize is stable', gear: JSON.stringify(u.gear), stock: JSON.stringify(game.state.inventory), ok: !!u.gear.weapon });
    // 3. Total item count is conserved across a job cycle.
    const count = () => Object.values(game.state.inventory).reduce((a, b) => a + b, 0) +
      game.state.party.reduce((a, p) => a + Object.values(p.gear).filter(id => ITEMS[id].price > 0).length, 0);
    const c0 = count();
    for (const j of ['chemist', 'squire', 'chemist', 'squire']) { u.job = j; game.syncGear(u); game.optimize(u); }
    out.push({ case: 'job cycling conserves paid items', before: c0, after: count(), ok: count() === c0 });
    // 4. Every party member still holds a weapon after optimising everyone.
    game.state.party.forEach(p => game.optimize(p));
    out.push({ case: 'everyone keeps a weapon', armed: game.state.party.filter(p => p.gear.weapon).length,
      of: game.state.party.length, ok: game.state.party.every(p => p.gear.weapon) });
    return out;
  });
  for (const c of r) console.log((c.ok ? 'PASS  ' : 'FAIL  ') + c.case + '  ' + JSON.stringify(c));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (r.some(c => !c.ok)) process.exit(1);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
