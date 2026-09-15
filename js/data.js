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
  silence: { name: 'Silence', dur: 48, bad: true,  color: '#8f8fa8', desc: 'Cannot use anything that costs MP.' },
  blind:   { name: 'Blind',   dur: 48, bad: true,  color: '#4a4a5a', desc: 'Physical attacks are half as likely to land.' },
  berserk: { name: 'Berserk', dur: 36, bad: true,  color: '#e05a3a', desc: 'Attacks the nearest foe unbidden, for half again the damage.' },
  reraise: { name: 'Reraise', dur: 72, bad: false, color: '#ffe0a0', desc: 'Rises again with a quarter of max HP the first time it falls.' },
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
    abilities: ['potion', 'hiPotion', 'antidote', 'ether', 'remedy', 'phoenixDown'],
    req: {}, desc: 'Field medic who uses items. The root of the mage path.',
  },
  knight: {
    name: 'Knight', skillset: 'Arts of War', kind: 'human', sprite: 'heavy',
    palette: { h: '#c9a24a', c: '#8892a8', p: '#3a4256', b: '#2a2a3a' },
    hp: 1.25, mp: 0.8, pa: 1.2, ma: 0.8, spd: 0.95, move: 3, jump: 3, evade: 10,
    weapon: { name: 'Broadsword', power: 6, range: 1, vert: 2 },
    abilities: ['powerBreak', 'speedBreak', 'magicBreak', 'shieldBash'],
    req: { squire: 2 }, desc: 'Heavy armor and a heavy blade. Cripples foes with Breaks.',
  },
  archer: {
    name: 'Archer', skillset: 'Aim', kind: 'human', sprite: 'rogue',
    palette: { h: '#7a4a2a', c: '#4f7a3f', p: '#5a4a30', b: '#3a2a1a' },
    hp: 0.95, mp: 0.9, pa: 1.1, ma: 0.9, spd: 1.05, move: 3, jump: 3, evade: 10,
    weapon: { name: 'Longbow', power: 4, range: 4, vert: 5 },
    abilities: ['aim1', 'aim3', 'aim5', 'arrowRain'],
    req: { squire: 2 }, desc: 'Strikes from afar. Charged Aim shots trade time for power.',
  },
  monk: {
    name: 'Monk', skillset: 'Martial Arts', kind: 'human', sprite: 'monk',
    palette: { h: '#1a1a1a', c: '#d07a3a', p: '#e8d8b0', b: '#8a6a4a' },
    hp: 1.2, mp: 0.7, pa: 1.3, ma: 0.85, spd: 1.05, move: 4, jump: 4, evade: 12,
    weapon: { name: 'Bare Hands', power: 6, range: 1, vert: 3 },
    abilities: ['waveFist', 'quakeFist', 'chakra', 'bloodRage', 'revive'],
    req: { knight: 2 }, desc: 'Fights unarmed with tremendous power and chi techniques.',
  },
  thief: {
    name: 'Thief', skillset: 'Steal', kind: 'human', sprite: 'rogue',
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
    abilities: ['cure', 'cura', 'raise', 'protect', 'shell', 'regen', 'esuna', 'holyBolt'],
    req: { chemist: 2 }, desc: 'Mends wounds and shields allies with holy magick.',
  },
  blackMage: {
    name: 'Black Mage', skillset: 'Black Magick', kind: 'human', sprite: 'mage',
    palette: { h: '#2a2a4a', c: '#3a3a6a', p: '#c8a040', b: '#3a2a1a' },
    hp: 0.75, mp: 1.4, pa: 0.7, ma: 1.35, spd: 1.0, move: 3, jump: 3, evade: 5,
    weapon: { name: 'Rod', power: 3, range: 1, vert: 2 },
    abilities: ['fire', 'thunder', 'blizzard', 'poisonSpell', 'silenceSpell', 'stone', 'fira', 'flare'],
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
    name: 'Ninja', skillset: 'Throw', kind: 'human', sprite: 'rogue',
    palette: { h: '#1a1a1a', c: '#2a2a3a', p: '#1a1a2a', b: '#101018' },
    hp: 0.9, mp: 0.8, pa: 1.15, ma: 0.9, spd: 1.35, move: 5, jump: 5, evade: 22,
    weapon: { name: 'Twin Blades', power: 4, range: 1, vert: 2 },
    abilities: ['shuriken', 'flameBomb', 'smoke'],
    req: { thief: 3 }, desc: 'Strikes twice with each Attack and hurls thrown weapons.',
  },
  dragoon: {
    name: 'Dragoon', skillset: 'Jump', kind: 'human', sprite: 'heavy',
    palette: { h: '#3a2a5a', c: '#3a5a9a', p: '#2a3a5a', b: '#1a1a2a' },
    hp: 1.2, mp: 0.8, pa: 1.25, ma: 0.8, spd: 1.0, move: 3, jump: 5, evade: 8,
    weapon: { name: 'Spear', power: 6, range: 2, vert: 3 },
    abilities: ['jump', 'lancet', 'dragonRoar'],
    req: { thief: 2 }, desc: 'Leaps to the sky and crashes down on distant enemies.',
  },

  // ---------------------------------------------------- advanced jobs, second tier
  samurai: {
    name: 'Samurai', skillset: 'Iaido', kind: 'human', sprite: 'heavy',
    palette: { h: '#1a1a1a', c: '#b03030', p: '#e8e0d0', b: '#2a2a2a' },
    hp: 1.15, mp: 0.9, pa: 1.3, ma: 1.05, spd: 1.0, move: 3, jump: 3, evade: 12,
    weapon: { name: 'Katana', power: 7, range: 1, vert: 2 },
    abilities: ['ashura', 'bizenBoat', 'kiyomori', 'muramasa'],
    req: { knight: 3, dragoon: 2 }, desc: 'Draws the spirit out of the blade. Iaido strikes an area and asks nothing of the target\'s guard.',
  },
  summoner: {
    name: 'Summoner', skillset: 'Summon', kind: 'human', sprite: 'mage',
    palette: { h: '#2f6b3a', c: '#3a8a5a', p: '#e8d8a0', b: '#3a2a1a' },
    hp: 0.7, mp: 1.6, pa: 0.65, ma: 1.45, spd: 0.95, move: 3, jump: 3, evade: 5,
    weapon: { name: 'Summoner\'s Rod', power: 3, range: 1, vert: 2 },
    abilities: ['ifrit', 'shiva', 'ramuh', 'titan', 'moogle', 'carbuncle'],
    req: { blackMage: 3, timeMage: 2 }, desc: 'Calls down the espers. Wide, slow, and the spirits know friend from foe.',
  },
  geomancer: {
    name: 'Geomancer', skillset: 'Geomancy', kind: 'human', sprite: 'rogue',
    palette: { h: '#3a2a1a', c: '#8a9a5a', p: '#5a4a30', b: '#4a3a2a' },
    hp: 1.05, mp: 1.0, pa: 1.1, ma: 1.1, spd: 1.05, move: 4, jump: 4, evade: 10,
    weapon: { name: 'Hatchet', power: 6, range: 1, vert: 3 },
    abilities: ['tremor', 'windSlash', 'quicksand', 'torrent'],
    req: { monk: 3 }, desc: 'Turns the land itself against the enemy. Geomancy costs nothing and lands at once.',
  },
  bard: {
    name: 'Bard', skillset: 'Song', kind: 'human', sprite: 'rogue',
    palette: { h: '#c8a060', c: '#6a4aa0', p: '#3a2a5a', b: '#2a1a1a' },
    hp: 0.8, mp: 1.2, pa: 0.8, ma: 1.15, spd: 1.1, move: 4, jump: 3, evade: 12,
    weapon: { name: 'Harp', power: 3, range: 3, vert: 4 },
    abilities: ['battleSong', 'lifeSong', 'angelSong', 'namelessSong'],
    req: { whiteMage: 2, archer: 2 }, desc: 'Fights from the back with a harp and a voice. Songs lift everyone within earshot.',
  },

  // ------------------------------------------------------ third tier: masters
  paladin: {
    name: 'Paladin', skillset: 'Holy Sword', kind: 'human', sprite: 'heavy',
    palette: { h: '#e8d8a0', c: '#e8e4dc', p: '#3a4a7a', b: '#4a3a2a' },
    affinity: { holy: 'resist' },
    hp: 1.4, mp: 1.0, pa: 1.3, ma: 1.1, spd: 0.95, move: 3, jump: 3, evade: 12,
    weapon: { name: 'Greatsword', power: 9, range: 1, vert: 2 },
    abilities: ['holyStrike', 'sanctuary', 'judgment', 'oath'],
    req: { samurai: 2, whiteMage: 3 }, desc: 'A knight sworn to the light. Holy steel for the enemy, a shield of prayer for friends.',
  },
  arcanist: {
    name: 'Arcanist', skillset: 'Arcana', kind: 'human', sprite: 'mage',
    palette: { h: '#3a1a5a', c: '#5a2a8a', p: '#e8c860', b: '#2a1a1a' },
    hp: 0.7, mp: 1.7, pa: 0.6, ma: 1.6, spd: 0.95, move: 3, jump: 3, evade: 6,
    weapon: { name: 'Grimoire', power: 4, range: 2, vert: 3 },
    abilities: ['meteor', 'gravity', 'drainSoul', 'doomBolt'],
    req: { summoner: 2, geomancer: 2 }, desc: 'Reads what should not be read. Ruin from the sky, and spells that take rather than strike.',
  },
  assassin: {
    name: 'Assassin', skillset: 'Shadow', kind: 'human', sprite: 'rogue',
    palette: { h: '#2a1a1a', c: '#1a1a22', p: '#3a1a1a', b: '#101010' },
    hp: 0.9, mp: 0.9, pa: 1.25, ma: 1.0, spd: 1.45, move: 5, jump: 5, evade: 26,
    weapon: { name: 'Twin Fangs', power: 5, range: 1, vert: 2 },
    abilities: ['shadowstitch', 'assassinate', 'vanish', 'smokeStep'],
    req: { ninja: 3, bard: 2 }, desc: 'The fastest thing on the field. Ends fights with one cut, when the cut lands.',
  },
  sage: {
    name: 'Sage', skillset: 'Sagacity', kind: 'human', sprite: 'mage',
    palette: { h: '#f0f0f8', c: '#d8e0f0', p: '#3a5a9a', b: '#3a2a1a' },
    affinity: { dark: 'resist' },
    hp: 0.8, mp: 1.8, pa: 0.7, ma: 1.55, spd: 1.0, move: 3, jump: 3, evade: 6,
    weapon: { name: 'Sage\'s Tome', power: 4, range: 2, vert: 3 },
    abilities: ['holy', 'fullLife', 'reraise', 'ultima'],
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
    abilities: ['dragonBreath', 'skyRend', 'scaleWard', 'roarOfKings'],
    req: { samurai: 3, dragoon: 3, paladin: 2 }, desc: 'The dragon\'s road ends here. Fire from the throat, death from the sky, and a roar that lifts an army.',
  },
  hierophant: {
    name: 'Hierophant', skillset: 'Revelation', kind: 'human', sprite: 'mage',
    palette: { h: '#f0d060', c: '#f4ecd0', p: '#8a5a2a', b: '#3a2a1a' },
    affinity: { holy: 'resist', dark: 'resist' },
    hp: 0.9, mp: 2.0, pa: 0.7, ma: 1.9, spd: 1.0, move: 3, jump: 3, evade: 8,
    weapon: { name: 'Apocryphon', power: 5, range: 2, vert: 3 },
    abilities: ['starfall', 'ascension', 'aegis', 'timeStop'],
    req: { sage: 3, arcanist: 3 }, desc: 'The book\'s road ends here. Stars fall, the fallen rise, and time itself can be told to wait.',
  },
  fellKnight: {
    name: 'Fell Knight', skillset: 'Black Bargain', kind: 'human', sprite: 'heavy',
    palette: { h: '#c0c0d0', c: '#2a1a2a', p: '#1a0a1a', b: '#0a0a0a' },
    affinity: { dark: 'absorb', holy: 'weak' },
    hp: 1.5, mp: 1.1, pa: 1.55, ma: 1.3, spd: 1.1, move: 4, jump: 4, evade: 14,
    weapon: { name: 'Fell Blade', power: 9, range: 1, vert: 3 },
    abilities: ['fellSlash', 'abyss', 'soulRend', 'darkPact'],
    req: { paladin: 3, assassin: 3 }, desc: 'The bargain\'s road ends here, the same one Brannoc made. Every blow feeds the one who strikes it.',
  },

  // ----------------------------------------------------------- monsters/boss
  // ---- the Brass Concord's trades: what a war looks like when it is built ----
  engineer: {
    name: 'Engineer', skillset: 'Tinkering', kind: 'human', sprite: 'warrior',
    palette: { h: '#6a4a2a', c: '#8a6a3a', p: '#4a3a2a', b: '#2a2a2a' },
    hp: 1.0, mp: 1.1, pa: 1.0, ma: 1.15, spd: 1.0, move: 3, jump: 3, evade: 8,
    weapon: { name: 'Spanner', power: 6, range: 1, vert: 2 },
    abilities: ['repair', 'oilSlick', 'steamVent', 'overclock'],
    req: { chemist: 2 }, desc: 'Keeps the machines running, and the people. Steam, oil and a heavy spanner.',
  },
  gunner: {
    name: 'Gunner', skillset: 'Gunnery', kind: 'human', sprite: 'warrior',
    palette: { h: '#3a2a1a', c: '#4a5a6a', p: '#3a3a3a', b: '#2a2a2a' },
    hp: 0.95, mp: 0.8, pa: 1.1, ma: 0.8, spd: 1.05, move: 3, jump: 3, evade: 10,
    weapon: { name: 'Flintlock', power: 5, range: 4, vert: 9 },
    abilities: ['aimedShot', 'scattershot', 'legShot', 'suppress'],
    req: { archer: 2 }, desc: 'A long gun that does not care about height. Slow to aim, hard to argue with.',
  },
  aeronaut: {
    name: 'Aeronaut', skillset: 'Aeronautics', kind: 'human', sprite: 'warrior',
    palette: { h: '#c9a24a', c: '#7a4a2a', p: '#3a3a4a', b: '#2a2a2a' },
    hp: 1.0, mp: 1.0, pa: 1.15, ma: 1.05, spd: 1.15, move: 4, jump: 7, evade: 18,
    weapon: { name: 'Flintlock', power: 5, range: 4, vert: 9 },
    abilities: ['bombingRun', 'flare', 'updraft', 'grapnel'],
    req: { gunner: 2, thief: 1 }, desc: 'A canvas balloon and a head for heights. Comes down where it is least wanted.',
  },
  artificer: {
    name: 'Artificer', skillset: 'Artifice', kind: 'human', sprite: 'warrior',
    palette: { h: '#4a3a3a', c: '#b08a3a', p: '#3a3a4a', b: '#2a2a2a' },
    affinity: { thunder: 'resist' },
    hp: 1.1, mp: 1.5, pa: 1.2, ma: 1.5, spd: 1.05, move: 3, jump: 3, evade: 10,
    weapon: { name: 'Aether Rod', power: 6, range: 1, vert: 2 },
    abilities: ['teslaCoil', 'aetherShield', 'gearstorm', 'overdrive'],
    req: { engineer: 3, gunner: 3 }, desc: 'Lightning in a bottle, and the bottle is the whole battlefield.',
  },
  // ---- the north: what the Winter Court made, and what stood against it ----
  frostweaver: {
    name: 'Frostweaver', skillset: 'Rime', kind: 'human', sprite: 'mage',
    palette: { h: '#dfe8f0', c: '#5a7ab0', p: '#2a3a5a', b: '#1a2030' },
    affinity: { ice: 'absorb', fire: 'weak' },
    hp: 0.75, mp: 1.7, pa: 0.6, ma: 1.65, spd: 1.0, move: 3, jump: 3, evade: 8,
    weapon: { name: 'Ice Rod', power: 5, range: 1, vert: 2 },
    abilities: ['rime', 'glaciate', 'hoarfrost', 'whiteout'],
    req: { blackMage: 3, timeMage: 2 }, desc: 'The Court\'s own art, learned back from it: cold that stops, blinds and holds.',
  },
  warden: {
    name: 'Warden', skillset: 'Vigil', kind: 'human', sprite: 'warrior',
    palette: { h: '#8a5a2a', c: '#6a7a5a', p: '#3a3a2a', b: '#2a2a2a' },
    affinity: { ice: 'resist' },
    hp: 1.15, mp: 0.9, pa: 1.25, ma: 0.9, spd: 1.05, move: 4, jump: 4, evade: 12,
    weapon: { name: 'Warden Spear', power: 7, range: 2, vert: 3 },
    abilities: ['pin', 'wardPost', 'rally', 'volley'],
    req: { archer: 3, knight: 2 }, desc: 'The old north\'s sentries: a spear, a post to hold, and a voice the line can hear.',
  },
  runeblade: {
    name: 'Runeblade', skillset: 'Star-iron', kind: 'human', sprite: 'heavy',
    palette: { h: '#3a3a4a', c: '#8ab0d0', p: '#2a3040', b: '#1a1a2a' },
    affinity: { ice: 'resist', dark: 'resist' },
    hp: 1.3, mp: 1.3, pa: 1.4, ma: 1.35, spd: 1.05, move: 4, jump: 4, evade: 14,
    weapon: { name: 'Rune Sword', power: 8, range: 1, vert: 2 },
    abilities: ['runecut', 'frostbrand', 'starWard', 'nova'],
    req: { samurai: 2, arcanist: 2 }, desc: 'A blade with the star-iron\'s own runes cut into it. It burns cold, and it does not stay down.',
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
    hp: 1.1, mp: 0.5, pa: 1.1, ma: 0.7, spd: 0.95, move: 4, jump: 3, evade: 8,
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
  remedy: { name: 'Remedy', job: 'chemist', jp: 220, mp: 0, range: 3, aoe: 0, vert: 3, ct: 0, kind: 'item', affects: 'ally', allowSelf: true,
    effects: [{ type: 'cure', statuses: ['poison', 'slow', 'stop', 'silence', 'blind', 'berserk'] }],
    desc: 'Cure every affliction at once.' },
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
  bloodRage: { name: 'Blood Rage', job: 'monk', jp: 200, mp: 0, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'berserk', hit: 100 }], desc: 'Give yourself over to the fight. You strike harder, but you no longer choose.' },
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
  holyBolt: { name: 'Holy Bolt', job: 'whiteMage', jp: 260, mp: 14, range: 4, aoe: 0, vert: 3, ct: 18, kind: 'magic', affects: 'all', element: 'holy',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'Searing light. Undead and fell things burn.' },
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
  esuna: { name: 'Esuna', job: 'whiteMage', jp: 200, mp: 10, range: 3, aoe: 1, vert: 3, ct: 22, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'cure', statuses: ['poison', 'slow', 'stop', 'silence', 'blind', 'berserk'] }],
    desc: 'Lift every affliction from all allies in the area.' },
  regen: { name: 'Regen', job: 'whiteMage', jp: 120, mp: 8, range: 3, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', allowSelf: true,
    effects: [{ type: 'status', status: 'regen', hit: 100 }], desc: 'Grant Regen (recover HP each turn).' },

  // Black Mage
  fire: { name: 'Fire', job: 'blackMage', jp: 50, mp: 6, range: 4, aoe: 1, vert: 3, ct: 25, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 5 }], desc: 'Burn all in the area.' },
  thunder: { name: 'Thunder', job: 'blackMage', jp: 80, mp: 8, range: 4, aoe: 0, vert: 8, ct: 22, kind: 'magic', affects: 'all', element: 'thunder',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }], desc: 'Strike a single target with lightning. Ignores height.' },
  blizzard: { name: 'Blizzard', job: 'blackMage', jp: 90, mp: 7, range: 4, aoe: 1, vert: 3, ct: 24, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 6 }], desc: 'Freeze all in the area.' },
  stone: { name: 'Stone', job: 'blackMage', jp: 140, mp: 9, range: 3, aoe: 1, vert: 1, ct: 20, kind: 'magic', affects: 'all', element: 'earth',
    effects: [{ type: 'damage', formula: 'ma', power: 7 }], desc: 'Tear up the ground beneath them. Cannot reach a different level.' },
  poisonSpell: { name: 'Poison', job: 'blackMage', jp: 80, mp: 4, range: 4, aoe: 1, vert: 3, ct: 30, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'poison', hit: 85 }], desc: 'Inflict Poison on all in the area.' },
  silenceSpell: { name: 'Silence', job: 'blackMage', jp: 160, mp: 8, range: 4, aoe: 1, vert: 3, ct: 22, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'silence', hit: 80 }], desc: 'Seal the voices of all in the area.' },
  fira: { name: 'Fira', job: 'blackMage', jp: 220, mp: 12, range: 4, aoe: 1, vert: 3, ct: 15, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'A greater fire spell.' },
  flare: { name: 'Flare', job: 'blackMage', jp: 450, mp: 26, range: 4, aoe: 0, vert: 3, ct: 10, kind: 'magic', affects: 'all', element: null,
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
    effects: [{ type: 'status', status: 'blind', hit: 80 }], desc: 'Choking smoke that blinds everyone in it.' },

  // Dragoon
  jump: { name: 'Jump', job: 'dragoon', jp: 100, mp: 0, range: 4, aoe: 0, vert: 9, ct: 30, kind: 'physical', affects: 'all', airborne: true,
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.5 }], desc: 'Leap skyward; crash down for 1.5x weapon damage. Untargetable while airborne.' },
  lancet: { name: 'Lancet', job: 'dragoon', jp: 150, mp: 0, range: 'weapon', aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'drain', formula: 'pa', power: 3 }], desc: 'Drain HP from the target.' },
  dragonRoar: { name: 'Dragon Roar', job: 'dragoon', jp: 250, mp: 0, range: 0, aoe: 2, vert: 3, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }], desc: 'A roar that grants Protect to nearby allies.' },

  // Samurai. Iaido is magickal in its reckoning and cares nothing for evasion
  // or for how the target stands; it costs MP rather than the blade.
  ashura: { name: 'Ashura', job: 'samurai', jp: 100, mp: 6, range: 2, aoe: 1, vert: 3, ct: 0, kind: 'magic', affects: 'all',
    effects: [{ type: 'damage', formula: 'ma', power: 5 }], desc: 'Draw and cut the air in an arc. Strikes an area; cannot be evaded.' },
  bizenBoat: { name: 'Bizen Boat', job: 'samurai', jp: 150, mp: 6, range: 2, aoe: 1, vert: 3, ct: 0, kind: 'magic', affects: 'all',
    effects: [{ type: 'mpdamage', formula: 'ma', power: 4 }], desc: 'A cut that bleeds MP rather than blood. Silences casters the slow way.' },
  kiyomori: { name: 'Kiyomori', job: 'samurai', jp: 200, mp: 10, range: 0, aoe: 2, vert: 3, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }],
    desc: 'The blade\'s spirit wards you and every ally nearby with Protect and Shell.' },
  muramasa: { name: 'Muramasa', job: 'samurai', jp: 350, mp: 14, range: 2, aoe: 1, vert: 3, ct: 0, kind: 'magic', affects: 'all', element: 'dark',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }, { type: 'status', status: 'blind', hit: 45 }],
    desc: 'The cursed blade. Heavy dark damage over an area, and some are left blinded by it.' },

  // Summoner. Espers are wide and slow, and they know friend from foe.
  ifrit: { name: 'Ifrit', job: 'summoner', jp: 120, mp: 16, range: 4, aoe: 2, vert: 4, ct: 14, kind: 'magic', affects: 'enemy', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }], desc: 'Call the fire esper. Burns every enemy in a wide area; allies are spared.' },
  shiva: { name: 'Shiva', job: 'summoner', jp: 120, mp: 16, range: 4, aoe: 2, vert: 4, ct: 14, kind: 'magic', affects: 'enemy', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }], desc: 'Call the ice esper. Freezes every enemy in a wide area.' },
  ramuh: { name: 'Ramuh', job: 'summoner', jp: 160, mp: 18, range: 4, aoe: 2, vert: 9, ct: 12, kind: 'magic', affects: 'enemy', element: 'thunder',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }], desc: 'Call the thunder esper. Strikes from above; height is no shelter.' },
  titan: { name: 'Titan', job: 'summoner', jp: 220, mp: 20, range: 4, aoe: 2, vert: 1, ct: 10, kind: 'magic', affects: 'enemy', element: 'earth',
    effects: [{ type: 'damage', formula: 'ma', power: 10 }, { type: 'status', status: 'slow', hit: 35 }],
    desc: 'Call the earth esper. The ground heaves under every enemy on the same level.' },
  moogle: { name: 'Moogle', job: 'summoner', jp: 100, mp: 12, range: 4, aoe: 2, vert: 4, ct: 14, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'heal', formula: 'ma', power: 6 }], desc: 'Call the little esper. Mends every ally in a wide area.' },
  carbuncle: { name: 'Carbuncle', job: 'summoner', jp: 200, mp: 14, range: 4, aoe: 2, vert: 4, ct: 12, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'shell', hit: 100 }, { type: 'status', status: 'regen', hit: 100 }],
    desc: 'Call the gem esper. Shell and Regen for every ally in a wide area.' },

  // Geomancer. The land answers at once and asks no MP.
  tremor: { name: 'Tremor', job: 'geomancer', jp: 80, mp: 0, range: 4, aoe: 1, vert: 1, ct: 0, kind: 'magic', affects: 'all', element: 'earth',
    effects: [{ type: 'damage', formula: 'ma', power: 4 }, { type: 'status', status: 'slow', hit: 35 }],
    desc: 'Shake the ground under an area on your own level. Some are left Slowed.' },
  windSlash: { name: 'Wind Slash', job: 'geomancer', jp: 120, mp: 0, range: 4, aoe: 0, vert: 5, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 5 }], desc: 'A blade of wind that reaches four tiles and climbs.' },
  quicksand: { name: 'Quicksand', job: 'geomancer', jp: 200, mp: 0, range: 3, aoe: 1, vert: 1, ct: 0, kind: 'magic', affects: 'all', element: 'earth',
    effects: [{ type: 'damage', formula: 'ma', power: 3 }, { type: 'status', status: 'stop', hit: 30 }],
    desc: 'The ground turns to sand. Light damage, and some are held fast by Stop.' },
  torrent: { name: 'Torrent', job: 'geomancer', jp: 160, mp: 0, range: 4, aoe: 1, vert: 3, ct: 0, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 4 }, { type: 'status', status: 'silence', hit: 35 }],
    desc: 'A wall of cold water over an area. Some come up unable to speak.' },

  // Bard. Songs carry to everyone within earshot of the singer.
  battleSong: { name: 'Battle Song', job: 'bard', jp: 100, mp: 6, range: 0, aoe: 3, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'statmod', stat: 'pa', amount: 1 }], desc: 'A marching song. PA +1 for every ally within three tiles, for the battle.' },
  lifeSong: { name: 'Life Song', job: 'bard', jp: 120, mp: 8, range: 0, aoe: 3, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'heal', formula: 'ma', power: 3 }], desc: 'A song of mending. Restores HP to every ally within three tiles.' },
  angelSong: { name: 'Angel Song', job: 'bard', jp: 180, mp: 0, range: 0, aoe: 3, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'mpheal', formula: 'ma', power: 2 }], desc: 'A song that gives back what casting takes. MP to every ally within three tiles.' },
  namelessSong: { name: 'Nameless Song', job: 'bard', jp: 300, mp: 14, range: 0, aoe: 2, vert: 4, ct: 20, kind: 'support', affects: 'ally', self: true,
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
  fullLife: { name: 'Full-Life', job: 'sage', jp: 300, mp: 20, range: 4, aoe: 0, vert: 4, ct: 14, kind: 'magic', affects: 'ally', deadOnly: true,
    effects: [{ type: 'revive', pct: 1.0 }], desc: 'Bring a fallen ally back with every point of HP.' },
  reraise: { name: 'Reraise', job: 'sage', jp: 400, mp: 18, range: 3, aoe: 0, vert: 4, ct: 16, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'reraise', hit: 100 }], desc: 'A life held in reserve. The first time the target falls, it rises with a quarter of its HP.' },
  ultima: { name: 'Ultima', job: 'sage', jp: 600, mp: 36, range: 4, aoe: 2, vert: 9, ct: 6, kind: 'magic', affects: 'enemy', element: null,
    effects: [{ type: 'damage', formula: 'ma', power: 14 }], desc: 'The last spell. Wide, slow, and it knows friend from foe.' },

  // Dragonlord
  dragonBreath: { name: 'Dragon Breath', job: 'dragonlord', jp: 250, mp: 14, range: 3, aoe: 2, vert: 4, ct: 0, kind: 'magic', affects: 'all', element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }], desc: 'Fire from the throat, at once, over a wide area. It does not ask who is standing in it.' },
  skyRend: { name: 'Sky Rend', job: 'dragonlord', jp: 400, mp: 0, range: 5, aoe: 1, vert: 9, ct: 24, kind: 'physical', affects: 'all', airborne: true,
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.8 }], desc: 'Leap beyond sight and fall on an area for 1.8x weapon damage. Untargetable while airborne.' },
  scaleWard: { name: 'Scale Ward', job: 'dragonlord', jp: 300, mp: 12, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }, { type: 'status', status: 'regen', hit: 100 }],
    desc: 'Scales over skin. Protect, Shell and Regen on yourself at once.' },
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
    desc: 'Reraise, Protect and Shell on every ally in a wide area. Nothing in it dies today.' },
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

  // Monsters
  // Frostweaver
  rime: { name: 'Rime', job: 'frostweaver', jp: 100, mp: 10, range: 4, aoe: 1, vert: 4, ct: 6, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 7 }], desc: 'Frost over an area, quick to cast.' },
  glaciate: { name: 'Glaciate', job: 'frostweaver', jp: 250, mp: 14, range: 3, aoe: 0, vert: 4, ct: 10, kind: 'magic', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'ma', power: 9 }, { type: 'status', status: 'stop', hit: 50 }], desc: 'Ice damage, and an even chance the target is Stopped in it.' },
  hoarfrost: { name: 'Hoarfrost', job: 'frostweaver', jp: 200, mp: 12, range: 3, aoe: 1, vert: 4, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'shell', hit: 100 }, { type: 'statmod', stat: 'evade', amount: 5 }], desc: 'A skin of frost over allies in the area: Shell, and Evade +5.' },
  whiteout: { name: 'Whiteout', job: 'frostweaver', jp: 400, mp: 18, range: 4, aoe: 2, vert: 9, ct: 12, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'blind', hit: 70 }, { type: 'status', status: 'slow', hit: 50 }], desc: 'Snow so thick nobody sees or hurries. Blind and Slow over a wide area.' },

  // Warden
  pin: { name: 'Pin', job: 'warden', jp: 100, mp: 4, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }, { type: 'status', status: 'stop', hit: 40 }], desc: 'Weapon damage, and a fair chance the target is pinned: Stopped.' },
  wardPost: { name: 'Ward Post', job: 'warden', jp: 150, mp: 6, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'statmod', stat: 'evade', amount: 10 }], desc: 'Take a post and hold it. Protect, and Evade +10.' },
  rally: { name: 'Rally', job: 'warden', jp: 300, mp: 10, range: 0, aoe: 2, vert: 4, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'ctmod', amount: 20 }], desc: 'A voice the line can hear. Every ally within two tiles gains 20 CT.' },
  volley: { name: 'Volley', job: 'warden', jp: 350, mp: 0, range: 4, aoe: 1, vert: 9, ct: 14, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 0.9 }], desc: 'Spears in the air, down on an area, after a charge.' },

  // Runeblade
  runecut: { name: 'Runecut', job: 'runeblade', jp: 150, mp: 0, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon' }, { type: 'mpdamage', formula: 'ma', power: 4 }], desc: 'A cut that reads the target\'s runes back at it: weapon damage, and MP burned.' },
  frostbrand: { name: 'Frostbrand', job: 'runeblade', jp: 250, mp: 6, range: 'weapon', aoe: 0, vert: 'weapon', ct: 0, kind: 'physical', affects: 'all', element: 'ice',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.3 }], desc: 'The blade burns cold. 1.3x weapon damage, as ice.' },
  starWard: { name: 'Star Ward', job: 'runeblade', jp: 400, mp: 20, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'reraise', hit: 100 }, { type: 'status', status: 'protect', hit: 100 }], desc: 'The star-iron does not stay down. Reraise and Protect on yourself.' },
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
    effects: [{ type: 'damage', formula: 'pa', power: 6 }, { type: 'ctmod', amount: -20 }], desc: 'Wings on everything close: damage, and 20 CT lost.' },
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
  steamVent: { name: 'Steam Vent', job: 'engineer', jp: 250, mp: 10, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'magic', affects: 'all', self: true, element: 'fire',
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
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 0.6 }, { type: 'ctmod', amount: -30 }], desc: 'Keep their head down. Light damage, and the target loses 30 CT.' },

  // Aeronaut
  bombingRun: { name: 'Bombing Run', job: 'aeronaut', jp: 200, mp: 10, range: 5, aoe: 1, vert: 9, ct: 20, kind: 'magic', affects: 'all', airborne: true, element: 'fire',
    effects: [{ type: 'damage', formula: 'ma', power: 8 }], desc: 'Up on the balloon, and down comes fire on an area. Untargetable while aloft.' },
  flare: { name: 'Flare', job: 'aeronaut', jp: 150, mp: 8, range: 4, aoe: 1, vert: 9, ct: 4, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'blind', hit: 80 }], desc: 'A magnesium flare bursts over the area. Most in it are Blinded.' },
  updraft: { name: 'Updraft', job: 'aeronaut', jp: 250, mp: 6, range: 2, aoe: 0, vert: 9, ct: 0, kind: 'support', affects: 'ally', allowSelf: true,
    effects: [{ type: 'statmod', stat: 'move', amount: 1 }, { type: 'statmod', stat: 'jump', amount: 2 }], desc: 'A gust under an ally: Move +1 and Jump +2 for the battle.' },
  grapnel: { name: 'Grapnel', job: 'aeronaut', jp: 300, mp: 0, range: 3, aoe: 0, vert: 9, ct: 0, kind: 'physical', affects: 'enemy',
    effects: [{ type: 'damage', formula: 'pa', power: 6 }], desc: 'A hook on a line, from any height at all.' },

  // Artificer
  teslaCoil: { name: 'Tesla Coil', job: 'artificer', jp: 300, mp: 20, range: 3, aoe: 2, vert: 4, ct: 10, kind: 'magic', affects: 'all', element: 'thunder',
    effects: [{ type: 'damage', formula: 'ma', power: 10 }], desc: 'Lightning over a wide area. Brass conducts.' },
  aetherShield: { name: 'Aether Shield', job: 'artificer', jp: 350, mp: 16, range: 3, aoe: 1, vert: 4, ct: 8, kind: 'magic', affects: 'ally', allowSelf: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }], desc: 'A humming field over the area: Protect and Shell on every ally in it.' },
  gearstorm: { name: 'Gearstorm', job: 'artificer', jp: 450, mp: 12, range: 3, aoe: 2, vert: 3, ct: 14, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 'weapon', mult: 1.2 }], desc: 'A cloud of spinning gears over a wide area. 1.2x weapon damage to all in it.' },
  overdrive: { name: 'Overdrive', job: 'artificer', jp: 500, mp: 24, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'haste', hit: 100 }, { type: 'statmod', stat: 'pa', amount: 2 }, { type: 'statmod', stat: 'ma', amount: 2 }, { type: 'statmod', stat: 'spd', amount: 2 }],
    desc: 'Everything past the red line. Haste, and PA, MA and Speed +2, for the battle.' },

  // The Concord's machines
  pistonStrike: { name: 'Piston Strike', job: 'sentinel', jp: 0, mp: 0, range: 1, aoe: 0, vert: 2, ct: 0, kind: 'physical', affects: 'all',
    effects: [{ type: 'damage', formula: 'pa', power: 7 }], desc: 'A hammer on a rod. It does not pull the blow.' },
  steamBurst: { name: 'Steam Burst', job: 'sentinel', jp: 0, mp: 6, range: 0, aoe: 1, vert: 2, ct: 0, kind: 'magic', affects: 'all', self: true, element: 'fire',
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
  nightSword: { name: 'Night Sword', job: 'darkKnight', jp: 0, mp: 8, range: 'weapon', aoe: 0, vert: 3, ct: 0, kind: 'physical', affects: 'enemy', element: 'dark',
    effects: [{ type: 'drain', formula: 'pa', power: 6 }], desc: 'A draining slash.' },
  shadowBlade: { name: 'Shadow Blade', job: 'darkKnight', jp: 0, mp: 12, range: 3, aoe: 1, vert: 4, ct: 12, kind: 'magic', affects: 'all', element: 'dark',
    effects: [{ type: 'damage', formula: 'ma', power: 6 }], desc: 'Dark energy that sears an area.' },
  blackTide: { name: 'Black Tide', job: 'darkKnightRisen', jp: 0, mp: 18, range: 3, aoe: 2, vert: 4, ct: 14, kind: 'magic', affects: 'all', element: 'dark',
    effects: [{ type: 'damage', formula: 'ma', power: 7 }], desc: 'Darkness rolls out across the floor and drags everything under.' },
  despair: { name: 'Despair', job: 'darkKnightRisen', jp: 0, mp: 14, range: 4, aoe: 1, vert: 4, ct: 0, kind: 'magic', affects: 'all',
    effects: [{ type: 'status', status: 'silence', hit: 75 }, { type: 'status', status: 'blind', hit: 75 }],
    desc: 'Takes the voice and the sight from all in the area.' },
  darkProtect: { name: 'Umbral Ward', job: 'darkKnight', jp: 0, mp: 10, range: 0, aoe: 0, vert: 0, ct: 0, kind: 'support', affects: 'ally', self: true,
    effects: [{ type: 'status', status: 'protect', hit: 100 }, { type: 'status', status: 'shell', hit: 100 }], desc: 'Shroud self in Protect and Shell.' },
};

