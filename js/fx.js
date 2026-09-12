/* ==========================================================================
   Battle effects.

   The moment between choosing an ability and reading the damage number is
   where a tactics game sells its blows, so each one gets a shape of its own:
   a sword sweeps an arc, a spear drives a line, a bow puts an arrow in the
   air that takes time to arrive, and each element answers differently when it
   lands. Fire climbs, ice spikes and shatters, thunder falls, earth erupts,
   holy rises, dark contracts.

   An effect is a plain record with a start time and a duration. The renderer
   keeps a list, drops the expired ones each frame and draws the rest through
   the dispatch table at the bottom. Nothing here reads game state: an effect
   is spawned with everything it needs, so a spell that kills its caster still
   finishes playing.
   ========================================================================== */

// Someone who has asked their system for less motion gets the information —
// what was hit, for how much — without the flourish that carries it.
function reducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (e) { return false; }
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Ease-out: effects should hit hard and settle, not drift in.
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const easeIn = (k) => k * k;
// Ease in and out, for something that starts and stops rather than lands.
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));

/* The compass turns with the camera. A figure facing east is still facing
   east after the board is turned; it is the viewer who has moved, so the
   side of the figure they see moves with them. */
const FACING_CYCLE = ['E', 'S', 'W', 'N'];
// Which way an arrow must point on screen to mean a compass direction, once
// the board has been turned.
const DIR_ARROWS = { E: '\u2198', S: '\u2199', W: '\u2196', N: '\u2197' };
function dirArrow(facing, rot) { return DIR_ARROWS[apparentFacing(facing, rot)] || ''; }

function apparentFacing(facing, rot) {
  const i = FACING_CYCLE.indexOf(facing);
  if (i < 0) return facing;
  return FACING_CYCLE[(i + Math.round(rot || 0) % 4 + 4) % 4];
}

/* How each weapon delivers a blow. `reach` is how far the attacker leans into
   it as a fraction of a tile, `swing` the shape drawn over the target, `sound`
   the air it moves and `impact` what it sounds like arriving. Sight and sound
   are named together because they describe the same blow, and a weapon that
   gained one but not the other would be half-finished. */
const WEAPON_FX = {
  sword:      { reach: 0.38, swing: 'slash', hits: 1, wind: 200, color: '#eaf2ff',
                sound: 'swing-blade', impact: 'impact-slash' },
  ninjablade: { reach: 0.34, swing: 'slash', hits: 2, wind: 130, color: '#dff6ff',
                sound: 'swing-fast', impact: 'impact-slash' },
  axe:        { reach: 0.32, swing: 'chop', hits: 1, wind: 280, color: '#ffe6c0',
                sound: 'swing-heavy', impact: 'impact-blunt' },
  spear:      { reach: 0.55, swing: 'thrust', hits: 1, wind: 190, color: '#dbe6ff',
                sound: 'swing-pierce', impact: 'impact-pierce' },
  knife:      { reach: 0.30, swing: 'thrust', hits: 2, wind: 120, color: '#ffffff',
                sound: 'swing-light', impact: 'impact-pierce' },
  staff:      { reach: 0.30, swing: 'chop', hits: 1, wind: 220, color: '#e8dcff',
                sound: 'swing-blunt', impact: 'impact-wood' },
  rod:        { reach: 0.30, swing: 'chop', hits: 1, wind: 220, color: '#e8dcff',
                sound: 'swing-rod', impact: 'impact-wood' },
  fist:       { reach: 0.28, swing: 'punch', hits: 2, wind: 110, color: '#ffffff',
                sound: 'swing-fist', impact: 'impact-blunt' },
  bow:        { reach: 0.0, swing: null, hits: 1, wind: 260, color: '#ffe9b0', shot: 'arrow',
                sound: 'bow-release', impact: 'impact-arrow' },
};
const DEFAULT_WEAPON_FX = WEAPON_FX.sword;

/* What each element does when it arrives. `dur` is how long the effect owns
   the screen; the engine waits for it before printing damage. */
