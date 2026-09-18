/* Reading text out of a photo, in the browser, with Tesseract.js.

   The library, its WebAssembly core and the English model ship with the app
   under vendor/tesseract, so nothing is fetched from a CDN and the Android
   build needs no network permission. They are loaded on first use (about
   seven megabytes together), and the service worker keeps them once seen.
   The image is cleaned up first: shrunk to a sensible size, turned to grey
   and stretched for contrast. Packaging photographed under a kitchen light is
   low-contrast and huge, and both hurt recognition. */

const VENDOR = new URL('../vendor/tesseract/', import.meta.url);
const TESSERACT_URL = new URL('tesseract.min.js', VENDOR).href;
const WORKER_URL = new URL('worker.min.js', VENDOR).href;
const CORE_URL = VENDOR.href.replace(/\/$/, '');
const LANG_URL = new URL('lang', VENDOR).href;
const MAX_EDGE = 1800;

let libPromise = null;
let workerPromise = null;

export function loadLibrary() {
  if (globalThis.Tesseract) return Promise.resolve(globalThis.Tesseract);
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = TESSERACT_URL;
      s.async = true;
      s.onload = () => resolve(globalThis.Tesseract);
      s.onerror = () => { libPromise = null; reject(new Error('Could not load the text recogniser. Reload the app and try again.')); };
      document.head.appendChild(s);
    });
  }
  return libPromise;
}

async function getWorker(onProgress) {
  if (!workerPromise) {
    workerPromise = (async () => {
      const T = await loadLibrary();
      const worker = await T.createWorker('eng', 1, {
        workerPath: WORKER_URL,
        corePath: CORE_URL,
        langPath: LANG_URL,
        gzip: true,
        logger: (m) => onProgress?.(m),
      });
      // Assume a block of text of varying size: labels, receipt lines, shelf
      // tags. PSM 6 (uniform block) loses lines on a busy fridge shelf.
      await worker.setParameters({ tessedit_pageseg_mode: '3' });
      return worker;
    })().catch((e) => { workerPromise = null; throw e; });
  }
  return workerPromise;
}

/* Draw any image-ish source (an <img>, <video>, <canvas>, ImageBitmap) into a
   fresh canvas, scaled down to MAX_EDGE, greyscaled and contrast-stretched.
   Returns the canvas. */
export function preprocess(source, { maxEdge = MAX_EDGE, enhance = true } = {}) {
  const sw = source.videoWidth || source.naturalWidth || source.width;
  const sh = source.videoHeight || source.naturalHeight || source.height;
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  if (!enhance) return canvas;

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0;
    d[i] = y; hist[y]++;
  }
  // Stretch between the 1st and 99th percentile so a few glints and shadows
  // do not set the range.
  const total = w * h;
  let lo = 0, hi = 255, acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.01) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= total * 0.01) { hi = v; break; } }
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    let y = ((d[i] - lo) * 255 / range);
    y = y < 0 ? 0 : y > 255 ? 255 : y;
    d[i] = d[i + 1] = d[i + 2] = y;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/* Recognise text in a canvas. `onProgress({ status, progress })` is called as
   the model downloads and as recognition proceeds. Resolves to
   { text, confidence, lines: [{ text, confidence }] }. */
export async function recognize(canvas, onProgress) {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(canvas);
  const lines = (data.lines || []).map(l => ({ text: l.text.trim(), confidence: l.confidence })).filter(l => l.text);
  return { text: data.text || '', confidence: data.confidence || 0, lines };
}

/* A copy of the canvas turned by 90, 180 or 270 degrees. */
export function rotated(canvas, degrees) {
  const out = document.createElement('canvas');
  const swap = degrees % 180 !== 0;
  out.width = swap ? canvas.height : canvas.width;
  out.height = swap ? canvas.width : canvas.height;
  const ctx = out.getContext('2d');
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(degrees * Math.PI / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return out;
}

/* Recognise, and if the read looks like nonsense (a receipt photographed
   sideways reads as a wall of stray letters at low confidence), try the
   image turned each way and keep the most confident result. `isPoor`
   decides from a result whether a retry is worth the time. */
export async function recognizeUpright(canvas, onProgress, isPoor = (r) => r.confidence < 45) {
  let best = await recognize(canvas, onProgress);
  if (!isPoor(best)) return best;
  for (const deg of [90, 270, 180]) {
    onProgress?.({ status: 'retrying rotated', progress: 0, degrees: deg });
    const r = await recognize(rotated(canvas, deg), onProgress);
    if (r.confidence > best.confidence) best = { ...r, rotated: deg };
    if (!isPoor(best)) break;
  }
  return best;
}

export async function terminate() {
  if (!workerPromise) return;
  const w = await workerPromise.catch(() => null);
  workerPromise = null;
  await w?.terminate();
}
