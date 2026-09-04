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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/sprites.js'), 'utf8'), spriteCtx);
const TEMPLATES = vm.runInContext('SPRITE_TEMPLATES', spriteCtx);

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
  const pal = Object.assign({ s: '#f0c8a0', e: '#101010', w: '#f8f8f8', k: '#101010', d: '#3b7bd8' }, palette);
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
function icon(size, pad, transparent) {
  const s = surface(size);
  const inner = size * (1 - pad * 2);
  const y0 = size * pad;
  // Background: the game's night sky, lighter towards the top. An adaptive
  // foreground layer leaves this out and sits on the declared colour instead.
  if (!transparent) {
    for (let y = 0; y < size; y++) {
      const k = y / size;
      const c = [
        Math.round(0x1a + (0x0d - 0x1a) * k),
        Math.round(0x1c + (0x0e - 0x1c) * k),
        Math.round(0x2c + (0x18 - 0x2c) * k),
      ];
      s.rect(0, y, size, 1, c);
    }
  }
  const tw = inner * 0.52;
  const wall = inner * 0.10;
  const cx = size / 2;
  const cy = y0 + inner * 0.82;
  // A low step: one tile in front, one raised behind, to read as a height map.
  tile(s, cx - tw * 0.52, cy, tw, wall, rgb('#4a7d3a'), rgb('#3a6330'), rgb('#2f5228'));
  tile(s, cx + tw * 0.52, cy, tw, wall, rgb('#4a7d3a'), rgb('#3a6330'), rgb('#2f5228'));
  const stepY = cy - tw * 0.25 - wall;
  tile(s, cx, stepY, tw, wall, rgb('#5f9e4a'), rgb('#4a7d3a'), rgb('#3c6630'));
  // A knight standing on the raised tile, feet on its centre.
  const scale = Math.max(1, Math.round(inner / 34));
  drawSprite(s, 'warrior', g.JOBS.knight.palette, cx - 6 * scale, stepY - 18 * scale + 2, scale);
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
    android += 3;
  }
  console.log(`wrote ${android} Android launcher icons into android/app/src/main/res/`);
}
