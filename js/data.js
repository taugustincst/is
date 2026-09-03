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
    twoSwords: true,
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
      { job: 'darkKnight', level: 9, x: 6, y: 3, name: 'Ser Brannoc', boss: true },
      { job: 'knight', level: 7, x: 4, y: 4, name: 'Black Guard' },
      { job: 'knight', level: 7, x: 8, y: 4, name: 'Black Guard' },
      { job: 'timeMage', level: 7, x: 6, y: 1, name: 'Chronomancer' },
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
