/* ==========================================================================
   Item icons: a small pixel glyph for every piece of gear, every material
   and every one of the chemist's items, drawn on a canvas at paint time.

   A glyph is a 16×16 grid of letters, one per kind of thing (a sword, a
   bow, a hat with a feather, a ring, an ingot, a potion), and a palette
   turns the letters into colours for the particular piece: metal that ages
   from iron to gold with the tier, a tint for the element a piece answers
   to, an accent for the stat it is best at, and pips for a forge's +1..+3.
   So two swords read as swords, and the better one looks it.

   paintIcon(canvas, key, scale) draws one. A key is an item id, or
   'ab:<ability id>' for the chemist's items. iconHtml(key) gives a canvas
   tag to drop into a row; paintIcons(root) paints every unpainted one
   under root. iconKind(key) names the glyph a key draws, so a check can
   prove every item has one. Nothing here touches the document until a
   canvas is painted, so the tables load in a plain Node sandbox too.

   Letters: x outline · m/M/h metal, dark, highlight · w/W wood · l/L
   leather · c/C cloth · g/G gem or accent · y/Y gold · b brass · s pale
   (string, page, glass) · f/F liquid or flame · . nothing.
   ========================================================================== */

const ICON_SIZE = 16;

const ICON_GLYPHS = {
  // ---- weapons: blade to the top right, grip to the bottom left ----
  sword: [
    '.............xxx',
    '............xhhx',
    '...........xhmMx',
    '..........xhmMx.',
    '.........xhmMx..',
    '........xhmMx...',
    '.......xhmMx....',
    '..xx..xhmMx.....',
    '.xyyxxhmMx......',
    '..xyyyhMx.......',
    '...xyyyx........',
    '..xyxyyyx.......',
    '.xwx.xxyx.......',
    'xwx....xx.......',
    'xx..............',
  ],
  knife: [
    '................',
    '................',
    '.........xxx....',
    '........xhhx....',
    '.......xhmMx....',
    '......xhmMx.....',
    '.....xhmMx......',
    '....xhmMx.......',
    '..xxxmMx........',
    '.xyyyyx.........',
    'xlLxxx..........',
    'xLx.............',
    'xx..............',
  ],
  axe: [
    '.......xxxxx....',
    '......xhhhhmx...',
    '.....xhmmmmmmx..',
    '.....xhmmmmmmx..',
    '....xxxmmmmMMx..',
    '...xwWx.xMMMMx..',
    '..xwWx...xMMx...',
    '.xwWx.....xx....',
    'xwWx............',
    'xxx.............',
  ],
  spear: [
    '.............xxx',
    '............xhhx',
    '...........xhmMx',
    '..........xhmmMx',
    '..........xhmMx.',
    '.........xmMMx..',
    '........xyyyx...',
    '.......xwWx.....',
    '......xwWx......',
    '.....xwWx.......',
    '....xwWx........',
    '...xwWx.........',
    '..xwWx..........',
    '.xwWx...........',
    'xwWx............',
    'xxx.............',
  ],
  bow: [
    '.....xx.........',
    '....xwWx........',
    '...xwxxWx.......',
    '..xwx..xsx......',
    '..xwx...xs......',
    '.xwWx...xs......',
    '.xwWx...xs......',
    '.xwWx.xxxsxxx...',
    '.xwWx...xs......',
    '.xwWx...xs......',
    '..xwx...xs......',
    '..xwx..xsx......',
    '...xwxxWx.......',
    '....xwWx........',
    '.....xx.........',
  ],
  gun: [
    '................',
    '................',
    '....xxxxxxxxxxxx',
    '...xmmmmmmmmmmmx',
    '..xbbxmmMMMMMMMx',
    '..xwwbbxxxxxxxxx',
    '..xwwwbx........',
    '...xwwwx........',
    '...xwwwx........',
    '....xwwx........',
    '....xxxx........',
  ],
  staff: [
    '..........xxxx..',
    '.........xghhgx.',
    '.........xgggGx.',
    '.........xGgGGx.',
    '........xyxxxx..',
    '.......xwWx.....',
    '......xwWx......',
    '.....xwWx.......',
    '....xwWx........',
    '...xwWx.........',
    '..xwWx..........',
    '.xwWx...........',
    'xwWx............',
    'xxx.............',
  ],
  rod: [
    '..........xxx...',
    '.........xhggx..',
    '.........xggGx..',
    '..........xGx...',
    '.........xmMx...',
    '........xmMx....',
    '.......xmMx.....',
    '......xmMx......',
    '.....xmMx.......',
    '....xyyx........',
    '...xyYx.........',
    '..xyYx..........',
    '..xxx...........',
  ],
  katana: [
    '..............xx',
    '.............xhx',
    '............xhmx',
    '...........xhmMx',
    '..........xhmMx.',
    '.........xhmMx..',
    '........xhmMx...',
    '.......xhmMx....',
    '......xhmMx.....',
    '....xxyyMx......',
    '...xCcyx........',
    '..xcCx..........',
    '.xCcx...........',
    '.xxx............',
  ],
  harp: [
    '....xxyyx.......',
    '...xyyyyyx......',
    '..xyyxxxyyx.....',
    '..xyx.s.xyx.....',
    '.xyx.s.s.xyx....',
    '.xyx.s.s.sxyx...',
    '.xyxs.s.s.xyx...',
    '.xyxs.s.s.xyx...',
    '.xyx.s.s.sxyx...',
    '.xyx.s.s.xyx....',
    '..xyx.s.xyx.....',
    '..xyyxxxyyx.....',
    '...xyyyyyx......',
    '....xxyyx.......',
  ],
  greatsword: [
    '............xxxx',
    '...........xhhhx',
    '..........xhhmMx',
    '.........xhhmMx.',
    '........xhhmMx..',
    '.......xhhmMx...',
    '......xhhmMx....',
    '.....xhhmMx.....',
    '.xxxxhhmMx......',
    'xyyyyymMx.......',
    '.xxxyyyx........',
    '..xWxyyyx.......',
    '.xWx.xxyyx......',
    'xWx....xyx......',
    'xx......xx......',
  ],
  tome: [
    '................',
    '..xxxxxxxxxxx...',
    '.xccccccccccxx..',
    '.xcCCCCCCCCcxsx.',
    '.xcCgggggCCcxsx.',
    '.xcCgGGGgCCcxsx.',
    '.xcCgggggCCcxsx.',
    '.xcCCCCCCCCcxsx.',
    '.xcCCCCCCCCcxsx.',
    '.xcCCCCCCCCcxsx.',
    '.xcCCCCCCCCcxsx.',
    '.xcyyCCCCCCcxsx.',
    '.xccccccccccxsx.',
    '..xxxxxxxxxxxx..',
  ],
  ninjablade: [
    '.............xxx',
    '............xhmx',
    '...........xhmMx',
    '..........xhmMx.',
    '.........xhmMx..',
    '........xhmMx...',
    '.......xhmMx....',
    '......xMMMx.....',
    '.....xCcCx......',
    '....xcCcx.......',
    '...xCcCx........',
    '..xcCcx.........',
    '.xxxxx..........',
    'xyyx............',
    'xxx.............',
  ],
  fist: [
    '................',
    '....xxxxxxx.....',
    '...xmxmxmxmx....',
    '..xllllllllx....',
    '..xlLlLlLlllx...',
    '..xlllllllllx...',
    '..xLLLLLLLLLx...',
    '..xlllllllllx...',
    '...xlllllllx....',
    '....xLLLLLx.....',
    '.....xxxxx......',
  ],
  // ---- offhand ----
  shield: [
    '...xxxxxxxxxx...',
    '..xhmmmmmmmmhx..',
    '..xmmmmmmmmmmx..',
    '..xmmmxggxmmmx..',
    '..xmmmxgGxmmmx..',
    '..xmmmmmmmmmmx..',
    '..xMmmmmmmmmMx..',
    '...xMmmmmmmmx...',
    '...xMMmmmmMMx...',
    '....xMMmmMMx....',
    '.....xMMMMx.....',
    '......xMMx......',
    '.......xx.......',
  ],
  // ---- head ----
  cap: [
    '................',
    '................',
    '......xxxxx.....',
    '....xxcccccxx...',
    '...xcccccccccx..',
    '..xcccccccccccx.',
    '..xCCCCCCCCCCCx.',
    '..xxxxxxxxxxxxx.',
    '......xLLLLLLx..',
    '.......xxxxxx...',
  ],
  feather: [
    '............y...',
    '...........yy...',
    '..........yyx...',
    '.....xxxxyyx....',
    '....xcccyyx.....',
    '...xcccccxx.....',
    '...xCCCCCCx.....',
    '.xxxxxxxxxxxxx..',
    'xcccccccccccccx.',
    '.xxxxxxxxxxxxx..',
  ],
  wizard: [
    '.........xx.....',
    '........xccx....',
    '........xccx....',
    '.......xccccx...',
    '.......xccccx...',
    '......xccccccx..',
    '......xCcccccx..',
    '.....xCCccccccx.',
    '.....xCCCcccccx.',
    '.xxxxCCCCCCCCxxx',
    'xccccccccccccccx',
    '.xxxxxxxxxxxxxx.',
  ],
  ribbon: [
    '................',
    '................',
    '................',
    '.........xx.xx..',
    '........xyyxyyx.',
    '.xxxxxxxxyyyyyx.',
    'xccccccccxyyyx..',
    'xCCCCCCCCxyyxyx.',
    '.xxxxxxxxxxxxx..',
  ],
  goggles: [
    '................',
    '................',
    '................',
    '..xxxxx..xxxxx..',
    '.xmmmmmxxmmmmmx.',
    '.xmgggmmmmgggmx.',
    '.xmgGgmxxmgGgmx.',
    '.xmgggmx.xmgggmx',
    '..xmmmx..xmmmx..',
    '...xxx....xxx...',
  ],
  helm: [
    '................',
    '.....xxxxxx.....',
    '....xhmmmmmx....',
    '...xhmmmmmmmx...',
    '..xmmmmmmmmmmx..',
    '..xmmmmmmmmmmx..',
    '..xMxxxxxxxxMx..',
    '..xMx......xMx..',
    '..xMMx....xMMx..',
    '...xxx....xxx...',
  ],
  crown: [
    '................',
    '................',
    '..x.....x.....x.',
    '.xyx...xyx...xyx',
    '.xyx.x.xyx.x.xyx',
    '.xyyxyxyyyxyxyyx',
    '.xyyyyyyyyyyyyyx',
    '.xyyygyyyygyyyyx',
    '.xyyyyyyyyyyyyyx',
    '.xYYYYYYYYYYYYYx',
    '..xxxxxxxxxxxxx.',
  ],
  // ---- body ----
  cloth: [
    '................',
    '...xxx....xxx...',
    '..xcccxxxxcccx..',
    '.xccccccccccccx.',
    '.xccCccccccCccx.',
    '.xxxxccccccxxxx.',
    '....xccccccx....',
    '....xccccccx....',
    '....xccCCccx....',
    '....xccccccx....',
    '....xCCCCCCx....',
    '.....xxxxxx.....',
  ],
  light: [
    '................',
    '...xxx....xxx...',
    '..xlllx..xlllx..',
    '.xlllllxxlllllx.',
    '.xlLlllxxlllLlx.',
    '.xxxxllxxllxxxx.',
    '....xllxxllx....',
    '....xllxxllx....',
    '....xmmmmmmx....',
    '....xllxxllx....',
    '....xLLxxLLx....',
    '.....xxxxxx.....',
  ],
  heavy: [
    '................',
    '..xxxx....xxxx..',
    '.xhmmmxxxxmmmhx.',
    '.xmmmmmmmmmmmmx.',
    '.xMMmmmhhmmmMMx.',
    '.xxxxmmmhhmmxxxx',
    '....xmmmhhmmx...',
    '....xmmmhhmmx...',
    '....xmMmhhMmx...',
    '....xmmMMMmmx...',
    '....xMMMMMMMx...',
    '.....xxxxxxx....',
  ],
  robe: [
    '.....xxxxxx.....',
    '....xccccccx....',
    '...xcccCCcccx...',
    '..xccccCCccccx..',
    '..xcccCCCCcccx..',
    '.xxxcccCCcccxxx.',
    '...xccccCcccx...',
    '...xccccCcccx...',
    '...xccccCcccx...',
    '..xcccccCccccx..',
    '..xcccccCccccx..',
    '.xcccccCCCcccccx',
    '.xCCCCCCCCCCCCCx',
    '..xxxxxxxxxxxxx.',
  ],
  cloak: [
    '......xxxx......',
    '.....xccccx.....',
    '....xccxxccx....',
    '....xcx..xcx....',
    '...xccx..xccx...',
    '...xccxyyxccx...',
    '..xccccxxccccx..',
    '..xcccccccccccx.',
    '..xcccCccccccx..',
    '.xccccCcccccccx.',
    '.xccccCcccccccx.',
    '.xcccCCCccccccx.',
    '.xCCCCCCCCCCCCx.',
    '..xxxxxxxxxxxx..',
  ],
  // ---- accessories ----
  ring: [
    '................',
    '.......xx.......',
    '......xggx......',
    '.....xgGGgx.....',
    '....xyxggxyx....',
    '...xyyxxxxyyx...',
    '...xyx....xyx...',
    '...xyx....xyx...',
    '...xYx....xYx...',
    '....xYx..xYx....',
    '.....xYYYYx.....',
    '......xxxx......',
  ],
  boots: [
    '................',
    '....xxxx........',
    '....xllx........',
    '....xllx........',
    '....xllx........',
    '....xllx........',
    '....xllxxxx.....',
    '....xlllllLx....',
    '...xlllllllLx...',
    '..xLLLLLLLLLLx..',
    '..xxxxxxxxxxxx..',
  ],
  glove: [
    '................',
    '....x.xxx.......',
    '...xlxlxlxx.....',
    '...xlxlxlxlx....',
    '..xxllllllllx...',
    '.xlxlllllllllx..',
    '.xllllllllllx...',
    '..xllllllllx....',
    '...xLLLLLLx.....',
    '...xllllllx.....',
    '...xLLLLLLx.....',
    '....xxxxxx......',
  ],
  bracer: [
    '................',
    '................',
    '...xxxxxxxxxx...',
    '..xhmmmmmmmmmx..',
    '..xmmmgggmmmmx..',
    '..xmmmgGgmmmmx..',
    '..xMmmgggmmmMx..',
    '..xMMMMMMMMMMx..',
    '...xxxxxxxxxx...',
  ],
  amulet: [
    '.....xxxxxx.....',
    '....xy....yx....',
    '...xy......yx...',
    '...xy......yx...',
    '...xy......yx...',
    '....xy....yx....',
    '.....xyxxyx.....',
    '......xyyx......',
    '.....xygggx.....',
    '....xyggGggyx...',
    '....xyggGggyx...',
    '.....xyggggx....',
    '......xyyyx.....',
    '.......xxx......',
  ],
  charm: [
    '................',
    '................',
    '......xxxx......',
    '.....xgggGx.....',
    '....xghggGGx....',
    '...xgghgggGGx...',
    '...xggggggGGx...',
    '...xGggggGGGx...',
    '....xGGGGGGx....',
    '.....xGGGGx.....',
    '......xxxx......',
  ],
  pack: [
    '................',
    '......xxxx......',
    '.....xlllx......',
    '....xxxxxxxx....',
    '...xllllllllx...',
    '...xlLLLLLLlx...',
    '...xllllllllx...',
    '...xlxxxxxxlx...',
    '...xlxllllxlx...',
    '...xlxllllxlx...',
    '...xlxLLLLxlx...',
    '...xLLLLLLLLx...',
    '....xxxxxxxx....',
  ],
  lantern: [
    '.......xx.......',
    '......xbbx......',
    '.....xbbbbx.....',
    '.....xxxxxx.....',
    '....xbffffbx....',
    '....xbfhffbx....',
    '....xbffffbx....',
    '....xbffffbx....',
    '....xbFfffbx....',
    '....xbFFFFbx....',
    '.....xbbbbx.....',
    '......xxxx......',
  ],
  heart: [
    '................',
    '...xxx....xxx...',
    '..xfhfx..xfffx..',
    '.xfhfffxxfffffx.',
    '.xffffffffffffx.',
    '.xffffffffffffx.',
    '..xffffffffffx..',
    '...xFfffffffx...',
    '....xFFfffFx....',
    '.....xFFFFx.....',
    '......xFFx......',
    '.......xx.......',
  ],
  seal: [
    '................',
    '.....xxxxxx.....',
    '....xyyyyyyx....',
    '...xyyygggyyx...',
    '..xyygggggGyyx..',
    '..xyyggGGggyyx..',
    '..xyyggGGggyyx..',
    '..xyygGGGGgyyx..',
    '...xYyyyyyyYx...',
    '....xYYYYYYx....',
    '.....xxxxxx.....',
  ],
  sigil: [
    '................',
    '...xxxxxxxxxx...',
    '..xmmmmmmmmmmx..',
    '..xmmgmmmmgmmx..',
    '..xmmmgmmgmmmx..',
    '..xmmmmggmmmmx..',
    '..xmmmmggmmmmx..',
    '..xmmmgmmgmmmx..',
    '..xmmgmmmmgmmx..',
    '..xMMMMMMMMMMx..',
    '...xxxxxxxxxx...',
  ],
  // ---- materials ----
  ingot: [
    '................',
    '................',
    '................',
    '....xxxxxxxxx...',
    '...xhhhmmmmmmx..',
    '..xhmmmmmmmmmmx.',
    '.xmmmmmmmmmmmmmx',
    '.xMMMMMMMMMMMMMx',
    '..xxxxxxxxxxxxx.',
  ],
  wood: [
    '................',
    '................',
    '..xxxxxxxxxxxx..',
    '.xwwwwwwwwwwwwx.',
    '.xwWwwWwwwWwwwx.',
    '.xwwwwwwwwwwwwx.',
    '.xWWwwWWwwWWwwx.',
    '.xwwwwwwwwwwwwx.',
    '.xWWWWWWWWWWWWx.',
    '..xxxxxxxxxxxx..',
  ],
  silk: [
    '................',
    '..xxxxxxxxxx....',
    '.xccccccccccx...',
    '.xcCcccccccccx..',
    '..xcCccccccccx..',
    '...xcCcccccccx..',
    '..xxxxCcccccccx.',
    '.xcccccCccccccx.',
    '.xCCCCCCCCCCCCx.',
    '..xxxxxxxxxxxx..',
  ],
  brass: [
    '................',
    '......xx.xx.....',
    '....xxbbxbbxx...',
    '...xbbbbbbbbbx..',
    '..xxbbxxxxbbxx..',
    '..xbbxx..xxbbx..',
    '..xbbx....xbbx..',
    '..xbbxx..xxbbx..',
    '..xxbbxxxxbbxx..',
    '...xbbbbbbbbbx..',
    '....xxbbxbbxx...',
    '......xx.xx.....',
  ],
  glass: [
    '................',
    '......x.........',
    '.....xfx..x.....',
    '....xfhfx.......',
    '...xffhffx.x....',
    '..xfffhfffx.....',
    '..xffffffffx....',
    '...xFffffFx.....',
    '....xFFFFx......',
    '.....xFFx.......',
    '......xx........',
  ],
  star: [
    '................',
    '.......h........',
    '....xxxhxxx.....',
    '...xmMMhMMmx....',
    '..xmMhhhhhMmx...',
    '..xMMMMhMMMMx...',
    '..xMMMMMMMMMx...',
    '..xMMMMMMMMMx...',
    '...xMMMMMMMx....',
    '....xxxxxxx.....',
  ],
  // ---- the chemist's items ----
  potion: [
    '......xxxx......',
    '......xssx......',
    '......xssx......',
    '......xssx......',
    '.....xxssxx.....',
    '....xssssssx....',
    '...xssffffssx...',
    '...xsffffffsx...',
    '..xsffhfffffsx..',
    '..xsffffffffsx..',
    '..xsffffffffsx..',
    '...xsFFFFFFsx...',
    '...xssFFFFssx...',
    '....xxxxxxxx....',
  ],
  hipotion: [
    '.....xxxxxx.....',
    '.....xssssx.....',
    '.....xssssx.....',
    '....xxssssxx....',
    '...xssssssssx...',
    '..xssffffffssx..',
    '..xsffffffffsx..',
    '.xsffhffffffffx.',
    '.xsfffffffffffx.',
    '.xsyyyyyyyyyyyx.',
    '.xsfffffffffffx.',
    '..xsFFFFFFFFsx..',
    '..xssFFFFFFssx..',
    '...xxxxxxxxxx...',
  ],
  ether: [
    '.......xxx......',
    '......xsssx.....',
    '......xsssx.....',
    '.....xxsssxx....',
    '....xsssssssx...',
    '...xsssfffsssx..',
    '..xssfffffffssx.',
    '..xsffhffffffsx.',
    '..xsfffffffffsx.',
    '..xsfffffffffsx.',
    '...xsFFFFFFFsx..',
    '....xssFFFssx...',
    '.....xxxxxxx....',
  ],
  antidote: [
    '......xxxx......',
    '......xssx......',
    '......xssx......',
    '.....xxssxx.....',
    '.....xssssx.....',
    '.....xsffsx.....',
    '.....xsffsx.....',
    '....xsffhffsx...',
    '....xsffffffx...',
    '....xsffffffx...',
    '....xsFFFFFsx...',
    '.....xFFFFx.....',
    '......xxxx......',
  ],
  remedy: [
    '.....xxxxxx.....',
    '....xxssssxx....',
    '....xssssssx....',
    '....xxxxxxxx....',
    '...xssffffssx...',
    '..xsffffffffsx..',
    '..xsffxffxffsx..',
    '..xsfffxxfffsx..',
    '..xsfffxxfffsx..',
    '..xsffxffxffsx..',
    '..xsffffffffsx..',
    '...xsFFFFFFsx...',
    '....xxxxxxxx....',
  ],
  phoenix: [
    '..............x.',
    '.............xfx',
    '............xffx',
    '...........xffhx',
    '..........xffhx.',
    '.........xfffx..',
    '........xffhx...',
    '.......xffhx....',
    '......xfffx.....',
    '.....xffhx......',
    '....xffhx.......',
    '...xffx.........',
    '..xffx..........',
    '.xfx............',
    'xfx.............',
    'xx..............',
  ],
};

