#!/usr/bin/env node
/* Draws the Android launcher icons for API 24 and 25, which predate adaptive
   icons, as PNGs. No image library: shapes are rasterised with a supersampled
   coverage test and encoded with Node's zlib. API 26+ uses the vector
   drawables in res/drawable instead.

   Usage: node tools/make-android-icons.js */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RES = path.join(ROOT, 'android/app/src/main/res');

// ---------------------------------------------------------------- PNG writer
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return (buf) => { let c = -1; for (const b of buf) c = CRC_T[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
})();
const CRC_T = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- rasteriser
// Shapes are functions (x, y) -> inside, in a 128-unit design space matching
// icons/icon.svg. Painted in order with 4x4 supersampling.
const rrect = (x, y, w, h, r) => (px, py) => {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.max(x + r, Math.min(px, x + w - r)), cy = Math.max(y + r, Math.min(py, y + h - r));
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
};
const circle = (cx, cy, r) => (px, py) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

const CREAM = hex('#fbf7f0'), GREEN = hex('#2f6b3a'), TOMATO = hex('#d9472b'), SHINE = hex('#f4a08b'), LEAF = hex('#3f9a4a');

function layers(kind) {
  const L = [];
  if (kind === 'square') L.push([rrect(8, 8, 112, 112, 26), GREEN]);
  if (kind === 'round') L.push([circle(64, 64, 60), GREEN]);
  const scale = kind === 'foreground' ? 0.62 : 1; // adaptive safe zone
  const t = (fn) => (px, py) => fn((px - 64) / scale + 64, (py - 64) / scale + 64);
  L.push([t(rrect(26, 42, 76, 52, 10)), CREAM]);
  L.push([t(rrect(48, 32, 32, 14, 5)), CREAM]);
  L.push([t(circle(64, 68, 18)), TOMATO]);
  L.push([t(circle(58, 62, 5)), SHINE]);
  L.push([t((x, y) => y > 40 && y < 51 && x > 56 && x < 71 && (x - 56) < (51 - y) * 3), LEAF]);
  return L;
}

function render(size, kind) {
  const buf = Buffer.alloc(size * size * 4);
  const L = layers(kind);
  const SS = 4;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const px = (x + (sx + 0.5) / SS) * 128 / size, py = (y + (sy + 0.5) / SS) * 128 / size;
      let col = null;
      for (const [fn, c] of L) if (fn(px, py)) col = c;
      if (col) { r += col[0]; g += col[1]; b += col[2]; a += 255; }
    }
    const n = SS * SS, i = (y * size + x) * 4;
    if (a) { const cov = a / 255; buf[i] = r / cov; buf[i + 1] = g / cov; buf[i + 2] = b / cov; buf[i + 3] = a / n; }
  }
  return png(size, size, buf);
}

const DPI = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [d, px] of Object.entries(DPI)) {
  const dir = path.join(RES, `mipmap-${d}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), render(px, 'square'));
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), render(px, 'round'));
  console.log(`mipmap-${d}: ${px}px`);
}
