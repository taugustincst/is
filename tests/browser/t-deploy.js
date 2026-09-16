const { open, clickTile, beginBattle } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  // Grow the party past the deploy cap so the phase must choose.
  await page.evaluate(() => {
    game.state.gil = 5000;
    for (let i = 0; i < 4; i++) game.hire(i % 2 ? 'chemist' : 'squire');
  });
  console.log('party size:', await page.evaluate(() => game.state.party.length));
  await page.click('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  const st = await page.evaluate(() => ({
    zone: game.battle.deployZone.length, max: game.battle.maxDeploy,
    placed: game.battle.deployed().length, rows: document.querySelectorAll('.roster-row').length,
    foes: document.querySelectorAll('#turn-order .order-row').length,
    commandHidden: document.getElementById('command').style.display,
  }));
  console.log('deploy state:', JSON.stringify(st));
  await page.screenshot({ path: `${S}/shot-deploy.png` });
  // Clear, then place two units by hand on zone tiles.
  await page.click('#deploy-panel button[data-a="clear"]');
  await page.waitForTimeout(120);
  console.log('after clear placed:', await page.evaluate(() => game.battle.deployed().length));
  const tiles = await page.evaluate(() => game.battle.deployZone.slice(0, 3).map(t => [t.x, t.y]));
  await clickTile(page, tiles[0][0], tiles[0][1]);
  await page.waitForTimeout(120);
  await clickTile(page, tiles[1][0], tiles[1][1]);
  await page.waitForTimeout(120);
  const after2 = await page.evaluate(() => ({ placed: game.battle.deployed().length, who: game.battle.deployed().map(u => u.name + '@' + u.x + ',' + u.y) }));
  console.log('placed by hand:', JSON.stringify(after2));
  // Clicking a placed unit picks it up again.
  await page.evaluate(() => { game.ui.deploy.sel = game.battle.deployed()[0]; });
  await clickTile(page, after2.who[0].split('@')[1].split(',')[0] | 0, after2.who[0].split('@')[1].split(',')[1] | 0);
  await page.waitForTimeout(120);
  console.log('after pickup:', await page.evaluate(() => game.battle.deployed().length));
  // Facing buttons
  await page.click('#deploy-panel button[data-d="W"]').catch(() => {});
  await page.waitForTimeout(80);
  // Refuse to start with nobody deployed
  await page.click('#deploy-panel button[data-a="clear"]');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForTimeout(150);
  console.log('empty start refused:', await page.evaluate(() => !!game.ui.deploy), '| hint:', await page.textContent('#hint'));
  // Auto-place then begin
  await page.click('#deploy-panel button[data-a="auto"]');
  await page.waitForTimeout(120);
  const auto = await page.evaluate(() => ({ placed: game.battle.deployed().length, reserve: game.state.party.filter(u => u.x < 0).length }));
  console.log('auto-place:', JSON.stringify(auto));
  await beginBattle(page);
  console.log('battle started; command panel back:', await page.evaluate(() => document.getElementById('command').style.display === ''));
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  console.log('first player turn:', await page.evaluate(() => game.ui.turn.unit.name));
  await page.screenshot({ path: `${S}/shot-postdeploy.png` });
  console.log('reserves excluded from order:', await page.evaluate(() =>
    !game.battle.forecast(9).some(e => e.kind === 'unit' && e.unit.x < 0)));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