// ---- colours ------------------------------------------------------------
// Metal ages with the tier: iron, steel, mythril, gold. The same ladder the
// battle sprites climb, so a piece looks on the shelf as it does in the hand.
const ICON_METALS = [
  { m: '#7c8290', M: '#4a4e5c', h: '#c0c6d0' },
  { m: '#9aa4b8', M: '#5c6478', h: '#d8e0ec' },
  { m: '#a6d2da', M: '#5c8a94', h: '#e4f6fa' },
  { m: '#e6c65c', M: '#9a8030', h: '#fbf0b8' },
];
const ICON_ELEMENTS = {
  fire: '#e0703a', ice: '#6cbce4', thunder: '#e8cc48',
  earth: '#b08a54', holy: '#f4ecc0', dark: '#8a68b0', water: '#4a9ad8',
};
// What a piece is best at colours its gem: might red, magic violet, speed
// gold, life green, mana blue, evasion sky, reach amber.
const ICON_STAT_ACCENT = { pa: '#e05a4a', ma: '#b07cf0', spd: '#f0d060', hp: '#7cd07c', mp: '#6cb0f0', evade: '#8ad8f0', move: '#f0a060', jump: '#f0a060' };
// Cloth deepens with the tier: homespun, then dyed, then the fine stuff.
const ICON_CLOTHS = ['#8a6a48', '#4a6a9a', '#6a4a8a', '#9a3a3a', '#3a7a6a', '#c8b060', '#e8e0d0', '#d8c8f0'];
const ICON_FIXED = { x: '#1a1a24', w: '#8a5a32', W: '#5a3a1e', l: '#9a6a3a', L: '#6a4424', s: '#e8e4d8', b: '#c89a3a', y: '#d8b040', Y: '#9a7a20' };
// The chemist's items, each its own colour of liquid.
const ICON_LIQUIDS = { potion: '#4a8ae8', hipotion: '#3a6ae0', ether: '#9a6ae8', antidote: '#5ac85a', remedy: '#e8c040', phoenix: '#f08a3a' };
const ICON_MATERIAL_KIND = { ironIngot: 'ingot', steelIngot: 'ingot', oakHeartwood: 'wood', silkBolt: 'silk', brassFitting: 'brass', emberGlass: 'glass', starIron: 'star' };
const ICON_ABILITY_KIND = { potion: 'potion', hiPotion: 'hipotion', ether: 'ether', antidote: 'antidote', remedy: 'remedy', phoenixDown: 'phoenix' };

