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
    for (const ch of r) if (!'gdsbwtxnir'.includes(ch)) bad(`${id}: unknown terrain '${ch}' in row ${y}`);
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
  if (!g.SLOT_NAMES[it.slot] && it.slot !== 'material') bad(`item ${id} has unknown slot '${it.slot}'`);
  if (it.slot === 'weapon' && (!it.wtype || !it.power || !it.range)) bad(`weapon ${id} is missing wtype, power or range`);
  if (it.tier === undefined || it.price === undefined) bad(`item ${id} is missing tier or price`);
}
// ---- item icons: every item and every one of the chemist's items draws one ----
{
  const gi = load(['data', 'color', 'icons']);
  for (const [kind, rows] of Object.entries(gi.ICON_GLYPHS)) {
    if (rows.length > gi.ICON_SIZE) bad(`icon glyph ${kind} has ${rows.length} rows, more than ${gi.ICON_SIZE}`);
    rows.forEach((r, y) => {
      if (r.length > gi.ICON_SIZE) bad(`icon glyph ${kind} row ${y} is ${r.length} wide, more than ${gi.ICON_SIZE}`);
      for (const ch of r) if (!'.xmMhwWlLcCgGyYbsfF'.includes(ch)) bad(`icon glyph ${kind} row ${y} uses unknown letter '${ch}'`);
    });
    if (!rows.some(r => /[^.]/.test(r))) bad(`icon glyph ${kind} is blank`);
  }
  for (const id of Object.keys(g.ITEMS)) {
    const kind = gi.iconKind(id);
    if (!kind || !gi.ICON_GLYPHS[kind]) bad(`item ${id} has no icon (kind ${kind})`);
  }
  for (const [id, ab] of Object.entries(g.ABILITIES)) {
    if (ab.kind !== 'item') continue;
    const kind = gi.iconKind('ab:' + id);
    if (!kind || !gi.ICON_GLYPHS[kind]) bad(`the chemist's ${id} has no icon`);
  }
}

// ---- beasts ----
for (const [id, p] of Object.entries(g.PETS)) {
  if (!g.JOBS[id] || g.JOBS[id].kind !== 'monster') bad(`beast ${id} is not a monster job`);
  if (!Array.isArray(p.names) || p.names.length < 2) bad(`beast ${id} needs at least two names`);
  if (!(p.price > 0)) bad(`beast ${id} has no kennel price`);
  if (!p.desc) bad(`beast ${id} has no description`);
}
for (const c of g.run('typeof CITIES === "undefined" ? [] : CITIES')) {
  for (const j of c.pets || []) if (!g.PETS[j]) bad(`city ${c.id} kennels an unknown beast '${j}'`);
}
if (!Object.values(g.ABILITIES).some(ab => ab.effects.some(e => e.type === 'tame'))) bad('no ability tames');

const CITY_IDS = g.run('typeof CITIES === "undefined" ? [] : CITIES.map(c => c.id)');
// A recipe or material is merged into ITEMS after the literal, so an id used
// twice would quietly replace a wagon item rather than fail to parse.
const dataSrc = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'data.js'), 'utf8');
for (const id of [...Object.keys(g.FORGE_ITEMS), ...Object.keys(g.MATERIALS)]) {
  const n = (dataSrc.match(new RegExp(`^  ${id}: `, 'gm')) || []).length;
  if (n !== 1) bad(`item id ${id} is defined ${n} times; a forge recipe or material must not reuse a wagon item's id`);
}
for (const [id, it] of Object.entries(g.FORGE_ITEMS)) {
  if (!CITY_IDS.includes(it.forge)) bad(`forge recipe ${id} belongs to unknown city '${it.forge}'`);
  for (const m of Object.keys(it.cost || {})) if (!g.MATERIALS[m]) bad(`forge recipe ${id} asks for unknown material '${m}'`);
  if (!Object.keys(it.cost || {}).length) bad(`forge recipe ${id} costs nothing`);
}
for (const [job, kit] of Object.entries(g.STARTER_GEAR)) {
  for (const [slot, id] of Object.entries(kit)) {
    if (!g.ITEMS[id]) bad(`starter kit for ${job} names unknown item '${id}'`);
    else if (!g.canEquipInSlot(job, id, slot)) bad(`${job} cannot equip its own starter ${id}`);
    else if (g.ITEMS[id].price !== 0) bad(`starter item ${id} has a sell value, which would mint gil`);
  }
}

