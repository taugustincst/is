#!/usr/bin/env node
/* Draws the app icons from the game's own sprite art and palettes, and writes
   them as PNGs. No image library: the encoder below is a few dozen lines on top
   of Node's built-in zlib, which keeps the project dependency-free.

   Usage: node tools/make-icons.js */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { load, ROOT } = require('./load');

const g = load(['data']);
// The sprite templates live in a browser file; read them in a bare sandbox.
const vm = require('vm');
const spriteCtx = { document: { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), width: 0, height: 0 }) } };
vm.createContext(spriteCtx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/color.js'), 'utf8'), spriteCtx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/sprites.js'), 'utf8'), spriteCtx);
const TEMPLATES = vm.runInContext('SPRITE_TEMPLATES', spriteCtx);
// The same palette resolution the game uses, so the icon carries the shading.
const resolvePalette = vm.runInContext('resolvePalette', spriteCtx);

// ---------------------------------------------------------------- PNG writer
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// `px` is an RGBA byte array, row-major.
function encodePng(width, height, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // 8 bits per channel
  ihdr[9] = 6;   // truecolour with alpha
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // no per-row filtering
    px.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- drawing
function surface(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, gg, b, a = 255]) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    if (a === 255) { px[i] = r; px[i + 1] = gg; px[i + 2] = b; px[i + 3] = 255; return; }
    const k = a / 255, ik = 1 - k;
    px[i] = r * k + px[i] * ik; px[i + 1] = gg * k + px[i + 1] * ik;
    px[i + 2] = b * k + px[i + 2] * ik; px[i + 3] = Math.max(px[i + 3], a);
  };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  return { px, set, rect };
}

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

// One isometric tile, drawn the way the game draws them: a diamond top with
// two shaded walls hanging off its lower edges.
function tile(s, cx, cy, w, wallH, top, left, right) {
  const hw = w / 2, hh = hw / 2;
  // Top face.
  for (let y = -hh; y <= hh; y++) {
    const span = hw * (1 - Math.abs(y) / hh);
    for (let x = -span; x <= span; x++) s.set(cx + x, cy + y, top);
  }
  // Walls hang from the two lower edges of the diamond.
  for (let x = -hw; x <= hw; x++) {
    const edge = hh * (hw - Math.abs(x)) / hw;   // y of the lower edge at this column
    for (let y = 0; y < wallH; y++) s.set(cx + x, cy + edge + y, x < 0 ? left : right);
  }
  // A darker line along the bottom lip, so stacked tiles separate.
  for (let x = -hw; x <= hw; x++) {
    const edge = hh * (hw - Math.abs(x)) / hw;
    s.set(cx + x, cy + edge + wallH, [0, 0, 0, 90]);
  }
}

function drawSprite(s, name, palette, ox, oy, scale) {
  const rows = TEMPLATES[name].front;
  const pal = resolvePalette(palette, 'player', 'human');
  // Outline first, so the figure reads against the tile.
  const filled = (x, y) => y >= 0 && y < rows.length && x >= 0 && x < rows[0].length && rows[y][x] !== '.';
  for (let y = -1; y <= rows.length; y++) for (let x = -1; x <= rows[0].length; x++) {
    if (filled(x, y)) continue;
    if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
      s.rect(ox + x * scale, oy + y * scale, scale, scale, [10, 10, 14]);
    }
  }
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[0].length; x++) {
    const ch = rows[y][x];
    if (ch === '.') continue;
    s.rect(ox + x * scale, oy + y * scale, scale, scale, rgb(pal[ch] || '#ff00ff'));
  }
}

// `pad` leaves room for Android's maskable safe zone, which crops to a circle.
// Fill a polygon by scanline, for the shapes a sprite cannot give.
function poly(s, pts, color) {
  const ys = pts.map(p => p[1]);
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(s.size - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi <= y + 0.5) !== (yj <= y + 0.5)) xs.push(xi + (y + 0.5 - yi) * (xj - xi) / (yj - yi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(s.size, Math.round(xs[k + 1]));
      if (xb > xa) s.rect(xa, y, xb - xa, 1, color);
    }
  }
}

/* The icon is the crown the whole story is about: gold, five-pointed, set
   with a red stone, resting on a block of the game's own stone tile so the
   isometric field is in it too. It reads at 48 dp because it is one shape
   with one highlight, not a figure with a face. `pad` leaves room for
   Android's maskable safe zone, which crops to a circle. */
