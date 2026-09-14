#!/usr/bin/env node
/* Checks the data and the logic under plain Node, no dependencies.
   Usage: node tools/test.js */
import assert from 'node:assert/strict';
import { FOODS, FOOD_BY_ID, CATEGORIES } from '../js/foods.js';
import { RECIPES } from '../js/recipes.js';
import { normalize, singular, editDistance, detectFoods, rankRecipes } from '../js/match.js';
import { store, freshness } from '../js/inventory.js';
import { buildRequest, parseVisionItems, mergeDetections, DEFAULT_MODEL } from '../js/vision.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; } catch (e) { console.error(`FAIL ${name}\n  ${e.message}`); process.exitCode = 1; } };
const ids = (list) => list.map(f => f.id);

// ------------------------------------------------------------- data
test('food ids are unique and categories exist', () => {
  const seen = new Set();
  for (const f of FOODS) {
    assert.ok(!seen.has(f.id), `duplicate food id ${f.id}`);
    seen.add(f.id);
    assert.ok(CATEGORIES[f.category], `${f.id}: unknown category ${f.category}`);
    assert.ok(f.days > 0, `${f.id}: needs a shelf life`);
  }
});

test('aliases do not point at two foods', () => {
  const owner = new Map();
  for (const f of FOODS) for (const a of [f.name, ...f.aliases]) {
    const n = normalize(a);
    assert.ok(!owner.has(n) || owner.get(n) === f.id, `alias "${a}" claimed by ${owner.get(n)} and ${f.id}`);
    owner.set(n, f.id);
  }
});

test('every recipe ingredient is a known food', () => {
  const rids = new Set();
  for (const r of RECIPES) {
    assert.ok(!rids.has(r.id), `duplicate recipe ${r.id}`);
    rids.add(r.id);
    assert.ok(r.steps.length >= 1 && r.time > 0 && r.serves > 0, `${r.id}: incomplete`);
    const seen = new Set();
    for (const i of r.ingredients) {
      assert.ok(FOOD_BY_ID[i.food], `${r.id}: unknown ingredient ${i.food}`);
      assert.ok(!seen.has(i.food), `${r.id}: ${i.food} listed twice`);
      seen.add(i.food);
    }
    assert.ok(r.ingredients.some(i => !i.opt), `${r.id}: has no required ingredient`);
  }
});

test('every food is used by at least one recipe or is a plausible purchase', () => {
  const used = new Set();
  for (const r of RECIPES) for (const i of r.ingredients) used.add(i.food);
  const unused = FOODS.filter(f => !used.has(f.id)).map(f => f.id);
  // Things you buy and eat as they are; nothing cooks with them here.
  const allowed = new Set(['grapes', 'pear', 'orange', 'raspberry', 'pineapple', 'ice_cream', 'salt', 'coffee', 'tea', 'juice', 'jam', 'crackers', 'hummus', 'baked_beans', 'pickles', 'ketchup', 'bbq_sauce', 'worcestershire', 'pesto', 'oyster_sauce', 'puff_pastry', 'frozen_spinach', 'raisins', 'cardamom', 'five_spice', 'mustard_seed', 'ginger_powder', 'garlic_powder', 'nutmeg', 'quinoa', 'couscous', 'ground_pork', 'cream_cheese', 'pickles', 'shallot', 'kale', 'asparagus', 'mango', 'strawberry', 'dill', 'sausage', 'ham', 'tortilla', 'seeds', 'maple_syrup', 'vanilla', 'cocoa', 'salsa', 'tahini', 'miso']);
  const bad = unused.filter(id => !allowed.has(id));
  assert.deepEqual(bad, [], `foods no recipe uses: ${bad.join(', ')}`);
});

// ------------------------------------------------------------- normalising
test('normalize cleans OCR punctuation and digit confusion', () => {
  assert.equal(normalize('  TOMAT0ES, £1.20 '), 'tomatoes 1 20');
  assert.equal(normalize('Ch1cken*Breast'), 'chlcken breast'.replace('chlcken', 'chlcken')); // 1 between letters -> l
  assert.equal(normalize('crème fraîche'), 'creme fraiche');
});