// ---------------------------------------------------------------------- maps
// heights: rows of digits (y down, x across). terrain: g grass, d dirt,
// s stone, b wood/bridge, w water (impassable), t tree/pillar (impassable),
// x void (not drawn). deploy: player start tiles. mood: the sky, light and
// weather the renderer dresses the field in, and which theme plays (MOODS).
const MAPS = {
  verdant: {
    name: 'Verdant Road', w: 11, h: 11, mood: 'day',
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
    name: 'Millbrook Bridge', w: 12, h: 10, mood: 'dusk',
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
    name: 'Hollowmere Ruins', w: 12, h: 12, mood: 'mist',
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
    name: 'Sable Marsh', w: 12, h: 12, mood: 'marsh',
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
    name: 'Dunmarch Gate', w: 12, h: 12, mood: 'rain',
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
    name: 'Ashen Ridge', w: 12, h: 11, mood: 'ember',
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
  // Training grounds: three more fields so the practice battles between
  // chapters do not always replay the campaign's own maps. Each has a shape
  // worth reading: a river to ford, a pit to fight around, a keep to storm.
  fordwater: {
    name: 'Fordwater Crossing', w: 12, h: 10, mood: 'day',
    heights: [
      '111100001111',
      '111100001112',
      '111000000122',
      '221000000122',
      '221000000012',
      '221000000012',
      '222100000122',
      '222110001222',
      '222111111222',
      '222211112222',
    ],
    terrain: [
      'ggggwwwwgggg',
      'ggggdwwdgggg',
      'gggtddwddggg',
      'ggggdbbbdggg',
      'ggggddwwddgg',
      'ggggdwwwddgg',
      'gggggbbbdggg',
      'gsggdddwwdgg',
      'gssgggddwdgt',
      'gssggggggggg',
    ],
    deploy: [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3]],
  },
  quarry: {
    name: 'The Old Quarry', w: 11, h: 11, mood: 'dusk',
    heights: [
      '33333333333',
      '33322222333',
      '33211111233',
      '32100000123',
      '32100000123',
      '32100000123',
      '32100000123',
      '32110001123',
      '33211111233',
      '33322222333',
      '33333333333',
    ],
    terrain: [
      'ggggggtgggg',
      'ggsssssssgg',
      'gssdddddssg',
      'gsdddddddsg',
      'gsdddsddddg',
      'gsddsssddsg',
      'gsdddsddddg',
      'gsdddddddsg',
      'gssdddddssg',
      'ggsssssssgg',
      'ggggtgggggg',
    ],
    deploy: [[0, 5], [0, 4], [0, 6], [1, 5], [0, 3]],
  },
  ruinkeep: {
    name: 'Ruined Keep', w: 12, h: 11, mood: 'mist',
    heights: [
      '000000011111',
      '000000012221',
      '000000123321',
      '000001233321',
      '000001233331',
      '000001233421',
      '000001233321',
      '000000123321',
      '000000012221',
      '000000011111',
      '000000000111',
    ],
    terrain: [
      'ggggggggssss',
      'gggggggsssss',
      'ggtggggssbss',
      'ggggggsssbss',
      'gggggdsssbss',
      'gggggddbbbss',
      'gggggdssstss',
      'ggggggssssss',
      'gggggggsssss',
      'ggggggggssss',
      'gtggggggggss',
    ],
    deploy: [[1, 5], [1, 4], [1, 6], [2, 5], [0, 5]],
  },
  thornwall: {
    name: 'Thornwall Cathedral', w: 13, h: 13, mood: 'night',
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
  // ---- Act II: the Concord's country ----
  ironhold: {
    name: 'Ironhold Foundry', w: 12, h: 12, mood: 'ember',
    heights: [
      '222222222222',
      '211111111112',
      '211133311112',
      '211133311112',
      '211111111112',
      '244111114412',
      '244111114412',
      '211111111112',
      '211155111112',
      '211155111112',
      '211111111112',
      '222222222222',
    ],
    terrain: [
      'ssssssssssss',
      'sbbbbbbbbbbs',
      'sbbbsssbbbbs',
      'sbbbsssbbbbs',
      'sbbbbbbbbbbs',
      'sxxbbbbbbxxs',
      'sxxbbbbbbxxs',
      'sbbbbbbbbbbs',
      'sbbbbssbbbbs',
      'sbbbbssbbbbs',
      'sbbbbbbbbbbs',
      'ssssssssssss',
    ],
    deploy: [[1, 10], [2, 10], [1, 9], [2, 9], [3, 10]],
  },
  cogsworth: {
    name: 'Cogsworth Bridge', w: 13, h: 11, mood: 'rain',
    heights: [
      '0000000000000',
      '0333222223330',
      '0322222222230',
      '0322222222230',
      '0002222222000',
      '0002222222000',
      '0002222222000',
      '0322222222230',
      '0322222222230',
      '0333222223330',
      '0000000000000',
    ],
    terrain: [
      'wwwwwwwwwwwww',
      'wsssbbbbbsssw',
      'wsssbbbbbsssw',
      'wsssbbbbbsssw',
      'wwwwbbbbbwwww',
      'wwwwbbbbbwwww',
      'wwwwbbbbbwwww',
      'wsssbbbbbsssw',
      'wsssbbbbbsssw',
      'wsssbbbbbsssw',
      'wwwwwwwwwwwww',
    ],
    deploy: [[5, 9], [6, 9], [7, 9], [5, 8], [7, 8]],
  },
  aetheryards: {
    name: 'The Aether Yards', w: 13, h: 13, mood: 'night',
    heights: [
      '1111111111111',
      '1111111111111',
      '1113311331111',
      '1113311331111',
      '1111111111111',
      '1111444441111',
      '1111444441111',
      '1111444441111',
      '1111111111111',
      '1113311331111',
      '1113311331111',
      '1111111111111',
      '0000000000000',
    ],
    terrain: [
      'sssssssssssss',
      'sssssssssssss',
      'sssxxssxxssss',
      'sssxxssxxssss',
      'sssssssssssss',
      'ssssbbbbbssss',
      'ssssbbbbbssss',
      'ssssbbbbbssss',
      'sssssssssssss',
      'sssxxssxxssss',
      'sssxxssxxssss',
      'sssssssssssss',
      'wwwwwwwwwwwww',
    ],
    deploy: [[1, 11], [2, 11], [1, 10], [2, 10], [1, 9]],
  },
  brassgate: {
    name: 'Brassgate', w: 13, h: 13, mood: 'dusk',
    heights: [
      '5555555555555',
      '5223333333225',
      '5223333333225',
      '5223333333225',
      '5222222222225',
      '5222222222225',
      '5221111111225',
      '5221111111225',
      '5221111111225',
      '5221111111225',
      '5221111111225',
      '5221111111225',
      '5555555555555',
    ],
    terrain: [
      'xxxxxxxxxxxxx',
      'xsssssssssssx',
      'xsxsssssssxsx',
      'xsssssssssssx',
      'xsxsssssssxsx',
      'xsssssssssssx',
      'xsxsssssssxsx',
      'xsssssbsssssx',
      'xsxsssssssxsx',
      'xsssssssssssx',
      'xsxsssssssxsx',
      'xsssssssssssx',
      'xxxxxxxxxxxxx',
    ],
    deploy: [[5, 11], [6, 11], [7, 11], [5, 10], [7, 10]],
  },
  // ---- Act III: the north ----
  rimewater: {
    name: 'Rimewater', w: 13, h: 11, mood: 'snow',
    heights: [
      '2222222222222', '2221111112222', '2211111111122', '1111111111111', '1111111111111', '1111111111111',
      '1111111111111', '1111111111111', '2211111111122', '2221111112222', '2222222222222',
    ],
    terrain: [
      'nnnnnnnnnnnnn', 'nnntnnnnnnnnn', 'nnniiiiiiinnn', 'niiiiiiiiiiin', 'iiiiwwiiiiiii', 'iiiiiiiiiwwii',
      'iiiwiiiiiiiii', 'niiiiiiiiiiin', 'nnniiiiiiinnn', 'nnnnnnnnntnnn', 'nnnnnnnnnnnnn',
    ],
    deploy: [[1, 9], [2, 9], [1, 8], [2, 8], [3, 9]],
  },
  frostholm: {
    name: 'Frostholm', w: 12, h: 12, mood: 'snow',
    heights: [
      '111111111111', '133113311111', '133113311111', '111111111111', '111111111111', '113311331111',
      '113311331111', '111111111111', '111111111111', '133111133111', '133111133111', '111111111111',
    ],
    terrain: [
      'nnnnnnnnnnnn', 'nxxnnxxnnnnn', 'nxxnnxxnnnnn', 'nbbnnbbnnnnn', 'nnnnnnnnnnnn', 'nnxxnnxxnnnn',
      'nnxxnnxxnnnn', 'nnbbnnbbnnnn', 'nnnnnnnnnnnn', 'nxxnnnnxxnnn', 'nxxnnnnxxnnn', 'nnnnnnnnnnnn',
    ],
    deploy: [[9, 10], [10, 10], [9, 11], [10, 11], [8, 11]],
  },
  glacierpass: {
    name: 'The Glacier Pass', w: 11, h: 13, mood: 'snow',
    heights: [
      '55555555555', '54444444445', '54444444445', '53333333335', '53333333335', '52222222225', '52222222225',
      '51111111115', '51111111115', '51111111115', '51111111115', '51111111115', '55555555555',
    ],
    terrain: [
      'xxxxxxxxxxx', 'xiiinnnnnnx', 'xiiinnnnnnx', 'xiiixxnnnnx', 'xiiiiinnnnx', 'xiiiiinnnnx', 'xiiixxnnnnx',
      'xiiinnnnnnx', 'xiiinnnnnnx', 'xiiixxnnnnx', 'xiiinnnnnnx', 'xnnnnnnnnnx', 'xxxxxxxxxxx',
    ],
    deploy: [[4, 11], [5, 11], [6, 11], [4, 10], [6, 10]],
  },
  hollowcourt: {
    name: 'The Hollow Court', w: 13, h: 13, mood: 'aurora',
    heights: [
      '4444444444444', '4333333333334', '4333333333334', '4222222222224', '4222222222224', '4111111111114', '4111111111114',
      '4111111111114', '4111111111114', '4111111111114', '4111111111114', '4111111111114', '4444444444444',
    ],
    terrain: [
      'xxxxxxxxxxxxx', 'xiiiiibiiiiix', 'xixiiibiiixix', 'xiiiiibiiiiix', 'xsxsssbsssxsx', 'xsssssbsssssx', 'xsxsssbsssxsx',
      'xsssssbsssssx', 'xsxsssbsssxsx', 'xsssssbsssssx', 'xsxsssbsssxsx', 'xsssssbsssssx', 'xxxxxxxxxxxxx',
    ],
    deploy: [[5, 11], [6, 11], [7, 11], [5, 10], [7, 10]],
  },
  starfall: {
    name: 'Starfall', w: 13, h: 13, mood: 'aurora',
    heights: [
      '4444444444444', '4333333333334', '4322222222234', '4321111111234', '4321000001234', '4321033301234', '4321033301234',
      '4321033301234', '4321000001234', '4321111111234', '4322222222234', '4333333333334', '4444444444444',
    ],
    terrain: [
      'sssssssssssss', 'sssssssssssss', 'ssnnnnnnnnnss', 'ssniiiiiiinss', 'ssniiiiiiinss', 'ssniixxxiinss', 'ssniixxxiinss',
      'ssniixxxiinss', 'ssniiiiiiinss', 'ssniiiiiiinss', 'ssnnnnnnnnnss', 'sssssssssssss', 'sssssssssssss',
    ],
    deploy: [[5, 11], [6, 11], [7, 11], [5, 10], [7, 10]],
  },
};

// ------------------------------------------------------------------ campaign
const CAMPAIGN = [
  {
    objective: { type: 'rout' },
    id: 'ch1', title: 'Ambush on the Verdant Road', map: 'verdant',
    camp: [
      'Garret: "Four of us, and a road nobody holds. Your father would have called that an opportunity."',
      'Rowan: "My father is why there are four of us."',
      'Bram, from the top of the wagon: "Riders on the road. Bandits, by the way they sit. They have not seen us."',
    ],
    intro: [
      'Elderon bleeds. Two princes claim one crown, and the roads between their armies belong to no one.',
      'Rowan Aldric, youngest son of a house that chose the wrong prince, rides north with his few remaining companions.',
      'Bandits watch the Verdant Road. They do not know whose colors Rowan wears. They do not care.',
      '"Mira, stay behind Garret. Bram, take the high ground. If they want a fight, we give them one."',
      'Bram is already climbing. "Three of them. Do we get paid for this, or is it another of the honourable kind?"',
    ],
    enemies: [
      { job: 'squire', level: 1, x: 8, y: 2, name: 'Bandit' },
      { job: 'squire', level: 1, x: 9, y: 4, name: 'Bandit' },
      { job: 'archer', level: 1, x: 9, y: 1, name: 'Bandit Archer' },
    ],
    gil: 3100,
    outro: [
      'The bandits scatter into the hills. One of them was carrying coin newer than any bandit should have: milled edges, and a cog stamped on the face.',
      'Rowan pockets it and looks north, where smoke rises over Millbrook.',
    ],
  },
  {
    objective: { type: 'rout' },
    id: 'ch2', title: 'The Wolves of Millbrook', map: 'millbrook',
    camp: [
      'Mira: "The mill was still turning when I passed this way in spring. Someone should have shut it off."',
      'Garret: "Someone should have. Nobody did. That is the whole war in a sentence."',
    ],
    intro: [
      'Millbrook has been abandoned. Its mill wheel turns for no one.',
      'Goblins nest in the mill now, and their wolves have found the scent of travelers on the bridge.',
      '"Hold the bridge," Garret says. "Let them come to us one at a time."',
      'Mira counts her potions twice. "And nobody gets bitten. I have four of these, and I am not wasting one on Bram being brave."',
    ],
    enemies: [
      { job: 'goblin', level: 2, x: 2, y: 1 },
      { job: 'goblin', level: 2, x: 9, y: 1 },
      { job: 'wolf', level: 2, x: 6, y: 0 },
      { job: 'wolf', level: 2, x: 4, y: 2 },
    ],
    gil: 1600,
    recruit: { name: 'Lysa', job: 'chemist', level: 2 },
    outro: [
      'In the mill, a young woman hides among the sacks with a satchel of potions and a look of pure defiance.',
      '"Lysa," she says. "I was the village apothecary. There is no village any more, so I suppose I am yours."',
      'Lysa the Chemist joins the party!',
    ],
  },
  {
    objective: { type: 'rout', protectLeader: true },
    id: 'ch3', title: 'Hollowmere Ruins', map: 'hollowmere',
    camp: [
      'Lysa: "Deserters, at the temple. Aldous stopped paying his levies in autumn. He did not stop asking them to die."',
      'Rowan: "Then some of them may listen before they draw."  Garret: "Some. Keep your hand on the hilt for the others."',
    ],
    intro: [
      'The ruins of Hollowmere were a temple once. Now they shelter deserters from Prince Aldous\'s army.',
      'Deserters with steel and training, who have decided the Aldric name is worth a bounty.',
      '"They hold the high ground in the center," Mira warns. "Take the flanks first."',
    ],
    enemies: [
      { job: 'knight', level: 3, x: 5, y: 5, name: 'Deserter Knight' },
      { job: 'archer', level: 3, x: 6, y: 5, name: 'Deserter Archer' },
      { job: 'chemist', level: 2, x: 2, y: 1, name: 'Deserter Medic' },
      { job: 'squire', level: 2, x: 9, y: 1, name: 'Deserter' },
    ],
    gil: 1600,
    recruit: { name: 'Kael', job: 'archer', level: 3 },
    outro: [
      'One of the deserters throws down his bow and kneels. "I served your father at Redwater. I would rather serve his son than a prince who leaves his own men to starve."',
      'Kael the Archer joins the party!',
    ],
  },
  {
    objective: { type: 'rout', protectLeader: true },
    id: 'ch4', title: 'Sable Marsh', map: 'sable',
    camp: [
      'Bram: "A coven. Actual witches. Do they know we are coming?"  Lysa: "They were paid to know. That is the part I do not like."',
      'Kael tests his bowstring. "Paid by whom is the only question worth the marsh."',
    ],
    intro: [
      'The marsh road is the only way east that avoids the royal checkpoints.',
      'It is also where the Sable Coven trades curses for coin, and someone has paid them handsomely.',
      '"Mages," Lysa says. "Their spells take time to charge. Close the distance before they finish."',
      '"And mind the lights over the water, and whatever that is standing in the reeds. Neither is a tree."',
    ],
    enemies: [
      { job: 'blackMage', level: 4, x: 4, y: 3, name: 'Coven Mage' },
      { job: 'wisp', level: 4, x: 5, y: 6 },
      { job: 'treant', level: 4, x: 3, y: 8 },
      { job: 'thief', level: 4, x: 3, y: 5, name: 'Coven Cutpurse' },
      { job: 'wolf', level: 4, x: 7, y: 2 },
    ],
    gil: 2100,
    outro: [
      'The last mage sinks beneath the black water. On her body: a sealed letter bearing the crest of Ser Brannoc, Captain of Dunmarch.',
      'Beneath his seal, a second one Rowan does not know. A cog inside a circle. The same mark as the bandit\'s coin.',
    ],
  },
  {
    objective: { type: 'survive', rounds: 4, protectLeader: true },
    id: 'ch5', title: 'The Gates of Dunmarch', map: 'dunmarch',
    camp: [
      'Rowan: "Brannoc taught me the sword. He stood at my mother\'s funeral."',
      'Garret: "He stood at Redwater too, on the wrong side of the line, and I have not forgiven him that either. It does not have to be personal to be necessary."',
      'Mira: "It will be personal. Just make it quick."',
    ],
    intro: [
      'Ser Brannoc was Rowan\'s father\'s sworn brother. Now he hunts the Aldric line for Prince Aldous.',
      'His garrison holds the gate of Dunmarch. Archers on the wall, knights in the courtyard.',
      '"We do not need to take the keep," Rowan says. "Only the gate. Then we make Brannoc answer for that letter."',
    ],
    enemies: [
      { job: 'knight', level: 5, x: 5, y: 5, name: 'Gate Knight' },
      { job: 'knight', level: 4, x: 6, y: 6, name: 'Gate Knight' },
      { job: 'archer', level: 5, x: 3, y: 2, name: 'Wall Archer' },
      { job: 'archer', level: 5, x: 8, y: 2, name: 'Wall Archer' },
      { job: 'whiteMage', level: 5, x: 6, y: 3, name: 'Garrison Priest' },
    ],
    gil: 2700,
    recruit: { name: 'Tamsin', job: 'whiteMage', level: 5 },
    outro: [
      'The garrison priest lowers her staff. "Brannoc rode for Thornwall at dawn. He fears you, Aldric. He fears what your father knew."',
      '"Then I will heal your wounded on the way. I am done taking his orders."',
      'Tamsin the White Mage joins the party!',
    ],
  },
  {
    objective: { type: 'rout', protectLeader: true },
    id: 'ch6', title: 'Ashen Ridge', map: 'ashen',
    camp: [
      'Tamsin: "The ridge breathes. When it breathes out, the bombs drift up. When it breathes in, they come down where you are standing."',
      'Kael: "So we climb between breaths."  Tamsin: "So we climb between breaths."',
    ],
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
    gil: 1200,
    outro: [
      'Below the ridge, Thornwall Cathedral rises from the fog. A single black banner hangs from its spire.',
      'Kael studies the goblins\' camp. "They were paid to herd the bombs at us. Paid in the same coin." He holds one up. The cog catches the light.',
    ],
  },
  {
    objective: { type: 'boss', protectLeader: true },
    id: 'ch7', title: 'Thornwall Cathedral', map: 'thornwall',
    camp: [
      'Nobody sleeps. Bram sharpens a blade that is already sharp. Lysa counts potions in the dark.',
      'Rowan: "Whatever he says at the altar, do not listen. He was always better at talking than I am."',
      'Garret: "Then let him talk, and hit him while he does."',
    ],
    intro: [
      'Ser Brannoc waits at the altar in armor that has forgotten its colors.',
      '"Your father learned that the princes are puppets, boy. That the war is a harvest. He would have told the realm."',
      '"So I killed him. And now I will kill you, and Elderon can go on burning in peace."',
      'Behind him, two suits of armour rise from the flagstones with nothing living inside them.',
      'Rowan draws his sword. "Not today, Ser."',
    ],
    enemies: [
      { job: 'darkKnight', level: 9, x: 6, y: 3, name: 'Ser Brannoc', boss: true,
        passives: ['counter', 'attackUp', 'movePlus1'],
        phases: [{
          atPct: 0.35, job: 'darkKnightRisen', name: 'Brannoc Unbound', heal: 1,
          passives: ['counter', 'magickUp', 'movePlus1'],
          say: 'Brannoc falls to one knee. Then something else stands up in his armour.',
          cry: '"You think this was ever mine to stop?"',
        }],
      },
      { job: 'knight', level: 7, x: 4, y: 4, name: 'Black Guard' },
      { job: 'knight', level: 7, x: 8, y: 4, name: 'Black Guard' },
      { job: 'timeMage', level: 7, x: 6, y: 1, name: 'Chronomancer', passives: ['halfMp', 'regenerator'] },
      { job: 'skeleton', level: 7, x: 3, y: 8, name: 'Risen Guard' },
      { job: 'skeleton', level: 7, x: 9, y: 8, name: 'Risen Guard' },
      { job: 'ninja', level: 7, x: 10, y: 8, name: 'Brannoc\'s Shadow' },
    ],
    gil: 5000,
    outro: [
      'The thing in Brannoc\'s armour comes apart, and for a moment the man is there again, and almost grateful.',
      'Tamsin touches the fallen armour and pulls her hand back. It is cold. Not winter-cold. Something older than winter.',
      'In his hand, the last letter: proof of who fed the war between the princes. It is not signed by either prince. It is stamped with a cog inside a circle.',
      '"The Brass Concord," Tamsin says quietly. "Across the Iron Sea. They sell engines to anyone with a war to lose."',
      'Rowan folds the letter away. "Then the war was never ours. Let us go and find whose it was."',
    ],
  },

  // ---- Act II: the Brass Concord ----
  {
    objective: { type: 'rout', protectLeader: true },
    id: 'ch8', title: 'Smoke on the Coast Road', map: 'fordwater',
    camp: [
      'The letter lies open on the wagon boards. The cog inside the circle looks back at everyone.',
      'Tamsin: "The Concord does not fight wars. It sells them. If it is on our road, it has decided we are bad for business."',
      'Bram: "Then we are doing something right."  Garret: "We are doing something expensive. Same thing, to them."',
    ],
    intro: [
      'Word travels faster than a company on foot. By the time Rowan reaches the coast road, the Concord already knows the name Aldric.',
      'Their scouts wear no prince\'s colours. They wear goggles and brass, and the hounds that run with them were never born.',
      '"Those long guns reach further than my bow," Kael says. "And they do not care how high we stand."',
      '"Then we close on them," Garret says, "or find something to stand behind."',
    ],
    enemies: [
      { job: 'gunner', level: 8, x: 9, y: 2, name: 'Concord Scout' },
      { job: 'gunner', level: 8, x: 10, y: 4, name: 'Concord Scout' },
      { job: 'engineer', level: 8, x: 8, y: 3, name: 'Concord Tinker' },
      { job: 'ironhound', level: 8, x: 7, y: 1 },
      { job: 'ironhound', level: 8, x: 10, y: 6 },
    ],
    gil: 2400,
    recruit: { name: 'Ottilie', job: 'engineer', level: 8 },
    outro: [
      'One of the Concord\'s engineers throws down her spanner before the last hound falls. "Ottilie Marsh. I built those hounds. I did not build them to hunt farmers."',
      '"The Concord pays in scrip and promises. Give me a wage I can spend and I will show you how the machines come apart."',
      'Ottilie the Engineer joins the party!',
    ],
  },
  {
    objective: { type: 'rout', protectLeader: true },
    id: 'ch9', title: 'The Foundry at Ironhold', map: 'ironhold',
    camp: [
      'Ottilie draws a sentinel in the ash with a stick: the boiler, the pistons, the brass. "Here. And here. Lightning, or something heavy, and keep off the front of it."',
      'Kael: "You built these."  Ottilie: "I built them to carry ore. Somebody else taught them to carry a piston into a man."',
    ],
    intro: [
      'Ironhold was a mining town. The Concord bought it in a single afternoon and turned the smelter into a foundry that never cools.',
      '"The sentinels are slow," Ottilie says. "Slow and stupid and wrapped in an inch of brass. Lightning gets through it. So does patience."',
      '"Take the catwalks. Their guns cannot see up through the machinery."',
    ],
    enemies: [
      { job: 'sentinel', level: 8, x: 4, y: 2 },
      { job: 'sentinel', level: 8, x: 7, y: 2 },
      { job: 'gunner', level: 9, x: 9, y: 1, name: 'Foundry Guard' },
      { job: 'gunner', level: 8, x: 9, y: 3, name: 'Foundry Guard' },
      { job: 'engineer', level: 9, x: 5, y: 1, name: 'Foreman' },
    ],
    gil: 2800,
    outro: [
      'The foundry floor falls silent for the first time in a year. In the foreman\'s office, shipping manifests: engines, hounds, sentinels, all bound for Cogsworth Bridge.',
      '"They are not raiding," Rowan says. "They are moving an army across the river."',
    ],
  },
  {
    objective: { type: 'survive', rounds: 5, protectLeader: true },
    id: 'ch10', title: 'Cogsworth Bridge', map: 'cogsworth',
    camp: [
      'Mira: "Five rounds, on a bridge, in the rain, with charges under our feet. Say the plan again so I can hate it properly."',
      'Ottilie: "I find the fuses. You keep them off me. The rain is neither here nor there."  Mira: "The rain is here. It is always here."',
      'Rowan: "Hold the south end. Nobody crosses. Nobody goes north to be a hero."  He is looking at Bram.',
    ],
    intro: [
      'Cogsworth Bridge is the only crossing for forty miles, and the Concord\'s charges are already set beneath it.',
      '"Ottilie needs five rounds to find the fuses," Mira says. "We hold the south end until she does. Whatever comes across."',
      'Something comes across. It does not walk; it drifts down out of the rain on a canvas balloon, and it has a gun.',
    ],
    enemies: [
      { job: 'aeronaut', level: 10, x: 6, y: 1, name: 'Concord Aeronaut' },
      { job: 'gunner', level: 10, x: 4, y: 2, name: 'Bridge Guard' },
      { job: 'gunner', level: 10, x: 8, y: 2, name: 'Bridge Guard' },
      { job: 'sentinel', level: 10, x: 5, y: 3 },
      { job: 'sentinel', level: 10, x: 7, y: 3 },
      { job: 'engineer', level: 10, x: 2, y: 1, name: 'Sapper' },
    ],
    gil: 3200,
    recruit: { name: 'Bastian', job: 'gunner', level: 10 },
    outro: [
      'The fuses come out of the bridge in Ottilie\'s fists. The Concord column, halted on the north bank, does not try again that night.',
      'A deserter from the column wades the shallows with his rifle over his head. "Bastian Reeve. Sergeant of the Marshal\'s guard, until they ordered the bridge blown with our own wounded on it."',
      'Bastian the Gunner joins the party!',
    ],
  },
  {
    objective: { type: 'boss', protectLeader: true },
    id: 'ch11', title: 'The Aether Yards', map: 'aetheryards',
    camp: [
      'Bastian cleans his rifle the way other men pray. "Vexley will have the gantry rigged to lift. If the ship gets up, this was for nothing."',
      'Lysa: "Then it does not get up."  Bastian: "It weighs forty tons."  Lysa: "Then we are efficient about it."',
      'Tamsin, quietly, to Rowan: "The Director will be watching. Let him see what we are."',
    ],
    intro: [
      'The Aether Yards are where the Concord builds its airships, and where Marshal Vexley keeps the only one that flies.',
      '"Vexley does not lose," Bastian says. "He retreats, and calls it a lesson. Do not let him reach the gantry."',
      '"And the Director will be watching from the harbour. Whatever we do here, he will know it before we are done."',
    ],
    enemies: [
      { job: 'gunner', level: 12, x: 6, y: 6, name: 'Marshal Vexley', boss: true, passives: ['counter', 'attackUp', 'movePlus1'] },
      { job: 'aeronaut', level: 11, x: 4, y: 5, name: 'Yard Aeronaut' },
      { job: 'aeronaut', level: 11, x: 8, y: 7, name: 'Yard Aeronaut' },
      { job: 'sentinel', level: 11, x: 6, y: 9 },
      { job: 'engineer', level: 11, x: 10, y: 4, name: 'Dockmaster' },
      { job: 'ironhound', level: 11, x: 10, y: 8 },
    ],
    gil: 3600,
    outro: [
      'Vexley surrenders his pistol on the gantry with the airship burning behind him. "You have cost the Director a season. He will want to speak with you about it. At Brassgate."',
      'Rowan looks across the water at the lights of the Concord\'s city. "Good. I have a letter to return to him."',
    ],
  },
  {
    objective: { type: 'boss', protectLeader: true },
    id: 'ch12', title: 'Brassgate', map: 'brassgate',
    camp: [
      'Rowan turns the letter over in his hands one last time. "He killed my father over a bill of lading."',
      'Garret: "And built a war to hide it. Men like Crane do not think of it as killing. They think of it as a cost."',
      'Ottilie: "There is something in that hall. Something they did not let me near. Whatever it is, it is not a sentinel."',
      'Bram: "Good. I was getting bored of sentinels."',
    ],
    intro: [
      'Brassgate is not a fortress. It is a counting house with walls, and Director Halvard Crane receives Rowan in its great hall like a debtor.',
      '"Two princes, one crown, and a realm that would pay anything to end it. I sold them the anything. I sold it to both."',
      '"Your father worked it out from a bill of lading. I had him killed for arithmetic. Do not take it personally."',
      'Behind the Director, something the size of a house stands with its furnace banked, waiting.',
      'Rowan lays the letter on the counting table. "This is yours. I came to return it."',
    ],
    enemies: [
      { job: 'artificer', level: 14, x: 6, y: 2, name: 'Director Crane', boss: true,
        passives: ['counter', 'magickUp', 'movePlus1'],
        phases: [{
          atPct: 0.4, job: 'colossus', name: 'The Colossus', heal: 1,
          passives: ['counter', 'attackUp', 'movePlus1'],
          say: 'Crane steps backwards into the open chest of the machine behind him, and the machine closes.',
          cry: '"I built a war that runs on time, Aldric. You are simply late."',
        }],
      },
      { job: 'sentinel', level: 11, x: 4, y: 3 },
      { job: 'sentinel', level: 11, x: 8, y: 3 },
      { job: 'gunner', level: 12, x: 3, y: 1, name: 'Director\'s Guard' },
      { job: 'gunner', level: 12, x: 9, y: 1, name: 'Director\'s Guard' },
      { job: 'engineer', level: 12, x: 6, y: 5, name: 'Chief Engineer' },
      { job: 'aeronaut', level: 12, x: 1, y: 6, name: 'Gallery Aeronaut' },
    ],
    gil: 8000,
    outro: [
      'The Colossus sinks to its knees with its furnace gone dark, and the Director climbs out of it a small man in a singed coat.',
      'In the machine\'s chest, where a furnace should be, sits a core of grey metal that gives off cold instead of heat. Ottilie will not touch it. "That is not ours," she says. "That is not anybody\'s."',
      'The Concord\'s ledgers go to both princes at once, with Rowan\'s seal beside the cog. By spring there is nothing left for either to fight about, and everyone knows why.',
      'The last page of the last ledger is a shipping order, paid in a script none of them can read: eleven more cores of star-iron, from somewhere north of the ice.',
      'Rowan Aldric goes home, for a while. The company that walked the road stays together, because that is what it has become, and because the road is not finished.',
      '--- END OF ACT II. The road north is open. ---',
    ],
  },

  // ---- Act III: the Winter Court ----
  {
    objective: { type: 'rout', protectLeader: true },
    id: 'ch13', title: 'The Frost Rider', map: 'rimewater',
    camp: [
      'Bram: "A frozen river. We are going to fight on a frozen river."  Ingrid: "You are going to fight on the parts that hold."',
      'Ottilie has the star-iron core from Brassgate wrapped in three blankets. It is still cold through all of them.',
      'Rowan: "Whatever took Brannoc came from up here. I want to know what it is before it knows we are coming."',
    ],
    intro: [
      'The rider\'s name is Ingrid, and she was a Warden of the north before the north stopped needing wardens.',
      '"The Court took Frostholm in a night," she says. "No fire, no fight. In the morning the people were still there, and they had stopped being cold, and they had stopped being anything else."',
      'She leads the company onto Rimewater, where the river froze mid-current a hundred years ago and never thawed.',
      '"They will come out of the fog. The knights first. The wights after, up out of the ice itself. Do not stand still for long."',
    ],
    enemies: [
      { job: 'hollowKnight', level: 12, x: 10, y: 2 },
      { job: 'hollowKnight', level: 12, x: 11, y: 4 },
      { job: 'rimeWight', level: 12, x: 8, y: 5 },
      { job: 'rimeWight', level: 12, x: 11, y: 6 },
      { job: 'frostweaver', level: 12, x: 11, y: 2, name: 'Court Frostweaver' },
    ],
    gil: 3600,
    recruit: { name: 'Ingrid', job: 'warden', level: 13 },
    outro: [
      'The last wight goes back into the ice it came from. Ingrid pulls her spear out of a hollow knight and looks at what is inside the armour. Nothing is.',
      '"I have been watching the Court for eleven years," she says. "I am done watching."',
      'Ingrid the Warden joins the party!',
    ],
  },
  {
    objective: { type: 'rout', protectLeader: true },
    id: 'ch14', title: 'Frostholm', map: 'frostholm',
    camp: [
      'Kael: "Ingrid says the thralls do not fight unless a knight is near. So we go for the knights."  Garret: "We always go for the knights. It is the one plan that has never let us down."',
      'Mira: "If any of you get taken, I am not carrying you home. I will leave you in the snow and be sad about it later."',
      'Tamsin does not sleep. She sits with the star-iron core and, once, very quietly, tells it no.',
    ],
    intro: [
      'Frostholm is intact. Every door is shut, every chimney cold, and every window has someone standing behind it, not moving.',
      '"They are not dead," Tamsin says. "That is the worst of it. They are waiting for something to tell them what to do."',
      'Something does. The doors open all at once.',
      '"Break the knights that hold them," Ingrid says, "and the thralls may wake."',
    ],
    enemies: [
      { job: 'hollowKnight', level: 13, x: 3, y: 4 },
      { job: 'hollowKnight', level: 12, x: 5, y: 8 },
      { job: 'rimeWight', level: 13, x: 0, y: 5 },
      { job: 'rimeWight', level: 13, x: 8, y: 1 },
      { job: 'frostweaver', level: 13, x: 4, y: 1, name: 'Court Frostweaver' },
      { job: 'squire', level: 12, x: 7, y: 3, name: 'Frostholm Thrall' },
    ],
    gil: 3800,
    outro: [
      'When the last hollow knight falls, the people of Frostholm sit down in the snow where they stand and begin, slowly, to shiver.',
      '"Cold," one of them says, as if he has found the word after a long search. "It is cold."  Lysa wraps him in her own cloak. "Yes. Good. Stay that way."',
      'On the knight\'s breastplate, under the frost, a crest: a crown of icicles over a circle. The Court does not hide its seal.',
    ],
  },
  {
    objective: { type: 'rout', protectLeader: true },
    id: 'ch15', title: 'The Glacier Pass', map: 'glacierpass',
    camp: [
      'Ingrid draws the pass in the snow. "Narrow here. The drake keeps to the left, where the ice is thick. Go right, and go high."',
      'Bram: "Everything up here wants us to go high. I am beginning to feel appreciated."',
      'Ottilie: "The core is colder tonight. Whatever is up there, we are getting closer to it."',
    ],
    intro: [
      'The only road to the Hollow Court climbs the glacier, and the glacier has something living in it.',
      '"An ice drake," Ingrid says. "The Court feeds it. It is the reason no one from Frostholm ever came back down."',
      'Bastian sights along his rifle at a shape moving under the ice. "That is not a drake. That is a river with teeth."',
      '"Then climb," Rowan says. "High ground, and keep the mages behind the shields."',
    ],
    enemies: [
      { job: 'iceDrake', level: 13, x: 5, y: 2 },
      { job: 'hollowKnight', level: 13, x: 2, y: 4 },
      { job: 'hollowKnight', level: 13, x: 8, y: 5 },
      { job: 'frostweaver', level: 14, x: 7, y: 1, name: 'Pass Frostweaver' },
      { job: 'rimeWight', level: 14, x: 3, y: 7 },
    ],
    gil: 4200,
    recruit: { name: 'Eirik', job: 'frostweaver', level: 15 },
    outro: [
      'The drake dies with the pass in its mouth, and the ice goes quiet under their feet for the first time.',
      'One of the Court\'s frostweavers throws down his staff and pulls the hood from a face that is still, just, his own. "Eirik. I was a weaver of the Court because there was no one else to be. I would rather be one of yours."',
      '"The Regent will know. Let him."',
      'Eirik the Frostweaver joins the party!',
    ],
  },
  {
    objective: { type: 'boss', protectLeader: true },
    id: 'ch16', title: 'The Hollow Court', map: 'hollowcourt',
    camp: [
      'Eirik: "The Chamberlain was the first the Cold took. Before there was a Court, there was him, and a crater, and a winter that did not end."',
      'Garret: "So it is old."  Eirik: "It is older than the crown. It is older than the ice."  Garret: "Then it has had long enough."',
      'Rowan looks at the star-iron core one last time. "Tomorrow we give this back."',
    ],
    intro: [
      'The Hollow Court was a palace once, carved into the glacier by people who thought the cold was a god. They were not wrong. They were only early.',
      'Its Chamberlain waits in the throne room with the Court\'s knights around him and a crown of icicles on a head that has not been alive for a long time.',
      '"The Regent is beneath us, at Starfall," Eirik says. "The Chamberlain is the door. There is no other way to him."',
      'The Chamberlain speaks without breath. "Southerners. The Regent will be glad of you. He has been hungry a long while."',
    ],
    enemies: [
      { job: 'hollowKnight', level: 16, x: 6, y: 1, name: 'The Chamberlain', boss: true, passives: ['counter', 'attackUp', 'movePlus1'] },
      { job: 'hollowKnight', level: 15, x: 4, y: 3 },
      { job: 'hollowKnight', level: 15, x: 8, y: 3 },
      { job: 'rimeWight', level: 15, x: 3, y: 5 },
      { job: 'rimeWight', level: 15, x: 9, y: 5 },
      { job: 'frostweaver', level: 15, x: 6, y: 4, name: 'Court Frostweaver' },
    ],
    gil: 4800,
    outro: [
      'The Chamberlain comes apart like Brannoc did, and for a moment there is a face inside the frost, very old, and grateful.',
      'Behind the throne, stairs go down into a light that is not any colour Rowan has a name for.',
      '"Starfall," Ingrid says. "Where it landed. Where it has been eating ever since."',
    ],
  },
  {
    objective: { type: 'boss', protectLeader: true },
    id: 'ch17', title: 'Starfall', map: 'starfall',
    camp: [
      'Nobody sleeps. Bram sharpens a blade that is already sharp, which Lysa points out, which Bram already knows.',
      'Ingrid: "If it takes me, do not stop. Do not come back for me."  Rowan: "We came back for everyone. We are not starting a new policy on the last night."',
      'Ottilie holds the core. "It is warmer. Only a little. I think it knows."  Tamsin: "It knows. Let it."',
    ],
    intro: [
      'The crater at Starfall is a bowl of black glass a mile across. At its centre the star-iron still stands where it fell, and the Winter Regent stands beside it.',
      'He looks like a man. He is dressed like a king. The cold coming off him puts frost on Rowan\'s sword from twenty paces.',
      '"You brought it back," the Regent says, looking at the core in Ottilie\'s arms. "They always bring it back. That is what it is for."',
      '"Wars keep it warm. Brannoc\'s war. The Concord\'s. Yours, if you like. Something has to feed it, and it will not be me."',
      'Rowan sets the core down on the black glass. "Nothing is going to feed it. That is why we came."',
    ],
    enemies: [
      { job: 'winterRegent', level: 15, x: 6, y: 3, name: 'The Winter Regent', boss: true,
        passives: ['counter', 'magickUp', 'movePlus1'],
        phases: [{
          atPct: 0.4, job: 'namelessCold', name: 'The Nameless Cold', heal: 0.5,
          passives: ['counter', 'magickUp', 'movePlus1'],
          say: 'The Regent folds like a coat with nobody in it, and what wore him stands up without a shape.',
          cry: '"You brought it back. You always bring it back."',
        }],
      },
      { job: 'hollowKnight', level: 14, x: 4, y: 4 },
      { job: 'hollowKnight', level: 14, x: 8, y: 4 },
      { job: 'rimeWight', level: 14, x: 3, y: 6 },
      { job: 'frostweaver', level: 14, x: 6, y: 2, name: 'Regent\'s Weaver' },
    ],
    gil: 10000,
    outro: [
      'The Regent falls, and the thing behind him has no shape to fall with. It thins. It goes out of the crater like breath off a window.',
      'The star-iron core in Ottilie\'s arms is only iron now, and only heavy. She drops it, and laughs, and cannot stop for a while.',
      'The Court\'s knights kneel in the black glass and become, one at a time, people who are very cold and very tired, and are allowed to be.',
      'In the spring Frostholm lights its chimneys. Elderon has one king, because the princes could not face the company that ended two wars and a winter, and made peace instead.',
      'Rowan Aldric goes home, and this time stays. The road behind him is long. The company that walked it is still a company, and always will be.',
      '--- THE END. Thank you for playing. Trials await at camp, and the wagon carries legendary arms. ---',
    ],
    final: true,
  },
];

// The campaign in acts. The third is groundwork: named, foreshadowed, and not
// yet walkable.
const ACTS = [
  { title: 'The War of Princes', from: 0, to: 6 },
  { title: 'The Brass Concord', from: 7, to: 11 },
  { title: 'The Winter Court', from: 12, to: 16 },
];
// Said of the road once it is walked to the end.
const AFTER_THE_WAR = 'Two wars and a winter are over. What remains are the trials, and the company.';

// Around the fire once the war is won: what the company says while it trains,
// one line at a time as the trials go by. All of it points north.
const EPILOGUE_CAMP = [
  'The fire is the first anyone has lit north of the ice in a hundred years, and Ingrid keeps feeding it long after it needs feeding.',
  'Ottilie has the star-iron core on the wagon bench, plain iron now. "I am going to make something out of it. Something that carries ore."',
  'Bastian: "Vexley wrote. The Concord is a shipping company again. He says it is very boring and he is very happy."',
  'Lysa has run out of things to count and has started counting the company. She gets a different number each time and does not mind.',
  'Eirik says the aurora is only weather now. He watches it anyway, every night, to be sure.',
  'Garret: "Two wars and a winter. Your father would have called that a start."  Rowan: "He would have. Let us not tell him what comes next."',
  'The trials go on because the company likes them. Nobody is paying for them. That, Mira says, is how you can tell they are honest.',
];

// ------------------------------------------------------------------ cities
/* Towns on the road, each held by someone who should not have it. Open one
   with a battle and it stays open: a tavern that hires trained hands, and a
   market that sells what the wagon never carries. Levels rise to meet a party
   that comes late. */
const CITIES = [
  { id: 'redwater', name: 'Redwater', from: 1, pos: [0.94, 0.84], map: 'quarry', level: 2, gil: 900, hireCost: 450,
    held: 'held by the Redwater Reavers', blurb: 'A market town on the quarry road, taken by the guard that was paid to hold it.',
    intro: [
      'Redwater sits on the quarry road with its gates shut and its own guard on the walls, and the guard have decided the town belongs to them now.',
      '"Reavers," Garret says. "They were paid to hold it and nobody came to relieve them. Now they hold it for themselves."',
      '"The quarry is the back door. Take the high stone and they will come down to us."',
    ],
    enemies: [{ job: 'squire', name: 'Reaver' }, { job: 'squire', name: 'Reaver' }, { job: 'archer', name: 'Reaver Archer' }, { job: 'thief', name: 'Reaver Cutpurse' }],
    outro: [
      'The reavers throw down their arms when the last of the high stone falls. Redwater opens its gates that evening, and its market the next morning.',
      'Redwater is open. Its smiths and its tavern are yours to call on.',
    ],
    hires: ['knight', 'archer', 'thief'], stock: ['redwaterSteel', 'reaverCloak'],
    open: 'Smoke from the smithies again, and a tavern that remembers your name.' },
  { id: 'dunmarchTown', name: 'Dunmarch Town', from: 4, pos: [0.36, 0.44], map: 'dunmarch', level: 6, gil: 1300, hireCost: 500,
    held: 'held by the garrison holdouts', blurb: 'The town under the keep, still flying colours nobody pays for.',
    intro: [
      'Dunmarch town still flies Aldous\'s colours from the garrison, though the garrison has not been paid since Brannoc rode for Thornwall.',
      '"Holdouts," Tamsin says. "Good soldiers with no one left to be good for. They will fight because it is what they have."',
    ],
    enemies: [{ job: 'knight', name: 'Holdout Knight' }, { job: 'knight', name: 'Holdout Knight' }, { job: 'whiteMage', name: 'Holdout Priest' }, { job: 'archer', name: 'Holdout Archer' }],
    outro: [
      'The holdouts lay down their arms on the gate steps. The town has been waiting behind them for weeks.',
      'Dunmarch is open. Its chapel trains mages, and its armoury sells what the garrison wore.',
    ],
    hires: ['whiteMage', 'blackMage', 'timeMage'], stock: ['garrisonPlate', 'priestStaff'],
    open: 'The chapel bell rings the hours again. The armoury door stands open.' },
  { id: 'fordwaterTown', name: 'Fordwater', from: 7, pos: [0.56, 0.42], map: 'fordwater', level: 9, gil: 1800, hireCost: 600,
    held: 'held by the Concord customs house', blurb: 'A crossing town taxed to the bone by the Concord\'s customs men and their hounds.',
    intro: [
      'The Concord has a customs house at Fordwater, and the customs house has a garrison, and the garrison has hounds.',
      '"They tax the crossing," Ottilie says. "They tax the road. They would tax the river if they could make it stand still."',
    ],
    enemies: [{ job: 'gunner', name: 'Customs Guard' }, { job: 'gunner', name: 'Customs Guard' }, { job: 'engineer', name: 'Assessor' }, { job: 'ironhound' }],
    outro: [
      'The customs house burns its ledgers before it falls. The town keeps the crossing, and keeps it free.',
      'Fordwater is open. Its workshops hire out engineers and gunners who have had enough of the Concord.',
    ],
    hires: ['engineer', 'gunner'], stock: ['customsPistol', 'ledgerCoat'],
    open: 'The ferry runs for nothing. The workshops have taken down the Concord\'s sign.' },
  { id: 'cogsworthTown', name: 'Cogsworth Town', from: 9, pos: [0.92, 0.42], map: 'cogsworth', level: 11, gil: 2300, hireCost: 700,
    held: 'held by the Concord engine sheds', blurb: 'The town that grew up around the bridge, with sentinels walking its streets.',
    intro: [
      'Cogsworth town grew up around the bridge and the Concord\'s engine sheds. The sheds are still running and the sentinels still walk the streets.',
      '"Nobody in that town has slept through a night in a year," Bastian says. "Let us see if we can fix that."',
    ],
    enemies: [{ job: 'sentinel' }, { job: 'sentinel' }, { job: 'gunner', name: 'Shed Guard' }, { job: 'aeronaut', name: 'Shed Aeronaut' }],
    outro: [
      'The last sentinel winds down in the square, and the town comes out of its houses to look at it.',
      'Cogsworth is open. Its bridgewrights build well, and its aeronauts will fly for coin.',
    ],
    hires: ['aeronaut', 'artificer'], stock: ['bridgewright', 'aetherLantern'],
    open: 'The engine sheds are quiet. Somebody has planted flowers in a sentinel\'s boiler.' },
  { id: 'hearthold', name: 'Hearthold', from: 13, pos: [0.88, 0.28], map: 'rimewater', level: 14, gil: 3000, hireCost: 800,
    held: 'besieged by the Court', blurb: 'The last village on the ice with a fire in it, and the Court has come to put it out.',
    intro: [
      'Hearthold was the last village on the ice with a fire in it. The Court has come to put the fire out.',
      '"They cannot abide a hearth," Ingrid says. "It is the one thing they have never learned to take."',
    ],
    enemies: [{ job: 'hollowKnight' }, { job: 'hollowKnight' }, { job: 'rimeWight' }, { job: 'rimeWight' }, { job: 'frostweaver', name: 'Court Frostweaver' }],
    outro: [
      'The wights go back into the ice and the hearth is still lit. Hearthold keeps it that way.',
      'Hearthold is open. Its wardens and weavers know the north, and its forge remembers fire.',
    ],
    hires: ['warden', 'frostweaver'], stock: ['hearthBlade', 'wardenCloak'],
    open: 'The hearth is lit. It is always lit. Somebody sits up with it all night to be sure.' },
  { id: 'hollowMarket', name: 'The Hollow Market', from: 16, pos: [0.80, 0.12], map: 'hollowcourt', level: 16, gil: 4000, hireCost: 900,
    held: 'held by the Court\'s creatures', blurb: 'The market beneath the Court, where the star-iron was traded for a hundred years.',
    intro: [
      'Beneath the Hollow Court a market once served a people who are mostly gone. The Court\'s creatures have it now, and the star-iron that was traded there.',
      '"Whatever is sold here has been sold to the Cold for a hundred years," Eirik says. "Let us see what it fetches from us."',
    ],
    enemies: [{ job: 'rimeWight' }, { job: 'rimeWight' }, { job: 'hollowKnight' }, { job: 'frostweaver', name: 'Market Weaver' }, { job: 'iceDrake' }],
    outro: [
      'The market is silent when the fighting stops, and then, slowly, it is not.',
      'The Hollow Market is open. Runeblades and artificers wait there, and the last of the star-iron.',
    ],
    hires: ['runeblade', 'samurai'], stock: ['starIronRing', 'auroraStaff'],
    open: 'Lamps in the stalls. The star-iron is sold by weight now, like anything else.' },
];

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
  squire:  { name: 'Squire', levelShift: -1, gearShift: -1, gilMult: 1.25,
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
  ashuraBlade: { name: 'Ashura Blade', slot: 'weapon', wtype: 'katana', power: 7, range: 1, vert: 2, price: 0, tier: 0 },
  kotetsu:     { name: 'Kotetsu', slot: 'weapon', wtype: 'katana', power: 12, range: 1, vert: 2, evade: 4, price: 950, tier: 3 },
  masamune:    { name: 'Masamune', slot: 'weapon', wtype: 'katana', power: 15, range: 1, vert: 2, spd: 1, evade: 6, price: 2300, tier: 6 },
  ramiaHarp:   { name: 'Ramia Harp', slot: 'weapon', wtype: 'harp', power: 3, range: 3, vert: 4, ma: 2, price: 0, tier: 0 },
  bloodstrings:{ name: 'Bloodstrings', slot: 'weapon', wtype: 'harp', power: 6, range: 3, vert: 4, ma: 4, spd: 1, price: 1300, tier: 4 },
  faerieHarp:  { name: 'Faerie Harp', slot: 'weapon', wtype: 'harp', power: 8, range: 4, vert: 5, ma: 6, mp: 20, price: 2200, tier: 6 },
  ironGreatsword: { name: 'Iron Greatsword', slot: 'weapon', wtype: 'greatsword', power: 9, range: 1, vert: 2, price: 0, tier: 0 },
  claymore:    { name: 'Claymore', slot: 'weapon', wtype: 'greatsword', power: 14, range: 1, vert: 2, price: 1100, tier: 3 },
  zweihander:  { name: 'Zweihander', slot: 'weapon', wtype: 'greatsword', power: 18, range: 1, vert: 2, spd: -1, price: 2100, tier: 5 },
  excalibur:   { name: 'Excalibur', slot: 'weapon', wtype: 'greatsword', power: 20, range: 1, vert: 2, ma: 2, resist: { holy: 'absorb' }, price: 2800, tier: 6 },
  grimoire:    { name: 'Grimoire', slot: 'weapon', wtype: 'tome', power: 4, range: 2, vert: 3, ma: 2, price: 0, tier: 0 },
  codex:       { name: 'Codex of Ash', slot: 'weapon', wtype: 'tome', power: 6, range: 2, vert: 3, ma: 6, price: 1200, tier: 3 },
  omnibus:     { name: 'Omnibus', slot: 'weapon', wtype: 'tome', power: 8, range: 2, vert: 3, ma: 10, mp: 30, price: 2600, tier: 6 },
  zorlinShape: { name: 'Zorlin Shape', late: true, slot: 'weapon', wtype: 'knife', power: 11, range: 1, vert: 2, spd: 2, evade: 6, price: 2400, tier: 6 },
  // ---- legendary arms, for the road after the war ----
  ragnarok:    { name: 'Ragnarok', late: true, slot: 'weapon', wtype: 'greatsword', power: 24, range: 1, vert: 2, ma: 3, resist: { holy: 'resist' }, price: 4200, tier: 7 },
  chaosBlade:  { name: 'Chaos Blade', late: true, slot: 'weapon', wtype: 'katana', power: 21, range: 1, vert: 2, spd: 1, evade: 8, resist: { dark: 'resist' }, price: 4000, tier: 7 },
  gungnir:     { name: 'Gungnir', late: true, slot: 'weapon', wtype: 'spear', power: 20, range: 2, vert: 4, jump: 2, price: 3800, tier: 7 },
  apocrypha:   { name: 'Apocrypha', late: true, slot: 'weapon', wtype: 'tome', power: 10, range: 2, vert: 3, ma: 14, mp: 40, price: 4200, tier: 7 },
  escutcheon:  { name: 'Escutcheon', late: true, slot: 'offhand', otype: 'shield', evade: 34, hp: 40, resist: { holy: 'resist', dark: 'resist' }, price: 3600, tier: 7 },

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
  genjiHelm:   { name: 'Genji Helm', late: true, slot: 'head', htype: 'helm', look: 'helm', hp: 60, mp: 20, price: 3000, tier: 7 },
  crownOfKings:{ name: 'Crown of Kings', late: true, slot: 'head', htype: 'hat', look: 'ribbon', hp: 40, mp: 60, ma: 4, spd: 1,
                 wards: ['silence', 'blind', 'berserk', 'poison', 'slow', 'stop'], price: 4500, tier: 7 },

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
  genjiArmor:  { name: 'Genji Armor', late: true, slot: 'body', atype: 'heavy', hp: 96, spd: 1, price: 4200, tier: 7 },
  dragonMail:  { name: 'Dragon Mail', late: true, slot: 'body', atype: 'heavy', hp: 84, pa: 2, resist: { fire: 'absorb', ice: 'weak' }, price: 3800, tier: 7 },
  archmageRobe:{ name: 'Archmage Robe', late: true, slot: 'body', atype: 'robe', hp: 66, mp: 90, ma: 5, price: 4200, tier: 7 },
  nightweave:  { name: 'Nightweave', late: true, slot: 'body', atype: 'light', hp: 56, evade: 14, spd: 2, price: 4000, tier: 7 },

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
  magickRing:  { name: 'Magick Ring', slot: 'acc', ma: 2, price: 900, tier: 3 },
  guardianRing:{ name: 'Guardian Ring', slot: 'acc', hp: 30, price: 700, tier: 2 },
  reflexBracer:{ name: 'Reflex Bracer', slot: 'acc', evade: 12, price: 800, tier: 3 },
  chronoAmulet:{ name: 'Chrono Amulet', slot: 'acc', spd: 2, price: 2000, tier: 5 },
  earthwalkers:{ name: 'Earthwalker Boots', late: true, slot: 'acc', move: 1, jump: 1, price: 900, tier: 3 },
  songstone:   { name: 'Songstone', late: true, slot: 'acc', mp: 24, ma: 1, wards: ['silence'], price: 1100, tier: 4 },
  assassinCloak:{ name: 'Assassin\'s Cloak', late: true, slot: 'acc', evade: 16, spd: 1, price: 2000, tier: 5 },
  angelRing:   { name: 'Angel Ring', late: true, slot: 'acc', hp: 20, mp: 20, wards: ['stop', 'slow'], price: 2200, tier: 6 },
  heartOfDragon: { name: 'Heart of the Dragon', late: true, slot: 'acc', pa: 3, ma: 3, price: 3800, tier: 7 },
  sevenLeague: { name: 'Seven-League Boots', late: true, slot: 'acc', move: 2, jump: 2, spd: 1, price: 4200, tier: 7 },
  // ---- the Concord's arms: guns, tools and brass ----
  flintlock:   { name: 'Flintlock', slot: 'weapon', wtype: 'gun', power: 5, range: 4, vert: 9, price: 0, tier: 0 },
  musket:      { name: 'Musket', slot: 'weapon', wtype: 'gun', power: 7, range: 5, vert: 9, price: 700, tier: 2 },
  blunderbuss: { name: 'Blunderbuss', slot: 'weapon', wtype: 'gun', power: 10, range: 3, vert: 9, price: 900, tier: 3 },
  carbine:     { name: 'Rifled Carbine', slot: 'weapon', wtype: 'gun', power: 9, range: 5, vert: 9, price: 1500, tier: 5 },
  aetherRifle: { name: 'Aether Rifle', slot: 'weapon', wtype: 'gun', power: 12, range: 6, vert: 9, ma: 2, price: 2400, tier: 6 },
  thunderbird: { name: 'Thunderbird', late: true, slot: 'weapon', wtype: 'gun', power: 14, range: 7, vert: 9, spd: 1, price: 3900, tier: 7 },
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
  starIronBlade: { name: 'Star-iron Blade', late: true, slot: 'weapon', wtype: 'sword', power: 15, range: 1, vert: 2, ma: 3, price: 4000, tier: 7 },
  snowcloak:   { name: 'Snowcloak', slot: 'body', atype: 'cloth', hp: 30, mp: 10, resist: { ice: 'resist' }, price: 1400, tier: 5 },
  furMantle:   { name: 'Fur Mantle', slot: 'body', atype: 'light', hp: 38, resist: { ice: 'resist' }, price: 1500, tier: 5 },
  starIronPlate: { name: 'Star-iron Plate', late: true, slot: 'body', atype: 'heavy', hp: 70, resist: { ice: 'absorb' }, price: 4200, tier: 7 },
  icicleCrown: { name: 'Crown of Icicles', late: true, slot: 'head', htype: 'helm', look: 'helm', hp: 40, ma: 3, price: 3600, tier: 7 },
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
  starIronRing:  { name: 'Star-iron Ring', city: 'hollowMarket', late: true, slot: 'acc', pa: 3, ma: 3, price: 3800, tier: 7 },
  auroraStaff:   { name: 'Aurora Staff', city: 'hollowMarket', late: true, slot: 'weapon', wtype: 'staff', power: 8, range: 1, vert: 2, ma: 8, price: 4000, tier: 7 },
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
const CATEGORY_NAMES = { weapon: 'Weapons', offhand: 'Shields', head: 'Head', body: 'Body', acc: 'Accessories' };
const TYPE_NAMES = {
  sword: 'Swords', knife: 'Knives', axe: 'Axes', spear: 'Spears', bow: 'Bows', gun: 'Guns', staff: 'Staves', rod: 'Rods',
  katana: 'Katanas', harp: 'Harps', greatsword: 'Greatswords', tome: 'Tomes', ninjablade: 'Ninja Blades', fist: 'Fists',
  light: 'Light Armour', heavy: 'Heavy Armour', cloth: 'Clothes', robe: 'Robes', hat: 'Hats', helm: 'Helms', shield: 'Shields', acc: 'Accessories',
};
// The type an item shelves under: its weapon, armour, hat or shield kind, or accessory.
function itemType(id) { const it = ITEMS[id]; return it ? (it.wtype || it.atype || it.htype || it.otype || 'acc') : 'acc'; }
function typeLabel(id) { return TYPE_NAMES[itemType(id)] || itemType(id); }
// The order shelves come in: weapons by kind, then shields, head, body, accessories.
const TYPE_ORDER = Object.keys(TYPE_NAMES);
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

// Items an enemy of the given job and level carries. Their gear deliberately
// lags what the player can buy at the same point, so the shop stays worth
// visiting and early fights are not decided by equipment the party lacks.
// The master-tier gear that arrived with the later jobs is marked `late` and is
// never issued to enemies: the campaign was balanced before it existed, and an
// evasion cloak on every bandit past chapter five would quietly re-tune every
// fight.
function enemyGearFor(job, level, tierShift) {
  const tier = Math.max(0, Math.min(6, Math.floor((level - 1) / 1.8) + (tierShift || 0)));
  const pool = Object.keys(ITEMS).filter(i => ITEMS[i].tier <= tier && !ITEMS[i].late && !ITEMS[i].city);
  return bestGearFor(job, pool, tier);
}

// ============================================================================
// Passive abilities: reaction, support and movement
// ============================================================================
// Learned with JP inside a job, but once learned they can be equipped no matter
// which job the unit is currently wearing. One of each kind at a time.

const PASSIVES = {
  // ---- reaction: triggered when something happens to the unit ----
  counter: { name: 'Counter', kind: 'reaction', job: 'monk', jp: 250,
    desc: 'Strike back when a foe within your weapon\'s reach damages you with a physical attack.' },
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
  bladeGrasp: { name: 'Blade Grasp', kind: 'reaction', job: 'samurai', jp: 400,
    desc: 'Catch the blade: half of all physical attacks against you are turned aside.' },
  secondWind: { name: 'Second Wind', kind: 'reaction', job: 'paladin', jp: 350,
    desc: 'Recover a tenth of your HP every time you are damaged and left standing.' },
  coldBlood: { name: 'Cold Blood', kind: 'support', job: 'frostweaver', jp: 350, desc: 'Ice damage you deal is a quarter greater.' },
  ironFooting: { name: 'Iron Footing', kind: 'movement', job: 'warden', jp: 300, desc: 'Slow and Stop do not take on you.' },
  lastStand: { name: 'Last Stand', kind: 'reaction', job: 'runeblade', jp: 400, desc: 'A hit that leaves you under a third of your HP grants Protect and Shell.' },
  deadeye: { name: 'Deadeye', kind: 'support', job: 'gunner', jp: 300, desc: 'Anything used at weapon range reaches one tile further.' },
  jumpPlus3: { name: 'Balloon Pack', kind: 'movement', job: 'aeronaut', jp: 350, desc: 'Jump +3. Walls are a suggestion.' },
  fieldRepair: { name: 'Field Repair', kind: 'support', job: 'engineer', jp: 300, desc: 'Every heal you give restores 30% more.' },
  overcharge: { name: 'Overcharge', kind: 'reaction', job: 'artificer', jp: 400, desc: 'Every hit taken winds you tighter: Speed +1.' },
  dragonHeart: { name: 'Dragon Heart', kind: 'reaction', job: 'dragonlord', jp: 500,
    desc: 'Every wound makes you angrier: PA and MA both rise by 1 each time you are damaged.' },

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
  moveMpUp: { name: 'Move-MP-Up', kind: 'movement', job: 'bard', jp: 240,
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
// pay, a little JP in whatever job they went in, and sometimes something found.
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
];

const TIER_NAMES = ['The roots', 'First rank', 'Second rank', 'Third rank', 'Fourth rank', 'Fifth rank', 'The summit'];


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
