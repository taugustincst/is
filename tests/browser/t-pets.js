const { BASE } = require('./lib');
/* Beasts through the real screens: a wolf tamed on the field turns at once and
   follows the company, has a page of its own in Formation, survives a save,
   deepens its bond by fighting, is sold at a kennel, and never runs errands. */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
const S = require('./lib').OUT;
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');

  // 1. Tame on the field: the leader, an archer who knows Tame, against one wolf.
  await page.evaluate(() => {
    for (const u of game.state.party) { u.level = 8; u.resetBattleState(); }
    const lead = game.state.party.find(u => u.leader);
    lead.jpTotal.squire = 250; lead.job = 'archer'; lead.learned.tame = true; game.syncGear(lead);
    BattleUI.prototype.awaitPlayerTurn = async function (u) {
      const b = game.battle, wolf = b.units.find(x => x.job === 'wolf');
      if (u.leader && wolf && wolf.team === 'enemy') {
        wolf.hp = Math.floor(wolf.maxHp * 0.3);
        window.__chance = b.tameChance(u, wolf);
        window.__note = b.predict(u, ABILITIES.tame, wolf.x, wolf.y)[0].notes.join(' ');
        const rnd = Math.random; Math.random = () => 0;
        try { await b.applyAbility(u, ABILITIES.tame, wolf.x, wolf.y); } finally { Math.random = rnd; }
        return;
      }
      // The rest of the company holds until the wolf is won, so no one fells it first.
      if (u.team === 'player' && !u.pet) return;
      return b.aiTurn(u);
    };
    game.runBattle(MAPS.verdant, [{ job: 'wolf', level: 3, x: 4, y: 1 }], 200, { objective: { type: 'rout' } });
  });
  await page.waitForSelector('#deploy-panel.open', { timeout: 15000 });
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForSelector('#screen-results.active', { timeout: 60000 });
  const chance = await page.evaluate(() => window.__chance);
  const note = await page.evaluate(() => window.__note);
  ok('the preview names the odds of a tame', /^tame \d+%$/.test(note) && chance > 50, `${note} (${chance}%)`);
  const log = await page.evaluate(() => [...document.querySelectorAll('#log .log-line')].map(l => l.textContent));
  ok('the log tells of the taming', log.some(l => /Dire Wolf is tamed! \w+ fights for/.test(l)), log.find(l => /tamed/.test(l)));
  const res = await page.textContent('#results-body');
  ok('a tamed beast follows the company off a won field', /follows the company!/.test(res), (res.match(/[^.]*follows the company![^<]*/) || [])[0]);
  await page.screenshot({ path: `${S}/pets-results.png` });
  await page.click('#btn-results'); await page.evaluate(() => game.showWorld()); await page.waitForSelector('#screen-world.active');
  const pet = await page.evaluate(() => { const p = game.state.party.find(u => u.pet); return p && { name: p.name, job: p.job, team: p.team, level: p.level, n: game.state.party.length, named: PETS.wolf.names.includes(p.name), bite: !!p.learned.bite }; });
  ok('the beast is in the company, on the player\'s side, with a name of its kind', pet && pet.job === 'wolf' && pet.team === 'player' && pet.named && pet.bite && pet.n === 5, JSON.stringify(pet));
  const chip = await page.evaluate(() => [...document.querySelectorAll('#world-party .party-chip')].map(c => c.textContent.trim()).find(t => /Dire Wolf/.test(t)));
  ok('the camp lists the beast with the company', !!chip, chip);

  // 2. Its page in Formation.
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  await page.evaluate(() => game.openFormation(game.state.party.findIndex(u => u.pet)));
  const row = await page.evaluate(() => document.querySelector('#form-list .form-row.sel .job').textContent);
  ok('the roster marks the beast', /Dire Wolf · beast/.test(row), row);
  const unitTab = await page.evaluate(() => ({ text: document.querySelector('#form-detail').textContent, jobSel: !!document.querySelector('#sel-job') }));
  ok('the beast\'s page shows its bond and no job to change', /Bond: level 1/.test(unitTab.text) && /Howl opens at bond 2 \(100\)/.test(unitTab.text) && !unitTab.jobSel, unitTab.text.slice(0, 80));
  await page.screenshot({ path: `${S}/pets-formation.png` });
  await page.click('#form-tabs button[data-form="skills"]');
  const skills = await page.evaluate(() => [...document.querySelectorAll('[data-form-tab="skills"] .ab-row')].map(r => r.querySelector('b').textContent + ':' + r.querySelector('.tag').textContent));
  ok('skills open by bond level, not for SP', skills.join(',') === 'Bite:Learned,Howl:Bond 2', skills.join(','));
  await page.click('#form-tabs button[data-form="gear"]');
  const gearSlots = await page.evaluate(() => [...document.querySelectorAll('[data-form-tab="gear"] select[data-slot], [data-form-tab="gear"] .equip-row > span:not(.item-icon)')].map(e => e.dataset.slot || e.textContent));
  ok('the beast wears a collar and nothing else', gearSlots.join(',') === 'Accessory', gearSlots.join(','));
  await page.evaluate(() => { game.invAdd('holyPendant'); game.renderFormationDetail(); });
  await page.selectOption('[data-form-tab="gear"] select[data-slot="acc"]', 'holyPendant');
  const collar = await page.evaluate(() => game.state.party.find(u => u.pet).gear.acc);
  ok('an accessory goes on', collar === 'holyPendant', collar);
  await page.click('#btn-formation-back'); await page.waitForSelector('#screen-world.active');

  // 3. A save keeps it.
  await page.evaluate(() => game.saveGame());
  await page.reload(); await page.waitForSelector('#screen-title.active');
  await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
  const kept = await page.evaluate(() => { const p = game.state.party.find(u => u.pet); return p && `${p.name}:${p.job}:${p.gear.acc}:${p.team}`; });
  ok('the beast survives a save and a reload', /^\w+:wolf:holyPendant:player$/.test(kept || ''), kept);

  // 4. The bond deepens by fighting: 99 earned, one action opens Howl.
  await page.evaluate(() => {
    const p = game.state.party.find(u => u.pet);
    p.jp.wolf = 99; p.jpTotal.wolf = 99;
    BattleUI.prototype.awaitPlayerTurn = function (u) { return game.battle.aiTurn(u); };
    game.runBattle(MAPS.verdant, [{ job: 'goblin', level: 2, x: 4, y: 1 }, { job: 'goblin', level: 2, x: 6, y: 1 }], 200, { objective: { type: 'rout' } });
  });
  await page.waitForSelector('#deploy-panel.open', { timeout: 15000 });
  const deployed = await page.evaluate(() => game.battle.deployed().some(u => u.pet));
  ok('the beast deploys like anyone', deployed);
  await page.click('#deploy-panel button[data-a="go"]');
  await page.evaluate(() => { game.setPace(3); for (const u of game.battle.units) if (u.team === 'enemy') u.hp = 140; });
  await page.waitForSelector('#screen-results.active', { timeout: 120000 });
  const bond = await page.evaluate(() => { const p = game.state.party.find(u => u.pet); return { howl: !!p.learned.howl, lv: p.bondLevel(), ev: [...document.querySelectorAll('.res-events li')].map(l => l.textContent).find(t => /bond deepens/.test(t)), jp: document.querySelector('.res-unit.up .res-jp, .res-unit .res-jp') && [...document.querySelectorAll('.res-unit')].map(r => r.textContent).find(t => /Howl|bond/.test(t)) }; });
  ok('an action deepens the bond and opens the next skill', bond.howl && bond.lv === 2 && /bond deepens: Howl learned/.test(bond.ev || ''), JSON.stringify(bond));
  await page.click('#btn-results'); await page.evaluate(() => game.showWorld()); await page.waitForSelector('#screen-world.active');

  // 5. The kennel, and the company's limit.
  await page.evaluate(() => { game.state.cities.redwater = true; game.state.chapter = 2; game.state.gil = 9000; game.showWorld(); game.goToCity('redwater'); });
  const kennel = await page.evaluate(() => [...document.querySelectorAll('#cities button[data-pet-at]')].map(b => `${b.dataset.petAt}:${b.disabled ? 'off' : 'on'}`));
  ok('Redwater kennels a wolf and a goblin', kennel.join(',') === 'wolf:on,goblin:on', kennel.join(','));
  await page.screenshot({ path: `${S}/pets-kennel.png` });
  const under = await page.evaluate(() => Math.max(1, game.avgLevel() - 1));
  await page.click('#cities button[data-pet-at="goblin"]');
  const bought = await page.evaluate(() => { const g = game.state.party.filter(u => u.pet); return { n: g.length, last: `${g[g.length - 1].name}:${g[g.length - 1].job}:${g[g.length - 1].level}`, gil: game.state.gil, tackle: !!g[g.length - 1].learned.tackle }; });
  ok('a goblin bought at the kennel joins a level under the company, knowing its first skill', bought.n === 2 && bought.last.endsWith(`:goblin:${under}`) && bought.gil === 8500 && bought.tackle, JSON.stringify(bought));
  await page.evaluate(() => { for (let i = 0; i < 2; i++) game.buyPetAt(CITIES.find(c => c.id === 'redwater'), 'wolf'); });
  const full = await page.evaluate(() => ({ pets: game.state.party.filter(u => u.pet).length, btns: [...document.querySelectorAll('#cities button[data-pet-at]')].map(b => b.disabled) }));
  ok('the kennel closes at four beasts', full.pets === 4 && full.btns.length === 2 && full.btns.every(Boolean), JSON.stringify(full));
  const names = await page.evaluate(() => game.state.party.filter(u => u.pet).map(u => u.name));
  ok('no two beasts share a name', new Set(names).size === names.length, names.join(','));

  // 6. Errands are for people.
  await page.evaluate(() => { game.showCampTab('company'); game.renderErrands(); });
  const errandOpts = await page.evaluate(() => [...document.querySelectorAll('#errands select[data-unit] option')].map(o => o.textContent));
  ok('a beast is never offered an errand', errandOpts.length > 0 && errandOpts.every(t => !/Dire Wolf|Goblin/.test(t)), errandOpts.join(' | '));
  const sent = await page.evaluate(() => game.sendOnErrand(ERRANDS[0], game.state.party.find(u => u.pet)));
  ok('nor sent on one', sent === false);

  // 7. What cannot be tamed: a boss, and a man.
  const wild = await page.evaluate(() => {
    const lead = game.state.party.find(u => u.leader);
    const b = Battle.setup(MAPS.verdant, [lead], [{ job: 'knight', level: 2, x: 4, y: 1 }, { job: 'colossus', level: 2, x: 6, y: 1, boss: true }], { log: () => {}, awaitPlayerTurn: async () => {} }, { type: 'rout' });
    for (const e of b.units.filter(u => u.team === 'enemy')) e.hp = 1;
    return b.units.filter(u => u.team === 'enemy').map(e => `${e.job}:${b.tameChance(lead, e)}:${b.predict(lead, ABILITIES.tame, e.x, e.y)[0].notes[0]}`);
  });
  ok('neither a knight nor a boss can be tamed', wild.join(',') === 'knight:0:untameable,colossus:0:untameable', wild.join(','));

  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  if (errors.length) fails++;
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'all pet checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
