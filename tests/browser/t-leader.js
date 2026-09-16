const { open } = require('./lib');
const S = require('./lib').OUT;
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => {
    game.state.chapter = 2; // chapter 3 onward protects the leader
    game.state.party.forEach(u => { u.level = 6; game.syncGear(u); });
    game.startNextChapter();
  });
  await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  // Hints must be visible during deployment.
  const hint = await page.evaluate(() => {
    const h = document.getElementById('hint');
    const cs = getComputedStyle(h);
    return { text: h.textContent.trim().slice(0, 60), display: cs.display, visible: h.getBoundingClientRect().height > 0 };
  });
  console.log('deploy hint:', JSON.stringify(hint));
  // Withdraw the leader, then try to start.
  await page.evaluate(() => { game.battle.withdraw(game.battle.requiredUnit); game.ui.renderDeploy(); });
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForTimeout(200);
  const blocked = await page.evaluate(() => ({ stillDeploying: !!game.ui.deploy, hint: document.getElementById('hint').textContent.trim(), warn: document.getElementById('hint').classList.contains('warn') }));
  console.log('start without the leader:', JSON.stringify(blocked));
  await page.screenshot({ path: `${S}/shot-leaderhint.png` });
  // Auto-place puts them back and the battle starts.
  await page.click('#deploy-panel button[data-a="auto"]');
  await page.waitForTimeout(120);
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => !game.ui.deploy, null, { timeout: 10000 });
  console.log('started with leader deployed:', await page.evaluate(() => game.battle.onField(game.battle.objective.leader)));
  console.log('objective bar:', await page.textContent('#objective'));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
