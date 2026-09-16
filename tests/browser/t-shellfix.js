/* The shell fixes from the review: ids after a load, Back on every screen,
   saving before the outro, starter kit staying on, retreats not paying
   errands, a tapped city showing its panel, battle keys sleeping at camp,
   and a save that cannot be written being a toast rather than a crash. */
const { BASE, open } = require('./lib');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  await page.waitForSelector('#screen-title.active');
  await page.evaluate(() => { localStorage.clear(); game.newGame(1); game.state.gil = 9000; game.saveGame(); });
  await page.reload(); await page.waitForSelector('#screen-title.active');
  await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
  // 1. Ids stay unique after a load.
  const ids = await page.evaluate(() => { game.hire('squire'); game.hire('chemist'); const a = game.state.party.map(u => u.id); return { a, unique: new Set(a).size === a.length }; });
  ok('a recruit hired after loading a save gets an id of its own', ids.unique, ids.a.join(','));
  // 2. Back has somewhere to go from Baggage and Load Game.
  await page.click('#btn-baggage'); await page.waitForSelector('#screen-inventory.active');
  const b1 = await page.evaluate(() => ({ handled: handleBack(), screen: game.screen }));
  ok('Back from the baggage returns to camp', b1.handled && b1.screen === 'world', JSON.stringify(b1));
  await page.evaluate(() => game.openSlots('load')); await page.waitForSelector('#screen-slots.active');
  const b2 = await page.evaluate(() => ({ handled: handleBack(), screen: game.screen }));
  ok('Back from Load Game returns to the title', b2.handled && b2.screen === 'title', JSON.stringify(b2));
  await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
  // 3. Starter kit cannot be taken off, only replaced.
  await page.click('#btn-baggage'); await page.waitForSelector('#screen-inventory.active');
  const kit = await page.evaluate(() => ({ removeButtons: document.querySelectorAll('#bag-worn button[data-unequip]').length, kitMarks: document.querySelectorAll('#bag-worn small.none').length }));
  ok('starter kit shows no remove button in the baggage', kit.removeButtons === 0 && kit.kitMarks >= 4, JSON.stringify(kit));
  await page.evaluate(() => game.showWorld());
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  const emptyOpt = await page.evaluate(() => { game.formTab = 'gear'; game.renderFormationDetail(); const sel = document.querySelector('select[data-slot="weapon"]'); return sel ? [...sel.options].some(o => o.value === '') : 'no select'; });
  ok('the weapon slot offers no empty option while the starter sword is worn', emptyOpt === false, String(emptyOpt));
  await page.click('#btn-formation-back'); await page.waitForSelector('#screen-world.active');
  // 4. Battle keys are asleep at camp.
  const keys = await page.evaluate(() => { const before = game.renderer.rot; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' })); return { before, after: game.renderer.rot, hadBattle: !!game.ui.battle }; });
  ok('Q at camp does not turn the board', keys.before === keys.after, JSON.stringify(keys));
  // 5. A retreat does not advance errands.
  await page.evaluate(() => { const u = game.state.party[4]; const spec = game.offeredErrands()[0]; game.sendOnErrand(spec, u); });
  const daysBefore = await page.evaluate(() => game.state.errands.active[0].left);
  await page.click('#btn-train'); await page.waitForSelector('#screen-story.active, #deploy-panel.open', { timeout: 20000 });
  for (let i = 0; i < 6 && await page.isVisible('#screen-story.active'); i++) { await page.click('#btn-story-next'); await page.waitForTimeout(80); }
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.evaluate(() => game.retreat());
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  const daysAfter = await page.evaluate(() => game.state.errands.active[0].left);
  ok('a retreat is not a day gone by for an errand', daysAfter === daysBefore, `${daysBefore} -> ${daysAfter}`);
  // 6. Back on the results screen continues, and the flow finishes.
  const r = await page.evaluate(() => ({ handled: handleBack() }));
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  ok('Back on the results screen continues the flow to camp', r.handled && await page.evaluate(() => game.screen === 'world'));
  // 7. A won chapter is saved before its outro plays.
  await page.evaluate(() => { game.state.chapter = 0; for (const u of game.state.party) u.level = 20; game.showWorld(); });
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  await page.click('#btn-story-skip'); await page.click('#btn-story-next');
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.evaluate(() => { game.setPace(3); game.ui.setAuto(true); });
  await page.waitForSelector('#screen-results.active', { timeout: 300000 });
  const won = await page.evaluate(() => document.getElementById('results-title').textContent === 'Victory!');
  await page.click('#btn-results');
  await page.waitForSelector('#screen-story.active', { timeout: 20000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('elderon-tactics-save')).chapter);
  ok('the victory is in the save while the outro is still on screen', !won || saved === 1, `won=${won} saved chapter=${saved}`);
  await page.click('#btn-story-skip'); await page.click('#btn-story-next'); await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  // 8. A tapped open city shows its panel even from the Road tab.
  await page.evaluate(() => { game.state.chapter = 3; game.state.cities = { redwater: true }; game.showWorld(); game.showCampTab('road'); game.goToCity('redwater'); });
  const city = await page.evaluate(() => ({ tab: game.campTab, panel: !!document.getElementById('btn-city-back') }));
  ok('tapping an open city switches to the Cities tab and shows it', city.tab === 'cities' && city.panel, JSON.stringify(city));
  // 9. A save that cannot be written is a toast, not a dead screen.
  const blocked = await page.evaluate(() => { const real = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('quota'); }; let threw = false, res; try { res = game.saveGame(); } catch (e) { threw = true; } Storage.prototype.setItem = real; return { threw, res, toast: document.getElementById('toast').textContent }; });
  ok('a blocked save reports itself instead of throwing', !blocked.threw && blocked.res === false && /could not be saved/.test(blocked.toast), JSON.stringify(blocked));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'all shell-fix checks passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
