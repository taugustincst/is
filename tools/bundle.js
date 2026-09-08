#!/usr/bin/env node
/* Builds the whole game into one self-contained HTML file: the stylesheet, all
   nine scripts and the icons inlined, with no other files to fetch. That file
   plays from a phone's downloads folder, from a memory stick, or from any host
   that can serve a single page.

   Usage:
     node tools/bundle.js                 -> dist/elderon.html   (standalone)
     node tools/bundle.js --body          -> dist/elderon-body.html
                                             (page content only, for hosts that
                                              supply their own html/head/body)
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const bodyOnly = process.argv.includes('--body');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const dataUri = (p) =>
  'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, p)).toString('base64');

const SCRIPTS = ['audio', 'data', 'sprites', 'unit', 'map', 'battle', 'render', 'ui', 'game'];

let html = read('index.html');

// Split the source page into its head and its body: the bundle keeps the body
// markup verbatim and rebuilds the head around inlined assets.
const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
if (!bodyMatch) throw new Error('index.html has no <body>');
let body = bodyMatch[1];

// Drop the external script tags and the service worker registration: everything
// is in the file, and a worker cannot be registered from one.
body = body.replace(/<script src="js\/[^"]+"><\/script>\s*/g, '');
body = body.replace(/<script>[\s\S]*?serviceWorker[\s\S]*?<\/script>\s*/g, '');

const css = read('css/style.css');
const code = SCRIPTS.map(name => {
  const src = read(`js/${name}.js`);
  return `/* ===== js/${name}.js ===== */\n${src}`;
}).join('\n');

const manifest = JSON.parse(read('manifest.webmanifest'));
// The icons travel with the file, and the start URL can only be known at run
// time, so the manifest is assembled in the page and handed over as a blob.
const runtimeManifest = {
  name: manifest.name,
  short_name: manifest.short_name,
  description: manifest.description,
  display: manifest.display,
  display_override: manifest.display_override,
  orientation: manifest.orientation,
  background_color: manifest.background_color,
  theme_color: manifest.theme_color,
  categories: manifest.categories,
  icons: [
    { src: dataUri('icons/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: dataUri('icons/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: dataUri('icons/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

const installer = `
/* Offer the page as an installable app. The manifest has to be built here
   rather than shipped beside the file, because a single-file build has no
   beside, and start_url is only knowable once the page is open. The icon links
   are moved into the head at the same time: a host that supplies its own
   document shell leaves ours in the body, where browsers may ignore them and
   fall back to requesting /favicon.ico. */
(function () {
  try {
    document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(function (l) {
      if (l.parentNode !== document.head) document.head.appendChild(l);
    });
    var m = ${JSON.stringify(runtimeManifest)};
    m.start_url = location.href;
    m.scope = location.href;
    m.id = location.href;
    var url = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' }));
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);
  } catch (e) { /* an install prompt is a bonus, never a requirement */ }
})();
`;

// A host that supplies its own <head> already sets charset and viewport, so the
// bundle sets the viewport it needs from script instead of declaring it twice.
const viewportFix = bodyOnly ? `
/* This build runs inside a page whose viewport tag belongs to the host. The
   game needs its own: no user zoom, and room under a notch. */
(function () {
  var m = document.querySelector('meta[name="viewport"]');
  if (!m) { m = document.createElement('meta'); m.name = 'viewport'; document.head.appendChild(m); }
  m.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
})();
` : '';

const headMeta = bodyOnly ? '' : `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
`;

const head = `${headMeta}<meta name="theme-color" content="#0f1020">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="description" content="${manifest.description}">
<title>${manifest.name}</title>
<link rel="icon" href="${dataUri('icons/icon-64.png')}">
<link rel="apple-touch-icon" href="${dataUri('icons/icon-192.png')}">
<style>
${css}
</style>`;

const scripts = `<script>\n${viewportFix}${installer}\n</script>\n<script>\n${code}\n</script>`;
const page = bodyOnly
  ? `${head}\n${body}\n${scripts}\n`
  : `<!DOCTYPE html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n${body}\n${scripts}\n</body>\n</html>\n`;

fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, bodyOnly ? 'elderon-body.html' : 'elderon.html');
fs.writeFileSync(file, page);

const kb = (Buffer.byteLength(page) / 1024).toFixed(0);
console.log(`wrote ${path.relative(ROOT, file)} (${kb} KB, one file, nothing else to fetch)`);
