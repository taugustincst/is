/* ==========================================================================
   Isometric canvas renderer + animation helpers.
   ========================================================================== */

const TILE_W = 64, TILE_H = 32, HZ = 10;

/* Whose side a figure is on has to survive a crowded melee on a small screen,
   where a handful of accent pixels on a tabard do not. So every unit stands on
   a team-coloured base ring: it is on the ground, it never overlaps the figure
   in front of it, and it stays legible at phone scale. Colour alone would fail
   a colour-blind player, so the ring's shape carries the same fact — allies
   stand on a smooth ring, enemies on a serrated one. */
const BASE_RING = {
  player: { line: '#6fb2ff', fill: 'rgba(70,150,255,0.34)', teeth: 0 },
  enemy: { line: '#ff6a52', fill: 'rgba(255,70,50,0.34)', teeth: 8 },
  neutral: { line: '#6ce08a', fill: 'rgba(70,220,110,0.30)', teeth: 4 },
};
// `lip` is a band of the top's colour along the upper edge of a wall face:
// turf over earth, moss over stone.
const TERRAIN = {
  g: { top: '#5f9e4a', l: '#7a5a3c', r: '#5e4430', lip: '#4a7d3a' },
  d: { top: '#a9825a', l: '#8a6a48', r: '#6f5439' },
  s: { top: '#9a9aa8', l: '#7a7a88', r: '#606070' },
  b: { top: '#b08a52', l: '#8f6d40', r: '#6e5330' },
  w: { top: '#3f6fb0', l: '#365f98', r: '#2c4f80' },
  t: { top: '#5f9e4a', l: '#7a5a3c', r: '#5e4430', lip: '#4a7d3a' },
  // The north: packed snow over frozen earth, and river ice over dark water.
  n: { top: '#e4ecf2', l: '#8a8a94', r: '#6c6c78', lip: '#c8d4dc' },
  i: { top: '#b6dcee', l: '#2c4f80', r: '#243f68', lip: '#9cc8e0' },
  // The sea's edge: shallows over a reef, walkable at low tide.
  r: { top: '#5a9ab8', l: '#3a6a88', r: '#2c5470', lip: '#8ac0d4' },
};

/* The ground had been six flat colours. Each terrain now has a few textured
   tile tops -- tufts and flowers in the grass, pebbles in the dirt, cracks in
   the flagstones, planks on a bridge -- drawn once into small canvases and
   stamped by drawImage, which costs no more than the flat fill did. Which
   variant a tile gets is a hash of its coordinates, so the field does not
   shimmer between frames or change when the board is turned. */
const TILE_VARIANTS = 6;
const tileTexCache = new Map();

// A tiny deterministic generator, seeded per variant.
function seeded(seed) {
  let x = (seed * 2654435761 + 1) >>> 0;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}

