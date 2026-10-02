/* ==========================================================================
   Chronicles of Elderon — game data
   Jobs, abilities, statuses, maps and the campaign script.
   ========================================================================== */

// ---------------------------------------------------------------- SP tiers
// Total SP earned in a job determines its job level (used for unlocks).
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
  haste:   { name: 'Haste',   dur: 48, bad: false, color: '#ffd84a', desc: 'Tempo fills 50% faster.' },
  slow:    { name: 'Slow',    dur: 48, bad: true,  color: '#7f8fb5', desc: 'Tempo fills 50% slower.' },
  stop:    { name: 'Stop',    dur: 24, bad: true,  color: '#c2c2c2', desc: 'Cannot act or gain Tempo.' },
  protect: { name: 'Protect', dur: 60, bad: false, color: '#f0a050', desc: 'Physical damage reduced by 1/3.' },
  shell:   { name: 'Barrier',   dur: 60, bad: false, color: '#50b0f0', desc: 'Magical damage reduced by 1/3.' },
  silence: { name: 'Silence', dur: 48, bad: true,  color: '#8f8fa8', desc: 'Cannot use anything that costs MP.' },
  blind:   { name: 'Blind',   dur: 48, bad: true,  color: '#4a4a5a', desc: 'Physical attacks are half as likely to land.' },
  berserk: { name: 'Berserk', dur: 36, bad: true,  color: '#e05a3a', desc: 'Attacks the nearest foe unbidden, for half again the damage.' },
  reraise: { name: 'Second Breath', dur: 72, bad: false, color: '#ffe0a0', desc: 'Rises again with a quarter of max HP the first time it falls.' },
};

// ------------------------------------------------------------------- elements
// An attack carrying an element is scaled by the target's affinity for it.
// Affinities come from what a creature is and from what it wears.
const ELEMENTS = {
  fire:    { name: 'Fire', color: '#ff7a30' },
  ice:     { name: 'Ice', color: '#7fd8ff' },
  thunder: { name: 'Thunder', color: '#ffe040' },
  earth:   { name: 'Earth', color: '#c08a4a' },
  holy:    { name: 'Holy', color: '#fff3b0' },
  dark:    { name: 'Dark', color: '#a05fd6' },
  water:   { name: 'Water', color: '#4fa8e8' },
};

// Multipliers. Absorb turns the damage into healing.
const AFFINITY = { weak: 1.5, resist: 0.5, immune: 0, absorb: -1 };

// A one-word label for the prediction panel.
function affinityLabel(mult) {
  if (mult < 0) return 'absorbs';
  if (mult === 0) return 'immune';
  if (mult > 1) return 'weak';
  if (mult < 1) return 'resists';
  return '';
}

