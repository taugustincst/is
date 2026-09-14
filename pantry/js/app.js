/* Pantry Scan: wires the camera, the recogniser, the pantry and the recipes
   into four tabs. Everything renders from the store; the store notifies on
   every change, so no view holds state of its own beyond what is being typed. */

import { FOODS, FOOD_BY_ID, CATEGORIES } from './foods.js';
import { RECIPES } from './recipes.js';
import { detectFoods, rankRecipes } from './match.js';
import { store, freshness, daysLeft } from './inventory.js';
import { preprocess, recognize, loadLibrary } from './ocr.js';
import { identify, mergeDetections, MODELS, DEFAULT_MODEL, VisionError } from './vision.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, attrs = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
};

// ------------------------------------------------------------- toast
let toastTimer;
function toast(msg, ms = 2400) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

// ------------------------------------------------------------- tabs
function show(view) {
  for (const b of $$('.tab')) b.classList.toggle('active', b.dataset.view === view);
  for (const v of $$('.view')) v.classList.toggle('active', v.id === 'view-' + view);
  if (view !== 'scan') stopCamera();
  window.scrollTo({ top: 0 });
  try { sessionStorage.setItem('pantry-scan:view', view); } catch { /* fine */ }
}
for (const b of $$('.tab')) b.addEventListener('click', () => show(b.dataset.view));
document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-goto]');
  if (go) show(go.dataset.goto);
});

// ------------------------------------------------------------- datalist
const dl = $('#food-list');
for (const f of FOODS) dl.append(el('option', { value: f.name }));

/* Resolve typed text to a dictionary food when it clearly is one, otherwise
   keep it as a custom item under the cook's own name. */
function resolveTyped(text) {
  const t = text.trim();
  if (!t) return null;
  const hit = detectFoods(t);
  if (hit.length === 1 && hit[0].confidence >= 0.9) return { id: hit[0].id };
  const exact = FOODS.find(f => f.name.toLowerCase() === t.toLowerCase());
  if (exact) return { id: exact.id };
  return { name: t };
}

// ------------------------------------------------------------- scanning
const cam = $('#cam');
const preview = $('#preview');
const scanEmpty = $('#scan-empty');
const progress = $('#scan-progress');
const btnCamera = $('#btn-camera');
const btnShutter = $('#btn-shutter');
const btnRetake = $('#btn-retake');
const fileInput = $('#file-input');
const results = $('#scan-results');
let stream = null;
let detected = []; // [{ id, name, confidence, matched, qty, on }]

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('No camera access in this browser. Use "Choose photo" instead.');
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
      audio: false,
    });
  } catch (e) {
    toast(e.name === 'NotAllowedError' ? 'Camera permission was refused. You can still choose a photo.' : 'Could not open the camera. Try "Choose photo".');
    return;
  }
  cam.srcObject = stream;
  cam.hidden = false; preview.hidden = true; scanEmpty.hidden = true; results.hidden = true;
  btnCamera.hidden = true; btnShutter.hidden = false; btnRetake.hidden = true;
  await cam.play().catch(() => {});
}

function stopCamera() {
  if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; }
  cam.srcObject = null; cam.hidden = true;
  btnShutter.hidden = true;
  btnCamera.hidden = !preview.hidden ? true : false;
}

function resetScan() {
  stopCamera();
  preview.hidden = true; scanEmpty.hidden = false; results.hidden = true; btnRetake.hidden = true; btnCamera.hidden = false;
  fileInput.value = '';
}

btnCamera.addEventListener('click', startCamera);
btnRetake.addEventListener('click', resetScan);
btnShutter.addEventListener('click', () => {
  if (!cam.videoWidth) { toast('Camera is still starting…'); return; }
  const canvas = preprocess(cam, { enhance: false });
  stopCamera();
  scan(canvas);
});
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  stopCamera();
  try {
    const bmp = await loadImage(file);
    scan(bmp);
  } catch { toast('Could not read that image.'); }
});

async function loadImage(file) {
  if (globalThis.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall through */ }
  }
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); res(img); };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

