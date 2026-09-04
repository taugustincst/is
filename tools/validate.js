#!/usr/bin/env node
/* Checks that the game's content is internally consistent: maps are rectangular
   and walkable, every unit starts somewhere legal, and every ability, item and
   passive a job refers to actually exists.

   Usage: node tools/validate.js       (exits non-zero on the first problem) */
const { load } = require('./load');
const g = load();
const problems = [];
const bad = (msg) => problems.push(msg);

// ---- maps ----
for (const [id, m] of Object.entries(g.MAPS)) {
  if (m.heights.length !== m.h) bad(`${id}: ${m.heights.length} height rows, expected ${m.h}`);
  if (m.terrain.length !== m.h) bad(`${id}: ${m.terrain.length} terrain rows, expected ${m.h}`);
  m.heights.forEach((r, y) => { if (r.length !== m.w) bad(`${id}: height row ${y} is ${r.length} wide, expected ${m.w}`); });
  m.terrain.forEach((r, y) => {
    if (r.length !== m.w) bad(`${id}: terrain row ${y} is ${r.length} wide, expected ${m.w}`);
    for (const ch of r) if (!'gdsbwtx'.includes(ch)) bad(`${id}: unknown terrain '${ch}' in row ${y}`);
  });
  if (!m.deploy || !m.deploy.length) bad(`${id}: no deployment anchors`);
  for (const [x, y] of m.deploy || []) {
    if (x >= m.w || y >= m.h) bad(`${id}: deploy anchor ${x},${y} is off the map`);
    else if ('wtx'.includes(m.terrain[y][x])) bad(`${id}: deploy anchor ${x},${y} is impassable`);
  }
}

// ---- jobs, abilities, passives ----
for (const [id, j] of Object.entries(g.JOBS)) {
  for (const a of j.abilities) if (!g.ABILITIES[a]) bad(`job ${id} teaches unknown ability '${a}'`);
  for (const r of Object.keys(j.req || {})) if (!g.JOBS[r]) bad(`job ${id} requires unknown job '${r}'`);
  if (!j.weapon || !j.weapon.power) bad(`job ${id} has no innate weapon`);
}
for (const [id, ab] of Object.entries(g.ABILITIES)) {
  if (ab.job && !g.JOBS[ab.job]) bad(`ability ${id} belongs to unknown job '${ab.job}'`);
  for (const e of ab.effects) {
    if (e.type === 'status' && !g.STATUSES[e.status]) bad(`ability ${id} inflicts unknown status '${e.status}'`);
    if (e.type === 'cure') for (const st of e.statuses) if (!g.STATUSES[st]) bad(`ability ${id} cures unknown status '${st}'`);
  }
}
for (const [id, p] of Object.entries(g.PASSIVES)) {
  if (!g.PASSIVE_KINDS[p.kind]) bad(`passive ${id} has unknown kind '${p.kind}'`);
  if (!g.JOBS[p.job]) bad(`passive ${id} belongs to unknown job '${p.job}'`);
}
for (const job of Object.keys(g.JOB_EQUIP)) {
  if (!g.JOBS[job]) bad(`equip table names unknown job '${job}'`);
  for (const slot of ['weapon', 'body', 'head']) {
    if (!g.itemsForSlot(job, slot).length) bad(`job ${job} has nothing it can wear in the ${slot} slot`);
  }
}

// ---- items ----
for (const [id, it] of Object.entries(g.ITEMS)) {
  if (!g.SLOT_NAMES[it.slot]) bad(`item ${id} has unknown slot '${it.slot}'`);
  if (it.slot === 'weapon' && (!it.wtype || !it.power || !it.range)) bad(`weapon ${id} is missing wtype, power or range`);
  if (it.tier === undefined || it.price === undefined) bad(`item ${id} is missing tier or price`);
}
for (const [job, kit] of Object.entries(g.STARTER_GEAR)) {
  for (const [slot, id] of Object.entries(kit)) {
    if (!g.ITEMS[id]) bad(`starter kit for ${job} names unknown item '${id}'`);
    else if (!g.canEquipInSlot(job, id, slot)) bad(`${job} cannot equip its own starter ${id}`);
    else if (g.ITEMS[id].price !== 0) bad(`starter item ${id} has a sell value, which would mint gil`);
  }
}

