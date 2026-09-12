/* ==========================================================================
   Pixel sprites.

   A sprite is composited on a 20x21 cell grid. The body template (12x18)
   is stamped at BODY_OX/BODY_OY, leaving a margin on the left for a shield,
   on the right for a weapon, and above for a spear or a plume. Equipment is
   stamped over the body from the unit's actual gear, so a knight in plate
   with a longsword and a kite shield looks like one.

   Everything is then shaded in one pass: a cell with nothing above it catches
   the light, a cell with nothing below it falls into shadow. That gives every
   template and every piece of gear the same sense of volume for free, which
   hand-picking two tones per palette entry would not.

   Body palette keys: h hair/hat, s skin, c cloth, d team accent, p pants,
   b boots/leather, e eyes, w white, k dark. An uppercase key is the shaded
   tone of its lowercase colour, for form the light pass cannot infer.
   ========================================================================== */

const SPRITE_TEMPLATES = {
  warrior: {
    front: [
      '....hhhh....',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..hssssssh..',
      '..hsessesh..',
      '..hssssssh..',
      '...ssssss...',
      '....SSSS....',
      '..dccccccd..',
      '..cccccccc..',
      '.cccddddccc.',
      '.sccddddccs.',
      '..ccddddcc..',
      '...bbbbbb...',
      '...pppppp...',
      '...pp..pp...',
      '...pp..pp...',
      '..bbb..bbb..',
    ],
    back: [
      '....hhhh....',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '...hhhhhh...',
      '....SSSS....',
      '..dccccccd..',
      '..cccccccc..',
      '.cccccccccc.',
      '.sccccccccs.',
      '..cccccccc..',
      '...bbbbbb...',
      '...pppppp...',
      '...pp..pp...',
      '...pp..pp...',
      '..bbb..bbb..',
    ],
  },
  heavy: {
    front: [
      '....hhhh....',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..hssssssh..',
      '..hsessesh..',
      '..hssssssh..',
      '...ssssss...',
      '....SSSS....',
      '..dccccccd..',
      '.dccccccccd.',
      '.cccddddccc.',
      '.sccddddccs.',
      '..ccddddcc..',
      '...bbbbbb...',
      '...pppppp...',
      '..ppp..ppp..',
      '..ppp..ppp..',
      '.bbbb..bbbb.',
    ],
    back: [
      '....hhhh....',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '...hhhhhh...',
      '....SSSS....',
      '..dccccccd..',
      '.dccccccccd.',
      '.cccccccccc.',
      '.sccccccccs.',
      '..cccccccc..',
      '...bbbbbb...',
      '...pppppp...',
      '..ppp..ppp..',
      '..ppp..ppp..',
      '.bbbb..bbbb.',
    ],
  },
  rogue: {
    front: [
      '...hhhhhh...',
      '..hhhhhhhh..',
      '.hhhhhhhhhh.',
      '.hhssssssHH.',
      '.hhsessesHH.',
      '.hhssssssHH.',
      '..hssssssh..',
      '....SSSS....',
      '..dccccccd..',
      '..cccccccc..',
      '..cccccccc..',
      '.sccccccccs.',
      '..ccddddcc..',
      '...bbbbbb...',
      '...pppppp...',
      '...pp..pp...',
      '...pp..pp...',
      '..bbb..bbb..',
    ],
    back: [
      '...hhhhhh...',
      '..hhhhhhhh..',
      '.hhhhhhhhhh.',
      '.hhhhhhhhhh.',
      '.hhhhhhhhhh.',
      '.hhhhhhhhhh.',
      '..hhhhhhhh..',
      '....SSSS....',
      '..dccccccd..',
      '..cccccccc..',
      '..cccccccc..',
      '.sccccccccs.',
      '..cccccccc..',
      '...bbbbbb...',
      '...pppppp...',
      '...pp..pp...',
      '...pp..pp...',
      '..bbb..bbb..',
    ],
  },
  monk: {
    front: [
      '....hhhh....',
      '..hhhhhhhh..',
      '..dddddddd..',
      '..hssssssh..',
      '..hsessesh..',
      '..hssssssh..',
      '...ssssss...',
      '....SSSS....',
      '..cccccccc..',
      '.sccccccccs.',
      '.sccddddccs.',
      '.sccddddccs.',
      '..ccddddcc..',
      '...bbbbbb...',
      '...pppppp...',
      '...pp..pp...',
      '...ss..ss...',
      '..bbb..bbb..',
    ],
    back: [
      '....hhhh....',
      '..hhhhhhhh..',
      '..dddddddd..',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '...hhhhhh...',
      '....SSSS....',
      '..cccccccc..',
      '.sccccccccs.',
      '.sccccccccs.',
      '.sccccccccs.',
      '..cccccccc..',
      '...bbbbbb...',
      '...pppppp...',
      '...pp..pp...',
      '...ss..ss...',
      '..bbb..bbb..',
    ],
  },
  mage: {
    front: [
      '.....hh.....',
      '....hhhh....',
      '....hhhh....',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..dddddddd..',
      '.HHHHHHHHHH.',
      '..rssssssr..',
      '..rsessesr..',
      '....SSSS....',
      '..dccccccd..',
      '.sccccccccs.',
      '..ccddddcc..',
      '..ccddddcc..',
      '.cccddddccc.',
      '.cccddddccc.',
      '.CCCddddCCC.',
      '..bb....bb..',
    ],
    back: [
      '.....hh.....',
      '....hhhh....',
      '....hhhh....',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..dddddddd..',
      '.HHHHHHHHHH.',
      '...rrrrrr...',
      '...rrrrrr...',
      '....SSSS....',
      '..dccccccd..',
      '.sccccccccs.',
      '..cccccccc..',
      '..cccccccc..',
      '.cccccccccc.',
      '.cccccccccc.',
      '.CCCCCCCCCC.',
      '..bb....bb..',
    ],
  },
  goblin: {
    front: [
      '............',
      '............',
      '.h..hhhh..h.',
      '.hhhhhhhhhh.',
      '..hhhhhhhh..',
      '..hehhhheh..',
      '..hhhhhhhh..',
      '...hwwwwh...',
      '....HHHH....',
      '..dcccccccd.',
      '.cccccccccc.',
      '.hcccccccch.',
      '..ccddddcc..',
      '...bbbbbb...',
      '....pppp....',
      '...pp..pp...',
      '...bb..bb...',
      '..bbb..bbb..',
    ],
    back: [
      '............',
      '............',
      '.h..hhhh..h.',
      '.hhhhhhhhhh.',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '...hhhhhh...',
      '....HHHH....',
      '..dcccccccd.',
      '.cccccccccc.',
      '.hcccccccch.',
      '..cccccccc..',
      '...bbbbbb...',
      '....pppp....',
      '...pp..pp...',
      '...bb..bb...',
      '..bbb..bbb..',
    ],
  },
  wolf: {
    front: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '.h........h.',
      '.hh..cc..hh.',
      '.hhhccccHHH.',
      '.hhccccccch.',
      '.hcccccccch.',
      '..ccecceccc.',
      '..cccccccc..',
      '...cwwwwc...',
      '..CCccccCC..',
      '..cc.cc.cc..',
      '..cc.cc.cc..',
      '..bb.bb.bb..',
      '............',
    ],
    back: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '.h........h.',
      '.hh..cc..hh.',
      '.hhhccccHHH.',
      '.hhccccccch.',
      '.hcccccccch.',
      '..ccccccccc.',
      '..cccccccc..',
      '...cccccc...',
      '..CCccccCC..',
      '..cc.cc.cc..',
      '..cc.cc.cc..',
      '..bb.bb.bb..',
      '............',
    ],
  },
  skeleton: {
    front: [
      '............',
      '....hhhh....',
      '...hhhhhh...',
      '...hhhhhh...',
      '...hkhhkh...',
      '...hhhhhh...',
      '....hkkh....',
      '.....HH.....',
      '..hhhhhhhh..',
      '.h.hhhhhh.h.',
      '.h..hhhh..h.',
      '.h..hhhh..h.',
      '.d..hhhh..d.',
      '....hhhh....',
      '...hh..hh...',
      '...hh..hh...',
      '..hhh..hhh..',
      '..hhh..hhh..',
    ],
    back: [
      '............',
      '....hhhh....',
      '...hhhhhh...',
      '...hhhhhh...',
      '...hhhhhh...',
      '...hhhhhh...',
      '....hhhh....',
      '.....HH.....',
      '..hhhhhhhh..',
      '.h.hhhhhh.h.',
      '.h..hhhh..h.',
      '.h..hhhh..h.',
      '.d..hhhh..d.',
      '....hhhh....',
      '...hh..hh...',
      '...hh..hh...',
      '..hhh..hhh..',
      '..hhh..hhh..',
    ],
  },
  wisp: {
    front: [
      '.....cc.....',
      '....cccc....',
      '...cchhcc...',
      '..cchhhhcc..',
      '.cchhhhhhcc.',
      '.chhhwwhhhc.',
      '.chhweewhhc.',
      '.chhhwwhhhc.',
      '.cchhhhhhcc.',
      '..cchhhhcc..',
      '...cchhcc...',
      '....cccc....',
      '.....cc.....',
      '......c.....',
      '.....c......',
      '......c.....',
      '.....d......',
      '............',
    ],
    back: [
      '.....cc.....',
      '....cccc....',
      '...cchhcc...',
      '..cchhhhcc..',
      '.cchhhhhhcc.',
      '.chhhhhhhhc.',
      '.chhhhhhhhc.',
      '.chhhhhhhhc.',
      '.cchhhhhhcc.',
      '..cchhhhcc..',
      '...cchhcc...',
      '....cccc....',
      '.....cc.....',
      '......c.....',
      '.....c......',
      '......c.....',
      '.....d......',
      '............',
    ],
  },
  treant: {
    front: [
      '..c......c..',
      '..cc.cc.cc..',
      '.ccccccccc..',
      '..cccccccc..',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..hhehhehh..',
      '..hhhhhhhh..',
      '..hhhwwhhh..',
      '..hhhhhhhh..',
      '.hhhhhhhhhh.',
      'dhhhhhhhhhhd',
      'dhhhhhhhhhhd',
      '.hhhhhhhhhh.',
      '..HHHHHHHH..',
      '..hhh..hhh..',
      '.bbbb..bbbb.',
      '.bbbb..bbbb.',
    ],
    back: [
      '..c......c..',
      '..cc.cc.cc..',
      '.ccccccccc..',
      '..cccccccc..',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '..hhhhhhhh..',
      '.hhhhhhhhhh.',
      'dhhhhhhhhhhd',
      'dhhhhhhhhhhd',
      '.hhhhhhhhhh.',
      '..HHHHHHHH..',
      '..hhh..hhh..',
      '.bbbb..bbbb.',
      '.bbbb..bbbb.',
    ],
  },
  bomb: {
    front: [
      '......b.....',
      '.....bb.....',
      '....bb......',
      '....hh......',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '.hhhhhhhhhh.',
      '.hhhcccchhh.',
      '.hhccccccch.',
      '.hcceccecch.',
      '.hcccccccch.',
      '.hccwwwwcch.',
      '.hcccccccch.',
      '..hcccccch..',
      '..hhCCCCCh..',
      '...hhhhhh...',
      '....pppp....',
      '............',
    ],
    back: [
      '......b.....',
      '.....bb.....',
      '....bb......',
      '....hh......',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '.hhhhhhhhhh.',
      '.hhhcccchhh.',
      '.hhccccccch.',
      '.hcccccccch.',
      '.hcccccccch.',
      '.hcccccccch.',
      '.hcccccccch.',
      '..hcccccch..',
      '..hhCCCCCh..',
      '...hhhhhh...',
      '....pppp....',
      '............',
    ],
  },
};