// The element a piece answers to, if any: what it resists or drinks in.
function iconElementOf(it) {
  for (const [el, kind] of Object.entries(it.resist || {})) if (kind === 'resist' || kind === 'absorb') return el;
  return null;
}

// The stat a piece gives most of, scaled so a point of speed counts as
// much as a handful of HP.
function iconBestStat(it) {
  const weight = { hp: 0.1, mp: 0.15, pa: 1, ma: 1, spd: 1.5, evade: 0.25, move: 1.5, jump: 1 };
  let best = null, bv = 0;
  for (const k of Object.keys(weight)) if ((it[k] || 0) * weight[k] > bv) { bv = it[k] * weight[k]; best = k; }
  return best;
}

// An accessory is told apart by its name: boots, a ring, a glove...
function iconAccessoryKind(it) {
  const n = (it.name || '').toLowerCase();
  if (/boots|shoes|walker/.test(n)) return 'boots';
  if (/ring/.test(n)) return 'ring';
  if (/glove|gauntlet/.test(n)) return 'glove';
  if (/bracer|band/.test(n)) return 'bracer';
  if (/amulet|pendant|necklace/.test(n)) return 'amulet';
  if (/cloak|mantle|cape/.test(n)) return 'cloak';
  if (/pack|satchel/.test(n)) return 'pack';
  if (/lantern|lamp/.test(n)) return 'lantern';
  if (/heart/.test(n)) return 'heart';
  if (/seal|signet/.test(n)) return 'seal';
  if (/sigil|rune/.test(n)) return 'sigil';
  return 'charm'; // stones, pearls, charms and anything else that is held
}