test('singular handles the usual endings', () => {
  assert.equal(singular('tomatoes'), 'tomato');
  assert.equal(singular('berries'), 'berry');
  assert.equal(singular('eggs'), 'egg');
  assert.equal(singular('peas'), 'pea');
  assert.equal(singular('hummus'), 'hummus');
  assert.equal(singular('couscous'), 'couscous');
  assert.equal(singular('radishes'), 'radish');
});

test('editDistance counts transpositions as one', () => {
  assert.equal(editDistance('tomato', 'tomato'), 0);
  assert.equal(editDistance('tomato', 'tomaot'), 1);
  assert.equal(editDistance('tomato', 'tamoto', 2), 2);
  assert.equal(editDistance('abc', 'xyz', 1), 2);
});

// ------------------------------------------------------------- detection
test('detects clean labels', () => {
  const got = ids(detectFoods('Whole Milk\nLarge Eggs\nCheddar Cheese\nBananas'));
  assert.deepEqual(new Set(got), new Set(['milk', 'egg', 'cheddar', 'banana']));
});

test('longest phrase wins over its parts', () => {
  const got = detectFoods('sweet potatoes 1kg');
  assert.deepEqual(ids(got), ['sweet_potato']);
  const got2 = detectFoods('chopped tomatoes 400g');
  assert.deepEqual(ids(got2), ['canned_tomato']);
  const got3 = detectFoods('peanut butter');
  assert.deepEqual(ids(got3), ['peanut_butter']);
  const got4 = detectFoods('coconut milk');
  assert.deepEqual(ids(got4), ['coconut_milk']);
});

test('reads a receipt', () => {
  const receipt = `FRESHMART #2231
    CHKN BRST 1.2KG        7.99
    BASMATI RICE 1KG       2.49
    GREEK YOGHURT 500G     1.75
    RED ONIONS 3PK         0.89
    GARLIC                 0.50
    BABY SPINACH 200G      1.50
    CHOPPED TOMATOES x2    1.58
    TOTAL                 16.70
    CASH                  20.00
    CHANGE                 3.30
    THANK YOU FOR SHOPPING`;
  const got = ids(detectFoods(receipt));
  for (const want of ['chicken_breast', 'rice', 'yogurt', 'onion', 'garlic', 'spinach', 'canned_tomato']) {
    assert.ok(got.includes(want), `missing ${want} in ${got}`);
  }
  assert.ok(!got.includes('tomato'), 'chopped tomatoes must not also be fresh tomato');
  assert.ok(got.length <= 8, `too many guesses: ${got}`);
});

test('fuzzy pass recovers common OCR misreads', () => {
  const got = detectFoods('Chlcken Bananna Avocad0 Brocolli');
  const g = ids(got);
  assert.ok(g.includes('chicken_breast'), `chicken from chlcken: ${g}`);
  assert.ok(g.includes('banana'), `banana: ${g}`);
  assert.ok(g.includes('avocado'), `avocado: ${g}`);
  assert.ok(g.includes('broccoli'), `broccoli: ${g}`);
  for (const m of got) if (m.matched !== m.name.toLowerCase()) assert.ok(m.confidence < 1);
});

test('fuzzy pass does not fire on marketing words', () => {
  const got = ids(detectFoods('FRESH TOTAL VALUE ORGANIC LIGHT FAMILY PACK'));
  assert.deepEqual(got, []);
});

test('short and numeric tokens never fuzz', () => {
  assert.deepEqual(ids(detectFoods('1234 ab cd 500g 2x')), []);
});

test('reports the matched text and confidence', () => {
  const [m] = detectFoods('Two dozen eggs');
  assert.equal(m.id, 'egg');
  assert.equal(m.confidence, 1);
  assert.ok(m.matched.includes('eggs'));
});

// ------------------------------------------------------------- recipes
test('full pantry cooks the pasta, empty pantry cooks nothing', () => {
  const full = rankRecipes(RECIPES, ['pasta', 'canned_tomato', 'garlic', 'onion', 'olive_oil']);
  assert.equal(full[0].id, 'tomato_pasta');
  assert.ok(full[0].canCook);
  assert.equal(full[0].missing.length, 0);
  const empty = rankRecipes(RECIPES, []);
  assert.ok(empty.every(r => !r.canCook));
});

