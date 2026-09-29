/* The first play: the guide speaks on the first chapter and nowhere else,
   and a save travels as a code from one device's storage to another's. */
const { BASE, open } = require('./lib');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
const skipStory = async (page) => { for (let i = 0; i < 12; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; } };
(async () => {
  const { browser, page, errors } = await open();
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.evaluate(() => { localStorage.clear(); game.syncTitleButtons(); });

  // ---- the guide ----
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  await skipStory(page);
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  const coach1 = await page.evaluate(() => ({ shown: !$('coach').hidden, text: $('coach').innerText }));
  ok('the guide speaks at the first deployment', coach1.shown && /first field/.test(coach1.text), coach1.text.slice(0, 60));
  await page.click('#btn-coach-ok');
  ok('Got it hides the guide without ending it', await page.evaluate(() => $('coach').hidden && !!game.ui.coach));
  await page.click('#deploy-panel button[data-a="auto"]');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  const coach2 = await page.evaluate(() => ({ shown: !$('coach').hidden, text: $('coach').querySelector('.coach-text').textContent }));
  ok('the first turn is told how to move', coach2.shown && /Tap Move/.test(coach2.text), coach2.text.slice(0, 60));
  // The guide sits above the hint and both are on screen.
  const stacked = await page.evaluate(() => { const c = $('coach').getBoundingClientRect(), h = $('hint').getBoundingClientRect(); return { above: c.bottom <= h.top + 1, on: c.top > 0 && h.bottom <= innerHeight }; });
  ok('the guide sits above the hint, both on screen', stacked.above && stacked.on, JSON.stringify(stacked));
  await page.click('#btn-coach-skip');
  ok('Skip ends the guide and remembers it', await page.evaluate(() => $('coach').hidden && !game.ui.coach && localStorage.getItem('elderon.coached') === '1'));
  await page.evaluate(() => game.ui.setMode('wait'));
  ok('once skipped, the guide says nothing more', await page.evaluate(() => $('coach').hidden));
  // Retreat, save, and a training battle: no guide there either, even unskipped.
  await page.click('#btn-retreat'); await page.click('#ask-yes');
  await page.waitForSelector('#screen-results.active', { timeout: 20000 }); await page.click('#btn-results');
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  await page.evaluate(() => { localStorage.removeItem('elderon.coached'); game.startTraining(); });
  await page.waitForSelector('#screen-story.active'); await skipStory(page);
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  ok('a training battle is not the first chapter: no guide', await page.evaluate(() => $('coach').hidden && !game.ui.coach));
  // Leaving before a blow is struck goes straight back to camp.
  await page.click('#btn-retreat'); await page.click('#ask-yes');
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });

  // ---- save codes ----
  await page.evaluate(() => { game.state.gil = 4321; game.state.party[0].level = 7; game.invAdd('ironIngot', 2); });
  await page.click('#btn-save');
  await page.evaluate(() => game.showScreen('title'));
  await page.click('#btn-load'); await page.waitForSelector('#screen-slots.active');
  await page.click('button[data-slot-export="1"]');
  const code = await page.evaluate(() => $('transfer-text').value);
  ok('a slot exports as a tagged code', /^ELDERON1\.[A-Za-z0-9+/=]+$/.test(code) && code.length > 200, `${code.length} chars`);
  // Another device: storage wiped, the code pasted into slot 2.
  await page.evaluate(() => { localStorage.clear(); game.syncTitleButtons(); game.openSlots('load'); });
  ok('with nothing saved, only Import is offered', await page.evaluate(() => document.querySelectorAll('button[data-slot-export]').length === 0 && !$('btn-slot-import').hidden));
  await page.click('#btn-slot-import');
  await page.evaluate((c) => { $('transfer-text').value = 'garbage'; }, code);
  await page.click('#btn-transfer-import');
  ok('a bad code is refused with a reason', /not an Elderon save code/.test(await page.evaluate(() => $('toast').textContent)) && await page.evaluate(() => game.listSlots().every(s => !s.d)));
  await page.evaluate((c) => { $('transfer-text').value = c; $('transfer-slot').value = '2'; }, code);
  await page.click('#btn-transfer-import');
  await page.waitForTimeout(200);
  const slots = await page.evaluate(() => game.listSlots().map(s => !!s.d));
  ok('a good code lands in the chosen slot', JSON.stringify(slots) === '[false,true,false]', JSON.stringify(slots));
  await page.click('button[data-slot-load="2"]'); await page.waitForSelector('#screen-world.active');
  const back = await page.evaluate(() => ({ gil: game.state.gil, lv: game.state.party[0].level, iron: game.invCount('ironIngot') }));
  ok('the imported game is the one that was exported', back.gil === 4321 && back.lv === 7 && back.iron === 2, JSON.stringify(back));
  // A round trip through the decoder with the shape the file button writes.
  const rt = await page.evaluate((c) => { const r = game.decodeCode(c + '\n'); return { ok: !r.error, where: r.data && game.slotSummary(r.data).where }; }, code);
  ok('a code with a trailing newline, as a file has, still decodes', rt.ok && /Chapter 1/.test(rt.where), JSON.stringify(rt));

  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(fails ? `${fails} first-play check(s) FAILED` : 'all first-play checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
