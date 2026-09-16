const { BASE, ALT } = require('./lib');
// Loads saves in the shapes this game has actually written over time: v1 had
// no gear or passives, v2 added them but no difficulty, v3 is current.
const { open } = require('./lib');
const KEY = 'elderon-tactics-save';
const SAVES = {
  'v1 (no gear, no passives, no difficulty)': {
    v: 1, gil: 800, chapter: 2, victories: 2,
    party: [
      { id: 'u1', name: 'Rowan', job: 'squire', level: 5, exp: 40, team: 'player', leader: true,
        jp: { squire: 120 }, jpTotal: { squire: 300 }, learned: { throwStone: true }, secondary: null },
      { id: 'u2', name: 'Mira', job: 'chemist', level: 4, exp: 0, team: 'player',
        jp: {}, jpTotal: {}, learned: {}, secondary: null },
    ],
  },
  'v2 (gear and passives, no difficulty)': {
    v: 2, gil: 1500, chapter: 4, victories: 4, inventory: { broadsword: 1 },
    party: [
      { id: 'u1', name: 'Rowan', job: 'knight', level: 8, exp: 10, team: 'player', leader: true,
        jp: { knight: 50 }, jpTotal: { knight: 500 }, learned: { powerBreak: true }, secondary: 'squire',
        gear: { weapon: 'broadsword', body: 'leatherArmor' }, passives: { reaction: null, support: null, movement: null } },
    ],
  },
  'v2 with a job that later gained abilities': {
    v: 2, gil: 300, chapter: 1, victories: 1, inventory: {},
    party: [
      { id: 'u1', name: 'Sage', job: 'blackMage', level: 6, exp: 0, team: 'player', leader: true,
        jp: { blackMage: 900 }, jpTotal: { blackMage: 900 }, learned: { fire: true, thunder: true },
        secondary: null, gear: { weapon: 'rod' }, passives: {} },
    ],
  },
  'corrupt-ish (unknown job and item)': {
    v: 3, gil: 100, chapter: 0, victories: 0, inventory: { notAnItem: 2 }, difficulty: 'knight',
    party: [
      { id: 'u1', name: 'Ghost', job: 'squire', level: 3, exp: 0, team: 'player', leader: true,
        jp: {}, jpTotal: {}, learned: { notAnAbility: true }, secondary: 'noSuchJob',
        gear: { weapon: 'noSuchItem', body: 'clothes' }, passives: { support: 'noSuchPassive' } },
    ],
  },
};
(async () => {
  const { browser, page, errors } = await open();
  await page.goto(BASE + '/index.html');
  for (const [label, save] of Object.entries(SAVES)) {
    const r = await page.evaluate(async ([key, save]) => {
      localStorage.setItem(key, JSON.stringify(save));
      const out = { loaded: false, err: null };
      try {
        game.loadGame();
        out.loaded = true;
        out.chapter = game.state.chapter;
        out.difficulty = game.state.difficulty;
        out.party = game.state.party.map(u => ({
          n: u.name, job: u.job, lv: u.level, hp: u.maxHp, weapon: u.weapon && u.weapon.name,
          passives: JSON.stringify(u.passives), sec: u.secondary,
        }));
        // The formation screen is where a bad save usually blows up.
        game.openFormation(0);
        out.formation = document.getElementById('form-detail').textContent.length > 50;
        // And a battle must start from it.
        game.showWorld();
      } catch (e) { out.err = String(e && e.message || e); }
      return out;
    }, [KEY, save]);
    console.log(`${label}`);
    console.log('   ', JSON.stringify(r));
  }
  console.log('ERRORS:', errors.length ? errors.slice(0, 4).join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