function tileTexture(kind, variant) {
  const key = kind + variant;
  let cv = tileTexCache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = 64; cv.height = 32;
  const c = cv.getContext('2d');
  const col = TERRAIN[kind] || TERRAIN.g;
  const rnd = seeded(kind.charCodeAt(0) * 31 + variant * 7 + 1);
  c.fillStyle = col.top; c.fillRect(0, 0, 64, 32);
  const px = (x, y, w, h, fill) => { c.fillStyle = fill; c.fillRect(Math.round(x), Math.round(y), w, h); };
  // Points inside the diamond, so nothing is wasted on the corners.
  const inside = () => { let x, y; do { x = rnd() * 64; y = rnd() * 32; } while (Math.abs(x - 32) / 32 + Math.abs(y - 16) / 16 > 0.88); return [x, y]; };
  if (kind === 'g' || kind === 't') {
    for (let i = 0; i < 26; i++) { const [x, y] = inside(); px(x, y, 1, 1, rnd() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'); }
    // Tufts: three blades.
    for (let i = 0; i < 4; i++) { const [x, y] = inside(); px(x - 1, y, 1, 2, '#3e7a2f'); px(x + 1, y, 1, 2, '#3e7a2f'); px(x, y - 1, 1, 3, '#4f9a3d'); }
    // A flower now and then -- one tile in six, so a meadow is not confetti.
    if (variant === 3) { const [x, y] = inside(); px(x, y, 2, 1, rnd() < 0.5 ? '#ffe28a' : '#f2a3c9'); px(x + 1, y + 1, 1, 1, '#3e7a2f'); }
  } else if (kind === 'd') {
    for (let i = 0; i < 22; i++) { const [x, y] = inside(); px(x, y, 1, 1, rnd() < 0.5 ? 'rgba(255,240,200,0.14)' : 'rgba(60,30,10,0.16)'); }
    for (let i = 0; i < 4; i++) { const [x, y] = inside(); px(x, y, 3, 2, '#8a6a48'); px(x, y, 2, 1, '#c9a67a'); }
  } else if (kind === 's') {
    // Flagstones: a couple of cracks along the isometric axes, and chips.
    for (let i = 0; i < 3; i++) {
      const [x, y] = inside(); const len = 4 + rnd() * 8, dir = rnd() < 0.5 ? 1 : -1;
      for (let k = 0; k < len; k++) px(x + k * 2 * dir, y + k, 2, 1, 'rgba(0,0,0,0.22)');
    }
    for (let i = 0; i < 14; i++) { const [x, y] = inside(); px(x, y, 1, 1, rnd() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)'); }
  } else if (kind === 'b') {
    // Planks laid across the span, with a dark seam between each.
    for (let k = -3; k < 4; k++) {
      for (let i = -32; i < 32; i++) {
        const x = 32 + i, y = 16 + i * 0.5 + k * 5;
        px(x, y, 1, 1, 'rgba(40,20,5,0.35)');
      }
    }
    for (let i = 0; i < 6; i++) { const [x, y] = inside(); px(x, y, 1, 1, '#3a2510'); }
    for (let i = 0; i < 10; i++) { const [x, y] = inside(); px(x, y, 2, 1, 'rgba(255,220,160,0.14)'); }
  } else if (kind === 'n') {
    // Snow: a faint sparkle, a drift line or two, the odd footprint.
    for (let i = 0; i < 18; i++) { const [x, y] = inside(); px(x, y, 1, 1, 'rgba(255,255,255,0.7)'); }
    for (let i = 0; i < 3; i++) { const [x, y] = inside(); px(x - 4, y, 9, 1, 'rgba(160,180,200,0.35)'); }
    if (rnd() < 0.3) { const [x, y] = inside(); px(x, y, 2, 3, 'rgba(120,140,160,0.35)'); px(x + 4, y + 2, 2, 3, 'rgba(120,140,160,0.35)'); }
  } else if (kind === 'i') {
    // Ice: long cracks and a sheen.
    for (let i = 0; i < 3; i++) { const [x, y] = inside(); const len = 6 + rnd() * 12; for (let k = 0; k < len; k++) px(x + k, y + Math.round(Math.sin(k * 0.8 + i) * 1.5), 1, 1, 'rgba(70,110,150,0.55)'); }
    for (let i = 0; i < 6; i++) { const [x, y] = inside(); px(x, y, 3, 1, 'rgba(255,255,255,0.45)'); }
  } else if (kind === 'r') {
    // Shallows: ripples of light over the reef, and coral showing through.
    for (let i = 0; i < 7; i++) { const [x, y] = inside(); px(x, y, 5 + rnd() * 6, 1, 'rgba(255,255,255,0.22)'); }
    for (let i = 0; i < 5; i++) { const [x, y] = inside(); px(x, y, 2, 2, rnd() < 0.5 ? '#c86a70' : '#d8a060'); px(x + 1, y - 1, 1, 1, '#e8c0a0'); }
    for (let i = 0; i < 6; i++) { const [x, y] = inside(); px(x, y, 1, 1, 'rgba(0,30,60,0.25)'); }
  } else if (kind === 'w') {
    for (let i = 0; i < 8; i++) { const [x, y] = inside(); px(x, y, 4 + rnd() * 6, 1, 'rgba(255,255,255,0.10)'); }
    for (let i = 0; i < 6; i++) { const [x, y] = inside(); px(x, y, 3, 1, 'rgba(0,0,40,0.14)'); }
  }
  // Keep only the diamond.
  c.globalCompositeOperation = 'destination-in';
  c.beginPath(); c.moveTo(32, 0); c.lineTo(64, 16); c.lineTo(32, 32); c.lineTo(0, 16); c.closePath(); c.fill();
  c.globalCompositeOperation = 'source-over';
  tileTexCache.set(key, cv);
  return cv;
}

function tileVariant(x, y) {
  // Two coordinates in, one of a few variants out, with no visible rows.
  let h = (x * 73856093) ^ (y * 19349663); h = (h ^ (h >>> 13)) >>> 0;
  return h % TILE_VARIANTS;
}

/* A tree is three rounded clumps of canopy over a trunk, each clump lit from
   the upper left, with a little variation in size and lean so a wood is not
   a row of the same tree. Drawn into a canvas once per variant. */
const treeCache = new Map();
function treeSprite(variant) {
  let cv = treeCache.get(variant);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = 48; cv.height = 64;
  const c = cv.getContext('2d');
  const rnd = seeded(101 + variant * 13);
  const lean = (rnd() - 0.5) * 6, size = 0.9 + rnd() * 0.25;
  const bx = 24, by = 60;
  // Trunk, with its shaded side.
  c.fillStyle = '#5a3a20'; c.fillRect(bx - 3, by - 26, 6, 26);
  c.fillStyle = '#3f2814'; c.fillRect(bx + 1, by - 26, 2, 26);
  c.fillStyle = '#6e4a2a'; c.fillRect(bx - 3, by - 26, 1, 26);
  const clump = (x, y, r) => {
    c.fillStyle = '#245a22'; c.beginPath(); c.ellipse(x + 1, y + 2, r, r * 0.85, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2f6b2a'; c.beginPath(); c.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3d8a36'; c.beginPath(); c.ellipse(x - r * 0.25, y - r * 0.3, r * 0.62, r * 0.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5aa84a'; c.beginPath(); c.ellipse(x - r * 0.4, y - r * 0.45, r * 0.28, r * 0.22, 0, 0, Math.PI * 2); c.fill();
  };
  clump(bx + lean * 0.3 + 7, by - 30, 10 * size);
  clump(bx + lean * 0.3 - 7, by - 32, 10 * size);
  clump(bx + lean, by - 42, 12 * size);
  treeCache.set(variant, cv);
  return cv;
}

/* Every field has a mood: the sky behind it, the light on it, what drifts
   through the air, and which theme plays. A marsh at dusk and a cathedral
   at night should not feel like the same green board under different
   names. `sky` is the gradient top and bottom, `stars` whether there are
   any, `tint` a wash laid over the whole scene, `air` what the particles
   are, `music` the track. */
const MOODS = {
  day:   { sky: ['#1a1c2c', '#0d0e18'], stars: true,  tint: null,                  air: null,        music: 'battle' },
  dusk:  { sky: ['#4a2a3a', '#1a1020'], stars: false, tint: 'rgba(255,150,60,0.16)', air: 'motes',    music: 'battle' },
  mist:  { sky: ['#2a3340', '#141a22'], stars: false, tint: 'rgba(140,170,190,0.18)', air: 'mist',   music: 'dread' },
  marsh: { sky: ['#1b2a24', '#0b1210'], stars: true,  tint: 'rgba(60,120,80,0.18)',  air: 'fireflies', music: 'dread' },
  rain:  { sky: ['#232a38', '#0f121a'], stars: false, tint: 'rgba(70,90,130,0.20)',  air: 'rain',     music: 'dread' },
  ember: { sky: ['#3a1a14', '#140a08'], stars: false, tint: 'rgba(255,80,30,0.18)',  air: 'embers',   music: 'battle' },
  night: { sky: ['#0c0f22', '#05060e'], stars: true,  tint: 'rgba(30,40,110,0.24)',  air: 'fireflies', music: 'finale' },
  snow:  { sky: ['#3a4660', '#8a98ac'], stars: false, tint: 'rgba(200,220,255,0.10)', air: 'snow',     music: 'frost' },
  aurora:{ sky: ['#05101c', '#12303c'], stars: true,  tint: 'rgba(60,200,180,0.08)',  air: 'snow',     music: 'finale', aurora: true },
  // The sea: salt haze over a green-grey sky, a storm on the reef, and the
  // drowned light of the sea floor at low tide.
  tide:  { sky: ['#1d3d4a', '#0b1a22'], stars: false, tint: 'rgba(80,160,170,0.14)', air: 'mist',     music: 'tide' },
  storm: { sky: ['#1a2230', '#080a10'], stars: false, tint: 'rgba(60,80,120,0.22)',  air: 'rain',     music: 'tide' },
  abyss: { sky: ['#03101a', '#0a2a30'], stars: true,  tint: 'rgba(20,120,140,0.16)', air: 'motes',    music: 'deep' },
  // The capital: a gold morning over white stone, and the lamplit hush of the
  // throne room.
  dawn:  { sky: ['#5a3a3a', '#d8a060'], stars: false, tint: 'rgba(255,200,120,0.14)', air: 'motes',    music: 'crown' },
  court: { sky: ['#1a1030', '#3a2a50'], stars: false, tint: 'rgba(220,180,80,0.12)',  air: null,       music: 'crown' },
};

/* The sky: a gradient, a scatter of stars that keeps its place when the
   camera moves, and a vignette that draws the eye inward. Rebuilt only when
   the canvas changes size or the mood does. */
let skyCache = null;
function skyLayer(W, H, mood) {
  const m = MOODS[mood] || MOODS.day;
  if (skyCache && skyCache.width === W && skyCache.height === H && skyCache.mood === mood) return skyCache;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.mood = mood;
  const c = cv.getContext('2d');
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, m.sky[0]); bg.addColorStop(1, m.sky[1]);
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  if (m.stars) {
    const rnd = seeded(7);
    const n = Math.round((W * H) / 9000);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H * 0.7, a = 0.25 + rnd() * 0.55, s = rnd() < 0.15 ? 2 : 1;
      c.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`; c.fillRect(Math.round(x), Math.round(y), s, s);
    }
  }
  if (m.aurora) {
    // Curtains of light, drawn once: three soft bands folding across the top of the sky.
    const rnd = seeded(11);
    for (let b = 0; b < 3; b++) {
      const y0 = H * (0.08 + b * 0.09), amp = 18 + rnd() * 14, hue = b === 1 ? '120,255,190' : b === 2 ? '150,120,255' : '80,220,200';
      const grad = c.createLinearGradient(0, y0 - 40, 0, y0 + 60);
      grad.addColorStop(0, `rgba(${hue},0)`); grad.addColorStop(0.45, `rgba(${hue},0.22)`); grad.addColorStop(1, `rgba(${hue},0)`);
      c.fillStyle = grad;
      c.beginPath(); c.moveTo(0, y0 - 40);
      for (let x = 0; x <= W; x += 12) c.lineTo(x, y0 - 40 + Math.sin(x / 90 + b * 2) * amp);
      c.lineTo(W, y0 + 60); c.lineTo(0, y0 + 60); c.closePath(); c.fill();
    }
  }
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  skyCache = cv;
  return cv;
}

/* What drifts through the air, in screen space over the whole scene. Each
   particle's path is a function of its index and the clock, so there is no
   state to keep and nothing to reset between battles. With reduced motion
   the clock is held, so the weather is still there but still. */
// One soft blob, drawn once; a gradient per bank of mist per frame was the
// most expensive thing on the screen.
let mistCache = null;
function mistBlob() {
  if (mistCache) return mistCache;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(200,220,230,0.15)'); g.addColorStop(1, 'rgba(200,220,230,0)');
  c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  mistCache = cv;
  return cv;
}

function drawAir(c, W, H, kind, time) {
  const t = reducedMotion() ? 0 : time / 1000;
  const n = kind === 'mist' ? 5 : kind === 'rain' ? 90 : kind === 'snow' ? 70 : 34;
  const rnd = seeded(kind.length * 977);
  for (let i = 0; i < n; i++) {
    const ax = rnd(), ay = rnd(), sp = 0.4 + rnd() * 0.8, ph = rnd() * 6.28;
    if (kind === 'mist') {
      const x = ((ax + t * 0.012 * sp) % 1) * (W + 400) - 200, y = ay * H, r = 130 + sp * 70;
      c.drawImage(mistBlob(), x - r, y - r * 0.6, r * 2, r * 1.2);
    } else if (kind === 'rain') {
      const x = ((ax + t * 0.05 * sp) % 1) * W, y = ((ay + t * 0.9 * sp) % 1) * H;
      c.strokeStyle = 'rgba(190,210,240,0.28)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 14); c.stroke();
    } else if (kind === 'snow') {
      // Flakes fall slowly and drift, each on its own wander.
      const x = ((ax + Math.sin(t * 0.5 * sp + ph) * 0.02 + t * 0.008 * sp) % 1) * W, y = ((ay + t * 0.06 * sp) % 1) * H;
      c.fillStyle = `rgba(240,246,255,${(0.45 + 0.35 * sp).toFixed(2)})`; c.fillRect(x, y, sp > 0.9 ? 2 : 1.5, sp > 0.9 ? 2 : 1.5);
    } else if (kind === 'embers') {
      const x = ((ax + Math.sin(t * sp + ph) * 0.01) % 1) * W, y = ((ay - t * 0.03 * sp) % 1 + 1) % 1 * H;
      const a = 0.35 + 0.35 * Math.sin(t * 3 * sp + ph);
      c.fillStyle = `rgba(255,${120 + Math.round(60 * sp)},40,${a.toFixed(2)})`; c.fillRect(x, y, 2, 2);
    } else if (kind === 'fireflies') {
      const x = ((ax + Math.sin(t * 0.3 * sp + ph) * 0.02) % 1) * W, y = ((ay + Math.cos(t * 0.25 * sp + ph) * 0.02) % 1) * H;
      const a = Math.max(0, Math.sin(t * 1.3 * sp + ph)) * 0.8;
      if (a > 0.05) { c.fillStyle = `rgba(200,255,120,${a.toFixed(2)})`; c.fillRect(x, y, 2, 2); }
    } else {
      // Motes in low light: slow, faint, always there.
      const x = ((ax + t * 0.006 * sp) % 1) * W, y = ((ay + Math.sin(t * 0.4 * sp + ph) * 0.01) % 1) * H;
      c.fillStyle = 'rgba(255,220,170,0.22)'; c.fillRect(x, y, 1, 1);
    }
  }
}

function tween(ms, fn) {
  return new Promise(res => {
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / (ms / PACE.scale));
      fn(k);
      if (k < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}
const lerp = (a, b, k) => a + (b - a) * k;

class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0 };
    this.battle = null;
    this.hl = { move: new Set(), path: new Set(), target: new Set(), area: new Set(), threat: new Set(), cursor: null };
    this.mood = 'day';   // which MOODS entry dresses the field; set per map
    this.floats = [];
    this.bursts = [];
    this.fx = [];
    this.shake = null;
    // How many camera moves are in flight. A tile's screen position is only
    // stable at zero, which matters to anything translating a tap. The
    // generation rises with each battle, so a pan cannot keep dragging the
    // view around after the board under it has been replaced.
    this.camAnim = 0;
    this.camGen = 0;
    /* Which way round the board is, in quarter turns. It is a float rather
       than one of four states so that a turn can be watched happening: every
       value in between is a real orientation the projection can draw. */
    this.rot = 0;
    this.running = false;
    this.time = 0;
  }

  setBattle(b) {
    this.battle = b;
    this.floats = []; this.bursts = []; this.fx = []; this.shake = null;
    // Party units outlive a battle, and so did the animation state hung on
    // them: a unit interrupted mid-move kept its interpolated position and
    // was drawn at the wrong tile, at the wrong depth, in the next fight.
    for (const u of b.units) {
      u.anim = null; u.hitAt = null; u.recoil = null; u._fromAngle = undefined;
      if (u.breathPhase === undefined) u.breathPhase = (lookSeed(u.id || u.name) % 628) / 100;
    }
    this.camGen++;
    this.clearHighlights();
    this.centerCamera();
  }

  clearHighlights() { this.hl.move.clear(); this.hl.path.clear(); this.hl.target.clear(); this.hl.area.clear(); this.hl.threat.clear(); this.hl.cursor = null; }

  // The part of the canvas the panels are not sitting on. The board is framed
  // inside this rather than the whole screen, so on a phone it lands in the
  // free band between the turn strip and the command panel.
  viewCentre() {
    const i = this.insets || { top: 0, bottom: 0, left: 0, right: 0 };
    const w = this.W || this.cv.width, h = this.H || this.cv.height;
    const left = Math.min(i.left, w * 0.4), right = Math.min(i.right, w * 0.4);
    const top = Math.min(i.top, h * 0.4), bottom = Math.min(i.bottom, h * 0.5);
    return {
      cx: left + (w - left - right) / 2,
      cy: top + (h - top - bottom) / 2,
      w: Math.max(120, w - left - right),
      h: Math.max(120, h - top - bottom),
    };
  }

  centerCamera() {
    // Centre the on-screen bounding box of the map (tops and walls included).
    const g = this.battle.grid;
    this.cam.x = 0; this.cam.y = 0;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const row of g.tiles) for (const t of row) {
      if (t.t === 'x') continue;
      const { sx, sy } = this.toScreen(t.x, t.y, t.h);
      minX = Math.min(minX, sx - 32); maxX = Math.max(maxX, sx + 32);
      minY = Math.min(minY, sy - 16 - 40); maxY = Math.max(maxY, sy + 16 + t.h * HZ);
    }
    const view = this.viewCentre();
    this.cam.x = -(minX + maxX) / 2 + view.cx;
    this.cam.y = -(minY + maxY) / 2 + view.cy;
    // Frame the board, but never shrink it past the point where a unit is too
    // small to read or tap. On a narrow screen the board is allowed to run off
    // the edges and the player pans instead.
    const fitX = (view.w * 0.96) / Math.max(1, maxX - minX);
    const fitY = (view.h * 0.92) / Math.max(1, maxY - minY);
    const floor = Math.min(this.W || this.cv.width, this.H || this.cv.height) < 520 ? 0.9 : 0.55;
    this.zoom = Math.max(floor, Math.min(1.35, Math.min(fitX, fitY)));
  }

  // Pan so a set of tiles sits in the free part of the view. Used when the game
  // offers the player a choice: on a phone the board is often larger than the
  // screen, and an option that cannot be seen cannot be tapped.
  frameTiles(tiles, ms = 220) {
    if (!this.battle || !tiles || !tiles.length) return Promise.resolve();
    const g = this.battle.grid;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const t of tiles) {
      const { sx, sy } = this.toScreen(t.x, t.y, g.height(t.x, t.y));
      minX = Math.min(minX, sx - 32); maxX = Math.max(maxX, sx + 32);
      minY = Math.min(minY, sy - 40); maxY = Math.max(maxY, sy + 20);
    }
    const view = this.viewCentre(), z = this.zoom || 1;
    const halfW = view.w / (2 * z), halfH = view.h / (2 * z);
    const left = view.cx - halfW, right = view.cx + halfW;
    const top = view.cy - halfH, bottom = view.cy + halfH;
    // Nudge by the least that brings the set inside, rather than centring on
    // it: yanking the board across the screen every time a menu opens is more
    // disorienting than the scroll it saves. A set too big to fit is centred.
    let dx = 0, dy = 0;
    if (maxX - minX > right - left) dx = view.cx - (minX + maxX) / 2;
    else if (minX < left) dx = left - minX;
    else if (maxX > right) dx = right - maxX;
    if (maxY - minY > bottom - top) dy = view.cy - (minY + maxY) / 2;
    else if (minY < top) dy = top - minY;
    else if (maxY > bottom) dy = bottom - maxY;
    if (!dx && !dy) return Promise.resolve();
    return this.panTo(this.cam.x + dx, this.cam.y + dy, ms);
  }

  /* Move the camera, animating it unless there is a reason not to: a zoom is
     a direct manipulation and should keep up with the fingers rather than
     chase them, and someone who has asked their system for less motion should
     not have the whole board slide under them on every turn. */
  panTo(tx, ty, ms) {
    const jump = () => { this.cam.x = tx; this.cam.y = ty; this.clampCamera(); return Promise.resolve(); };
    if (!ms || reducedMotion()) return jump();
    const fx = this.cam.x, fy = this.cam.y, gen = this.camGen;
    this.camAnim++;
    return tween(ms, k => {
      if (gen !== this.camGen) return;
      this.cam.x = lerp(fx, tx, k);
      this.cam.y = lerp(fy, ty, k);
    }).then(() => {
      // Never below zero: anything waiting for the camera to settle waits on
      // this reaching it, and a negative count would never get there.
      this.camAnim = Math.max(0, this.camAnim - 1);
      if (gen === this.camGen) this.clampCamera();
    });
  }

  // Keep a point of interest on screen when the board is larger than the view.
  clampCamera() {
    if (!this.battle) return;
    const g = this.battle.grid, z = this.zoom || 1;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const row of g.tiles) for (const t of row) {
      if (t.t === 'x') continue;
      const { sx, sy } = this.toScreen(t.x, t.y, t.h);
      minX = Math.min(minX, sx - 32); maxX = Math.max(maxX, sx + 32);
      minY = Math.min(minY, sy - 56); maxY = Math.max(maxY, sy + 16 + t.h * HZ);
    }
    // Keep a slice of the board inside the view. These are world coordinates,
    // so the visible span is the canvas divided by the zoom, centred on the
    // canvas middle; a quarter of it is the margin the board may not leave.
    const view = this.viewCentre();
    const halfW = (this.W || this.cv.width) / (2 * z), halfH = (this.H || this.cv.height) / (2 * z);
    const keepX = halfW * 0.5, keepY = halfH * 0.5;
    const left = view.cx - halfW, right = view.cx + halfW;
    const top = view.cy - halfH, bottom = view.cy + halfH;
    if (minX > right - keepX) this.cam.x -= minX - (right - keepX);
    if (maxX < left + keepX) this.cam.x += (left + keepX) - maxX;
    if (minY > bottom - keepY) this.cam.y -= minY - (bottom - keepY);
    if (maxY < top + keepY) this.cam.y += (top + keepY) - maxY;
  }

  // World (unzoomed canvas) coordinates of a tile centre.
  /* Turn a grid position by the current rotation, about the middle of the
     board. At a whole number of quarter turns this lands exactly on another
     grid square; in between it is the same rotation part-way through, which
     is what makes the turn watchable. */
  gridRot(x, y) {
    const g = this.battle && this.battle.grid;
    if (!g || !this.rot) return { x, y };
    const a = this.rot * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    const cx = (g.w - 1) / 2, cy = (g.h - 1) / 2;
    const dx = x - cx, dy = y - cy;
    return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
  }

  // How near the viewer a square is, which is what everything is drawn by.
  depthOf(x, y) { const r = this.gridRot(x, y); return r.x + r.y; }

  toScreen(x, y, h) {
    const r = this.gridRot(x, y);
    return {
      sx: (this.W || this.cv.width) / 2 + this.cam.x + (r.x - r.y) * TILE_W / 2,
      sy: (this.H || this.cv.height) / 2 + this.cam.y + (r.x + r.y) * TILE_H / 2 - h * HZ,
    };
  }

  /* Turn the board a quarter turn and watch it go. The camera holds onto
     whatever it was looking at, so the board turns under the eye rather than
     sliding out from under it. */
  rotate(dir) {
    if (this.rotating || !this.battle) return Promise.resolve();
    const from = this.rot, to = from + dir;
    // The turn is about the middle of the board, so the middle of the board
    // does not move: the camera needs no help to hold onto what it was
    // looking at, and anchoring it on anything else drags the view off.
    this.rotating = true;
    const done = () => { this.rot = ((to % 4) + 4) % 4; this.clampCamera(); this.rotating = false; };
    if (reducedMotion()) { done(); return Promise.resolve(); }
    return tween(280, k => { this.rot = lerp(from, to, easeInOut(k)); }).then(done);
  }

  // Convert a canvas pixel position to world coordinates (undo the zoom).
  toWorld(mx, my) {
    const z = this.zoom || 1, W = this.W || this.cv.width, H = this.H || this.cv.height;
    return { x: (mx - W / 2) / z + W / 2, y: (my - H / 2) / z + H / 2 };
  }

  /* Zooming in magnifies the board around the middle of the view, which can
     carry a legal destination out under one of the panels, where nobody can
     tap it. So whenever the zoom changes while options are on offer, nudge
     them back into the free part of the view -- the same nudge that put them
     there when the menu opened. */
  setZoom(z) {
    this.zoom = Math.max(0.6, Math.min(2.5, z));
    this.clampCamera();
    const keys = this.hl.move.size ? this.hl.move : this.hl.target;
    if (!keys.size || !this.battle) return;
    const g = this.battle.grid, tiles = [];
    for (const k of keys) {
      const [x, y] = k.split(',').map(Number);
      const t = g.tile(x, y);
      if (t) tiles.push(t);
    }
    this.frameTiles(tiles, 0);
  }

  unitScreenPos(u) {
    const p = u.anim || { x: u.x, y: u.y, h: this.battle.grid.height(u.x, u.y), z: 0 };
    const s = this.toScreen(p.x, p.y, p.h);
    let z = p.z || 0;
    if (u.airborne && !u.anim) z = 150 + Math.sin(this.time / 200) * 6;
    // A held breath. Everyone off their own phase, so a line of soldiers does
    // not rise and fall as one animal.
    else if (u.alive && !u.anim && !reducedMotion()) {
      z += Math.sin(this.time / 640 + (u.breathPhase || 0)) * 0.9 + 0.9;
    }
    return { sx: s.sx, sy: s.sy - z };
  }

  // Pan the camera so a grid position sits near the centre.
  async focus(u, ms = 300) {
    const g = this.battle.grid;
    const off = this.viewCentre();
    const tx = -(u.x - u.y) * TILE_W / 2 + (off.cx - (this.W || this.cv.width) / 2);
    const ty = -(u.x + u.y) * TILE_H / 2 + g.height(u.x, u.y) * HZ + (off.cy - (this.H || this.cv.height) / 2);
    // Only pan when the unit would otherwise sit outside the comfortable centre zone.
    const z = this.zoom || 1;
    const view = this.viewCentre();
    const cur = this.toScreen(u.x, u.y, g.height(u.x, u.y));
    const dx = (cur.sx - view.cx) * z, dy = (cur.sy - view.cy) * z;
    if (Math.abs(dx) < view.w * 0.3 && Math.abs(dy) < view.h * 0.3) return;
    await this.panTo(tx, ty, ms);
  }

  // ---- picking -----------------------------------------------------------------
  pointInPoly(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  // The ground under the pointer, ignoring any figure standing in front of it.
  pickGround(px, py) {
    if (!this.battle) return null;
    const { x: mx, y: my } = this.toWorld(px, py);
    const g = this.battle.grid;
    const order = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.tiles[y][x].t !== 'x') order.push(g.tiles[y][x]);
    order.sort((a, b) => this.depthOf(b.x, b.y) - this.depthOf(a.x, a.y) || b.h - a.h);
    for (const t of order) {
      const { sx, sy } = this.toScreen(t.x, t.y, t.h);
      const top = [[sx, sy - 16], [sx + 32, sy], [sx, sy + 16], [sx - 32, sy]];
      if (this.pointInPoly(mx, my, top)) return t;
      const wh = t.h * HZ;
      const lw = [[sx - 32, sy], [sx, sy + 16], [sx, sy + 16 + wh], [sx - 32, sy + wh]];
      const rw = [[sx + 32, sy], [sx, sy + 16], [sx, sy + 16 + wh], [sx + 32, sy + wh]];
      if (this.pointInPoly(mx, my, lw) || this.pointInPoly(mx, my, rw)) return t;
    }
    return null;
  }

  pickTile(px, py) {
    if (!this.battle) return null;
    const { x: mx, y: my } = this.toWorld(px, py);
    const g = this.battle.grid;
    // A figure standing in front of a tile answers for it, since that is what
    // the player is looking at.
    let onUnit = null;
    const units = this.battle.units.filter(u => u.alive && !u.airborne && u.x >= 0).sort((a, b) => this.depthOf(b.x, b.y) - this.depthOf(a.x, a.y));
    for (const u of units) {
      const { sx, sy } = this.unitScreenPos(u);
      if (mx >= sx - 13 && mx <= sx + 13 && my >= sy - 32 && my <= sy + 8) { onUnit = g.tile(u.x, u.y); break; }
    }
    const onGround = this.pickGround(px, py);
    /* While the game is offering a choice, whichever of the two is on offer
       wins. A figure is drawn a good half-tile taller than the square it
       stands on, so it covers the tiles behind it; without this, a legal
       destination standing behind an ally simply cannot be tapped. */
    if (this.hl.move.size || this.hl.target.size) {
      const offered = (t) => !!t && (this.hl.move.has(`${t.x},${t.y}`) || this.hl.target.has(`${t.x},${t.y}`));
      if (offered(onUnit)) return onUnit;
      if (offered(onGround)) return onGround;
    }
    return onUnit || onGround;
  }

  // ---- drawing ------------------------------------------------------------------
  // Match the canvas backing store to its on-screen size so pixels stay square.
  fit() {
    // The board is laid out in CSS pixels (this.W by this.H) and drawn on a
    // backing store scaled by the device pixel ratio, so text, bars and effect
    // strokes are as sharp as the page around them on a phone.
    const w = Math.max(320, Math.floor(this.cv.clientWidth)), h = Math.max(240, Math.floor(this.cv.clientHeight));
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    if (this.W === w && this.H === h && this.dpr === dpr) return;
    const wasW = this.W, wasH = this.H;
    this.W = w; this.H = h; this.dpr = dpr;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    if (!this.battle) return;
    // A browser's address bar sliding away resizes the canvas by a little. That
    // should not throw away where the player had panned to; only a real change
    // of shape, such as turning the phone, is worth re-framing for.
    const small = wasW && wasH &&
      Math.abs(w - wasW) < wasW * 0.15 && Math.abs(h - wasH) < wasH * 0.25;
    if (small) {
      this.cam.x += (w - wasW) / 2;
      this.cam.y += (h - wasH) / 2;
      this.clampCamera();
    } else {
      this.centerCamera();
    }
  }

  start() {
    if (this.running) return; // one loop, however many times a battle is started
    this.running = true;
    this.fit();
    if (!this._resize) { this._resize = () => { if (this.running) this.fit(); }; window.addEventListener('resize', this._resize); }
    const loop = (t) => { if (!this.running) return; this.time = t; this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    // Clear the last frame's leftovers. The finished battle itself stays until
    // the next one replaces it: an animation still in flight when a battle is
    // abandoned may yet ask it for a tile.
    this.fx = []; this.floats = []; this.bursts = []; this.shake = null;
  }

  diamond(sx, sy) {
    const c = this.ctx;
    c.beginPath(); c.moveTo(sx, sy - 16); c.lineTo(sx + 32, sy); c.lineTo(sx, sy + 16); c.lineTo(sx - 32, sy); c.closePath();
  }

  // The ring itself: an ellipse laid on the ground, optionally with teeth.
  ringPath(sx, sy, rx, ry, teeth) {
    const c = this.ctx;
    c.beginPath();
    if (!teeth) { c.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2); c.closePath(); return; }
    const steps = teeth * 2;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const k = i % 2 ? 0.66 : 1;
      const x = sx + Math.cos(a) * rx * k, y = sy + Math.sin(a) * ry * k;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath();
  }

  /* The base under one figure. The dark stroke goes down first and wider, so
     the ring reads on pale stone as well as on grass, and a bright wedge on
     the rim doubles as the facing marker the dot used to be. */
  drawBase(sx, sy, team, seen, alpha) {
    const c = this.ctx;
    const st = BASE_RING[team] || BASE_RING.neutral;
    c.save();
    c.globalAlpha = alpha;
    this.ringPath(sx, sy, 15, 7, st.teeth);
    c.fillStyle = st.fill; c.fill();
    c.lineJoin = 'round';
    c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = 3.5; c.stroke();
    c.strokeStyle = st.line; c.lineWidth = 1.8; c.stroke();
    if (seen) {
      // A wedge on the rim, pointing the way the figure is looking.
      const a = { E: 0.25, S: 0.75, W: 1.25, N: 1.75 }[seen] * Math.PI;
      const px = sx + Math.cos(a) * 15, py = sy + Math.sin(a) * 7;
      c.beginPath(); c.ellipse(px, py, 4.5, 3.5, 0, 0, Math.PI * 2);
      c.fillStyle = st.line; c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 1.4; c.stroke();
    }
    c.restore();
  }

  draw() {
    const c = this.ctx, W = this.W || this.cv.width, H = this.H || this.cv.height;
    const mood = MOODS[this.mood] || MOODS.day;
    c.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    c.drawImage(skyLayer(W, H, this.mood), 0, 0);
    if (!this.battle) return;
    const z = this.zoom || 1;
    c.save();
    // A blow that lands hard shoves the whole view, briefly.
    if (this.shake) {
      const k = (this.time - this.shake.t0) / this.shake.dur;
      if (k >= 1) this.shake = null;
      else {
        const m = this.shake.mag * (1 - k);
        c.translate(Math.sin(k * 46) * m, Math.cos(k * 39) * m * 0.6);
      }
    }
    c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
    c.imageSmoothingEnabled = false;
    const g = this.battle.grid;
    const items = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const t = g.tiles[y][x];
      if (t.t === 'x') continue;
      items.push({ d: this.depthOf(x, y), kind: 'tile', t });
    }
    for (const u of this.battle.units) {
      if (u.x < 0) continue; // in reserve, not on the field
      const p = u.anim || { x: u.x, y: u.y };
      items.push({ d: this.depthOf(p.x, p.y) + 0.5 + (u.alive ? 0 : -0.2), kind: 'unit', u });
    }
    for (const k of this.battle.crystals || []) items.push({ d: this.depthOf(k.x, k.y) + 0.3, kind: 'crystal', k });
    // Ground effects sit under the figures standing in them; everything else
    // is the flourish and belongs on top of its own tile's depth.
    this.fx = this.fx.filter(f => this.time - f.t0 < f.dur);
    for (const f of this.fx) {
      if (f.ground) items.push({ d: this.depthOf(f.x, f.y) - 0.5, kind: 'fx', f });
      else items.push({ d: (f.d !== undefined ? f.d : this.depthOf(f.x, f.y)) + 0.9, kind: 'fx', f });
    }
    items.sort((a, b) => a.d - b.d);
    for (const it of items) {
      if (it.kind === 'tile') this.drawTile(it.t);
      else if (it.kind === 'unit') this.drawUnit(it.u);
      else if (it.kind === 'crystal') this.drawCrystal(it.k);
      else this.drawFx(it.f);
    }
    this.drawCharges();
    this.drawBursts();
    this.drawFloats();
    c.restore();
    // The mood's light and weather lie over everything, in screen space.
    if (mood.tint) { c.fillStyle = mood.tint; c.fillRect(0, 0, W, H); }
    if (mood.air) drawAir(c, W, H, mood.air, this.time);
  }

  drawTile(t) {
    const c = this.ctx;
    const { sx, sy } = this.toScreen(t.x, t.y, t.h);
    const col = TERRAIN[t.t] || TERRAIN.g;
    const wh = t.h * HZ;
    // Walls
    if (wh > 0) {
      c.fillStyle = col.l;
      c.beginPath(); c.moveTo(sx - 32, sy); c.lineTo(sx, sy + 16); c.lineTo(sx, sy + 16 + wh); c.lineTo(sx - 32, sy + wh); c.closePath(); c.fill();
      c.fillStyle = col.r;
      c.beginPath(); c.moveTo(sx + 32, sy); c.lineTo(sx, sy + 16); c.lineTo(sx, sy + 16 + wh); c.lineTo(sx + 32, sy + wh); c.closePath(); c.fill();
      if (col.lip) {
        const lip = Math.min(5, wh);
        c.fillStyle = col.lip;
        c.beginPath(); c.moveTo(sx - 32, sy); c.lineTo(sx, sy + 16); c.lineTo(sx, sy + 16 + lip); c.lineTo(sx - 32, sy + lip); c.closePath(); c.fill();
        c.fillStyle = shiftHex(col.lip, -16);
        c.beginPath(); c.moveTo(sx + 32, sy); c.lineTo(sx, sy + 16); c.lineTo(sx, sy + 16 + lip); c.lineTo(sx + 32, sy + lip); c.closePath(); c.fill();
      }
      // Strata lines
      c.strokeStyle = 'rgba(0,0,0,0.18)';
      for (let k = 1; k < t.h; k++) {
        c.beginPath(); c.moveTo(sx - 32, sy + k * HZ); c.lineTo(sx, sy + 16 + k * HZ); c.lineTo(sx + 32, sy + k * HZ); c.stroke();
      }
    }
    // Top
    c.drawImage(tileTexture(t.t, tileVariant(t.x, t.y)), sx - 32, sy - 16);
    this.diamond(sx, sy);
    // Subtle height tint
    c.fillStyle = `rgba(255,255,230,${Math.min(0.25, t.h * 0.035)})`; c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; c.stroke();
    if (t.t === 'w') {
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      const ph = Math.sin(this.time / 500 + t.x + t.y) * 3;
      c.beginPath(); c.moveTo(sx - 14, sy + ph); c.lineTo(sx - 4, sy - 3 + ph); c.lineTo(sx + 6, sy + ph); c.lineTo(sx + 14, sy - 2 + ph); c.stroke();
    }
    // Highlights
    const key = `${t.x},${t.y}`;
    if (this.hl.move.has(key)) { this.diamond(sx, sy); c.fillStyle = 'rgba(70,130,255,0.45)'; c.fill(); }
    if (this.hl.path.has(key)) { this.diamond(sx, sy); c.fillStyle = 'rgba(150,200,255,0.55)'; c.fill(); c.strokeStyle = 'rgba(230,245,255,0.9)'; c.lineWidth = 1.5; c.stroke(); c.lineWidth = 1; }
    if (this.hl.target.has(key)) { this.diamond(sx, sy); c.fillStyle = 'rgba(255,80,60,0.42)'; c.fill(); }
    if (this.hl.area.has(key)) { this.diamond(sx, sy); c.fillStyle = 'rgba(255,220,60,0.55)'; c.fill(); }
    if (this.hl.threat.has(key)) {
      // Where an enemy could strike next turn: a violet wash with a hatched
      // edge, so it never reads as one of your own move or target offers.
      const pulse = 0.36 + 0.08 * Math.sin(this.time / 300);
      this.diamond(sx, sy); c.fillStyle = `rgba(200,50,230,${pulse})`; c.fill();
      c.strokeStyle = 'rgba(255,150,255,0.7)'; c.setLineDash([4, 3]); c.lineWidth = 1.5; c.stroke(); c.setLineDash([]); c.lineWidth = 1;
    }
    if (this.battle.active && this.battle.active.alive && this.battle.active.x === t.x && this.battle.active.y === t.y && !this.battle.active.anim) {
      const a = 0.5 + 0.4 * Math.sin(this.time / 180);
      this.diamond(sx, sy); c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
    }
    if (this.hl.cursor && this.hl.cursor.x === t.x && this.hl.cursor.y === t.y) {
      this.diamond(sx, sy); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
    }
    if (this.battle.showDeploy && this.battle.deployKeys && this.battle.deployKeys.has(key)) {
      const taken = !!this.battle.occupantAt(t.x, t.y);
      const pulse = 0.30 + 0.10 * Math.sin(this.time / 350 + (t.x + t.y) * 0.5);
      this.diamond(sx, sy);
      c.fillStyle = taken ? 'rgba(40,180,90,0.22)' : `rgba(60,240,140,${pulse})`;
      c.fill();
      c.strokeStyle = taken ? 'rgba(120,255,170,0.55)' : 'rgba(190,255,215,0.95)';
      c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
      // A caret on free tiles reads as "you may stand here".
      if (!taken) {
        c.fillStyle = 'rgba(225,255,235,0.9)';
        c.beginPath();
        c.moveTo(sx, sy - 7); c.lineTo(sx + 6, sy + 1); c.lineTo(sx + 2, sy + 1);
        c.lineTo(sx + 2, sy + 6); c.lineTo(sx - 2, sy + 6); c.lineTo(sx - 2, sy + 1);
        c.lineTo(sx - 6, sy + 1); c.closePath(); c.fill();
      }
    }
    // Tree
    if (t.t === 't') {
      c.fillStyle = 'rgba(0,0,0,0.30)';
      c.beginPath(); c.ellipse(sx, sy + 3, 14, 6, 0, 0, Math.PI * 2); c.fill();
      c.drawImage(treeSprite(tileVariant(t.x, t.y)), sx - 24, sy - 58);
    }
  }

  // A crystal where someone fell: a pale gem hanging a little off the ground,
  // turning slowly, with a glow on the tile beneath it.
  drawCrystal(k) {
    const c = this.ctx, g = this.battle.grid;
    const { sx, sy } = this.toScreen(k.x, k.y, g.height(k.x, k.y));
    const t = this.time / 1000;
    const bob = Math.sin(t * 2.2 + k.x) * 2;
    const w = 5 + 2 * Math.abs(Math.cos(t * 1.3 + k.y)); // turning: the gem narrows and widens
    const glow = 0.25 + 0.12 * Math.sin(t * 3 + k.x + k.y);
    this.diamond(sx, sy); c.fillStyle = `rgba(140,230,255,${glow})`; c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath(); c.ellipse(sx, sy + 3, 6, 3, 0, 0, Math.PI * 2); c.fill();
    const cy = sy - 12 + bob;
    c.fillStyle = '#bff4ff';
    c.beginPath(); c.moveTo(sx, cy - 11); c.lineTo(sx + w, cy); c.lineTo(sx, cy + 11); c.lineTo(sx - w, cy); c.closePath(); c.fill();
    c.fillStyle = 'rgba(60,150,210,0.55)';
    c.beginPath(); c.moveTo(sx, cy - 11); c.lineTo(sx + w, cy); c.lineTo(sx, cy + 11); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.fillRect(sx - 1, cy - 7, 1.5, 4);
  }

  drawUnit(u) {
    const c = this.ctx;
    const { sx, sy } = this.unitScreenPos(u);
    const job = u.jobData;
    // Facing is a fact about the board; which side of the figure that puts
    // towards the viewer depends on where the viewer is standing.
    const seen = apparentFacing(u.facing, this.rot);
    const view = (seen === 'N' || seen === 'W') ? 'back' : 'front';
    const flip = (seen === 'S' || seen === 'W');
    const spr = getSprite(job, u.team, view, flip, spriteGear(u), spriteLook(u));
    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.35)';
    const groundY = u.airborne ? this.toScreen(u.x, u.y, this.battle.grid.height(u.x, u.y)).sy : sy;
    c.beginPath(); c.ellipse(sx, groundY + 6, 12, 5, 0, 0, Math.PI * 2); c.fill();
    // Team base. A downed figure keeps a faint one, so you can still see whose
    // body you are running to revive.
    this.drawBase(sx, groundY + 6, u.team, u.alive ? seen : null, u.alive ? 1 : 0.45);
    if (!u.alive) {
      c.save(); c.globalAlpha = 0.6; c.translate(sx, sy + 8); c.scale(1, 0.35); c.filter = 'grayscale(1)';
      c.drawImage(spr, SPRITE_DX, SPRITE_DY - 8); c.restore();
      if (u.koCount > 0) {
        c.font = 'bold 15px monospace'; c.textAlign = 'center';
        c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.85)';
        c.strokeText(`${u.koCount}`, sx, sy - 6);
        c.fillStyle = '#ff6a5a'; c.fillText(`${u.koCount}`, sx, sy - 6);
      }
      return;
    }
    let rx = 0, ry = 0;
    if (u.recoil) {
      const k = (this.time - u.recoil.t0) / u.recoil.dur;
      if (k >= 1) u.recoil = null;
      else {
        // Shoved back, then pulled home.
        const push = Math.sin(k * Math.PI) * u.recoil.mag;
        rx = Math.cos(u.recoil.a) * push; ry = Math.sin(u.recoil.a) * push * 0.6;
      }
    }
    c.drawImage(spr, sx + SPRITE_DX + rx, sy + SPRITE_DY + ry);
    // A struck figure flares white, so a blow reads even off-centre.
    if (u.hitAt) {
      const k = (this.time - u.hitAt) / 200;
      if (k >= 1) u.hitAt = null;
      else {
        c.save();
        c.globalAlpha = (1 - k) * 0.85;
        c.globalCompositeOperation = 'lighter';
        c.drawImage(spr, sx + SPRITE_DX + rx, sy + SPRITE_DY + ry);
        c.restore();
      }
    }
    // HP bar. The fill answers "how hurt", the frame answers "whose" — the
    // one part of a figure that stays visible when a wall or a neighbour eats
    // the rest of it.
    const w = 24, hpk = u.hp / u.maxHp;
    c.fillStyle = 'rgba(0,0,0,0.8)'; c.fillRect(sx - w / 2 - 3, sy - 38, w + 6, 8);
    c.fillStyle = TEAM_COLORS[u.team]; c.fillRect(sx - w / 2 - 2, sy - 37, w + 4, 6);
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(sx - w / 2, sy - 35, w, 2);
    c.fillStyle = hpk > 0.5 ? '#5ad35a' : hpk > 0.25 ? '#e8c840' : '#e85040';
    c.fillRect(sx - w / 2, sy - 35, Math.max(0, Math.round(w * hpk)), 2);
    // Status dots
    let i = 0;
    for (const s of Object.keys(u.statuses)) {
      c.fillStyle = STATUSES[s].color; c.fillRect(sx - w / 2 + i * 5, sy - 44, 4, 4); i++;
    }
    if (u.airborne) { c.fillStyle = '#fff'; c.font = '10px monospace'; c.textAlign = 'center'; c.fillText('JUMP', sx, sy - 47); }
    if (u.boss) { c.fillStyle = '#ffd040'; c.font = 'bold 10px monospace'; c.textAlign = 'center'; c.fillText('★', sx, sy - 47); }
  }

  drawBursts() {
    const c = this.ctx, now = this.time;
    this.bursts = this.bursts.filter(b => now - b.t0 < b.dur);
    for (const b of this.bursts) {
      const k = (now - b.t0) / b.dur;
      for (const t of b.tiles) {
        const { sx, sy } = this.toScreen(t.x, t.y, t.h);
        c.save(); c.globalAlpha = (1 - k) * 0.3;
        this.diamond(sx, sy); c.fillStyle = b.color; c.fill();
        c.restore();
      }
    }
  }

  drawFloats() {
    const c = this.ctx, now = this.time;
    const life = 1100 / PACE.scale;
    this.floats = this.floats.filter(f => now - f.t0 < life);
    c.font = 'bold 16px "Segoe UI", sans-serif'; c.textAlign = 'center';
    for (const f of this.floats) {
      const k = (now - f.t0) / life;
      const { sx, sy } = this.toScreen(f.x, f.y, f.h);
      const y = sy - 46 - k * 34 - f.slot * 14;
      c.save(); c.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText(f.text, sx, y);
      c.fillStyle = f.color; c.fillText(f.text, sx, y);
      c.restore();
    }
  }

  // ---- hooks used by the battle engine --------------------------------------------
  showFloat(u, text, color) {
    if (!this.battle) return;
    const slot = this.floats.filter(f => f.x === u.x && f.y === u.y && this.time - f.t0 < 400).length;
    this.floats.push({ x: u.x, y: u.y, h: this.battle.grid.height(u.x, u.y), text, color, t0: performance.now(), slot });
  }

  burst(tiles, color, dur = 500) { this.bursts.push({ tiles, color, dur, t0: performance.now() }); }

  // ---- effects ----------------------------------------------------------------------------------
  spawn(kind, opts) {
    const f = Object.assign({ kind, t0: performance.now(), dur: 400 }, opts);
    // Effects keep pace with the battle speed, as the engine's own waits do.
    f.dur = f.dur / PACE.scale;
    this.fx.push(f);
    return f;
  }

  drawFx(f) {
    const draw = FX_DRAW[f.kind];
    if (!draw) return;
    const k = Math.min(1, Math.max(0, (this.time - f.t0) / f.dur));
    draw(this.ctx, this, f, k);
  }

  shakeScreen(mag, dur = 220) {
    if (reducedMotion()) return;
    // A bigger blow landing mid-shake replaces a smaller one rather than
    // stacking, so a wide spell does not rattle the board apart.
    if (this.shake && this.shake.mag > mag && this.time - this.shake.t0 < this.shake.dur * 0.5) return;
    this.shake = { mag, dur, t0: this.time || performance.now() };
  }

  // Where an ability lands, in the element's own language.
  landFx(ab, tiles) {
    const spec = abilityFx(ab);
    if (!spec) return 0;
    // One sound for the ability, however many tiles it covers.
    if (spec.sound) audio.sfx(spec.sound);
    const g = this.battle.grid;
    for (const t of tiles) {
      this.spawn(spec.kind, {
        x: t.x, y: t.y, h: g.height(t.x, t.y),
        dur: spec.dur, color: spec.color, second: spec.second,
        ground: spec.kind === 'ring',
      });
    }
    return spec.dur;
  }

  // The mark a landed blow leaves on whoever took it.
  onImpact(t, ab, amount, user) {
    if (!this.battle || t.x < 0) return;
    const sound = impactSound(user || this.battle.active, ab);
    if (sound) audio.sfx(sound);
    const g = this.battle.grid;
    const share = Math.min(1, amount / Math.max(1, t.maxHp));
    t.hitAt = performance.now();
    if (!reducedMotion()) {
      const dir = t._fromAngle === undefined ? -0.6 : t._fromAngle;
      t.recoil = { a: dir, t0: performance.now(), dur: 260 / PACE.scale, mag: 3 + share * 7 };
      this.shakeScreen(2 + share * 9);
    }
    this.spawn('impact', {
      x: t.x, y: t.y, h: g.height(t.x, t.y), dur: 260,
      color: ab && ab.element ? ELEMENTS[ab.element].color : '#ffffff',
      size: 12 + share * 22, angle: t._fromAngle || 0,
    });
  }

  // A blow that was turned aside: the target slips out of the way.
  onEvade(t) {
    if (!this.battle || t.x < 0 || reducedMotion()) return;
    t.recoil = { a: (t._fromAngle || 0) + Math.PI / 2, t0: performance.now(), dur: 240 / PACE.scale, mag: 6 };
  }

  /* A charging spell is public information: the caster glows and the ground it
     is aimed at is ringed, so a player can see what is coming and move. */
  drawCharges() {
    const b = this.battle;
    if (!b || !b.pending || !b.pending.length) return;
    const c = this.ctx, g = b.grid;
    const pulse = 0.5 + 0.5 * Math.sin(this.time / 160);
    for (const p of b.pending) {
      const col = p.ability.element ? ELEMENTS[p.ability.element].color : '#c8b0ff';
      if (p.unit.x >= 0) {
        const { sx, sy } = this.unitScreenPos(p.unit);
        c.strokeStyle = rgba(col, 0.35 + pulse * 0.5);
        c.lineWidth = 2;
        c.beginPath(); c.ellipse(sx, sy + 5, 15, 7, 0, 0, Math.PI * 2); c.stroke();
      }
      for (const t of g.areaTiles(p.tx, p.ty, p.ability.aoe)) {
        const { sx, sy } = this.toScreen(t.x, t.y, t.h);
        c.strokeStyle = rgba(col, 0.25 + pulse * 0.35);
        c.lineWidth = 2;
        c.setLineDash([5, 4]);
        this.diamond(sx, sy); c.stroke();
        c.setLineDash([]);
      }
    }
  }

  async animateMove(u, path) {
    const g = this.battle.grid;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const h0 = g.height(a.x, a.y), h1 = g.height(b.x, b.y);
      u.facing = facingFromDelta(b.x - a.x, b.y - a.y);
      await tween(150, k => {
        u.anim = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), h: lerp(h0, h1, k), z: Math.sin(k * Math.PI) * (4 + Math.abs(h1 - h0) * 5) };
      });
    }
    u.anim = null;
  }

  /* The shape of a blow, from wind-up to arrival.

     A turn is a conversation, so this stays short: the whole sequence is
     budgeted at roughly a third of a second for a sword and half for a spell,
     and every wait is awaited so the engine prints damage only once the blow
     has visibly landed. */
  async animateAction(u, ab, tx, ty) {
    const g = this.battle.grid;
    const tiles = g.areaTiles(tx, ty, ab.aoe);
    const h = g.height(u.x, u.y);
    const dx = tx - u.x, dy = ty - u.y;
    // Screen-space direction of the blow: the board is isometric, so the
    // angle a player sees is not the angle on the grid.
    const from = this.toScreen(u.x, u.y, h), to = this.toScreen(tx, ty, g.height(tx, ty));
    const angle = (dx || dy) ? Math.atan2(to.sy - from.sy, to.sx - from.sx) : -Math.PI / 2;
    // Every target remembers where the blow came from, for its recoil.
    for (const t of tiles) {
      const hit = this.battle.unitAt ? this.battle.unitAt(t.x, t.y) : null;
      if (hit) hit._fromAngle = angle;
    }
    for (const t of this.battle.units) if (t.x === tx && t.y === ty) t._fromAngle = angle;

    const wfx = weaponFx(u, ab);
    const dist = Math.abs(dx) + Math.abs(dy);
    /* How the blow gets there. A weapon swung at its own reach swings — a
       spear's two tiles are still a thrust, not a throw. Something that
       reaches further by a means of its own is projected, unless what it
       projects is an element, which arrives as the element. */
    const shoots = !!(wfx && wfx.shot && ab.range === 'weapon');
    const thrown = isThrown(ab);
    const reduced = reducedMotion();

    if (reduced) {
      // The flourish goes; the sound is not motion, so it stays.
      if (wfx && wfx.sound) audio.sfx(wfx.sound);
      this.landFx(ab, tiles);
      if (wfx) for (const t of tiles) this.spawn('impact', { x: t.x, y: t.y, h: g.height(t.x, t.y), dur: 180, color: wfx.color, size: 14, angle });
      await sleep(140);
      return;
    }

    if (shoots) {
      // A bow is drawn, then the arrow has to get there.
      await tween(wfx.wind, k => { u.anim = { x: u.x - dx * 0.12 * k / Math.max(1, dist), y: u.y - dy * 0.12 * k / Math.max(1, dist), h, z: 0 }; });
      u.anim = null;
      audio.sfx(wfx.sound);
      await this.travel(u.x, u.y, h, tx, ty, g.height(tx, ty), wfx.shot, 26);
    } else if (thrown) {
      await tween(150, k => { u.anim = { x: u.x, y: u.y, h, z: Math.sin(k * Math.PI) * 5 }; });
      u.anim = null;
      audio.sfx('throw');
      await this.travel(u.x, u.y, h, tx, ty, g.height(tx, ty), throwShape(u, ab), 34);
    } else if (wfx) {
      // A weapon blow. Within a weapon's reach the attacker leans into it and
      // the swing is drawn over whoever it lands on; beyond that it is a
      // flourish at the attacker and the ability carries the rest.
      const near = dist > 0 && dist <= 2;
      const lunge = near ? wfx.reach / dist : 0;
      await tween(wfx.wind, k => {
        const sw = Math.sin(k * Math.PI) * lunge;
        u.anim = { x: u.x + dx * sw, y: u.y + dy * sw, h, z: lunge ? 0 : Math.sin(k * Math.PI) * 6 };
      });
      u.anim = null;
      const where = near ? tiles : [g.tile(u.x, u.y)];
      for (let i = 0; i < wfx.hits; i++) {
        audio.sfx(wfx.sound);
        for (const t of where) {
          if (!t) continue;
          this.spawn(wfx.swing, { x: t.x, y: t.y, h: g.height(t.x, t.y), dur: 240, color: wfx.color, angle });
        }
        if (i < wfx.hits - 1) await sleep(90);
      }
    } else if (ab.kind === 'magic') {
      // A spell: the caster gathers it before it arrives.
      const col = ab.element ? ELEMENTS[ab.element].color : '#c8b0ff';
      const cast = this.spawn('ring', { x: u.x, y: u.y, h, dur: 260, color: col, ground: true });
      audio.sfx('cast');
      await tween(240, k => { u.anim = { x: u.x, y: u.y, h, z: Math.sin(k * Math.PI) * 8 }; });
      u.anim = null;
      cast.dur = 1;   // the gather is done; let the arrival own the screen
    } else {
      await tween(180, k => { u.anim = { x: u.x, y: u.y, h, z: Math.sin(k * Math.PI) * 6 }; });
      u.anim = null;
    }

    const landed = this.landFx(ab, tiles);
    // The tile highlight still reads the area at a glance; keep it, quietly.
    this.burst(tiles, ab.kind === 'magic' ? (ab.element ? ELEMENTS[ab.element].color : '#b080ff')
      : ab.kind === 'physical' ? '#ffffff' : '#70ff90', 320);
    // landFx reports the effect's unscaled length; sleep scales it as spawn did.
    await sleep(Math.max(120, Math.min(landed || 0, 300)));
  }

  /* Send something across the board and wait for it to arrive. Returns once
     the projectile is on the target, so damage lands with the hit. */
  travel(x0, y0, h0, x1, y1, h1, shape, arc) {
    const dist = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    const dur = Math.min(420, 120 + dist * 45);
    const f = this.spawn('shot', { x0, y0, h0, x: x1, y: y1, h: h1, shape, arc, dur,
      d: Math.max(this.depthOf(x0, y0), this.depthOf(x1, y1)) });
    // spawn already scaled the flight to the battle speed, and so does sleep.
    return sleep(dur).then(() => { f.dur = 1; });
  }

  abilityRangeOf(u, ab) { return ab.range === 'weapon' ? u.weapon.range : ab.range; }

  async onJump(u) {
    const h = this.battle.grid.height(u.x, u.y);
    await tween(350, k => { u.anim = { x: u.x, y: u.y, h, z: k * k * 150 }; });
    u.anim = null;
  }

  async onLand(u, tx, ty) {
    const h = this.battle.grid.height(u.x, u.y);
    await tween(250, k => { u.anim = { x: u.x, y: u.y, h, z: (1 - k) * (1 - k) * 150 }; });
    u.anim = null;
  }

  async onDeath(u) {
    const h = this.battle.grid.height(u.x, u.y);
    await tween(300, k => { u.anim = { x: u.x, y: u.y, h, z: Math.sin(k * Math.PI * 3) * 3 }; });
    u.anim = null;
  }
}
