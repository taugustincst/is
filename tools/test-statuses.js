#!/usr/bin/env node
/* Checks the control statuses: Silence sealing MP costs, Blind halving physical
   accuracy, Berserk taking a unit out of its owner's hands, and the gear and
   abilities that ward them off or lift them.

   Usage: node tools/test-statuses.js */
const { load } = require('./load');
const g = load();
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? '  [' + d + ']' : '')); if (!c) fails++; };
const mk = (n, job, lvl, opts = {}) => { const u = new g.Unit(Object.assign({ name: n, job, level: lvl, team: 'player' }, opts)); u.autoLearn(1); return u; };

(async () => {
  const mage = mk('Mage', 'blackMage', 10);
  const knight = mk('Knight', 'knight', 10);
  let b; const logs = [];
  b = g.Battle.setup(g.MAPS.verdant, [mage, knight], [{ job: 'goblin', level: 6, x: 4, y: 1 }],
    { log: (m) => logs.push(m), awaitPlayerTurn: async () => {} }, { type: 'rout' });
  const foe = b.units.find(u => u.team === 'enemy');

  // Silence
  ok('a caster may cast normally', mage.canUse('fire') && b.canAfford(mage, g.ABILITIES.fire));
  mage.addStatus('silence');
  ok('silence seals anything with an MP cost', !mage.canUse('fire') && !b.canAfford(mage, g.ABILITIES.fire));
  ok('silence leaves free abilities alone', mage.canUse('attack'));
  ok('silenced casters are dropped from the AI menu',
     !mage.allAbilities().filter(a => b.canAfford(mage, g.ABILITIES[a])).some(a => g.ABILITIES[a].mp > 0));
  mage.removeStatus('silence');

  // Blind
  const clear = b.hitChance(knight, g.ABILITIES.attack, foe);
  knight.addStatus('blind');
  const blinded = b.hitChance(knight, g.ABILITIES.attack, foe);
  ok('blind halves physical accuracy', blinded < clear && blinded >= Math.floor(clear / 2) - 1, `${clear}% -> ${blinded}%`);
  ok('blind does not touch magic', b.hitChance(mage, g.ABILITIES.fire, foe) === 100);
  knight.removeStatus('blind');

  // Berserk
  const calm = b.computeEffect(knight, g.ABILITIES.attack, g.ABILITIES.attack.effects[0], foe);
  knight.addStatus('berserk');
  const raging = b.computeEffect(knight, g.ABILITIES.attack, g.ABILITIES.attack.effects[0], foe);
  ok('berserk raises damage by half', raging === Math.floor(calm * 1.5), `${calm} -> ${raging}`);
  ok('berserk allows nothing but attacking', knight.canUse('attack') && !knight.canUse('powerBreak'));
  // A raging player unit acts without being asked.
  let asked = false;
  b.hooks.awaitPlayerTurn = async () => { asked = true; };
  knight.x = 1; knight.y = 1; foe.x = 3; foe.y = 1; foe.hp = foe.maxHp;
  logs.length = 0;
  await b.takeTurn(knight);
  ok('a raging unit is not handed to its owner', !asked && logs.some(l => /lost to rage/.test(l)));
  ok('a raging unit closes and swings', logs.some(l => /damage to/.test(l)) || g.Grid.dist(knight.x, knight.y, foe.x, foe.y) <= knight.weapon.range,
     logs.join(' | ').slice(0, 80));
  knight.removeStatus('berserk');

  // Warding gear refuses the affliction outright
  const warded = mk('Warded', 'whiteMage', 10, { gear: { head: 'ribbon' } });
  warded.addStatus('silence'); warded.addStatus('blind'); warded.addStatus('poison');
  ok('a Ribbon refuses what it wards', !warded.hasStatus('silence') && !warded.hasStatus('blind') && !warded.hasStatus('poison'));
  warded.addStatus('slow');
  ok('a Ribbon still allows what it does not ward', warded.hasStatus('slow'));

  // Cures lift them
  const sick = mk('Sick', 'squire', 8);
  for (const st of ['silence', 'blind', 'berserk', 'poison']) sick.addStatus(st);
  const healer = mk('Healer', 'whiteMage', 10);
  healer.x = 1; healer.y = 1; sick.x = 1; sick.y = 2;
  b.units = [healer, sick, foe];
  await b.applyAbility(healer, g.ABILITIES.esuna, sick.x, sick.y);
  ok('Esuna lifts every affliction', Object.keys(sick.statuses).length === 0, JSON.stringify(Object.keys(sick.statuses)));

  // The AI should reach for Silence against a caster
  const enemyMage = mk('Foe', 'blackMage', 8, { team: 'enemy' });
  const enemyKnight = mk('Foe2', 'knight', 8, { team: 'enemy' });
  b.units = [mage, enemyMage, enemyKnight];
  // Keep them apart: Silence covers a cross, so neighbours would be scored together.
  mage.x = 1; mage.y = 1; enemyMage.x = 3; enemyMage.y = 1; enemyKnight.x = 1; enemyKnight.y = 4;
  const vsCaster = b.scoreTarget(mage, g.ABILITIES.silenceSpell, mage.x, mage.y, enemyMage.x, enemyMage.y);
  const vsFighter = b.scoreTarget(mage, g.ABILITIES.silenceSpell, mage.x, mage.y, enemyKnight.x, enemyKnight.y);
  ok('silence is worth more against a caster', vsCaster > vsFighter, `caster=${Math.round(vsCaster)} fighter=${Math.round(vsFighter)}`);

  console.log(fails ? `\n${fails} FAILED` : '\nall status checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