let scanning = false;
async function scan(source) {
  if (scanning) return;
  scanning = true;
  // Show the cook what was captured, in colour, while the recogniser works on
  // the cleaned-up copy.
  const shown = preprocess(source, { enhance: false, maxEdge: 1600 });
  preview.width = shown.width; preview.height = shown.height;
  preview.getContext('2d').drawImage(shown, 0, 0);
  preview.hidden = false; scanEmpty.hidden = true; results.hidden = true;
  btnCamera.hidden = true; btnShutter.hidden = true; btnRetake.hidden = false;
  setProgress('Preparing image…', 0.02);
  progress.hidden = false;

  const { apiKey, model } = visionPrefs();
  const useVision = Boolean(apiKey);
  let visionResult = null;
  let visionError = null;
  let ocrDone = false;
  const ocrLabel = (m) => ({
    'loading tesseract core': 'Loading text reader…', 'initializing tesseract': 'Starting text reader…',
    'loading language traineddata': 'Loading English model…', 'initializing api': 'Warming up…',
    'recognizing text': 'Reading text…',
  }[m.status] || m.status || 'Working…');

  try {
    // Vision and OCR run side by side: Claude identifies what things are,
    // Tesseract reads labels and receipts. Either alone is still useful.
    const visionTask = useVision
      ? identify(preprocess(source, { enhance: false }), { apiKey, model })
        .then(r => { visionResult = r; }, e => { visionError = e; })
      : Promise.resolve();
    if (useVision) setProgress('Asking Claude what it sees…', 0.15);

    const clean = preprocess(source);
    const ocrTask = recognize(clean, (m) => {
      if (m.status === 'recognizing text') setProgress(useVision && !visionResult ? `Reading text… ${Math.round((m.progress || 0) * 100)}%` : ocrLabel(m), 0.3 + 0.7 * (m.progress || 0));
      else setProgress(ocrLabel(m), 0.1 + 0.2 * (m.progress || 0));
    }).then(r => { ocrDone = true; return r; }, () => ({ text: '', confidence: 0 }));

    const [ocr] = await Promise.all([ocrTask, visionTask]);
    progress.hidden = true;
    $('#ocr-text').value = ocr.text.trim();
    const ocrItems = detectFoods(ocr.text);
    const notes = $('#vision-notes');
    if (visionResult) {
      $('#ocr-confidence').textContent = `${visionResult.items.length} seen · ${ocrItems.length} read`;
      notes.hidden = !visionResult.notes;
      notes.textContent = visionResult.notes;
      showDetected(mergeDetections(visionResult.items, ocrItems));
    } else {
      $('#ocr-confidence').textContent = ocr.confidence ? `text confidence ${Math.round(ocr.confidence)}%` : '';
      notes.hidden = !visionError;
      notes.textContent = visionError ? `Claude could not help this time: ${visionError.message}` : '';
      showDetected(ocrItems);
      if (!ocrDone && !visionResult) toast('Text recognition failed. You can still type what you have.', 4000);
    }
    $('.ocr-text').open = false;
  } catch (e) {
    progress.hidden = true;
    toast(e.message || 'Recognition failed.', 5000);
    $('#ocr-text').value = '';
    $('#ocr-confidence').textContent = 'recogniser unavailable';
    showDetected([]);
    $('.ocr-text').open = true;
  } finally {
    scanning = false;
  }
}

function setProgress(label, frac) {
  $('#progress-text').textContent = label;
  $('#progress-fill').style.width = `${Math.round(Math.min(1, Math.max(0, frac)) * 100)}%`;
}

