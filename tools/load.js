/* Loads the game's plain browser scripts into a Node sandbox so the engine and
   its data can be exercised without a browser.

   The game files declare everything with top-level `const`, which lives in the
   realm's lexical scope rather than on the context object, so the values are
   read back by evaluating their names inside the same context. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ENGINE = ['data', 'unit', 'map', 'battle'];

// Everything the tools need to reach.
const NAMES = [
  'MAPS', 'JOBS', 'ABILITIES', 'PASSIVES', 'PASSIVE_KINDS', 'STATUSES', 'ITEMS',
  'SLOT_NAMES', 'GEAR_STATS', 'JOB_EQUIP', 'STARTER_GEAR', 'CAMPAIGN',
  'STARTING_PARTY', 'TRAINING_POOL', 'JOB_LEVEL_JP', 'TURN_LIMIT', 'KO_COUNTDOWN',
  'Unit', 'Battle', 'Grid', 'makeEnemy', 'canEquip', 'canEquipInSlot',
  'itemsForSlot', 'bestGearFor', 'gearScore', 'enemyGearFor', 'passivesOfJob',
  'passiveEquipBonus', 'jobLevelFromJP', 'computeDeployZone', 'facingFromDelta',
  'ELEMENTS', 'AFFINITY', 'affinityOf', 'affinityLabel',
];

function load(files = ENGINE) {
  const write = (...a) => fs.writeSync(1, a.join(' ') + '\n');
  const ctx = {
    console: { log: write, error: write, warn: write },
    setTimeout: (fn) => fn(),          // animation waits resolve immediately
    performance: { now: () => Date.now() },
    Math, JSON, process,
  };
  vm.createContext(ctx);
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', `${f}.js`), 'utf8'), ctx, { filename: `${f}.js` });
  }
  const api = vm.runInContext(`({ ${NAMES.join(', ')} })`, ctx);
  api.run = (code) => vm.runInContext(code, ctx);
  return api;
}

module.exports = { load, ROOT };