// The glyph a key draws: an item id, or 'ab:<ability>' for the chemist's
// items. Null when there is nothing to draw, which the validator forbids.
function iconKind(key) {
  if (typeof key !== 'string') return null;
  if (key.startsWith('ab:')) return ICON_ABILITY_KIND[key.slice(3)] || null;
  const it = ITEMS[key];
  if (!it) return null;
  const base = it.base ? ITEMS[it.base] || it : it;
  const name = (base.name || '').toLowerCase();
  if (base.slot === 'material') return ICON_MATERIAL_KIND[it.base || key] || 'ingot';
  if (base.slot === 'weapon') return ICON_GLYPHS[base.wtype] ? base.wtype : null;
  if (base.slot === 'offhand') return 'shield';
  if (base.slot === 'head') {
    if (/crown/.test(name)) return 'crown';
    if (base.htype === 'helm') return 'helm';
    return ICON_GLYPHS[base.look] && base.look !== 'helm' ? base.look : 'cap';
  }
  if (base.slot === 'body') {
    if (/cloak|coat|oilskin/.test(name)) return 'cloak';
    return ICON_GLYPHS[base.atype] ? base.atype : 'cloth';
  }
  if (base.slot === 'acc') return iconAccessoryKind(base);
  return null;
}

// The colours one piece paints its glyph with.
function iconPalette(key, kind) {
  const pal = Object.assign({}, ICON_FIXED);
  if (key.startsWith('ab:')) {
    pal.f = ICON_LIQUIDS[kind] || '#4a8ae8';
    pal.F = shiftHex(pal.f, -50);
    pal.h = '#ffffff';
    if (kind === 'phoenix') pal.h = '#ffe070';
    return pal;
  }
  const it = ITEMS[key] || {};
  const base = it.base ? ITEMS[it.base] || it : it;
  const metal = ICON_METALS[Math.min(ICON_METALS.length - 1, Math.floor((base.tier || 0) / 2))];
  Object.assign(pal, metal);
  const el = iconElementOf(base);
  const stat = iconBestStat(base);
  pal.g = el ? ICON_ELEMENTS[el] : stat ? ICON_STAT_ACCENT[stat] : metal.h;
  if (el) { pal.m = tint(pal.m, ICON_ELEMENTS[el], 0.45); pal.M = tint(pal.M, ICON_ELEMENTS[el], 0.35); pal.h = tint(pal.h, ICON_ELEMENTS[el], 0.3); }
  pal.G = shiftHex(pal.g, -55);
  let cloth = ICON_CLOTHS[Math.min(ICON_CLOTHS.length - 1, base.tier || 0)];
  if (el) cloth = tint(cloth, ICON_ELEMENTS[el], 0.5);
  pal.c = cloth; pal.C = shiftHex(cloth, -45);
  // The odd few that paint with liquid or flame: a lantern, a heart, ember glass.
  pal.f = kind === 'glass' ? '#f0a040' : kind === 'heart' ? '#d84a5a' : el ? ICON_ELEMENTS[el] : '#f0c060';
  pal.F = shiftHex(pal.f, -60);
  if (kind === 'star') { pal.m = '#4a4a66'; pal.M = '#2a2a40'; pal.h = '#ffffff'; }
  if (kind === 'ingot' && base.tier >= 3) Object.assign(pal, ICON_METALS[1]);
  if (kind === 'silk') { pal.c = '#e8d0d8'; pal.C = '#b89aa6'; }
  return pal;
}