function showDetected(list) {
  detected = list.map(m => ({ ...m, qty: m.qty || 1, on: m.confidence >= 0.9 }));
  results.hidden = false;
  renderDetected();
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderDetected() {
  const ul = $('#detected');
  ul.replaceChildren();
  $('#none-found').hidden = detected.length > 0;
  for (const d of detected) {
    const chip = el('li', { class: `chip${d.on ? '' : ' off'}${d.confidence < 0.9 ? ' guess' : ''}`, title: `read as "${d.matched}"` },
      el('input', { type: 'checkbox', checked: d.on, 'aria-label': `Add ${d.name}`, onchange: (e) => { d.on = e.target.checked; renderDetected(); } }),
      el('span', {}, d.name, d.source === 'vision' ? el('span', { class: 'src', title: 'seen by Claude' }, ' 👁') : d.source === 'both' ? el('span', { class: 'src', title: 'seen and read' }, ' 👁📄') : null),
      el('span', { class: 'qty' },
        el('button', { type: 'button', 'aria-label': 'fewer', onclick: () => { d.qty = Math.max(1, d.qty - 1); renderDetected(); } }, '−'),
        el('span', {}, String(d.qty)),
        el('button', { type: 'button', 'aria-label': 'more', onclick: () => { d.qty = Math.min(20, d.qty + 1); renderDetected(); } }, '+'),
      ),
    );
    ul.append(chip);
  }
  const n = detected.filter(d => d.on).length;
  const btn = $('#btn-add-detected');
  btn.disabled = n === 0;
  btn.textContent = n ? `Add ${n} to pantry` : 'Add to pantry';
}

$('#btn-select-all').addEventListener('click', () => { for (const d of detected) d.on = true; renderDetected(); });
$('#btn-select-none').addEventListener('click', () => { for (const d of detected) d.on = false; renderDetected(); });
$('#btn-redetect').addEventListener('click', () => showDetected(detectFoods($('#ocr-text').value)));
$('#btn-add-detected').addEventListener('click', () => {
  const chosen = detected.filter(d => d.on);
  store.addMany(chosen.map(d => ({ id: d.id || undefined, name: d.name, category: d.category, qty: d.qty })), 'scan');
  toast(`Added ${chosen.length} item${chosen.length === 1 ? '' : 's'} to the pantry`);
  resetScan();
  show('pantry');
});

$('#quick-add').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#quick-name');
  const r = resolveTyped(input.value);
  if (!r) return;
  store.add({ ...r, source: 'manual' });
  toast(`Added ${r.id ? FOOD_BY_ID[r.id].name : r.name}`);
  input.value = '';
  input.focus();
});

// ------------------------------------------------------------- pantry
$('#pantry-search').addEventListener('input', renderPantry);
$('#btn-clear-pantry').addEventListener('click', () => {
  if (store.get().items.length && confirm('Empty the whole pantry?')) { store.clear(); toast('Pantry emptied'); }
});

const CATEGORY_ORDER = ['produce', 'dairy', 'meat', 'frozen', 'grain', 'pantry', 'condiment', 'spice', 'other'];

function renderPantry() {
  const { items } = store.get();
  const q = $('#pantry-search').value.trim().toLowerCase();
  const shown = q ? items.filter(i => i.name.toLowerCase().includes(q)) : items;
  $('#pantry-empty').hidden = items.length > 0;
  $('#pantry-search').parentElement.hidden = items.length === 0;

  // Use soon
  const soon = items.map(i => ({ i, f: freshness(i) })).filter(x => x.f === 'soon' || x.f === 'past')
    .sort((a, b) => daysLeft(a.i) - daysLeft(b.i));
  $('#use-soon').hidden = soon.length === 0 || q.length > 0;
  $('#use-soon-list').replaceChildren(...soon.map(({ i, f }) => {
    const d = daysLeft(i);
    return el('li', {}, el('span', {}, i.name), el('b', {}, f === 'past' ? `probably past it` : d <= 0 ? 'use today' : `${d} day${d === 1 ? '' : 's'} left`));
  }));

  const groups = $('#pantry-groups');
  groups.replaceChildren();
  for (const cat of CATEGORY_ORDER) {
    const list = shown.filter(i => i.category === cat).sort((a, b) => a.name.localeCompare(b.name));
    if (!list.length) continue;
    groups.append(el('section', { class: 'group' },
      el('h3', {}, CATEGORIES[cat] || cat),
      el('ul', { class: 'plain' }, list.map(itemRow)),
    ));
  }
  if (q && !shown.length) groups.append(el('p', { class: 'muted' }, 'Nothing matches.'));
}