// ---- campaign ----
for (const ch of g.CAMPAIGN) {
  const m = g.MAPS[ch.map];
  if (!m) { bad(`${ch.id}: unknown map '${ch.map}'`); continue; }
  if (!ch.enemies.length) bad(`${ch.id}: no enemies`);
  const seen = new Set();
  for (const e of ch.enemies) {
    if (!g.JOBS[e.job]) bad(`${ch.id}: unknown enemy job '${e.job}'`);
    if (e.x >= m.w || e.y >= m.h) bad(`${ch.id}: enemy at ${e.x},${e.y} is off the map`);
    else if ('wtx'.includes(m.terrain[e.y][e.x])) bad(`${ch.id}: enemy at ${e.x},${e.y} stands on impassable ground`);
    const key = `${e.x},${e.y}`;
    if (seen.has(key)) bad(`${ch.id}: two enemies share tile ${key}`);
    seen.add(key);
    if (m.deploy.some(d => d[0] === e.x && d[1] === e.y)) bad(`${ch.id}: enemy stands on a deploy anchor at ${key}`);
    for (const id of e.passives || []) if (!g.PASSIVES[id]) bad(`${ch.id}: unknown passive '${id}'`);
  }
  const o = ch.objective || {};
  if (o.type === 'boss' && !ch.enemies.some(e => e.boss)) bad(`${ch.id}: boss objective with no boss`);
  if (o.type === 'survive' && !(o.rounds > 0)) bad(`${ch.id}: survive objective without a round count`);
  if (ch.recruit && !g.JOBS[ch.recruit.job]) bad(`${ch.id}: recruit has unknown job '${ch.recruit.job}'`);
  // A deployment zone must exist once the enemies are placed.
  const grid = new g.Grid(m);
  const zone = g.computeDeployZone(grid, m.deploy, ch.enemies);
  if (zone.length < 3) bad(`${ch.id}: deployment zone is only ${zone.length} tiles`);

  // Every enemy must be walkable to from the deployment zone, or a melee party
  // can never finish a rout and will be handed the turn limit instead.
  const JUMP = 5; // the most generous climb any job reaches without Sure Footing
  const walkable = new Set();
  const queue = zone.slice();
  for (const t of queue) walkable.add(`${t.x},${t.y}`);
  for (let i = 0; i < queue.length; i++) {
    const t = queue[i];
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = t.x + dx, ny = t.y + dy, key = `${nx},${ny}`;
      if (walkable.has(key) || !grid.passable(nx, ny)) continue;
      if (Math.abs(grid.height(nx, ny) - grid.height(t.x, t.y)) > JUMP) continue;
      walkable.add(key);
      queue.push(grid.tile(nx, ny));
    }
  }
  for (const e of ch.enemies) {
    if (!walkable.has(`${e.x},${e.y}`)) {
      bad(`${ch.id}: ${e.name || e.job} at ${e.x},${e.y} cannot be walked to from the deployment zone`);
    }
  }
}
for (const p of g.STARTING_PARTY) if (!g.JOBS[p.job]) bad(`starting party member ${p.name} has unknown job '${p.job}'`);
if (!g.STARTING_PARTY.some(p => p.leader)) bad('the starting party has no leader');
for (const pool of g.TRAINING_POOL) for (const j of pool) if (!g.JOBS[j]) bad(`training pool names unknown job '${j}'`);

if (problems.length) {
  console.error(`${problems.length} problem(s) found:`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log([
  'content ok:',
  `${Object.keys(g.MAPS).length} maps,`,
  `${Object.keys(g.JOBS).length} jobs,`,
  `${Object.keys(g.ABILITIES).length} abilities,`,
  `${Object.keys(g.PASSIVES).length} passives,`,
  `${Object.keys(g.ITEMS).length} items,`,
  `${g.CAMPAIGN.length} chapters`,
].join(' '));
