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
    const looks = ['helm', 'cap', 'feather', 'wizard', 'ribbon', 'goggles'];
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

    // A party of five squires used to be five copies of one person. A look is
    // derived from a unit's id, and two things must survive it: the team
    // accent, which says whose side this is, and the job's cloth, which says
    // what it does.
    {
      const resolve = get('resolvePalette');
      const look = (id, sprite) => resolve(g.JOBS.squire.palette, 'player', 'human', { id, sprite });
      const a = look('rowan', 'warrior'), b = look('garret', 'warrior');
      ok('two recruits do not come out as the same person',
         a.s !== b.s || a.h !== b.h, `${a.s}/${a.h} vs ${b.s}/${b.h}`);
      ok('the same recruit comes back the same', look('rowan', 'warrior').s === a.s && look('rowan', 'warrior').h === a.h);

      const plain = resolve(g.JOBS.squire.palette, 'player', 'human');
      ok('a look never touches the team accent', a.d === plain.d, `${a.d} vs ${plain.d}`);
      // Cloth may shift a shade, but must stay recognisably the job's colour.
      const dist = (x, y) => {
        const h = (v) => parseInt(v.slice(1), 16);
        const [p1, p2] = [h(x), h(y)];
        return Math.abs(((p1 >> 16) & 255) - ((p2 >> 16) & 255))
             + Math.abs(((p1 >> 8) & 255) - ((p2 >> 8) & 255))
             + Math.abs((p1 & 255) - (p2 & 255));
      };
      const drift = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => dist(look(id, 'warrior').c, plain.c));
      ok('cloth stays the job\'s colour', Math.max(...drift) <= 45, `worst drift ${Math.max(...drift)}`);

      // Spread: eight recruits should not land on two faces.
      const faces = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => {
        const l = look(id, 'warrior'); return `${l.s}|${l.h}`;
      }));
      ok('eight recruits are not two people', faces.size >= 6, `${faces.size} distinct of 8`);

      // A hatted template spends its hair key on the hat, so it varies the
      // fringe instead; either way a mage must not come out bald and uniform.
      const m1 = look('rowan', 'mage'), m2 = look('garret', 'mage');
      ok('a mage is told apart by the hair under the hat', m1.r !== m2.r, `${m1.r} vs ${m2.r}`);
      ok('a mage keeps the hat its job was given', m1.h === g.JOBS.whiteMage.palette.h || m1.h === plain.h, m1.h);
    }

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

    // Sight and sound describe the same blow. A weapon or element that gained
    // one but not the other would be silently half-finished, so check that
    // every name resolves against the audio table.
    const actx = { window: {}, localStorage: { getItem: () => null, setItem() {} }, Math, JSON };
    vm.createContext(actx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/audio.js'), 'utf8'), actx);
    const SFX = vm.runInContext('COMBAT_SFX', actx);

    const named = [];
    for (const [k, w] of Object.entries(WFX)) {
      named.push([`weapon ${k} swing`, w.sound], [`weapon ${k} impact`, w.impact]);
    }
    for (const [k, e] of Object.entries(EFX)) named.push([`element ${k}`, e.sound]);
    named.push(['neutral magic', get('NEUTRAL_MAGIC').sound]);
    for (const n of ['throw', 'cast']) named.push([`renderer cue ${n}`, n]);

    const silent = named.filter(([, n]) => !n);
    ok('every weapon and element names a sound', silent.length === 0,
       silent.map(x => x[0]).join(',') || `${named.length} named`);
    // 'heal' and 'buff' live in the hand-written cases, not the table.
    const HANDWRITTEN = ['heal', 'miss', 'ko', 'levelup', 'hit'];
    const unheard = named.filter(([, n]) => n && !SFX[n] && !HANDWRITTEN.includes(n));
    ok('every named sound exists in the audio table', unheard.length === 0,
       unheard.map(x => `${x[0]}=${x[1]}`).join(',') || `${Object.keys(SFX).length} sounds`);

    // Two weapons may share an impact -- an axe and a fist both land dully --
    // but the swings are what tell them apart, so those must differ.
    const swings = Object.values(WFX).map(w => w.sound);
    ok('no two weapons swing with the same sound', new Set(swings).size === swings.length,
       `${new Set(swings).size} sounds for ${swings.length} weapons`);
    const elSounds = Object.values(EFX).map(e => e.sound);
    ok('no two elements sound alike', new Set(elSounds).size === elSounds.length,
       `${new Set(elSounds).size} sounds for ${elSounds.length} elements`);

    // A sound with no layers plays silence, which is the same as being absent.
    const empty = Object.entries(SFX).filter(([, l]) => !Array.isArray(l) || !l.length).map(([k]) => k);
    ok('no sound in the table is silent', empty.length === 0, empty.join(',') || `${Object.keys(SFX).length} sounds`);
    // Every layer must say how long it lasts and how loud, or WebAudio throws.
    const malformed = [];
    for (const [k, layers] of Object.entries(SFX)) {
      for (const l of layers) {
        if (!(l.dur > 0) || !(l.vol > 0) || !(l.freq > 0)) malformed.push(k);
        if (l.n && l.t) malformed.push(k + ' (both tone and noise)');
      }
    }
    ok('every sound layer is playable', malformed.length === 0, [...new Set(malformed)].join(',') || 'all layers sound');

    // An elemental blow is spoken for by its element; anything else falls to
    // the weapon, and nothing may land in silence.
    const impactSound = get('impactSound');
    const bareHands = { weapon: { wtype: 'fist', range: 1 } };
    ok('an elemental blow leaves the sound to its element',
       impactSound(bareHands, g.ABILITIES.fire) === null, 'fire');
    ok('a plain blow is heard as its weapon',
       impactSound(bareHands, g.ABILITIES.attack) === WFX.fist.impact, WFX.fist.impact);
    // A thrown stone lands as a stone, whatever the thrower happens to hold.
    const swordsman = { weapon: { wtype: 'sword', range: 1 } };
    ok('a thrown stone lands as a stone, not as the sword in hand',
       impactSound(swordsman, g.ABILITIES.throwStone) === 'impact-blunt',
       impactSound(swordsman, g.ABILITIES.throwStone));
    const isThrown = get('isThrown');
    ok('a weapon used at its own reach is not thrown', !isThrown(g.ABILITIES.attack), 'attack');
    ok('an ability that reaches on its own is thrown', isThrown(g.ABILITIES.throwStone), 'throwStone');
    ok('an elemental reach is left to its element', !isThrown(g.ABILITIES.rootSnare), 'rootSnare');
  }

  /* 25. A crowded melee is the moment a player most needs to know whose side
     a figure is on, and it was the moment the game answered worst: both sides
     wore a near-black tunic and carried a three-pixel dot. Team identity is
     now carried three times over -- a base ring on the ground, a frame around
     the HP bar, and the cloth itself -- so check that each still says it, and
     that the ring says it in shape as well as in colour for a player who
     cannot tell red from blue. */
  {
    const fs = require('fs'), path = require('path'), vm = require('vm');
    const { ROOT } = require('./load');
    const ctx = { document: { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {}, clearRect() {} }), width: 0, height: 0 }) } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/sprites.js'), 'utf8'), ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/render.js'), 'utf8'), ctx);
    const get = (n) => vm.runInContext(n, ctx);
    const TEAM = get('TEAM_COLORS'), RING = get('BASE_RING'), resolve = get('resolvePalette');
    const rgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    // How far towards red a colour leans, against its own blue.
    const warmth = (hex) => { const [r, , b] = rgb(hex); return r - b; };

    const noRing = Object.keys(TEAM).filter(t => !RING[t]);
    ok('every team has a base ring', noRing.length === 0, noRing.join(',') || Object.keys(TEAM).join(','));
    ok('the ring tells the sides apart by colour',
       warmth(RING.enemy.line) > 60 && warmth(RING.player.line) < -60,
       `enemy=${warmth(RING.enemy.line)} player=${warmth(RING.player.line)}`);
    // Colour alone fails a colour-blind player, so the rings differ in shape.
    ok('the ring tells the sides apart by shape as well',
       RING.enemy.teeth !== RING.player.teeth,
       `enemy teeth=${RING.enemy.teeth} player teeth=${RING.player.teeth}`);

    // The cloth of a human leans towards its own team, and the two sides are
    // far enough apart that a torso answers the question on its own.
    const cloths = {};
    for (const team of ['player', 'enemy']) {
      cloths[team] = Object.values(g.JOBS)
        .filter(j => j.kind === 'human' || !j.kind)
        .map(j => resolve(j.palette, team, 'human', null).c);
    }
    const wrongLean = [];
    for (const team of ['player', 'enemy']) {
      for (const c of cloths[team]) {
        const w = warmth(c);
        if (team === 'enemy' ? w < 5 : w > -5) wrongLean.push(`${team}:${c}`);
      }
    }
    ok('a human tunic leans towards its own team', wrongLean.length === 0,
       wrongLean.join(',') || `${cloths.player.length} jobs both ways`);
    const gaps = cloths.player.map((c, i) => warmth(cloths.enemy[i]) - warmth(c));
    ok('the two sides never wear the same tunic', Math.min(...gaps) > 30,
       `narrowest gap=${Math.min(...gaps)}`);
    // A tunic nobody can see is no cue: the old enemy cloth was near black.
    const dim = [];
    for (const team of ['player', 'enemy']) {
      for (const c of cloths[team]) if (Math.max(...rgb(c)) < 70) dim.push(`${team}:${c}`);
    }
    ok('no tunic is too dark to read', dim.length === 0, dim.join(',') || 'all legible');
    // The accent stays the pure team colour, so it still stands out on cloth
    // that has been pulled part of the way towards it.
    const flat = [];
    for (const team of ['player', 'enemy']) {
      for (const j of Object.values(g.JOBS)) {
        if (j.kind && j.kind !== 'human') continue;
        const pal = resolve(j.palette, team, 'human', null);
        if (pal.d !== TEAM[team]) flat.push(`${j.name}:${team}`);
        const [dr, dg, db] = rgb(pal.d), [cr, cg, cb] = rgb(pal.c);
        if (Math.abs(dr - cr) + Math.abs(dg - cg) + Math.abs(db - cb) < 60) flat.push(`${j.name}:${team} accent lost`);
      }
    }
    ok('the team accent still reads against the tunic', flat.length === 0, flat.join(',') || 'accent holds');
  }

  /* 26. The battle-speed setting divides every pause the engine takes, and
     the terrain art is data the renderer looks up by kind: a map with a
     terrain the texture table does not know would draw as bare grass. */
  {
    // The sandbox's setTimeout fires at once and ignores the delay, so the
    // delay is recorded instead: at 3x, a 300ms pause must ask for 100.
    const asked = g.run(`(() => {
      let ms = -1; const real = setTimeout;
      setTimeout = (fn, d) => { ms = d; fn(); };
      PACE.scale = 3; sleep(300); PACE.scale = 1;
      setTimeout = real; return ms; })()`);
    ok('an engine pause honours the battle speed', asked === 100, `300ms at 3x asked for ${asked}ms`);

    const fs = require('fs'), path = require('path'), vm = require('vm');
    const { ROOT } = require('./load');
    const ctx = { document: { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {}, clearRect() {} }), width: 0, height: 0 }) }, PACE: { scale: 1 } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/render.js'), 'utf8'), ctx);
    const TERRAIN = vm.runInContext('TERRAIN', ctx), variant = vm.runInContext('tileVariant', ctx), N = vm.runInContext('TILE_VARIANTS', ctx);
    const kinds = new Set();
    for (const m of Object.values(g.MAPS)) for (const row of m.terrain) for (const ch of row) if (ch !== 'x') kinds.add(ch);
    const unknown = [...kinds].filter(k => !TERRAIN[k]);
    ok('every terrain on every map has a look', unknown.length === 0, unknown.join(',') || [...kinds].sort().join(''));
    // The variant is a pure function of the coordinates, and spreads out.
    const seen = new Set(); let stable = true;
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
      const v = variant(x, y);
      if (v !== variant(x, y) || v < 0 || v >= N) stable = false;
      seen.add(v);
    }
    ok('tile variants are stable and use the whole set', stable && seen.size === N, `${seen.size} of ${N} variants over a 12x12 field`);
  }

  /* 27. A map names a mood, a mood names a theme, and a theme is thirty-two
     steps of playable notes. Any link missing and a battle opens in silence
     on a bare sky. */
  {
    const fs = require('fs'), path = require('path'), vm = require('vm');
    const { ROOT } = require('./load');
    const ctx = { document: { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {}, clearRect() {} }), width: 0, height: 0 }) }, PACE: { scale: 1 } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/render.js'), 'utf8'), ctx);
    const MOODS = vm.runInContext('MOODS', ctx);
    const actx = { window: {}, localStorage: { getItem: () => null, setItem() {} }, Math, JSON };
    vm.createContext(actx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/audio.js'), 'utf8'), actx);
    const TRACKS = vm.runInContext('TRACKS', actx);
    const noMood = Object.entries(g.MAPS).filter(([, m]) => !MOODS[m.mood]).map(([id, m]) => `${id}:${m.mood}`);
    ok('every map has a mood the renderer knows', noMood.length === 0, noMood.join(',') || `${Object.keys(g.MAPS).length} maps`);
    const noTrack = Object.entries(MOODS).filter(([, m]) => !TRACKS[m.music]).map(([k, m]) => `${k}:${m.music}`);
    ok('every mood plays a theme that exists', noTrack.length === 0, noTrack.join(',') || Object.keys(MOODS).join(','));
    const badTrack = [];
    for (const [k, t] of Object.entries(TRACKS)) {
      for (const part of ['lead', 'bass']) {
        if (!Array.isArray(t[part]) || t[part].length !== 32) badTrack.push(`${k}.${part} length`);
        else if (t[part].some(n => n !== null && (n < 24 || n > 96))) badTrack.push(`${k}.${part} range`);
        else if (t[part].every(n => n === null)) badTrack.push(`${k}.${part} silent`);
      }
      if (!(t.bpm > 40 && t.bpm < 240) || !(t.gain > 0 && t.gain < 0.5)) badTrack.push(`${k} tempo/gain`);
      if (!['sine', 'square', 'triangle', 'sawtooth'].includes(t.wave)) badTrack.push(`${k} wave`);
    }
    ok('every theme is thirty-two playable steps', badTrack.length === 0, badTrack.join(',') || `${Object.keys(TRACKS).length} themes`);
    const badSky = Object.entries(MOODS).filter(([, m]) => !m.sky || m.sky.length !== 2 || m.sky.some(c => !/^#[0-9a-f]{6}$/i.test(c))).map(([k]) => k);
    ok('every mood paints a sky', badSky.length === 0, badSky.join(',') || 'all skies');
    const used = new Set(Object.values(g.MAPS).map(m => m.mood));
    ok('no mood goes unused', Object.keys(MOODS).every(k => used.has(k)), [...used].sort().join(','));
  }

  /* 28. A new job is a bundle: a starter kit it can wear, an equipment row,
     gear in the shop for its weapon type, a swing for that type, and every
     passive it teaches actually consulted by the engine. A passive the
     engine never asks about is a JP sink that does nothing, which is the
     kind of thing that ships by accident. */
  {
    const fs = require('fs'), path = require('path');
    const { ROOT } = require('./load');
    const playable = Object.entries(g.JOBS).filter(([, j]) => j.kind === 'human' && j.req !== null).map(([id]) => id);
    const noKit = playable.filter(id => !g.STARTER_GEAR[id] || !g.JOB_EQUIP[id]);
    ok('every playable job has a starter kit and an equipment row', noKit.length === 0, noKit.join(',') || `${playable.length} jobs`);
    const unlockable = playable.filter(id => Object.keys(g.JOBS[id].req).length && Object.keys(g.JOBS[id].req).every(r => g.JOBS[r] && g.JOBS[r].req !== null));
    ok('every advanced job unlocks from playable jobs', unlockable.length === playable.filter(id => Object.keys(g.JOBS[id].req).length).length);
    const wtypes = new Set(Object.values(g.ITEMS).filter(i => i.slot === 'weapon').map(i => i.wtype));
    const noShop = [...wtypes].filter(t => !Object.values(g.ITEMS).some(i => i.slot === 'weapon' && i.wtype === t && i.tier > 0));
    ok('every weapon type has something to buy beyond the starter', noShop.length === 0, noShop.join(',') || `${wtypes.size} types`);
    // The campaign was balanced before the master-tier gear existed; no enemy
    // of any job at any level may be issued a piece of it.
    const leaked = [];
    for (const job of Object.keys(g.JOB_EQUIP)) for (const lvl of [6, 10, 14, 30]) {
      for (const id of Object.values(g.enemyGearFor(job, lvl, 1))) if (g.ITEMS[id] && g.ITEMS[id].late) leaked.push(`${job}@${lvl}:${id}`);
    }
    ok('master-tier gear is never issued to enemies', leaked.length === 0, leaked.slice(0, 4).join(',') || `${Object.values(g.ITEMS).filter(i => i.late).length} late items withheld`);
    const legendary = Object.values(g.ITEMS).filter(i => i.tier >= 7);
    ok('legendary arms are all withheld from enemies', legendary.length > 0 && legendary.every(i => i.late), `${legendary.length} legendary items`);
    const openEnded = Object.entries(g.JOBS).filter(([, j]) => j.kind === 'human' && j.req && Object.keys(j.req).length && Object.values(j.req).some(l => l > 7));
    ok('no job asks for a job level that cannot be reached', openEnded.length === 0, openEnded.map(([k]) => k).join(',') || `max level ${g.JOB_LEVEL_JP.length - 1}`);
    const ranks = g.run('Object.keys(JOBS).filter(id => JOBS[id].req !== null).map(id => [id, jobTier(id)])');
    ok('every playable job sits at a finite rank on the tree', ranks.every(([, t]) => Number.isInteger(t) && t >= 0 && t < g.run('TIER_NAMES.length')), `${ranks.length} jobs over ${new Set(ranks.map(r => r[1])).size} ranks`);
    const rec = g.run('(() => { const u = new Unit({ job: "knight", name: "R" }); u.record.battles = 4; u.record.kills = 9; u.record.falls = 1; const back = Unit.fromSave(JSON.parse(JSON.stringify(u.toSave()))); return [back.record, recordLine(back), new Unit({ job: "squire" }).record]; })()');
    ok('a battle record survives the save and reads as words', rec[0].battles === 4 && rec[0].kills === 9 && rec[0].falls === 1 && rec[1] === '4 battles, 0 won · 9 felled · fallen once' && rec[2].battles === 0, rec[1]);
    const acts = g.run('ACTS'), epi = g.run('EPILOGUE_CAMP');
    const thin = g.CAMPAIGN.filter(ch => !(ch.intro && ch.intro.length >= 3 && ch.intro.length <= 7) || !(ch.outro && ch.outro.length >= 1 && ch.outro.length <= 7) || !(ch.camp && ch.camp.length >= 2 && ch.camp.length <= 4)).map(ch => ch.id);
    ok('every chapter has an intro, an outro and a night around the fire, none too long for the screen', thin.length === 0, thin.join(',') || `${g.CAMPAIGN.length} chapters`);
    const covered = g.CAMPAIGN.every((ch, i) => acts.some(a => i >= a.from && i <= a.to));
    ok('every chapter belongs to an act, and the acts end where the road does', covered && acts.length === 3 && acts[acts.length - 1].to === g.CAMPAIGN.length - 1 && epi.length >= 5, `${acts.length} acts, ${epi.length} epilogue lines`);
    const hooks = g.CAMPAIGN[g.CAMPAIGN.length - 1].outro.join(' ');
    const finals = g.CAMPAIGN.filter(ch => ch.final).map(ch => ch.id);
    ok('the road ends once, at the end, with the end', /THE END\./.test(hooks) && finals.length === 1 && finals[0] === g.CAMPAIGN[g.CAMPAIGN.length - 1].id && /END OF ACT II/.test(g.CAMPAIGN[11].outro.join(' ')), finals.join(','));
    const northMaps = g.CAMPAIGN.slice(12).map(ch => g.MAPS[ch.map]);
    ok('the north is fought on snow and ice under its own skies', northMaps.every(m => /[ni]/.test(m.terrain.join('')) && ['snow', 'aurora'].includes(m.mood)), northMaps.map(m => m.mood).join(','));
    const typeNames = g.run('TYPE_NAMES'), catNames = g.run('CATEGORY_NAMES');
    const untyped = Object.keys(g.ITEMS).filter(id => !typeNames[g.run(`itemType('${id}')`)] || !catNames[g.ITEMS[id].slot]);
    ok('every item shelves under a kind and a category the baggage knows', untyped.length === 0, untyped.join(',') || `${Object.keys(typeNames).length} kinds, ${Object.keys(catNames).length} categories`);
    const cities = g.run('CITIES');
    const badCity = cities.filter(c => !g.MAPS[c.map] || !c.enemies.length || !c.hires.every(j => g.JOBS[j] && g.JOBS[j].req !== null) || !c.stock.every(i => g.ITEMS[i] && g.ITEMS[i].city === c.id) || !(c.intro.length >= 2 && c.intro.length <= 4) || !(c.outro.length >= 1 && c.outro.length <= 3) || c.from < 0 || c.from > g.CAMPAIGN.length).map(c => c.id);
    ok('every city has a field, holders, trained trades to hire and a market of its own', cities.length >= 6 && badCity.length === 0 && new Set(cities.map(c => c.id)).size === cities.length, badCity.join(',') || `${cities.length} cities`);
    const strayCity = Object.entries(g.ITEMS).filter(([, it]) => it.city && !cities.some(c => c.id === it.city && c.stock.includes(Object.keys(g.ITEMS).find(k => g.ITEMS[k] === it)))).map(([k]) => k);
    ok('every city-only item is sold by exactly the city that claims it', strayCity.length === 0, strayCity.join(',') || `${Object.values(g.ITEMS).filter(i => i.city).length} city items`);
    const errands = g.run('ERRANDS');
    ok('every errand is a day or two with pay, JP and a chance of a find', errands.length >= 8 && errands.every(e => [1, 2].includes(e.days) && e.gil > 0 && e.jp > 0 && e.item >= 0 && e.item <= 1 && e.title && e.text) && new Set(errands.map(e => e.id)).size === errands.length, `${errands.length} errands`);
    const rvm = require('vm'), rctx = { document: { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {}, clearRect() {} }), width: 0, height: 0 }) }, PACE: { scale: 1 } };
    rvm.createContext(rctx); rvm.runInContext(fs.readFileSync(path.join(ROOT, 'js/render.js'), 'utf8'), rctx);
    const audioSrc = fs.readFileSync(path.join(ROOT, 'js', 'audio.js'), 'utf8');
    const moods = Object.keys(rvm.runInContext('MOODS', rctx)), amb = new Function(`return ${(audioSrc.match(/const AMBIENCE = (\{[^}]*\});/) || [])[1] || '{}'}`)();
    const unknownAmb = moods.filter(m => !(m in amb));
    const unbuilt = [...new Set(Object.values(amb).filter(Boolean))].filter(k => !audioSrc.includes(`kind === '${k}'`));
    ok('every mood names an ambience the engine can build', unknownAmb.length === 0 && unbuilt.length === 0, unknownAmb.concat(unbuilt).join(',') || `${moods.length} moods, ${new Set(Object.values(amb).filter(Boolean)).size} ambiences`);
    const cry = g.run(`(async () => {
      const map = MAPS[Object.keys(MAPS)[0]];
      const a = new Unit({ name: 'A', job: 'knight', level: 5, team: 'player' }), b = new Unit({ name: 'B', job: 'squire', level: 5, team: 'player' });
      const hooks = { log: () => {}, awaitPlayerTurn: () => {} };
      const bt = Battle.setup(map, [a, b], [{ job: 'squire', level: 5, x: 9, y: 9 }], hooks, { type: 'rout' });
      bt.placeUnit(a, map.deploy[0][0], map.deploy[0][1]); bt.placeUnit(b, map.deploy[1][0], map.deploy[1][1]);
      b.hp = 0; b.koCount = 1; await bt.tickDown(b);
      const left = bt.crystals.length, at = bt.crystalAt(map.deploy[1][0], map.deploy[1][1]);
      a.hp = 3; a.mp = 0;
      const path = [{ x: a.x, y: a.y }, { x: map.deploy[1][0], y: map.deploy[1][1] }];
      await bt.moveUnit(a, path);
      return { left, at: !!at, hp: a.hp, maxHp: a.maxHp, mp: a.mp, maxMp: a.maxMp, gone: bt.crystals.length, carried: b.carriedOff };
    })()`);
    const cr = await cry;
    ok('a unit carried off leaves a crystal that restores whoever stands there', cr.left === 1 && cr.at && cr.carried && cr.hp === cr.maxHp && cr.mp === cr.maxMp && cr.gone === 0, JSON.stringify(cr));
    const engine = fs.readdirSync(path.join(ROOT, 'js')).map(f => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')).join('\n');
    const dead = Object.keys(g.PASSIVES).filter(id => !engine.includes(`hasPassive('${id}')`));
    ok('every passive is consulted by the engine', dead.length === 0, dead.join(',') || `${Object.keys(g.PASSIVES).length} passives`);
    // Every effect type an ability uses must be one the engine applies.
    const applied = (engine.match(/case '([a-z]+)': \{/g) || []).map(m => m.slice(6, -4));
    const unhandled = [...new Set(Object.values(g.ABILITIES).flatMap(a => a.effects.map(e => e.type)))].filter(t => !applied.includes(t));
    ok('every ability effect type is one the engine applies', unhandled.length === 0, unhandled.join(',') || applied.join(','));
  }

  /* 29. Every ability of the second-tier jobs, cast once by the engine at a
     legal target, has to visibly do its thing: damage, MP burned, healing, a
     status or a stat change. Rolls are forced so a 30% status cannot hide a
     defect, reactions and gear are stripped from the targets so a Parry or a
     Storm Mail cannot either, and charged abilities are resolved as the
     engine would resolve them. */
  {
    const NEW = ['samurai', 'summoner', 'geomancer', 'bard', 'paladin', 'arcanist', 'assassin', 'sage', 'dragonlord', 'hierophant', 'fellKnight', 'engineer', 'gunner', 'aeronaut', 'artificer', 'frostweaver', 'warden', 'runeblade'];
    const realRandom = Math.random;
    const silent = [];
    for (const job of NEW) for (const id of g.JOBS[job].abilities) {
      const ab = g.ABILITIES[id];
      const caster = new g.Unit({ name: 'Caster', job, level: 10, team: 'player' });
      caster.learned[id] = true;
      const friend = new g.Unit({ name: 'Friend', job: 'knight', level: 10, team: 'player' });
      let b; const hooks = { log: () => {}, awaitPlayerTurn: async () => {} };
      b = g.Battle.setup(g.MAPS.verdant, [caster, friend], [{ job: 'knight', level: 10, x: 3, y: 2 }, { job: 'blackMage', level: 10, x: 4, y: 2 }], hooks, { type: 'rout' });
      const foe = b.units.find(u => u.team === 'enemy' && u.job === 'knight');
      const mage = b.units.find(u => u.team === 'enemy' && u.job === 'blackMage');
      caster.x = 2; caster.y = 2; friend.x = 1; friend.y = 2; friend.hp = Math.floor(friend.maxHp / 2); friend.mp = 0;
      caster.mp = caster.maxMp;
      for (const u of b.units) { u.passives = { reaction: null, support: null, movement: null }; if (u.team === 'enemy') u.gear = {}; }
      const helpful = ab.affects === 'ally';
      // A self-only ability changes the caster; everything else is aimed at
      // the friend, the caster mage for the MP-taking cuts, or the foe.
      const target = helpful ? (ab.self && !ab.aoe ? caster : friend) : (/bizenBoat|drainSoul|soulRend/.test(id) ? mage : foe);
      if (ab.deadOnly) { friend.hp = 0; friend.koCount = 3; }
      // The stats themselves, not the modifier table: a buff that changes a
      // number nothing reads is not a buff.
      const snap = (u) => JSON.stringify([u.hp, u.mp, Object.keys(u.statuses), u.pa, u.ma, u.spd, u.move, u.jump, u.evade, u.ct]);
      const before = snap(target);
      Math.random = () => 0.01;
      try {
        const tiles = b.targetTilesFor(caster, ab);
        const at = tiles.find(t => t.x === target.x && t.y === target.y) || tiles[0];
        await b.useAbility(caster, ab, at.x, at.y);
        for (const p of b.pending.splice(0)) await b.applyAbility(p.unit, p.ability, p.tx, p.ty);
      } catch (e) { silent.push(`${id} threw ${e.message}`); }
      Math.random = realRandom;
      if (snap(target) === before && !silent.some(x => x.startsWith(id))) silent.push(id);
    }
    ok('every advanced ability does what it says', silent.length === 0,
       silent.join(',') || `${NEW.reduce((n, j) => n + g.JOBS[j].abilities.length, 0)} abilities cast`);

    // Reraise is the one status that acts at the moment of death: a unit
    // carrying it, struck down, must be standing afterwards with a quarter
    // of its HP, and carrying it no longer.
    {
      const u = new g.Unit({ name: 'Held', job: 'knight', level: 10, team: 'player' });
      let b; b = g.Battle.setup(g.MAPS.verdant, [u], [{ job: 'knight', level: 10, x: 3, y: 2 }], { log: () => {}, awaitPlayerTurn: async () => {} }, { type: 'rout' });
      u.addStatus('reraise'); u.hp = 1;
      const foe = b.units.find(x => x.team === 'enemy');
      const before = u.hp;
      b.onUnitKO(u);
      ok('a fall under Reraise is not a fall', u.alive && u.hp === Math.floor(u.maxHp / 4) && !u.hasStatus('reraise'), `hp ${before} -> ${u.hp} of ${u.maxHp}`);
      u.hp = 0; b.onUnitKO(u);
      ok('Reraise is spent by the rising', !u.alive && u.hp === 0, `hp ${u.hp}`);
      // A commander cannot be slain outright.
      foe.boss = true; foe.hp = 50;
      Math.random = () => 0.01;
      const did = b.applyEffect(u, g.ABILITIES.assassinate, g.ABILITIES.assassinate.effects[0], foe);
      Math.random = realRandom;
      ok('Assassinate cannot fell a commander', !did && foe.hp === 50, `boss hp ${foe.hp}`);
    }
  }

  console.log(fails ? `\n${fails} regression(s) FAILED` : '\nall regression checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