function itemRow(i) {
  const f = freshness(i);
  const d = daysLeft(i);
  const sub = f === 'past' ? 'past its usual life' : f === 'soon' ? (d <= 0 ? 'use today' : `use within ${d} day${d === 1 ? '' : 's'}`) : `added ${relDate(i.added)}`;
  return el('li', { class: 'item' },
    el('div', {}, el('span', { class: 'name' }, i.name), el('span', { class: `sub ${f || ''}` }, sub)),
    el('span', { class: 'stepper' },
      el('button', { 'aria-label': `one less ${i.name}`, onclick: () => store.setQty(i.id, i.qty - 1) }, '−'),
      el('span', {}, String(i.qty)),
      el('button', { 'aria-label': `one more ${i.name}`, onclick: () => store.setQty(i.id, i.qty + 1) }, '+'),
    ),
    el('button', { class: 'icon-btn remove', 'aria-label': `remove ${i.name}`, onclick: () => { store.remove(i.id); toast(`Removed ${i.name}`); } }, '✕'),
  );
}

function relDate(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 7 ? `${days} days ago` : new Date(iso).toLocaleDateString();
}

// ------------------------------------------------------------- recipes
$('#diet').addEventListener('change', (e) => { store.setPref('diet', e.target.value); });
$('#quick-only').addEventListener('change', renderRecipes);

function currentRanking() {
  const { prefs } = store.get();
  const ids = store.ids();
  let list = RECIPES;
  if (prefs.diet === 'vegetarian') list = list.filter(r => r.tags.includes('vegetarian') || r.tags.includes('vegan'));
  if (prefs.diet === 'vegan') list = list.filter(r => r.tags.includes('vegan'));
  if ($('#quick-only').checked) list = list.filter(r => r.time <= 30);
  return rankRecipes(list, ids, { assumeStaples: prefs.assumeStaples });
}

function renderRecipes() {
  const { items, prefs } = store.get();
  $('#diet').value = prefs.diet;
  $('#recipes-empty').hidden = items.length > 0;
  const ranked = items.length ? currentRanking() : [];
  const now = ranked.filter(r => r.canCook);
  const almost = ranked.filter(r => !r.canCook && !r.flexible && r.missing.length > 0 && r.missing.length <= 2 && r.haveReq.length > 0);
  const ideas = ranked.filter(r => !now.includes(r) && !almost.includes(r) && (r.haveReq.length + r.haveOpt.length) >= 2).slice(0, 8);
  fillGroup('#recipes-now', now);
  fillGroup('#recipes-almost', almost);
  fillGroup('#recipes-ideas', ideas);
  const badge = $('#count-recipes');
  badge.hidden = now.length === 0; badge.textContent = String(now.length);
  if (items.length && !now.length && !almost.length && !ideas.length) {
    $('#recipes-now').hidden = false;
    $('#recipes-now .cards').replaceChildren(el('p', { class: 'muted' }, 'Nothing matches those filters yet. Add a few more staples or loosen the filters.'));
  }
}

function fillGroup(sel, list) {
  const sec = $(sel);
  sec.hidden = list.length === 0;
  $('.cards', sec).replaceChildren(...list.map(recipeCard));
}

function recipeCard(r) {
  const uses = r.haveReq.length + r.haveOpt.length;
  return el('button', { class: 'recipe', onclick: () => openRecipe(r.id) },
    el('span', { class: 'title' }, r.name),
    el('span', { class: 'meta' }, el('span', {}, `⏱ ${r.time} min`), el('span', {}, `🍽 serves ${r.serves}`)),
    r.missing.length
      ? el('span', { class: 'missing' }, `Missing: ${r.missing.map(i => FOOD_BY_ID[i.food].name.toLowerCase()).join(', ')}`)
      : r.flexible && !r.canCook
        ? el('span', { class: 'missing' }, 'Needs a few more of the optional ingredients')
        : el('span', { class: 'uses' }, `Uses ${uses} thing${uses === 1 ? '' : 's'} you have`),
    r.tags.length ? el('span', { class: 'tags' }, r.tags.slice(0, 3).map(t => el('span', { class: 'tag' }, t))) : null,
  );
}

