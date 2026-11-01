/* Small hex-colour helpers shared by the sprite generator, the renderer and
   the effects layer. Each of those grew its own copy of "shift this colour
   by an amount" or "turn this hex into an rgba() string"; they now share one
   definition, loaded before any of them. */

function toRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Lighten or darken, as a CSS rgb() string.
function shift(hex, amt) {
  const [r, g, b] = toRgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

// The same nudge, kept as hex so a shading pass or a palette can still work on it.
function shiftHex(hex, amt) {
  const [r, g, b] = toRgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function darken(hex, amt) { return shift(hex, -amt); }

// Mix towards a tint, for elemental gear and cloth washes.
function tint(hex, toHex, k) {
  const a = toRgb(hex), b = toRgb(toHex);
  const m = (i) => Math.round(a[i] + (b[i] - a[i]) * k);
  const h = (v) => v.toString(16).padStart(2, '0');
  return `#${h(m(0))}${h(m(1))}${h(m(2))}`;
}

// A hex colour as a CSS rgba() string at the given alpha, for effects.
function rgba(hex, a) {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
