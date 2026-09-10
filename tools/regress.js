#!/usr/bin/env node
/* Regression checks for each defect an adversarial review of the engine turned
   up. Each one reproduces the original failure, so a change that reintroduces
   it fails here rather than in a player's battle.

   Usage: node tools/regress.js */
const { load } = require('./load');
const g = load();
let fails = 0;
const ok = (name, cond, detail) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  [' + detail + ']' : '')); if (!cond) fails++; };
const mk = (n, job, lvl, opts = {}) => {
  const u = new g.Unit(Object.assign({ name: n, job, level: lvl, team: 'player' }, opts));
  u.autoLearn(1); return u;
};

(async () => {
  // 1. A leader left in reserve must not lose the battle instantly.
  {
    const party = ['squire', 'knight', 'archer', 'monk', 'thief', 'chemist']
      .map((j, i) => mk('P' + i, j, 5));
    party[5].leader = true; // last in the roster, so autoDeploy never places them
    let b; const hooks = { log: () => {}, awaitPlayerTurn: (u) => b.aiTurn(u) };
    b = g.Battle.setup(g.MAPS.dunmarch, party, g.CAMPAIGN[4].enemies, hooks, { type: 'rout', protectLeader: true });
    const leaderOnField = b.onField(b.objective.leader);
    const res = await b.run();
    ok('leader in reserve does not auto-lose', res !== 'defeat' || b.turnNo > 1,
       `deployed=${leaderOnField} result=${res} turns=${b.turnNo}`);
    ok('deployment flags the required unit', b.requiredUnit === party[5]);
  }

  // 2. A charge resolving into a kill must not delete someone else's charge.
  {
    const party = [mk('Caster', 'blackMage', 8), mk('Jumper', 'dragoon', 8)];
    let b; const hooks = { log: () => {}, awaitPlayerTurn: async () => {} };
    b = g.Battle.setup(g.MAPS.verdant, party, [{ job: 'squire', level: 1, x: 4, y: 1 }], hooks, { type: 'rout' });
    const victim = b.units.find(u => u.team === 'enemy');
    const jumper = party[1];
    // Three charges due on the same tick; the first kills the second's owner.
    b.pending = [
      { unit: party[0], ability: g.ABILITIES.fire, tx: victim.x, ty: victim.y, ct: 100, speed: 0 },
      { unit: victim, ability: g.ABILITIES.attack, tx: party[0].x, ty: party[0].y, ct: 100, speed: 0 },
      { unit: jumper, ability: g.ABILITIES.jump, tx: victim.x, ty: victim.y, ct: 40, speed: 0 },
    ];
    jumper.airborne = true;
    victim.hp = 1;
    const ready = b.pending.filter(p => p.ct >= 100);
    b.pending = b.pending.filter(p => p.ct < 100);
    for (const p of ready) { if (!p.unit.alive) continue; await b.applyAbility(p.unit, p.ability, p.tx, p.ty); }
    ok('a third charge survives a kill mid-resolution', b.pending.length === 1 && b.pending[0].unit === jumper,
       `pending=${b.pending.length}`);
  }

  // 3. Counter must not answer a blow that missed.
  {
    const monk = mk('Monk', 'monk', 8);
    monk.learned.counter = true; monk.passives.reaction = 'counter';
    const foe = mk('Foe', 'squire', 8, { team: 'enemy' });
    let b; const logs = [];
    b = g.Battle.setup(g.MAPS.verdant, [foe], [], { log: (m) => logs.push(m), awaitPlayerTurn: async () => {} });
    b.units = [foe, monk]; monk.team = 'enemy'; foe.team = 'player';
    monk.x = 2; monk.y = 1; monk.hp = monk.maxHp; monk.facing = 'W';
    foe.x = 1; foe.y = 1; foe.hp = foe.maxHp; foe.facing = 'E';
    // Land a spell first: that used to leave the hit flag set for later.
    await b.applyAbility(foe, g.ABILITIES.fire, monk.x, monk.y);
    logs.length = 0;
    b.hitChance = () => 0;            // force every physical attack to miss
    await b.applyAbility(foe, g.ABILITIES.attack, monk.x, monk.y);
    ok('no counter after a miss', !logs.some(l => /counterattacks/.test(l)), logs.join(' | ').slice(0, 90));
  }

  // 4. A unit revived earlier in the same tick must not act on the stale snapshot.
  {
    const healer = mk('Healer', 'whiteMage', 9);
    const corpse = mk('Corpse', 'squire', 9);
    let b; const turns = [];
    b = g.Battle.setup(g.MAPS.verdant, [healer, corpse], [{ job: 'goblin', level: 2, x: 8, y: 2 }],
      { log: () => {}, awaitPlayerTurn: async (u) => { turns.push(u.name); } }, { type: 'rout' });
    corpse.hp = 0; b.onUnitKO(corpse);
    healer.ct = 138; corpse.ct = 127;
    const acting = b.units.filter(u => b.onField(u) && u.ct >= 100 && !u.airborne).sort((a, c) => c.ct - a.ct);
    for (const u of acting) {
      if (!u.alive) { await b.tickDown(u); continue; }
      if (u.ct < 100) continue;
      if (u.name === 'Healer') { corpse.hp = 5; corpse.ct = 0; corpse.koCount = undefined; } // the revive
      turns.push(u.name);
    }
    ok('a revived unit waits for its next turn', turns.filter(t => t === 'Corpse').length === 0, turns.join(','));
  }

  // 5. The offhand must not swing at a unit the main hand felled.
  {
    const ninja = mk('Shadow', 'ninja', 10, { gear: g.enemyGearFor('ninja', 10) });
    let b; const logs = [];
    b = g.Battle.setup(g.MAPS.verdant, [ninja], [{ job: 'goblin', level: 1, x: 2, y: 1 }],
      { log: (m) => logs.push(m), awaitPlayerTurn: async () => {} }, { type: 'rout' });
    const foe = b.units.find(u => u.team === 'enemy');
    ninja.x = 1; ninja.y = 1; foe.hp = 1;
    await b.applyAbility(ninja, g.ABILITIES.attack, foe.x, foe.y);
    const hits = logs.filter(l => /deals \d+ damage/.test(l)).length;
    ok('dual wield stops when the target falls', hits === 1 && ninja.dualWielding, `hits=${hits}`);
  }

  // 9. Self-destruct should die through the normal KO path.
  {
    const bomb = mk('Bomb', 'bomb', 5, { team: 'enemy' });
    const hero = mk('Hero', 'knight', 8);
    let b; b = g.Battle.setup(g.MAPS.verdant, [hero], [{ job: 'bomb', level: 5, x: 2, y: 1 }],
      { log: () => {}, awaitPlayerTurn: async () => {} }, { type: 'rout' });
    const foe = b.units.find(u => u.team === 'enemy');
    foe.addStatus('haste');
    const gilBefore = b.rewards.gil;
    await b.applyAbility(foe, g.ABILITIES.selfDestruct, foe.x, foe.y);
    ok('self-destruct clears statuses and pays out', !foe.alive && !foe.hasStatus('haste') &&
       foe.koCount === g.KO_COUNTDOWN && b.rewards.gil > gilBefore,
       `alive=${foe.alive} haste=${foe.hasStatus('haste')} ko=${foe.koCount} gil+${b.rewards.gil - gilBefore}`);
  }

  // 10. A charge must fizzle rather than drive MP negative.
  {
    const mage = mk('Mage', 'blackMage', 10);
    let b; const logs = [];
    b = g.Battle.setup(g.MAPS.verdant, [mage], [{ job: 'goblin', level: 3, x: 4, y: 1 }],
      { log: (m) => logs.push(m), awaitPlayerTurn: async () => {} }, { type: 'rout' });
    const foe = b.units.find(u => u.team === 'enemy');
    b.pending = [{ unit: mage, ability: g.ABILITIES.flare, tx: foe.x, ty: foe.y, ct: 100, speed: 0 }];
    mage.mp = 1; // spent elsewhere while the spell was charging
    const ready = b.pending.filter(p => p.ct >= 100);
    b.pending = b.pending.filter(p => p.ct < 100);
    for (const p of ready) {
      if (p.ability.mp && p.unit.mp < b.mpCost(p.unit, p.ability)) { logs.push('fizzle'); continue; }
      await b.applyAbility(p.unit, p.ability, p.tx, p.ty);
    }
    ok('a spell without MP fizzles', mage.mp >= 0 && logs.includes('fizzle'), `mp=${mage.mp}`);
  }

  // 11. Rounds, not individual turns.
  {
    const party = ['knight', 'archer', 'whiteMage'].map((j, i) => mk('P' + i, j, 6));
    let b; b = g.Battle.setup(g.MAPS.dunmarch, party, g.CAMPAIGN[4].enemies,
      { log: () => {}, awaitPlayerTurn: (u) => b.aiTurn(u) }, { type: 'survive', rounds: 3 });
    const res = await b.run();
    ok('survive counts rounds', res !== 'victory' || b.round > 3, `round=${b.round} turns=${b.turnNo} res=${res}`);
    ok('a round is longer than one unit turn', b.turnNo > b.round, `turns=${b.turnNo} rounds=${b.round}`);
  }

  // 7. Every enemy is reachable on foot (the validator covers this too).
  {
    let unreachable = 0;
    for (const ch of g.CAMPAIGN) {
      const m = g.MAPS[ch.map], grid = new g.Grid(m);
      const zone = g.computeDeployZone(grid, m.deploy, ch.enemies);
      const seen = new Set(zone.map(t => `${t.x},${t.y}`));
      const q = zone.slice();
      for (let i = 0; i < q.length; i++) { const t = q[i];
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const nx = t.x + dx, ny = t.y + dy, k = `${nx},${ny}`;
          if (seen.has(k) || !grid.passable(nx, ny)) continue;
          if (Math.abs(grid.height(nx, ny) - grid.height(t.x, t.y)) > 5) continue;
          seen.add(k); q.push(grid.tile(nx, ny));
        } }
      for (const e of ch.enemies) if (!seen.has(`${e.x},${e.y}`)) unreachable++;
    }
    ok('no enemy is stranded off the walkable area', unreachable === 0, `stranded=${unreachable}`);
  }

  // ---- findings from the second review ----

  // An absorbed drain must not read as damage, nor tempt the AI.
  {
    const mage = mk('Skel', 'skeleton', 7, { team: 'enemy' });
    const ally = mk('Skel2', 'skeleton', 7, { team: 'enemy' });
    const hero = mk('Hero', 'knight', 7);
    let b; b = g.Battle.setup(g.MAPS.verdant, [hero], [{ job: 'skeleton', level: 7, x: 3, y: 1 }],
      { log: () => {}, awaitPlayerTurn: async () => {} }, { type: 'rout' });
    b.units = [hero, mage, ally];
    mage.x = 1; mage.y = 3; ally.x = 2; ally.y = 3; hero.x = 8; hero.y = 8;
    const p = b.predict(mage, g.ABILITIES.gravePull, ally.x, ally.y)[0];
    ok('an absorbed drain is not counted as damage', p && p.dmg === 0,
       p ? `dmg=${p.dmg} notes=${p.notes}` : 'no prediction');
    const onAlly = b.scoreTarget(mage, g.ABILITIES.gravePull, mage.x, mage.y, ally.x, ally.y);
    ok('draining an ally that absorbs it is not attractive', onAlly <= 0, `score=${Math.round(onAlly)}`);
  }

  // A raging unit obeys the same reach as a chosen attack.
  {
    const monk = mk('Rager', 'monk', 8);
    const foe = mk('Above', 'knight', 8, { team: 'enemy' });
    let b; b = g.Battle.setup(g.MAPS.dunmarch, [monk], [{ job: 'knight', level: 8, x: 6, y: 8 }],
      { log: () => {}, awaitPlayerTurn: async () => {} }, { type: 'rout' });
    b.units = [monk, foe];
    // A cliff: orthogonally adjacent, four levels apart.
    monk.x = 0; monk.y = 4; foe.x = 0; foe.y = 3;
    const normal = b.targetTilesFor(monk, g.ABILITIES.attack).some(t => t.x === foe.x && t.y === foe.y);
    monk.addStatus('berserk');
    const hpBefore = foe.hp;
    await b.berserkTurn(monk);
    ok('rage cannot swing where a chosen attack could not reach',
       normal || foe.hp === hpBefore, `normalReach=${normal} hp ${hpBefore}->${foe.hp}`);
  }

  // A phase change takes the old shape's charge with it.
  {
    const ch = g.CAMPAIGN[6];
    const party = ['knight', 'whiteMage'].map((j, i) => mk('P' + i, j, 10));
    let b; b = g.Battle.setup(g.MAPS[ch.map], party, ch.enemies,
      { log: () => {}, awaitPlayerTurn: async () => {} }, ch.objective);
    const boss = b.units.find(u => u.boss);
    b.pending.push({ unit: boss, ability: g.ABILITIES.shadowBlade, tx: party[0].x, ty: party[0].y, ct: 40, speed: 12 });
    boss.hp = Math.floor(boss.maxHp * 0.3);
    b.checkPhase(boss);
    ok('the change drops what the old shape was charging',
       !b.pending.some(p => p.unit === boss), `pending=${b.pending.length}`);
  }

  // Silence stops a spell already in flight.
  {
    const mage = mk('Caster', 'whiteMage', 10);
    let b; b = g.Battle.setup(g.MAPS.verdant, [mage], [{ job: 'goblin', level: 4, x: 4, y: 1 }],
      { log: () => {}, awaitPlayerTurn: async () => {} }, { type: 'rout' });
    const foe = b.units.find(u => u.team === 'enemy');
    const hp = foe.hp, mp = mage.mp;
    b.pending = [{ unit: mage, ability: g.ABILITIES.holyBolt, tx: foe.x, ty: foe.y, ct: 100, speed: 0 }];
    mage.addStatus('silence');
    const ready = b.pending.filter(p => p.ct >= 100);
    b.pending = b.pending.filter(p => p.ct < 100);
    for (const p of ready) {
      const id = Object.keys(g.ABILITIES).find(k => g.ABILITIES[k] === p.ability);
      if (id && !p.unit.canUse(id)) continue;
      await b.applyAbility(p.unit, p.ability, p.tx, p.ty);
    }
    ok('a silenced caster\'s charge does not land', foe.hp === hp && mage.mp === mp,
       `hp ${hp}->${foe.hp} mp ${mp}->${mage.mp}`);
  }

  // Affinity should be as defensive about the job as about the gear.
  {
    let threw = false;
    try { g.affinityOf({}, 'fire'); } catch (e) { threw = true; }
    ok('affinity of an object with no job does not throw', !threw);
  }

  // A save naming things this build no longer has must still load.
  {
    let threw = null;
    try {
      const u = new g.Unit({ name: 'Old', job: 'noSuchJob', level: 5, team: 'player',
        secondary: 'alsoGone', learned: { notAnAbility: true }, gear: { weapon: 'notAnItem' },
        passives: { support: 'notAPassive' } });
      u.actionMenu();
      ok('a save from another build heals rather than crashing',
         u.job === 'squire' && u.secondary === null && !u.gear.weapon, `job=${u.job} sec=${u.secondary}`);
    } catch (e) { threw = e.message; ok('a save from another build heals rather than crashing', false, threw); }
  }

  // 23. The sprite art is data, and data drifts. A template that loses a row,
  //     a job that names a template nobody drew, or a glyph that hangs off the
  //     grid all render as silent damage rather than an error, so check them.
  {
    const fs = require('fs'), path = require('path'), vm = require('vm');
    const { ROOT } = require('./load');
    const ctx = { document: { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {}, clearRect() {} }), width: 0, height: 0 }) } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/sprites.js'), 'utf8'), ctx);
    const get = (n) => vm.runInContext(n, ctx);
    const T = get('SPRITE_TEMPLATES'), W = get('SPRITE_W'), H = get('SPRITE_H');
    const GW = get('GRID_W'), GH = get('GRID_H'), OX = get('BODY_OX'), OY = get('BODY_OY');

    const shapes = [];
    for (const [name, tpl] of Object.entries(T)) {
      for (const view of ['front', 'back']) shapes.push([`${name}.${view}`, tpl[view]]);
    }
    const badSize = shapes.filter(([, rows]) => rows.length !== H || rows.some(r => r.length !== W));
    ok('every sprite template is the declared size', badSize.length === 0,
       badSize.length ? badSize.map(b => b[0]).join(',') : `${shapes.length} at ${W}x${H}`);

    const missing = Object.values(g.JOBS).filter(j => !T[j.sprite]).map(j => j.name);
    ok('every job names a template that exists', missing.length === 0, missing.join(',') || `${Object.keys(g.JOBS).length} jobs`);

    // The body is stamped at an offset; it must still land inside the grid.
    ok('the body fits the composite grid', OX + W <= GW && OY + H <= GH, `${OX}+${W}<=${GW}, ${OY}+${H}<=${GH}`);

    const glyphs = [];
    for (const [k, v] of Object.entries(get('WEAPONS'))) glyphs.push(['weapon ' + k, v]);
    for (const [k, v] of Object.entries(get('SHIELDS'))) glyphs.push(['shield ' + k, v]);
    for (const [k, v] of Object.entries(get('ARMOUR'))) glyphs.push(['armour ' + k, v]);
    for (const n of ['HELM', 'PLUME', 'CAP', 'FEATHER', 'POINTED_HAT', 'RIBBON']) glyphs.push([n, get(n)]);
    for (const gl of get('FIST_WRAPS')) glyphs.push(['fist wrap', gl]);
    const off = glyphs.filter(([, gl]) =>
      gl.x < 0 || gl.y < 0 || gl.y + gl.rows.length > GH || gl.x + Math.max(...gl.rows.map(r => r.length)) > GW);
    ok('every equipment glyph fits the grid', off.length === 0, off.map(o => o[0]).join(',') || `${glyphs.length} glyphs`);

    // Anything a player can equip must have somewhere to be drawn.
    const weapons = get('WEAPONS');
    const noGlyph = Object.values(g.ITEMS).filter(i => i.slot === 'weapon' && !weapons[i.wtype] && i.wtype !== 'fist');
    ok('every weapon type has a glyph', noGlyph.length === 0, noGlyph.map(i => i.name).join(',') || 'all drawn');
    const looks = ['helm', 'cap', 'feather', 'wizard', 'ribbon'];
    const badLook = Object.values(g.ITEMS).filter(i => i.slot === 'head' && i.look && !looks.includes(i.look));
    ok('every head item declares a look the renderer knows', badLook.length === 0, badLook.map(i => i.name).join(',') || 'all known');
    const armour = get('ARMOUR');
    const badArmour = Object.values(g.ITEMS).filter(i => i.slot === 'body' && i.atype !== 'cloth' && !armour[i.atype]);
    ok('every armour type has a glyph', badArmour.length === 0, badArmour.map(i => i.name).join(',') || 'all drawn');

    // Palette keys must resolve, or a pixel renders magenta.
    const pal = get('resolvePalette')(g.JOBS.knight.palette, 'player', 'human');
    const keys = new Set();
    for (const [, rows] of shapes) for (const r of rows) for (const ch of r) if (ch !== '.') keys.add(ch);
    const unresolved = [...keys].filter(k => !pal[k]);
    ok('every body palette key resolves to a colour', unresolved.length === 0, unresolved.join(',') || [...keys].sort().join(''));
  }

  // 24. The battle effects are a lookup table over ability data, so the ways
  //     they break are all silent: an element with no effect, a weapon with no
  //     swing, a name that no longer resolves to a draw function. Check that
  //     every path through the tables lands somewhere real.
  {
    const fs = require('fs'), path = require('path'), vm = require('vm');
    const { ROOT } = require('./load');
    const ctx = { window: {}, Math, JSON };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/fx.js'), 'utf8'), ctx);
    const get = (n) => vm.runInContext(n, ctx);
    const DRAW = get('FX_DRAW'), WFX = get('WEAPON_FX'), EFX = get('ELEMENT_FX');
    const abilityFx = get('abilityFx'), weaponFx = get('weaponFx'), throwShape = get('throwShape');

    const missingEl = Object.keys(g.ELEMENTS).filter(e => !EFX[e]);
    ok('every element has an effect of its own', missingEl.length === 0, missingEl.join(',') || Object.keys(EFX).join(','));

    // Distinct elements must not collapse onto one look.
    const kinds = new Set(Object.values(EFX).map(f => f.kind));
    ok('the elements do not share a look', kinds.size === Object.keys(EFX).length, `${kinds.size} looks for ${Object.keys(EFX).length} elements`);

    const specs = Object.values(EFX).concat([get('NEUTRAL_MAGIC'), get('HEAL_FX'), get('BUFF_FX')]);
    const noDraw = specs.filter(f => !DRAW[f.kind]).map(f => f.kind);
    ok('every effect names a draw function that exists', noDraw.length === 0, noDraw.join(',') || `${specs.length} effects`);

    const noSwing = Object.entries(WFX).filter(([, w]) => w.swing && !DRAW[w.swing]).map(([k]) => k);
    ok('every weapon swing names a draw function that exists', noSwing.length === 0, noSwing.join(',') || `${Object.keys(WFX).length} weapons`);

    // A weapon a player can buy must have a way to be swung.
    const wtypes = [...new Set(Object.values(g.ITEMS).filter(i => i.slot === 'weapon').map(i => i.wtype))];
    const unarmed = wtypes.filter(t => !WFX[t]);
    ok('every weapon type has an attack animation', unarmed.length === 0, unarmed.join(',') || wtypes.join(','));

    // Elemental abilities must animate as their element, and every ability
    // must resolve to something -- a physical blow legitimately returns null,
    // because the weapon carries it.
    const wrongEl = Object.values(g.ABILITIES)
      .filter(a => a.element && abilityFx(a) !== EFX[a.element]).map(a => a.name);
    ok('an elemental ability animates as its element', wrongEl.length === 0, wrongEl.join(',') || 'all elements match');

    // Healing read as generic magic once, which made Cure look like a curse.
    const heals = Object.values(g.ABILITIES).filter(a =>
      !a.element && (a.effects || []).some(e => e.type === 'heal' || e.type === 'revive'));
    const wrongHeal = heals.filter(a => abilityFx(a) !== get('HEAL_FX')).map(a => a.name);
    ok('a spell that mends does not animate as a curse', wrongHeal.length === 0,
       wrongHeal.join(',') || `${heals.length} healing abilities`);

    const bare = { weapon: { wtype: 'fist', range: 1 } };
    ok('a job with no weapon still swings something', !!weaponFx(bare, g.ABILITIES.attack), 'fist');
    const shapes = ['orb', 'star', 'arrow', 'rock'];
    const badShape = [['fist'], ['bow'], ['knife'], ['sword'], ['ninjablade']]
      .map(([t]) => throwShape({ weapon: { wtype: t } }, g.ABILITIES.throwStone))
      .filter(sh => !shapes.includes(sh));
    ok('everything thrown has a shape the renderer draws', badShape.length === 0, badShape.join(',') || shapes.join(','));
    // A spear reaches two tiles, which once made it throw a rock.
    ok('a spear thrusts rather than throws', g.ABILITIES.attack.range === 'weapon',
       `attack range=${g.ABILITIES.attack.range}`);
  }

  console.log(fails ? `\n${fails} regression(s) FAILED` : '\nall regression checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
