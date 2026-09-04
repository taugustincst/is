/* ==========================================================================
   Chronicles of Elderon — game data
   Jobs, abilities, statuses, maps and the campaign script.
   ========================================================================== */

// ---------------------------------------------------------------- JP tiers
// Total JP earned in a job determines its job level (used for unlocks).
const JOB_LEVEL_JP = [0, 100, 250, 450, 700, 1000, 1400, 1900];

function jobLevelFromJP(total) {
  let lvl = 1;
  for (let i = 1; i < JOB_LEVEL_JP.length; i++) if (total >= JOB_LEVEL_JP[i]) lvl = i + 1;
  return lvl;
}

// ------------------------------------------------------------------ statuses
const STATUSES = {
  poison:  { name: 'Poison',  dur: 60, bad: true,  color: '#a05fd6', desc: 'Loses 1/8 max HP each turn.' },
  regen:   { name: 'Regen',   dur: 48, bad: false, color: '#6fd66f', desc: 'Recovers 1/8 max HP each turn.' },
  haste:   { name: 'Haste',   dur: 48, bad: false, color: '#ffd84a', desc: 'Charge Time fills 50% faster.' },
  slow:    { name: 'Slow',    dur: 48, bad: true,  color: '#7f8fb5', desc: 'Charge Time fills 50% slower.' },
  stop:    { name: 'Stop',    dur: 24, bad: true,  color: '#c2c2c2', desc: 'Cannot act or gain Charge Time.' },
  protect: { name: 'Protect', dur: 60, bad: false, color: '#f0a050', desc: 'Physical damage reduced by 1/3.' },
  shell:   { name: 'Shell',   dur: 60, bad: false, color: '#50b0f0', desc: 'Magical damage reduced by 1/3.' },
};

// ---------------------------------------------------------------------- jobs
// Stat multipliers are applied to a level-based baseline (see unit.js).
const JOBS = {
  squire: {
    name: 'Squire', skillset: 'Fundaments', kind: 'human', sprite: 'warrior',
    palette: { h: '#5a3a1e', c: '#8a7a55', p: '#4b3d2c', b: '#3a2a1a' },
    hp: 1.0, mp: 1.0, pa: 1.0, ma: 1.0, spd: 1.0, move: 4, jump: 3, evade: 8,
    weapon: { name: 'Short Sword', power: 5, range: 1, vert: 2 },
    abilities: ['throwStone', 'accumulate', 'yell', 'firstAid'],
    req: {}, desc: 'A well-rounded recruit. The root of the warrior path.',
  },
  chemist: {
    name: 'Chemist', skillset: 'Items', kind: 'human', sprite: 'warrior',
    palette: { h: '#2a2a2a', c: '#e8e0c8', p: '#6b5b40', b: '#3a2a1a' },
    hp: 0.85, mp: 1.1, pa: 0.9, ma: 1.05, spd: 1.05, move: 3, jump: 3, evade: 6,
    weapon: { name: 'Knife', power: 4, range: 1, vert: 2 },
    abilities: ['potion', 'hiPotion', 'antidote', 'ether', 'phoenixDown'],
    req: {}, desc: 'Field medic who uses items. The root of the mage path.',
  },
  knight: {
    name: 'Knight', skillset: 'Arts of War', kind: 'human', sprite: 'warrior',
    palette: { h: '#c9a24a', c: '#8892a8', p: '#3a4256', b: '#2a2a3a' },
    hp: 1.25, mp: 0.8, pa: 1.2, ma: 0.8, spd: 0.95, move: 3, jump: 3, evade: 10,
    weapon: { name: 'Broadsword', power: 6, range: 1, vert: 2 },
    abilities: ['powerBreak', 'speedBreak', 'magicBreak', 'shieldBash'],
    req: { squire: 2 }, desc: 'Heavy armor and a heavy blade. Cripples foes with Breaks.',
  },
  archer: {
    name: 'Archer', skillset: 'Aim', kind: 'human', sprite: 'warrior',
    palette: { h: '#7a4a2a', c: '#4f7a3f', p: '#5a4a30', b: '#3a2a1a' },
    hp: 0.95, mp: 0.9, pa: 1.1, ma: 0.9, spd: 1.05, move: 3, jump: 3, evade: 10,
    weapon: { name: 'Longbow', power: 4, range: 4, vert: 5 },
    abilities: ['aim1', 'aim3', 'aim5', 'arrowRain'],
    req: { squire: 2 }, desc: 'Strikes from afar. Charged Aim shots trade time for power.',
  },
  monk: {
    name: 'Monk', skillset: 'Martial Arts', kind: 'human', sprite: 'warrior',
    palette: { h: '#1a1a1a', c: '#d07a3a', p: '#e8d8b0', b: '#8a6a4a' },
    hp: 1.2, mp: 0.7, pa: 1.3, ma: 0.85, spd: 1.05, move: 4, jump: 4, evade: 12,
    weapon: { name: 'Bare Hands', power: 6, range: 1, vert: 3 },
    abilities: ['waveFist', 'quakeFist', 'chakra', 'revive'],
    req: { knight: 2 }, desc: 'Fights unarmed with tremendous power and chi techniques.',
  },
  thief: {
    name: 'Thief', skillset: 'Steal', kind: 'human', sprite: 'warrior',
    palette: { h: '#d0b060', c: '#5a3a6a', p: '#2a1a3a', b: '#1a1a1a' },
    hp: 0.9, mp: 0.8, pa: 1.0, ma: 0.8, spd: 1.25, move: 5, jump: 4, evade: 18,
    weapon: { name: 'Dagger', power: 4, range: 1, vert: 2 },
    abilities: ['stealGil', 'poisonBlade', 'mug'],
    req: { archer: 2 }, desc: 'Swift and slippery. Robs enemies blind.',
  },
  whiteMage: {
    name: 'White Mage', skillset: 'White Magick', kind: 'human', sprite: 'mage',
    palette: { h: '#e8e8f0', c: '#f4f0e8', p: '#c84040', b: '#6a4a3a' },
    hp: 0.8, mp: 1.3, pa: 0.75, ma: 1.25, spd: 1.0, move: 3, jump: 3, evade: 5,
    weapon: { name: 'Staff', power: 3, range: 1, vert: 2 },
    abilities: ['cure', 'cura', 'raise', 'protect', 'shell', 'regen'],
    req: { chemist: 2 }, desc: 'Mends wounds and shields allies with holy magick.',
  },
  blackMage: {
    name: 'Black Mage', skillset: 'Black Magick', kind: 'human', sprite: 'mage',
    palette: { h: '#2a2a4a', c: '#3a3a6a', p: '#c8a040', b: '#3a2a1a' },
    hp: 0.75, mp: 1.4, pa: 0.7, ma: 1.35, spd: 1.0, move: 3, jump: 3, evade: 5,
    weapon: { name: 'Rod', power: 3, range: 1, vert: 2 },
    abilities: ['fire', 'thunder', 'poisonSpell', 'fira', 'flare'],
    req: { chemist: 2 }, desc: 'Rains elemental ruin upon whole groups of foes.',
  },
  timeMage: {
    name: 'Time Mage', skillset: 'Time Magick', kind: 'human', sprite: 'mage',
    palette: { h: '#6a4a2a', c: '#4a6a8a', p: '#e8d060', b: '#3a2a1a' },
    hp: 0.75, mp: 1.4, pa: 0.7, ma: 1.25, spd: 0.95, move: 3, jump: 3, evade: 5,
    weapon: { name: 'Hourglass Staff', power: 3, range: 1, vert: 2 },
    abilities: ['haste', 'slowSpell', 'stopSpell', 'quick'],
    req: { whiteMage: 2 }, desc: 'Bends the flow of Charge Time itself.',
  },
  ninja: {
    name: 'Ninja', skillset: 'Throw', kind: 'human', sprite: 'warrior',
    palette: { h: '#1a1a1a', c: '#2a2a3a', p: '#1a1a2a', b: '#101018' },
    hp: 0.9, mp: 0.8, pa: 1.15, ma: 0.9, spd: 1.35, move: 5, jump: 5, evade: 22,
    weapon: { name: 'Twin Blades', power: 4, range: 1, vert: 2 },
    abilities: ['shuriken', 'flameBomb', 'smoke'],
    req: { thief: 3 }, desc: 'Strikes twice with each Attack and hurls thrown weapons.',
  },
  dragoon: {
    name: 'Dragoon', skillset: 'Jump', kind: 'human', sprite: 'warrior',
    palette: { h: '#3a2a5a', c: '#3a5a9a', p: '#2a3a5a', b: '#1a1a2a' },
    hp: 1.2, mp: 0.8, pa: 1.25, ma: 0.8, spd: 1.0, move: 3, jump: 5, evade: 8,
    weapon: { name: 'Spear', power: 6, range: 2, vert: 3 },
    abilities: ['jump', 'lancet', 'dragonRoar'],
    req: { thief: 2 }, desc: 'Leaps to the sky and crashes down on distant enemies.',
  },

  // ----------------------------------------------------------- monsters/boss
  goblin: {
    name: 'Goblin', skillset: 'Goblin', kind: 'monster', sprite: 'goblin',
    palette: { h: '#2a5a2a', c: '#4a8a3a', p: '#6a4a2a', b: '#3a2a1a' },
    hp: 1.1, mp: 0.5, pa: 1.1, ma: 0.7, spd: 0.95, move: 4, jump: 3, evade: 8,
    weapon: { name: 'Claws', power: 5, range: 1, vert: 2 },
    abilities: ['tackle', 'goblinPunch'], req: null, desc: 'A vicious little brute.',
  },
  wolf: {
    name: 'Dire Wolf', skillset: 'Wolf', kind: 'monster', sprite: 'wolf',
    palette: { h: '#4a4a4a', c: '#6a6a70', p: '#3a3a3a', b: '#2a2a2a' },
    hp: 0.85, mp: 0.5, pa: 1.05, ma: 0.6, spd: 1.3, move: 5, jump: 4, evade: 14,
    weapon: { name: 'Fangs', power: 5, range: 1, vert: 2 },
    abilities: ['bite', 'howl'], req: null, desc: 'Fast and hungry.',
  },
  bomb: {
    name: 'Bomb', skillset: 'Bomb', kind: 'monster', sprite: 'bomb',
    palette: { h: '#ff8a20', c: '#d04a10', p: '#801a00', b: '#ffd040' },
    hp: 0.7, mp: 0.8, pa: 0.9, ma: 1.2, spd: 1.0, move: 3, jump: 6, evade: 5,
    weapon: { name: 'Flame', power: 4, range: 1, vert: 3 },
    abilities: ['spark', 'selfDestruct'], req: null, desc: 'Floats about, burning. Explodes when cornered.',
  },
  darkKnight: {
    name: 'Dark Knight', skillset: 'Fell Sword', kind: 'human', sprite: 'warrior',
    palette: { h: '#c0c0d0', c: '#2a1a2a', p: '#1a0a1a', b: '#0a0a0a' },
    hp: 1.8, mp: 1.2, pa: 1.5, ma: 1.3, spd: 1.1, move: 4, jump: 4, evade: 15,
    weapon: { name: 'Fell Blade', power: 8, range: 1, vert: 3 },
    abilities: ['nightSword', 'shadowBlade', 'darkProtect'], req: null,
    desc: 'A fallen paladin wielding forbidden sword arts.',
  },
};

