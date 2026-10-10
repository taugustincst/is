const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
/* The small things: a toast at camp sits at the top, clear of the
   buttons; the results screen offers Spend SP and it opens Formation on
   the Skills page; on a phone the turn banner sits at the foot of the
   board's band; and the help is three pages. */
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => game.toast('A word at camp.'));
  await page.waitForTimeout(100);
  const toast = await page.evaluate(() => { const t = document.getElementById('toast').getBoundingClientRect(); const a = document.querySelector('.world-actions').getBoundingClientRect(); return { top: Math.round(t.top), below: t.bottom <= a.top || t.top >= a.bottom, screen: document.body.dataset.screen }; });
  ok('at camp a toast sits at the top of the screen, clear of the buttons', toast.top < 80 && toast.below && toast.screen === 'world', JSON.stringify(toast));
  // The help in three pages.
  const help = await page.evaluate(() => { const tabs = [...document.querySelectorAll('.help-tabs button')].map(b => b.dataset.help); const count = (id) => [...document.querySelectorAll('.help-box li')].filter(li => li.dataset.helpTab === id).length; return { tabs, battle: count('battle'), camp: count('camp'), controls: count('controls'), shown: [...document.querySelectorAll('.help-box li')].filter(li => !li.classList.contains('tab-hidden')).length }; });
  ok('the help is three pages, filed by heading, opening on Battle', help.tabs.join() === 'battle,camp,controls' && help.camp === 9 && help.controls === 3 && help.battle >= 15 && help.shown === help.battle, JSON.stringify(help));
  await page.evaluate(() => document.querySelector('.help-tabs button[data-help="camp"]').click());
  const campPage = await page.evaluate(() => [...document.querySelectorAll('.help-box li')].filter(li => !li.classList.contains('tab-hidden')).map(li => li.querySelector('b').textContent));
  ok('the Camp page shows only the camp entries', campPage.length === 9 && campPage.includes('Forges:') && !campPage.includes('Tempo:'), campPage.join());
  // Spend SP from the results screen.
  await page.evaluate(() => { game.state.party.forEach(u => { u.level = 5; game.syncGear(u); }); game.state.party[1].jp[game.state.party[1].job] = 500; game.battleFlow(MAPS.verdant, [{ job: 'squire', level: 1, x: 8, y: 2 }], 0, { objective: { type: 'rout' }, flow: { kind: 'training' } }); });
  await beginBattle(page);
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.evaluate(() => { for (const u of game.battle.units) if (u.team === 'enemy') u.hp = 0; game.battle.checkEnd(); game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  const spend = await page.evaluate(() => ({ shown: !document.getElementById('btn-spend').hidden, text: document.getElementById('btn-spend').textContent }));
  ok('with SP to spend the results screen offers Spend SP', spend.shown && spend.text === 'Spend SP', JSON.stringify(spend));
  await page.click('#btn-spend');
  await page.waitForSelector('#screen-formation.active', { timeout: 20000 });
  const form = await page.evaluate(() => ({ sel: game.formSel, tab: [...document.querySelectorAll('[data-form-tab]')].find(el => !el.classList.contains('tab-hidden')).dataset.formTab, name: document.querySelector('#form-detail h2').textContent }));
  ok('Spend SP opens Formation on the Skills page of the one with SP', form.tab === 'skills' && form.sel === 1 && /Garret/.test(form.name), JSON.stringify(form));
  await page.screenshot({ path: `${S}/polish-spend.png` });
  // On a phone the banner sits at the foot of the band.
  await page.evaluate(() => game.showWorld());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { game.runBattle(MAPS.verdant, [{ job: 'squire', level: 1, x: 8, y: 2 }], 0, { objective: { type: 'rout' } }); });
  await beginBattle(page);
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.evaluate(() => game.ui.banner('Someone\'s turn', 'player'));
  await page.waitForTimeout(100);
  const banner = await page.evaluate(() => { const b = document.getElementById('banner').getBoundingClientRect(); const card = document.getElementById('unit-card').getBoundingClientRect(); const cmd = document.getElementById('command').getBoundingClientRect(); const u = game.ui.turn.unit; const r = game.renderer; const s = r.toScreen(u.x, u.y, game.battle.grid.height(u.x, u.y)); const cv = document.getElementById('battle-canvas'); const z = r.zoom; const uy = ((s.sy - r.H / 2) * z + r.H / 2) * cv.getBoundingClientRect().height / r.H; return { top: Math.round(b.top), bottom: Math.round(b.bottom), unitY: Math.round(uy), cardBottom: Math.round(card.bottom), cmdTop: Math.round(cmd.top), clearOfCard: b.top >= card.bottom || b.bottom <= card.top || b.right <= card.left, aboveCommand: b.bottom <= cmd.top + 1 }; });
  ok('on a phone the banner sits below the figure in hand and above the command panel, clear of the unit card', banner.top > banner.unitY + 20 && banner.aboveCommand && banner.clearOfCard, JSON.stringify(banner));
  await page.screenshot({ path: `${S}/polish-phone-banner.png` });
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  if (fails) { console.log(`${fails} check(s) FAILED`); process.exit(1); }
  console.log('all checks passed');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