// ---- painting -----------------------------------------------------------
const ICON_CACHE = new Map();
const ICON_CACHE_MAX = 600;

// A 16×16 canvas of the key, cached. Null when there is nothing to draw.
function iconCanvas(key) {
  if (ICON_CACHE.has(key)) return ICON_CACHE.get(key);
  const kind = iconKind(key);
  if (!kind) return null;
  const rows = ICON_GLYPHS[kind], pal = iconPalette(key, kind);
  const cv = document.createElement('canvas');
  cv.width = ICON_SIZE; cv.height = ICON_SIZE;
  const c = cv.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || !pal[ch]) continue;
      c.fillStyle = pal[ch];
      c.fillRect(x, y, 1, 1);
    }
  });
  // A forge's work shows as gold pips along the bottom edge: one a step.
  const plus = (ITEMS[key] && ITEMS[key].plus) || 0;
  for (let i = 0; i < plus; i++) {
    c.fillStyle = ICON_FIXED.y; c.fillRect(1 + i * 2, ICON_SIZE - 1, 1, 1);
    c.fillStyle = '#fff4c0'; c.fillRect(1 + i * 2, ICON_SIZE - 2, 1, 1);
  }
  if (ICON_CACHE.size >= ICON_CACHE_MAX) ICON_CACHE.delete(ICON_CACHE.keys().next().value);
  ICON_CACHE.set(key, cv);
  return cv;
}

// Draw the key's icon onto a canvas at the scale, crisp.
function paintIcon(cv, key, scale = 2) {
  const src = iconCanvas(key);
  cv.width = ICON_SIZE * scale; cv.height = ICON_SIZE * scale;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, cv.width, cv.height);
  if (src) c.drawImage(src, 0, 0, cv.width, cv.height);
  cv.dataset.painted = src ? '1' : '0';
  return !!src;
}

// A canvas tag for a row, painted later by paintIcons.
function iconHtml(key, cls = '') {
  return `<canvas class="item-icon ${cls}" data-icon="${key}" width="32" height="32" aria-hidden="true"></canvas>`;
}

// Paint every icon under root that has not been painted yet.
function paintIcons(root) {
  for (const cv of (root || document).querySelectorAll('canvas[data-icon]:not([data-painted])')) {
    paintIcon(cv, cv.dataset.icon, 2);
  }
}