// ---------------------------------------------------------------------- jobs
// Stat multipliers are applied to a level-based baseline (see unit.js).
const JOBS = {
  squire: {
    name: 'Footman', skillset: 'Fundamentals', kind: 'human', sprite: 'warrior',
    palette: { h: '#5a3a1e', c: '#8a7a55', p: '#4b3d2c', b: '#3a2a1a' },
    hp: 1.0, mp: 1.0, pa: 1.0, ma: 1.0, spd: 1.0, move: 4, jump: 3, evade: 8,
    weapon: { name: 'Short Sword', power: 5, range: 1, vert: 2 },
    abilities: ['throwStone', 'accumulate', 'yell', 'firstAid', 'dustKick', 'holdGround'],
    req: {}, desc: 'A well-rounded recruit. The root of the warrior path.',
  },
  chemist: {
    name: 'Apothecary', skillset: 'Items', kind: 'human', sprite: 'warrior',
    palette: { h: '#2a2a2a', c: '#e8e0c8', p: '#6b5b40', b: '#3a2a1a' },
    hp: 0.85, mp: 1.1, pa: 0.9, ma: 1.05, spd: 1.05, move: 3, jump: 3, evade: 6,
    weapon: { name: 'Knife', power: 4, range: 1, vert: 2 },
    abilities: ['potion', 'hiPotion', 'antidote', 'ether', 'remedy', 'phoenixDown', 'xPotion', 'echoHerbs'],
    req: {}, desc: 'Field medic who uses items. The root of the mage path.',
  },
  knight: {
    name: 'Knight', skillset: 'Arts of War', kind: 'human', sprite: 'heavy',
    palette: { h: '#c9a24a', c: '#8892a8', p: '#3a4256', b: '#2a2a3a' },
    hp: 1.25, mp: 0.8, pa: 1.2, ma: 0.8, spd: 0.95, move: 3, jump: 3, evade: 10,
    weapon: { name: 'Broadsword', power: 6, range: 1, vert: 2 },
    abilities: ['powerBreak', 'speedBreak', 'magicBreak', 'shieldBash', 'sunder', 'cleave'],
    req: { squire: 2 }, desc: 'Heavy armor and a heavy blade. Cripples foes with Breaks.',
  },
  archer: {
    name: 'Archer', skillset: 'Aim', kind: 'human', sprite: 'rogue',
    palette: { h: '#7a4a2a', c: '#4f7a3f', p: '#5a4a30', b: '#3a2a1a' },
    hp: 0.95, mp: 0.9, pa: 1.1, ma: 0.9, spd: 1.05, move: 3, jump: 3, evade: 10,
    weapon: { name: 'Longbow', power: 4, range: 4, vert: 5 },
    abilities: ['aim1', 'aim3', 'aim5', 'arrowRain', 'tame', 'pinningShot', 'eagleEye'],
    req: { squire: 2 }, desc: 'Strikes from afar. Charged Aim shots trade time for power.',
  },
  monk: {
    name: 'Monk', skillset: 'Pugilism', kind: 'human', sprite: 'monk',
    palette: { h: '#1a1a1a', c: '#d07a3a', p: '#e8d8b0', b: '#8a6a4a' },
    hp: 1.2, mp: 0.7, pa: 1.3, ma: 0.85, spd: 1.05, move: 4, jump: 4, evade: 12,
    weapon: { name: 'Bare Hands', power: 6, range: 1, vert: 3 },
    abilities: ['waveFist', 'quakeFist', 'chakra', 'bloodRage', 'revive', 'pressurePoint', 'whirlwindKick'],
    req: { knight: 2 }, desc: 'Fights unarmed with tremendous power and chi techniques.',
  },
  thief: {
    name: 'Thief', skillset: 'Steal', kind: 'human', sprite: 'rogue',
    palette: { h: '#d0b060', c: '#5a3a6a', p: '#2a1a3a', b: '#1a1a1a' },
    hp: 0.9, mp: 0.8, pa: 1.0, ma: 0.8, spd: 1.25, move: 5, jump: 4, evade: 18,
    weapon: { name: 'Dagger', power: 4, range: 1, vert: 2 },
    abilities: ['stealGil', 'poisonBlade', 'mug', 'sneakAttack', 'caltrops', 'tripWire'],
    req: { archer: 2 }, desc: 'Swift and slippery. Robs enemies blind.',
  },
  whiteMage: {
    name: 'Cleric', skillset: 'White Magic', kind: 'human', sprite: 'mage',
    palette: { h: '#e8e8f0', c: '#f4f0e8', p: '#c84040', b: '#6a4a3a' },
    hp: 0.8, mp: 1.3, pa: 0.75, ma: 1.25, spd: 1.0, move: 3, jump: 3, evade: 5,
    weapon: { name: 'Staff', power: 3, range: 1, vert: 2 },
    abilities: ['cure', 'cura', 'raise', 'protect', 'shell', 'regen', 'esuna', 'holyBolt', 'dispel', 'curaga'],
    req: { chemist: 2 }, desc: 'Mends wounds and shields allies with holy magick.',
  },
  blackMage: {
    name: 'Sorcerer', skillset: 'Black Magic', kind: 'human', sprite: 'mage',
    palette: { h: '#2a2a4a', c: '#3a3a6a', p: '#c8a040', b: '#3a2a1a' },
    hp: 0.75, mp: 1.4, pa: 0.7, ma: 1.35, spd: 1.0, move: 3, jump: 3, evade: 5,
    weapon: { name: 'Rod', power: 3, range: 1, vert: 2 },
    abilities: ['fire', 'thunder', 'blizzard', 'poisonSpell', 'silenceSpell', 'stone', 'fira', 'flare', 'thundara', 'drain'],
    req: { chemist: 2 }, desc: 'Rains elemental ruin upon whole groups of foes.',
  },
  timeMage: {
    name: 'Chronomancer', skillset: 'Time Magic', kind: 'human', sprite: 'mage',
    palette: { h: '#6a4a2a', c: '#4a6a8a', p: '#e8d060', b: '#3a2a1a' },
    hp: 0.75, mp: 1.4, pa: 0.7, ma: 1.25, spd: 0.95, move: 3, jump: 3, evade: 5,
    weapon: { name: 'Hourglass Staff', power: 3, range: 1, vert: 2 },
    abilities: ['haste', 'slowSpell', 'stopSpell', 'quick', 'rewind', 'timeTheft'],
    req: { whiteMage: 2 }, desc: 'Bends the flow of Tempo itself.',
  },
  ninja: {
    name: 'Ninja', skillset: 'Throw', kind: 'human', sprite: 'rogue',
    palette: { h: '#1a1a1a', c: '#2a2a3a', p: '#1a1a2a', b: '#101018' },
    hp: 0.9, mp: 0.8, pa: 1.15, ma: 0.9, spd: 1.35, move: 5, jump: 5, evade: 22,
    weapon: { name: 'Twin Blades', power: 4, range: 1, vert: 2 },
    abilities: ['shuriken', 'flameBomb', 'smoke', 'kunaiStorm', 'poisonNeedle', 'blink'],
    req: { thief: 3 }, desc: 'Strikes twice with each Attack and hurls thrown weapons.',
  },
  dragoon: {
    name: 'Dragoon', skillset: 'Jump', kind: 'human', sprite: 'heavy',
    palette: { h: '#3a2a5a', c: '#3a5a9a', p: '#2a3a5a', b: '#1a1a2a' },
    hp: 1.2, mp: 0.8, pa: 1.25, ma: 0.8, spd: 1.0, move: 3, jump: 5, evade: 8,
    weapon: { name: 'Spear', power: 6, range: 2, vert: 3 },
    abilities: ['jump', 'lancet', 'dragonRoar', 'highJump', 'spearSweep', 'dragonFang'],
    req: { thief: 2 }, desc: 'Leaps to the sky and crashes down on distant enemies.',
  },

  // ---------------------------------------------------- advanced jobs, second tier
  samurai: {
    name: 'Samurai', skillset: 'Iaido', kind: 'human', sprite: 'heavy',
    palette: { h: '#1a1a1a', c: '#b03030', p: '#e8e0d0', b: '#2a2a2a' },
    hp: 1.15, mp: 0.9, pa: 1.3, ma: 1.05, spd: 1.0, move: 3, jump: 3, evade: 12,
    weapon: { name: 'Katana', power: 7, range: 1, vert: 2 },
    abilities: ['ashura', 'bizenBoat', 'kiyomori', 'muramasa', 'moonCut', 'stillWater'],
    req: { knight: 3, dragoon: 2 }, desc: 'Draws the spirit out of the blade. Iaido strikes an area and asks nothing of the target\'s guard.',
  },
  summoner: {
    name: 'Summoner', skillset: 'Summon', kind: 'human', sprite: 'mage',
    palette: { h: '#2f6b3a', c: '#3a8a5a', p: '#e8d8a0', b: '#3a2a1a' },
    hp: 0.7, mp: 1.6, pa: 0.65, ma: 1.45, spd: 0.95, move: 3, jump: 3, evade: 5,
    weapon: { name: 'Summoner\'s Rod', power: 3, range: 1, vert: 2 },
    abilities: ['ifrit', 'shiva', 'ramuh', 'titan', 'moogle', 'carbuncle', 'sylph', 'undine'],
    req: { blackMage: 3, timeMage: 2 }, desc: 'Calls down the spirits. Wide, slow, and the spirits know friend from foe.',
  },
  geomancer: {
    name: 'Geomancer', skillset: 'Geomancy', kind: 'human', sprite: 'rogue',
    palette: { h: '#3a2a1a', c: '#8a9a5a', p: '#5a4a30', b: '#4a3a2a' },
    hp: 1.05, mp: 1.0, pa: 1.1, ma: 1.1, spd: 1.05, move: 4, jump: 4, evade: 10,
    weapon: { name: 'Hatchet', power: 6, range: 1, vert: 3 },
    abilities: ['tremor', 'windSlash', 'quicksand', 'torrent', 'gust', 'brambles'],
    req: { monk: 3 }, desc: 'Turns the land itself against the enemy. Geomancy costs nothing and lands at once.',
  },
  bard: {
    name: 'Bard', skillset: 'Song', kind: 'human', sprite: 'rogue',
    palette: { h: '#c8a060', c: '#6a4aa0', p: '#3a2a5a', b: '#2a1a1a' },
    hp: 0.8, mp: 1.2, pa: 0.8, ma: 1.15, spd: 1.1, move: 4, jump: 3, evade: 12,
    weapon: { name: 'Harp', power: 3, range: 3, vert: 4 },
    abilities: ['battleSong', 'lifeSong', 'angelSong', 'namelessSong', 'dirge', 'cadence'],
    req: { whiteMage: 2, archer: 2 }, desc: 'Fights from the back with a harp and a voice. Songs lift everyone within earshot.',
  },

  // ------------------------------------------------------ third tier: masters
  paladin: {
    name: 'Paladin', skillset: 'Holy Sword', kind: 'human', sprite: 'heavy',
    palette: { h: '#e8d8a0', c: '#e8e4dc', p: '#3a4a7a', b: '#4a3a2a' },
    affinity: { holy: 'resist' },
    hp: 1.4, mp: 1.0, pa: 1.3, ma: 1.1, spd: 0.95, move: 3, jump: 3, evade: 12,
    weapon: { name: 'Greatsword', power: 9, range: 1, vert: 2 },
    abilities: ['holyStrike', 'sanctuary', 'judgment', 'oath', 'shieldOfFaith', 'smite'],
    req: { samurai: 2, whiteMage: 3 }, desc: 'A knight sworn to the light. Holy steel for the enemy, a shield of prayer for friends.',
  },
  arcanist: {
    name: 'Arcanist', skillset: 'Arcana', kind: 'human', sprite: 'mage',
    palette: { h: '#3a1a5a', c: '#5a2a8a', p: '#e8c860', b: '#2a1a1a' },
    hp: 0.7, mp: 1.7, pa: 0.6, ma: 1.6, spd: 0.95, move: 3, jump: 3, evade: 6,
    weapon: { name: 'Grimoire', power: 4, range: 2, vert: 3 },
    abilities: ['meteor', 'gravity', 'drainSoul', 'doomBolt', 'comet', 'siphon'],
    req: { summoner: 2, geomancer: 2 }, desc: 'Reads what should not be read. Ruin from the sky, and spells that take rather than strike.',
  },
  assassin: {
    name: 'Assassin', skillset: 'Shadow', kind: 'human', sprite: 'rogue',
    palette: { h: '#2a1a1a', c: '#1a1a22', p: '#3a1a1a', b: '#101010' },
    hp: 0.9, mp: 0.9, pa: 1.25, ma: 1.0, spd: 1.45, move: 5, jump: 5, evade: 26,
    weapon: { name: 'Twin Fangs', power: 5, range: 1, vert: 2 },
    abilities: ['shadowstitch', 'assassinate', 'vanish', 'smokeStep', 'garrote', 'markForDeath'],
    req: { ninja: 3, bard: 2 }, desc: 'The fastest thing on the field. Ends fights with one cut, when the cut lands.',
  },
  sage: {
    name: 'Sage', skillset: 'Sagacity', kind: 'human', sprite: 'mage',
    palette: { h: '#f0f0f8', c: '#d8e0f0', p: '#3a5a9a', b: '#3a2a1a' },
    affinity: { dark: 'resist' },
    hp: 0.8, mp: 1.8, pa: 0.7, ma: 1.55, spd: 1.0, move: 3, jump: 3, evade: 6,
    weapon: { name: 'Sage\'s Tome', power: 4, range: 2, vert: 3 },
    abilities: ['holy', 'fullLife', 'reraise', 'ultima', 'aurora', 'scourge'],
    req: { summoner: 3, bard: 2 }, desc: 'Has read everything the Arcanist has, and closed the book. The last word in magick.',
  },

  // ------------------------------------------------------- the legendary tier
  // Three jobs at the top of the tree, each the end of a road: the dragon's,
  // the book's, and the bargain's. Their arms are sold only once the war is
  // won, and the trials after it are where they are meant to be worn.
  dragonlord: {
    name: 'Dragonlord', skillset: 'Dragon Arts', kind: 'human', sprite: 'heavy',
    palette: { h: '#3a1010', c: '#a02020', p: '#3a2a1a', b: '#1a1010' },
    affinity: { fire: 'resist' },
    hp: 1.6, mp: 1.0, pa: 1.6, ma: 1.1, spd: 1.05, move: 4, jump: 6, evade: 14,
    weapon: { name: 'Dragon Lance', power: 9, range: 2, vert: 4 },
    abilities: ['dragonBreath', 'skyRend', 'scaleWard', 'roarOfKings', 'wingStorm', 'dragonsBlood'],
    req: { samurai: 3, dragoon: 3, paladin: 2 }, desc: 'The dragon\'s road ends here. Fire from the throat, death from the sky, and a roar that lifts an army.',
  },
  hierophant: {
    name: 'Hierophant', skillset: 'Revelation', kind: 'human', sprite: 'mage',
    palette: { h: '#f0d060', c: '#f4ecd0', p: '#8a5a2a', b: '#3a2a1a' },
    affinity: { holy: 'resist', dark: 'resist' },
    hp: 0.9, mp: 2.0, pa: 0.7, ma: 1.9, spd: 1.0, move: 3, jump: 3, evade: 8,
    weapon: { name: 'Apocryphon', power: 5, range: 2, vert: 3 },
    abilities: ['starfall', 'ascension', 'aegis', 'timeStop', 'benediction', 'wrath'],
    req: { sage: 3, arcanist: 3 }, desc: 'The book\'s road ends here. Stars fall, the fallen rise, and time itself can be told to wait.',
  },
  fellKnight: {
    name: 'Fell Knight', skillset: 'Black Bargain', kind: 'human', sprite: 'heavy',
    palette: { h: '#c0c0d0', c: '#2a1a2a', p: '#1a0a1a', b: '#0a0a0a' },
    affinity: { dark: 'absorb', holy: 'weak' },
    hp: 1.5, mp: 1.1, pa: 1.55, ma: 1.3, spd: 1.1, move: 4, jump: 4, evade: 14,
    weapon: { name: 'Fell Blade', power: 9, range: 1, vert: 3 },
    abilities: ['fellSlash', 'abyss', 'soulRend', 'darkPact', 'nightmare', 'grimHarvest'],
    req: { paladin: 3, assassin: 3 }, desc: 'The bargain\'s road ends here, the same one Brannoc made. Every blow feeds the one who strikes it.',
  },

  // ----------------------------------------------------------- monsters/boss
  // ---- the Brass Concord's trades: what a war looks like when it is built ----
  engineer: {
    name: 'Engineer', skillset: 'Tinkering', kind: 'human', sprite: 'warrior',
    palette: { h: '#6a4a2a', c: '#8a6a3a', p: '#4a3a2a', b: '#2a2a2a' },
    hp: 1.0, mp: 1.1, pa: 1.0, ma: 1.15, spd: 1.0, move: 3, jump: 3, evade: 8,
    weapon: { name: 'Spanner', power: 6, range: 1, vert: 2 },
    abilities: ['repair', 'oilSlick', 'steamVent', 'overclock', 'shrapnel', 'recalibrate'],
    req: { chemist: 2 }, desc: 'Keeps the machines running, and the people. Steam, oil and a heavy spanner.',
  },
  gunner: {
    name: 'Gunner', skillset: 'Gunnery', kind: 'human', sprite: 'warrior',
    palette: { h: '#3a2a1a', c: '#4a5a6a', p: '#3a3a3a', b: '#2a2a2a' },
    hp: 0.95, mp: 0.8, pa: 1.1, ma: 0.8, spd: 1.05, move: 3, jump: 3, evade: 10,
    weapon: { name: 'Flintlock', power: 5, range: 4, vert: 9 },
    abilities: ['aimedShot', 'scattershot', 'legShot', 'suppress', 'doubleTap', 'flashPowder'],
    req: { archer: 2 }, desc: 'A long gun that does not care about height. Slow to aim, hard to argue with.',
  },
  aeronaut: {
    name: 'Aeronaut', skillset: 'Aeronautics', kind: 'human', sprite: 'warrior',
    palette: { h: '#c9a24a', c: '#7a4a2a', p: '#3a3a4a', b: '#2a2a2a' },
    hp: 1.0, mp: 1.0, pa: 1.15, ma: 1.05, spd: 1.15, move: 4, jump: 7, evade: 18,
    weapon: { name: 'Flintlock', power: 5, range: 4, vert: 9 },
    abilities: ['bombingRun', 'signalFlare', 'updraft', 'grapnel', 'strafe', 'skyhook'],
    req: { gunner: 2, thief: 1 }, desc: 'A canvas balloon and a head for heights. Comes down where it is least wanted.',
  },
  artificer: {
    name: 'Artificer', skillset: 'Artifice', kind: 'human', sprite: 'warrior',
    palette: { h: '#4a3a3a', c: '#b08a3a', p: '#3a3a4a', b: '#2a2a2a' },
    affinity: { thunder: 'resist' },
    hp: 1.1, mp: 1.5, pa: 1.2, ma: 1.5, spd: 1.05, move: 3, jump: 3, evade: 10,
    weapon: { name: 'Aether Rod', power: 6, range: 1, vert: 2 },
    abilities: ['teslaCoil', 'aetherShield', 'gearstorm', 'overdrive', 'galvanize', 'magnetize'],
    req: { engineer: 3, gunner: 3 }, desc: 'Lightning in a bottle, and the bottle is the whole battlefield.',
  },
  // ---- the north: what the Winter Court made, and what stood against it ----
  frostweaver: {
    name: 'Frostweaver', skillset: 'Rime', kind: 'human', sprite: 'mage',
    palette: { h: '#dfe8f0', c: '#5a7ab0', p: '#2a3a5a', b: '#1a2030' },
    affinity: { ice: 'absorb', fire: 'weak' },
    hp: 0.75, mp: 1.7, pa: 0.6, ma: 1.65, spd: 1.0, move: 3, jump: 3, evade: 8,
    weapon: { name: 'Ice Rod', power: 5, range: 1, vert: 2 },
    abilities: ['rime', 'glaciate', 'hoarfrost', 'whiteout', 'frostbite', 'iceVeil'],
    req: { blackMage: 3, timeMage: 2 }, desc: 'The Court\'s own art, learned back from it: cold that stops, blinds and holds.',
  },
  warden: {
    name: 'Warden', skillset: 'Vigil', kind: 'human', sprite: 'warrior',
    palette: { h: '#8a5a2a', c: '#6a7a5a', p: '#3a3a2a', b: '#2a2a2a' },
    affinity: { ice: 'resist' },
    hp: 1.15, mp: 0.9, pa: 1.25, ma: 0.9, spd: 1.05, move: 4, jump: 4, evade: 12,
    weapon: { name: 'Warden Spear', power: 7, range: 2, vert: 3 },
    abilities: ['pin', 'wardPost', 'rally', 'volley', 'spearWall', 'standFast'],
    req: { archer: 3, knight: 2 }, desc: 'The old north\'s sentries: a spear, a post to hold, and a voice the line can hear.',
  },
  runeblade: {
    name: 'Runeblade', skillset: 'Star-iron', kind: 'human', sprite: 'heavy',
    palette: { h: '#3a3a4a', c: '#8ab0d0', p: '#2a3040', b: '#1a1a2a' },
    affinity: { ice: 'resist', dark: 'resist' },
    hp: 1.3, mp: 1.3, pa: 1.4, ma: 1.35, spd: 1.05, move: 4, jump: 4, evade: 14,
    weapon: { name: 'Rune Sword', power: 8, range: 1, vert: 2 },
    abilities: ['runecut', 'frostbrand', 'starWard', 'nova', 'runeShield', 'starStrike'],
    req: { samurai: 2, arcanist: 2 }, desc: 'A blade with the star-iron\'s own runes cut into it. It burns cold, and it does not stay down.',
  },
  // ---- the sea's trades ----
  corsair: {
    name: 'Corsair', skillset: 'Freebooting', kind: 'human', sprite: 'rogue',
    palette: { h: '#2a1a10', c: '#8a3a3a', p: '#3a2a2a', b: '#2a1a1a' },
    hp: 1.1, mp: 0.8, pa: 1.3, ma: 0.8, spd: 1.15, move: 4, jump: 4, evade: 18,
    weapon: { name: 'Cutlass', power: 8, range: 1, vert: 2 },
    abilities: ['boarding', 'plunder', 'broadside', 'seaLegs', 'powderKeg', 'rumRation'],
    req: { thief: 3, gunner: 2 }, desc: 'A blade, a pistol and no manners. Quick over a deck, and paid by what falls out of the other side.',
  },
  tidecaller: {
    name: 'Tidecaller', skillset: 'Tides', kind: 'human', sprite: 'mage',
    palette: { h: '#2a5a6a', c: '#3a8a9a', p: '#1a3a4a', b: '#0a2a30' },
    affinity: { water: 'absorb', thunder: 'weak' },
    hp: 0.8, mp: 1.7, pa: 0.6, ma: 1.6, spd: 1.0, move: 3, jump: 3, evade: 8,
    weapon: { name: 'Tide Rod', power: 5, range: 1, vert: 2 },
    abilities: ['undertow', 'tidalWave', 'brine', 'saltWard', 'tideMend', 'drowningGrip'],
    req: { blackMage: 3, summoner: 2 }, desc: 'The Priory\'s art, taken back to the shore: the sea called in over a field, and the salt that stays after.',
  },
  harpooner: {
    name: 'Harpooner', skillset: 'Harpoons', kind: 'human', sprite: 'warrior',
    palette: { h: '#c8a060', c: '#4a5a4a', p: '#2a3a3a', b: '#1a2a2a' },
    affinity: { water: 'resist' },
    hp: 1.2, mp: 0.8, pa: 1.35, ma: 0.8, spd: 1.05, move: 4, jump: 4, evade: 12,
    weapon: { name: 'Harpoon', power: 8, range: 2, vert: 3 },
    abilities: ['harpoon', 'whaleslayer', 'barb', 'reel', 'netThrow', 'gaffHook'],
    req: { dragoon: 2, archer: 2 }, desc: 'Whalers who learned on the Sunder Sea that anything big enough to see is big enough to hit.',
  },
  // ---- the crown's trades ----
  marshal: {
    name: 'Marshal', skillset: 'Command', kind: 'human', sprite: 'heavy',
    palette: { h: '#4a3a2a', c: '#8a2a2a', p: '#3a2a2a', b: '#2a1a1a' },
    hp: 1.3, mp: 1.0, pa: 1.35, ma: 1.0, spd: 1.05, move: 4, jump: 3, evade: 12,
    weapon: { name: 'Marshal\'s Blade', power: 8, range: 1, vert: 2 },
    abilities: ['orders', 'holdTheLine', 'charge', 'rallyingCry', 'flankingOrder', 'volleyFire'],
    req: { knight: 4, warden: 2 }, desc: 'The one the line listens to. Orders that move allies, and a voice that holds them together.',
  },
  inquisitor: {
    name: 'Inquisitor', skillset: 'Judgement', kind: 'human', sprite: 'mage',
    palette: { h: '#e8e0d0', c: '#4a2a4a', p: '#2a1a2a', b: '#1a0a1a' },
    affinity: { holy: 'resist', dark: 'weak' },
    hp: 0.9, mp: 1.6, pa: 0.8, ma: 1.55, spd: 1.0, move: 3, jump: 3, evade: 10,
    weapon: { name: 'Rod of Office', power: 6, range: 1, vert: 2 },
    abilities: ['judgement', 'sealMagic', 'purge', 'brand', 'excommunication', 'litany'],
    req: { whiteMage: 3, arcanist: 2 }, desc: 'Holy light turned to a purpose: magic sealed, statuses burned off, and judgement on whoever is left.',
  },
  duelist: {
    name: 'Duelist', skillset: 'Fencing', kind: 'human', sprite: 'rogue',
    palette: { h: '#2a2a3a', c: '#e0d0b0', p: '#4a3a3a', b: '#2a2a2a' },
    hp: 1.0, mp: 0.9, pa: 1.35, ma: 0.9, spd: 1.2, move: 4, jump: 4, evade: 22,
    weapon: { name: 'Rapier', power: 8, range: 1, vert: 2 },
    abilities: ['lunge', 'feint', 'enGarde', 'coupDeGrace', 'flurry', 'disarm'],
    req: { samurai: 2, corsair: 2 }, desc: 'One blade, one foe at a time. Faster than anyone on the field and rude about it.',
  },
  hollowKnight: {
    name: 'Hollow Knight', skillset: 'Hollow', kind: 'human', sprite: 'heavy',
    palette: { h: '#cfe8f4', c: '#2a3a4a', p: '#1a2030', b: '#0a1018' },
    affinity: { ice: 'absorb', fire: 'weak', holy: 'weak' },
    hp: 1.5, mp: 1.0, pa: 1.4, ma: 1.0, spd: 1.0, move: 4, jump: 3, evade: 12,
    weapon: { name: 'Hollow Blade', power: 8, range: 1, vert: 2 },
    abilities: ['hollowStrike', 'colddrain', 'frostbrand'], req: null,
    desc: 'Armour with the cold inside it and nothing else. Fire and holy light get in.',
  },
  winterRegent: {
    name: 'Winter Regent', skillset: 'Regency', kind: 'human', sprite: 'mage',
    palette: { h: '#ffffff', c: '#1a2a48', p: '#0a1020', b: '#000000' },
    affinity: { ice: 'absorb', fire: 'weak' },
    hp: 2.4, mp: 2.0, pa: 1.3, ma: 1.9, spd: 1.15, move: 4, jump: 4, evade: 16,
    weapon: { name: 'Regent\'s Sceptre', power: 9, range: 2, vert: 3 },
    abilities: ['rime', 'glaciate', 'whiteout', 'nova', 'absoluteZero'], req: null,
    desc: 'He looks like a man and is dressed like a king. The cold coming off him is neither.',
  },
  goblin: {
    name: 'Goblin', skillset: 'Goblin', kind: 'monster', sprite: 'goblin',
    palette: { h: '#2a5a2a', c: '#4a8a3a', p: '#6a4a2a', b: '#3a2a1a' },
    affinity: { earth: 'resist' },
    hp: 0.9, mp: 0.5, pa: 1.1, ma: 0.7, spd: 0.95, move: 4, jump: 3, evade: 8,
    weapon: { name: 'Claws', power: 5, range: 1, vert: 2 },
    abilities: ['tackle', 'goblinPunch'], req: null, desc: 'A vicious little brute.',
  },
  wolf: {
    name: 'Dire Wolf', skillset: 'Wolf', kind: 'monster', sprite: 'wolf',
    palette: { h: '#4a4a4a', c: '#6a6a70', p: '#3a3a3a', b: '#2a2a2a' },
    affinity: { fire: 'weak' },
    hp: 0.85, mp: 0.5, pa: 1.05, ma: 0.6, spd: 1.3, move: 5, jump: 4, evade: 14,
    weapon: { name: 'Fangs', power: 5, range: 1, vert: 2 },
    abilities: ['bite', 'howl'], req: null, desc: 'Fast and hungry.',
  },
  bomb: {
    name: 'Bomb', skillset: 'Bomb', kind: 'monster', sprite: 'bomb',
    palette: { h: '#ff8a20', c: '#d04a10', p: '#801a00', b: '#ffd040' },
    affinity: { fire: 'absorb', ice: 'weak' },
    hp: 0.7, mp: 0.8, pa: 0.9, ma: 1.2, spd: 1.0, move: 3, jump: 6, evade: 5,
    weapon: { name: 'Flame', power: 4, range: 1, vert: 3 },
    abilities: ['spark', 'selfDestruct'], req: null, desc: 'Floats about, burning. Explodes when cornered.',
  },
  skeleton: {
    name: 'Skeleton', skillset: 'Bone', kind: 'monster', sprite: 'skeleton',
    palette: { h: '#e0dcc8', c: '#8a8478', p: '#5a564c', b: '#3a3a3a', e: '#c02020' },
    affinity: { holy: 'weak', dark: 'absorb', ice: 'resist', fire: 'weak' },
    hp: 1.15, mp: 0.6, pa: 1.05, ma: 0.8, spd: 0.85, move: 3, jump: 2, evade: 6,
    weapon: { name: 'Rusted Blade', power: 6, range: 1, vert: 2 },
    abilities: ['boneToss', 'gravePull'], req: null,
    desc: 'It was a soldier once. It has forgotten everything but the war.',
  },
  wisp: {
    name: 'Marsh Wisp', skillset: 'Glimmer', kind: 'monster', sprite: 'wisp',
    palette: { h: '#bff0ff', c: '#4a9ad0', p: '#2a5a80', b: '#1a3a50', w: '#ffffff', e: '#204060' },
    affinity: { thunder: 'absorb', earth: 'weak', ice: 'resist' },
    hp: 0.6, mp: 1.5, pa: 0.6, ma: 1.4, spd: 1.15, move: 4, jump: 8, evade: 20,
    weapon: { name: 'Cold Touch', power: 3, range: 1, vert: 4 },
    abilities: ['willOWisp', 'drainLight'], req: null,
    desc: 'A light over the water that wants you to follow it.',
  },
  treant: {
    name: 'Treant', skillset: 'Bough', kind: 'monster', sprite: 'treant',
    palette: { h: '#6a5030', c: '#3d7a35', p: '#4a3a20', b: '#3a2a18', e: '#d8c040' },
    affinity: { fire: 'weak', earth: 'absorb', ice: 'resist' },
    hp: 1.6, mp: 0.9, pa: 1.25, ma: 0.9, spd: 0.75, move: 2, jump: 2, evade: 4,
    weapon: { name: 'Heavy Bough', power: 7, range: 2, vert: 3 },
    abilities: ['rootSnare', 'barkSkin'], req: null,
    desc: 'Old, slow and immensely strong. It does not like being disturbed.',
  },
  darkKnightRisen: {
    name: 'The Unbound', skillset: 'Black Tide', kind: 'human', sprite: 'heavy',
    palette: { h: '#e04040', c: '#1a0a1a', p: '#100010', b: '#000000' },
    affinity: { dark: 'absorb', holy: 'weak', fire: 'resist', ice: 'resist' },
    hp: 2.6, mp: 1.8, pa: 1.7, ma: 1.7, spd: 1.25, move: 4, jump: 4, evade: 18,
    weapon: { name: 'Fell Blade', power: 11, range: 1, vert: 3 },
    abilities: ['nightSword', 'shadowBlade', 'blackTide', 'despair', 'darkProtect'], req: null,
    desc: 'Whatever bargain he made, this is what came to collect.',
  },
  // ---- the Concord's machines ----
  sentinel: {
    name: 'Clockwork Sentinel', skillset: 'Clockwork', kind: 'monster', sprite: 'sentinel',
    palette: { h: '#b08a3a', c: '#7a6a4a', p: '#4a4a4a', b: '#2a2a2a', e: '#ff4020' },
    affinity: { thunder: 'weak', fire: 'resist', earth: 'resist' },
    hp: 1.3, mp: 0.4, pa: 1.2, ma: 0.6, spd: 0.8, move: 3, jump: 2, evade: 4,
    weapon: { name: 'Piston', power: 7, range: 1, vert: 2 },
    abilities: ['pistonStrike', 'steamBurst'], req: null,
    desc: 'An inch of brass around a boiler. Slow, stupid, and very hard to stop. Lightning gets in.',
  },
  ironhound: {
    name: 'Iron Hound', skillset: 'Hound', kind: 'monster', sprite: 'wolf',
    palette: { h: '#8a7a4a', c: '#b09a5a', p: '#4a4a4a', b: '#2a2a2a' },
    affinity: { thunder: 'weak', ice: 'resist' },
    hp: 1.0, mp: 0.5, pa: 1.15, ma: 0.7, spd: 1.3, move: 6, jump: 4, evade: 12,
    weapon: { name: 'Gear Jaws', power: 6, range: 1, vert: 2 },
    abilities: ['tackle', 'gearBite'], req: null,
    desc: 'A wolf as the Concord would build one. It does not tire and it does not stop.',
  },
  colossus: {
    name: 'Steam Colossus', skillset: 'Furnace', kind: 'monster', sprite: 'sentinel',
    palette: { h: '#d0a040', c: '#6a3a2a', p: '#3a3a3a', b: '#1a1a1a', e: '#ffe040' },
    affinity: { thunder: 'weak', fire: 'absorb', ice: 'resist' },
    hp: 3.0, mp: 1.2, pa: 1.8, ma: 1.5, spd: 1.1, move: 4, jump: 4, evade: 6,
    weapon: { name: 'Furnace Fist', power: 12, range: 1, vert: 3 },
    abilities: ['pistonStrike', 'furnaceBlast', 'steamSiren', 'overheat'], req: null,
    desc: 'The Director\'s answer to every argument. A furnace on legs, with a man inside.',
  },
  // ---- the Court's creatures ----
  rimeWight: {
    name: 'Rime Wight', skillset: 'Grave Cold', kind: 'monster', sprite: 'skeleton',
    palette: { h: '#dff4ff', c: '#8ab0c8', p: '#5a7a90', b: '#2a3a48', e: '#40c0ff' },
    affinity: { ice: 'absorb', fire: 'weak', holy: 'weak', dark: 'resist' },
    hp: 1.1, mp: 0.8, pa: 1.1, ma: 1.1, spd: 0.9, move: 3, jump: 3, evade: 8,
    weapon: { name: 'Grave Cold', power: 6, range: 1, vert: 2 },
    abilities: ['chill', 'graspOfIce'], req: null,
    desc: 'What the river keeps. It comes up out of the ice when a knight calls.',
  },
  iceDrake: {
    name: 'Ice Drake', skillset: 'Drake', kind: 'monster', sprite: 'wolf',
    palette: { h: '#cfe8ff', c: '#9ac0e0', p: '#4a6a90', b: '#2a3a50', e: '#ffffff' },
    affinity: { ice: 'absorb', fire: 'weak', thunder: 'resist' },
    hp: 2.2, mp: 1.0, pa: 1.5, ma: 1.2, spd: 1.1, move: 5, jump: 5, evade: 10,
    weapon: { name: 'Fangs', power: 9, range: 1, vert: 3 },
    abilities: ['frostBreath', 'wingBuffet', 'tailSweep'], req: null,
    desc: 'A river with teeth. The Court feeds it, and it has not been hungry for a long time.',
  },
  namelessCold: {
    name: 'The Nameless Cold', skillset: 'Nothing', kind: 'monster', sprite: 'wisp',
    palette: { h: '#ffffff', c: '#8ab0ff', p: '#2a2a5a', b: '#101030', w: '#ffffff', e: '#000000' },
    affinity: { ice: 'absorb', dark: 'absorb', fire: 'weak', holy: 'weak', thunder: 'resist' },
    hp: 2.0, mp: 2.5, pa: 1.4, ma: 1.55, spd: 1.0, move: 5, jump: 9, evade: 10,
    weapon: { name: 'Nothing', power: 9, range: 1, vert: 9 },
    abilities: ['absoluteZero', 'hunger', 'stillness', 'unmake'], req: null,
    desc: 'It fell from the sky and has been eating ever since. It has never needed a name.',
  },
  // ---- the sea's dead and its creatures ----
  drownedKnight: {
    name: 'Drowned Knight', skillset: 'Drowned', kind: 'human', sprite: 'heavy',
    palette: { h: '#6a8a8a', c: '#2a4a4a', p: '#1a3030', b: '#0a1818' },
    affinity: { water: 'absorb', thunder: 'weak', holy: 'weak', ice: 'resist' },
    hp: 1.5, mp: 1.0, pa: 1.4, ma: 1.0, spd: 0.95, move: 4, jump: 3, evade: 10,
    weapon: { name: 'Barnacle Blade', power: 8, range: 1, vert: 2 },
    abilities: ['brineCut', 'anchorFall', 'riptide'], req: null,
    desc: 'Tessaly\'s guard, still on watch under the water. Thunder finds them, and so does holy light.',
  },
  saltPriest: {
    name: 'Salt Priest', skillset: 'Liturgy', kind: 'human', sprite: 'mage',
    palette: { h: '#e8e0d0', c: '#6a7a7a', p: '#3a4a4a', b: '#1a2a2a' },
    affinity: { water: 'absorb', thunder: 'weak' },
    hp: 0.85, mp: 1.7, pa: 0.7, ma: 1.6, spd: 1.0, move: 3, jump: 3, evade: 8,
    weapon: { name: 'Salt Staff', power: 5, range: 1, vert: 2 },
    abilities: ['brine', 'undertow', 'hymnOfTheDeep', 'saltWard'], req: null,
    desc: 'The Priory keeps the drowned star, and sings to it. It has learned to sing back.',
  },
  siren: {
    name: 'Siren', skillset: 'Song', kind: 'monster', sprite: 'wisp',
    palette: { h: '#8ae8e0', c: '#3aa0a8', p: '#1a5a60', b: '#0a2a30', w: '#e0ffff', e: '#ffffff' },
    affinity: { water: 'absorb', thunder: 'weak', fire: 'resist' },
    hp: 0.9, mp: 1.8, pa: 0.8, ma: 1.5, spd: 1.2, move: 5, jump: 9, evade: 20,
    weapon: { name: 'Song', power: 5, range: 2, vert: 9 },
    abilities: ['lure', 'sirenSong', 'drown'], req: null,
    desc: 'A voice over the water with nothing behind it. Sailors go to it, and their friends go after them.',
  },
  reefCrab: {
    name: 'Reef Crab', skillset: 'Shell', kind: 'monster', sprite: 'crab',
    palette: { h: '#c05a48', c: '#e08a70', p: '#6a2a20', b: '#4a1a10', e: '#101010' },
    affinity: { water: 'resist', earth: 'resist', thunder: 'weak' },
    hp: 1.7, mp: 0.5, pa: 1.4, ma: 0.6, spd: 0.8, move: 3, jump: 2, evade: 4,
    weapon: { name: 'Pincer', power: 9, range: 1, vert: 2 },
    abilities: ['pincer', 'shellUp'], req: null,
    desc: 'The size of a cart and the temper of one. Its shell turns most things aside.',
  },
  leviathan: {
    name: 'Leviathan', skillset: 'Deep', kind: 'monster', sprite: 'serpent',
    palette: { h: '#2a6a7a', c: '#5aa0a8', p: '#1a3a48', b: '#0a2028', e: '#ffe040' },
    affinity: { water: 'absorb', thunder: 'weak', ice: 'resist', fire: 'resist' },
    hp: 2.4, mp: 1.2, pa: 1.6, ma: 1.3, spd: 1.05, move: 5, jump: 6, evade: 8,
    weapon: { name: 'Jaws', power: 10, range: 1, vert: 4 },
    abilities: ['maelstrom', 'crush', 'tailSweep'], req: null,
    desc: 'The sea\'s own weather, with a spine. It has eaten ships. It would like to eat another.',
  },
  drownedQueen: {
    name: 'Drowned Queen', skillset: 'Tessaly', kind: 'human', sprite: 'mage',
    palette: { h: '#d0e8e8', c: '#1a4a58', p: '#0a2a38', b: '#000000' },
    affinity: { water: 'absorb', ice: 'resist', thunder: 'weak' },
    hp: 2.5, mp: 2.0, pa: 1.3, ma: 1.9, spd: 1.15, move: 4, jump: 4, evade: 16,
    weapon: { name: 'Queen\'s Trident', power: 10, range: 2, vert: 3 },
    abilities: ['undertow', 'tidalWave', 'hymnOfTheDeep', 'drown', 'nova'], req: null,
    desc: 'Tessaly\'s last queen went down with her city and never stopped holding court. Something holds it through her now.',
  },
  theDeep: {
    name: 'The Deep', skillset: 'Nothing', kind: 'monster', sprite: 'wisp',
    palette: { h: '#c0f0ff', c: '#1a6a90', p: '#0a2a50', b: '#000a20', w: '#ffffff', e: '#000000' },
    affinity: { water: 'absorb', dark: 'absorb', ice: 'resist', thunder: 'weak', holy: 'weak' },
    hp: 2.1, mp: 2.5, pa: 1.4, ma: 1.6, spd: 1.0, move: 5, jump: 9, evade: 10,
    weapon: { name: 'Nothing', power: 10, range: 1, vert: 9 },
    abilities: ['maelstrom', 'hunger', 'stillness', 'unmake'], req: null,
    desc: 'What went out of the crater like breath off a window. It found the sea, and the sea has no shape to lose.',
  },
  // ---- the crown's servants ----
  royalGuard: {
    name: 'Royal Guard', skillset: 'The Guard', kind: 'human', sprite: 'heavy',
    palette: { h: '#c0c0d0', c: '#2a2a5a', p: '#1a1a3a', b: '#0a0a1a' },
    hp: 1.5, mp: 0.9, pa: 1.4, ma: 0.9, spd: 1.0, move: 4, jump: 3, evade: 12,
    weapon: { name: 'Halberd', power: 9, range: 2, vert: 3 },
    abilities: ['shieldWall', 'halberdSweep', 'guardsOath'], req: null,
    desc: 'The palace guard: heavy, drilled, and loyal to whoever holds the palace.',
  },
  courtMage: {
    name: 'Court Mage', skillset: 'Court Magic', kind: 'human', sprite: 'mage',
    palette: { h: '#d0c0a0', c: '#3a2a5a', p: '#2a1a3a', b: '#1a0a2a' },
    hp: 0.8, mp: 1.7, pa: 0.6, ma: 1.6, spd: 1.05, move: 3, jump: 3, evade: 8,
    weapon: { name: 'Court Rod', power: 5, range: 1, vert: 2 },
    abilities: ['fire', 'thunder', 'sealMagic', 'protect'], req: null,
    desc: 'Trained at the crown\'s expense, and paid to remember it.',
  },
  mercenary: {
    name: 'Mercenary', skillset: 'Hired Steel', kind: 'human', sprite: 'warrior',
    palette: { h: '#3a2a1a', c: '#5a5a4a', p: '#3a3a2a', b: '#2a2a1a' },
    hp: 1.2, mp: 0.7, pa: 1.3, ma: 0.7, spd: 1.1, move: 4, jump: 4, evade: 14,
    weapon: { name: 'Sellsword', power: 8, range: 1, vert: 2 },
    abilities: ['mug', 'brace', 'sellswordCut'], req: null,
    desc: 'On every side of every war, as long as the pay came through.',
  },
  griffon: {
    name: 'Griffon', skillset: 'Talons', kind: 'monster', sprite: 'griffon',
    palette: { h: '#d8b060', c: '#a07a40', p: '#5a4020', b: '#3a2a10', e: '#ffe040', w: '#f0e8d0' },
    affinity: { thunder: 'weak', earth: 'resist' },
    hp: 1.5, mp: 0.8, pa: 1.3, ma: 0.9, spd: 1.2, move: 5, jump: 9, evade: 14,
    weapon: { name: 'Talons', power: 8, range: 1, vert: 9 },
    abilities: ['dive', 'screech'], req: null,
    desc: 'The crown\'s hunting beasts. Nothing on the field is too high for them.',
  },
  golem: {
    name: 'Golem', skillset: 'Stone', kind: 'monster', sprite: 'golem',
    palette: { h: '#8a8a98', c: '#6a6a78', p: '#4a4a58', b: '#2a2a38', e: '#ffb040' },
    affinity: { earth: 'absorb', thunder: 'resist', water: 'weak', ice: 'weak' },
    hp: 2.4, mp: 0.4, pa: 1.7, ma: 0.7, spd: 0.7, move: 3, jump: 2, evade: 2,
    weapon: { name: 'Fists of Stone', power: 12, range: 1, vert: 2 },
    abilities: ['slam', 'stoneskin', 'quake'], req: null,
    desc: 'A statue somebody woke. Water and ice get into the cracks; thunder does not.',
  },
  chancellor: {
    name: 'Chancellor', skillset: 'Statecraft', kind: 'human', sprite: 'mage',
    palette: { h: '#c8c0b0', c: '#1a1a2a', p: '#0a0a1a', b: '#000000' },
    affinity: { dark: 'resist', holy: 'weak' },
    hp: 2.2, mp: 2.0, pa: 1.2, ma: 1.85, spd: 1.1, move: 4, jump: 3, evade: 16,
    weapon: { name: 'Seal of Office', power: 8, range: 2, vert: 3 },
    abilities: ['verdict', 'sealMagic', 'thunder', 'protect', 'meteor'], req: null,
    desc: 'He counted the grain while the wars were fought, and has decided the realm owes him for it.',
  },
  darkKnight: {
    name: 'Dark Knight', skillset: 'Fell Sword', kind: 'human', sprite: 'heavy',
    palette: { h: '#c0c0d0', c: '#2a1a2a', p: '#1a0a1a', b: '#0a0a0a' },
    affinity: { dark: 'absorb', holy: 'weak' },
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
// ct:    0 = instant; otherwise charge speed (ability resolves at 100 Tempo)
// affects: 'enemy' | 'ally' | 'all' — who in the area the effects apply to
// effects: list of {type,...}
const ABILITIES = {
  attack: { name: 'Attack', job: null, jp: 0, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }], desc: 'Strike with your weapon.' },

  // Footman
  throwStone: { name: 'Sling Stone', job: 'squire', jp: 50, mp: 0, range: 4, aoe: 0, vert: 4, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 2 }], desc: 'Hurl a stone. Weak, but reaches far.' },
  accumulate: { name: 'Brace', job: 'squire', jp: 100, mp: 0, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'pa', amount: 1 }], desc: 'Focus. PA +1 for the rest of the battle.' },
  yell: { name: 'Yell', job: 'squire', jp: 150, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'support', affects: 'ally',
    effects: [{ type: 'statmod', stat: 'spd', amount: 2 }], desc: 'Rally an ally. Speed +2 for the rest of the battle.' },
  firstAid: { name: 'First Aid', job: 'squire', jp: 80, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', flat: 25 }, { type: 'cure', statuses: ['poison'] }], desc: 'Restore 25 HP and cure Poison.' },

  // Apothecary
  potion: { name: 'Potion', job: 'chemist', jp: 30, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', flat: 35 }], desc: 'Restore 35 HP.' },
  hiPotion: { name: 'Greater Potion', job: 'chemist', jp: 120, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', flat: 80 }], desc: 'Restore 80 HP.' },
  antidote: { name: 'Antidote', job: 'chemist', jp: 40, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'cure', statuses: ['poison', 'slow', 'stop'] }], desc: 'Cure Poison, Slow and Stop.' },
  remedy: { name: 'Remedy', job: 'chemist', jp: 220, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'cure', statuses: ['poison', 'slow', 'stop', 'silence', 'blind', 'berserk'] }],
    desc: 'Cure every affliction at once.' },
  ether: { name: 'Mana Draught', job: 'chemist', jp: 80, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'mpheal', flat: 25 }], desc: 'Restore 25 MP.' },
  phoenixDown: { name: 'Dawn Feather', job: 'chemist', jp: 100, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', deadOnly: true,
    effects: [{ type: 'revive', pct: 0.25 }], desc: 'Revive a fallen ally with 25% HP.' },

  // Knight
  powerBreak: { name: 'Crippling Blow', job: 'knight', jp: 150, mp: 0, range: 'weapon', aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'statmod', stat: 'pa', amount: -2 }], desc: 'Strike and lower target PA by 2.' },
  speedBreak: { name: 'Hamstring', job: 'knight', jp: 200, mp: 0, range: 'weapon', aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'statmod', stat: 'spd', amount: -2 }], desc: 'Strike and lower target Speed by 2.' },
  magicBreak: { name: 'Spell Break', job: 'knight', jp: 150, mp: 0, range: 'weapon', aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'statmod', stat: 'ma', amount: -3 }], desc: 'Strike and lower target MA by 3.' },
  shieldBash: { name: 'Shield Bash', job: 'knight', jp: 250, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 5 }, { type: 'ctmod', amount: -30 }], desc: 'Bash the target and knock 30 off its Tempo.' },

  // Archer
  aim1: { name: 'Aim +1', job: 'archer', jp: 50, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 40, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 1 }], desc: 'A quick charged shot. Weapon power +1.' },
  aim3: { name: 'Aim +3', job: 'archer', jp: 120, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 25, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 3 }], desc: 'A charged shot. Weapon power +3.' },
  aim5: { name: 'Aim +5', job: 'archer', jp: 250, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 15, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 5 }], desc: 'A long charged shot. Weapon power +5.' },
  arrowRain: { name: 'Arrow Rain', job: 'archer', jp: 200, mp: 0, range: 4, aoe: 1, vert: 6, ct: 30, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }], desc: 'Fire a volley over an area. Ignores height.' },
  tame: { name: 'Tame', job: 'archer', jp: 150, mp: 0, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'support', affects: 'enemy',
    effects: [{ type: 'tame' }], desc: 'Win over a wild creature below half its health: the weaker it is, the surer the bond. It fights beside you at once, and follows the company off a field it has won.' },

  // Monk
  waveFist: { name: 'Shock Palm', job: 'monk', jp: 100, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 4 }], desc: 'Punch the air itself to strike at range.' },
  quakeFist: { name: 'Quake Fist', job: 'monk', jp: 180, mp: 0, range: 2, aoe: 1, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }], desc: 'Slam the ground, striking an area.' },
  chakra: { name: 'Inner Fire', job: 'monk', jp: 150, mp: 0, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'heal', formula: 'pa', power: 4 }, { type: 'mpheal', formula: 'pa', power: 1 }], desc: 'Restore HP and MP to yourself and adjacent allies.' },
  bloodRage: { name: 'Blood Rage', job: 'monk', jp: 200, mp: 0, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'berserk', hit: 100 }], desc: 'Give yourself over to the fight. You strike harder, but you no longer choose.' },
  revive: { name: 'Revive', job: 'monk', jp: 250, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'support', affects: 'ally', deadOnly: true,
    effects: [{ type: 'revive', pct: 0.3 }], desc: 'Revive an adjacent fallen ally with 30% HP.' },

  // Thief
  stealGil: { name: 'Steal Marks', job: 'thief', jp: 60, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'gil' }], desc: 'Steal marks equal to 20 x the target\'s level.' },
  poisonBlade: { name: 'Poison Blade', job: 'thief', jp: 120, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }, { type: 'status', status: 'poison', hit: 90 }], desc: 'A weapon strike that inflicts Poison.' },
  mug: { name: 'Mug', job: 'thief', jp: 200, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'gil' }], desc: 'Strike and steal marks in the same motion.' },

  // Cleric
  holyBolt: { name: 'Holy Bolt', job: 'whiteMage', jp: 260, mp: 14, range: 4, aoe: 0, vert: 3, ct: 18, kind: 'magic', affects: 'all', element: 'holy',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'Searing light. Undead and fell things burn.' },
  cure: { name: 'Mend', job: 'whiteMage', jp: 50, mp: 6, range: 4, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 4 }], desc: 'Restore HP to all in the area.' },
  cura: { name: 'Restore', job: 'whiteMage', jp: 180, mp: 12, range: 4, aoe: 1, vert: 3, ct: 18, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 8 }], desc: 'Restore a great deal of HP to all in the area.' },
  raise: { name: 'Raise', job: 'whiteMage', jp: 200, mp: 10, range: 4, aoe: 0, vert: 3, ct: 20, kind: 'magic', affects: 'ally', deadOnly: true,
    effects: [{ type: 'revive', pct: 0.4 }], desc: 'Revive a fallen ally with 40% HP.' },
  protect: { name: 'Protect', job: 'whiteMage', jp: 80, mp: 6, range: 3, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }], desc: 'Grant Protect (physical damage -1/3).' },
  shell: { name: 'Barrier', job: 'whiteMage', jp: 80, mp: 6, range: 3, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'status', status: 'shell', hit: 100 }], desc: 'Grant Barrier (magical damage -1/3).' },
  esuna: { name: 'Cleanse', job: 'whiteMage', jp: 200, mp: 10, range: 3, aoe: 1, vert: 3, ct: 22, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'cure', statuses: ['poison', 'slow', 'stop', 'silence', 'blind', 'berserk'] }],
    desc: 'Lift every affliction from all allies in the area.' },
  regen: { name: 'Regen', job: 'whiteMage', jp: 120, mp: 8, range: 3, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'status', status: 'regen', hit: 100 }], desc: 'Grant Regen (recover HP each turn).' },

  // Sorcerer
  fire: { name: 'Fire', job: 'blackMage', jp: 50, mp: 6, range: 4, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 5 }], desc: 'Burn all in the area.' },
  thunder: { name: 'Thunder', job: 'blackMage', jp: 80, mp: 8, range: 4, aoe: 0, vert: 8, ct: 22, kind: 'magic', affects: 'all', element: 'thunder',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }], desc: 'Strike a single target with lightning. Ignores height.' },
  blizzard: { name: 'Frost', job: 'blackMage', jp: 90, mp: 7, range: 4, aoe: 1, vert: 3, ct: 24, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 6 }], desc: 'Freeze all in the area.' },
  stone: { name: 'Stone', job: 'blackMage', jp: 140, mp: 9, range: 3, aoe: 1, vert: 1, ct: 20, kind: 'magic', affects: 'all', element: 'earth',
    effects: [{ type: 'damage', formula: 'ma', power: 7 }], desc: 'Tear up the ground beneath them. Cannot reach a different level.' },
  poisonSpell: { name: 'Poison', job: 'blackMage', jp: 80, mp: 4, range: 4, aoe: 1, vert: 3, ct: 30, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'poison', hit: 85 }], desc: 'Inflict Poison on all in the area.' },
  silenceSpell: { name: 'Silence', job: 'blackMage', jp: 160, mp: 8, range: 4, aoe: 1, vert: 3, ct: 22, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'silence', hit: 80 }], desc: 'Seal the voices of all in the area.' },
  fira: { name: 'Blaze', job: 'blackMage', jp: 220, mp: 12, range: 4, aoe: 1, vert: 3, ct: 15, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'A greater fire spell.' },
  flare: { name: 'Sunburst', job: 'blackMage', jp: 450, mp: 26, range: 4, aoe: 0, vert: 3, ct: 10, kind: 'magic', affects: 'all', element: null,
    effects: [{ type: 'damage', formula: 'ma', power: 15 }], desc: 'Annihilate a single target.' },

  // Chronomancer
  haste: { name: 'Haste', job: 'timeMage', jp: 100, mp: 8, range: 4, aoe: 1, vert: 3, ct: 20, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'status', status: 'haste', hit: 100 }], desc: 'Grant Haste to all in the area.' },
  slowSpell: { name: 'Slow', job: 'timeMage', jp: 100, mp: 8, range: 4, aoe: 1, vert: 3, ct: 20, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'slow', hit: 85 }], desc: 'Inflict Slow on all in the area.' },
  stopSpell: { name: 'Stop', job: 'timeMage', jp: 250, mp: 12, range: 4, aoe: 0, vert: 3, ct: 15, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'stop', hit: 70 }], desc: 'Freeze a target in time.' },
  quick: { name: 'Spur', job: 'timeMage', jp: 400, mp: 20, range: 4, aoe: 0, vert: 3, ct: 25, kind: 'magic', affects: 'ally', allowSelf: false,
    effects: [{ type: 'ctset', amount: 100 }], desc: 'Set an ally\'s Tempo to 100 for an immediate turn.' },

  // Ninja
  shuriken: { name: 'Shuriken', job: 'ninja', jp: 60, mp: 0, range: 4, aoe: 0, vert: 4, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 4 }], desc: 'Throw a bladed star.' },
  flameBomb: { name: 'Flame Bomb', job: 'ninja', jp: 150, mp: 0, range: 4, aoe: 1, vert: 4, ct: 0, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }], desc: 'Throw an alchemical bomb that bursts over an area.' },
  smoke: { name: 'Smoke', job: 'ninja', jp: 120, mp: 0, range: 3, aoe: 1, vert: 3, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'status', status: 'blind', hit: 80 }], desc: 'Choking smoke that blinds everyone in it.' },

  // Dragoon
  jump: { name: 'Jump', job: 'dragoon', jp: 100, mp: 0, range: 4, aoe: 0, vert: 9, ct: 30, kind: 'physical', affects: 'all', airborne: true,
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.5 }], desc: 'Leap skyward; crash down for 1.5x weapon damage. Untargetable while airborne.' },
  lancet: { name: 'Leech Lance', job: 'dragoon', jp: 150, mp: 0, range: 'weapon', aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'drain', formula: 'pa', power: 3 }], desc: 'Drain HP from the target.' },
  dragonRoar: { name: 'Dragon Roar', job: 'dragoon', jp: 250, mp: 0, range: 0, aoe: 2, vert: 3, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }], desc: 'A roar that grants Protect to nearby allies.' },

  // Samurai. Iaido is magickal in its reckoning and cares nothing for evasion
  // or for how the target stands; it costs MP rather than the blade.
  ashura: { name: 'Kestrel Draw', job: 'samurai', jp: 100, mp: 6, range: 2, aoe: 1, vert: 3, ct: 0, kind: 'magic', affects: 'all',
    effects: [{ type: 'damage', formula: 'ma', power: 5 }], desc: 'Draw and cut the air in an arc. Strikes an area; cannot be evaded.' },
  bizenBoat: { name: 'Tidebreaker', job: 'samurai', jp: 150, mp: 6, range: 2, aoe: 1, vert: 3, ct: 0, kind: 'magic', affects: 'all',
    effects: [{ type: 'mpdamage', formula: 'ma', power: 4 }], desc: 'A cut that bleeds MP rather than blood. Silences casters the slow way.' },
  kiyomori: { name: 'Sakura Ward', job: 'samurai', jp: 200, mp: 10, range: 0, aoe: 2, vert: 3, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }],
    desc: 'The blade\'s spirit wards you and every ally nearby with Protect and Barrier.' },
  muramasa: { name: 'Muramasa', job: 'samurai', jp: 350, mp: 14, range: 2, aoe: 1, vert: 3, ct: 0, kind: 'magic', affects: 'all', element: 'dark',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }, { type: 'status', status: 'blind', hit: 45 }],
    desc: 'The cursed blade. Heavy dark damage over an area, and some are left blinded by it.' },

  // Summoner. Spirits are wide and slow, and they know friend from foe.
  ifrit: { name: 'Cinder Djinn', job: 'summoner', jp: 120, mp: 16, range: 4, aoe: 2, vert: 4, ct: 14, kind: 'magic', affects: 'enemy', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }], desc: 'Call the fire spirit. Burns every enemy in a wide area; allies are spared.' },
  shiva: { name: 'Frost Maiden', job: 'summoner', jp: 120, mp: 16, range: 4, aoe: 2, vert: 4, ct: 14, kind: 'magic', affects: 'enemy', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }], desc: 'Call the ice spirit. Freezes every enemy in a wide area.' },
  ramuh: { name: 'Thunder Hermit', job: 'summoner', jp: 160, mp: 18, range: 4, aoe: 2, vert: 9, ct: 12, kind: 'magic', affects: 'enemy', element: 'thunder',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }], desc: 'Call the thunder spirit. Strikes from above; height is no shelter.' },
  titan: { name: 'Titan', job: 'summoner', jp: 220, mp: 20, range: 4, aoe: 2, vert: 1, ct: 10, kind: 'magic', affects: 'enemy', element: 'earth',
    effects: [{ type: 'damage', formula: 'ma', power: 10 }, { type: 'status', status: 'slow', hit: 35 }],
    desc: 'Call the earth spirit. The ground heaves under every enemy on the same level.' },
  moogle: { name: 'Hearth Spirit', job: 'summoner', jp: 100, mp: 12, range: 4, aoe: 2, vert: 4, ct: 14, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 6 }], desc: 'Call the little spirit. Mends every ally in a wide area.' },
  carbuncle: { name: 'Carbuncle', job: 'summoner', jp: 200, mp: 14, range: 4, aoe: 2, vert: 4, ct: 12, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'shell', hit: 100 }, { type: 'status', status: 'regen', hit: 100 }],
    desc: 'Call the gem spirit. Barrier and Regen for every ally in a wide area.' },

  // Geomancer. The land answers at once and asks no MP.
  tremor: { name: 'Tremor', job: 'geomancer', jp: 80, mp: 4, range: 4, aoe: 1, vert: 1, ct: 4, kind: 'magic', affects: 'all', element: 'earth',
    effects: [{ type: 'damage', formula: 'ma', power: 4 }, { type: 'status', status: 'slow', hit: 35 }],
    desc: 'Shake the ground under an area on your own level. Some are left Slowed.' },
  windSlash: { name: 'Wind Slash', job: 'geomancer', jp: 120, mp: 0, range: 4, aoe: 0, vert: 5, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 5 }], desc: 'A blade of wind that reaches four tiles and climbs.' },
  quicksand: { name: 'Quicksand', job: 'geomancer', jp: 200, mp: 4, range: 3, aoe: 1, vert: 1, ct: 4, kind: 'magic', affects: 'all', element: 'earth',
    effects: [{ type: 'damage', formula: 'ma', power: 3 }, { type: 'status', status: 'stop', hit: 30 }],
    desc: 'The ground turns to sand. Light damage, and some are held fast by Stop.' },
  torrent: { name: 'Torrent', job: 'geomancer', jp: 160, mp: 4, range: 4, aoe: 1, vert: 3, ct: 4, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 4 }, { type: 'status', status: 'silence', hit: 35 }],
    desc: 'A wall of cold water over an area. Some come up unable to speak.' },

  // Bard. Songs carry to everyone within earshot of the singer.
  battleSong: { name: 'March of Steel', job: 'bard', jp: 100, mp: 6, range: 0, aoe: 3, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'pa', amount: 1 }], desc: 'A marching song. PA +1 for every ally within three tiles, for the battle.' },
  lifeSong: { name: 'Hearth Hymn', job: 'bard', jp: 120, mp: 8, range: 0, aoe: 3, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'heal', formula: 'ma', power: 3 }], desc: 'A song of mending. Restores HP to every ally within three tiles.' },
  angelSong: { name: 'Lullaby of Dawn', job: 'bard', jp: 180, mp: 0, range: 0, aoe: 3, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'mpheal', formula: 'ma', power: 2 }], desc: 'A song that gives back what casting takes. MP to every ally within three tiles.' },
  namelessSong: { name: 'The Unwritten Verse', job: 'bard', jp: 300, mp: 14, range: 0, aoe: 2, vert: 4, ct: 20, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'haste', hit: 100 }], desc: 'The old song. Haste for every ally within two tiles, once it is sung through.' },

  // Paladin
  holyStrike: { name: 'Holy Strike', job: 'paladin', jp: 150, mp: 6, range: 'weapon', aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'all', element: 'holy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 3 }], desc: 'A blow wreathed in light. Weapon power +3, and holy.' },
  sanctuary: { name: 'Sanctuary', job: 'paladin', jp: 200, mp: 12, range: 0, aoe: 2, vert: 3, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'heal', formula: 'ma', power: 4 }, { type: 'status', status: 'protect', hit: 100 }],
    desc: 'A prayer over the ground you hold. Heals and grants Protect to every ally within two tiles.' },
  judgment: { name: 'Judgment', job: 'paladin', jp: 300, mp: 14, range: 3, aoe: 1, vert: 4, ct: 12, kind: 'magic', affects: 'all', element: 'holy',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }, { type: 'status', status: 'silence', hit: 50 }],
    desc: 'Light falls on an area. Holy damage, and half of those struck are silenced.' },
  oath: { name: 'Oath', job: 'paladin', jp: 250, mp: 10, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'regen', hit: 100 }, { type: 'statmod', stat: 'pa', amount: 2 }],
    desc: 'Swear it again. Regen, and PA +2 for the rest of the battle.' },

  // Arcanist
  meteor: { name: 'Meteor', job: 'arcanist', jp: 400, mp: 28, range: 4, aoe: 2, vert: 9, ct: 8, kind: 'magic', affects: 'all', element: null,
    effects: [{ type: 'damage', formula: 'ma', power: 12 }], desc: 'Pull a stone down out of the sky. Slow, wide, and it does not care who is underneath.' },
  gravity: { name: 'Gravity', job: 'arcanist', jp: 200, mp: 12, range: 4, aoe: 1, vert: 9, ct: 18, kind: 'magic', affects: 'all', element: null,
    effects: [{ type: 'damage', formula: 'targetpct', power: 0.3 }], desc: 'Takes three tenths of what each target has left, however much that is.' },
  drainSoul: { name: 'Drain Soul', job: 'arcanist', jp: 180, mp: 0, range: 3, aoe: 0, vert: 4, ct: 16, kind: 'magic', affects: 'enemy', element: 'dark',
    effects: [{ type: 'mpdrain', formula: 'ma', power: 4 }], desc: 'Drink a foe\'s MP into your own. Costs nothing; that is the point.' },
  doomBolt: { name: 'Doom Bolt', job: 'arcanist', jp: 250, mp: 16, range: 4, aoe: 0, vert: 8, ct: 14, kind: 'magic', affects: 'all', element: 'dark',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }, { type: 'status', status: 'slow', hit: 60 }],
    desc: 'Dark lightning from above. Heavy damage, and most who survive it are Slowed.' },

  // Assassin
  shadowstitch: { name: 'Shadowstitch', job: 'assassin', jp: 150, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }, { type: 'status', status: 'stop', hit: 50 }],
    desc: 'Pin the shadow to the ground. A weapon strike; half the time the target is Stopped.' },
  assassinate: { name: 'Assassinate', job: 'assassin', jp: 400, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'slay', hit: 35 }], desc: 'One cut, in the right place. Fells the target outright a third of the time; commanders are made of sterner stuff.' },
  vanish: { name: 'Vanish', job: 'assassin', jp: 200, mp: 0, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'evade', amount: 30 }], desc: 'Step out of sight. Evasion +30 for the rest of the battle.' },
  smokeStep: { name: 'Smoke Step', job: 'assassin', jp: 120, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'statmod', stat: 'spd', amount: 2 }, { type: 'statmod', stat: 'move', amount: 1 }],
    desc: 'Teach an ally the quick way. Speed +2 and Move +1 for the rest of the battle.' },

  // Sage
  holy: { name: 'Holy', job: 'sage', jp: 350, mp: 24, range: 4, aoe: 1, vert: 4, ct: 12, kind: 'magic', affects: 'all', element: 'holy',
    effects: [{ type: 'damage', formula: 'ma', power: 12 }], desc: 'The white spell. Holy ruin over an area.' },
  fullLife: { name: 'Resurrection', job: 'sage', jp: 300, mp: 20, range: 4, aoe: 0, vert: 4, ct: 14, kind: 'magic', affects: 'ally', deadOnly: true,
    effects: [{ type: 'revive', pct: 1.0 }], desc: 'Bring a fallen ally back with every point of HP.' },
  reraise: { name: 'Second Breath', job: 'sage', jp: 400, mp: 18, range: 3, aoe: 0, vert: 4, ct: 16, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'reraise', hit: 100 }], desc: 'A life held in reserve. The first time the target falls, it rises with a quarter of its HP.' },
  ultima: { name: 'Sundering', job: 'sage', jp: 600, mp: 36, range: 4, aoe: 2, vert: 9, ct: 6, kind: 'magic', affects: 'enemy', element: null,
    effects: [{ type: 'damage', formula: 'ma', power: 18 }], desc: 'The last spell. Wide, slow, and it knows friend from foe.' },

  // Dragonlord
  dragonBreath: { name: 'Dragon Breath', job: 'dragonlord', jp: 250, mp: 14, range: 3, aoe: 2, vert: 4, ct: 0, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'Fire from the throat, at once, over a wide area. It does not ask who is standing in it.' },
  skyRend: { name: 'Sky Rend', job: 'dragonlord', jp: 400, mp: 0, range: 5, aoe: 1, vert: 9, ct: 24, kind: 'physical', affects: 'all', airborne: true,
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.8 }], desc: 'Leap beyond sight and fall on an area for 1.8x weapon damage. Untargetable while airborne.' },
  scaleWard: { name: 'Scale Ward', job: 'dragonlord', jp: 300, mp: 12, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }, { type: 'status', status: 'regen', hit: 100 }],
    desc: 'Scales over skin. Protect, Barrier and Regen on yourself at once.' },
  roarOfKings: { name: 'Roar of Kings', job: 'dragonlord', jp: 500, mp: 16, range: 0, aoe: 2, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'pa', amount: 2 }, { type: 'statmod', stat: 'spd', amount: 1 }],
    desc: 'A roar the whole field hears. PA +2 and Speed +1 for every ally within two tiles, for the battle.' },

  // Hierophant
  starfall: { name: 'Starfall', job: 'hierophant', jp: 600, mp: 32, range: 4, aoe: 2, vert: 9, ct: 8, kind: 'magic', affects: 'enemy', element: null,
    effects: [{ type: 'damage', formula: 'ma', power: 16 }], desc: 'Pull the stars down on a wide area. The spirits of the sky spare your own.' },
  ascension: { name: 'Ascension', job: 'hierophant', jp: 500, mp: 30, range: 4, aoe: 2, vert: 9, ct: 16, kind: 'magic', affects: 'ally', deadOnly: true,
    effects: [{ type: 'revive', pct: 0.5 }], desc: 'Every fallen ally within the area rises with half their HP.' },
  aegis: { name: 'Aegis', job: 'hierophant', jp: 450, mp: 26, range: 3, aoe: 2, vert: 4, ct: 14, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'reraise', hit: 100 }, { type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }],
    desc: 'Second Breath, Protect and Barrier on every ally in a wide area. Nothing in it dies today.' },
  timeStop: { name: 'Time Stop', job: 'hierophant', jp: 400, mp: 20, range: 4, aoe: 1, vert: 4, ct: 12, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'stop', hit: 80 }], desc: 'Tell time to wait. Most of those in the area are Stopped.' },

  // Fell Knight
  fellSlash: { name: 'Fell Slash', job: 'fellKnight', jp: 250, mp: 6, range: 'weapon', aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy', element: 'dark',
    effects: [{ type: 'drain', formula: 'pa', power: 'weapon', bonus: 2 }], desc: 'A draining cut with the weapon in hand, and dark.' },
  abyss: { name: 'Abyss', job: 'fellKnight', jp: 400, mp: 18, range: 3, aoe: 2, vert: 4, ct: 10, kind: 'magic', affects: 'all', element: 'dark',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'The floor opens. Dark damage over a wide area, friend and foe alike.' },
  soulRend: { name: 'Soul Rend', job: 'fellKnight', jp: 350, mp: 10, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'magic', affects: 'enemy', element: 'dark',
    effects: [{ type: 'damage', formula: 'ma', power: 6 }, { type: 'mpdamage', formula: 'ma', power: 4 }],
    desc: 'Tears at body and mind both: dark damage, and MP burned away.' },
  darkPact: { name: 'Dark Pact', job: 'fellKnight', jp: 500, mp: 20, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'pa', amount: 3 }, { type: 'statmod', stat: 'ma', amount: 3 }],
    desc: 'Sign it again. PA +3 and MA +3 for the rest of the battle.' },

  // Corsair
  boarding: { name: 'Boarding', job: 'corsair', jp: 150, mp: 4, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 2 }], desc: 'Cross the deck in a bound and cut on landing: weapon damage at two tiles.' },
  plunder: { name: 'Plunder', job: 'corsair', jp: 200, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 4 }, { type: 'gil' }], desc: 'A cut, and a hand in the purse while they look at the cut.' },
  broadside: { name: 'Broadside', job: 'corsair', jp: 350, mp: 8, range: 4, aoe: 1, vert: 9, ct: 6, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 7 }], desc: 'Every pistol on the belt at once. Physical damage over an area, at range.' },
  seaLegs: { name: 'Sea Legs', job: 'corsair', jp: 300, mp: 8, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'haste', hit: 100 }, { type: 'statmod', stat: 'evade', amount: 8 }], desc: 'Nothing under you is steady, so nothing surprises you. Haste, and Evade +8.' },

  // Tidecaller
  undertow: { name: 'Undertow', job: 'tidecaller', jp: 120, mp: 10, range: 4, aoe: 1, vert: 4, ct: 6, kind: 'magic', affects: 'all', element: 'water',
    effects: [{ type: 'damage', formula: 'ma', power: 7 }, { type: 'status', status: 'slow', hit: 50 }], desc: 'The sea pulls at the feet of everyone in the area: water damage, and half are Slowed.' },
  tidalWave: { name: 'Tidal Wave', job: 'tidecaller', jp: 400, mp: 24, range: 4, aoe: 2, vert: 9, ct: 12, kind: 'magic', affects: 'all', element: 'water',
    effects: [{ type: 'damage', formula: 'ma', power: 12 }], desc: 'The whole sea, called in over a wide area, friend and foe alike.' },
  brine: { name: 'Brine', job: 'tidecaller', jp: 200, mp: 12, range: 3, aoe: 0, vert: 4, ct: 4, kind: 'magic', affects: 'enemy', element: 'water',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }, { type: 'status', status: 'poison', hit: 70 }], desc: 'Salt water where it does the most harm. Water damage, and likely Poison.' },
  saltWard: { name: 'Salt Ward', job: 'tidecaller', jp: 250, mp: 12, range: 3, aoe: 1, vert: 4, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'shell', hit: 100 }, { type: 'status', status: 'regen', hit: 100 }], desc: 'A line of salt around allies in the area: Barrier and Regen.' },

  // Harpooner
  harpoon: { name: 'Harpoon', job: 'harpooner', jp: 120, mp: 4, range: 3, aoe: 0, vert: 4, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }, { type: 'status', status: 'slow', hit: 60 }], desc: 'Thrown, with a line on it. Weapon damage at three tiles, and the target is likely Slowed.' },
  whaleslayer: { name: 'Whaleslayer', job: 'harpooner', jp: 350, mp: 8, range: 'weapon', aoe: 0, vert: 'weapon', ct: 8, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 7 }], desc: 'Both hands, all the way in. A charged strike for weapon power and a great deal more.' },
  barb: { name: 'Barb', job: 'harpooner', jp: 200, mp: 6, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 4 }, { type: 'status', status: 'poison', hit: 80 }], desc: 'A barbed head that stays in. Damage, and the wound keeps bleeding: Poison.' },
  reel: { name: 'Reel', job: 'harpooner', jp: 260, mp: 6, range: 3, aoe: 0, vert: 4, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'ctmod', amount: -30 }], desc: 'Haul on the line. A little damage, and the target loses 30 Tempo fighting it.' },

  // The sea's dead
  brineCut: { name: 'Brine Cut', job: 'drownedKnight', jp: 0, mp: 6, range: 'weapon', aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy', element: 'water',
    effects: [{ type: 'drain', formula: 'pa', power: 'weapon', bonus: 1 }], desc: 'A cut that takes the water out of the wound and into the knight.' },
  anchorFall: { name: 'Anchor Fall', job: 'drownedKnight', jp: 0, mp: 8, range: 2, aoe: 0, vert: 4, ct: 4, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 9 }, { type: 'status', status: 'slow', hit: 60 }], desc: 'The weight of everything drowned, brought down on one target. Damage, and likely Slow.' },
  riptide: { name: 'Riptide', job: 'drownedKnight', jp: 0, mp: 10, range: 3, aoe: 1, vert: 4, ct: 6, kind: 'magic', affects: 'all', element: 'water',
    effects: [{ type: 'damage', formula: 'ma', power: 7 }], desc: 'The current under the calm. Water damage over an area.' },
  hymnOfTheDeep: { name: 'Hymn of the Deep', job: 'saltPriest', jp: 0, mp: 16, range: 3, aoe: 1, vert: 9, ct: 8, kind: 'magic', affects: 'enemy',
    effects: [{ type: 'status', status: 'berserk', hit: 60 }, { type: 'status', status: 'blind', hit: 40 }], desc: 'The song the sailors heard. Those in the area are likely Berserk, and some are Blinded.' },
  lure: { name: 'Lure', job: 'siren', jp: 0, mp: 6, range: 3, aoe: 0, vert: 9, ct: 0, kind: 'magic', affects: 'enemy',
    effects: [{ type: 'mpdrain', formula: 'ma', power: 5 }], desc: 'A promise nobody can quite hear. MP drained from the target.' },
  sirenSong: { name: 'Siren Song', job: 'siren', jp: 0, mp: 14, range: 3, aoe: 1, vert: 9, ct: 8, kind: 'magic', affects: 'enemy',
    effects: [{ type: 'status', status: 'berserk', hit: 55 }], desc: 'Those in the area are likely to go for the nearest throat, friend or not.' },
  drown: { name: 'Drown', job: 'siren', jp: 0, mp: 10, range: 3, aoe: 0, vert: 9, ct: 6, kind: 'magic', affects: 'enemy', element: 'water',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }, { type: 'status', status: 'silence', hit: 50 }], desc: 'Water where the breath goes. Water damage, and an even chance of Silence.' },
  pincer: { name: 'Pincer', job: 'reefCrab', jp: 0, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 8 }, { type: 'status', status: 'stop', hit: 35 }], desc: 'Caught, and held. Damage, and a fair chance of Stop.' },
  shellUp: { name: 'Shell Up', job: 'reefCrab', jp: 0, mp: 4, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }], desc: 'Down under the shell. Protect and Barrier.' },
  maelstrom: { name: 'Maelstrom', job: 'leviathan', jp: 0, mp: 20, range: 4, aoe: 2, vert: 9, ct: 12, kind: 'magic', affects: 'all', element: 'water',
    effects: [{ type: 'damage', formula: 'ma', power: 11 }], desc: 'The sea turned in a circle over a wide area, and everything in it.' },
  crush: { name: 'Crush', job: 'leviathan', jp: 0, mp: 0, range: 1, aoe: 0, vert: 4, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 12 }], desc: 'Coils. Heavy damage to one target.' },

  // Marshal
  orders: { name: 'Orders', job: 'marshal', jp: 200, mp: 8, range: 0, aoe: 2, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'ctmod', amount: 15 }, { type: 'statmod', stat: 'pa', amount: 1 }], desc: 'A word to everyone within two tiles: 15 Tempo and PA +1.' },
  holdTheLine: { name: 'Hold the Line', job: 'marshal', jp: 250, mp: 10, range: 0, aoe: 2, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }], desc: 'Protect on every ally within two tiles, yourself included.' },
  charge: { name: 'Charge', job: 'marshal', jp: 150, mp: 4, range: 2, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 3 }], desc: 'Two tiles of ground covered in a stride, and the weapon at the end of it.' },
  rallyingCry: { name: 'Rallying Cry', job: 'marshal', jp: 350, mp: 14, range: 0, aoe: 2, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'cure', statuses: ['slow', 'stop', 'silence', 'blind', 'berserk'] }, { type: 'status', status: 'haste', hit: 50 }], desc: 'Shakes the line awake: Slow, Stop, Silence, Blind and Berserk lifted from allies nearby, and half of them Hasted.' },

  // Inquisitor
  judgement: { name: 'Judgement', job: 'inquisitor', jp: 150, mp: 12, range: 3, aoe: 0, vert: 4, ct: 4, kind: 'magic', affects: 'enemy', element: 'holy',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'Holy light on one foe, quick to pronounce.' },
  sealMagic: { name: 'Seal Magic', job: 'inquisitor', jp: 200, mp: 10, range: 3, aoe: 0, vert: 4, ct: 4, kind: 'magic', affects: 'enemy',
    effects: [{ type: 'status', status: 'silence', hit: 80 }, { type: 'mpdamage', formula: 'ma', power: 4 }], desc: 'Likely Silence, and MP burned away with it.' },
  purge: { name: 'Purge', job: 'inquisitor', jp: 250, mp: 10, range: 3, aoe: 1, vert: 4, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'cure', statuses: ['poison', 'slow', 'stop', 'silence', 'blind', 'berserk'] }, { type: 'heal', formula: 'ma', power: 3 }], desc: 'Every affliction burned off allies in the area, and a little healing behind it.' },
  brand: { name: 'Brand', job: 'inquisitor', jp: 400, mp: 20, range: 3, aoe: 1, vert: 4, ct: 8, kind: 'magic', affects: 'enemy', element: 'holy',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }, { type: 'status', status: 'berserk', hit: 40 }], desc: 'Holy fire over an area, and some of those in it lose their heads to it.' },

  // Duelist
  lunge: { name: 'Lunge', job: 'duelist', jp: 120, mp: 4, range: 2, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 3 }], desc: 'The blade at full reach: weapon damage at two tiles.' },
  feint: { name: 'Feint', job: 'duelist', jp: 200, mp: 6, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 4 }, { type: 'status', status: 'blind', hit: 65 }], desc: 'A cut they never saw. Damage, and likely Blind.' },
  enGarde: { name: 'En Garde', job: 'duelist', jp: 250, mp: 6, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'evade', amount: 12 }, { type: 'statmod', stat: 'spd', amount: 1 }], desc: 'The stance. Evade +12 and Speed +1 for the rest of the battle.' },
  coupDeGrace: { name: 'Coup de Grace', job: 'duelist', jp: 400, mp: 12, range: 'weapon', aoe: 0, vert: 'weapon', ct: 6, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'targetpct', power: 0.5 }], desc: 'A charged thrust that takes half of whatever the target has left, however much that is.' },

  // The crown's servants
  shieldWall: { name: 'Shield Wall', job: 'royalGuard', jp: 0, mp: 4, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }], desc: 'Braced behind the shield: Protect.' },
  halberdSweep: { name: 'Halberd Sweep', job: 'royalGuard', jp: 0, mp: 6, range: 0, aoe: 1, vert: 3, ct: 0, kind: 'physical', affects: 'enemy', self: true,
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }], desc: 'The halberd swung round: weapon damage on every foe adjacent.' },
  guardsOath: { name: 'Guard\'s Oath', job: 'royalGuard', jp: 0, mp: 8, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 2 }, { type: 'status', status: 'slow', hit: 40 }], desc: 'The halberd\'s reach, and a fair chance the target is Slowed.' },
  brace: { name: 'Dig In', job: 'mercenary', jp: 0, mp: 4, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'statmod', stat: 'evade', amount: 5 }], desc: 'Protect and Evade +5. A sellsword lives to be paid.' },
  sellswordCut: { name: 'Sellsword Cut', job: 'mercenary', jp: 0, mp: 4, range: 'weapon', aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 2 }, { type: 'gil' }], desc: 'A cut, and a hand in the purse.' },
  dive: { name: 'Dive', job: 'griffon', jp: 0, mp: 6, range: 3, aoe: 0, vert: 9, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 2 }], desc: 'Out of the sky onto one target, from any height.' },
  screech: { name: 'Screech', job: 'griffon', jp: 0, mp: 8, range: 0, aoe: 2, vert: 9, ct: 0, kind: 'magic', affects: 'enemy', self: true,
    effects: [{ type: 'status', status: 'slow', hit: 50 }], desc: 'A cry that stops the heart. Half of those within two tiles are Slowed.' },
  slam: { name: 'Slam', job: 'golem', jp: 0, mp: 0, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'physical', affects: 'enemy', self: true,
    effects: [{ type: 'damage', formula: 'pa', power: 10 }], desc: 'Both fists on the ground. Damage to every foe adjacent.' },
  stoneskin: { name: 'Stoneskin', job: 'golem', jp: 0, mp: 4, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }], desc: 'Protect and Barrier. It was a statue once.' },
  quake: { name: 'Quake', job: 'golem', jp: 0, mp: 12, range: 3, aoe: 2, vert: 2, ct: 8, kind: 'magic', affects: 'all', element: 'earth',
    effects: [{ type: 'damage', formula: 'ma', power: 10 }], desc: 'The ground heaves over a wide area, friend and foe alike.' },
  verdict: { name: 'Verdict', job: 'chancellor', jp: 0, mp: 16, range: 3, aoe: 1, vert: 4, ct: 6, kind: 'magic', affects: 'enemy', element: 'dark',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }, { type: 'status', status: 'stop', hit: 30 }], desc: 'Dark judgement over an area, and some in it are Stopped.' },

  // Monsters
  // Frostweaver
  rime: { name: 'Rime', job: 'frostweaver', jp: 100, mp: 10, range: 4, aoe: 1, vert: 4, ct: 6, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 7 }], desc: 'Frost over an area, quick to cast.' },
  glaciate: { name: 'Glaciate', job: 'frostweaver', jp: 250, mp: 14, range: 3, aoe: 0, vert: 4, ct: 10, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }, { type: 'status', status: 'stop', hit: 50 }], desc: 'Ice damage, and an even chance the target is Stopped in it.' },
  hoarfrost: { name: 'Hoarfrost', job: 'frostweaver', jp: 200, mp: 12, range: 3, aoe: 1, vert: 4, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'shell', hit: 100 }, { type: 'statmod', stat: 'evade', amount: 5 }], desc: 'A skin of frost over allies in the area: Barrier, and Evade +5.' },
  whiteout: { name: 'Whiteout', job: 'frostweaver', jp: 400, mp: 18, range: 4, aoe: 2, vert: 9, ct: 12, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'blind', hit: 70 }, { type: 'status', status: 'slow', hit: 50 }], desc: 'Snow so thick nobody sees or hurries. Blind and Slow over a wide area.' },

  // Warden
  pin: { name: 'Pin', job: 'warden', jp: 100, mp: 4, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }, { type: 'status', status: 'stop', hit: 40 }], desc: 'Weapon damage, and a fair chance the target is pinned: Stopped.' },
  wardPost: { name: 'Ward Post', job: 'warden', jp: 150, mp: 6, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'statmod', stat: 'evade', amount: 10 }], desc: 'Take a post and hold it. Protect, and Evade +10.' },
  rally: { name: 'Rally', job: 'warden', jp: 300, mp: 10, range: 0, aoe: 2, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'ctmod', amount: 20 }], desc: 'A voice the line can hear. Every ally within two tiles gains 20 Tempo.' },
  volley: { name: 'Volley', job: 'warden', jp: 350, mp: 0, range: 4, aoe: 1, vert: 9, ct: 14, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 0.9 }], desc: 'Spears in the air, down on an area, after a charge.' },

  // Runeblade
  runecut: { name: 'Runecut', job: 'runeblade', jp: 150, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }, { type: 'mpdamage', formula: 'ma', power: 4 }], desc: 'A cut that reads the target\'s runes back at it: weapon damage, and MP burned.' },
  frostbrand: { name: 'Frostbrand', job: 'runeblade', jp: 250, mp: 6, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.3 }], desc: 'The blade burns cold. 1.3x weapon damage, as ice.' },
  starWard: { name: 'Star Ward', job: 'runeblade', jp: 400, mp: 20, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'reraise', hit: 100 }, { type: 'status', status: 'protect', hit: 100 }], desc: 'The star-iron does not stay down. Second Breath and Protect on yourself.' },
  nova: { name: 'Nova', job: 'runeblade', jp: 500, mp: 22, range: 3, aoe: 2, vert: 4, ct: 12, kind: 'magic', affects: 'all', element: null,
    effects: [{ type: 'damage', formula: 'ma', power: 11 }], desc: 'What the star did when it fell, in small. Heavy damage over a wide area, of no element.' },

  // The Court
  hollowStrike: { name: 'Hollow Strike', job: 'hollowKnight', jp: 0, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'pa', power: 8 }], desc: 'A blow with the cold in it.' },
  colddrain: { name: 'Cold Drain', job: 'hollowKnight', jp: 0, mp: 6, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'magic', affects: 'enemy',
    effects: [{ type: 'mpdrain', formula: 'ma', power: 5 }], desc: 'Draws the warmth, and the magic, out of a target.' },
  chill: { name: 'Chill', job: 'rimeWight', jp: 0, mp: 6, range: 3, aoe: 0, vert: 4, ct: 4, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 6 }, { type: 'status', status: 'slow', hit: 40 }], desc: 'Ice damage, and often Slow.' },
  graspOfIce: { name: 'Grasp of Ice', job: 'rimeWight', jp: 0, mp: 8, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'magic', affects: 'enemy', element: 'ice',
    effects: [{ type: 'drain', formula: 'ma', power: 7 }], desc: 'A hand from the ice that takes and keeps.' },
  frostBreath: { name: 'Frost Breath', job: 'iceDrake', jp: 0, mp: 10, range: 3, aoe: 1, vert: 4, ct: 8, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'Breath that freezes an area.' },
  wingBuffet: { name: 'Wing Buffet', job: 'iceDrake', jp: 0, mp: 0, range: 0, aoe: 1, vert: 3, ct: 0, kind: 'physical', affects: 'enemy', self: true,
    effects: [{ type: 'damage', formula: 'pa', power: 6 }, { type: 'ctmod', amount: -20 }], desc: 'Wings on everything close: damage, and 20 Tempo lost.' },
  tailSweep: { name: 'Tail Sweep', job: 'iceDrake', jp: 0, mp: 0, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 9 }], desc: 'A tail the length of a bridge.' },
  absoluteZero: { name: 'Absolute Zero', job: 'winterRegent', jp: 0, mp: 30, range: 4, aoe: 2, vert: 9, ct: 14, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 10 }, { type: 'status', status: 'slow', hit: 50 }], desc: 'The cold at the bottom of everything, over a wide area.' },
  hunger: { name: 'Hunger', job: 'namelessCold', jp: 0, mp: 10, range: 0, aoe: 1, vert: 9, ct: 0, kind: 'magic', affects: 'enemy', self: true, element: 'ice',
    effects: [{ type: 'drain', formula: 'ma', power: 9 }], desc: 'It eats what is close.' },
  stillness: { name: 'Stillness', job: 'namelessCold', jp: 0, mp: 16, range: 3, aoe: 2, vert: 9, ct: 10, kind: 'magic', affects: 'enemy',
    effects: [{ type: 'status', status: 'stop', hit: 60 }], desc: 'Everything in the area is likely Stopped.' },
  unmake: { name: 'Unmake', job: 'namelessCold', jp: 0, mp: 20, range: 2, aoe: 0, vert: 9, ct: 16, kind: 'magic', affects: 'enemy',
    effects: [{ type: 'slay', hit: 25 }], desc: 'A quarter of the time, the target simply is not any more.' },
  // Engineer
  repair: { name: 'Repair', job: 'engineer', jp: 100, mp: 6, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 7 }, { type: 'status', status: 'regen', hit: 100 }], desc: 'Patch what is broken, flesh or brass. Heals, and leaves Regen behind.' },
  oilSlick: { name: 'Oil Slick', job: 'engineer', jp: 150, mp: 8, range: 3, aoe: 1, vert: 2, ct: 6, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'slow', hit: 70 }], desc: 'Oil underfoot. Everyone in the area is likely Slowed.' },
  steamVent: { name: 'Steam Vent', job: 'engineer', jp: 250, mp: 10, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'magic', affects: 'enemy', self: true, element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 7 }], desc: 'Open the valve. Scalding fire damage all around you, at once.' },
  overclock: { name: 'Overclock', job: 'engineer', jp: 400, mp: 12, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'support', affects: 'ally',
    effects: [{ type: 'status', status: 'haste', hit: 100 }, { type: 'statmod', stat: 'spd', amount: 1 }], desc: 'Wind them tighter. Haste and Speed +1 on an ally.' },

  // Gunner
  aimedShot: { name: 'Aimed Shot', job: 'gunner', jp: 100, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 20, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.6 }], desc: 'Breathe out, then fire. 1.6x weapon damage after a short charge.' },
  scattershot: { name: 'Scattershot', job: 'gunner', jp: 200, mp: 0, range: 2, aoe: 1, vert: 3, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 0.8 }], desc: 'A spread of shot over a small area, close in. Friends in it are not spared.' },
  legShot: { name: 'Leg Shot', job: 'gunner', jp: 250, mp: 4, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }, { type: 'status', status: 'slow', hit: 60 }], desc: 'Weapon damage, and a fair chance the target is Slowed.' },
  suppress: { name: 'Suppressing Fire', job: 'gunner', jp: 350, mp: 6, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 0.6 }, { type: 'ctmod', amount: -30 }], desc: 'Keep their head down. Light damage, and the target loses 30 Tempo.' },

  // Aeronaut
  bombingRun: { name: 'Bombing Run', job: 'aeronaut', jp: 200, mp: 10, range: 5, aoe: 1, vert: 9, ct: 20, kind: 'magic', affects: 'all', airborne: true, element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }], desc: 'Up on the balloon, and down comes fire on an area. Untargetable while aloft.' },
  signalFlare: { name: 'Signal Flare', job: 'aeronaut', jp: 150, mp: 8, range: 4, aoe: 1, vert: 9, ct: 4, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'blind', hit: 80 }], desc: 'A magnesium flare bursts over the area. Most in it are Blinded.' },
  updraft: { name: 'Updraft', job: 'aeronaut', jp: 250, mp: 6, range: 2, aoe: 0, vert: 9, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'statmod', stat: 'move', amount: 1 }, { type: 'statmod', stat: 'jump', amount: 2 }], desc: 'A gust under an ally: Move +1 and Jump +2 for the battle.' },
  grapnel: { name: 'Grapnel', job: 'aeronaut', jp: 300, mp: 0, range: 3, aoe: 0, vert: 9, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 6 }], desc: 'A hook on a line, from any height at all.' },

  // Artificer
  teslaCoil: { name: 'Tesla Coil', job: 'artificer', jp: 300, mp: 20, range: 3, aoe: 2, vert: 4, ct: 10, kind: 'magic', affects: 'all', element: 'thunder',
    effects: [{ type: 'damage', formula: 'ma', power: 10 }], desc: 'Lightning over a wide area. Brass conducts.' },
  aetherShield: { name: 'Aether Shield', job: 'artificer', jp: 350, mp: 16, range: 3, aoe: 1, vert: 4, ct: 8, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }], desc: 'A humming field over the area: Protect and Barrier on every ally in it.' },
  gearstorm: { name: 'Gearstorm', job: 'artificer', jp: 450, mp: 12, range: 3, aoe: 2, vert: 3, ct: 14, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.2 }], desc: 'A cloud of spinning gears over a wide area. 1.2x weapon damage to all in it.' },
  overdrive: { name: 'Overdrive', job: 'artificer', jp: 500, mp: 24, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'haste', hit: 100 }, { type: 'statmod', stat: 'pa', amount: 2 }, { type: 'statmod', stat: 'ma', amount: 2 }, { type: 'statmod', stat: 'spd', amount: 2 }],
    desc: 'Everything past the red line. Haste, and PA, MA and Speed +2, for the battle.' },

  // ---- The second studies: two more skills for every trade, learned last ----
  // Each job's kit ends with these, so an enemy who knows only the first few
  // things of a trade never has them, and a boss, who knows everything, does.
  // Footman
  dustKick: { name: 'Dust Kick', job: 'squire', jp: 120, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 2 }, { type: 'status', status: 'blind', hit: 55 }], desc: 'Grit in the eyes. A little damage, and an even chance of Blind.' },
  holdGround: { name: 'Hold Ground', job: 'squire', jp: 180, mp: 0, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'evade', amount: 8 }], desc: 'Feet set, weight low. Evade +8 for the rest of the battle.' },
  // Apothecary
  xPotion: { name: 'Grand Potion', job: 'chemist', jp: 320, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', flat: 150 }], desc: 'Restore 150 HP.' },
  echoHerbs: { name: 'Echo Herbs', job: 'chemist', jp: 90, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'cure', statuses: ['silence', 'blind'] }], desc: 'Cure Silence and Blind.' },
  // Knight
  sunder: { name: 'Sunder Armour', job: 'knight', jp: 220, mp: 0, range: 'weapon', aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'statmod', stat: 'evade', amount: -10 }], desc: 'Strike at the straps. Damage, and the target\'s Evade falls by 10.' },
  cleave: { name: 'Cleave', job: 'knight', jp: 300, mp: 0, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'physical', affects: 'enemy', self: true,
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 0.8 }], desc: 'One wide swing. Weapon damage, a little lighter, on every foe adjacent.' },
  // Archer
  pinningShot: { name: 'Pinning Shot', job: 'archer', jp: 220, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 12, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }, { type: 'status', status: 'stop', hit: 35 }], desc: 'Through the foot and into the ground. Weapon damage after a short charge, and a fair chance of Stop.' },
  eagleEye: { name: 'Eagle Eye', job: 'archer', jp: 180, mp: 0, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'evade', amount: 10 }, { type: 'statmod', stat: 'spd', amount: 1 }], desc: 'See them coming. Evade +10 and Speed +1 for the rest of the battle.' },
  // Monk
  pressurePoint: { name: 'Pressure Point', job: 'monk', jp: 220, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'status', status: 'silence', hit: 65 }], desc: 'Two fingers at the throat. Damage, and likely Silence.' },
  whirlwindKick: { name: 'Whirlwind Kick', job: 'monk', jp: 300, mp: 0, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'physical', affects: 'enemy', self: true,
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'ctmod', amount: -10 }], desc: 'A spinning kick at everyone close. Damage, and 10 Tempo knocked off each.' },
  // Thief
  sneakAttack: { name: 'Sneak Attack', job: 'thief', jp: 260, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.4 }], desc: 'Where they are not looking. 1.4x weapon damage; get behind them first and it cannot be evaded.' },
  caltrops: { name: 'Caltrops', job: 'thief', jp: 180, mp: 0, range: 3, aoe: 1, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 1 }, { type: 'status', status: 'slow', hit: 70 }], desc: 'A handful of iron spikes over an area. A scratch, and most in it are Slowed.' },
  tripWire: { name: 'Trip Wire', job: 'thief', jp: 140, mp: 0, range: 2, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 2 }, { type: 'ctmod', amount: -20 }], desc: 'A cord at ankle height. A little damage, and 20 Tempo lost getting up.' },
  // Cleric
  dispel: { name: 'Dispel', job: 'whiteMage', jp: 220, mp: 10, range: 4, aoe: 0, vert: 3, ct: 15, kind: 'magic', affects: 'enemy',
    effects: [{ type: 'cure', statuses: ['haste', 'protect', 'shell', 'regen', 'reraise'] }], desc: 'Strip Haste, Protect, Barrier, Regen and Second Breath from a foe.' },
  curaga: { name: 'Renew', job: 'whiteMage', jp: 340, mp: 20, range: 4, aoe: 1, vert: 3, ct: 12, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 12 }], desc: 'The greatest mending. A flood of HP to all in the area.' },
  // Sorcerer
  thundara: { name: 'Lightning', job: 'blackMage', jp: 240, mp: 14, range: 4, aoe: 0, vert: 8, ct: 14, kind: 'magic', affects: 'all', element: 'thunder',
    effects: [{ type: 'damage', formula: 'ma', power: 11 }], desc: 'A greater bolt on a single target. Ignores height.' },
  drain: { name: 'Drain', job: 'blackMage', jp: 200, mp: 10, range: 3, aoe: 0, vert: 3, ct: 16, kind: 'magic', affects: 'enemy', element: 'dark',
    effects: [{ type: 'drain', formula: 'ma', power: 6 }], desc: 'Pull the target\'s life into your own. Dark.' },
  // Chronomancer
  rewind: { name: 'Rewind', job: 'timeMage', jp: 180, mp: 10, range: 4, aoe: 0, vert: 3, ct: 15, kind: 'magic', affects: 'ally', allowSelf: false,
    effects: [{ type: 'ctmod', amount: 40 }], desc: 'Give an ally back a little of the time it took. Tempo +40.' },
  timeTheft: { name: 'Time Theft', job: 'timeMage', jp: 200, mp: 10, range: 4, aoe: 0, vert: 3, ct: 15, kind: 'magic', affects: 'enemy',
    effects: [{ type: 'ctmod', amount: -40 }], desc: 'Take a foe\'s turn away from it. Tempo -40.' },
  // Ninja
  kunaiStorm: { name: 'Kunai Storm', job: 'ninja', jp: 220, mp: 0, range: 3, aoe: 1, vert: 4, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }], desc: 'A fistful of blades over an area. Nobody in it is spared.' },
  poisonNeedle: { name: 'Poison Needle', job: 'ninja', jp: 160, mp: 0, range: 4, aoe: 0, vert: 4, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 2 }, { type: 'status', status: 'poison', hit: 85 }], desc: 'A dart dipped in something. A scratch, and almost surely Poison.' },
  blink: { name: 'Blink', job: 'ninja', jp: 200, mp: 0, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'evade', amount: 15 }], desc: 'Never quite where they look. Evade +15 for the rest of the battle.' },
  // Dragoon
  highJump: { name: 'High Jump', job: 'dragoon', jp: 320, mp: 0, range: 5, aoe: 0, vert: 9, ct: 45, kind: 'physical', affects: 'all', airborne: true,
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 2.0 }], desc: 'Out of sight for a long count, and down for 2x weapon damage. Untargetable while airborne.' },
  spearSweep: { name: 'Spear Sweep', job: 'dragoon', jp: 200, mp: 0, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'physical', affects: 'enemy', self: true,
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 0.7 }], desc: 'The haft swung in a circle. Weapon damage, lighter, on every foe adjacent.' },
  dragonFang: { name: 'Dragon Fang', job: 'dragoon', jp: 240, mp: 6, range: 'weapon', aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy', element: 'fire',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 2 }], desc: 'The spear comes down burning. Weapon damage and a little more, as fire.' },
  // Samurai
  moonCut: { name: 'Moon Cut', job: 'samurai', jp: 250, mp: 8, range: 2, aoe: 1, vert: 3, ct: 0, kind: 'magic', affects: 'all',
    effects: [{ type: 'damage', formula: 'ma', power: 6 }, { type: 'status', status: 'slow', hit: 45 }], desc: 'A cut as wide as the moon. Damage over an area, and some are left Slowed.' },
  stillWater: { name: 'Still Water', job: 'samurai', jp: 180, mp: 8, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'heal', formula: 'ma', power: 4 }, { type: 'cure', statuses: ['silence', 'berserk'] }], desc: 'A breath before the draw. Heals yourself and adjacent allies, and lifts Silence and Berserk.' },
  // Summoner
  sylph: { name: 'Sylph', job: 'summoner', jp: 180, mp: 16, range: 4, aoe: 2, vert: 6, ct: 12, kind: 'magic', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'ma', power: 5 }, { type: 'status', status: 'silence', hit: 55 }], desc: 'Call the wind spirit. Light damage over a wide area, and the voices of most in it are taken.' },
  undine: { name: 'Undine', job: 'summoner', jp: 240, mp: 20, range: 4, aoe: 2, vert: 4, ct: 12, kind: 'magic', affects: 'enemy', element: 'water',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'Call the water spirit. The sea over every enemy in a wide area.' },
  // Geomancer
  gust: { name: 'Gust', job: 'geomancer', jp: 160, mp: 4, range: 4, aoe: 1, vert: 9, ct: 4, kind: 'magic', affects: 'all',
    effects: [{ type: 'damage', formula: 'ma', power: 4 }, { type: 'ctmod', amount: -15 }], desc: 'Wind from nowhere, from any height. Light damage, and 15 Tempo lost to staying upright.' },
  brambles: { name: 'Brambles', job: 'geomancer', jp: 220, mp: 4, range: 3, aoe: 1, vert: 2, ct: 4, kind: 'magic', affects: 'all', element: 'earth',
    effects: [{ type: 'damage', formula: 'ma', power: 3 }, { type: 'status', status: 'poison', hit: 55 }], desc: 'Thorns out of the ground. Light damage, and the scratches turn: Poison.' },
  // Bard
  dirge: { name: 'Dirge of Dust', job: 'bard', jp: 200, mp: 8, range: 0, aoe: 3, vert: 4, ct: 0, kind: 'support', affects: 'enemy', self: true,
    effects: [{ type: 'statmod', stat: 'pa', amount: -1 }], desc: 'A song for the losing side. PA -1 for every foe within three tiles, for the battle.' },
  cadence: { name: 'Marching Cadence', job: 'bard', jp: 240, mp: 10, range: 0, aoe: 3, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'ctmod', amount: 15 }], desc: 'Left, right. Every ally within three tiles gains 15 Tempo.' },
  // Paladin
  shieldOfFaith: { name: 'Shield of Faith', job: 'paladin', jp: 280, mp: 12, range: 3, aoe: 1, vert: 3, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'regen', hit: 100 }], desc: 'Protect and Regen on every ally in the area.' },
  smite: { name: 'Smite', job: 'paladin', jp: 320, mp: 8, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'all', element: 'holy',
    effects: [{ type: 'damage', formula: 'pa', power: 5 }, { type: 'status', status: 'stop', hit: 30 }], desc: 'Light brought down like a hammer, at two tiles. Holy damage, and some are Stopped by it.' },
  // Arcanist
  comet: { name: 'Comet', job: 'arcanist', jp: 300, mp: 18, range: 4, aoe: 0, vert: 9, ct: 10, kind: 'magic', affects: 'all', element: null,
    effects: [{ type: 'damage', formula: 'ma', power: 11 }], desc: 'A single stone out of the sky, on a single target, of no element at all.' },
  siphon: { name: 'Siphon', job: 'arcanist', jp: 260, mp: 8, range: 3, aoe: 0, vert: 4, ct: 12, kind: 'magic', affects: 'enemy', element: 'dark',
    effects: [{ type: 'drain', formula: 'ma', power: 7 }], desc: 'Draw a foe\'s blood into your own veins. Dark.' },
  // Assassin
  garrote: { name: 'Garrote', job: 'assassin', jp: 250, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }, { type: 'status', status: 'silence', hit: 70 }], desc: 'A wire round the throat. Weapon damage, and likely Silence.' },
  markForDeath: { name: 'Mark for Death', job: 'assassin', jp: 300, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'support', affects: 'enemy',
    effects: [{ type: 'statmod', stat: 'evade', amount: -15 }, { type: 'statmod', stat: 'spd', amount: -1 }], desc: 'Chalk on the back. The target\'s Evade falls by 15 and its Speed by 1, for the battle.' },
  // Sage
  aurora: { name: 'Aurora', job: 'sage', jp: 380, mp: 22, range: 4, aoe: 2, vert: 4, ct: 14, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 6 }, { type: 'cure', statuses: ['poison', 'slow', 'stop', 'silence', 'blind', 'berserk'] }], desc: 'Light over a wide area. Heals every ally in it and lifts every affliction.' },
  scourge: { name: 'Scourge', job: 'sage', jp: 420, mp: 20, range: 4, aoe: 1, vert: 4, ct: 12, kind: 'magic', affects: 'all', element: 'dark',
    effects: [{ type: 'damage', formula: 'ma', power: 10 }, { type: 'status', status: 'poison', hit: 60 }], desc: 'The black spell. Dark damage over an area, and most who survive it are Poisoned.' },
  // Dragonlord
  wingStorm: { name: 'Wing Storm', job: 'dragonlord', jp: 350, mp: 10, range: 0, aoe: 2, vert: 4, ct: 0, kind: 'physical', affects: 'enemy', self: true,
    effects: [{ type: 'damage', formula: 'pa', power: 6 }, { type: 'ctmod', amount: -20 }], desc: 'Wings on everything within two tiles. Damage, and 20 Tempo lost to the wind.' },
  dragonsBlood: { name: 'Dragon\'s Blood', job: 'dragonlord', jp: 400, mp: 14, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 8 }, { type: 'status', status: 'regen', hit: 100 }], desc: 'A cup of it. Heals an ally and leaves Regen behind.' },
  // Hierophant
  benediction: { name: 'Benediction', job: 'hierophant', jp: 450, mp: 26, range: 4, aoe: 2, vert: 9, ct: 14, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 10 }, { type: 'cure', statuses: ['poison', 'slow', 'stop', 'silence', 'blind', 'berserk'] }], desc: 'A blessing over a wide area: a great deal of HP to every ally in it, and every affliction lifted.' },
  wrath: { name: 'Wrath of Heaven', job: 'hierophant', jp: 500, mp: 24, range: 4, aoe: 0, vert: 9, ct: 10, kind: 'magic', affects: 'all', element: 'holy',
    effects: [{ type: 'damage', formula: 'ma', power: 14 }, { type: 'status', status: 'silence', hit: 50 }], desc: 'All of heaven\'s displeasure on one target. Holy damage, and an even chance of Silence.' },
  // Fell Knight
  nightmare: { name: 'Nightmare', job: 'fellKnight', jp: 350, mp: 14, range: 3, aoe: 1, vert: 4, ct: 8, kind: 'magic', affects: 'enemy', element: 'dark',
    effects: [{ type: 'status', status: 'berserk', hit: 60 }, { type: 'status', status: 'blind', hit: 40 }], desc: 'What they dream of. Most in the area go Berserk, and some are Blinded.' },
  grimHarvest: { name: 'Grim Harvest', job: 'fellKnight', jp: 450, mp: 16, range: 2, aoe: 1, vert: 3, ct: 0, kind: 'magic', affects: 'enemy', element: 'dark',
    effects: [{ type: 'drain', formula: 'ma', power: 6 }], desc: 'Reap an area and keep what grows. Dark drain from every foe in it.' },
  // Engineer
  shrapnel: { name: 'Shrapnel', job: 'engineer', jp: 200, mp: 8, range: 3, aoe: 1, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 4 }, { type: 'status', status: 'blind', hit: 40 }], desc: 'A canister of scrap, burst over an area. Damage, and some are Blinded by it.' },
  recalibrate: { name: 'Recalibrate', job: 'engineer', jp: 220, mp: 8, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'cure', statuses: ['slow', 'stop', 'silence'] }, { type: 'mpheal', formula: 'ma', power: 2 }], desc: 'Set the gears right. Lifts Slow, Stop and Silence from an ally, and restores a little MP.' },
  // Gunner
  doubleTap: { name: 'Double Tap', job: 'gunner', jp: 300, mp: 4, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 0.7 }, { type: 'damage', formula: 'pa', power: 'weapon', mult: 0.7 }], desc: 'Two shots, close together, each a little lighter than one.' },
  flashPowder: { name: 'Flash Powder', job: 'gunner', jp: 220, mp: 4, range: 2, aoe: 1, vert: 3, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'status', status: 'blind', hit: 75 }, { type: 'ctmod', amount: -10 }], desc: 'A pan of powder in the face. Most in the area are Blinded, and all lose 10 Tempo.' },
  // Aeronaut
  strafe: { name: 'Strafe', job: 'aeronaut', jp: 250, mp: 6, range: 4, aoe: 1, vert: 9, ct: 8, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 4 }], desc: 'A pass over the area with everything that fires. Damage from any height.' },
  skyhook: { name: 'Skyhook', job: 'aeronaut', jp: 280, mp: 6, range: 3, aoe: 0, vert: 9, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'statmod', stat: 'jump', amount: 3 }, { type: 'ctmod', amount: 15 }], desc: 'A line from above. Jump +3 for the battle, and 15 Tempo now.' },
  // Artificer
  galvanize: { name: 'Galvanize', job: 'artificer', jp: 350, mp: 14, range: 3, aoe: 1, vert: 4, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'statmod', stat: 'spd', amount: 1 }, { type: 'mpheal', formula: 'ma', power: 2 }], desc: 'A current through the line. Speed +1 and a little MP for every ally in the area.' },
  magnetize: { name: 'Magnetize', job: 'artificer', jp: 400, mp: 16, range: 3, aoe: 1, vert: 4, ct: 8, kind: 'magic', affects: 'enemy', element: 'thunder',
    effects: [{ type: 'damage', formula: 'ma', power: 6 }, { type: 'status', status: 'stop', hit: 30 }], desc: 'Everything with iron in it seizes. Thunder damage over an area, and some are Stopped.' },
  // Frostweaver
  frostbite: { name: 'Frostbite', job: 'frostweaver', jp: 220, mp: 10, range: 3, aoe: 0, vert: 4, ct: 6, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 6 }, { type: 'status', status: 'slow', hit: 70 }], desc: 'The cold in the fingers first. Ice damage, and likely Slow.' },
  iceVeil: { name: 'Ice Veil', job: 'frostweaver', jp: 260, mp: 10, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'statmod', stat: 'evade', amount: 8 }], desc: 'A sheet of ice between you and them. Protect, and Evade +8.' },
  // Warden
  spearWall: { name: 'Spear Wall', job: 'warden', jp: 250, mp: 6, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'physical', affects: 'enemy', self: true,
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 0.8 }, { type: 'status', status: 'slow', hit: 40 }], desc: 'Points out in every direction. Weapon damage on every foe adjacent, and some are Slowed.' },
  standFast: { name: 'Stand Fast', job: 'warden', jp: 300, mp: 10, range: 2, aoe: 1, vert: 3, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'cure', statuses: ['slow', 'stop'] }, { type: 'status', status: 'protect', hit: 100 }], desc: 'Slow and Stop lifted from allies in the area, and Protect on all of them.' },
  // Runeblade
  runeShield: { name: 'Rune Shield', job: 'runeblade', jp: 300, mp: 12, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'shell', hit: 100 }, { type: 'statmod', stat: 'ma', amount: 2 }], desc: 'The runes read outward. Barrier, and MA +2, on an ally.' },
  starStrike: { name: 'Star Strike', job: 'runeblade', jp: 450, mp: 10, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.2 }, { type: 'ctmod', amount: -15 }], desc: 'The star-iron falls on them again. 1.2x weapon damage, and 15 Tempo lost.' },
  // Corsair
  powderKeg: { name: 'Powder Keg', job: 'corsair', jp: 300, mp: 8, range: 3, aoe: 1, vert: 3, ct: 8, kind: 'physical', affects: 'enemy', element: 'fire',
    effects: [{ type: 'damage', formula: 'pa', power: 6 }], desc: 'Lit, rolled, and the enemy stands too close to it. Fire damage over an area.' },
  rumRation: { name: 'Rum Ration', job: 'corsair', jp: 220, mp: 6, range: 0, aoe: 2, vert: 3, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'heal', flat: 20 }, { type: 'cure', statuses: ['blind', 'silence', 'slow'] }], desc: 'A cup all round. 20 HP to every ally within two tiles, and Blind, Silence and Slow forgotten.' },
  // Tidecaller
  tideMend: { name: 'Tide Mend', job: 'tidecaller', jp: 220, mp: 12, range: 3, aoe: 1, vert: 4, ct: 4, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 6 }, { type: 'cure', statuses: ['poison'] }], desc: 'Salt water on the wound. Heals allies in the area and washes Poison out.' },
  drowningGrip: { name: 'Drowning Grip', job: 'tidecaller', jp: 320, mp: 14, range: 3, aoe: 0, vert: 4, ct: 6, kind: 'magic', affects: 'enemy', element: 'water',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }, { type: 'status', status: 'stop', hit: 40 }], desc: 'The sea closes over one target. Water damage, and a fair chance of Stop.' },
  // Harpooner
  netThrow: { name: 'Net Throw', job: 'harpooner', jp: 240, mp: 6, range: 3, aoe: 1, vert: 4, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'status', status: 'slow', hit: 70 }, { type: 'status', status: 'stop', hit: 25 }], desc: 'Weighted cord over an area. Most in it are Slowed, and some are held fast.' },
  gaffHook: { name: 'Gaff Hook', job: 'harpooner', jp: 300, mp: 6, range: 2, aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', bonus: 2 }, { type: 'ctmod', amount: -20 }], desc: 'In, and pulled. Weapon damage at two tiles, and 20 Tempo lost.' },
  // Marshal
  flankingOrder: { name: 'Flanking Order', job: 'marshal', jp: 220, mp: 8, range: 3, aoe: 0, vert: 4, ct: 0, kind: 'support', affects: 'ally',
    effects: [{ type: 'statmod', stat: 'move', amount: 1 }, { type: 'statmod', stat: 'spd', amount: 1 }], desc: 'Round the side. Move +1 and Speed +1 for an ally, for the battle.' },
  volleyFire: { name: 'Volley Fire', job: 'marshal', jp: 400, mp: 12, range: 4, aoe: 1, vert: 9, ct: 10, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 5 }], desc: 'Every bow in the company on one area, on the word. Damage from any height.' },
  // Inquisitor
  excommunication: { name: 'Excommunication', job: 'inquisitor', jp: 300, mp: 14, range: 3, aoe: 0, vert: 4, ct: 4, kind: 'magic', affects: 'enemy',
    effects: [{ type: 'cure', statuses: ['haste', 'protect', 'shell', 'regen', 'reraise'] }, { type: 'mpdamage', formula: 'ma', power: 5 }], desc: 'Every blessing stripped from a foe, and MP burned away with them.' },
  litany: { name: 'Litany', job: 'inquisitor', jp: 350, mp: 14, range: 0, aoe: 2, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'shell', hit: 100 }, { type: 'statmod', stat: 'ma', amount: 1 }], desc: 'The words said over the line. Barrier and MA +1 for every ally within two tiles.' },
  // Duelist
  flurry: { name: 'Flurry', job: 'duelist', jp: 300, mp: 8, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'damage', formula: 'pa', power: 3 }, { type: 'damage', formula: 'pa', power: 3 }], desc: 'Three cuts before they have answered the first.' },
  disarm: { name: 'Disarm', job: 'duelist', jp: 260, mp: 6, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 2 }, { type: 'statmod', stat: 'pa', amount: -3 }], desc: 'The blade turned out of their hand. A little damage, and PA -3 for the battle.' },

  // The Concord's machines
  pistonStrike: { name: 'Piston Strike', job: 'sentinel', jp: 0, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 7 }], desc: 'A hammer on a rod. It does not pull the blow.' },
  steamBurst: { name: 'Steam Burst', job: 'sentinel', jp: 0, mp: 6, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'magic', affects: 'enemy', self: true, element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 6 }], desc: 'The boiler vents on everyone close.' },
  gearBite: { name: 'Gear Bite', job: 'ironhound', jp: 0, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 6 }, { type: 'status', status: 'slow', hit: 50 }], desc: 'Jaws that lock. Often leaves the bitten Slowed.' },
  furnaceBlast: { name: 'Furnace Blast', job: 'colossus', jp: 0, mp: 14, range: 3, aoe: 2, vert: 4, ct: 8, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'The furnace door opens on a wide area.' },
  steamSiren: { name: 'Steam Siren', job: 'colossus', jp: 0, mp: 10, range: 0, aoe: 2, vert: 4, ct: 0, kind: 'magic', affects: 'enemy', self: true,
    effects: [{ type: 'status', status: 'slow', hit: 80 }], desc: 'A shriek of steam that leaves everything near it Slowed.' },
  overheat: { name: 'Overheat', job: 'colossus', jp: 0, mp: 8, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'pa', amount: 3 }], desc: 'Stoke it past safe. PA +3.' },
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
  boneToss: { name: 'Bone Toss', job: 'skeleton', jp: 0, mp: 0, range: 4, aoe: 0, vert: 4, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }], desc: 'Throws a piece of itself.' },
  gravePull: { name: 'Grave Pull', job: 'skeleton', jp: 0, mp: 6, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'magic', affects: 'all', element: 'dark',
    effects: [{ type: 'drain', formula: 'ma', power: 4 }], desc: 'Drags the warmth out of the living.' },
  willOWisp: { name: 'Will o\' Wisp', job: 'wisp', jp: 0, mp: 6, range: 4, aoe: 1, vert: 6, ct: 0, kind: 'magic', affects: 'all', element: 'thunder',
    effects: [{ type: 'damage', formula: 'ma', power: 5 }], desc: 'A crackling light that leaps between targets.' },
  drainLight: { name: 'Drain Light', job: 'wisp', jp: 0, mp: 8, range: 3, aoe: 0, vert: 4, ct: 0, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'blind', hit: 70 }], desc: 'Puts out the eyes with a flare.' },
  rootSnare: { name: 'Root Snare', job: 'treant', jp: 0, mp: 0, range: 3, aoe: 1, vert: 1, ct: 0, kind: 'physical', affects: 'all', element: 'earth',
    effects: [{ type: 'damage', formula: 'pa', power: 3 }, { type: 'status', status: 'slow', hit: 70 }],
    desc: 'Roots burst up and tangle everything nearby.' },
  barkSkin: { name: 'Bark Skin', job: 'treant', jp: 0, mp: 6, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'regen', hit: 100 }],
    desc: 'Hardens its bark and closes its wounds.' },
  nightSword: { name: 'Nightdrinker', job: 'darkKnight', jp: 0, mp: 8, range: 'weapon', aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy', element: 'dark',
    effects: [{ type: 'drain', formula: 'pa', power: 6 }], desc: 'A draining slash.' },
  shadowBlade: { name: 'Shadow Blade', job: 'darkKnight', jp: 0, mp: 12, range: 3, aoe: 1, vert: 4, ct: 12, kind: 'magic', affects: 'all', element: 'dark',
    effects: [{ type: 'damage', formula: 'ma', power: 6 }], desc: 'Dark energy that sears an area.' },
  blackTide: { name: 'Black Tide', job: 'darkKnightRisen', jp: 0, mp: 18, range: 3, aoe: 2, vert: 4, ct: 14, kind: 'magic', affects: 'all', element: 'dark',
    effects: [{ type: 'damage', formula: 'ma', power: 7 }], desc: 'Darkness rolls out across the floor and drags everything under.' },
  despair: { name: 'Despair', job: 'darkKnightRisen', jp: 0, mp: 14, range: 4, aoe: 1, vert: 4, ct: 0, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'silence', hit: 75 }, { type: 'status', status: 'blind', hit: 75 }],
    desc: 'Takes the voice and the sight from all in the area.' },
  darkProtect: { name: 'Umbral Ward', job: 'darkKnight', jp: 0, mp: 10, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }], desc: 'Shroud self in Protect and Barrier.' },
};

