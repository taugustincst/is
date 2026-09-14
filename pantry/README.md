# Pantry Scan

Photograph your shopping, let the phone read it, and cook from what you have.
A progressive web app for home cooks: no account, no backend, nothing leaves
the device. Open `index.html` from any static host (or `node tools/serve.js`)
and it works; install it from the browser menu and it works offline.

## How it works

1. **Scan.** Open the camera or choose a photo of a fridge shelf, the pantry
   or a bag of shopping. Two recognisers look at it side by side:
   - **Sight.** With your own Anthropic API key entered in Settings, the photo
     goes to Claude, which names every food it can see, counts what is
     countable, reads labels, and says how sure it is. This is what identifies
     a bare tomato, a bunch of herbs or a bowl of leftovers. The reply is
     constrained to a JSON schema and mapped onto the food dictionary, so the
     pantry and the recipes speak one language. See `js/vision.js`.
   - **Text.** [Tesseract.js](https://github.com/naptha/tesseract.js) reads
     the text in a web worker on the phone: receipts, packet labels, shelf
     tags. The recogniser and its English model ship with the app under
     `vendor/tesseract/`, so it works with no network and no key.
2. **Match.** Text is matched against a dictionary of about 190 foods and
   their aliases: "CHKN BRST" is chicken breast, "chopped tomatoes" is a can and
   not a fresh tomato, "TOMAT0ES" is still tomatoes. What Claude saw is merged
   with what was read: a food in both lists is marked 👁📄. Sure hits are
   pre-ticked; near-misses show a `?` for you to confirm, and anything the
   dictionary lacks is kept under the name Claude gave it.
3. **Pantry.** Items land in the pantry grouped by category with quantities and
   a "use soon" nudge based on typical shelf life. Loose fruit and vegetables
   have no words to read, so type them in; the box suggests from the same list.
4. **Recipes.** Fifty weeknight recipes are ranked against the pantry: **Cook
   now** has everything in, **Almost there** is one or two things short, and
   **Ideas** are worth a shop. Optional ingredients never block a recipe. Salt,
   pepper, oil, flour, sugar, vinegar and stock are assumed present; turn that
   off in Settings if your cupboard is bare. Filter by vegetarian, vegan or
   under 30 minutes.
5. **Cook and shop.** "I cooked this" takes one of each ingredient used off
   the pantry. "Add missing to list" puts what you lack on the shopping list;
   ticking things off there moves them straight into the pantry.

## Sight versus text

Text recognition reads **words**. It is very good at a receipt, a label or a
shelf tag, it runs offline, and it cannot recognise a bare apple. Identifying
food by sight needs a vision model, and the app uses Claude for that with the
cook's own key: an API key from <https://platform.claude.com>, pasted into
Settings and stored only on the device. A scan of a full fridge costs about a
cent on the default model (Claude Opus 5); Sonnet 5 and Haiku 4.5 are offered
as cheaper, faster options. Without a key the scanner is text-only and the
Quick add box covers loose produce.

The request goes straight from the page to the API, which permits browser
calls when asked to with a header. That is the right shape for an app where
the only user of the key is the person who typed it in; a shared or public
deployment would put a small server in between so the key never reaches the
browser.

## Files

| file | what it is |
| --- | --- |
| `index.html`, `css/style.css` | The four tabs, the recipe and settings dialogs. Mobile first, light and dark. |
| `js/foods.js` | The food dictionary: names, aliases, categories, shelf life, which are staples. |
| `js/recipes.js` | The recipes: ingredients (by food id, with `opt` for optional), times, servings, steps. |
| `js/match.js` | Text normalising, alias index, longest-phrase-first detection, fuzzy fallback, recipe ranking. |
| `js/inventory.js` | The pantry, shopping list and preferences in localStorage, plus freshness. |
| `js/ocr.js` | Image preprocessing and the Tesseract.js worker. |
| `js/vision.js` | The Claude request: prompt, JSON schema, mapping the answer onto the dictionary, merging with OCR. |
| `js/app.js` | Camera, scanning flow and all rendering. |
| `vendor/tesseract/` | Tesseract.js, its WebAssembly core and the English model, bundled. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installable and offline. |
| `android/` | A native Android app around the same files. See [android/README.md](android/README.md). |
| `tools/test.js` | Data consistency and logic tests under plain Node. |
| `tools/serve.js` | A static server for local use (`node tools/serve.js [port]`). |

## Android

`android/` is a Gradle project that wraps the app in a WebView with the camera
passed through, and bundles these files plus the recogniser into an APK that
needs no network. `cd android && ./gradlew assembleDebug`. See
[android/README.md](android/README.md).

## Running

```bash
cd pantry
node tools/test.js      # data and logic checks, no dependencies
node tools/serve.js     # http://localhost:8080
```

The camera needs a secure context: `localhost` counts, and so does any HTTPS
host. On a phone over plain HTTP the camera button will say so and "Choose
photo" still works, since that goes through the system camera app.

## Adding food or recipes

Add a food to `js/foods.js` with the spellings it appears under on packaging.
Add a recipe to `js/recipes.js` using food ids, marking with `opt` anything the
dish survives without. Then `node tools/test.js`: it fails on an unknown
ingredient, an alias claimed by two foods, a recipe with no required
ingredient, or a food nothing cooks with that is not on the eat-as-is list.
