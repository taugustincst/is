#!/usr/bin/env node
/* Plays the campaign end to end with the game's own AI driving both sides,
   carrying levels, JP, gil and purchases forward between chapters. This is how
   the difficulty curve in the README was measured; re-run it after changing any
   stat, price or reward.

   Usage: node tools/simulate.js [runs] [trainingBattlesPerChapter]
   Example: node tools/simulate.js 20 1 */
const { load } = require('./load');
const g = load();

const RUNS = Number(process.argv[2]) || 10;
const TRAININGS = process.argv[3] === undefined ? 1 : Number(process.argv[3]);

// A stand-in for a competent player: learn the cheapest thing available, buy the
// best gear the purse allows, and take any advanced job that has unlocked.
function spendJp(u) {
  for (let guard = 0; guard < 25; guard++) {
    const pool = g.JOBS[u.job].abilities.concat(g.passivesOfJob(u.job))
      .filter(id => !u.learned[id])
      .map(id => ({ id, jp: (g.ABILITIES[id] || g.PASSIVES[id]).jp }))
      .sort((a, b) => a.jp - b.jp);
    if (!pool.length || (u.jp[u.job] || 0) < pool[0].jp) return;
    u.jp[u.job] -= pool[0].jp;
    u.learned[pool[0].id] = true;
    const p = g.PASSIVES[pool[0].id];
    if (p && !u.passives[p.kind]) u.passives[p.kind] = pool[0].id;
  }
}

function shop(party, state, chapter) {
  const tier = Math.min(6, chapter + 1);
  // Buy by slot across the whole party, the way a player spreads a purse.
  for (const slot of ['weapon', 'body', 'head', 'offhand', 'acc']) {
    for (const u of party) {
      const cur = u.gear[slot];
      let best = null, bestScore = cur ? g.gearScore(u.job, cur) : 0;
      for (const id of Object.keys(g.ITEMS)) {
        const it = g.ITEMS[id];
        if (it.tier > tier || it.price > state.gil) continue;
        if (!g.canEquipInSlot(u.job, id, slot, g.passiveEquipBonus(u))) continue;
        if (slot === 'offhand' && u.hasPassive('twoHands')) continue;
        const sc = g.gearScore(u.job, id);
        if (sc > bestScore) { bestScore = sc; best = id; }
      }
      if (best) { state.gil -= g.ITEMS[best].price; u.gear[slot] = best; }
    }
  }
}

function advanceJobs(party) {
  const rank = ['ninja', 'dragoon', 'monk', 'knight', 'timeMage', 'blackMage', 'whiteMage', 'thief', 'archer'];
  for (const u of party) {
    const open = Object.keys(g.JOB_EQUIP).filter(j => u.canUseJob(j) && Object.keys(g.JOBS[j].req).length);
    const pick = rank.find(j => open.includes(j));
    if (pick && pick !== u.job) { u.job = pick; u.dropInvalidGear(); }
    if (!u.gear.weapon && g.STARTER_GEAR[u.job]) u.gear = Object.assign({}, g.STARTER_GEAR[u.job]);
  }
}

async function fight(party, spec, state) {
  for (const u of party) u.resetBattleState();
  let b;
  const hooks = { log: () => {}, awaitPlayerTurn: (u) => b.aiTurn(u) };
  b = g.Battle.setup(g.MAPS[spec.map], party, spec.enemies, hooks, spec.objective);
  const res = await b.run();
  if (res === 'victory') state.gil += b.rewards.gil + (spec.gil || 0);
  return { res, turns: b.turnNo };
}

// A training battle roughly matching what the game generates.
function trainingSpec(party, chapterIndex) {
  const lvl = Math.max(1, Math.round(party.reduce((a, u) => a + u.level, 0) / party.length));
  const pool = g.TRAINING_POOL[Math.min(g.TRAINING_POOL.length - 1, chapterIndex)];
  const map = g.MAPS.verdant;
  const spots = [];
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if ('wtx'.includes(map.terrain[y][x])) continue;
    const d = Math.min(...map.deploy.map(p => Math.abs(p[0] - x) + Math.abs(p[1] - y)));
    if (d >= 6) spots.push({ x, y });
  }
  return {
    map: 'verdant', gil: 300 + lvl * 70, objective: { type: 'rout' },
    enemies: pool.map((job, i) => ({ job, level: lvl, x: spots[i].x, y: spots[i].y })),
  };
}

async function runCampaign() {
  const state = { gil: 500 };
  const party = g.STARTING_PARTY.map(p => new g.Unit(Object.assign({ team: 'player' }, p)));
  const results = [];
  for (let ci = 0; ci < g.CAMPAIGN.length; ci++) {
    const ch = g.CAMPAIGN[ci];
    for (let t = 0; t < TRAININGS; t++) await fight(party, trainingSpec(party, ci), state);
    for (const u of party) spendJp(u);
    shop(party, state, ci);
    advanceJobs(party);
    const r = await fight(party, ch, state);
    results.push({
      ch: ch.id, res: r.res, turns: r.turns, gil: state.gil,
      lvl: party.reduce((a, u) => a + u.level, 0) / party.length,
    });
    if (r.res !== 'victory') break;
    if (ch.recruit) party.push(new g.Unit(Object.assign({ team: 'player' }, ch.recruit)));
  }
  return results;
}

(async () => {
  const tally = {};
  for (let r = 0; r < RUNS; r++) {
    for (const e of await runCampaign()) {
      const t = tally[e.ch] = tally[e.ch] || { win: 0, played: 0, turns: 0, lvl: 0, gil: 0 };
      t.played++; t.turns += e.turns; t.lvl += e.lvl; t.gil += e.gil;
      if (e.res === 'victory') t.win++;
    }
  }
  console.log(`${RUNS} runs, ${TRAININGS} training battle(s) per chapter\n`);
  console.log('chapter  reached   win%   turns   party Lv   gil left');
  for (const ch of g.CAMPAIGN) {
    const t = tally[ch.id];
    if (!t) { console.log(`${ch.id.padEnd(9)}never reached`); continue; }
    console.log(
      ch.id.padEnd(9) +
      `${t.played}/${RUNS}`.padEnd(10) +
      `${Math.round(100 * t.win / t.played)}%`.padEnd(7) +
      `${Math.round(t.turns / t.played)}`.padEnd(8) +
      `${(t.lvl / t.played).toFixed(1)}`.padEnd(11) +
      `${Math.round(t.gil / t.played)}`);
  }
})().catch(e => { console.error(e); process.exit(1); });