const SPRITE_W = 12, SPRITE_H = 18, SPRITE_SCALE = 2;
const GRID_W = 20, GRID_H = 21, BODY_OX = 4, BODY_OY = 3;
// Where to draw the finished canvas, relative to a unit's screen position, so
// that the body lands on the same pixels it always has.
const SPRITE_DX = -(1 + BODY_OX * SPRITE_SCALE) - 12;
const SPRITE_DY = -(1 + BODY_OY * SPRITE_SCALE) - 29;

const TEAM_COLORS = { player: '#3b7bd8', enemy: '#d8483b', neutral: '#4caf50' };

// ------------------------------------------------------------------ colours
function toRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shift(hex, amt) {
  const [r, g, b] = toRgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

// The same nudge, kept as hex so the shading pass can still work on it.
function shiftHex(hex, amt) {
  const [r, g, b] = toRgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function darken(hex, amt) { return shift(hex, -amt); }

// Mix towards a tint, for elemental gear.
function tint(hex, toHex, k) {
  const a = toRgb(hex), b = toRgb(toHex);
  const m = (i) => Math.round(a[i] + (b[i] - a[i]) * k);
  const h = (v) => v.toString(16).padStart(2, '0');
  return `#${h(m(0))}${h(m(1))}${h(m(2))}`;
}

/* Fill in the shaded uppercase tone for every colour in a palette. Shared with
   tools/make-icons.js, which draws the app icon from this same art. */
/* Everyone in a party was the same job template in the same colours, so five
   squires were five copies of one person. A unit's own look is derived from
   its id, which is stable and saved, so a character keeps their face across a
   reload and between battles.

   Only what is personal varies. The team accent and the job's cloth carry the
   two things a player has to read at a glance -- whose side this is and what
   it does -- so those stay put, give or take a shade. */
const SKIN_TONES = ['#f6d7b6', '#f0c8a0', '#e3b189', '#cf9468', '#b0764c', '#8e5a38', '#6d422a'];
const HAIR_COLOURS = ['#241c14', '#3a2a1c', '#5a3a1e', '#7c4a26', '#96602c', '#c9a24a',
                      '#dcc78a', '#8f4433', '#6a6a74', '#d6d6e0'];

// A small stable hash, so a name or an id always gives the same person back.
function lookSeed(id) {
  let h = 2166136261;
  for (let i = 0; i < String(id).length; i++) {
    h ^= String(id).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function personalise(pal, seed, hatted) {
  const n = lookSeed(seed);
  pal.s = SKIN_TONES[n % SKIN_TONES.length];
  pal.r = HAIR_COLOURS[(n >>> 4) % HAIR_COLOURS.length];
  // A hatted template spends its hair key on the hat, so leave that alone and
  // let the fringe under it do the talking.
  if (!hatted) pal.h = pal.r;
  // A shade either way on the cloth, which reads as different dye rather than
  // a different job.
  pal.c = shiftHex(pal.c, ((n >>> 9) % 5 - 2) * 7);
  return pal;
}

function resolvePalette(palette, team, kind, look) {
  const pal = Object.assign(
    // `r` is hair as distinct from `h`, which a hatted template spends on the
    // hat. Without it a mage has no hair at all to tell them apart by.
    { s: '#f0c8a0', e: '#101010', w: '#f8f8f8', k: '#101010', r: '#3a2a1c' },
    palette,
    { d: TEAM_COLORS[team] || '#888' },
  );
  if (team === 'enemy' && kind === 'human') pal.c = darken(palette.c, 30);
  if (look && kind === 'human') personalise(pal, look.id, !!SPRITE_HATTED[look.sprite]);
  for (const key of Object.keys(pal)) {
    const up = key.toUpperCase();
    if (up !== key && !pal[up] && typeof pal[key] === 'string' && pal[key][0] === '#') {
      pal[up] = darken(pal[key], 38);
    }
  }
  return pal;
}

// ---------------------------------------------------------------- materials
// Weapons and armour read their age from their colour: iron, then steel, then
// mythril, then gold. A player can see a party's progress across the field.
const METALS = [
  { m: '#7c8290', y: '#b09a58' },
  { m: '#9aa4b8', y: '#c8b068' },
  { m: '#a6d2da', y: '#d8c078' },
  { m: '#e6c65c', y: '#f4e0a0' },
];
const ELEM_TINT = {
  fire: '#e0703a', ice: '#6cbce4', thunder: '#e8cc48',
  earth: '#b08a54', holy: '#f4ecc0', dark: '#8a68b0',
};

function metalOf(tier) { return METALS[Math.min(METALS.length - 1, Math.floor((tier || 0) / 2))]; }

// The element an item answers to, if it answers to one; its gear is tinted so
// a Flame Shield is not just another shield.
function elementOf(item) {
  if (!item || !item.resist) return null;
  for (const el of Object.keys(item.resist)) {
    if (item.resist[el] === 'resist' || item.resist[el] === 'absorb') return el;
  }
  return null;
}

function gearPalette(item) {
  const metal = metalOf(item.tier);
  const el = elementOf(item);
  const pal = {
    m: metal.m, y: metal.y,
    t: '#7a5632', l: '#8a6a42', w: '#e8e4d8', q: '#8ad8f0', n: '#3a3f52',
  };
  if (el) {
    pal.m = tint(pal.m, ELEM_TINT[el], 0.55);
    pal.q = ELEM_TINT[el];
    pal.y = tint(pal.y, ELEM_TINT[el], 0.35);
  }
  for (const key of Object.keys(pal)) pal[key.toUpperCase()] = darken(pal[key], 38);
  return pal;
}

// ------------------------------------------------------------------- glyphs
// Each glyph is placed in grid space. The body occupies columns 4-15 and rows
// 3-20, so a weapon hangs off the right hand at column 15 and a shield covers
// the left arm at column 5.
const G = (x, y, rows) => ({ x, y, rows });

const WEAPONS = {
  sword: G(13, 6, ['..m..', '..mm.', '..mm.', '..mm.', '..mm.', '..mm.', '..mm.', '.ymmy', '..tt.', '..tt.', '..yy.']),
  knife: G(13, 10, ['..m..', '..mm.', '..mm.', '.ymmy', '..tt.', '..tt.']),
  ninjablade: G(13, 7, ['..m..', '..mm.', '..mm.', '..mm.', '..mm.', '..mm.', '.nmmn', '..tt.', '..tt.']),
  axe: G(13, 7, ['..tt...', '..ttmmm', '..ttmmm', '..ttmmm', '..ttmm.', '..tt...', '..tt...', '..tt...', '..tt...', '..yy...']),
  spear: G(13, 0, ['..mm.', '.mmmm', '.mmmm', '..mm.', '..tt.', '..tt.', '..tt.', '..tt.', '..tt.', '..tt.',
                   '..tt.', '..tt.', '..tt.', '..tt.', '..tt.', '..tt.', '..tt.', '..yy.']),
  bow: G(13, 5, ['..tt..', '..w.tt', '..w.tt', '..w.tt', '..w.tt', '..w.tt', '..w.tt', '..w.tt', '..w.tt', '..tt..']),
  staff: G(13, 1, ['..qq..', '.qqqq.', '.qqqq.', '..qq..', '..tt..', '..tt..', '..tt..', '..tt..', '..tt..',
                   '..tt..', '..tt..', '..tt..', '..tt..', '..tt..', '..tt..', '..tt..', '..yy..']),
  rod: G(13, 7, ['..qq..', '..qq..', '..tt..', '..tt..', '..tt..', '..tt..', '..tt..', '..tt..', '..tt..', '..yy..']),
};
// Bare hands get wraps rather than nothing, so a monk still reads as armed.
const FIST_WRAPS = [G(4, 14, ['ww']), G(14, 14, ['ww'])];

const SHIELDS = {
  small: G(2, 12, ['.mm.', 'mddm', 'mddm', '.mm.']),
  kite: G(2, 11, ['.mmm.', 'mmdmm', 'mmdmm', 'mmmmm', '.mmm.', '..m..']),
  great: G(1, 11, ['.mmmm.', 'mmddmm', 'mmddmm', 'mmmmmm', '.mmmm.', '..mm..', '..mm..']),
};

const HELM = G(5, 3, ['...mmmm...', '..mmmmmm..', '.mmmmmmmm.', '.mmmmmmmm.', '.mm....mm.', '..m....m..']);
const PLUME = G(9, 0, ['yy', 'yy', 'yy']);
const CAP = G(5, 3, ['...llll...', '..llllll..', '.LLLLLLLL.']);
const FEATHER = G(13, 1, ['..y', '.y.', 'y..']);
const POINTED_HAT = G(5, 0, ['....mm....', '...mmmm...', '..mmmmmm..', '..mmmmmm..', '.mmmmmmmm.', 'MMMMMMMMMM']);
const RIBBON = G(6, 2, ['.yy..yy.', '.yyyyyy.']);

const ARMOUR = {
  heavy: G(5, 11, ['.mmmmmmmm.', 'mmmmmmmmmm', '.mmmmmmmm.', '..mmmmmm..', '..MMMMMM..']),
  light: G(6, 12, ['.llllll.', 'llllllll', '.llllll.', '.LLLLLL.']),
  robe: G(4, 16, ['...mmmmmm...', '..mmmmmmmm..', '.mmmmmmmmmm.', '.mmmmmmmmmm.', '.yyyyyyyyyy.']),
};

/* Head gear by the look the item declares. A template that already wears a
   hat (the mage's) takes only the trimmings, and has its own hat recoloured
   instead: stamping a second cone on top of the first made a wedding cake. */
const SPRITE_HATTED = { mage: true };

function headGlyphs(item, hatted) {
  const look = item.look || (item.htype === 'helm' ? 'helm' : 'cap');
  if (look === 'helm') return (item.tier || 0) >= 4 ? [HELM, PLUME] : [HELM];
  if (look === 'ribbon') return [RIBBON];
  if (look === 'feather') return hatted ? [FEATHER] : [CAP, FEATHER];
  if (look === 'wizard') return hatted ? [] : [POINTED_HAT];
  return hatted ? [] : [CAP];
}

// ---------------------------------------------------------------- compositing
/* Armour covers the torso, so the team accent is laid down again over the top
   of it. A knight in full plate still wears their colours as a surcoat, and a
   player can always tell at a glance whose side a figure is on. */
function stampAccent(cells, tpl, pal) {
  for (let y = 0; y < tpl.length; y++) {
    for (let x = 0; x < tpl[y].length; x++) {
      if (tpl[y][x] !== 'd') continue;
      const gy = BODY_OY + y, gx = BODY_OX + x;
      if (gy >= 0 && gy < GRID_H && gx >= 0 && gx < GRID_W) cells[gy][gx] = pal.d;
    }
  }
}

function stamp(cells, glyph, pal) {
  for (let y = 0; y < glyph.rows.length; y++) {
    const row = glyph.rows[y], gy = glyph.y + y;
    if (gy < 0 || gy >= GRID_H) continue;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const gx = glyph.x + x;
      if (gx < 0 || gx >= GRID_W) continue;
      cells[gy][gx] = pal[ch] || '#ff00ff';
    }
  }
}

/* One light pass over the finished figure. The light comes from the upper
   left, so a cell with nothing above it is a lit edge and a cell with nothing
   below it is an underside. Applying this after compositing means gear is lit
   by the same light as the body it hangs on. */
function shadeCells(cells) {
  const at = (x, y) => (y >= 0 && y < GRID_H && x >= 0 && x < GRID_W ? cells[y][x] : null);
  const out = [];
  for (let y = 0; y < GRID_H; y++) {
    out.push(new Array(GRID_W).fill(null));
    for (let x = 0; x < GRID_W; x++) {
      const col = cells[y][x];
      if (!col) continue;
      let d = 0;
      if (!at(x, y - 1)) d += 26;
      if (!at(x, y + 1)) d -= 30;
      if (!at(x - 1, y)) d += 12;
      if (!at(x + 1, y)) d -= 12;
      out[y][x] = d === 0 || col[0] !== '#' ? col : shift(col, Math.max(-42, Math.min(38, d)));
    }
  }
  return out;
}

// Cache of rendered sprite canvases. The key carries the gear, so changing a
// sword redraws the sprite but re-uses it for every unit carrying that sword.
const spriteCache = new Map();

/* `gear` is { weapon, offhand, head, body }, each an item or null. Monsters
   pass none. */
function getSprite(job, team, view, flip, gear, look) {
  const g = gear || {};
  const sig = ['weapon', 'offhand', 'head', 'body']
    .map(s => (g[s] ? `${g[s].name}:${g[s].tier || 0}` : '-')).join(',');
  const key = `${job.name}|${team}|${view}|${flip}|${sig}|${look || '-'}`;
  if (spriteCache.has(key)) return spriteCache.get(key);

  const tpl = SPRITE_TEMPLATES[job.sprite][view];
  const pal = resolvePalette(job.palette, team, job.kind, look && { id: look, sprite: job.sprite });
  const cells = [];
  for (let y = 0; y < GRID_H; y++) cells.push(new Array(GRID_W).fill(null));

  // A shield and a raised weapon sit behind the figure when it is seen from
  // behind, and in front of it when it is seen from the front.
  const behind = view === 'back';
  const layers = [];
  if (g.offhand && g.offhand.otype === 'shield') {
    const shape = (g.offhand.tier || 0) >= 4 ? SHIELDS.great : (g.offhand.tier || 0) >= 2 ? SHIELDS.kite : SHIELDS.small;
    const sp = gearPalette(g.offhand);
    const el = elementOf(g.offhand);
    sp.d = el ? ELEM_TINT[el] : pal.d;
    sp.D = darken(sp.d[0] === '#' ? sp.d : '#888888', 38);
    layers.push({ glyph: shape, pal: sp, behind });
  }
  if (g.weapon && WEAPONS[g.weapon.wtype]) {
    layers.push({ glyph: WEAPONS[g.weapon.wtype], pal: gearPalette(g.weapon), behind });
  } else if (g.weapon && g.weapon.wtype === 'fist') {
    for (const w of FIST_WRAPS) layers.push({ glyph: w, pal: gearPalette(g.weapon), behind: false });
  }

  for (const l of layers) if (l.behind) stamp(cells, l.glyph, l.pal);
  stamp(cells, G(BODY_OX, BODY_OY, tpl), pal);
  // Armour is worn, so it goes on the body before anything held.
  if (job.kind === 'human' && g.body && ARMOUR[g.body.atype]) {
    const ap = gearPalette(g.body);
    if (g.body.atype === 'robe') { ap.m = pal.c; ap.M = darken(pal.c, 38); }
    if (g.body.atype === 'light') { ap.l = tint('#8a6a42', metalOf(g.body.tier).m, 0.35); ap.L = darken(ap.l, 38); }
    stamp(cells, ARMOUR[g.body.atype], ap);
  }
  if (job.kind === 'human' && g.head) {
    const hatted = !!SPRITE_HATTED[job.sprite];
    const hp = gearPalette(g.head);
    if (g.head.htype !== 'helm') {
      // A soft hat is the wearer's own cloth, so it stays in their colours.
      hp.m = pal.h; hp.M = darken(pal.h, 38);
      hp.l = pal.h; hp.L = darken(pal.h, 38);
    }
    for (const glyph of headGlyphs(g.head, hatted)) stamp(cells, glyph, hp);
  }
  if (job.kind === 'human' && (g.body || g.head)) stampAccent(cells, tpl, pal);
  for (const l of layers) if (!l.behind) stamp(cells, l.glyph, l.pal);

  const shaded = shadeCells(cells);
  const cv = document.createElement('canvas');
  cv.width = GRID_W * SPRITE_SCALE + 2; cv.height = GRID_H * SPRITE_SCALE + 2;
  const ctx = cv.getContext('2d');
  const px = (x) => (flip ? GRID_W - 1 - x : x) * SPRITE_SCALE + 1;
  // Outline pass: a dark halo around the silhouette, so the figure reads
  // against grass, stone and water alike.
  const filled = (x, y) => y >= 0 && y < GRID_H && x >= 0 && x < GRID_W && !!shaded[y][x];
  ctx.fillStyle = '#141414';
  for (let y = -1; y <= GRID_H; y++) for (let x = -1; x <= GRID_W; x++) {
    if (filled(x, y)) continue;
    if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
      ctx.fillRect(px(x), y * SPRITE_SCALE + 1, SPRITE_SCALE, SPRITE_SCALE);
    }
  }
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    if (!shaded[y][x]) continue;
    ctx.fillStyle = shaded[y][x];
    ctx.fillRect(px(x), y * SPRITE_SCALE + 1, SPRITE_SCALE, SPRITE_SCALE);
  }
  spriteCache.set(key, cv);
  return cv;
}

// The gear a sprite draws, read off a unit.
/* Who this is, for the look. A boss is a written character rather than one of
   a crowd, so it keeps the face its job was given. */
function spriteLook(u) {
  if (!u || u.boss || u.jobData.kind !== 'human') return null;
  return u.id || u.name || null;
}

function spriteGear(u) {
  if (!u || u.jobData.kind !== 'human') return null;
  return {
    weapon: u.weapon || null,
    offhand: u.equipped('offhand'),
    head: u.equipped('head'),
    body: u.equipped('body'),
  };
}

/* Paint a unit's sprite into a canvas at whole-pixel scale, for the menus.
   Equipment shows here too, so a purchase can be seen taking effect on the
   screen where it is made rather than only once the battle starts. */
function paintUnitSprite(cv, u, scale) {
  const spr = getSprite(u.jobData, u.team || 'player', 'front', false, spriteGear(u), spriteLook(u));
  cv.width = spr.width * scale;
  cv.height = spr.height * scale;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, cv.width, cv.height);
  c.drawImage(spr, 0, 0, cv.width, cv.height);
}