const dialog = $('#recipe-dialog');
let openId = null;
function openRecipe(id) {
  const r = currentRanking().find(x => x.id === id) || rankRecipes(RECIPES, store.ids(), { assumeStaples: store.get().prefs.assumeStaples }).find(x => x.id === id);
  if (!r) return;
  openId = id;
  $('#recipe-title').textContent = r.name;
  $('#recipe-meta').textContent = `${r.time} minutes · serves ${r.serves}${r.tags.length ? ' · ' + r.tags.join(', ') : ''}`;
  const have = new Set(store.ids());
  const staple = (food) => store.get().prefs.assumeStaples && FOOD_BY_ID[food].staple;
  $('#recipe-ingredients').replaceChildren(...r.ingredients.map(i => {
    const got = have.has(i.food) || staple(i.food);
    const cls = got ? '' : i.opt ? 'optional-missing' : 'missing';
    return el('li', { class: cls },
      el('span', {}, FOOD_BY_ID[i.food].name, i.opt ? el('span', { class: 'muted' }, ' (optional)') : null, !have.has(i.food) && staple(i.food) ? el('span', { class: 'muted' }, ' (staple)') : null),
      el('span', { class: 'amount' }, i.amount),
    );
  }));
  $('#recipe-steps').replaceChildren(...r.steps.map(s => el('li', {}, s)));
  $('#btn-cooked').disabled = !r.canCook && r.missing.length > 0;
  $('#btn-shop-missing').hidden = r.missing.length === 0;
  $('#btn-shop-missing').textContent = `Add ${r.missing.length} missing to list`;
  dialog.showModal();
}

$('#btn-cooked').addEventListener('click', () => {
  const r = RECIPES.find(x => x.id === openId);
  if (!r) return;
  const have = new Set(store.ids());
  const used = r.ingredients.map(i => i.food).filter(f => have.has(f));
  store.consume(used);
  dialog.close();
  toast(`Enjoy! Took ${used.length} item${used.length === 1 ? '' : 's'} off the pantry.`);
});
$('#btn-shop-missing').addEventListener('click', () => {
  const r = currentRanking().find(x => x.id === openId);
  if (!r) return;
  for (const i of r.missing) store.shop(i.food, FOOD_BY_ID[i.food].name);
  dialog.close();
  toast(`Added ${r.missing.length} to the shopping list`);
});

// ------------------------------------------------------------- shopping
function renderShop() {
  const { shopping } = store.get();
  $('#shop-empty').hidden = shopping.length > 0;
  $('#shop-list').replaceChildren(...shopping.map(s => el('li', { class: 'item' },
    el('label', { class: 'check' }, el('input', { type: 'checkbox', onchange: () => { store.bought(s.id); toast(`${s.name} moved to the pantry`); } }), el('span', { class: 'name' }, s.name)),
    el('span'),
    el('button', { class: 'icon-btn remove', 'aria-label': `remove ${s.name}`, onclick: () => store.unshop(s.id) }, '✕'),
  )));
  const badge = $('#count-shop');
  badge.hidden = shopping.length === 0; badge.textContent = String(shopping.length);
}
$('#btn-clear-shop').addEventListener('click', () => { store.clearShopping(); });
$('#shop-add').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#shop-name');
  const r = resolveTyped(input.value);
  if (!r) return;
  const id = r.id || 'custom:' + r.name.toLowerCase().replace(/\s+/g, '_');
  store.shop(id, r.id ? FOOD_BY_ID[r.id].name : r.name);
  input.value = '';
});