// ----------------------------------------------------------------- abilities
// range: max manhattan distance (string 'weapon' uses weapon range)
// aoe:   0 = single tile, 1 = plus-shape (r1), 2 = diamond r2
// vert:  max height difference between user and target tile
// ct:    0 = instant; otherwise charge speed (ability resolves at 100 CT)
// affects: 'enemy' | 'ally' | 'all' — who in the area the effects apply to
// effects: list of {type,...}
const ABILITIES = {
  attack: { name: 'Attack', job: null, jp: 0, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }], desc: 'Strike with your weapon.' },

  // Squire
  throwStone: { name: 'Throw Stone', job: 'squire', jp: 50, mp: 0, range: 4, aoe: 0, vert: 4, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 2 }], desc: 'Hurl a stone. Weak, but reaches far.' },
  accumulate: { name: 'Accumulate', job: 'squire', jp: 100, mp: 0, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'pa', amount: 1 }], desc: 'Focus. PA +1 for the rest of the battle.' },
  yell: { name: 'Yell', job: 'squire', jp: 150, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'support', affects: 'ally',
    effects: [{ type: 'statmod', stat: 'spd', amount: 2 }], desc: 'Rally an ally. Speed +2 for the rest of the battle.' },
  firstAid: { name: 'First Aid', job: 'squire', jp: 80, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', flat: 25 }, { type: 'cure', statuses: ['poison'] }], desc: 'Restore 25 HP and cure Poison.' },

  // Chemist
  potion: { name: 'Potion', job: 'chemist', jp: 30, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', flat: 35 }], desc: 'Restore 35 HP.' },
  hiPotion: { name: 'Hi-Potion', job: 'chemist', jp: 120, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', flat: 80 }], desc: 'Restore 80 HP.' },
  antidote: { name: 'Antidote', job: 'chemist', jp: 40, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'cure', statuses: ['poison', 'slow', 'stop'] }], desc: 'Cure Poison, Slow and Stop.' },
  ether: { name: 'Ether', job: 'chemist', jp: 80, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'mpheal', flat: 25 }], desc: 'Restore 25 MP.' },
  phoenixDown: { name: 'Phoenix Down', job: 'chemist', jp: 100, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', deadOnly: true,
    effects: [{ type: 'revive', pct: 0.25 }], desc: 'Revive a fallen ally with 25% HP.' },

  // Knight
  powerBreak: { name: 'Power Break', job: 'knight', jp: 150, mp: 0, range: 'weapon', aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'statmod', stat: 'pa', amount: -2 }], desc: 'Strike and lower target PA by 2.' },
  speedBreak: { name: 'Speed Break', job: 'knight', jp: 200, mp: 0, range: 'weapon', aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'statmod', stat: 'spd', amount: -2 }], desc: 'Strike and lower target Speed by 2.' },
  magicBreak: { name: 'Magick Break', job: 'knight', jp: 150, mp: 0, range: 'weapon', aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'statmod', stat: 'ma', amount: -3 }], desc: 'Strike and lower target MA by 3.' },
  shieldBash: { name: 'Shield Bash', job: 'knight', jp: 250, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 5 }, { type: 'ctmod', amount: -30 }], desc: 'Bash the target and knock 30 off its Charge Time.' },

  // Archer
  aim1: { name: 'Aim +1', job: 'archer', jp: 50, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 40, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 1 }], desc: 'A quick charged shot. Weapon power +1.' },
  aim3: { name: 'Aim +3', job: 'archer', jp: 120, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 25, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 3 }], desc: 'A charged shot. Weapon power +3.' },
  aim5: { name: 'Aim +5', job: 'archer', jp: 250, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 15, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 5 }], desc: 'A long charged shot. Weapon power +5.' },
  arrowRain: { name: 'Arrow Rain', job: 'archer', jp: 200, mp: 0, range: 4, aoe: 1, vert: 6, ct: 30, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }], desc: 'Fire a volley over an area. Ignores height.' },

  // Monk
  waveFist: { name: 'Wave Fist', job: 'monk', jp: 100, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 4 }], desc: 'Punch the air itself to strike at range.' },
  quakeFist: { name: 'Quake Fist', job: 'monk', jp: 180, mp: 0, range: 2, aoe: 1, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }], desc: 'Slam the ground, striking an area.' },
  chakra: { name: 'Chakra', job: 'monk', jp: 150, mp: 0, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'heal', formula: 'pa', power: 4 }, { type: 'mpheal', formula: 'pa', power: 1 }], desc: 'Restore HP and MP to yourself and adjacent allies.' },
  revive: { name: 'Revive', job: 'monk', jp: 250, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'support', affects: 'ally', deadOnly: true,
    effects: [{ type: 'revive', pct: 0.3 }], desc: 'Revive an adjacent fallen ally with 30% HP.' },

  // Thief
  stealGil: { name: 'Steal Gil', job: 'thief', jp: 60, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'gil' }], desc: 'Steal gil equal to 20 x the target\'s level.' },
  poisonBlade: { name: 'Poison Blade', job: 'thief', jp: 120, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }, { type: 'status', status: 'poison', hit: 90 }], desc: 'A weapon strike that inflicts Poison.' },
  mug: { name: 'Mug', job: 'thief', jp: 200, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'gil' }], desc: 'Strike and steal gil in the same motion.' },

  // White Mage
  cure: { name: 'Cure', job: 'whiteMage', jp: 50, mp: 6, range: 4, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 4 }], desc: 'Restore HP to all in the area.' },
  cura: { name: 'Cura', job: 'whiteMage', jp: 180, mp: 12, range: 4, aoe: 1, vert: 3, ct: 18, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 8 }], desc: 'Restore a great deal of HP to all in the area.' },
  raise: { name: 'Raise', job: 'whiteMage', jp: 200, mp: 10, range: 4, aoe: 0, vert: 3, ct: 20, kind: 'magic', affects: 'ally', deadOnly: true,
    effects: [{ type: 'revive', pct: 0.4 }], desc: 'Revive a fallen ally with 40% HP.' },
  protect: { name: 'Protect', job: 'whiteMage', jp: 80, mp: 6, range: 3, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }], desc: 'Grant Protect (physical damage -1/3).' },
  shell: { name: 'Shell', job: 'whiteMage', jp: 80, mp: 6, range: 3, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'status', status: 'shell', hit: 100 }], desc: 'Grant Shell (magical damage -1/3).' },
  regen: { name: 'Regen', job: 'whiteMage', jp: 120, mp: 8, range: 3, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'status', status: 'regen', hit: 100 }], desc: 'Grant Regen (recover HP each turn).' },

  // Black Mage
  fire: { name: 'Fire', job: 'blackMage', jp: 50, mp: 6, range: 4, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 5 }], desc: 'Burn all in the area.' },
  thunder: { name: 'Thunder', job: 'blackMage', jp: 80, mp: 8, range: 4, aoe: 0, vert: 8, ct: 22, kind: 'magic', affects: 'all', element: 'thunder',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }], desc: 'Strike a single target with lightning. Ignores height.' },
  poisonSpell: { name: 'Poison', job: 'blackMage', jp: 80, mp: 4, range: 4, aoe: 1, vert: 3, ct: 30, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'poison', hit: 85 }], desc: 'Inflict Poison on all in the area.' },
  fira: { name: 'Fira', job: 'blackMage', jp: 220, mp: 12, range: 4, aoe: 1, vert: 3, ct: 15, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'A greater fire spell.' },
  flare: { name: 'Flare', job: 'blackMage', jp: 450, mp: 26, range: 4, aoe: 0, vert: 3, ct: 10, kind: 'magic', affects: 'all',
    effects: [{ type: 'damage', formula: 'ma', power: 15 }], desc: 'Annihilate a single target.' },

  // Time Mage
  haste: { name: 'Haste', job: 'timeMage', jp: 100, mp: 8, range: 4, aoe: 1, vert: 3, ct: 20, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'status', status: 'haste', hit: 100 }], desc: 'Grant Haste to all in the area.' },
  slowSpell: { name: 'Slow', job: 'timeMage', jp: 100, mp: 8, range: 4, aoe: 1, vert: 3, ct: 20, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'slow', hit: 85 }], desc: 'Inflict Slow on all in the area.' },
  stopSpell: { name: 'Stop', job: 'timeMage', jp: 250, mp: 12, range: 4, aoe: 0, vert: 3, ct: 15, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'stop', hit: 70 }], desc: 'Freeze a target in time.' },
  quick: { name: 'Quick', job: 'timeMage', jp: 400, mp: 20, range: 4, aoe: 0, vert: 3, ct: 25, kind: 'magic', affects: 'ally', allowSelf: false,
    effects: [{ type: 'ctset', amount: 100 }], desc: 'Set an ally\'s Charge Time to 100 for an immediate turn.' },

  // Ninja
  shuriken: { name: 'Shuriken', job: 'ninja', jp: 60, mp: 0, range: 4, aoe: 0, vert: 4, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 4 }], desc: 'Throw a bladed star.' },
  flameBomb: { name: 'Flame Bomb', job: 'ninja', jp: 150, mp: 0, range: 4, aoe: 1, vert: 4, ct: 0, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }], desc: 'Throw an alchemical bomb that bursts over an area.' },
  smoke: { name: 'Smoke', job: 'ninja', jp: 120, mp: 0, range: 3, aoe: 1, vert: 3, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'status', status: 'slow', hit: 75 }], desc: 'Choking smoke that inflicts Slow.' },

  // Dragoon
  jump: { name: 'Jump', job: 'dragoon', jp: 100, mp: 0, range: 4, aoe: 0, vert: 9, ct: 30, kind: 'physical', affects: 'all', airborne: true,
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.5 }], desc: 'Leap skyward; crash down for 1.5x weapon damage. Untargetable while airborne.' },
  lancet: { name: 'Lancet', job: 'dragoon', jp: 150, mp: 0, range: 'weapon', aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'drain', formula: 'pa', power: 3 }], desc: 'Drain HP from the target.' },
  dragonRoar: { name: 'Dragon Roar', job: 'dragoon', jp: 250, mp: 0, range: 0, aoe: 2, vert: 3, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }], desc: 'A roar that grants Protect to nearby allies.' },

  // Monsters
  tackle: { name: 'Tackle', job: 'goblin', jp: 0, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 6 }], desc: 'A bruising charge.' },
  goblinPunch: { name: 'Goblin Punch', job: 'goblin', jp: 0, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 4 }, { type: 'statmod', stat: 'spd', amount: -1 }], desc: 'Dizzying blow.' },
  bite: { name: 'Bite', job: 'wolf', jp: 0, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 6 }, { type: 'status', status: 'poison', hit: 40 }], desc: 'Fangs that may fester.' },
  howl: { name: 'Howl', job: 'wolf', jp: 0, mp: 0, range: 0, aoe: 2, vert: 3, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'pa', amount: 1 }], desc: 'A rallying howl. Nearby allies PA +1.' },
  spark: { name: 'Spark', job: 'bomb', jp: 0, mp: 4, range: 3, aoe: 0, vert: 4, ct: 0, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 4 }], desc: 'Spit a gout of flame.' },
  selfDestruct: { name: 'Self-Destruct', job: 'bomb', jp: 0, mp: 0, range: 0, aoe: 1, vert: 3, ct: 0, kind: 'magic', affects: 'all', self: true, suicide: true,
    effects: [{ type: 'damage', formula: 'curhp', power: 1 }], desc: 'Explode, dealing damage equal to remaining HP to everything nearby.' },
  nightSword: { name: 'Night Sword', job: 'darkKnight', jp: 0, mp: 8, range: 'weapon', aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'drain', formula: 'pa', power: 6 }], desc: 'A draining slash.' },
  shadowBlade: { name: 'Shadow Blade', job: 'darkKnight', jp: 0, mp: 12, range: 3, aoe: 1, vert: 4, ct: 12, kind: 'magic', affects: 'all',
    effects: [{ type: 'damage', formula: 'ma', power: 6 }], desc: 'Dark energy that sears an area.' },
  darkProtect: { name: 'Umbral Ward', job: 'darkKnight', jp: 0, mp: 10, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }], desc: 'Shroud self in Protect and Shell.' },
};

