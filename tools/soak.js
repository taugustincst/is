#!/usr/bin/env node
/* Plays many randomised battles to completion and checks the invariants that
   should hold no matter what happened: nothing ends with impossible numbers,
   nothing is left stuck, every battle resolves, and no exception escapes.

   This is the counterpart to the fixed test suites, which only cover cases
   somebody thought of.

   Usage: node tools/soak.js [battles] [seed] */
const { load } = require('./load');
const g = load();

const RUNS = Number(process.argv[2]) || 60;
const SEED = Number(process.argv[3]) || 12345;

// A small deterministic generator, so a failure can be reproduced from its seed.
let seed = SEED >>> 0;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const PLAYER_JOBS = Object.keys(g.JOB_EQUIP);
const ALL_JOBS = Object.keys(g.JOBS).filter(j => j !== 'darkKnightRisen');
const MAP_IDS = Object.keys(g.MAPS);

function makeParty(size, level) {
  const out = [];
  for (let i = 0; i < size; i++) {
    const job = pick(PLAYER_JOBS);
    const u = new g.Unit({ name: 'P' + i, job, level, team: 'player', leader: i === 0 });
    u.autoLearn(1);
    if (rnd() < 0.7) u.gear = g.bestGearFor(job, null, int(0, 6));
    // Give some of them passives, including the awkward ones.
    for (const kind of ['reaction', 'support', 'movement']) {
      if (rnd() < 0.5) {
        const opts = Object.keys(g.PASSIVES).filter(p => g.PASSIVES[p].kind === kind);
        const id = pick(opts);
        u.learned[id] = true;
        u.passives[kind] = id;
      }
    }
    if (u.hasPassive('twoHands')) delete u.gear.offhand;
    out.push(u);
  }
  return out;
}

function makeFoes(map, count, level) {
  const spots = [];
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if ('wtx'.includes(map.terrain[y][x])) continue;
    const d = Math.min(...map.deploy.map(p => Math.abs(p[0] - x) + Math.abs(p[1] - y)));
    if (d >= 5) spots.push({ x, y });
  }
  const foes = [];
  for (let i = 0; i < count && spots.length; i++) {
    const s = spots.splice(Math.floor(rnd() * spots.length), 1)[0];
    foes.push({ job: pick(ALL_JOBS), level, x: s.x, y: s.y });
  }
  return foes;
}

function objectiveFor() {
  const r = rnd();
  if (r < 0.6) return { type: 'rout', protectLeader: rnd() < 0.5 };
  if (r < 0.8) return { type: 'survive', rounds: int(2, 5), protectLeader: rnd() < 0.5 };
  return { type: 'boss', protectLeader: rnd() < 0.5 };
}

// Everything that must be true once a battle is over, whatever happened.
function check(b, problems, label) {
  const say = (m) => problems.push(`${label}: ${m}`);
  if (!b.over) say('battle did not end');
  if (!['victory', 'defeat'].includes(b.result)) say(`odd result ${b.result}`);
  if (b.round > g.ROUND_LIMIT + 1) say(`ran past the round limit (${b.round})`);
  for (const u of b.units) {
    const tag = `${u.name}(${u.team},${u.job})`;
    if (u.hp < 0) say(`${tag} has negative HP (${u.hp})`);
    if (u.hp > u.maxHp) say(`${tag} has HP above its maximum (${u.hp}/${u.maxHp})`);
    if (u.mp < 0) say(`${tag} has negative MP (${u.mp})`);
    if (u.mp > u.maxMp) say(`${tag} has MP above its maximum (${u.mp}/${u.maxMp})`);
    if (u.airborne && u.alive && b.onField(u)) say(`${tag} was left airborne`);
    if (u.alive && b.onField(u) && !b.grid.passable(u.x, u.y)) say(`${tag} stands on impassable ground`);
    if (b.onField(u) && (u.x < 0 || u.y < 0 || u.x >= b.grid.w || u.y >= b.grid.h)) say(`${tag} is off the map at ${u.x},${u.y}`);
    if (!Number.isFinite(u.hp) || !Number.isFinite(u.mp)) say(`${tag} has a non-finite stat`);
    for (const [k, v] of Object.entries(u.statuses)) {
      if (!(v > 0)) say(`${tag} kept a spent status ${k}`);
      if (u.wardsOff(k)) say(`${tag} carries ${k} despite warding it off`);
    }
    if (u.phases && u.phases.length && !u.alive) say(`${tag} died with a phase unspent`);
  }
  // Two units may never share a tile.
  const seen = new Map();
  for (const u of b.units) {
    if (!b.onField(u) || !u.alive) continue;
    const k = `${u.x},${u.y}`;
    if (seen.has(k)) say(`${u.name} and ${seen.get(k)} share tile ${k}`);
    seen.set(k, u.name);
  }
  // A charge left unresolved when the battle ends is fine, it is simply
  // abandoned. A charge belonging to someone who is gone is a leak.
  for (const p of b.pending) {
    if (!p.unit.alive || !b.onField(p.unit)) say(`${p.unit.name} left a charge behind after leaving the field`);
  }
  // The forecast must never name a unit that cannot act.
  for (const e of b.forecast(8)) {
    if (e.kind === 'unit' && !b.onField(e.unit)) say(`${e.unit.name} is in the turn order but off the field`);
  }
}

(async () => {
  const problems = [];
  const results = { victory: 0, defeat: 0 };
  const reasons = {};
  let turns = 0;
  for (let i = 0; i < RUNS; i++) {
    const mapId = pick(MAP_IDS);
    const map = g.MAPS[mapId];
    const level = int(1, 14);
    const party = makeParty(int(1, 6), level);
    const foes = makeFoes(map, int(1, 6), Math.max(1, level + int(-2, 2)));
    if (!foes.length) continue;
    const label = `#${i} ${mapId} lv${level} ${party.length}v${foes.length}`;
    let b;
    try {
      b = g.Battle.setup(map, party, foes, { log: () => {}, awaitPlayerTurn: (u) => b.aiTurn(u) }, objectiveFor());
      await b.run();
    } catch (e) {
      problems.push(`${label}: threw ${e && e.stack ? e.stack.split('\n')[0] : e}`);
      continue;
    }
    results[b.result] = (results[b.result] || 0) + 1;
    reasons[b.endReason || '(objective met)'] = (reasons[b.endReason || '(objective met)'] || 0) + 1;
    turns += b.turnNo;
    check(b, problems, label);
  }
  console.log(`${RUNS} randomised battles, seed ${SEED}`);
  console.log(`  results: ${JSON.stringify(results)}, average ${Math.round(turns / RUNS)} turns`);
  for (const [r, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(3)}  ${r}`);
  if (problems.length) {
    console.log(`\n${problems.length} invariant violation(s):`);
    for (const p of problems.slice(0, 40)) console.log('  - ' + p);
    process.exit(1);
  }
  console.log('\nno invariant violations');
})().catch(e => { console.error(e); process.exit(1); });
