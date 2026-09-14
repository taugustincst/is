# Pantry Scan

Photograph your shopping, let the phone read it, and cook from what you have.
A progressive web app for home cooks: no account, no backend, nothing leaves
the device. Open `index.html` from any static host (or `node tools/serve.js`)
and it works; install it from the browser menu and it works offline.

## How it works

1. **Scan.** Open the camera or choose a photo. Receipts, packet labels and
   shelf tags read best. The image is shrunk, greyscaled and contrast-stretched,
   then [Tesseract.js](https://github.com/naptha/tesseract.js) reads the text
   in a web worker on the phone. The first scan downloads the recogniser and
   its English model (a few megabytes); the service worker keeps them, so
   every later scan is offline.
2. **Match.** The text is matched against a dictionary of about 190 foods and
   their aliases: "CHKN BRST" is chicken breast, "chopped tomatoes" is a can and
   not a fresh tomato, "TOMAT0ES" is still tomatoes. Sure hits are pre-ticked;
   near-misses are shown with a `?` for you to confirm. Edit the text and detect
   again if the camera got a word wrong.
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

## What OCR can and cannot do

OCR reads **words**. It is very good at a receipt, a label or a shelf tag, and
it cannot recognise a bare apple. That is why the Quick add box sits under the
scanner. If you want the scanner to identify unlabelled produce you would add
an image classifier alongside it; the matching, pantry and recipe layers would
not need to change.

## Files

| file | what it is |
| --- | --- |
| `index.html`, `css/style.css` | The four tabs, the recipe and settings dialogs. Mobile first, light and dark. |
| `js/foods.js` | The food dictionary: names, aliases, categories, shelf life, which are staples. |
| `js/recipes.js` | The recipes: ingredients (by food id, with `opt` for optional), times, servings, steps. |
| `js/match.js` | Text normalising, alias index, longest-phrase-first detection, fuzzy fallback, recipe ranking. |
| `js/inventory.js` | The pantry, shopping list and preferences in localStorage, plus freshness. |
| `js/ocr.js` | Image preprocessing and the Tesseract.js worker. |
| `js/app.js` | Camera, scanning flow and all rendering. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installable and offline. |
| `tools/test.js` | Data consistency and logic tests under plain Node. |
| `tools/serve.js` | A static server for local use (`node tools/serve.js [port]`). |

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
