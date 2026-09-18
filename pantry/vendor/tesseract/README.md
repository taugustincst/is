# Vendored recogniser

| file | from | version |
| --- | --- | --- |
| `tesseract.min.js`, `worker.min.js` | npm `tesseract.js` | 5.1.1 |
| `tesseract-core-simd-lstm.wasm.js`, `tesseract-core-lstm.wasm.js` | npm `tesseract.js-core` (WebAssembly embedded in the JS; the SIMD build is used where the browser supports it) | 5.1.1 |
| `lang/eng.traineddata.gz` | npm `@tesseract.js-data/eng`, the `4.0.0_best_int` model | 1.0.0 |

Bundled rather than fetched from a CDN so the app, and the Android build in
particular, works with no network at all. Both projects are Apache-2.0
licensed; see the LICENSE files alongside.
