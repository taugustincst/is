/* Scaling recipe amounts to a different number of servings.

   Amounts are written for people, not parsers: "400 g", "2 cloves", "1 can
   (400 g)", "1/2 red", "1–2 tsp", "2 + 1 yolk", "a handful", "to serve".
   The rule is to scale the numbers that lead the string and leave every word
   alone, so "1 can (400 g)" at double becomes "2 cans (400 g)" is *not*
   attempted: it becomes "2 can (400 g)", which a cook reads correctly. Vague
   amounts pass through untouched. */

const VULGAR = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

/* "1/2" -> 0.5, "1 1/2" -> 1.5, "1½" -> 1.5, "2" -> 2, "0.5" -> 0.5 */
function parseNumber(text) {
  const t = text.trim();
  const frac = /^(?:(\d+)\s+)?(\d+)\/(\d+)/.exec(t);
  if (frac) return { value: (frac[1] ? Number(frac[1]) : 0) + Number(frac[2]) / Number(frac[3]), length: frac[0].length };
  const m = /^(\d+(?:\.\d+)?)?\s*([¼½¾⅓⅔])?/.exec(t);
  if (m[1] == null && m[2] == null) return null;
  const value = (m[1] ? Number(m[1]) : 0) + (m[2] ? VULGAR[m[2]] : 0);
  return { value, length: m[0].trimEnd().length };
}

/* Render a number the way a recipe would: 0.5 -> "½", 1.5 -> "1½", 2.6667 -> "2⅔",
   0.33 -> "⅓", 250 -> "250", 1.2 -> "1.2" */
export function formatNumber(n) {
  if (n <= 0) return '0';
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  const near = (a, b) => Math.abs(a - b) < 0.04;
  let f = '';
  if (near(frac, 0)) f = '';
  else if (near(frac, 0.25)) f = '¼';
  else if (near(frac, 0.5)) f = '½';
  else if (near(frac, 0.75)) f = '¾';
  else if (near(frac, 1 / 3)) f = '⅓';
  else if (near(frac, 2 / 3)) f = '⅔';
  else return String(Math.round(n * 10) / 10);
  if (!f) return String(whole);
  return whole ? `${whole}${f}` : f;
}

/* Scale the leading numbers of an amount string by `factor`. Handles a
   range ("1–2 tsp"), an addition ("2 + 1 yolk") and a fraction, and leaves
   any bracketed pack size and every word as they were. */
export function scaleAmount(amount, factor) {
  if (!amount || factor === 1) return amount || '';
  let out = '';
  let rest = amount;
  let scaledAny = false;
  // Scale a run of numbers joined by a dash or a plus at the start.
  for (;;) {
    const lead = /^\s*/.exec(rest)[0];
    const n = parseNumber(rest.slice(lead.length));
    if (!n) break;
    out += lead + formatNumber(n.value * factor);
    rest = rest.slice(lead.length + n.length);
    scaledAny = true;
    const joiner = /^\s*(–|-|\+|to)\s*(?=[\d¼½¾⅓⅔])/.exec(rest);
    if (!joiner) break;
    out += joiner[0];
    rest = rest.slice(joiner[0].length);
  }
  if (!scaledAny) return amount;
  // Round weights and volumes to sensible steps.
  const unit = /^\s*(g|ml)\b/.exec(rest);
  if (unit) {
    const value = Number(out.trim().replace(/[¼½¾⅓⅔]/g, ''));
    if (Number.isFinite(value) && value >= 20) out = String(Math.round(value / 5) * 5);
  }
  return out + rest;
}
