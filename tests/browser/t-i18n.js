/* Languages: the shell follows the browser's language, a choice on the title
   or in Options changes it on the spot and is remembered, the battle menus,
   hints and questions follow, and names and abilities stay English. */
const { BASE, open } = require('./lib');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
const skipStory = async (page) => { for (let i = 0; i < 12; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward' || t === 'En avant') break; } };
(async () => {
  const { browser, page, errors } = await open();
  await page.waitForSelector('#screen-title.active');
  await page.evaluate(() => { localStorage.clear(); game.syncTitleButtons(); });
  const en = await page.evaluate(() => ({ lang: document.documentElement.lang, btn: $('btn-new').textContent, sel: $('title-lang').value }));
  ok('an English browser gets English', en.lang === 'en' && en.btn === 'New Game' && en.sel === 'en', JSON.stringify(en));

  // A Japanese phone: the title is Japanese before anything is chosen.
  const jaCtx = await browser.newContext({ locale: 'ja-SP', viewport: { width: 390, height: 844 } });
  const ja = await jaCtx.newPage();
  await ja.goto(BASE + '/index.html'); await ja.waitForSelector('#screen-title.active');
  const jaT = await ja.evaluate(() => ({ lang: document.documentElement.lang, btn: $('btn-new').textContent, sub: document.querySelector('.title-sub').textContent, sel: $('title-lang').value }));
  ok('a Japanese browser gets Japanese without asking', jaT.lang === 'ja' && jaT.btn === 'はじめから' && jaT.sub === 'タクティカルRPG' && jaT.sel === 'ja', JSON.stringify(jaT));
  await jaCtx.close();

  // German picked on the title: at once, and again after a reload.
  await page.selectOption('#title-lang', 'de');
  const de = await page.evaluate(() => ({ btn: $('btn-new').textContent, load: $('btn-load').textContent, stored: localStorage.getItem('elderon.lang'), lang: document.documentElement.lang }));
  ok('the title picker changes the language on the spot and remembers it', de.btn === 'Neues Spiel' && de.load === 'Spiel laden' && de.stored === 'de' && de.lang === 'de', JSON.stringify(de));
  await page.reload(); await page.waitForSelector('#screen-title.active');
  ok('the choice survives a reload', await page.evaluate(() => $('btn-new').textContent === 'Neues Spiel' && $('title-lang').value === 'de'));

  // The camp in German, then French from the Options tab, with no reload.
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  const camp = await page.evaluate(() => ({ battle: $('btn-battle').textContent, tabs: [...document.querySelectorAll('#camp-tabs button')].map(b => b.textContent), heading: document.querySelector('#screen-world h2').textContent, next: $('world-next').textContent }));
  ok('the camp is German', camp.battle === 'In die Schlacht' && camp.tabs.join() === 'Weg,Gruppe,Städte,Optionen' && camp.heading === 'Lager' && /Akt 1 · .* · Kapitel 1/.test(camp.next) && /Ziel: /.test(camp.next), JSON.stringify(camp));
  await page.evaluate(() => game.showCampTab('options'));
  const picker = await page.evaluate(() => ({ n: document.querySelectorAll('#world-lang button').length, sel: document.querySelector('#world-lang button.sel').dataset.lang, hidden: document.querySelector('.card.language').classList.contains('tab-hidden') }));
  ok('Options offers every language, with the current one marked', picker.n === 6 && picker.sel === 'de' && !picker.hidden, JSON.stringify(picker));
  await page.click('#world-lang button[data-lang="fr"]');
  const fr = await page.evaluate(() => ({ battle: $('btn-battle').textContent, tabs: [...document.querySelectorAll('#camp-tabs button')].map(b => b.textContent), title: $('title-lang').value, diff: [...document.querySelectorAll('#world-difficulty button')].map(b => b.textContent), stored: localStorage.getItem('elderon.lang') }));
  ok('French from Options, at once', fr.battle === 'Marcher au combat' && fr.tabs.join() === 'Route,Compagnie,Villes,Options' && fr.title === 'fr' && fr.diff.join() === 'Écuyer,Chevalier,Paladin' && fr.stored === 'fr', JSON.stringify(fr));
  const shop = await page.evaluate(() => { game.openShop('buy'); return { tabs: [...document.querySelectorAll('#shop-tabs button')].map(b => b.textContent), h2: document.querySelector('#screen-shop h2').textContent, h3: document.querySelector('#shop-list h3').textContent, item: document.querySelector('#shop-list .shop-row b').textContent }; });
  ok('the shop is French but the wares keep their names', shop.tabs.join() === 'Acheter,Vendre' && shop.h2 === 'Chariot du marchand' && shop.h3 === 'Armes' && /^[A-Za-z' ]+$/.test(shop.item), JSON.stringify(shop));
  await page.click('#btn-shop-back'); await page.waitForSelector('#screen-world.active');

  // A battle in French.
  await page.click('#btn-battle'); await page.waitForSelector('#screen-story.active');
  ok('the story button is French', await page.evaluate(() => $('btn-story-next').textContent === 'Continuer'));
  await skipStory(page);
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  const dep = await page.evaluate(() => ({ auto: $('deploy-panel').querySelector('button[data-a="auto"]').textContent, go: $('deploy-panel').querySelector('button[data-a="go"]').textContent, hint: $('hint').textContent, coach: $('coach').querySelector('.coach-text').textContent }));
  ok('deployment speaks French, the guide too', dep.auto === 'Placement auto' && dep.go === 'Commencer le combat' && /case verte/.test(dep.hint) && /Votre premier champ/.test(dep.coach), JSON.stringify(dep));
  await page.click('#btn-coach-skip');
  await page.click('#deploy-panel button[data-a="auto"]');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  const menu = await page.evaluate(() => ({ buttons: [...document.querySelectorAll('#action-menu button')].map(b => b.textContent), hint: $('hint').textContent, order: document.querySelector('#turn-order .panel-title').textContent }));
  ok('the battle menu is French', menu.buttons.join() === 'Déplacer,Agir,Attendre' && /Choisissez une action/.test(menu.hint) && menu.order === 'Ordre des tours', JSON.stringify(menu));
  await page.evaluate(() => game.ui.setMode('act'));
  const act = await page.evaluate(() => [...document.querySelectorAll('#action-menu button')].map(b => b.textContent));
  ok('Attack is translated, a job skillset is not', act[0] === 'Attaque' && act[act.length - 1] === 'Annuler' && (act.length === 2 || /^[A-Za-z ]+$/.test(act[1])), act.join());
  await page.evaluate(() => game.ui.setMode('menu'));
  await page.click('#btn-retreat');
  const asked = await page.evaluate(() => ({ text: $('ask-text').textContent, yes: $('ask-yes').textContent, no: $('ask-no').textContent }));
  ok('the retreat question is French', /Battre en retraite/.test(asked.text) && asked.yes === 'Retraite' && asked.no === 'Continuer le combat', JSON.stringify(asked));
  await page.click('#ask-no');
  const lookups = await page.evaluate(() => [tr('Not a key at all'), tr('Slot {n}', { n: 3 }), tr('{name} is now a {job}.', { name: 'Rowan', job: 'Knight' })]);
  ok('a missing key is its own text; placeholders are filled', lookups.join('|') === 'Not a key at all|Emplacement 3|Rowan est maintenant Knight.', lookups.join('|'));

  // The results and the save slots, in Spanish, where a summary is composed.
  await page.evaluate(() => setLang('es'));
  await page.evaluate(() => { game.battle.over = true; game.battle.result = 'defeat'; game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  const res = await page.evaluate(() => ({ title: $('results-title').textContent, body: $('results-body').textContent, btn: $('btn-results').textContent }));
  ok('the results screen is Spanish', res.title === 'Derrota...' && /Experiencia obtenida:/.test(res.body) && /Marks conservado:/.test(res.body) && res.btn === 'Continuar', JSON.stringify(res));
  await page.click('#btn-results'); await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  await page.click('#btn-save');
  ok('the save toast is Spanish', /Partida guardada/.test(await page.evaluate(() => $('toast').textContent)));
  await page.evaluate(() => { game.showScreen('title'); game.openSlots('load'); });
  const slot = await page.evaluate(() => ({ title: $('slots-title').textContent, first: document.querySelector('#slots-list .slot').textContent, empty: document.querySelector('#slots-list .slot.empty').textContent, buttons: [...document.querySelectorAll('#slots-list .slot:not(.empty) button')].map(b => b.textContent) }));
  ok('the slot list is Spanish, chapter and all', slot.title === 'Cargar una partida' && /Ranura 1/.test(slot.first) && /Acto 1 · Capítulo 1/.test(slot.first) && /soldados · Nv \d+ · \d+ gil/.test(slot.first) && /Ranura 2vacía/.test(slot.empty) && slot.buttons.join() === 'Cargar,Exportar,Borrar', JSON.stringify(slot));
  const help = await page.evaluate(() => { setLang('pt'); return [...document.querySelectorAll('#help li b')].slice(0, 3).map(b => b.textContent); });
  ok('the help headings follow, the help itself stays English', help.join() === 'Posicionamento:,Tempo:,Turno:' && await page.evaluate(() => /before each battle/.test(document.querySelector('#help li').textContent)), help.join());

  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(fails ? `${fails} language check(s) FAILED` : 'all language checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