// ---------------------------------------------------------------------- maps
// heights: rows of digits (y down, x across). terrain: g grass, d dirt,
// s stone, b wood/bridge, w water (impassable), t tree/pillar (impassable),
// x void (not drawn). deploy: player start tiles.
const MAPS = {
  verdant: {
    name: 'Verdant Road', w: 11, h: 11,
    heights: [
      '00000111122',
      '00000011222',
      '00001112222',
      '00011122333',
      '00111233333',
      '01112233444',
      '01122333444',
      '01223334445',
      '11223344455',
      '12233444555',
      '12334445556',
    ],
    terrain: [
      'gggggggggss',
      'gggdddgggss',
      'ggddddgggss',
      'ggddgggggss',
      'gggggggsssg',
      'ggtgggsssgg',
      'ggggggssggg',
      'gggggsssggt',
      'ggggsssgggg',
      'gggsssggggg',
      'ggssgggggtg',
    ],
    deploy: [[1, 1], [2, 1], [1, 2], [2, 2], [3, 1]],
  },
  millbrook: {
    name: 'Millbrook Bridge', w: 12, h: 10,
    heights: [
      '222211112222',
      '222211112222',
      '221111111222',
      '211100011122',
      '211100001112',
      '221100001112',
      '222110011222',
      '222211112222',
      '223322223332',
      '233333333332',
    ],
    terrain: [
      'ggggggggggdd',
      'ggggggggggdd',
      'ggggggggggdd',
      'gggwwwbwwwgg',
      'gggwwwbwwwgg',
      'gggwwwbwwwgg',
      'ggggwwbwwggg',
      'ggggggggggtg',
      'gggsssgggsgg',
      'ggssssgsssgg',
    ],
    deploy: [[5, 9], [6, 9], [4, 9], [7, 9], [5, 8]],
  },
  hollowmere: {
    name: 'Hollowmere Ruins', w: 12, h: 12,
    heights: [
      '111111111111',
      '133311112331',
      '133311112331',
      '111111111111',
      '111222222111',
      '111244442111',
      '111244442111',
      '111222222111',
      '111111111111',
      '133311112331',
      '133311112331',
      '111111111111',
    ],
    terrain: [
      'ssssssssssss',
      'sssssddsssss',
      'ssttsddsstss',
      'ssssdddddsss',
      'sssssssssdss',
      'sssstssssdss',
      'sssssssstsss',
      'sssssssssdss',
      'sssdddddssss',
      'ssttsddsstss',
      'sssssddsssss',
      'ssssssssssss',
    ],
    deploy: [[5, 11], [6, 11], [4, 11], [7, 11], [5, 10]],
  },
  sable: {
    name: 'Sable Marsh', w: 12, h: 12,
    heights: [
      '111111100000',
      '111110000000',
      '111100000011',
      '110000001111',
      '100000011112',
      '100001111222',
      '000011112222',
      '000111122223',
      '001111222333',
      '011112223333',
      '111122233333',
      '111222333334',
    ],
    terrain: [
      'ddddddwwwwww',
      'dddddwwwwwww',
      'ddddwwwdwwdd',
      'ddwwdwwddddd',
      'dwwwddwddddd',
      'dwwdddddtddd',
      'wwwdddddgggg',
      'wwdddddggggg',
      'wddddgggtggg',
      'dddddggggggg',
      'ddddgggggggg',
      'dddggggggggg',
    ],
    deploy: [[9, 10], [10, 10], [8, 10], [9, 9], [10, 9]],
  },
  dunmarch: {
    name: 'Dunmarch Gate', w: 12, h: 12,
    heights: [
      '666666666666',
      '666666666666',
      '644444444446',
      '644444444446',
      '211112211112',
      '111111111111',
      '111111111111',
      '011100000110',
      '000000000000',
      '000000000000',
      '000000000000',
      '000000000000',
    ],
    terrain: [
      'ssssssssssss',
      'sssssttsssss',
      'ssssssssssss',
      'ssssssssssss',
      'sssssbbsssss',
      'gggggssggggg',
      'gggggssggggg',
      'gtgggssgggtg',
      'gggggddggggg',
      'gggggddggggg',
      'gggggddggggg',
      'gggggddggggg',
    ],
    deploy: [[5, 11], [6, 11], [4, 11], [7, 11], [5, 10]],
  },
  ashen: {
    name: 'Ashen Ridge', w: 12, h: 11,
    heights: [
      '555444333222',
      '554443332221',
      '544433322211',
      '444333222111',
      '443332221110',
      '433322211100',
      '333222111000',
      '332221110000',
      '322211100000',
      '222111000000',
      '221110000000',
    ],
    terrain: [
      'ssssssssssss',
      'sssstsssssss',
      'ssssssssssdd',
      'sssssssssddd',
      'ssssssssdddd',
      'sssstsstdddd',
      'ssssssddddgg',
      'sssssddddggg',
      'ssssddddgggg',
      'sssdddtggggg',
      'ssddddgggggg',
    ],
    deploy: [[10, 9], [11, 9], [9, 9], [10, 10], [9, 10]],
  },
  thornwall: {
    name: 'Thornwall Cathedral', w: 13, h: 13,
    heights: [
      '3333333333333',
      '3111111111113',
      '3111555551113',
      '3111533351113',
      '3111533351113',
      '3111555551113',
      '3111111111113',
      '3111111111113',
      '3115111115113',
      '3115111115113',
      '3111111111113',
      '3111111111113',
      '3333333333333',
    ],
    terrain: [
      'sssssssssssss',
      'sssssssssssss',
      'sssssssssssss',
      'sssssbbbsssss',
      'sssssbbbsssss',
      'sssssssssssss',
      'ssssssssttsss',
      'sstssssssssss',
      'sssbssssssbss',
      'sssbssssssbss',
      'sssssssssssss',
      'sssssssssssss',
      'sssssssssssss',
    ],
    deploy: [[6, 11], [5, 11], [7, 11], [6, 10], [5, 10]],
  },
};