test('staples are assumed unless told otherwise', () => {
  // olive oil is a staple; without the assumption it is missing.
  const on = rankRecipes(RECIPES, ['pasta', 'canned_tomato', 'garlic', 'onion']).find(r => r.id === 'tomato_pasta');
  assert.ok(on.canCook);
  const off = rankRecipes(RECIPES, ['pasta', 'canned_tomato', 'garlic', 'onion'], { assumeStaples: false }).find(r => r.id === 'tomato_pasta');
  assert.ok(!off.canCook);
  assert.deepEqual(off.missing.map(i => i.food), ['olive_oil']);
});

test('nearly-there recipes rank by fewest missing', () => {
  const ranked = rankRecipes(RECIPES, ['egg', 'butter']);
  const omelette = ranked.find(r => r.id === 'omelette');
  assert.deepEqual(omelette.missing.map(i => i.food), ['cheddar']);
  const idx = ranked.indexOf(omelette);
  // Nothing above it may be missing more than it does, unless it is cookable.
  for (const r of ranked.slice(0, idx)) assert.ok(r.canCook || r.missing.length <= 1, `${r.id} ranked above omelette with ${r.missing.length} missing`);
});

test('flexible recipes need a couple of real ingredients', () => {
  const only_oil = rankRecipes(RECIPES, ['olive_oil']).find(r => r.id === 'roast_veg');
  assert.ok(!only_oil.canCook, 'a tray of nothing is not dinner');
  const veg = rankRecipes(RECIPES, ['olive_oil', 'potato', 'carrot']).find(r => r.id === 'roast_veg');
  assert.ok(veg.canCook);
});

test('a complete match that uses more of the pantry ranks higher', () => {
  const pantry = ['egg', 'butter', 'cheddar', 'bread', 'ham', 'mushroom', 'spring_onion', 'parsley'];
  const ranked = rankRecipes(RECIPES, pantry).filter(r => r.canCook).map(r => r.id);
  assert.ok(ranked.indexOf('omelette') < ranked.indexOf('grilled_cheese'), `${ranked}`);
});

// ------------------------------------------------------------- inventory
test('store adds, merges, consumes and shops', () => {
  store._reset();
  store.add({ id: 'egg', qty: 1, source: 'scan' });
  store.add({ id: 'egg', qty: 2, source: 'scan' });
  store.add({ name: 'Grandma\'s pickles', source: 'manual' });
  let s = store.get();
  assert.equal(s.items.length, 2);
  assert.equal(s.items[0].qty, 3);
  assert.equal(s.items[1].id, 'custom:grandma\'s_pickles');
  assert.equal(s.items[1].category, 'other');
  store.consume(['egg', 'milk']);
  assert.equal(store.get().items[0].qty, 2);
  store.setQty('egg', 0);
  assert.ok(!store.ids().includes('egg'));
  store.shop('milk', 'Milk');
  store.shop('milk', 'Milk');
  assert.equal(store.get().shopping.length, 1);
  store.bought('milk');
  assert.equal(store.get().shopping.length, 0);
  assert.ok(store.ids().includes('milk'));
  const json = store.export();
  store._reset();
  store.import(json);
  assert.ok(store.ids().includes('milk'));
  assert.throws(() => store.import('{"nope":1}'));
});

test('freshness follows shelf life', () => {
  const now = Date.now();
  const at = (daysAgo) => new Date(now - daysAgo * 86400000).toISOString();
  assert.equal(freshness({ days: 7, added: at(0) }, now), 'fresh');
  assert.equal(freshness({ days: 7, added: at(6) }, now), 'soon');
  assert.equal(freshness({ days: 7, added: at(8) }, now), 'past');
  assert.equal(freshness({ days: 720, added: at(0) }, now), null);
  assert.equal(freshness({ days: null, added: at(0) }, now), null);
});

