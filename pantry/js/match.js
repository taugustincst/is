/* Turning OCR text into foods, and foods into recipes.

   OCR output from a fridge shelf or a receipt is noisy: "TOMATOE5", "CHKN
   BRST", a price glued to a word. The matcher normalises the text, walks it in
   one- to three-word windows, and looks each window up against every alias in
   the dictionary. Exact hits score 1; a hit after stripping a plural ending
   scores a little less; a single-word hit within one edit of an alias scores
   less again, and only for words long enough that one edit still says
   something. The result is a de-duplicated list with the best confidence per
   food, so the cook can untick the guesses that were wrong. */

import { FOODS, FOOD_BY_ID } from './foods.js';

// ------------------------------------------------------------- normalising
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[éèê]/g, 'e').replace(/[àáâ]/g, 'a').replace(/[íìî]/g, 'i').replace(/[óòô]/g, 'o').replace(/[úùû]/g, 'u')
    // OCR reads 0/O and 1/l/I interchangeably inside words; unify digits that
    // sit between letters into the letter they were probably meant to be.
    .replace(/(?<=[a-z]{2})0(?=[a-z]|\b)/g, 'o')
    .replace(/(?<=[a-z])[1|](?=[a-z])/g, 'l')
    .replace(/(?<=[a-z]{2})5(?=[a-z]|\b)/g, 's')
    .replace(/[^a-z0-9%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(text) {
  return normalize(text).split(' ').filter(Boolean);
}

// Strip a plural or possessive ending. "tomatoes" -> "tomato", "berries" ->
// "berry", "eggs" -> "egg"; leaves short words and words ending in "ss" alone.
export function singular(word) {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('oes') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('ss') || word.endsWith('us') || word.endsWith('is')) return word;
  if (word.endsWith('es') && /(sh|ch|x|z)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

// Damerau-Levenshtein distance, capped: returns max+1 as soon as it is exceeded.
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  let prev2 = null;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[n];
}

// ------------------------------------------------------------- the index
// alias phrase (normalised) -> food id. Names are aliases of themselves.
const ALIAS = new Map();
// single-word aliases only, for fuzzy matching, bucketed by length
const WORDS = new Map();
// Words that appear on packaging but are not foods, so a fuzzy match to them
// should never fire. ("Total", "Fresh") — also prevents "fresh" -> "feta".
const STOP = new Set(['fresh', 'total', 'free', 'range', 'organic', 'natural', 'large', 'small', 'medium', 'pack', 'packs',
  'each', 'price', 'sale', 'save', 'offer', 'best', 'before', 'use', 'by', 'net', 'weight', 'per', 'item', 'items', 'cash', 'card',
  'change', 'thank', 'thanks', 'store', 'family', 'value', 'brand', 'select', 'choice', 'premium', 'extra', 'light', 'low', 'fat',
  'reduced', 'sugar', 'salt', 'the', 'and', 'with', 'for', 'new', 'original', 'classic', 'mini', 'maxi', 'grande', 'sweet', 'baby',
  'ready', 'cook', 'meal', 'deal', 'bag', 'box', 'tin', 'can', 'jar', 'bottle', 'pot', 'tub', 'love', 'life', 'plain', 'whole', 'wholegrain', 'mixed', 'red', 'green', 'white', 'black', 'yellow', 'dark', 'ground', 'dried', 'frozen', 'chopped', 'sliced', 'diced', 'crushed', 'smoked', 'roasted', 'salted', 'unsalted', 'skimmed', 'semi', 'lean']);

function addAlias(phrase, id) {
  const norm = normalize(phrase);
  if (!norm) return;
  if (!ALIAS.has(norm)) ALIAS.set(norm, id);
  if (!norm.includes(' ') && norm.length >= 4 && !STOP.has(norm)) {
    const bucket = WORDS.get(norm.length) || [];
    bucket.push([norm, id]);
    WORDS.set(norm.length, bucket);
  }
}

for (const f of FOODS) {
  addAlias(f.name, f.id);
  for (const a of f.aliases) addAlias(a, f.id);
}
// Singular forms of every single-word alias, so "bananas" and "banana" both
// land, and so the fuzzy pass compares like with like.
for (const [phrase, id] of [...ALIAS]) {
  if (!phrase.includes(' ')) {
    const s = singular(phrase);
    if (s !== phrase && !ALIAS.has(s)) ALIAS.set(s, id);
  }
}

// The stop list may not hide a real food: "sugar", "salt" and a few colour
// words are aliases too, and those must still match exactly. Only the fuzzy
// pass consults STOP.
const EXACT_ONLY_STOP = STOP;

// ------------------------------------------------------------- matching
export const CONF = { exact: 1, singular: 0.9, fuzzy: 0.65 };

/* Returns [{ id, name, category, confidence, matched }] sorted by confidence
   then name. `matched` is the text that caused the hit, for showing the cook. */
export function detectFoods(text) {
  const words = tokens(text);
  const found = new Map(); // id -> { confidence, matched }
  const record = (id, confidence, matched) => {
    const prev = found.get(id);
    if (!prev || confidence > prev.confidence) found.set(id, { confidence, matched });
  };

  // Longest windows first so "sweet potato" beats "potato" for the same span.
  const used = new Array(words.length).fill(false);
  for (const size of [3, 2, 1]) {
    for (let i = 0; i + size <= words.length; i++) {
      if (used.slice(i, i + size).some(Boolean)) continue;
      const span = words.slice(i, i + size);
      const phrase = span.join(' ');
      let id = ALIAS.get(phrase);
      let conf = CONF.exact;
      if (!id) {
        const sing = span.map(singular).join(' ');
        if (sing !== phrase) { id = ALIAS.get(sing); conf = CONF.singular; }
      }
      if (id) {
        record(id, conf, phrase);
        for (let k = i; k < i + size; k++) used[k] = true;
      }
    }
  }

  // Fuzzy pass over the single words nothing claimed.
  for (let i = 0; i < words.length; i++) {
    if (used[i]) continue;
    const w = singular(words[i]);
    if (w.length < 5 || /\d/.test(w) || EXACT_ONLY_STOP.has(w)) continue;
    // One edit for a word of five to seven letters, two for eight or more:
    // "brocolli" is two edits from broccoli and nothing else is close.
    const max = w.length >= 8 ? 2 : 1;
    let best = null;
    for (let len = w.length - max; len <= w.length + max; len++) {
      for (const [alias, id] of WORDS.get(len) || []) {
        const d = editDistance(w, alias, max);
        if (d <= max && (!best || d < best.d)) best = { id, d, alias };
      }
    }
    if (best) record(best.id, CONF.fuzzy, words[i]);
  }

  return [...found].map(([id, m]) => {
    const f = FOOD_BY_ID[id];
    return { id, name: f.name, category: f.category, confidence: m.confidence, matched: m.matched };
  }).sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
}

// ------------------------------------------------------------- recipes
/* Scores every recipe against a set of food ids in the pantry.
   `assumeStaples` treats salt, oil, flour and the like as always present.
   `urgent` is the set of food ids that need using soon; recipes that use
   them are lifted so tonight's dinner clears the shelf before the bin does.
   Returns recipes decorated with have/missing lists, the urgent foods each
   one uses, and a match ratio, sorted so complete matches come first, then
   fewest missing, then quickest. */
export function rankRecipes(recipes, pantryIds, { assumeStaples = true, urgent = [] } = {}) {
  const have = new Set(pantryIds);
  const urgentSet = new Set(urgent);
  const has = (food) => have.has(food) || (assumeStaples && FOOD_BY_ID[food]?.staple);
  return recipes.map(r => {
    const required = r.ingredients.filter(i => !i.opt);
    const optional = r.ingredients.filter(i => i.opt);
    const missing = required.filter(i => !has(i.food));
    const haveReq = required.filter(i => has(i.food));
    const haveOpt = optional.filter(i => has(i.food));
    const ratio = required.length ? haveReq.length / required.length : 1;
    // Recipes built out of optional choices (a tray of whatever vegetables)
    // need at least two of them to be worth suggesting.
    const flexible = optional.length >= 6 && haveOpt.length < 2;
    const usesUrgent = r.ingredients.filter(i => have.has(i.food) && urgentSet.has(i.food)).map(i => i.food);
    return {
      ...r,
      required, optional, missing, haveReq, haveOpt, ratio,
      flexible, usesUrgent,
      canCook: missing.length === 0 && !flexible,
      // Bonus for every ingredient the pantry really holds, so between two
      // complete matches the one that clears more shelf space wins, and a
      // recipe carried by assumed staples does not outrank one built from
      // what was actually scanned.
      // Using up something on its last day is worth more than any other
      // single ingredient, but never enough to lift an incomplete recipe over
      // one that can be cooked tonight.
      score: ratio * 100 + (haveReq.length + haveOpt.length) * 3 + usesUrgent.length * 10 - (flexible ? 50 : 0) - r.time / 60,
    };
  }).sort((a, b) => b.score - a.score || a.missing.length - b.missing.length || a.time - b.time);
}

// Items in the pantry that no ranked-cookable recipe uses: what to shop around.
export function orphanFoods(ranked, pantryIds) {
  const used = new Set();
  for (const r of ranked) if (r.canCook) for (const i of r.ingredients) used.add(i.food);
  return pantryIds.filter(id => !used.has(id));
}