function icon(size, pad, transparent, mono) {
  const s = surface(size);
  s.size = size;
  const inner = size * (1 - pad * 2);
  const y0 = size * pad;
  // Background: the night sky, lighter at the top, with a faint aurora. An
  // adaptive foreground layer leaves this out and sits on the declared colour.
  if (!transparent) {
    for (let y = 0; y < size; y++) {
      const k = y / size;
      const c = [Math.round(0x1c + (0x0c - 0x1c) * k), Math.round(0x1e + (0x0e - 0x1e) * k), Math.round(0x34 + (0x1a - 0x34) * k)];
      s.rect(0, y, size, 1, c);
    }
    // A soft curtain of aurora across the top, not a stripe.
    const band = Math.round(size * 0.22);
    for (let i = 0; i < band; i++) {
      const y = Math.round(size * 0.06) + i, a = Math.pow(Math.sin((i / band) * Math.PI), 2) * 0.35;
      for (let x = 0; x < size; x++) {
        const w = 0.6 + 0.4 * Math.sin(x / size * 6 + i / band * 3);
        s.set(x, y, [60, 200, 170, Math.round(255 * a * w)]);
      }
    }
  }
  const cx = size / 2;
  // The stone: a raised isometric block, grey flagstone with a mossy lip.
  const tw = inner * 0.78, wall = inner * 0.14;
  const ty = y0 + inner * 0.80;
  tile(s, cx, ty, tw, wall, rgb('#9a9aa8'), rgb('#7a7a88'), rgb('#606070'));
  // The crown, drawn in the space above the stone.
  const cw = inner * 0.66, ch = inner * 0.36;
  const left = cx - cw / 2, base = ty + inner * 0.02;
  // Its shadow on the stone.
  poly(s, [[left + cw * 0.05, base + inner * 0.01], [left + cw * 0.95, base + inner * 0.01], [left + cw * 0.85, base + inner * 0.07], [left + cw * 0.15, base + inner * 0.07]], rgb('#6a6a78'));
  const gold = rgb('#e8c45a'), dark = rgb('#a8862c'), bright = rgb('#fff0b0'), gem = rgb('#d8483b'), gemHi = rgb('#ffb3a8');
  // Band, with its own shadow underneath.
  const bandH = ch * 0.34;
  poly(s, [[left, base], [left + cw, base], [left + cw, base - bandH], [left, base - bandH]], gold);
  poly(s, [[left, base], [left + cw, base], [left + cw, base - bandH * 0.25], [left, base - bandH * 0.25]], dark);
  // Five points: the middle tallest, the outer two leaning out.
  const pts = [0, 0.25, 0.5, 0.75, 1].map((k, i) => {
    const x = left + k * cw, h = i === 2 ? ch : i === 1 || i === 3 ? ch * 0.78 : ch * 0.62;
    return [x, base - h];
  });
  const notch = ch * 0.5;
  const crown = [[left, base - bandH]];
  for (let i = 0; i < 5; i++) {
    crown.push(pts[i]);
    if (i < 4) crown.push([(pts[i][0] + pts[i + 1][0]) / 2, base - notch]);
  }
  crown.push([left + cw, base - bandH]);
  poly(s, crown, gold);
  // The left face of each point catches the light.
  for (let i = 0; i < 5; i++) {
    const [px, py] = pts[i];
    const w = cw * 0.045;
    poly(s, [[px, py + ch * 0.06], [px - w, py + ch * 0.42], [px, py + ch * 0.36]], bright);
  }
  // Balls on the points.
  for (let i = 0; i < 5; i++) {
    const r = Math.max(1, cw * 0.035);
    const [px, py] = pts[i];
    poly(s, [[px - r, py], [px, py - r], [px + r, py], [px, py + r]], i === 2 ? bright : gold);
  }
  // The stone, set in the band.
  const gr = bandH * 0.42;
  const gy = base - bandH * 0.5;
  poly(s, [[cx - gr, gy], [cx, gy - gr], [cx + gr, gy], [cx, gy + gr]], gem);
  poly(s, [[cx - gr * 0.5, gy - gr * 0.1], [cx - gr * 0.1, gy - gr * 0.5], [cx, gy - gr * 0.2]], gemHi);
  // Two lesser stones either side.
  for (const dx of [-0.3, 0.3]) {
    const x = cx + dx * cw, r = gr * 0.5;
    poly(s, [[x - r, gy], [x, gy - r], [x + r, gy], [x, gy + r]], rgb('#3f6fb0'));
  }
  if (mono) {
    // Every painted pixel becomes solid white; the launcher supplies the colour.
    for (let i = 0; i < s.px.length; i += 4) {
      if (s.px[i + 3]) { s.px[i] = 255; s.px[i + 1] = 255; s.px[i + 2] = 255; s.px[i + 3] = 255; }
    }
  }
  return encodePng(size, size, s.px);
}

const out = path.join(ROOT, 'icons');
fs.mkdirSync(out, { recursive: true });
let count = 0;
for (const [name, size, pad] of [
  ['icon-192.png', 192, 0.06],
  ['icon-512.png', 512, 0.06],
  ['icon-maskable-512.png', 512, 0.17],  // Android crops maskable icons to a circle
  ['icon-64.png', 64, 0.04],
]) {
  fs.writeFileSync(path.join(out, name), icon(size, pad));
  count++;
}
console.log(`wrote ${count} web icons into icons/`);

// ------------------------------------------------- Android launcher icons
// Adaptive icons are 108dp with only the middle 72dp guaranteed visible, so the
// foreground layer is drawn small and on transparency; the background is a flat
// colour declared in resources.
const RES = path.join(ROOT, 'android/app/src/main/res');
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
if (fs.existsSync(path.join(ROOT, 'android'))) {
  let android = 0;
  for (const [d, k] of Object.entries(DENSITIES)) {
    const dir = path.join(RES, `mipmap-${d}`);
    fs.mkdirSync(dir, { recursive: true });
    // The legacy square icon, for Android before adaptive icons.
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), icon(Math.round(48 * k), 0.06));
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), icon(Math.round(48 * k), 0.14));
    // The adaptive foreground: 108dp canvas, art kept inside the safe circle.
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), icon(Math.round(108 * k), 0.28, true));
    // The monochrome layer for themed icons: Android keeps only the alpha and
    // tints it, so this is the foreground as a flat silhouette.
    fs.writeFileSync(path.join(dir, 'ic_launcher_monochrome.png'), icon(Math.round(108 * k), 0.28, true, true));
    android += 4;
  }
  console.log(`wrote ${android} Android launcher icons into android/app/src/main/res/`);
}