// Party at the start of a new game.
const STARTING_PARTY = [
  { name: 'Rowan', job: 'squire', level: 1, leader: true },
  { name: 'Garret', job: 'squire', level: 1 },
  { name: 'Bram', job: 'squire', level: 1 },
  { name: 'Mira', job: 'chemist', level: 1 },
];

// Difficulty scales the opposition rather than the party, so a player's own
// numbers always mean the same thing.
const DIFFICULTIES = {
  squire:  { name: 'Footman', levelShift: -1, gearShift: -1, gilMult: 1.25,
             desc: 'Foes are a level below and less well equipped. Purses stretch further.' },
  knight:  { name: 'Knight', levelShift: 0, gearShift: 0, gilMult: 1,
             desc: 'The campaign as written.' },
  paladin: { name: 'Paladin', levelShift: 2, gearShift: 1, gilMult: 0.85,
             desc: 'Foes outrank and outfit you, and coin is scarcer.' },
};

// Enemy pools for random training battles.
const TRAINING_POOL = [
  ['squire', 'squire', 'archer'],
  ['goblin', 'goblin', 'wolf', 'wolf'],
  ['knight', 'chemist', 'archer', 'squire'],
  ['wisp', 'treant', 'wolf', 'blackMage'],
  ['knight', 'whiteMage', 'archer', 'monk'],
  ['bomb', 'bomb', 'goblin', 'skeleton'],
  ['skeleton', 'skeleton', 'wisp', 'treant'],
  ['ninja', 'timeMage', 'knight', 'dragoon'],
  ['samurai', 'summoner', 'knight', 'geomancer'],
  ['bard', 'samurai', 'ninja', 'summoner', 'geomancer'],
  ['paladin', 'assassin', 'samurai', 'arcanist', 'bard'],
  ['sage', 'paladin', 'assassin', 'arcanist', 'summoner', 'ninja'],
  ['dragonlord', 'hierophant', 'fellKnight', 'sage', 'paladin', 'assassin'],
  ['gunner', 'engineer', 'sentinel', 'ironhound'],
  ['aeronaut', 'gunner', 'sentinel', 'sentinel', 'engineer'],
  ['artificer', 'gunner', 'aeronaut', 'sentinel', 'ironhound', 'ironhound'],
  ['hollowKnight', 'rimeWight', 'frostweaver', 'warden'],
  ['iceDrake', 'hollowKnight', 'hollowKnight', 'rimeWight', 'frostweaver', 'runeblade'],
  ['corsair', 'corsair', 'reefCrab', 'siren', 'harpooner'],
  ['drownedKnight', 'drownedKnight', 'siren', 'saltPriest', 'reefCrab', 'tidecaller'],
  ['leviathan', 'drownedKnight', 'drownedKnight', 'siren', 'saltPriest', 'harpooner'],
  ['royalGuard', 'royalGuard', 'courtMage', 'mercenary', 'griffon'],
  ['golem', 'royalGuard', 'courtMage', 'courtMage', 'griffon', 'duelist'],
  ['golem', 'golem', 'royalGuard', 'marshal', 'inquisitor', 'griffon', 'mercenary'],
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
  engineer:  { w: ['axe', 'knife', 'gun'], a: ['light', 'cloth'], head: ['hat', 'helm'], shield: false },
  gunner:    { w: ['gun', 'knife'], a: ['light', 'cloth'], head: ['hat'], shield: false },
  aeronaut:  { w: ['gun', 'spear'], a: ['light', 'cloth'], head: ['hat'], shield: false },
  artificer: { w: ['gun', 'rod', 'axe'], a: ['light', 'cloth', 'robe'], head: ['hat', 'helm'], shield: false },
  frostweaver: { w: ['rod', 'staff', 'knife'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  warden:    { w: ['spear', 'bow', 'sword'], a: ['light', 'heavy', 'cloth'], head: ['helm', 'hat'], shield: true },
  runeblade: { w: ['sword', 'katana', 'greatsword'], a: ['heavy', 'light', 'cloth'], head: ['helm'], shield: true },
  corsair:   { w: ['sword', 'gun', 'knife'], a: ['light', 'cloth'], head: ['hat'], shield: false },
  marshal:   { w: ['sword', 'spear', 'greatsword'], a: ['heavy', 'light', 'cloth'], head: ['helm'], shield: true },
  inquisitor: { w: ['rod', 'staff', 'tome'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  duelist:   { w: ['sword', 'knife', 'katana'], a: ['light', 'cloth'], head: ['hat'], shield: false },
  royalGuard: { w: ['spear', 'sword', 'axe'], a: ['heavy'], head: ['helm'], shield: true },
  courtMage: { w: ['rod', 'staff'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  mercenary: { w: ['sword', 'axe', 'knife'], a: ['light', 'heavy'], head: ['helm', 'hat'], shield: true },
  chancellor: { w: ['rod', 'staff'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  tidecaller: { w: ['rod', 'staff'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  harpooner: { w: ['spear', 'bow'], a: ['light', 'heavy', 'cloth'], head: ['helm', 'hat'], shield: true },
  drownedKnight: { w: ['sword', 'axe', 'spear'], a: ['heavy', 'light'], head: ['helm'], shield: true },
  saltPriest: { w: ['staff', 'rod'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  drownedQueen: { w: ['spear', 'rod', 'staff'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  hollowKnight: { w: ['sword', 'axe', 'spear'], a: ['heavy', 'light'], head: ['helm'], shield: true },
  winterRegent: { w: ['rod', 'staff'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  monk:      { w: ['fist'], a: ['light', 'cloth'], head: ['hat'], shield: false },
  thief:     { w: ['knife', 'sword'], a: ['light', 'cloth'], head: ['hat'], shield: false },
  whiteMage: { w: ['staff', 'rod'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  blackMage: { w: ['rod', 'staff'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  timeMage:  { w: ['staff', 'rod'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  ninja:     { w: ['ninjablade', 'knife'], a: ['light', 'cloth'], head: ['hat'], shield: false, dual: true },
  dragoon:   { w: ['spear', 'sword'], a: ['heavy', 'light', 'cloth'], head: ['helm', 'hat'], shield: true },
  samurai:   { w: ['katana', 'sword'], a: ['heavy', 'light', 'cloth'], head: ['helm', 'hat'], shield: false },
  summoner:  { w: ['rod', 'staff'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  geomancer: { w: ['axe', 'sword', 'knife'], a: ['light', 'cloth', 'robe'], head: ['hat'], shield: true },
  bard:      { w: ['harp', 'knife'], a: ['cloth', 'robe', 'light'], head: ['hat'], shield: false },
  paladin:   { w: ['greatsword', 'sword', 'katana'], a: ['heavy', 'light', 'cloth'], head: ['helm', 'hat'], shield: true },
  arcanist:  { w: ['tome', 'rod', 'staff'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  assassin:  { w: ['ninjablade', 'knife', 'katana'], a: ['light', 'cloth'], head: ['hat'], shield: false, dual: true },
  sage:      { w: ['tome', 'staff', 'rod'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  dragonlord:{ w: ['spear', 'greatsword', 'katana'], a: ['heavy', 'light', 'cloth'], head: ['helm', 'hat'], shield: true },
  hierophant:{ w: ['tome', 'staff', 'rod'], a: ['robe', 'cloth'], head: ['hat'], shield: false },
  fellKnight:{ w: ['sword', 'greatsword', 'katana'], a: ['heavy', 'light', 'cloth'], head: ['helm', 'hat'], shield: true },
};

// tier: shop stock unlocks at that chapter index; tier 7 is sold only once the
// campaign is won. price 0 = starter kit, cannot be sold. late: never issued
// to an enemy (see enemyGearFor).
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
  yoichiBow:   { name: 'Heron Bow', slot: 'weapon', wtype: 'bow', power: 9, range: 6, vert: 8, price: 1700, tier: 5 },
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
  ashuraBlade: { name: 'Kestrel Blade', slot: 'weapon', wtype: 'katana', power: 7, range: 1, vert: 2, price: 0, tier: 0 },
  kotetsu:     { name: 'Kotetsu', slot: 'weapon', wtype: 'katana', power: 12, range: 1, vert: 2, evade: 4, price: 950, tier: 3 },
  masamune:    { name: 'Masamune', slot: 'weapon', wtype: 'katana', power: 15, range: 1, vert: 2, spd: 1, evade: 6, price: 2300, tier: 6 },
  ramiaHarp:   { name: 'Reed Harp', slot: 'weapon', wtype: 'harp', power: 3, range: 3, vert: 4, ma: 2, price: 0, tier: 0 },
  bloodstrings:{ name: 'Wolfgut Harp', slot: 'weapon', wtype: 'harp', power: 6, range: 3, vert: 4, ma: 4, spd: 1, price: 1300, tier: 4 },
  faerieHarp:  { name: 'Moonwater Harp', slot: 'weapon', wtype: 'harp', power: 8, range: 4, vert: 5, ma: 6, mp: 20, price: 2200, tier: 6 },
  ironGreatsword: { name: 'Iron Greatsword', slot: 'weapon', wtype: 'greatsword', power: 9, range: 1, vert: 2, price: 0, tier: 0 },
  claymore:    { name: 'Claymore', slot: 'weapon', wtype: 'greatsword', power: 14, range: 1, vert: 2, price: 1100, tier: 3 },
  zweihander:  { name: 'Zweihander', slot: 'weapon', wtype: 'greatsword', power: 18, range: 1, vert: 2, spd: -1, price: 2100, tier: 5 },
  excalibur:   { name: 'Excalibur', slot: 'weapon', wtype: 'greatsword', power: 20, range: 1, vert: 2, ma: 2, resist: { holy: 'absorb' }, price: 2800, tier: 6 },
  grimoire:    { name: 'Grimoire', slot: 'weapon', wtype: 'tome', power: 4, range: 2, vert: 3, ma: 2, price: 0, tier: 0 },
  codex:       { name: 'Codex of Ash', slot: 'weapon', wtype: 'tome', power: 6, range: 2, vert: 3, ma: 6, price: 1200, tier: 3 },
  omnibus:     { name: 'Omnibus', slot: 'weapon', wtype: 'tome', power: 8, range: 2, vert: 3, ma: 10, mp: 30, price: 2600, tier: 6 },
  zorlinShape: { name: 'Widow\'s Kiss', late: true, slot: 'weapon', wtype: 'knife', power: 11, range: 1, vert: 2, spd: 2, evade: 6, price: 2400, tier: 6 },
  // ---- legendary arms, for the road after the war ----
  ragnarok:    { name: 'Ragnarok', late: true, slot: 'weapon', wtype: 'greatsword', power: 24, range: 1, vert: 2, ma: 3, resist: { holy: 'resist' }, price: 8400, tier: 7 },
  chaosBlade:  { name: 'Chaos Blade', late: true, slot: 'weapon', wtype: 'katana', power: 21, range: 1, vert: 2, spd: 1, evade: 8, resist: { dark: 'resist' }, price: 8000, tier: 7 },
  gungnir:     { name: 'Gungnir', late: true, slot: 'weapon', wtype: 'spear', power: 20, range: 2, vert: 4, jump: 2, price: 7600, tier: 7 },
  apocrypha:   { name: 'Apocrypha', late: true, slot: 'weapon', wtype: 'tome', power: 10, range: 2, vert: 3, ma: 14, mp: 40, price: 8400, tier: 7 },
  escutcheon:  { name: 'Escutcheon', late: true, slot: 'offhand', otype: 'shield', evade: 34, hp: 40, resist: { holy: 'resist', dark: 'resist' }, price: 7200, tier: 7 },

  // ---- offhand ----
  buckler:     { name: 'Buckler', slot: 'offhand', otype: 'shield', evade: 12, price: 300, tier: 1 },
  kiteShield:  { name: 'Kite Shield', slot: 'offhand', otype: 'shield', evade: 18, hp: 15, price: 800, tier: 3 },
  aegisShield: { name: 'Aegis Shield', slot: 'offhand', otype: 'shield', evade: 26, hp: 25, price: 1800, tier: 5 },

  // ---- head ----
  leatherCap:  { name: 'Leather Cap', slot: 'head', htype: 'hat', look: 'cap', hp: 10, price: 150, tier: 1 },
  featherHat:  { name: 'Feather Hat', slot: 'head', htype: 'hat', look: 'feather', hp: 12, spd: 1, price: 500, tier: 2 },
  wizardHat:   { name: 'Wizard Hat', slot: 'head', htype: 'hat', look: 'wizard', mp: 20, ma: 1, price: 550, tier: 2 },
  ribbon:      { name: 'Ribbon', slot: 'head', htype: 'hat', look: 'ribbon', hp: 20, mp: 20, ma: 2, spd: 1,
                 wards: ['silence', 'blind', 'berserk', 'poison'], price: 2400, tier: 6 },
  ironHelm:    { name: 'Iron Helm', slot: 'head', htype: 'helm', look: 'helm', hp: 20, price: 450, tier: 1 },
  goldenHelm:  { name: 'Golden Helm', slot: 'head', htype: 'helm', look: 'helm', hp: 36, mp: 8, price: 1300, tier: 4 },
  summonersHood: { name: 'Summoner\'s Hood', late: true, slot: 'head', htype: 'hat', look: 'wizard', hp: 14, mp: 34, ma: 2, price: 900, tier: 4 },
  sageCrown:   { name: 'Sage\'s Crown', late: true, slot: 'head', htype: 'hat', look: 'ribbon', hp: 22, mp: 44, ma: 3, price: 2200, tier: 6 },
  crusaderHelm:{ name: 'Crusader Helm', late: true, slot: 'head', htype: 'helm', look: 'helm', hp: 44, mp: 12, resist: { dark: 'resist' }, price: 2000, tier: 6 },
  genjiHelm:   { name: 'Warlord\'s Helm', late: true, slot: 'head', htype: 'helm', look: 'helm', hp: 60, mp: 20, price: 6000, tier: 7 },
  crownOfKings:{ name: 'Crown of Kings', late: true, slot: 'head', htype: 'hat', look: 'ribbon', hp: 40, mp: 60, ma: 4, spd: 1,
                 wards: ['silence', 'blind', 'berserk', 'poison', 'slow', 'stop'], price: 9000, tier: 7 },

  // ---- body ----
  clothes:     { name: 'Clothes', slot: 'body', atype: 'cloth', hp: 10, price: 0, tier: 0 },
  leatherArmor:{ name: 'Leather Armor', slot: 'body', atype: 'light', hp: 22, price: 350, tier: 1 },
  chainMail:   { name: 'Chain Mail', slot: 'body', atype: 'light', hp: 38, price: 850, tier: 3 },
  plateMail:   { name: 'Plate Mail', slot: 'body', atype: 'heavy', hp: 58, spd: -1, price: 1500, tier: 4 },
  crystalMail: { name: 'Crystal Mail', slot: 'body', atype: 'heavy', hp: 74, mp: 10, price: 2400, tier: 6 },
  silkRobe:    { name: 'Silk Robe', slot: 'body', atype: 'robe', hp: 18, mp: 20, price: 400, tier: 1 },
  wizardRobe:  { name: 'Wizard Robe', slot: 'body', atype: 'robe', hp: 30, mp: 40, ma: 1, price: 1100, tier: 3 },
  robeOfLords: { name: 'Robe of Lords', slot: 'body', atype: 'robe', hp: 55, mp: 55, ma: 3, price: 2400, tier: 6 },
  crusaderMail:{ name: 'Crusader Mail', late: true, slot: 'body', atype: 'heavy', hp: 70, resist: { holy: 'resist', dark: 'resist' }, price: 2600, tier: 6 },
  shadowCloth: { name: 'Shadow Cloth', late: true, slot: 'body', atype: 'light', hp: 40, evade: 10, spd: 1, price: 2300, tier: 6 },
  genjiArmor:  { name: 'Warlord\'s Mail', late: true, slot: 'body', atype: 'heavy', hp: 96, spd: 1, price: 8400, tier: 7 },
  dragonMail:  { name: 'Dragon Mail', late: true, slot: 'body', atype: 'heavy', hp: 84, pa: 2, resist: { fire: 'absorb', ice: 'weak' }, price: 7600, tier: 7 },
  archmageRobe:{ name: 'Archmage Robe', late: true, slot: 'body', atype: 'robe', hp: 66, mp: 90, ma: 5, price: 8400, tier: 7 },
  nightweave:  { name: 'Nightweave', late: true, slot: 'body', atype: 'light', hp: 56, evade: 14, spd: 2, price: 8000, tier: 7 },

  // ---- elemental gear: each answers one element ----
  flameShield: { name: 'Flame Shield', slot: 'offhand', otype: 'shield', evade: 14, resist: { fire: 'resist' }, price: 1000, tier: 3 },
  iceShield:   { name: 'Ice Shield', slot: 'offhand', otype: 'shield', evade: 14, resist: { ice: 'resist' }, price: 1000, tier: 3 },
  stormMail:   { name: 'Storm Mail', slot: 'body', atype: 'heavy', hp: 52, resist: { thunder: 'absorb', ice: 'weak' }, price: 1900, tier: 5 },
  salamanderRobe: { name: 'Salamander Robe', slot: 'body', atype: 'robe', hp: 26, mp: 26, resist: { fire: 'absorb', ice: 'weak' }, price: 1900, tier: 5 },
  wardingCloak: { name: 'Warding Cloak', slot: 'body', atype: 'cloth', hp: 24, mp: 14,
                  resist: { fire: 'resist', ice: 'resist', thunder: 'resist' }, price: 2200, tier: 6 },
  holyPendant: { name: 'Holy Pendant', slot: 'acc', ma: 1, resist: { dark: 'resist', holy: 'absorb' }, price: 1600, tier: 4 },
  obsidianCharm: { name: 'Obsidian Charm', slot: 'acc', hp: 18, resist: { earth: 'immune', holy: 'weak' }, price: 1400, tier: 4 },

  // ---- accessory ----
  leatherBoots:{ name: 'Leather Boots', slot: 'acc', move: 1, price: 400, tier: 1 },
  wingedBoots: { name: 'Winged Boots', slot: 'acc', jump: 2, price: 500, tier: 2 },
  sprintShoes: { name: 'Sprint Shoes', slot: 'acc', move: 1, spd: 1, price: 1200, tier: 4 },
  powerGlove:  { name: 'Power Glove', slot: 'acc', pa: 2, price: 900, tier: 3 },
  magickRing:  { name: 'Magic Ring', slot: 'acc', ma: 2, price: 900, tier: 3 },
  guardianRing:{ name: 'Guardian Ring', slot: 'acc', hp: 30, price: 700, tier: 2 },
  reflexBracer:{ name: 'Reflex Bracer', slot: 'acc', evade: 12, price: 800, tier: 3 },
  chronoAmulet:{ name: 'Chrono Amulet', slot: 'acc', spd: 2, price: 2000, tier: 5 },
  earthwalkers:{ name: 'Earthwalker Boots', late: true, slot: 'acc', move: 1, jump: 1, price: 900, tier: 3 },
  songstone:   { name: 'Songstone', late: true, slot: 'acc', mp: 24, ma: 1, wards: ['silence'], price: 1100, tier: 4 },
  assassinCloak:{ name: 'Assassin\'s Cloak', late: true, slot: 'acc', evade: 16, spd: 1, price: 2000, tier: 5 },
  angelRing:   { name: 'Angel Ring', late: true, slot: 'acc', hp: 20, mp: 20, wards: ['stop', 'slow'], price: 2200, tier: 6 },
  heartOfDragon: { name: 'Heart of the Dragon', late: true, slot: 'acc', pa: 3, ma: 3, price: 7600, tier: 7 },
  sevenLeague: { name: 'Seven-League Boots', late: true, slot: 'acc', move: 2, jump: 2, spd: 1, price: 8400, tier: 7 },
  // ---- the Concord's arms: guns, tools and brass ----
  flintlock:   { name: 'Flintlock', slot: 'weapon', wtype: 'gun', power: 5, range: 4, vert: 9, price: 0, tier: 0 },
  musket:      { name: 'Musket', slot: 'weapon', wtype: 'gun', power: 7, range: 5, vert: 9, price: 700, tier: 2 },
  blunderbuss: { name: 'Blunderbuss', slot: 'weapon', wtype: 'gun', power: 10, range: 3, vert: 9, price: 900, tier: 3 },
  carbine:     { name: 'Rifled Carbine', slot: 'weapon', wtype: 'gun', power: 9, range: 5, vert: 9, price: 1500, tier: 5 },
  aetherRifle: { name: 'Aether Rifle', slot: 'weapon', wtype: 'gun', power: 12, range: 6, vert: 9, ma: 2, price: 2400, tier: 6 },
  thunderbird: { name: 'Thunderbird', late: true, slot: 'weapon', wtype: 'gun', power: 14, range: 7, vert: 9, spd: 1, price: 7800, tier: 7 },
  monkeyWrench:{ name: 'Monkey Wrench', slot: 'weapon', wtype: 'axe', power: 8, range: 1, vert: 2, ma: 2, price: 650, tier: 2 },
  steamHammer: { name: 'Steam Hammer', slot: 'weapon', wtype: 'axe', power: 13, range: 1, vert: 2, price: 1900, tier: 5 },
  goggles:     { name: 'Brass Goggles', slot: 'head', htype: 'hat', look: 'goggles', hp: 12, evade: 4, price: 600, tier: 2 },
  brassHelm:   { name: 'Brass Helm', slot: 'head', htype: 'helm', look: 'helm', hp: 26, price: 900, tier: 3 },
  oilskin:     { name: 'Oilskin', slot: 'body', atype: 'cloth', hp: 18, resist: { thunder: 'resist' }, price: 500, tier: 2 },
  aviatorCoat: { name: 'Aviator Coat', slot: 'body', atype: 'light', hp: 30, evade: 5, price: 1100, tier: 3 },
  boilerplate: { name: 'Boilerplate', slot: 'body', atype: 'heavy', hp: 46, resist: { fire: 'resist' }, price: 1600, tier: 4 },
  aetherPack:  { name: 'Aether Pack', slot: 'acc', move: 1, jump: 2, price: 1300, tier: 4 },
  clockworkHeart: { name: 'Clockwork Heart', slot: 'acc', hp: 30, mp: 15, price: 1800, tier: 5 },
  // ---- the north's arms ----
  wardenSpear: { name: 'Warden Spear', slot: 'weapon', wtype: 'spear', power: 12, range: 2, vert: 3, price: 1700, tier: 5 },
  rimeBow:     { name: 'Rime Bow', slot: 'weapon', wtype: 'bow', power: 11, range: 6, vert: 8, price: 2300, tier: 6 },
  frostRod:    { name: 'Frost Rod', slot: 'weapon', wtype: 'rod', power: 6, range: 1, vert: 2, ma: 6, price: 1500, tier: 5 },
  starIronBlade: { name: 'Star-iron Blade', late: true, slot: 'weapon', wtype: 'sword', power: 15, range: 1, vert: 2, ma: 3, price: 8000, tier: 7 },
  snowcloak:   { name: 'Snowcloak', slot: 'body', atype: 'cloth', hp: 30, mp: 10, resist: { ice: 'resist' }, price: 1400, tier: 5 },
  furMantle:   { name: 'Fur Mantle', slot: 'body', atype: 'light', hp: 38, resist: { ice: 'resist' }, price: 1500, tier: 5 },
  starIronPlate: { name: 'Star-iron Plate', late: true, slot: 'body', atype: 'heavy', hp: 70, resist: { ice: 'absorb' }, price: 8400, tier: 7 },
  icicleCrown: { name: 'Crown of Icicles', late: true, slot: 'head', htype: 'helm', look: 'helm', hp: 40, ma: 3, price: 7200, tier: 7 },
  runeSigil:   { name: 'Rune Sigil', slot: 'acc', ma: 3, mp: 20, price: 2200, tier: 6 },
  frostCharm:  { name: 'Frost Charm', slot: 'acc', resist: { ice: 'absorb' }, price: 1600, tier: 5 },
  warmthStone: { name: 'Warmth Stone', slot: 'acc', hp: 25, wards: ['slow', 'stop'], price: 1500, tier: 5 },
  // ---- what the cities sell, and nowhere else ----
  redwaterSteel: { name: 'Redwater Steel', city: 'redwater', slot: 'weapon', wtype: 'sword', power: 9, range: 1, vert: 2, price: 700, tier: 2 },
  reaverCloak:   { name: 'Reaver Cloak', city: 'redwater', slot: 'body', atype: 'light', hp: 24, evade: 4, price: 600, tier: 2 },
  garrisonPlate: { name: 'Garrison Plate', city: 'dunmarchTown', slot: 'body', atype: 'heavy', hp: 38, price: 900, tier: 3 },
  priestStaff:   { name: 'Priest\'s Staff', city: 'dunmarchTown', slot: 'weapon', wtype: 'staff', power: 5, range: 1, vert: 2, ma: 5, price: 800, tier: 3 },
  customsPistol: { name: 'Customs Pistol', city: 'fordwaterTown', slot: 'weapon', wtype: 'gun', power: 8, range: 5, vert: 9, price: 1200, tier: 4 },
  ledgerCoat:    { name: 'Ledger Coat', city: 'fordwaterTown', slot: 'body', atype: 'cloth', hp: 22, mp: 15, price: 1000, tier: 4 },
  bridgewright:  { name: 'Bridgewright', city: 'cogsworthTown', slot: 'weapon', wtype: 'axe', power: 11, range: 1, vert: 2, ma: 3, price: 1600, tier: 5 },
  aetherLantern: { name: 'Aether Lantern', city: 'cogsworthTown', slot: 'acc', ma: 2, spd: 1, price: 1700, tier: 5 },
  hearthBlade:   { name: 'Hearth Blade', city: 'hearthold', slot: 'weapon', wtype: 'sword', power: 13, range: 1, vert: 2, price: 2400, tier: 6 },
  wardenCloak:   { name: 'Warden\'s Cloak', city: 'hearthold', slot: 'body', atype: 'light', hp: 44, resist: { ice: 'resist' }, price: 2200, tier: 6 },
  starIronRing:  { name: 'Star-iron Ring', city: 'hollowMarket', late: true, slot: 'acc', pa: 3, ma: 3, price: 7600, tier: 7 },
  auroraStaff:   { name: 'Aurora Staff', city: 'hollowMarket', late: true, slot: 'weapon', wtype: 'staff', power: 8, range: 1, vert: 2, ma: 8, price: 8000, tier: 7 },
  // The sea: what the coast sells, and what comes up out of it.
  cutlass:       { name: 'Cutlass', slot: 'weapon', wtype: 'sword', power: 12, range: 1, vert: 2, evade: 4, price: 1900, tier: 5 },
  boardingPistol:{ name: 'Boarding Pistol', slot: 'weapon', wtype: 'gun', power: 11, range: 4, vert: 9, spd: 1, price: 2300, tier: 6 },
  harpoonSpear:  { name: 'Whaling Harpoon', slot: 'weapon', wtype: 'spear', power: 14, range: 2, vert: 3, price: 2500, tier: 6 },
  tideRod:       { name: 'Tide Rod', slot: 'weapon', wtype: 'rod', power: 6, range: 1, vert: 2, ma: 6, resist: { water: 'resist' }, price: 2200, tier: 6 },
  coralStaff:    { name: 'Coral Staff', slot: 'weapon', wtype: 'staff', power: 7, range: 1, vert: 2, ma: 5, mp: 20, price: 2100, tier: 6 },
  seaOilskin:    { name: 'Sea Oilskin', slot: 'body', atype: 'light', hp: 46, resist: { water: 'resist' }, price: 2100, tier: 6 },
  kelpRobe:      { name: 'Kelp Robe', slot: 'body', atype: 'robe', hp: 40, mp: 50, resist: { water: 'resist' }, price: 2200, tier: 6 },
  seaPlate:      { name: 'Sea Plate', slot: 'body', atype: 'heavy', hp: 60, resist: { water: 'resist' }, price: 2600, tier: 6 },
  diversHelm:    { name: 'Diver\'s Helm', slot: 'head', htype: 'helm', look: 'helm', hp: 30, resist: { water: 'resist' }, price: 1800, tier: 6 },
  tricorne:      { name: 'Tricorne', slot: 'head', htype: 'hat', look: 'feather', hp: 14, evade: 6, spd: 1, price: 1500, tier: 5 },
  anchorCharm:   { name: 'Anchor Charm', slot: 'acc', hp: 30, pa: 2, price: 1600, tier: 6 },
  pearlOfTheDeep:{ name: 'Pearl of the Deep', late: true, slot: 'acc', ma: 4, mp: 30, resist: { water: 'absorb' }, price: 7600, tier: 7 },
  leviathanScale:{ name: 'Leviathan Scale', late: true, slot: 'body', atype: 'heavy', hp: 74, resist: { water: 'absorb' }, price: 8800, tier: 7 },
  stormCutlass:  { name: 'Storm Cutlass', late: true, slot: 'weapon', wtype: 'sword', power: 20, range: 1, vert: 2, spd: 1, evade: 6, resist: { thunder: 'resist' }, price: 8400, tier: 7 },
  drownedCrown:  { name: 'Drowned Crown', late: true, slot: 'head', htype: 'helm', look: 'helm', hp: 42, ma: 4, resist: { water: 'resist' }, price: 7600, tier: 7 },
  // Every trade finds something new on the wagon at every tier.
  ironKnuckles:  { name: 'Iron Knuckles', slot: 'weapon', wtype: 'fist', power: 8, range: 1, vert: 3, price: 300, tier: 1 },
  leatherWraps:  { name: 'Leather Wraps', slot: 'weapon', wtype: 'fist', power: 9, range: 1, vert: 3, spd: 1, price: 600, tier: 2 },
  steelCesti:    { name: 'Steel Cesti', slot: 'weapon', wtype: 'fist', power: 12, range: 1, vert: 3, price: 1300, tier: 4 },
  dragonClaws:   { name: 'Dragon Claws', slot: 'weapon', wtype: 'fist', power: 16, range: 1, vert: 3, resist: { fire: 'resist' }, price: 2400, tier: 6 },
  kaiserKnuckles:{ name: 'Kaiser Knuckles', late: true, slot: 'weapon', wtype: 'fist', power: 20, range: 1, vert: 3, spd: 1, price: 8000, tier: 7 },
  huntingBow:    { name: 'Hunting Bow', slot: 'weapon', wtype: 'bow', power: 5, range: 4, vert: 6, price: 300, tier: 1 },
  yewBow:        { name: 'Yew Bow', slot: 'weapon', wtype: 'bow', power: 8, range: 5, vert: 6, price: 900, tier: 3 },
  compositeBow:  { name: 'Composite Bow', slot: 'weapon', wtype: 'bow', power: 10, range: 5, vert: 6, price: 1300, tier: 4 },
  artemisBow:    { name: 'Artemis Bow', late: true, slot: 'weapon', wtype: 'bow', power: 16, range: 6, vert: 8, evade: 4, price: 8000, tier: 7 },
  lute:          { name: 'Lute', slot: 'weapon', wtype: 'harp', power: 4, range: 3, vert: 4, ma: 3, price: 600, tier: 2 },
  thornLyre:     { name: 'Lyre of Thorns', slot: 'weapon', wtype: 'harp', power: 5, range: 3, vert: 4, ma: 4, price: 900, tier: 3 },
  fairyHarp:     { name: 'Glimmer Harp', slot: 'weapon', wtype: 'harp', power: 7, range: 3, vert: 4, ma: 6, mp: 20, price: 1800, tier: 5 },
  lamiaHarp:     { name: 'Lamia Harp', late: true, slot: 'weapon', wtype: 'harp', power: 9, range: 4, vert: 4, ma: 9, mp: 30, price: 8000, tier: 7 },
  ironKunai:     { name: 'Iron Kunai', slot: 'weapon', wtype: 'ninjablade', power: 7, range: 1, vert: 2, spd: 1, price: 600, tier: 2 },
  steelNinjato:  { name: 'Steel Ninjato', slot: 'weapon', wtype: 'ninjablade', power: 8, range: 1, vert: 2, spd: 1, evade: 2, price: 900, tier: 3 },
  kagenui:       { name: 'Kagenui', slot: 'weapon', wtype: 'ninjablade', power: 11, range: 1, vert: 2, spd: 2, price: 1800, tier: 5 },
  kogaBlade:     { name: 'Koga Blade', late: true, slot: 'weapon', wtype: 'ninjablade', power: 15, range: 1, vert: 2, spd: 2, evade: 6, price: 8000, tier: 7 },
  osafune:       { name: 'Osafune', slot: 'weapon', wtype: 'katana', power: 9, range: 1, vert: 2, price: 600, tier: 2 },
  masamuneKai:   { name: 'Kikuichimonji', slot: 'weapon', wtype: 'katana', power: 12, range: 1, vert: 2, ma: 2, price: 1300, tier: 4 },
  kiyomori:      { name: 'Sakura Edge', slot: 'weapon', wtype: 'katana', power: 14, range: 1, vert: 2, evade: 3, price: 1800, tier: 5 },
  oakRod:        { name: 'Oak Rod', slot: 'weapon', wtype: 'rod', power: 4, range: 1, vert: 2, ma: 3, price: 300, tier: 1 },
  thunderRod:    { name: 'Thunder Rod', slot: 'weapon', wtype: 'rod', power: 5, range: 1, vert: 2, ma: 5, resist: { thunder: 'resist' }, price: 900, tier: 3 },
  sageRod:       { name: 'Sage\'s Rod', slot: 'weapon', wtype: 'rod', power: 5, range: 1, vert: 2, ma: 6, mp: 15, price: 1300, tier: 4 },
  rodOfZeus:     { name: 'Rod of Zeus', late: true, slot: 'weapon', wtype: 'rod', power: 8, range: 1, vert: 2, ma: 12, resist: { thunder: 'absorb' }, price: 8000, tier: 7 },
  oakStaff:      { name: 'Oak Staff', slot: 'weapon', wtype: 'staff', power: 4, range: 1, vert: 2, ma: 2, mp: 10, price: 300, tier: 1 },
  wizardStaff:   { name: 'Wizard Staff', slot: 'weapon', wtype: 'staff', power: 6, range: 1, vert: 2, ma: 6, price: 1300, tier: 4 },
  mageMasher:    { name: 'Mage Masher', slot: 'weapon', wtype: 'knife', power: 6, range: 1, vert: 2, ma: 2, price: 600, tier: 2 },
  mythrilKnife:  { name: 'Mythril Knife', slot: 'weapon', wtype: 'knife', power: 7, range: 1, vert: 2, spd: 1, price: 900, tier: 3 },
  orichalcum:    { name: 'Orichalcum', slot: 'weapon', wtype: 'knife', power: 9, range: 1, vert: 2, spd: 2, price: 1800, tier: 5 },
  zeusDagger:    { name: 'Dagger of Zeus', late: true, slot: 'weapon', wtype: 'knife', power: 12, range: 1, vert: 2, spd: 2, evade: 6, price: 8000, tier: 7 },
  javelin:       { name: 'Javelin', slot: 'weapon', wtype: 'spear', power: 7, range: 2, vert: 3, price: 300, tier: 1 },
  glaive:        { name: 'Glaive', slot: 'weapon', wtype: 'spear', power: 10, range: 2, vert: 3, price: 900, tier: 3 },
  halberd:       { name: 'Halberd', slot: 'weapon', wtype: 'spear', power: 12, range: 2, vert: 3, price: 1300, tier: 4 },
  primer:        { name: 'Primer', slot: 'weapon', wtype: 'tome', power: 5, range: 2, vert: 3, ma: 3, price: 300, tier: 1 },
  spellbook:     { name: 'Spellbook', slot: 'weapon', wtype: 'tome', power: 6, range: 2, vert: 3, ma: 5, price: 600, tier: 2 },
  lexicon:       { name: 'Lexicon', slot: 'weapon', wtype: 'tome', power: 8, range: 2, vert: 3, ma: 8, mp: 15, price: 1300, tier: 4 },
  necronomicon:  { name: 'Necronomicon', slot: 'weapon', wtype: 'tome', power: 9, range: 2, vert: 3, ma: 10, mp: 25, price: 1800, tier: 5 },
  hatchet:       { name: 'Hatchet', slot: 'weapon', wtype: 'axe', power: 7, range: 1, vert: 2, price: 300, tier: 1 },
  broadaxe:      { name: 'Broadaxe', slot: 'weapon', wtype: 'axe', power: 11, range: 1, vert: 2, price: 900, tier: 3 },
  giantAxe:      { name: 'Giant Axe', slot: 'weapon', wtype: 'axe', power: 17, range: 1, vert: 2, price: 2400, tier: 6 },
  slasher:       { name: 'Slasher', late: true, slot: 'weapon', wtype: 'axe', power: 22, range: 1, vert: 2, pa: 2, price: 8000, tier: 7 },
  steelClaymore: { name: 'Steel Claymore', slot: 'weapon', wtype: 'greatsword', power: 12, range: 1, vert: 2, price: 600, tier: 2 },
  flamberge:     { name: 'Flamberge', slot: 'weapon', wtype: 'greatsword', power: 16, range: 1, vert: 2, resist: { fire: 'resist' }, price: 1300, tier: 4 },
  mythrilSword:  { name: 'Mythril Sword', slot: 'weapon', wtype: 'sword', power: 12, range: 1, vert: 2, price: 1300, tier: 4 },
  // The crown: what the palace armouries hold, and what its markets sell.
  marshalsBlade: { name: 'Marshal\'s Blade', late: true, slot: 'weapon', wtype: 'sword', power: 21, range: 1, vert: 2, pa: 2, price: 8800, tier: 7 },
  rodOfOffice:   { name: 'Rod of Office', late: true, slot: 'weapon', wtype: 'rod', power: 8, range: 1, vert: 2, ma: 11, resist: { holy: 'resist' }, price: 8400, tier: 7 },
  rapier:        { name: 'Rapier', slot: 'weapon', wtype: 'sword', power: 13, range: 1, vert: 2, spd: 1, evade: 6, price: 2200, tier: 6 },
  regentsPlate:  { name: 'Regent\'s Plate', late: true, slot: 'body', atype: 'heavy', hp: 76, pa: 1, price: 9200, tier: 7 },
  griffonMantle: { name: 'Griffon Mantle', late: true, slot: 'body', atype: 'light', hp: 56, jump: 2, evade: 6, price: 8400, tier: 7 },
  golemHeart:    { name: 'Golem Heart', late: true, slot: 'acc', hp: 40, resist: { earth: 'absorb' }, price: 7600, tier: 7 },
  sealOfOffice:  { name: 'Seal of Office', late: true, slot: 'acc', ma: 3, mp: 30, wards: ['silence'], price: 8000, tier: 7 },
  courtBlade:    { name: 'Court Blade', city: 'elderonCity', slot: 'weapon', wtype: 'sword', power: 16, range: 1, vert: 2, ma: 2, price: 2900, tier: 6 },
  kingsGuardHelm:{ name: 'King\'s Guard Helm', city: 'elderonCity', late: true, slot: 'head', htype: 'helm', look: 'helm', hp: 44, pa: 2, price: 7800, tier: 7 },
  leagueCoat:    { name: 'League Coat', city: 'aldermere', slot: 'body', atype: 'light', hp: 52, mp: 20, price: 2700, tier: 6 },
  charterRing:   { name: 'Charter Ring', city: 'aldermere', late: true, slot: 'acc', pa: 2, ma: 2, evade: 4, price: 8000, tier: 7 },
  saltwickSabre: { name: 'Saltwick Sabre', city: 'saltwick', slot: 'weapon', wtype: 'sword', power: 15, range: 1, vert: 2, spd: 1, price: 2700, tier: 6 },
  wreckersCoat:  { name: 'Wrecker\'s Coat', city: 'saltwick', slot: 'body', atype: 'light', hp: 50, evade: 5, price: 2500, tier: 6 },
  queensTrident: { name: 'Queen\'s Trident', city: 'tessaly', late: true, slot: 'weapon', wtype: 'spear', power: 22, range: 2, vert: 4, ma: 4, resist: { water: 'absorb' }, price: 9200, tier: 7 },
  tessalyPearl:  { name: 'Pearl of Tessaly', city: 'tessaly', late: true, slot: 'acc', pa: 2, ma: 2, spd: 1, evade: 6, price: 8400, tier: 7 },
};

// Free starting kit per job (price-0 items only, so they cannot be sold for gil).
const STARTER_GEAR = {
  squire:    { weapon: 'shortSword', body: 'clothes' },
  chemist:   { weapon: 'dagger', body: 'clothes' },
  knight:    { weapon: 'shortSword', body: 'clothes' },
  archer:    { weapon: 'shortbow', body: 'clothes' },
  engineer:  { weapon: 'dagger', body: 'clothes' },
  gunner:    { weapon: 'flintlock', body: 'clothes' },
  aeronaut:  { weapon: 'flintlock', body: 'clothes' },
  artificer: { weapon: 'flintlock', body: 'clothes' },
  frostweaver: { weapon: 'dagger', body: 'clothes' },
  warden:    { weapon: 'shortSword', body: 'clothes' },
  runeblade: { weapon: 'shortSword', body: 'clothes' },
  corsair:   { weapon: 'shortSword', body: 'clothes' },
  marshal:   { weapon: 'shortSword', body: 'clothes' },
  inquisitor: { weapon: 'rod', body: 'clothes' },
  duelist:   { weapon: 'shortSword', body: 'clothes' },
  tidecaller: { weapon: 'rod', body: 'clothes' },
  harpooner: { weapon: 'spear', body: 'clothes' },
  monk:      { weapon: 'cesti', body: 'clothes' },
  thief:     { weapon: 'dagger', body: 'clothes' },
  whiteMage: { weapon: 'staff', body: 'clothes' },
  blackMage: { weapon: 'rod', body: 'clothes' },
  timeMage:  { weapon: 'staff', body: 'clothes' },
  ninja:     { weapon: 'kunai', body: 'clothes' },
  dragoon:   { weapon: 'spear', body: 'clothes' },
  samurai:   { weapon: 'ashuraBlade', body: 'clothes' },
  summoner:  { weapon: 'rod', body: 'clothes' },
  geomancer: { weapon: 'shortSword', body: 'clothes' },
  bard:      { weapon: 'ramiaHarp', body: 'clothes' },
  paladin:   { weapon: 'ironGreatsword', body: 'clothes' },
  arcanist:  { weapon: 'grimoire', body: 'clothes' },
  assassin:  { weapon: 'kunai', body: 'clothes' },
  sage:      { weapon: 'grimoire', body: 'clothes' },
  dragonlord:{ weapon: 'spear', body: 'clothes' },
  hierophant:{ weapon: 'grimoire', body: 'clothes' },
  fellKnight:{ weapon: 'shortSword', body: 'clothes' },
};

const SLOT_NAMES = { weapon: 'Weapon', offhand: 'Offhand', head: 'Head', body: 'Body', acc: 'Accessory' };

// How the baggage is sorted: a category for the tab, a type for the shelf.
const CATEGORY_NAMES = { weapon: 'Weapons', offhand: 'Shields', head: 'Head', body: 'Body', acc: 'Accessories', material: 'Materials' };
const TYPE_NAMES = {
  sword: 'Swords', knife: 'Knives', axe: 'Axes', spear: 'Spears', bow: 'Bows', gun: 'Guns', staff: 'Staves', rod: 'Rods',
  katana: 'Katanas', harp: 'Harps', greatsword: 'Greatswords', tome: 'Tomes', ninjablade: 'Ninja Blades', fist: 'Fists',
  light: 'Light Armour', heavy: 'Heavy Armour', cloth: 'Clothes', robe: 'Robes', hat: 'Hats', helm: 'Helms', shield: 'Shields', acc: 'Accessories',
  material: 'Materials',
};
// The type an item shelves under: its weapon, armour, hat or shield kind, or accessory.
function itemType(id) { const it = ITEMS[id]; return it ? (it.slot === 'material' ? 'material' : it.wtype || it.atype || it.htype || it.otype || 'acc') : 'acc'; }
// The order shelves come in: weapons by kind, then shields, head, body, accessories.
const TYPE_ORDER = Object.keys(TYPE_NAMES);
const GEAR_STATS = ['hp', 'mp', 'pa', 'ma', 'spd', 'move', 'jump', 'evade'];

// Can `job` equip item `id` at all? `extra` adds permissions granted elsewhere,
// such as the Armour Training support ability.
function canEquip(job, id, extra) {
  const it = ITEMS[id], eq = JOB_EQUIP[job];
  // A beast has no hands for arms or armour, but it will wear a collar.
  if (it && !eq && JOBS[job] && JOBS[job].kind === 'monster') return it.slot === 'acc';
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
  if (it && !eq) return slot === 'acc' && canEquip(job, id, extra);
  if (!it || !eq) return false;
  if (slot === 'offhand' && it.slot === 'weapon') return !!eq.dual && canEquip(job, id, extra);
  return it.slot === slot && canEquip(job, id, extra);
}

// Every item id this job could put in the slot, from a pool of ids.
function itemsForSlot(job, slot, ids, extra) {
  return (ids || Object.keys(ITEMS)).filter(id => canEquipInSlot(job, id, slot, extra));
}

// A unit's multiplier against an element: what it is, then what it wears.
// The strongest single answer wins rather than stacking, so two fire resists
// never make a unit immune by accident.
function affinityOf(unit, element) {
  if (!element || !ELEMENTS[element]) return 1;
  const sources = [];
  const innate = (unit.jobData || {}).affinity;
  if (innate && innate[element]) sources.push(innate[element]);
  for (const slot of Object.keys(SLOT_NAMES)) {
    const it = unit.equipped ? unit.equipped(slot) : null;
    if (it && it.resist && it.resist[element]) sources.push(it.resist[element]);
  }
  if (!sources.length) return 1;
  // Order of authority: absorb beats immune beats resist beats weak.
  for (const kind of ['absorb', 'immune', 'resist', 'weak']) {
    if (sources.includes(kind)) return AFFINITY[kind];
  }
  return 1;
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
  // An element answered is worth something, but not more than solid numbers:
  // most attacks in a given battle carry no element at all.
  for (const kind of Object.values(it.resist || {})) {
    s += { absorb: 9, immune: 7, resist: 4, weak: -9 }[kind] || 0;
  }
  return s;
}

// The best loadout for a job from a pool of item ids (defaults to everything up
// to `maxTier`). Returns a gear object; slots with nothing available are absent.
function bestGearFor(job, pool, maxTier, extra) {
  const eq = JOB_EQUIP[job];
  if (!eq) return {};
  // The default pool is what a wagon could sell: never an improved piece,
  // a forge's recipe or a material, which would otherwise win every slot.
  const ids = pool || Object.keys(ITEMS).filter(i => ITEMS[i].tier <= (maxTier === undefined ? 6 : maxTier) && !ITEMS[i].base && !ITEMS[i].forge && ITEMS[i].slot !== 'material');
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

// Items an enemy of the given job and level carries. Their gear deliberately
// lags what the player can buy at the same point, so the shop stays worth
// visiting and early fights are not decided by equipment the party lacks.
// The master-tier gear that arrived with the later jobs is marked `late` and is
// never issued to enemies: the campaign was balanced before it existed, and an
// evasion cloak on every bandit past chapter five would quietly re-tune every
// fight.
function enemyGearFor(job, level, tierShift) {
  const tier = Math.max(0, Math.min(6, Math.floor((level - 1) / 1.8) + (tierShift || 0)));
  // A scripted weakness is part of the fight, so an enemy is never issued the
  // piece of gear that would quietly cancel it.
  const innate = (JOBS[job] && JOBS[job].affinity) || {};
  const weak = Object.keys(innate).filter(e => innate[e] === 'weak');
  const pool = Object.keys(ITEMS).filter(i => ITEMS[i].tier <= tier && !ITEMS[i].late && !ITEMS[i].city && !ITEMS[i].forge && !ITEMS[i].base && ITEMS[i].slot !== 'material' && !(ITEMS[i].resist && weak.some(e => ITEMS[i].resist[e])));
  return bestGearFor(job, pool, tier);
}

// ============================================================================
// The forge: materials, what a city's smiths make, and improvement
// ============================================================================
/* Materials are items too: they sit in the baggage, count and sell like
   spare gear, and fit no slot. A won field leaves a few behind, a spare
   piece broken down at a forge gives some back, and a forge sells the rest. */
const MATERIALS = {
  ironIngot:    { name: 'Iron Ingot', slot: 'material', price: 90, tier: 1, desc: 'Plain bar iron, for blades, hafts, mail, helms and shields.' },
  oakHeartwood: { name: 'Oak Heartwood', slot: 'material', price: 110, tier: 1, desc: 'Seasoned heartwood, for bows, staves, rods, harps and tomes.' },
  silkBolt:     { name: 'Silk Bolt', slot: 'material', price: 140, tier: 2, desc: 'Close-woven silk, for clothes, robes, cloaks and hats.' },
  steelIngot:   { name: 'Steel Ingot', slot: 'material', price: 260, tier: 3, desc: 'Folded steel, for the better blades and plate.' },
  brassFitting: { name: 'Brass Fitting', slot: 'material', price: 300, tier: 3, desc: 'Turned brass: locks, barrels and the works of a gun.' },
  emberGlass:   { name: 'Ember Glass', slot: 'material', price: 650, tier: 4, desc: 'Glass with a coal still burning in it. A forge asks for it at the last step.' },
  starIron:     { name: 'Star-Iron', slot: 'material', price: 1800, tier: 7, desc: 'Iron that fell from the sky. The Hollow Market sells it by weight.' },
};

/* What a city's smiths can make and nobody sells: materials and marks in, one
   piece out. `forge` names the city; `cost` is what it asks. The guns among
   them are the only guns past the wagon's, so a company that shoots has a
   reason to open the workshop towns. */
const FORGE_ITEMS = {
  // Redwater: quarry steel and reaver leather.
  quarryMaul:    { name: 'Quarry Maul', forge: 'redwater', slot: 'weapon', wtype: 'axe', power: 12, range: 1, vert: 2, spd: -1, price: 800, tier: 2, cost: { ironIngot: 3, oakHeartwood: 1 } },
  reaverMail:    { name: 'Reaver Mail', forge: 'redwater', slot: 'body', atype: 'heavy', hp: 30, evade: 2, price: 700, tier: 2, cost: { ironIngot: 3 } },
  // Dunmarch: the chapel and the garrison armoury.
  chapelHelm:    { name: 'Chapel Helm', forge: 'dunmarchTown', slot: 'head', htype: 'helm', look: 'helm', hp: 18, mp: 10, price: 750, tier: 3, cost: { ironIngot: 2, silkBolt: 1 } },
  wardingRod:    { name: 'Warding Rod', forge: 'dunmarchTown', slot: 'weapon', wtype: 'rod', power: 5, range: 1, vert: 2, ma: 6, resist: { dark: 'resist' }, price: 1000, tier: 3, cost: { oakHeartwood: 2, silkBolt: 1 } },
  // Fordwater: the workshops, and the first gun a forge can make.
  pepperbox:     { name: 'Pepperbox', forge: 'fordwaterTown', slot: 'weapon', wtype: 'gun', power: 9, range: 4, vert: 9, evade: 4, price: 1300, tier: 4, cost: { brassFitting: 2, ironIngot: 2 } },
  ferrymanCoat:  { name: 'Ferryman\'s Coat', forge: 'fordwaterTown', slot: 'body', atype: 'light', hp: 32, resist: { water: 'resist' }, price: 1100, tier: 4, cost: { silkBolt: 2, ironIngot: 1 } },
  // Cogsworth: bridgewrights, boilers and long barrels.
  longRifle:     { name: 'Long Rifle', forge: 'cogsworthTown', slot: 'weapon', wtype: 'gun', power: 11, range: 7, vert: 9, spd: -1, price: 1900, tier: 5, cost: { brassFitting: 3, steelIngot: 1, oakHeartwood: 1 } },
  boilerPlate:   { name: 'Boiler Plate', forge: 'cogsworthTown', slot: 'body', atype: 'heavy', hp: 52, resist: { fire: 'resist' }, price: 1800, tier: 5, cost: { steelIngot: 3, brassFitting: 1 } },
  // Hearthold: the forge that remembers fire.
  hearthSpear:   { name: 'Hearth Spear', forge: 'hearthold', slot: 'weapon', wtype: 'spear', power: 13, range: 2, vert: 3, resist: { ice: 'resist' }, price: 2000, tier: 5, cost: { steelIngot: 2, oakHeartwood: 2 } },
  emberCloak:    { name: 'Ember Cloak', forge: 'hearthold', slot: 'body', atype: 'robe', hp: 34, mp: 30, resist: { ice: 'resist' }, price: 1900, tier: 5, cost: { silkBolt: 3, emberGlass: 1 } },
  // The Hollow Market: star-iron, worked.
  fallenStarBlade: { name: 'Fallen-star Blade', forge: 'hollowMarket', late: true, slot: 'weapon', wtype: 'sword', power: 18, range: 1, vert: 2, ma: 3, price: 7000, tier: 7, cost: { starIron: 2, steelIngot: 2 } },
  starIronRifle: { name: 'Star-iron Rifle', forge: 'hollowMarket', late: true, slot: 'weapon', wtype: 'gun', power: 15, range: 6, vert: 9, ma: 2, price: 7400, tier: 7, cost: { starIron: 2, brassFitting: 3 } },
  // Saltwick: the chandlery's smith.
  seaDogPistol:  { name: 'Sea-dog Pistol', forge: 'saltwick', slot: 'weapon', wtype: 'gun', power: 11, range: 4, vert: 9, evade: 6, price: 2300, tier: 6, cost: { brassFitting: 3, steelIngot: 1 } },
  wreckersHook:  { name: 'Wrecker\'s Hook', forge: 'saltwick', slot: 'weapon', wtype: 'spear', power: 13, range: 2, vert: 4, evade: 4, price: 2200, tier: 6, cost: { steelIngot: 2, oakHeartwood: 2 } },
  // Tessaly: what the drowned smiths still make.
  pearlBow:      { name: 'Pearl Bow', forge: 'tessaly', slot: 'weapon', wtype: 'bow', power: 10, range: 6, vert: 8, ma: 3, price: 2500, tier: 6, cost: { oakHeartwood: 3, emberGlass: 1 } },
  tidewardHelm:  { name: 'Tideward Helm', forge: 'tessaly', slot: 'head', htype: 'helm', look: 'helm', hp: 32, mp: 15, resist: { water: 'immune' }, price: 2400, tier: 6, cost: { steelIngot: 2, emberGlass: 1 } },
  // Aldermere: the league's armourers.
  charterShield: { name: 'Charter Shield', forge: 'aldermere', slot: 'offhand', otype: 'shield', evade: 24, hp: 24, price: 2300, tier: 6, cost: { steelIngot: 2, silkBolt: 1 } },
  duelistBlade:  { name: 'Duelist\'s Blade', forge: 'aldermere', slot: 'weapon', wtype: 'knife', power: 10, range: 1, vert: 2, spd: 2, evade: 8, price: 2400, tier: 6, cost: { steelIngot: 2, emberGlass: 1 } },
  // Elderon City: the guard's own armouries.
  handCannon:    { name: 'Hand Cannon', forge: 'elderonCity', slot: 'weapon', wtype: 'gun', power: 16, range: 3, vert: 9, spd: -1, price: 2700, tier: 6, cost: { brassFitting: 3, steelIngot: 2 } },
  crownPlate:    { name: 'Crown Plate', forge: 'elderonCity', slot: 'body', atype: 'heavy', hp: 66, pa: 1, price: 2900, tier: 6, cost: { steelIngot: 4, emberGlass: 1 } },
};
Object.assign(ITEMS, MATERIALS, FORGE_ITEMS);

/* Improvement. Any weapon, shield, helm or armour can be raised +1, +2 and
   +3 at a forge. Each level is an item of its own (`longsword+2`), so the
   baggage counts it, a save keeps it, the sprite wears it and the shop never
   sees it: a variant carries `base` and `plus`, and nothing that sells or
   issues gear touches one. Power climbs by a point a level; what protects
   climbs by a share of itself, so a cloak and a plate both feel it. */
const FORGE_MAX = 3;
const FORGE_SLOTS = ['weapon', 'offhand', 'head', 'body'];
function upgradeable(id) { const it = ITEMS[id]; return !!it && !it.base && FORGE_SLOTS.includes(it.slot); }
function forgeVariant(id, plus) {
  const b = ITEMS[id];
  const v = Object.assign({}, b, { name: `${b.name} +${plus}`, base: id, plus });
  delete v.city; delete v.forge; delete v.cost;
  if (b.power) v.power = b.power + plus;
  if (b.hp) v.hp = b.hp + Math.max(3, Math.round(b.hp * 0.15)) * plus;
  if (b.mp) v.mp = b.mp + Math.max(2, Math.round(b.mp * 0.1)) * plus;
  if (b.evade) v.evade = b.evade + (b.slot === 'offhand' ? 2 : 1) * plus;
  // Free starter kit gains a value once it has been worked: the smith's
  // labour is what is being sold back, not the gift.
  v.price = b.price ? Math.round(b.price * (1 + 0.35 * plus)) : 80 * plus;
  return v;
}
for (const id of Object.keys(ITEMS)) if (upgradeable(id)) for (let p = 1; p <= FORGE_MAX; p++) ITEMS[`${id}+${p}`] = forgeVariant(id, p);

// Which material a piece is made of, for improving it and for what it gives
// back when broken down.
function forgeMaterial(id) {
  const it = ITEMS[id], base = ITEMS[it.base || id], t = itemType(it.base || id);
  if (t === 'gun') return 'brassFitting';
  if (['bow', 'staff', 'rod', 'harp', 'tome'].includes(t)) return 'oakHeartwood';
  if (['light', 'cloth', 'robe', 'hat'].includes(t)) return 'silkBolt';
  return base.tier >= 3 ? 'steelIngot' : 'ironIngot';
}

// The next step up from a piece: the item it becomes and what the smith
// asks, or null when it is as good as it gets. The last step wants a coal
// of ember glass, or star-iron for the legendary arms.
function forgeCost(id) {
  const it = ITEMS[id];
  if (!it || !upgradeable(it.base || id)) return null;
  const plus = (it.plus || 0) + 1;
  if (plus > FORGE_MAX) return null;
  const baseId = it.base || id, base = ITEMS[baseId];
  const mats = { [forgeMaterial(baseId)]: plus };
  if (plus === FORGE_MAX) mats[base.tier >= 7 ? 'starIron' : 'emberGlass'] = 1;
  return { to: `${baseId}+${plus}`, plus, mats, gil: Math.max(120 * plus, Math.round((base.price || 200) * 0.3 * plus)) };
}

// What breaking a spare piece down gives back, or null for what cannot be
// (accessories and materials). Better steel yields more; the work already
// put into an improved piece is half recovered.
function salvageYield(id) {
  const it = ITEMS[id];
  if (!it || !upgradeable(it.base || id)) return null;
  const baseId = it.base || id, base = ITEMS[baseId];
  const out = { [forgeMaterial(baseId)]: 1 + (base.tier >= 4 ? 1 : 0) + Math.floor((it.plus || 0) / 2) };
  if (base.tier >= 5) out.emberGlass = 1;
  if (base.tier >= 7) out.starIron = 1;
  return out;
}

// What a won field leaves for the forge: a few materials at about the
// wagon's tier, leaning to the best of them, and one more from a battle
// that paid well. Star-iron only where the legendary arms already are.
function fieldMaterials(tier, rich, rnd = Math.random) {
  const pool = Object.keys(MATERIALS).filter(m => MATERIALS[m].tier <= Math.max(1, tier));
  const weight = m => MATERIALS[m].tier >= 7 ? 1 : 1 + MATERIALS[m].tier;
  const total = pool.reduce((a, m) => a + weight(m), 0);
  const n = 1 + (rich ? 1 : 0) + (rnd() < 0.5 ? 1 : 0);
  const out = {};
  for (let i = 0; i < n; i++) {
    let r = rnd() * total;
    for (const m of pool) { r -= weight(m); if (r <= 0) { out[m] = (out[m] || 0) + 1; break; } }
  }
  return out;
}

// Whether an item belongs on a shelf, in the wagon or in a chance find: not
// a city's own stock, not a forge's work, not an improved piece, not a
// material. Every pool that hands out gear goes through this.
function sellable(id) {
  const it = ITEMS[id];
  return !!it && it.price > 0 && !it.city && !it.forge && !it.base && it.slot !== 'material';
}

// ============================================================================
// Passive abilities: reaction, support and movement
// ============================================================================
// Learned with SP inside a job, but once learned they can be equipped no matter
// which job the unit is currently wearing. One of each kind at a time.

// ============================================================================
// Beasts
// ============================================================================
// Creatures that will fight for the company. A beast is a unit whose job is one
// of the monster jobs above, on the player's side: its stats come from that job,
// and its skills are the job's, learned not with SP spent but with a bond that
// deepens as it fights. The first skill it knows at once; each further one opens
// at the next bond level (the job-level table: level 2 at 100 SP, 3 at 250).
//
// A beast is won two ways: Tame, an Archer's ability, on a wild creature below
// half its health, or bought from a city's kennel. Only the species here can be
// tamed or kept; bosses and the things at the bottom of the sea never can.
const PET_MAX = 4;
const PETS = {
  wolf:      { price: 600,  names: ['Ash', 'Ember', 'Brindle', 'Sable'],
               desc: 'Fast, loyal, and fond of a flank. Howl lifts the whole pack.' },
  goblin:    { price: 500,  names: ['Nib', 'Grub', 'Tallow', 'Sprocket'],
               desc: 'Vicious for its size and cheap to feed. It fights for whoever fed it last.' },
  bomb:      { price: 800,  names: ['Cinder', 'Wick', 'Fuse', 'Kettle'],
               desc: 'A floating ember that drinks fire. Keep it away from ice, and from anyone it might explode near.' },
  skeleton:  { price: 900,  names: ['Old Bones', 'Rattle', 'Marrow', 'Knuckle'],
               desc: 'It has forgotten everything but the war, and now, apparently, you. Holy light and fire undo it.' },
  wisp:      { price: 900,  names: ['Lantern', 'Glim', 'Fen', 'Marsh'],
               desc: 'A light over the water that has decided to follow you instead. Thunder feeds it.' },
  treant:    { price: 1200, names: ['Alder', 'Yew', 'Elm', 'Hazel'],
               desc: 'Slow, old and immensely strong. It roots what it catches and does not mind being disturbed by you.' },
  ironhound: { price: 1500, names: ['Rivet', 'Bolt', 'Cog', 'Piston'],
               desc: 'A wolf as the Concord would build one, running on your side of the line now. Lightning gets in.' },
  sentinel:  { price: 1600, names: ['Tock', 'Anvil', 'Brass', 'Boiler'],
               desc: 'An inch of brass around a boiler. It goes where it is pointed and stops for nothing but lightning.' },
  iceDrake:  { price: 2600, names: ['Hoar', 'Sleet', 'Glass', 'Frost'],
               desc: 'The Court\'s hunting drake, with a breath that stops the blood. Fire and holy light are what it fears.' },
  reefCrab:  { price: 1400, names: ['Pinch', 'Barnacle', 'Scuttle', 'Cockle'],
               desc: 'A shell the size of a door with a temper inside it. Thunder gets through the shell.' },
  siren:     { price: 1800, names: ['Lull', 'Hush', 'Echo', 'Tide'],
               desc: 'It sang ships onto the rocks once. It sings for the company now, and the enemy still listens.' },
  griffon:   { price: 2800, names: ['Gale', 'Talon', 'Quill', 'Sky'],
               desc: 'The crown\'s hunting beast, and nothing on the field is too high for it.' },
  golem:     { price: 2600, names: ['Cairn', 'Flint', 'Mortar', 'Slab'],
               desc: 'Stone that walks. Slow, and very hard to move once it has decided to stand somewhere.' },
};

// A name for a new beast of `job` that no one in `taken` already has.
function petNameFor(job, taken) {
  const used = new Set(taken || []);
  const pool = ((PETS[job] || {}).names || []).filter(n => !used.has(n));
  if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  const base = JOBS[job] ? JOBS[job].name : 'Beast';
  for (let i = 2; ; i++) if (!used.has(`${base} ${i}`)) return `${base} ${i}`;
}

// The bond level a beast needs before it knows the i-th skill of its kind:
// the first at level 1, which every beast has, and one more each level after.
function petSkillBond(i) { return i + 1; }

const PASSIVES = {
  // ---- reaction: triggered when something happens to the unit ----
  counter: { name: 'Counter', kind: 'reaction', job: 'monk', jp: 250,
    desc: 'Strike back when a foe within your weapon\'s reach damages you with a physical attack.' },
  autoPotion: { name: 'Stopgap Draught', kind: 'reaction', job: 'chemist', jp: 180,
    desc: 'Drink a potion for 35 HP whenever you take damage.' },
  parry: { name: 'Parry', kind: 'reaction', job: 'knight', jp: 250,
    desc: '35% chance to turn aside a physical attack entirely.' },
  absorbMp: { name: 'Spellsiphon', kind: 'reaction', job: 'blackMage', jp: 200,
    desc: 'Recover 10 MP whenever magick damages you.' },
  regenerator: { name: 'Mending Blood', kind: 'reaction', job: 'whiteMage', jp: 220,
    desc: 'Gain Regen the first time you are damaged in a battle.' },
  vengeance: { name: 'Vengeance', kind: 'reaction', job: 'dragoon', jp: 260,
    desc: 'Physical Attack rises by 1 each time you are damaged.' },
  bladeGrasp: { name: 'Steel Catch', kind: 'reaction', job: 'samurai', jp: 400,
    desc: 'Catch the blade: half of all physical attacks against you are turned aside.' },
  secondWind: { name: 'Second Wind', kind: 'reaction', job: 'paladin', jp: 350,
    desc: 'Recover a tenth of your HP every time you are damaged and left standing.' },
  coldBlood: { name: 'Cold Blood', kind: 'support', job: 'frostweaver', jp: 350, desc: 'Ice damage you deal is a quarter greater.' },
  ironFooting: { name: 'Iron Footing', kind: 'movement', job: 'warden', jp: 300, desc: 'Slow and Stop do not take on you.' },
  lastStand: { name: 'Last Stand', kind: 'reaction', job: 'runeblade', jp: 400, desc: 'A hit that leaves you under a third of your HP grants Protect and Barrier.' },
  deadeye: { name: 'Deadeye', kind: 'support', job: 'gunner', jp: 300, desc: 'Anything used at weapon range reaches one tile further.' },
  jumpPlus3: { name: 'Balloon Pack', kind: 'movement', job: 'aeronaut', jp: 350, desc: 'Jump +3. Walls are a suggestion.' },
  fieldRepair: { name: 'Field Repair', kind: 'support', job: 'engineer', jp: 300, desc: 'Every heal you give restores 30% more.' },
  overcharge: { name: 'Overcharge', kind: 'reaction', job: 'artificer', jp: 400, desc: 'Every hit taken winds you tighter: Speed +1.' },
  dragonHeart: { name: 'Dragon Heart', kind: 'reaction', job: 'dragonlord', jp: 500,
    desc: 'Every wound makes you angrier: PA and MA both rise by 1 each time you are damaged.' },

  // ---- support: always-on modifiers ----
  attackUp: { name: 'Might', kind: 'support', job: 'knight', jp: 300,
    desc: 'Physical damage you deal rises by 25%.' },
  magickUp: { name: 'Arcane Might', kind: 'support', job: 'blackMage', jp: 300,
    desc: 'Magical damage you deal rises by 25%.' },
  defend: { name: 'Defend', kind: 'support', job: 'squire', jp: 250,
    desc: 'Physical damage you take falls by 20%.' },
  halfMp: { name: 'Thrift', kind: 'support', job: 'timeMage', jp: 320,
    desc: 'Spells cost half as much MP.' },
  twoHands: { name: 'Two-Handed', kind: 'support', job: 'knight', jp: 350,
    desc: 'Grip your weapon with both hands for 50% more weapon power. The offhand must be empty.' },
  concentrate: { name: 'Unerring', kind: 'support', job: 'archer', jp: 320,
    desc: 'Your physical attacks ignore evasion entirely.' },
  equipArmor: { name: 'Armour Training', kind: 'support', job: 'whiteMage', jp: 280,
    desc: 'Wear light and heavy armor whatever your job.' },
  martialArts: { name: 'Iron Fists', kind: 'support', job: 'monk', jp: 260,
    desc: 'Fist weapons strike for 50% more power.' },
  mpRegen: { name: 'Mana Well', kind: 'support', job: 'summoner', jp: 300,
    desc: 'Recover a tenth of your MP at the start of every turn.' },
  attuned: { name: 'Attunement', kind: 'support', job: 'geomancer', jp: 280,
    desc: 'Anything you do that carries an element does 25% more.' },
  arcaneEcho: { name: 'Arcane Echo', kind: 'support', job: 'arcanist', jp: 400,
    desc: 'Three times in ten, a spell costs no MP at all.' },
  firstStrike: { name: 'First Strike', kind: 'support', job: 'assassin', jp: 380,
    desc: 'Physical damage against a target at full HP rises by half.' },
  quickCast: { name: 'Quick Cast', kind: 'support', job: 'sage', jp: 450,
    desc: 'Everything you charge charges half again as fast.' },
  spellweave: { name: 'Spellweave', kind: 'support', job: 'hierophant', jp: 600,
    desc: 'Spells cost half their MP and charge twice as fast.' },
  lifesteal: { name: 'Fell Hunger', kind: 'support', job: 'fellKnight', jp: 550,
    desc: 'A fifth of every physical wound you deal comes back to you as HP.' },
  freebooter: { name: 'Freebooter', kind: 'support', job: 'corsair', jp: 320, desc: 'Every steal takes twice the marks.' },
  saltBlood: { name: 'Salt Blood', kind: 'support', job: 'tidecaller', jp: 350, desc: 'Water damage you deal is a quarter greater.' },
  monsterHunter: { name: 'Monster Hunter', kind: 'support', job: 'harpooner', jp: 380, desc: 'Physical damage against creatures rises by half.' },
  ironWill: { name: 'Iron Will', kind: 'movement', job: 'marshal', jp: 350, desc: 'Silence and Stop do not take on you.' },
  holyBlood: { name: 'Holy Blood', kind: 'support', job: 'inquisitor', jp: 350, desc: 'Holy damage you deal is a quarter greater.' },
  singleCombat: { name: 'Single Combat', kind: 'support', job: 'duelist', jp: 380, desc: 'Physical damage rises by a third when exactly one foe stands adjacent to you.' },

  // ---- movement: how the unit gets around ----
  movePlus1: { name: 'Move +1', kind: 'movement', job: 'thief', jp: 220,
    desc: 'Move one extra tile.' },
  movePlus2: { name: 'Move +2', kind: 'movement', job: 'ninja', jp: 400,
    desc: 'Move two extra tiles.' },
  jumpPlus2: { name: 'Jump +2', kind: 'movement', job: 'dragoon', jp: 220,
    desc: 'Climb two levels higher.' },
  sureFooting: { name: 'Sure Footing', kind: 'movement', job: 'ninja', jp: 320,
    desc: 'Height no longer limits where you can step.' },
  moveHpUp: { name: 'Walking Mend', kind: 'movement', job: 'monk', jp: 240,
    desc: 'Recover a tenth of your HP whenever you move.' },
  moveFindItem: { name: 'Treasure Hunter', kind: 'movement', job: 'thief', jp: 300,
    desc: 'Turn up 25 marks each time you move.' },
  moveMpUp: { name: 'Walking Focus', kind: 'movement', job: 'bard', jp: 240,
    desc: 'Recover a tenth of your MP whenever you move.' },
};

const PASSIVE_KINDS = { reaction: 'Reaction', support: 'Support', movement: 'Movement' };

// How deep a job sits in the tree: the roots are 0, and every other job is one
// deeper than the deepest job it asks for.
function jobTier(id, seen = {}) {
  const j = JOBS[id];
  if (!j || j.req === null) return -1;
  if (seen[id] !== undefined) return seen[id];
  const reqs = Object.keys(j.req);
  seen[id] = reqs.length ? 1 + Math.max(...reqs.map(r => jobTier(r, seen))) : 0;
  return seen[id];
}
// Work for a soldier away from the line: gone for a battle or two, back with
// pay, a little SP in whatever job they went in, and sometimes something found.
const ERRANDS = [
  { id: 'tithe', title: 'Escort the tithe wagon', days: 1, gil: 1.0, jp: 1.0, item: 0.2, text: 'The abbey pays for a blade beside its silver on the road to Millbrook.' },
  { id: 'wolves', title: 'Clear wolves from the high pasture', days: 1, gil: 0.9, jp: 1.3, item: 0.1, text: 'A shepherd has lost four ewes. He offers what he has, and it is honest.' },
  { id: 'survey', title: 'Survey the old quarry road', days: 2, gil: 1.5, jp: 1.4, item: 0.45, text: 'The guild wants the road walked end to end and every washout marked.' },
  { id: 'letters', title: 'Carry letters to the marsh towns', days: 1, gil: 0.8, jp: 0.9, item: 0.25, text: 'Nobody else will cross Sable Marsh with a satchel. The pay reflects that.' },
  { id: 'drill', title: 'Drill the town militia', days: 2, gil: 1.2, jp: 1.8, item: 0.1, text: 'Fordwater raises a militia and wants someone who has stood in a line to teach it.' },
  { id: 'relic', title: 'Recover a relic from the ruins', days: 2, gil: 1.3, jp: 1.2, item: 0.7, text: 'A scholar will pay for whatever comes out of Hollowmere intact. Something usually does.' },
  { id: 'ferry', title: 'Guard the night ferry', days: 1, gil: 1.1, jp: 1.0, item: 0.15, text: 'Two crossings, one lantern, and whatever is on the far bank.' },
  { id: 'tourney', title: 'Stand in a tourney', days: 1, gil: 1.4, jp: 1.5, item: 0.3, text: 'A lord wants a name on the lists that will draw a crowd. Win or lose, the purse is real.' },
  { id: 'cellar', title: 'Clear the abbey cellar', days: 1, gil: 0.9, jp: 1.1, item: 0.35, text: 'Something has moved in beneath the abbey. The brothers would rather not say what.' },
  { id: 'census', title: 'Take the census at Dunmarch', days: 2, gil: 1.6, jp: 0.8, item: 0.2, text: 'Every household counted and no one offended. Slower than fighting, better paid.' },
  { id: 'salvage', title: 'Salvage a wreck on the reef', days: 2, gil: 1.4, jp: 1.1, item: 0.6, text: 'A Concord hull is on the rocks off Saltwick. What the tide has not taken is anyone\'s who can carry it.' },
  { id: 'lighthouse', title: 'Keep the Saltwick light', days: 1, gil: 1.0, jp: 1.2, item: 0.15, text: 'The keeper has not come down in a week. Somebody has to climb up and light it, and see why.' },
  { id: 'envoy', title: 'Escort the cities\' envoy', days: 2, gil: 1.5, jp: 1.3, item: 0.3, text: 'Aldermere sends a delegate to the capital with a charter and no guard. The road is full of people who would like both.' },
  { id: 'granary', title: 'Guard the royal granary', days: 1, gil: 1.1, jp: 1.0, item: 0.2, text: 'Somebody is counting the grain twice and the numbers disagree. The Chancellor wants a sword on the door until they agree.' },
];

const TIER_NAMES = ['The roots', 'First rank', 'Second rank', 'Third rank', 'Fourth rank', 'Fifth rank', 'The summit'];


// The passives taught by a given job, in SP order.
function passivesOfJob(job) {
  return Object.keys(PASSIVES).filter(id => PASSIVES[id].job === job).sort((a, b) => PASSIVES[a].jp - PASSIVES[b].jp);
}

// Extra equip permissions granted by support abilities.
function passiveEquipBonus(unit) {
  const extra = { w: [], a: [], head: [] };
  if (unit.hasPassive('equipArmor')) { extra.a.push('light', 'heavy'); extra.head.push('helm'); }
  return extra;
}