// ------------------------------------------------------------------ campaign
const CAMPAIGN = [
  {
    id: 'ch1', title: 'Ambush on the Verdant Road', map: 'verdant',
    intro: [
      'Elderon bleeds. Two princes claim one crown, and the roads between their armies belong to no one.',
      'Rowan Aldric, youngest son of a house that chose the wrong prince, rides north with his few remaining companions.',
      'Bandits watch the Verdant Road. They do not know whose colors Rowan wears. They do not care.',
      '"Mira, stay behind Garret. If they want a fight, we give them one."',
    ],
    enemies: [
      { job: 'squire', level: 1, x: 8, y: 2, name: 'Bandit' },
      { job: 'squire', level: 1, x: 9, y: 4, name: 'Bandit' },
      { job: 'archer', level: 1, x: 9, y: 1, name: 'Bandit Archer' },
    ],
    gil: 250,
    outro: ['The bandits scatter into the hills. Rowan wipes his blade and looks north, where smoke rises over Millbrook.'],
  },
  {
    id: 'ch2', title: 'The Wolves of Millbrook', map: 'millbrook',
    intro: [
      'Millbrook has been abandoned. Its mill wheel turns for no one.',
      'Goblins nest in the mill now, and their wolves have found the scent of travelers on the bridge.',
      '"Hold the bridge," Garret says. "Let them come to us one at a time."',
    ],
    enemies: [
      { job: 'goblin', level: 2, x: 2, y: 1 },
      { job: 'goblin', level: 2, x: 9, y: 1 },
      { job: 'wolf', level: 2, x: 6, y: 0 },
      { job: 'wolf', level: 2, x: 4, y: 2 },
    ],
    gil: 350,
    recruit: { name: 'Lysa', job: 'chemist', level: 2 },
    outro: [
      'In the mill, a young woman hides among the sacks with a satchel of potions and a look of pure defiance.',
      '"Lysa," she says. "I was the village apothecary. There is no village any more, so I suppose I am yours."',
      'Lysa the Chemist joins the party!',
    ],
  },
  {
    id: 'ch3', title: 'Hollowmere Ruins', map: 'hollowmere',
    intro: [
      'The ruins of Hollowmere were a temple once. Now they shelter deserters from Prince Aldous\'s army.',
      'Deserters with steel and training, who have decided the Aldric name is worth a bounty.',
      '"They hold the high ground in the center," Mira warns. "Take the flanks first."',
    ],
    enemies: [
      { job: 'knight', level: 3, x: 5, y: 5, name: 'Deserter Knight' },
      { job: 'archer', level: 3, x: 6, y: 5, name: 'Deserter Archer' },
      { job: 'chemist', level: 3, x: 2, y: 1, name: 'Deserter Medic' },
      { job: 'squire', level: 3, x: 9, y: 1, name: 'Deserter' },
      { job: 'squire', level: 3, x: 9, y: 8, name: 'Deserter' },
    ],
    gil: 450,
    recruit: { name: 'Kael', job: 'archer', level: 3 },
    outro: [
      'One of the deserters throws down his bow and kneels. "I served your father at Redwater. I would rather serve his son than a prince who leaves his own men to starve."',
      'Kael the Archer joins the party!',
    ],
  },
  {
    id: 'ch4', title: 'Sable Marsh', map: 'sable',
    intro: [
      'The marsh road is the only way east that avoids the royal checkpoints.',
      'It is also where the Sable Coven trades curses for coin, and someone has paid them handsomely.',
      '"Mages," Lysa says. "Their spells take time to charge. Close the distance before they finish."',
    ],
    enemies: [
      { job: 'blackMage', level: 4, x: 2, y: 2, name: 'Coven Mage' },
      { job: 'blackMage', level: 4, x: 4, y: 3, name: 'Coven Mage' },
      { job: 'thief', level: 4, x: 3, y: 5, name: 'Coven Cutpurse' },
      { job: 'wolf', level: 4, x: 7, y: 2 },
      { job: 'wolf', level: 4, x: 1, y: 8 },
    ],
    gil: 600,
    outro: ['The last mage sinks beneath the black water. On her body: a sealed letter bearing the crest of Ser Brannoc, Captain of Dunmarch.'],
  },
  {
    id: 'ch5', title: 'The Gates of Dunmarch', map: 'dunmarch',
    intro: [
      'Ser Brannoc was Rowan\'s father\'s sworn brother. Now he hunts the Aldric line for Prince Aldous.',
      'His garrison holds the gate of Dunmarch. Archers on the wall, knights in the courtyard.',
      '"We do not need to take the keep," Rowan says. "Only the gate. Then we make Brannoc answer for that letter."',
    ],
    enemies: [
      { job: 'knight', level: 5, x: 5, y: 5, name: 'Gate Knight' },
      { job: 'knight', level: 5, x: 6, y: 6, name: 'Gate Knight' },
      { job: 'archer', level: 5, x: 3, y: 2, name: 'Wall Archer' },
      { job: 'archer', level: 5, x: 8, y: 2, name: 'Wall Archer' },
      { job: 'whiteMage', level: 5, x: 6, y: 3, name: 'Garrison Priest' },
    ],
    gil: 800,
    recruit: { name: 'Tamsin', job: 'whiteMage', level: 5 },
    outro: [
      'The garrison priest lowers her staff. "Brannoc rode for Thornwall at dawn. He fears you, Aldric. He fears what your father knew."',
      '"Then I will heal your wounded on the way. I am done taking his orders."',
      'Tamsin the White Mage joins the party!',
    ],
  },
  {
    id: 'ch6', title: 'Ashen Ridge', map: 'ashen',
    intro: [
      'The road to Thornwall climbs the Ashen Ridge, where the old volcano still breathes.',
      'Bombs drift between the vents. Goblins have learned to herd them toward travelers.',
      '"Do not let the bombs get close," Kael warns. "When they are hurt, they explode."',
    ],
    enemies: [
      { job: 'bomb', level: 6, x: 3, y: 3 },
      { job: 'bomb', level: 6, x: 6, y: 2 },
      { job: 'bomb', level: 6, x: 2, y: 6 },
      { job: 'goblin', level: 6, x: 1, y: 1 },
      { job: 'goblin', level: 6, x: 5, y: 5 },
      { job: 'monk', level: 6, x: 0, y: 3, name: 'Ridge Hermit' },
    ],
    gil: 900,
    outro: ['Below the ridge, Thornwall Cathedral rises from the fog. A single black banner hangs from its spire.'],
  },
  {
    id: 'ch7', title: 'Thornwall Cathedral', map: 'thornwall',
    intro: [
      'Ser Brannoc waits at the altar in armor that has forgotten its colors.',
      '"Your father learned that the princes are puppets, boy. That the war is a harvest. He would have told the realm."',
      '"So I killed him. And now I will kill you, and Elderon can go on burning in peace."',
      'Rowan draws his sword. "Not today, Ser."',
    ],
    enemies: [
      { job: 'darkKnight', level: 9, x: 6, y: 3, name: 'Ser Brannoc', boss: true,
        passives: ['counter', 'attackUp', 'movePlus1'] },
      { job: 'knight', level: 7, x: 4, y: 4, name: 'Black Guard' },
      { job: 'knight', level: 7, x: 8, y: 4, name: 'Black Guard' },
      { job: 'timeMage', level: 7, x: 6, y: 1, name: 'Chronomancer', passives: ['halfMp', 'regenerator'] },
      { job: 'archer', level: 7, x: 3, y: 8, name: 'Black Guard Archer' },
      { job: 'ninja', level: 7, x: 10, y: 8, name: 'Brannoc\'s Shadow' },
    ],
    gil: 2000,
    outro: [
      'Brannoc falls before the altar. In his hand, the last letter: proof of who truly fed the war between the princes.',
      'Rowan takes it. The road ahead is longer than the one behind. But for the first time, he knows where it leads.',
      '--- THE END (for now). Keep training and replay battles at your leisure. ---',
    ],
    final: true,
  },
];

