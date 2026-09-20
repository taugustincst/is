/* Identifying food by looking at it, with Claude.

   OCR reads words, so it knows a packet of rice and a receipt but not a bare
   tomato or a bowl of leftovers. For a photo of a fridge or a pantry shelf
   the app sends the picture to Claude, which names every food it can see,
   counts what is countable and says how sure it is. The reply is constrained
   to a JSON schema, then mapped onto the food dictionary so the pantry and the
   recipes speak one language; anything the dictionary lacks stays under the
   name Claude gave it.

   This needs the cook's own Anthropic API key, stored on the device, and a
   network connection. Without a key the scanner falls back to OCR alone.
   The request is made straight from the page (the API allows it with the
   anthropic-dangerous-direct-browser-access header), which is right for an
   app where the only user of the key is the person who typed it in. */

import { FOODS, FOOD_BY_ID, CATEGORIES } from './foods.js';
import { detectFoods } from './match.js';

export const API_URL = 'https://api.anthropic.com/v1/messages';
export const MODELS = [
  { id: 'claude-opus-5', name: 'Claude Opus 5 (most accurate)' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5 (fastest, cheapest)' },
];
export const DEFAULT_MODEL = 'claude-opus-5';
export const MAX_IMAGE_EDGE = 1568; // the API downsizes past this anyway

const CATEGORY_IDS = Object.keys(CATEGORIES);

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'notes'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'quantity', 'category', 'confidence', 'label_text'],
        properties: {
          name: { type: 'string', description: 'Short generic food name in lowercase, e.g. "tomato", "cheddar", "chicken breast". Use a dictionary name when one fits.' },
          quantity: { type: 'integer', minimum: 1, maximum: 50, description: 'How many you can see, or 1 for a single pack, bunch, jar or an uncountable amount.' },
          category: { type: 'string', enum: CATEGORY_IDS },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          label_text: { type: 'string', description: 'Any brand or label text you can read on it, else an empty string.' },
        },
      },
    },
    notes: { type: 'string', description: 'One short sentence for the cook if anything was hard to see, else an empty string.' },
  },
};

const SYSTEM = `You help a home cook keep an inventory. You are shown a photo of a fridge, freezer, pantry shelf, countertop or a bag of shopping. List every distinct food and drink item you can actually see. Name each with a short generic name; when one of the dictionary names below fits, use it exactly. Count items that are countable (three lemons, two cans); use 1 for a single pack, bunch, jar, bottle or an uncountable amount. Read labels on packaging to identify what it is. Do not list dishes, cookware, shelves or anything that is not food. Do not guess at things you cannot see well enough to name; mark uncertain ones "low" rather than leaving them out.

Dictionary names: ${FOODS.map(f => f.name.toLowerCase()).join(', ')}.`;

const CONF = { high: 0.95, medium: 0.8, low: 0.55 };

/* The request body. Exposed so it can be inspected in tests without a key. */
export function buildRequest({ imageBase64, mediaType = 'image/jpeg', model = DEFAULT_MODEL }) {
  const body = {
    model,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: 'What food is in this photo? Answer with the JSON schema.' },
      ],
    }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  };
  const headers = {
    'content-type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (model.startsWith('claude-opus-5') || model.startsWith('claude-fable')) {
    // Adaptive thinking is on by default on these models; a photo of a fridge
    // does not need much of it. And should a safety classifier decline the
    // request, let the API re-run it on Anthropic's recommended fallback
    // model rather than hand the cook a refusal.
    body.output_config.effort = 'medium';
    body.fallbacks = 'default';
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  }
  return { body, headers };
}

/* Turn the model's JSON into detections shaped like match.js's detectFoods
   output: [{ id, name, category, confidence, matched, qty, source }]. Names
   the dictionary knows collapse onto the dictionary food; the rest become
   custom items under the model's own name. Duplicates add their quantities. */
