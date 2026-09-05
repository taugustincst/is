#!/usr/bin/env node
/* Checks the final battle: that Ser Brannoc changes rather than dying at the
   threshold, that the change is complete and happens once, and that the
   objective still resolves on the unit that is left standing.

   Usage: node tools/test-boss.js */
const { load } = require('./load');
const g = load();
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? '  [' + d + ']' : '')); if (!c) fails++; };
const mk = (n, job, lvl) => { const u = new g.Unit({ name: n, job, level: lvl, team: 'player', gear: g.enemyGearFor(job, lvl) }); u.autoLearn(1); return u; };

(async () => {
  const ch = g.CAMPAIGN[6];
  const party = ['knight', 'archer', 'whiteMage', 'blackMage', 'monk'].map((j, i) => mk('P' + i, j, 11));
  party[0].leader = true;
  const logs = [];
  let b = g.Battle.setup(g.MAPS[ch.map], party, ch.enemies, { log: (m) => logs.push(m), awaitPlayerTurn: async () => {} }, ch.objective);
  const boss = b.units.find(u => u.boss);

  ok('the boss carries an unspent phase', Array.isArray(boss.phases) && boss.phases.length === 1);
  ok('the objective targets the boss', b.objective.target === boss);

  const firstForm = { name: boss.name, job: boss.job, hp: boss.maxHp, holy: g.affinityOf(boss, 'holy') };
  // Take him to the threshold.
  boss.hp = Math.floor(boss.maxHp * 0.34);
  const fired = b.checkPhase(boss);
  ok('the phase fires at the threshold', fired);
  ok('he is restored, not merely renamed', boss.hp === boss.maxHp && boss.maxHp > firstForm.hp,
     `${firstForm.hp} -> ${boss.maxHp}`);
  ok('the shape changes', boss.job !== firstForm.job && boss.name !== firstForm.name, `${firstForm.name} -> ${boss.name}`);
  ok('the new shape knows its own skills', boss.allAbilities().includes('blackTide') && boss.allAbilities().includes('despair'));
  ok('holy is still the answer', g.affinityOf(boss, 'holy') === 1.5 && g.affinityOf(boss, 'dark') < 0);
  ok('a man\'s armour is left behind', Object.keys(boss.gear).length === 0);
  ok('the change is announced', logs.some(l => /stands up in his armour/.test(l)));

  // It must not fire twice.
  boss.hp = 1;
  ok('the phase only fires once', !b.checkPhase(boss) && boss.hp === 1);
  ok('the objective still points at the same unit', b.objective.target === boss);

  // Killing the second form ends the battle.
  boss.hp = 0;
  b.onUnitKO(boss);
  boss.x = -1;
  b.checkEnd();
  ok('felling the last shape wins the battle', b.over && b.result === 'victory', `${b.result}`);

  // A killing blow at full tilt must transform rather than kill.
  const b2 = g.Battle.setup(g.MAPS[ch.map], party.map(u => mk(u.name, u.job, 11)), ch.enemies,
    { log: () => {}, awaitPlayerTurn: async () => {} }, ch.objective);
  const boss2 = b2.units.find(u => u.boss);
  const hero = b2.units.find(u => u.team === 'player');
  boss2.hp = 5;
  hero.x = boss2.x; hero.y = boss2.y + 1;
  // The point here is the phase trigger, not the hit roll: Brannoc's evasion
  // would otherwise turn this check into a coin flip.
  b2.hitChance = () => 100;
  await b2.applyAbility(hero, g.ABILITIES.attack, boss2.x, boss2.y);
  ok('an overkill blow triggers the change instead of a death', boss2.alive && boss2.job === 'darkKnightRisen',
     `alive=${boss2.alive} job=${boss2.job} hp=${boss2.hp}`);

  // The whole fight should now take real work, at two different strengths.
  async function play(level, runs) {
    let turns = 0, wins = 0, phaseSeen = 0;
    for (let i = 0; i < runs; i++) {
      const p = ['knight', 'archer', 'whiteMage', 'blackMage', 'monk'].map((j, k) => mk('P' + k, j, level));
      p[0].leader = true;
      const lg = [];
      let bb; bb = g.Battle.setup(g.MAPS[ch.map], p, ch.enemies, { log: (m) => lg.push(m), awaitPlayerTurn: (u) => bb.aiTurn(u) }, ch.objective);
      if (await bb.run() === 'victory') wins++;
      turns += bb.turnNo;
      if (lg.some(l => /stands up in his armour/.test(l))) phaseSeen++;
    }
    return { turns: Math.round(turns / runs), wins, phaseSeen, runs };
  }
  // Battles between two AI sides are noisy, so assert on the direction the
  // numbers move with party strength rather than on any single win count.
  const strong = await play(11, 8);
  const real = await play(8, 8);
  ok('the second phase is reached in play', strong.phaseSeen >= strong.runs - 1, `${strong.phaseSeen}/${strong.runs} fights`);
  ok('the finale is a long fight, not a rush', real.turns >= 18 && strong.turns >= 12,
     `level 8: ${real.turns} turns, level 11: ${strong.turns} turns`);
  ok('a stronger party finishes it faster', strong.turns < real.turns,
     `${strong.turns} vs ${real.turns} turns`);
  ok('a stronger party wins it more often', strong.wins >= real.wins,
     `level 11 won ${strong.wins}/${strong.runs}, level 8 won ${real.wins}/${real.runs}`);

  console.log(fails ? `\n${fails} FAILED` : '\nall boss checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