// Party at the start of a new game.
const STARTING_PARTY = [
  { name: 'Rowan', job: 'squire', level: 1, leader: true },
  { name: 'Garret', job: 'squire', level: 1 },
  { name: 'Mira', job: 'chemist', level: 1 },
];

// Enemy pools for random training battles.
const TRAINING_POOL = [
  ['squire', 'squire', 'archer'],
  ['goblin', 'goblin', 'wolf', 'wolf'],
  ['knight', 'chemist', 'archer', 'squire'],
  ['blackMage', 'thief', 'wolf', 'squire'],
  ['knight', 'whiteMage', 'archer', 'monk'],
  ['bomb', 'bomb', 'goblin', 'goblin'],
  ['ninja', 'timeMage', 'knight', 'dragoon'],
];

// ============================================================================
// Equipment
// ============================================================================
// Weapon types: knife sword axe spear bow staff rod fist ninjablade
// Armor types:  cloth light heavy robe   Head types: hat helm
// Slots: weapon, offhand, head, body, acc

const JOB_EQUIP = {
  squire:    { w: ['sword', 'knife', 'axe'], a: ['light', 'heavy', 'cloth'], head: ['hat', 'helm'], shield: true },
  chemist:   { w: ['knife', 'rod'], a: ['cloth', 'robe'], head: ['hat'], shield: false },
  knight:    { w: ['sword', 'axe', 'spear'], a: ['heavy', 'light', 'cloth'], head: ['helm', 'hat'], shield: true },
  archer:    { w: ['bow', 'knife'], a: ['light', 'cloth'], head: ['hat', 'helm'], shield: false },
  monk:      { w: ['fist'], a: ['light', 'cloth'], head: ['hat'], shield: false },
  thief:     { w: ['knife', 'sword'], a: ['light', 'cloth'], head: ['hat'], shield: false },
  whiteMage: { w: ['staff', 'rod'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  blackMage: { w: ['rod', 'staff'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  timeMage:  { w: ['staff', 'rod'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  ninja:     { w: ['ninjablade', 'knife'], a: ['light', 'cloth'], head: ['hat'], shield: false, dual: true },
  dragoon:   { w: ['spear', 'sword'], a: ['heavy', 'light', 'cloth'], head: ['helm', 'hat'], shield: true },
};

// tier: shop stock unlocks at that chapter index. price 0 = starter kit, cannot be sold.
const ITEMS = {
  // ---- weapons ----
  shortSword:  { name: 'Short Sword', slot: 'weapon', wtype: 'sword', power: 5, range: 1, vert: 2, price: 0, tier: 0 },
  broadsword:  { name: 'Broadsword', slot: 'weapon', wtype: 'sword', power: 8, range: 1, vert: 2, price: 400, tier: 1 },
  longsword:   { name: 'Longsword', slot: 'weapon', wtype: 'sword', power: 11, range: 1, vert: 2, price: 900, tier: 3 },
  runeBlade:   { name: 'Rune Blade', slot: 'weapon', wtype: 'sword', power: 14, range: 1, vert: 2, ma: 3, price: 1800, tier: 5 },
  dagger:      { name: 'Dagger', slot: 'weapon', wtype: 'knife', power: 4, range: 1, vert: 2, spd: 1, price: 0, tier: 0 },
  mainGauche:  { name: 'Main Gauche', slot: 'weapon', wtype: 'knife', power: 6, range: 1, vert: 2, evade: 8, price: 380, tier: 1 },
  assassinDagger: { name: 'Assassin Dagger', slot: 'weapon', wtype: 'knife', power: 9, range: 1, vert: 2, spd: 2, price: 1600, tier: 4 },
  battleAxe:   { name: 'Battle Axe', slot: 'weapon', wtype: 'axe', power: 10, range: 1, vert: 2, price: 550, tier: 2 },
  warAxe:      { name: 'War Axe', slot: 'weapon', wtype: 'axe', power: 14, range: 1, vert: 2, spd: -1, price: 1400, tier: 4 },
  spear:       { name: 'Spear', slot: 'weapon', wtype: 'spear', power: 6, range: 2, vert: 3, price: 0, tier: 0 },
  partisan:    { name: 'Partisan', slot: 'weapon', wtype: 'spear', power: 9, range: 2, vert: 3, price: 700, tier: 2 },
  dragonLance: { name: 'Dragon Lance', slot: 'weapon', wtype: 'spear', power: 13, range: 2, vert: 3, jump: 1, price: 1900, tier: 5 },
  shortbow:    { name: 'Shortbow', slot: 'weapon', wtype: 'bow', power: 4, range: 4, vert: 5, price: 0, tier: 0 },
  longbow:     { name: 'Longbow', slot: 'weapon', wtype: 'bow', power: 6, range: 5, vert: 6, price: 600, tier: 2 },
  yoichiBow:   { name: 'Yoichi Bow', slot: 'weapon', wtype: 'bow', power: 9, range: 6, vert: 8, price: 1700, tier: 5 },
  staff:       { name: 'Staff', slot: 'weapon', wtype: 'staff', power: 3, range: 1, vert: 2, ma: 1, price: 0, tier: 0 },
  healingStaff: { name: 'Healing Staff', slot: 'weapon', wtype: 'staff', power: 4, range: 1, vert: 2, ma: 4, price: 650, tier: 2 },
  sageStaff:   { name: 'Sage Staff', slot: 'weapon', wtype: 'staff', power: 5, range: 1, vert: 2, ma: 7, mp: 20, price: 1800, tier: 5 },
  rod:         { name: 'Rod', slot: 'weapon', wtype: 'rod', power: 3, range: 1, vert: 2, ma: 2, price: 0, tier: 0 },
  flameRod:    { name: 'Flame Rod', slot: 'weapon', wtype: 'rod', power: 5, range: 1, vert: 2, ma: 5, price: 700, tier: 2 },
  voidRod:     { name: 'Void Rod', slot: 'weapon', wtype: 'rod', power: 6, range: 1, vert: 2, ma: 9, price: 1900, tier: 5 },
  cesti:       { name: 'Cesti', slot: 'weapon', wtype: 'fist', power: 6, range: 1, vert: 3, price: 0, tier: 0 },
  ironKnuckle: { name: 'Iron Knuckle', slot: 'weapon', wtype: 'fist', power: 10, range: 1, vert: 3, pa: 1, price: 800, tier: 3 },
  godHand:     { name: 'God Hand', slot: 'weapon', wtype: 'fist', power: 14, range: 1, vert: 3, pa: 3, price: 2000, tier: 5 },
  kunai:       { name: 'Kunai', slot: 'weapon', wtype: 'ninjablade', power: 5, range: 1, vert: 2, spd: 1, price: 0, tier: 0 },
  ninjaBlade:  { name: 'Ninja Blade', slot: 'weapon', wtype: 'ninjablade', power: 8, range: 1, vert: 2, spd: 1, price: 1200, tier: 4 },
  murasame:    { name: 'Murasame', slot: 'weapon', wtype: 'ninjablade', power: 11, range: 1, vert: 2, spd: 2, price: 2200, tier: 6 },

  // ---- offhand ----
  buckler:     { name: 'Buckler', slot: 'offhand', otype: 'shield', evade: 12, price: 300, tier: 1 },
  kiteShield:  { name: 'Kite Shield', slot: 'offhand', otype: 'shield', evade: 18, hp: 15, price: 800, tier: 3 },
  aegisShield: { name: 'Aegis Shield', slot: 'offhand', otype: 'shield', evade: 26, hp: 25, price: 1800, tier: 5 },

  // ---- head ----
  leatherCap:  { name: 'Leather Cap', slot: 'head', htype: 'hat', hp: 10, price: 150, tier: 0 },
  featherHat:  { name: 'Feather Hat', slot: 'head', htype: 'hat', hp: 12, spd: 1, price: 500, tier: 2 },
  wizardHat:   { name: 'Wizard Hat', slot: 'head', htype: 'hat', mp: 20, ma: 1, price: 550, tier: 2 },
  ribbon:      { name: 'Ribbon', slot: 'head', htype: 'hat', hp: 20, mp: 20, ma: 2, spd: 1, price: 2400, tier: 6 },
  ironHelm:    { name: 'Iron Helm', slot: 'head', htype: 'helm', hp: 28, price: 450, tier: 1 },
  goldenHelm:  { name: 'Golden Helm', slot: 'head', htype: 'helm', hp: 50, mp: 8, price: 1300, tier: 4 },

  // ---- body ----
  clothes:     { name: 'Clothes', slot: 'body', atype: 'cloth', hp: 10, price: 0, tier: 0 },
  leatherArmor:{ name: 'Leather Armor', slot: 'body', atype: 'light', hp: 28, price: 350, tier: 1 },
  chainMail:   { name: 'Chain Mail', slot: 'body', atype: 'light', hp: 48, price: 850, tier: 3 },
  plateMail:   { name: 'Plate Mail', slot: 'body', atype: 'heavy', hp: 75, spd: -1, price: 1500, tier: 4 },
  crystalMail: { name: 'Crystal Mail', slot: 'body', atype: 'heavy', hp: 100, mp: 10, price: 2400, tier: 6 },
  silkRobe:    { name: 'Silk Robe', slot: 'body', atype: 'robe', hp: 18, mp: 20, price: 400, tier: 1 },
  wizardRobe:  { name: 'Wizard Robe', slot: 'body', atype: 'robe', hp: 30, mp: 40, ma: 1, price: 1100, tier: 3 },
  robeOfLords: { name: 'Robe of Lords', slot: 'body', atype: 'robe', hp: 55, mp: 55, ma: 3, price: 2400, tier: 6 },

  // ---- accessory ----
  leatherBoots:{ name: 'Leather Boots', slot: 'acc', move: 1, price: 400, tier: 1 },
  wingedBoots: { name: 'Winged Boots', slot: 'acc', jump: 2, price: 500, tier: 2 },
  sprintShoes: { name: 'Sprint Shoes', slot: 'acc', move: 1, spd: 1, price: 1200, tier: 4 },
  powerGlove:  { name: 'Power Glove', slot: 'acc', pa: 2, price: 900, tier: 3 },
  magickRing:  { name: 'Magick Ring', slot: 'acc', ma: 2, price: 900, tier: 3 },
  guardianRing:{ name: 'Guardian Ring', slot: 'acc', hp: 30, price: 700, tier: 2 },
  reflexBracer:{ name: 'Reflex Bracer', slot: 'acc', evade: 12, price: 800, tier: 3 },
  chronoAmulet:{ name: 'Chrono Amulet', slot: 'acc', spd: 2, price: 2000, tier: 5 },
};

// Free starting kit per job (price-0 items only, so they cannot be sold for gil).
const STARTER_GEAR = {
  squire:    { weapon: 'shortSword', body: 'clothes' },
  chemist:   { weapon: 'dagger', body: 'clothes' },
  knight:    { weapon: 'shortSword', body: 'clothes' },
  archer:    { weapon: 'shortbow', body: 'clothes' },
  monk:      { weapon: 'cesti', body: 'clothes' },
  thief:     { weapon: 'dagger', body: 'clothes' },
  whiteMage: { weapon: 'staff', body: 'clothes' },
  blackMage: { weapon: 'rod', body: 'clothes' },
  timeMage:  { weapon: 'staff', body: 'clothes' },
  ninja:     { weapon: 'kunai', body: 'clothes' },
  dragoon:   { weapon: 'spear', body: 'clothes' },
};

const SLOT_NAMES = { weapon: 'Weapon', offhand: 'Offhand', head: 'Head', body: 'Body', acc: 'Accessory' };
const GEAR_STATS = ['hp', 'mp', 'pa', 'ma', 'spd', 'move', 'jump', 'evade'];

// Can `job` equip item `id` at all? `extra` adds permissions granted elsewhere,
// such as the Equip Armor support ability.
function canEquip(job, id, extra) {
  const it = ITEMS[id], eq = JOB_EQUIP[job];
  if (!it || !eq) return false;
  const w = extra ? eq.w.concat(extra.w || []) : eq.w;
  const a = extra ? eq.a.concat(extra.a || []) : eq.a;
  const head = extra ? eq.head.concat(extra.head || []) : eq.head;
  if (it.slot === 'weapon') return w.includes(it.wtype);
  if (it.slot === 'offhand') return !!eq.shield;
  if (it.slot === 'head') return head.includes(it.htype);
  if (it.slot === 'body') return a.includes(it.atype);
  return true; // accessories fit anyone
}

// Can `job` equip item `id` into `slot`? Dual wielders may hold a second weapon
// in the offhand instead of a shield.
function canEquipInSlot(job, id, slot, extra) {
  const it = ITEMS[id], eq = JOB_EQUIP[job];
  if (!it || !eq) return false;
  if (slot === 'offhand' && it.slot === 'weapon') return !!eq.dual && canEquip(job, id, extra);
  return it.slot === slot && canEquip(job, id, extra);
}

// Every item id this job could put in the slot, from a pool of ids.
function itemsForSlot(job, slot, ids, extra) {
  return (ids || Object.keys(ITEMS)).filter(id => canEquipInSlot(job, id, slot, extra));
}

// How much a piece of gear is worth to a given job. Used by the enemy loadout
// generator and by the player's Optimize button.
function gearScore(job, id) {
  const it = ITEMS[id], j = JOBS[job];
  if (!it || !j) return 0;
  const physical = j.pa >= j.ma;
  let s = 0;
  if (it.slot === 'weapon' || it.otype !== 'shield') {
    // Weapon power drives the damage formula for the job's main stat.
    s += (it.power || 0) * 6;
    s += Math.max(0, (it.range || 1) - 1) * 4;
    // A job's signature weapon type is what its abilities are built around.
    if (it.wtype && JOB_EQUIP[job] && it.wtype === JOB_EQUIP[job].w[0]) s += 25;
  }
  s += (it.pa || 0) * (physical ? 14 : 5);
  s += (it.ma || 0) * (physical ? 5 : 14);
  s += (it.hp || 0) * 0.35;
  s += (it.mp || 0) * (physical ? 0.1 : 0.3);
  s += (it.spd || 0) * 10;
  s += (it.move || 0) * 8;
  s += (it.jump || 0) * 3;
  s += (it.evade || 0) * 0.5;
  return s;
}

// The best loadout for a job from a pool of item ids (defaults to everything up
// to `maxTier`). Returns a gear object; slots with nothing available are absent.
function bestGearFor(job, pool, maxTier, extra) {
  const eq = JOB_EQUIP[job];
  if (!eq) return {};
  const ids = pool || Object.keys(ITEMS).filter(i => ITEMS[i].tier <= (maxTier === undefined ? 6 : maxTier));
  const gear = {};
  const used = {};
  for (const slot of ['weapon', 'offhand', 'head', 'body', 'acc']) {
    let best = null, bestScore = 0;
    for (const id of ids) {
      if (!canEquipInSlot(job, id, slot, extra)) continue;
      // The same single item cannot fill two slots.
      if (used[id] && (pool || []).filter(p => p === id).length <= used[id]) continue;
      const sc = gearScore(job, id);
      if (sc > bestScore) { bestScore = sc; best = id; }
    }
    if (best) { gear[slot] = best; used[best] = (used[best] || 0) + 1; }
  }
  return gear;
}

// Items an enemy of the given job and level carries, so foes scale with the party.
function enemyGearFor(job, level) {
  return bestGearFor(job, null, Math.max(0, Math.min(6, Math.floor(level / 1.6))));
}

// ============================================================================
// Passive abilities: reaction, support and movement
// ============================================================================
// Learned with JP inside a job, but once learned they can be equipped no matter
// which job the unit is currently wearing. One of each kind at a time.

const PASSIVES = {
  // ---- reaction: triggered when something happens to the unit ----
  counter: { name: 'Counter', kind: 'reaction', job: 'monk', jp: 250,
    desc: 'Strike back when an adjacent foe damages you with a physical attack.' },
  autoPotion: { name: 'Auto-Potion', kind: 'reaction', job: 'chemist', jp: 180,
    desc: 'Drink a potion for 35 HP whenever you take damage.' },
  parry: { name: 'Parry', kind: 'reaction', job: 'knight', jp: 250,
    desc: '35% chance to turn aside a physical attack entirely.' },
  absorbMp: { name: 'Absorb MP', kind: 'reaction', job: 'blackMage', jp: 200,
    desc: 'Recover 10 MP whenever magick damages you.' },
  regenerator: { name: 'Regenerator', kind: 'reaction', job: 'whiteMage', jp: 220,
    desc: 'Gain Regen the first time you are damaged in a battle.' },
  vengeance: { name: 'Vengeance', kind: 'reaction', job: 'dragoon', jp: 260,
    desc: 'Physical Attack rises by 1 each time you are damaged.' },

  // ---- support: always-on modifiers ----
  attackUp: { name: 'Attack Up', kind: 'support', job: 'knight', jp: 300,
    desc: 'Physical damage you deal rises by 25%.' },
  magickUp: { name: 'Magick Up', kind: 'support', job: 'blackMage', jp: 300,
    desc: 'Magickal damage you deal rises by 25%.' },
  defend: { name: 'Defend', kind: 'support', job: 'squire', jp: 250,
    desc: 'Physical damage you take falls by 20%.' },
  halfMp: { name: 'Halve MP', kind: 'support', job: 'timeMage', jp: 320,
    desc: 'Spells cost half as much MP.' },
  twoHands: { name: 'Two Hands', kind: 'support', job: 'knight', jp: 350,
    desc: 'Grip your weapon with both hands for 50% more weapon power. The offhand must be empty.' },
  concentrate: { name: 'Concentrate', kind: 'support', job: 'archer', jp: 320,
    desc: 'Your physical attacks ignore evasion entirely.' },
  equipArmor: { name: 'Equip Armor', kind: 'support', job: 'whiteMage', jp: 280,
    desc: 'Wear light and heavy armor whatever your job.' },
  martialArts: { name: 'Martial Arts', kind: 'support', job: 'monk', jp: 260,
    desc: 'Fist weapons strike for 50% more power.' },

  // ---- movement: how the unit gets around ----
  movePlus1: { name: 'Move +1', kind: 'movement', job: 'thief', jp: 220,
    desc: 'Move one extra tile.' },
  movePlus2: { name: 'Move +2', kind: 'movement', job: 'ninja', jp: 400,
    desc: 'Move two extra tiles.' },
  jumpPlus2: { name: 'Jump +2', kind: 'movement', job: 'dragoon', jp: 220,
    desc: 'Climb two levels higher.' },
  sureFooting: { name: 'Sure Footing', kind: 'movement', job: 'ninja', jp: 320,
    desc: 'Height no longer limits where you can step.' },
  moveHpUp: { name: 'Move-HP-Up', kind: 'movement', job: 'monk', jp: 240,
    desc: 'Recover a tenth of your HP whenever you move.' },
  moveFindItem: { name: 'Treasure Hunter', kind: 'movement', job: 'thief', jp: 300,
    desc: 'Turn up 25 gil each time you move.' },
};

const PASSIVE_KINDS = { reaction: 'Reaction', support: 'Support', movement: 'Movement' };

// The passives taught by a given job, in JP order.
function passivesOfJob(job) {
  return Object.keys(PASSIVES).filter(id => PASSIVES[id].job === job).sort((a, b) => PASSIVES[a].jp - PASSIVES[b].jp);
}

// Extra equip permissions granted by support abilities.
function passiveEquipBonus(unit) {
  const extra = { w: [], a: [], head: [] };
  if (unit.hasPassive('equipArmor')) { extra.a.push('light', 'heavy'); extra.head.push('helm'); }
  return extra;
}
