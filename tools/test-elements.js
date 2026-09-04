#!/usr/bin/env node
/* Checks the elemental affinity system: what creatures and equipment answer,
   how damage scales, absorption, immunity, prediction and AI awareness.

   Usage: node tools/test-elements.js */
const { load } = require('./load');
const g = load();
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? '  [' + d + ']' : '')); if (!c) fails++; };
const mk = (n, job, lvl, opts = {}) => { const u = new g.Unit(Object.assign({ name: n, job, level: lvl, team: 'player' }, opts)); u.autoLearn(1); return u; };

(async () => {
  const mage = mk('Mage', 'blackMage', 10);
  const white = mk('Cleric', 'whiteMage', 10);
  let b; const logs = [];
  b = g.Battle.setup(g.MAPS.verdant, [mage, white], [
    { job: 'bomb', level: 6, x: 3, y: 1 },
    { job: 'wolf', level: 6, x: 4, y: 1 },
    { job: 'goblin', level: 6, x: 5, y: 1 },
  ], { log: (m) => logs.push(m), awaitPlayerTurn: async () => {} }, { type: 'rout' });
  const [bomb, wolf, goblin] = b.units.filter(u => u.team === 'enemy');

  // Innate affinities
  ok('bomb absorbs fire', g.affinityOf(bomb, 'fire') < 0, `${g.affinityOf(bomb, 'fire')}`);
  ok('bomb is weak to ice', g.affinityOf(bomb, 'ice') === 1.5);
  ok('wolf is weak to fire', g.affinityOf(wolf, 'fire') === 1.5);
  ok('goblin resists earth', g.affinityOf(goblin, 'earth') === 0.5);
  ok('an unaligned attack is unscaled', g.affinityOf(wolf, 'holy') === 1 && g.affinityOf(wolf, null) === 1);

  // Damage actually scales
  const fireOnWolf = b.computeEffect(mage, g.ABILITIES.fire, g.ABILITIES.fire.effects[0], wolf);
  const fireOnGoblin = b.computeEffect(mage, g.ABILITIES.fire, g.ABILITIES.fire.effects[0], goblin);
  ok('weakness raises damage by half', fireOnWolf === Math.floor(fireOnGoblin * 1.5), `${fireOnGoblin} -> ${fireOnWolf}`);

  // Absorption heals rather than harms
  bomb.hp = Math.floor(bomb.maxHp / 2);
  const before = bomb.hp;
  logs.length = 0;
  await b.applyAbility(mage, g.ABILITIES.fire, bomb.x, bomb.y);
  ok('fire heals a bomb', bomb.hp > before && logs.some(l => /drinks in/.test(l)), `${before} -> ${bomb.hp}`);

  // Immunity blocks entirely
  const rock = mk('Rock', 'knight', 8, { team: 'enemy', gear: { acc: 'obsidianCharm' } });
  ok('gear can grant immunity', g.affinityOf(rock, 'earth') === 0, `${g.affinityOf(rock, 'earth')}`);
  ok('immunity gear carries its own weakness', g.affinityOf(rock, 'holy') === 1.5);

  // Absorb on gear beats resist elsewhere, and never stacks into immunity
  const both = mk('Both', 'knight', 8, { gear: { body: 'stormMail', offhand: 'flameShield' } });
  ok('absorb outranks other answers', g.affinityOf(both, 'thunder') < 0);
  ok('two resists do not compound', g.affinityOf(both, 'fire') === 0.5, `${g.affinityOf(both, 'fire')}`);

  // Prediction reports the affinity
  const preds = b.predict(mage, g.ABILITIES.blizzard, bomb.x, bomb.y);
  ok('prediction flags a weakness', preds.some(p => p.unit === bomb && p.notes.includes('weak')),
     JSON.stringify(preds.map(p => p.notes)));
  const absorbPred = b.predict(mage, g.ABILITIES.fire, bomb.x, bomb.y);
  ok('prediction flags absorption as healing', absorbPred.some(p => p.unit === bomb && p.heal > 0 && p.notes.includes('absorbs')),
     JSON.stringify(absorbPred.map(p => ({ h: p.heal, d: p.dmg, n: p.notes }))));

  // Drain from an absorbing target gives nothing
  const dark = mk('Fell', 'darkKnight', 9, { team: 'enemy' });
  ok('dark knight absorbs dark and burns in holy',
     g.affinityOf(dark, 'dark') < 0 && g.affinityOf(dark, 'holy') === 1.5);

  // The AI should not throw fire at something that drinks it
  const fireScore = b.scoreTarget(mage, g.ABILITIES.fire, mage.x, mage.y, bomb.x, bomb.y);
  const iceScore = b.scoreTarget(mage, g.ABILITIES.blizzard, mage.x, mage.y, bomb.x, bomb.y);
  ok('AI prefers ice over fire against a bomb', iceScore > fireScore, `fire=${Math.round(fireScore)} ice=${Math.round(iceScore)}`);

  // Holy Bolt is the answer to the boss
  const holyScore = b.scoreTarget(white, g.ABILITIES.holyBolt, white.x, white.y, bomb.x, bomb.y);
  ok('white mage has an offensive option', holyScore > 0, `${Math.round(holyScore)}`);

  console.log(fails ? `\n${fails} FAILED` : '\nall element checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