// ------------------------------------------------------------- settings
const settings = $('#settings-dialog');
const KEY_STORE = 'pantry-scan:anthropic';
function visionPrefs() {
  try {
    const raw = localStorage.getItem(KEY_STORE);
    const p = raw ? JSON.parse(raw) : {};
    return { apiKey: (p.apiKey || '').trim(), model: MODELS.some(m => m.id === p.model) ? p.model : DEFAULT_MODEL };
  } catch { return { apiKey: '', model: DEFAULT_MODEL }; }
}
function saveVisionPrefs(p) {
  try { localStorage.setItem(KEY_STORE, JSON.stringify(p)); } catch { /* fine */ }
  updateScanHint();
}
for (const m of MODELS) $('#pref-model').append(el('option', { value: m.id }, m.name));
$('#btn-settings').addEventListener('click', () => {
  $('#pref-staples').checked = store.get().prefs.assumeStaples;
  const p = visionPrefs();
  $('#pref-api-key').value = p.apiKey;
  $('#pref-model').value = p.model;
  updateKeyStatus();
  settings.showModal();
});
$('#pref-api-key').addEventListener('input', () => { saveVisionPrefs({ apiKey: $('#pref-api-key').value.trim(), model: $('#pref-model').value }); updateKeyStatus(); });
$('#pref-model').addEventListener('change', () => saveVisionPrefs({ apiKey: $('#pref-api-key').value.trim(), model: $('#pref-model').value }));
function updateKeyStatus() {
  const k = $('#pref-api-key').value.trim();
  $('#key-status').textContent = !k ? 'No key: scans read text only.'
    : !k.startsWith('sk-ant-') ? 'That does not look like an Anthropic key (they start with sk-ant-).'
    : 'Key saved on this device. Scans will identify food by sight.';
}
function updateScanHint() {
  const on = Boolean(visionPrefs().apiKey);
  $('#scan-mode-hint').textContent = on
    ? 'Fill the frame, keep the light even, and let things overlap as little as you can. Claude will name what it sees and the text reader picks up labels.'
    : 'Without an API key the scanner reads text only: receipts, labels and packets. Add a key in Settings to identify loose food by sight.';
  $('#quick-add-hint').textContent = on
    ? 'Anything the scanner missed, type in here. Suggestions come from the same list the scanner uses.'
    : 'Loose fruit and vegetables carry no text to read, so type those in here, or add an API key in Settings.';
}
$('#pref-staples').addEventListener('change', (e) => store.setPref('assumeStaples', e.target.checked));
$('#btn-export').addEventListener('click', async () => {
  const json = store.export();
  // Inside the Android app there is no download and no Web Share; the native
  // side opens the system "save as" picker instead.
  if (globalThis.PantryAndroid?.exportJson) { globalThis.PantryAndroid.exportJson(json); return; }
  const file = new File([json], 'pantry.json', { type: 'application/json' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Pantry' }); return; } catch { /* user cancelled or unsupported; fall back */ }
  }
  const a = el('a', { href: URL.createObjectURL(file), download: 'pantry.json' });
  document.body.append(a); a.click(); a.remove();
});
$('#import-input').addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try { store.import(await f.text()); toast('Pantry imported'); settings.close(); }
  catch { toast('That is not a pantry export.'); }
  e.target.value = '';
});

// ------------------------------------------------------------- boot
function renderAll() {
  const { items } = store.get();
  const badge = $('#count-pantry');
  badge.hidden = items.length === 0; badge.textContent = String(items.reduce((n, i) => n + i.qty, 0));
  renderPantry();
  renderRecipes();
  renderShop();
}
store.subscribe(renderAll);
renderAll();
updateScanHint();

let startView = 'scan';
try { startView = sessionStorage.getItem('pantry-scan:view') || 'scan'; } catch { /* fine */ }
if (!$(`.tab[data-view="${startView}"]`)) startView = 'scan';
show(startView);

/* The Android shell calls this on the back button. Returns true when the
   page consumed it: an open dialog closes, a live camera stops, any other tab
   returns to Scan. False means there is nowhere left to go and the app may
   close. */
window.handleBack = () => {
  const open = $$('dialog[open]');
  if (open.length) { open[open.length - 1].close(); return true; }
  if (stream || !preview.hidden) { resetScan(); return true; }
  const active = $('.tab.active')?.dataset.view;
  if (active && active !== 'scan') { show('scan'); return true; }
  return false;
};

// Fetch the recogniser in the background once the page is idle, so the
// first scan does not wait on the download.
if ('requestIdleCallback' in window) requestIdleCallback(() => loadLibrary().catch(() => {}), { timeout: 4000 });
else setTimeout(() => loadLibrary().catch(() => {}), 2000);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