// ------------------------------------------------------------- offline
test('the service worker precaches every script and stylesheet the page loads', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const listed = new Set([...sw.matchAll(/'([^']+\.(?:js|css|html|webmanifest|svg))'/g)].map(m => m[1]));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|webmanifest|svg))"/g)) {
    assert.ok(listed.has(m[1]), `index.html loads ${m[1]} but sw.js does not precache it`);
  }
  // Every module reachable from app.js, transitively.
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const m of src.matchAll(/from '\.\/([^']+)'/g)) walk('js/' + m[1]);
  };
  walk('js/app.js');
  for (const f of seen) assert.ok(listed.has(f), `${f} is imported but sw.js does not precache it; the installed app would fail to start offline`);
});

// ------------------------------------------------------------- vision
test('vision request carries the image, the schema and the fallback opt-in', () => {
  const { body, headers } = buildRequest({ imageBase64: 'QUJD', model: DEFAULT_MODEL });
  assert.equal(body.model, 'claude-opus-5');
  assert.equal(body.messages[0].content[0].type, 'image');
  assert.equal(body.messages[0].content[0].source.media_type, 'image/jpeg');
  assert.equal(body.messages[0].content[0].source.data, 'QUJD');
  assert.equal(body.output_config.format.type, 'json_schema');
  assert.ok(body.output_config.format.schema.properties.items);
  assert.equal(body.fallbacks, 'default');
  assert.equal(headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
  assert.equal(headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.ok(!('x-api-key' in headers), 'the key is added at send time, never baked into the request');
  assert.ok(body.system.includes('chicken breast'), 'dictionary names are offered to the model');
  const sonnet = buildRequest({ imageBase64: 'QUJD', model: 'claude-sonnet-5' });
  assert.ok(!('fallbacks' in sonnet.body) && !sonnet.headers['anthropic-beta']);
});

test('vision items map onto the dictionary, merge duplicates and keep unknowns', () => {
  const got = parseVisionItems({ items: [
    { name: 'tomatoes', quantity: 4, category: 'produce', confidence: 'high', label_text: '' },
    { name: 'tomato', quantity: 2, category: 'produce', confidence: 'medium', label_text: '' },
    { name: 'chopped tomatoes', quantity: 1, category: 'pantry', confidence: 'high', label_text: 'Napolina' },
    { name: 'kimchi', quantity: 1, category: 'other', confidence: 'medium', label_text: '' },
    { name: 'greek yogurt', quantity: 1, category: 'dairy', confidence: 'low', label_text: 'FAGE Total 5%' },
    { name: '', quantity: 1, category: 'other', confidence: 'high', label_text: '' },
    { name: 'mystery jar', quantity: 1, category: 'not-a-category', confidence: 'low', label_text: '' },
  ], notes: '' });
  const byName = Object.fromEntries(got.map(g => [g.name, g]));
  assert.equal(byName.Tomato.qty, 6, 'two tomato rows add up');
  assert.equal(byName.Tomato.confidence, 0.95);
  assert.equal(byName['Canned tomatoes'].id, 'canned_tomato');
  assert.equal(byName.Kimchi.id, null);
  assert.equal(byName.Kimchi.category, 'other');
  assert.equal(byName.Yogurt.id, 'yogurt');
  assert.equal(byName['Mystery jar'].category, 'other', 'unknown category falls back');
  assert.equal(got.length, 5);
  assert.ok(got.every(g => g.source === 'vision'));
  assert.deepEqual(parseVisionItems(null), []);
  assert.deepEqual(parseVisionItems({ items: 'nope' }), []);
});

test('merging keeps vision quantities and marks foods seen and read', () => {
  const vision = parseVisionItems({ items: [
    { name: 'lemon', quantity: 3, category: 'produce', confidence: 'high', label_text: '' },
    { name: 'butter', quantity: 1, category: 'dairy', confidence: 'medium', label_text: 'Lurpak' },
  ] });
  const ocr = detectFoods('LURPAK BUTTER 250g\nBASMATI RICE');
  const merged = mergeDetections(vision, ocr);
  const byId = Object.fromEntries(merged.map(m => [m.id, m]));
  assert.equal(byId.lemon.source, 'vision');
  assert.equal(byId.butter.source, 'both');
  assert.equal(byId.butter.confidence, 1);
  assert.equal(byId.rice.source, 'ocr');
  assert.equal(byId.rice.qty, 1);
  assert.equal(merged.length, 3);
});

console.log(process.exitCode ? `${passed} passed, some failed` : `all ${passed} tests passed`);