// ---- names that are another game's ----
// Mechanics cannot be owned, but proper nouns are recognised on sight, and a
// store listing full of them reads as a copy rather than a game of its own.
const LIFTED = ['zorlin', 'ramia', 'yoichi', 'blade grasp', 'auto-potion', 'concentrate', 'accumulate', 'throw stone',
  'power break', 'speed break', 'magic break', 'mind break', 'bloodstrings', 'bloody strings', 'faerie harp', 'fairy harp',
  'ashura', 'asura', 'wave fist', 'earth slash', 'chakra', 'chirijiraden', 'kikuichimoji', 'bizen', "heaven's cloud", 'kiyomori',
  'nagrarock', 'save the queen', 'materia blade', 'ultima', 'reraise', 'wiznaibus', 'daravon', 'ivalice', 'zodiac', 'lucavi',
  'ramza', 'delita', 'orlandu', 'agrias', 'hamedo', 'genji', 'battle song', 'life song', 'angel song', 'nameless song',
  'night sword', 'absorb mp', 'regenerator', 'attack up', 'two hands', 'martial arts', 'two swords', 'gained jp', 'move-find'];
const named = [];
for (const [kind, table] of [['item', g.ITEMS], ['ability', g.ABILITIES], ['passive', g.PASSIVES], ['status', g.STATUSES], ['job', g.JOBS]]) {
  for (const [id, o] of Object.entries(table)) {
    for (const text of [o.name, o.skillset]) {
      const n = (text || '').toLowerCase();
      const hit = LIFTED.find(w => n.includes(w));
      if (hit) named.push(`${kind} ${id} "${text}" (${hit})`);
    }
  }
}
for (const n of named) bad(`name lifted from another game: ${n}`);

// ---- languages ----
// Every string the shell asks for must be in every language, with the same
// placeholders, or a screen goes half-English or shows a bare {name}.
{
  const fs = require('fs'), path = require('path'), vm = require('vm');
  const root = path.join(__dirname, '..');
  const ictx = { console }; vm.createContext(ictx);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8'), ictx, { filename: 'i18n.js' });
  const STRINGS = vm.runInContext('STRINGS', ictx), COLS = vm.runInContext('LANG_COLS', ictx);
  const holes = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
  for (const [key, row] of Object.entries(STRINGS)) {
    if (!Array.isArray(row) || row.length !== COLS.length) { bad(`language table: "${key}" has ${row && row.length} of ${COLS.length} languages`); continue; }
    row.forEach((text, i) => {
      if (!text || !text.trim()) bad(`language table: "${key}" is empty in ${COLS[i]}`);
      else if (holes(text) !== holes(key)) bad(`language table: "${key}" in ${COLS[i]} has placeholders {${holes(text)}}, not {${holes(key)}}`);
    });
  }
  // The keys the code asks for: tr('...') with a literal, and data-i18n in the shell.
  const asked = new Set();
  for (const f of ['js/game.js', 'js/ui.js']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of src.matchAll(/\btr\('((?:[^'\\]|\\.)*)'/g)) asked.add(m[1].replace(/\\'/g, "'"));
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const m of html.matchAll(/\sdata-i18n(?:="([^"]*)")?(?=[\s>])[^>]*>([^<]*)</g)) asked.add((m[1] || m[2]).replace(/&amp;/g, '&').trim());
  for (const m of html.matchAll(/data-i18n-(?:title|aria)="([^"]*)"/g)) asked.add(m[1]);
  for (const k of asked) if (!STRINGS[k]) bad(`language table lacks "${k}"`);
  // Table labels that reach the screen through a variable.
  for (const k of [...Object.values(g.run('CATEGORY_NAMES')), ...Object.values(g.run('DIFFICULTIES')).flatMap(d => [d.name, d.desc]), 'Attack']) if (!STRINGS[k]) bad(`language table lacks "${k}"`);
}

// ---- campaign ----
const ROADS = g.run('typeof ROADS === "undefined" ? {} : ROADS');
const ALL_CHAPTERS = [...g.CAMPAIGN, ...Object.values(ROADS).flatMap(r => r.chapters)];
for (const ch of ALL_CHAPTERS) {
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
  `${g.CAMPAIGN.length} chapters, ${Object.keys(ROADS).length} roads`,
].join(' '));
