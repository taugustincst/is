#!/usr/bin/env node
/* Stamps sw.js with a hash of every file the service worker caches, so each
   build gets a cache of its own and a player never runs a mix of two builds.

   Usage: node tools/stamp.js          # rewrite the stamp
          node tools/stamp.js --check  # exit 1 if the stamp is stale */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const SW = path.join(ROOT, 'sw.js');

function currentHash() {
  const sw = fs.readFileSync(SW, 'utf8');
  const list = (sw.match(/const ASSETS = \[([\s\S]*?)\];/) || ['', ''])[1];
  const files = [...list.matchAll(/'([^']+)'/g)].map(m => m[1]).filter(f => f !== '.');
  const h = crypto.createHash('sha1');
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) throw new Error(`sw.js caches a file that does not exist: ${f}`);
    h.update(f); h.update(fs.readFileSync(p));
  }
  return h.digest('hex').slice(0, 10);
}

function stampedHash() {
  const m = fs.readFileSync(SW, 'utf8').match(/const VERSION = '([0-9a-f]+)';/);
  return m ? m[1] : null;
}

if (require.main === module) {
  const want = currentHash(), have = stampedHash();
  if (process.argv.includes('--check')) {
    if (want !== have) { console.error(`sw.js is stamped ${have} but the files hash to ${want}: run node tools/stamp.js`); process.exit(1); }
    console.log(`sw.js stamp ${have} is current`);
  } else if (want !== have) {
    const sw = fs.readFileSync(SW, 'utf8').replace(/const VERSION = '[0-9a-f]+';/, `const VERSION = '${want}';`);
    fs.writeFileSync(SW, sw);
    console.log(`sw.js stamped ${want}`);
  } else {
    console.log(`sw.js stamp ${have} already current`);
  }
}

module.exports = { currentHash, stampedHash };