export function parseVisionItems(json) {
  const items = Array.isArray(json?.items) ? json.items : [];
  const out = new Map();
  for (const it of items) {
    const name = String(it.name || '').trim().toLowerCase();
    if (!name) continue;
    const qty = Math.max(1, Math.min(50, Math.round(Number(it.quantity) || 1)));
    const conf = CONF[it.confidence] ?? CONF.medium;
    // Let the text matcher map the name (and any label text) to a food id;
    // it handles plurals, aliases and "chopped tomatoes" vs "tomato".
    const hit = detectFoods(name)[0] || (it.label_text ? detectFoods(it.label_text)[0] : null);
    const id = hit && hit.confidence >= 0.9 ? hit.id : null;
    const key = id || 'custom:' + name.replace(/\s+/g, '_');
    const prev = out.get(key);
    if (prev) { prev.qty = Math.min(50, prev.qty + qty); prev.confidence = Math.max(prev.confidence, conf); continue; }
    out.set(key, {
      id,
      name: id ? FOOD_BY_ID[id].name : name.charAt(0).toUpperCase() + name.slice(1),
      category: id ? FOOD_BY_ID[id].category : (CATEGORY_IDS.includes(it.category) ? it.category : 'other'),
      confidence: conf,
      matched: it.label_text ? `${name} (${it.label_text})` : name,
      qty,
      source: 'vision',
    });
  }
  return [...out.values()].sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
}

/* Combine what Claude saw with what OCR read. Seen beats read: a food in
   both lists keeps the vision quantity and the higher confidence, and is
   marked as coming from both. */
export function mergeDetections(vision, ocr) {
  const byKey = new Map();
  for (const v of vision) byKey.set(v.id || 'custom:' + v.name.toLowerCase().replace(/\s+/g, '_'), { ...v });
  for (const o of ocr) {
    const key = o.id;
    const prev = byKey.get(key);
    if (prev) { prev.confidence = Math.max(prev.confidence, o.confidence); prev.source = 'both'; }
    else byKey.set(key, { ...o, qty: o.qty || 1, source: 'ocr' });
  }
  return [...byKey.values()].sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
}

/* Encode a canvas as a JPEG small enough for the API. */
export function canvasToJpegBase64(canvas, maxEdge = MAX_IMAGE_EDGE, quality = 0.85) {
  let src = canvas;
  const scale = Math.min(1, maxEdge / Math.max(canvas.width, canvas.height));
  if (scale < 1) {
    src = document.createElement('canvas');
    src.width = Math.round(canvas.width * scale); src.height = Math.round(canvas.height * scale);
    src.getContext('2d').drawImage(canvas, 0, 0, src.width, src.height);
  }
  return src.toDataURL('image/jpeg', quality).split(',')[1];
}

export class VisionError extends Error {
  constructor(message, { status, retryable = false } = {}) { super(message); this.status = status; this.retryable = retryable; }
}

/* Ask Claude what is in the picture. Resolves to
   { items: parsed detections, notes, model: the model that answered }. */
export async function identify(canvas, { apiKey, model = DEFAULT_MODEL, signal } = {}) {
  if (!apiKey) throw new VisionError('No API key set. Add one in Settings to identify unlabelled food.');
  const imageBase64 = canvasToJpegBase64(canvas);
  const { body, headers } = buildRequest({ imageBase64, model });
  let res;
  try {
    res = await fetch(API_URL, { method: 'POST', headers: { ...headers, 'x-api-key': apiKey }, body: JSON.stringify(body), signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new VisionError('Could not reach Claude. Check your connection.', { retryable: true });
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error?.message || ''; } catch { /* not json */ }
    const friendly = {
      401: 'That API key was not accepted. Check it in Settings.',
      403: 'This key is not allowed to use that model.',
      404: 'That model is not available on this key. Pick another in Settings.',
      413: 'The photo was too large to send.',
      429: 'Too many requests. Wait a moment and try again.',
      529: 'Claude is busy right now. Try again shortly.',
    }[res.status] || (res.status >= 500 ? 'Claude had a problem. Try again shortly.' : 'The request was rejected.');
    throw new VisionError(detail ? `${friendly} (${detail})` : friendly, { status: res.status, retryable: res.status === 429 || res.status >= 500 });
  }
  const msg = await res.json();
  if (msg.stop_reason === 'refusal') {
    throw new VisionError('Claude declined to look at that photo. Try another one.');
  }
  const text = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  let json;
  try { json = JSON.parse(text); } catch { throw new VisionError('Claude answered in a shape the app did not expect. Try again.', { retryable: true }); }
  return { items: parseVisionItems(json), notes: json.notes || '', model: msg.model };
}