const ELEMENT_FX = {
  fire:    { kind: 'flame', dur: 460, color: '#ff7a30', second: '#ffe07a', sound: 'el-fire' },
  ice:     { kind: 'shards', dur: 460, color: '#7fd8ff', second: '#e8fbff', sound: 'el-ice' },
  thunder: { kind: 'bolt', dur: 380, color: '#ffe040', second: '#fffbe0', sound: 'el-thunder' },
  earth:   { kind: 'rubble', dur: 460, color: '#c08a4a', second: '#8a6234', sound: 'el-earth' },
  holy:    { kind: 'column', dur: 480, color: '#fff3b0', second: '#ffffff', sound: 'el-holy' },
  dark:    { kind: 'void', dur: 460, color: '#a05fd6', second: '#2a1040', sound: 'el-dark' },
};
const NEUTRAL_MAGIC = { kind: 'column', dur: 400, color: '#b080ff', second: '#e8d8ff', sound: 'el-arcane' };
const HEAL_FX = { kind: 'motes', dur: 420, color: '#7cff7c', second: '#e0ffe0', sound: 'heal' };
const BUFF_FX = { kind: 'ring', dur: 380, color: '#ffe97c', second: '#fff8d8', sound: 'buff' };

// A deterministic scatter, so an effect looks the same every frame it is drawn
// rather than boiling. Seeded off the effect's own start time and index.
function jitter(seed, i) {
  const n = Math.sin((seed % 1000) * 12.9898 + i * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/* ------------------------------------------------------------------ drawing
   Every draw takes the renderer (for the projection), the effect, and how far
   through it is, 0 to 1. Coordinates are canvas-space; the caller has already
   applied the camera. */
const FX_DRAW = {
  // A weapon arc swept over the target.
  slash(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    const a0 = f.angle - 1.6, a1 = f.angle + 1.6;
    const a = a0 + (a1 - a0) * easeOut(k);
    c.save();
    c.translate(sx, sy - 16);
    c.lineCap = 'round';
    // Dark under-stroke first, so the arc reads over grass as well as stone,
    // then the blade colour, then a white core down the middle of it.
    for (let i = 0; i < 3; i++) {
      const trail = a - (a - a0) * (i * 0.2);
      const fade = Math.min(1, (1 - k) * 1.6) * (1 - i * 0.3);
      c.strokeStyle = rgba('#0a0a12', fade * 0.7);
      c.lineWidth = 12 - i * 3;
      c.beginPath(); c.arc(0, 0, 26 - i * 3, trail - 0.72, trail, false); c.stroke();
      c.strokeStyle = rgba(f.color, fade);
      c.lineWidth = 8 - i * 2;
      c.beginPath(); c.arc(0, 0, 26 - i * 3, trail - 0.7, trail, false); c.stroke();
      if (i === 0) {
        c.strokeStyle = rgba('#ffffff', fade);
        c.lineWidth = 3;
        c.beginPath(); c.arc(0, 0, 26, trail - 0.55, trail, false); c.stroke();
      }
    }
    c.restore();
  },

  // An overhead blow that comes straight down.
  chop(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    const drop = -22 + easeIn(k) * 26;
    c.save();
    c.translate(sx, sy - 16);
    c.rotate(f.angle);
    c.lineCap = 'round';
    const fade = Math.min(1, (1 - k) * 1.6);
    c.strokeStyle = rgba('#0a0a12', fade * 0.7);
    c.lineWidth = 14;
    c.beginPath(); c.moveTo(0, drop - 20); c.lineTo(0, drop); c.stroke();
    c.strokeStyle = rgba(f.color, fade);
    c.lineWidth = 9;
    c.beginPath(); c.moveTo(0, drop - 20); c.lineTo(0, drop); c.stroke();
    c.strokeStyle = rgba('#ffffff', fade);
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, drop - 16); c.lineTo(0, drop - 2); c.stroke();
    c.restore();
  },

  // A straight drive along the attack direction.
  thrust(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    const reach = -14 + easeOut(k) * 14;
    c.save();
    c.translate(sx, sy - 16);
    c.rotate(f.angle);
    c.lineCap = 'round';
    const fade = Math.min(1, (1 - k) * 1.6);
    c.strokeStyle = rgba('#0a0a12', fade * 0.7);
    c.lineWidth = 12;
    c.beginPath(); c.moveTo(reach - 26, 0); c.lineTo(reach, 0); c.stroke();
    c.strokeStyle = rgba(f.color, fade);
    c.lineWidth = 7;
    c.beginPath(); c.moveTo(reach - 26, 0); c.lineTo(reach, 0); c.stroke();
    c.fillStyle = rgba('#ffffff', fade);
    c.beginPath(); c.arc(reach, 0, 5 * (1 - k * 0.4), 0, Math.PI * 2); c.fill();
    c.restore();
  },

  // Two quick knuckle impacts.
  punch(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    const p = easeOut(k);
    c.save();
    c.translate(sx, sy - 16);
    c.rotate(f.angle);
    const fade = Math.min(1, (1 - k) * 1.6);
    const px = -12 + p * 12;
    c.fillStyle = rgba('#0a0a12', fade * 0.6);
    c.beginPath(); c.arc(px, 0, 12 * (1 - k * 0.5), 0, Math.PI * 2); c.fill();
    c.fillStyle = rgba(f.color, fade);
    c.beginPath(); c.arc(px, 0, 8 * (1 - k * 0.5), 0, Math.PI * 2); c.fill();
    c.restore();
  },

  // The white star where a blow lands.
  impact(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    const rad = 6 + easeOut(k) * f.size;
    c.save();
    c.translate(sx, sy - 16);
    c.strokeStyle = rgba(f.color, 1 - k);
    c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = f.angle + i * (Math.PI / 3) + 0.3;
      c.beginPath();
      c.moveTo(Math.cos(a) * rad * 0.4, Math.sin(a) * rad * 0.4 * 0.6);
      c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad * 0.6);
      c.stroke();
    }
    c.fillStyle = rgba('#ffffff', (1 - k) * 0.7);
    c.beginPath(); c.arc(0, 0, rad * 0.35, 0, Math.PI * 2); c.fill();
    c.restore();
  },

  // Something in the air, on its way.
  shot(c, r, f, k) {
    const a = r.toScreen(f.x0, f.y0, f.h0), b = r.toScreen(f.x, f.y, f.h);
    const x = lerp(a.sx, b.sx, k);
    // A shallow arc, so a shot reads as travelling rather than sliding.
    const y = lerp(a.sy - 18, b.sy - 18, k) - Math.sin(k * Math.PI) * f.arc;
    const ang = Math.atan2(b.sy - 18 - (a.sy - 18) - Math.cos(k * Math.PI) * f.arc * Math.PI, b.sx - a.sx);
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    if (f.shape === 'arrow') {
      c.strokeStyle = '#c8a060'; c.lineWidth = 2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-10, 0); c.lineTo(6, 0); c.stroke();
      c.fillStyle = '#e8e8f0';
      c.beginPath(); c.moveTo(10, 0); c.lineTo(4, -3); c.lineTo(4, 3); c.closePath(); c.fill();
      c.strokeStyle = '#e8e8f0'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-10, 0); c.lineTo(-6, -3); c.moveTo(-10, 0); c.lineTo(-6, 3); c.stroke();
    } else if (f.shape === 'star') {
      c.rotate(k * 22);
      c.fillStyle = '#dfe8f4';
      for (let i = 0; i < 4; i++) {
        c.rotate(Math.PI / 2);
        c.beginPath(); c.moveTo(0, 0); c.lineTo(7, -2.5); c.lineTo(7, 2.5); c.closePath(); c.fill();
      }
    } else if (f.shape === 'rock') {
      c.rotate(k * 9);
      c.fillStyle = '#8a7a62';
      c.beginPath(); c.moveTo(-5, -2); c.lineTo(-1, -5); c.lineTo(5, -1); c.lineTo(3, 4); c.lineTo(-3, 4); c.closePath(); c.fill();
      c.fillStyle = '#b0a088';
      c.beginPath(); c.moveTo(-5, -2); c.lineTo(-1, -5); c.lineTo(1, -1); c.closePath(); c.fill();
    } else {
      c.fillStyle = rgba(f.color || '#9ad8ff', 0.95);
      c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = rgba('#ffffff', 0.8);
      c.beginPath(); c.arc(-1.5, -1.5, 2, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },

  // Fire climbs.
  flame(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    c.save();
    c.translate(sx, sy);
    for (let i = 0; i < 9; i++) {
      const j = jitter(f.t0, i), j2 = jitter(f.t0, i + 40);
      const life = Math.min(1, k / (0.55 + j * 0.4));
      if (life >= 1) continue;
      const px = (j - 0.5) * 42;
      const py = -life * (30 + j2 * 26);
      const rad = (5 + j2 * 4) * (1 - life * 0.7);
      c.fillStyle = rgba(life < 0.5 ? f.second : f.color, (1 - life) * 0.9);
      c.beginPath(); c.arc(px, py, rad, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = rgba(f.color, (1 - k) * 0.35);
    c.beginPath(); c.ellipse(0, 0, 26 * (1 - k * 0.4), 12 * (1 - k * 0.4), 0, 0, Math.PI * 2); c.fill();
    c.restore();
  },

  // Ice spikes up, then breaks.
  shards(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    const grow = Math.min(1, k / 0.4), fall = Math.max(0, (k - 0.55) / 0.45);
    c.save();
    c.translate(sx, sy);
    for (let i = 0; i < 5; i++) {
      const j = jitter(f.t0, i), j2 = jitter(f.t0, i + 20);
      const px = (j - 0.5) * 36, hgt = (16 + j2 * 20) * easeOut(grow);
      const wid = 4 + j2 * 3;
      c.save();
      c.translate(px, -fall * fall * 30 * (j2 - 0.3));
      c.rotate(fall * (j - 0.5) * 2.2);
      c.fillStyle = rgba(f.second, 0.85 * (1 - fall));
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-wid, -hgt * 0.35); c.lineTo(0, -hgt); c.lineTo(wid, -hgt * 0.35); c.closePath(); c.fill();
      c.fillStyle = rgba(f.color, 0.75 * (1 - fall));
      c.beginPath(); c.moveTo(0, 0); c.lineTo(wid, -hgt * 0.35); c.lineTo(0, -hgt); c.closePath(); c.fill();
      c.restore();
    }
    c.restore();
  },

  // Thunder falls.
  bolt(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    const strike = Math.min(1, k / 0.25);
    c.save();
    c.translate(sx, sy - 16);
    if (k < 0.5) {
      const fade = Math.min(1, (1 - k / 0.5) * 1.8);
      c.strokeStyle = rgba(f.second, fade);
      c.lineWidth = 4; c.lineJoin = 'round'; c.lineCap = 'round';
      const top = -105;
      c.beginPath();
      c.moveTo(0, top * strike);
      for (let i = 1; i <= 5; i++) {
        const t = i / 5;
        c.lineTo((jitter(f.t0, i) - 0.5) * 26 * (1 - t), lerp(top, 16, t) * (i < 5 ? strike : 1));
      }
      c.stroke();
      c.strokeStyle = rgba(f.color, fade * 0.75);
      c.lineWidth = 11;
      c.stroke();
      c.strokeStyle = rgba('#ffffff', fade);
      c.lineWidth = 2;
      c.stroke();
    }
    // The flash on the ground outlasts the bolt.
    c.fillStyle = rgba(f.second, (1 - k) * 0.5);
    c.beginPath(); c.ellipse(0, 16, 30 * (0.4 + k), 14 * (0.4 + k), 0, 0, Math.PI * 2); c.fill();
    c.restore();
  },

  // Earth erupts.
  rubble(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    c.save();
    c.translate(sx, sy);
    c.fillStyle = rgba(f.second, (1 - k) * 0.6);
    c.beginPath(); c.ellipse(0, 0, 28 * easeOut(Math.min(1, k * 2)), 13 * easeOut(Math.min(1, k * 2)), 0, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 7; i++) {
      const j = jitter(f.t0, i), j2 = jitter(f.t0, i + 60);
      const up = 26 + j2 * 24;
      // Thrown up, pulled down: a parabola, not a fade.
      const py = -up * Math.sin(Math.min(1, k * 1.2) * Math.PI);
      const px = (j - 0.5) * 54 * k;
      const s = 3 + j2 * 4;
      c.save();
      c.translate(px, py);
      c.rotate(k * 6 * (j - 0.5));
      c.fillStyle = rgba(j > 0.5 ? f.color : f.second, 1 - k * 0.6);
      c.fillRect(-s / 2, -s / 2, s, s);
      c.restore();
    }
    c.restore();
  },

  // Holy rises.
  column(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    c.save();
    c.translate(sx, sy);
    const w = 22 * (1 - k * 0.5), fade = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
    const grad = c.createLinearGradient(0, 8, 0, -78);
    grad.addColorStop(0, rgba(f.second, 0.75 * fade));
    grad.addColorStop(1, rgba(f.color, 0));
    c.fillStyle = grad;
    c.beginPath(); c.moveTo(-w, 8); c.lineTo(w, 8); c.lineTo(w * 0.5, -78); c.lineTo(-w * 0.5, -78); c.closePath(); c.fill();
    for (let i = 0; i < 7; i++) {
      const j = jitter(f.t0, i), j2 = jitter(f.t0, i + 15);
      const life = Math.min(1, k / (0.6 + j2 * 0.4));
      c.fillStyle = rgba(f.second, (1 - life) * 0.9);
      c.beginPath(); c.arc((j - 0.5) * 34, 6 - life * (46 + j2 * 24), 2.2, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = rgba(f.color, (1 - k) * 0.5);
    c.beginPath(); c.ellipse(0, 4, 26, 12, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  },

  // Dark contracts.
  void(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    c.save();
    c.translate(sx, sy - 14);
    c.fillStyle = rgba(f.second, (1 - Math.abs(k - 0.5) * 2) * 0.8);
    c.beginPath(); c.arc(0, 0, 14 * (1 - easeIn(k) * 0.75), 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 9; i++) {
      const j = jitter(f.t0, i), j2 = jitter(f.t0, i + 33);
      const a = j * Math.PI * 2 + k * 7;
      const rad = (22 + j2 * 10) * (1 - easeIn(k));
      c.fillStyle = rgba(f.color, (1 - k) * 0.95);
      c.beginPath(); c.arc(Math.cos(a) * rad, Math.sin(a) * rad * 0.55, 2.6, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },

  // Healing rises, gently.
  motes(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    c.save();
    c.translate(sx, sy);
    for (let i = 0; i < 8; i++) {
      const j = jitter(f.t0, i), j2 = jitter(f.t0, i + 11);
      const life = Math.min(1, k / (0.55 + j2 * 0.45));
      const px = (j - 0.5) * 34 + Math.sin(life * 4 + j * 6) * 4;
      c.fillStyle = rgba(life < 0.6 ? f.second : f.color, (1 - life) * 0.95);
      c.beginPath(); c.arc(px, 6 - life * (40 + j2 * 20), 2.4 + j2, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = rgba(f.color, (1 - k) * 0.3);
    c.beginPath(); c.ellipse(0, 4, 24, 11, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  },

  // A ring on the ground: a buff, or where an area is about to land.
  ring(c, r, f, k) {
    const { sx, sy } = r.toScreen(f.x, f.y, f.h);
    c.save();
    c.translate(sx, sy);
    c.strokeStyle = rgba(f.color, (1 - k) * 0.9);
    c.lineWidth = 3;
    const s = 0.4 + easeOut(k) * 0.9;
    c.beginPath(); c.ellipse(0, 0, 30 * s, 14 * s, 0, 0, Math.PI * 2); c.stroke();
    c.restore();
  },
};

/* The visual an ability should produce where it lands. Elements come first —
   a spell is its element — then the ability's kind decides the rest. */
function abilityFx(ab) {
  if (ab.element && ELEMENT_FX[ab.element]) return ELEMENT_FX[ab.element];
  const heals = (ab.effects || []).some(e =>
    e.type === 'heal' || e.type === 'revive' || e.type === 'restoreMp' || e.type === 'cure');
  if (heals) return HEAL_FX;
  if (ab.kind === 'magic') return NEUTRAL_MAGIC;
  if (ab.kind === 'support' || ab.kind === 'item') return BUFF_FX;
  return null;   // physical without an element: the weapon carries it
}

// What leaves the hand when something is thrown rather than swung.
function throwShape(u, ab) {
  if (ab.kind === 'item') return 'orb';
  const t = u.weapon && u.weapon.wtype;
  if (t === 'ninjablade' || t === 'knife') return 'star';
  if (t === 'bow') return 'arrow';          // a rain of arrows is still arrows
  if (t === 'fist') return 'orb';           // a monk projects force, not a rock
  return 'rock';
}

/* Whether an ability projects something rather than swinging what is held. A
   weapon used at its own reach swings, so a spear's two tiles are a thrust;
   anything that reaches further by a means of its own is thrown, unless what
   it throws is an element. Shared so that the picture and the sound cannot
   disagree about which one it is. */
function isThrown(ab) {
  return !!ab && ab.range !== 'weapon' && ab.range > 1 && !ab.element
    && ab.kind !== 'magic' && ab.kind !== 'support';
}

// A thrown thing lands as itself, not as whatever the thrower is holding.
const THROW_IMPACT = { rock: 'impact-blunt', star: 'impact-pierce', arrow: 'impact-arrow', orb: 'impact-wood' };

/* What a landed blow sounds like. An element speaks for itself; then what was
   thrown; and failing both, the weapon that delivered it. */
function impactSound(u, ab) {
  if (ab && ab.element && ELEMENT_FX[ab.element]) return null;   // the element already played
  if (isThrown(ab)) return THROW_IMPACT[throwShape(u, ab)] || 'impact-blunt';
  const w = weaponFx(u, ab);
  return w ? w.impact : 'impact-blunt';
}

// The weapon shape an ability swings, or null if it is not a weapon blow.
function weaponFx(u, ab) {
  if (ab.kind !== 'physical') return null;
  const w = u.weapon;
  return (w && WEAPON_FX[w.wtype]) || DEFAULT_WEAPON_FX;
}
