/* Reading text out of a photo, in the browser, with Tesseract.js.

   The library is fetched on first use rather than bundled: it is a few hundred
   kilobytes of JavaScript, a few megabytes of WebAssembly and a language
   model, all of which the service worker keeps once seen, so the second scan
   is offline and instant. The image is cleaned up first: shrunk to a sensible
   size, turned to grey and stretched for contrast. Packaging photographed
   under a kitchen light is low-contrast and huge, and both hurt recognition. */

const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
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
      s.onerror = () => { libPromise = null; reject(new Error('Could not load the text recogniser. Check your connection and try again; after the first successful scan it works offline.')); };
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

export async function terminate() {
  if (!workerPromise) return;
  const w = await workerPromise.catch(() => null);
  workerPromise = null;
  await w?.terminate();
}
