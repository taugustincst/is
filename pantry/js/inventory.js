/* The pantry itself: a list of items in localStorage, plus the shopping list
   and a couple of preferences. Every mutation writes through and notifies
   listeners, so the UI re-renders from one source of truth. */

import { FOOD_BY_ID, CATEGORIES } from './foods.js';

const CATEGORY_IDS = new Set(Object.keys(CATEGORIES));

const KEY = 'pantry-scan:v1';
const DAY = 86400000;

const capitalise = (t) => t.charAt(0).toUpperCase() + t.slice(1);

const defaults = () => ({ items: [], shopping: [], prefs: { assumeStaples: true, diet: 'any' } });

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    return { ...defaults(), ...parsed, prefs: { ...defaults().prefs, ...(parsed.prefs || {}) } };
  } catch { return defaults(); }
}

function save() {
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(state)); } catch { /* private mode; keep going in memory */ }
  for (const fn of listeners) fn(state);
}

export const store = {
  get() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /* Add a food. Adding something already present bumps its quantity and
     refreshes its date, which is what happens when you buy more of it.
     `seen` means the item was spotted in a photo of the fridge or shelf
     rather than bought: the same old milk, not a new one. Then the count is
     brought up to what was seen and the date is left alone, so scanning the
     fridge never makes everything in it look fresh. */
  add({ id, name, qty = 1, source = 'manual', category, seen = false } = {}) {
    const food = id && FOOD_BY_ID[id];
    const itemId = food ? food.id : 'custom:' + String(name).trim().toLowerCase().replace(/\s+/g, '_');
    const existing = state.items.find(i => i.id === itemId);
    const now = new Date().toISOString();
    if (existing && seen) {
      existing.qty = Math.min(99, Math.max(existing.qty, qty));
    } else if (existing) {
      existing.qty = Math.min(99, existing.qty + qty);
      existing.added = now;
    } else {
      state.items.push({
        id: itemId,
        name: food ? food.name : capitalise(String(name).trim()),
        category: food ? food.category : (category || 'other'),
        qty,
        added: now,
        source,
        days: food ? food.days : null,
      });
    }
    save();
    return itemId;
  },

  addMany(list, source) {
    for (const it of list) this.add({ ...it, source });
  },

  setQty(id, qty) {
    const it = state.items.find(i => i.id === id);
    if (!it) return;
    if (qty <= 0) state.items = state.items.filter(i => i.id !== id);
    else it.qty = qty;
    save();
  },

  /* Edit an item: its name or category (custom items only keep their own),
     how many days it keeps, or mark it bought fresh today. */
  update(id, { name, category, days, fresh } = {}) {
    const it = state.items.find(i => i.id === id);
    if (!it) return;
    if (name != null && String(name).trim()) it.name = String(name).trim();
    if (category && CATEGORY_IDS.has(category)) it.category = category;
    if (days !== undefined) it.days = days == null || days === '' ? null : Math.max(1, Math.min(9999, Math.round(Number(days)) || 1));
    if (fresh) it.added = new Date().toISOString();
    save();
  },

  remove(id) { state.items = state.items.filter(i => i.id !== id); save(); },
  clear() { state.items = []; save(); },

  /* Cooking a recipe uses up one of each ingredient it actually had. Optional
     ingredients that are present go too; those the cook lacked are skipped. */
  consume(foodIds) {
    for (const id of foodIds) {
      const it = state.items.find(i => i.id === id);
      if (it) it.qty -= 1;
    }
    state.items = state.items.filter(i => i.qty > 0);
    save();
  },

  ids() { return state.items.map(i => i.id); },

  // ---- shopping list
  shop(id, name) {
    if (!state.shopping.some(s => s.id === id)) state.shopping.push({ id, name });
    save();
  },
  unshop(id) { state.shopping = state.shopping.filter(s => s.id !== id); save(); },
  /* Bought it: move from the list into the pantry. */
  bought(id) {
    const s = state.shopping.find(x => x.id === id);
    if (!s) return;
    this.unshop(id);
    this.add({ id: FOOD_BY_ID[id] ? id : undefined, name: s.name, source: 'shopping' });
  },
  clearShopping() { state.shopping = []; save(); },

  setPref(k, v) { state.prefs[k] = v; save(); },

  // ---- export / import so a pantry can move between phones
  export() { return JSON.stringify(state, null, 2); },
  import(json) {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed.items)) throw new Error('Not a pantry file');
    state = { ...defaults(), ...parsed };
    save();
  },
  /* Only for tests. */
  _reset() { state = defaults(); save(); },
};

/* How fresh an item is, from its added date and typical life:
   'fresh' | 'soon' (within 2 days or 25% of life) | 'past'. Null for keepers. */
export function freshness(item, now = Date.now()) {
  if (!item.days || item.days > 400) return null;
  const age = (now - new Date(item.added).getTime()) / DAY;
  const left = item.days - age;
  if (left < 0) return 'past';
  if (left <= Math.max(2, item.days * 0.25)) return 'soon';
  return 'fresh';
}

export function daysLeft(item, now = Date.now()) {
  if (!item.days) return null;
  return Math.round(item.days - (now - new Date(item.added).getTime()) / DAY);
}
