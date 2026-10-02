#!/usr/bin/env node
/* Records the trailer: thirty seconds of the game played in a headless
   Chromium at 1280x720, with a line of copy over each scene, saved as
   store/trailer.webm. YouTube and itch.io take WebM as it is; Steam wants
   H.264, so point FFMPEG at a full ffmpeg and an .mp4 is written too (see
   store/STEAM.md).

   The recording has no sound: a headless browser renders no audio. The
   game's own score plays in the app; lay the title theme under the cut in
   any editor, or leave it silent, which stores allow.

   Usage: node tools/make-video.js */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT } = require('./load');

const OUT = path.join(ROOT, 'store');
const W = 1280, H = 720;

function chromePath(chromium) {
  if (process.env.CHROME) return process.env.CHROME;
  const cands = [];
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (fs.existsSync(root)) for (const d of fs.readdirSync(root)) cands.push(`${root}/${d}/chrome-linux/chrome`, `${root}/${d}`);
  try { cands.push(chromium.executablePath()); } catch (e) { /* none */ }
  return cands.find(c => { try { return fs.statSync(c).isFile(); } catch (e) { return false; } });
}
function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (fs.existsSync(root)) for (const d of fs.readdirSync(root)) if (d.startsWith('ffmpeg')) { const p = `${root}/${d}/ffmpeg-linux`; if (fs.existsSync(p)) return p; }
  return 'ffmpeg';
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* The copy over the picture: one line at a time, in the game's own display
   face, with a dark band behind it so it reads over a bright field. `where`
   is 'low' for a caption under the action or 'mid' for a card on its own. */
async function card(page, text, where = 'low', sub = '') {
  await page.evaluate(([text, where, sub]) => {
    let el = document.getElementById('__card');
    if (!el) {
      el = document.createElement('div'); el.id = '__card';
      el.style.cssText = 'position:fixed;left:0;right:0;z-index:9999;text-align:center;pointer-events:none;transition:opacity .45s ease;opacity:0;font-family:var(--display),Georgia,serif;color:#fff3c0;';
      const st = document.createElement('style');
      st.textContent = '#__card b{display:inline-block;padding:10px 34px;background:rgba(6,7,20,.72);border-top:1px solid rgba(230,195,90,.6);border-bottom:1px solid rgba(230,195,90,.6);font-weight:600;letter-spacing:.04em;text-shadow:0 2px 8px #000}#__card small{display:block;margin-top:10px;font-family:Georgia,serif;font-style:italic;font-size:20px;color:#e0dcf0;text-shadow:0 1px 6px #000}';
      document.head.appendChild(st);
      document.body.appendChild(el);
    }
    if (!text) { el.style.opacity = '0'; return; }
    el.style.top = where === 'mid' ? '38%' : 'auto';
    el.style.bottom = where === 'mid' ? 'auto' : '64px';
    el.querySelector('b') && el.querySelector('b').remove();
    el.innerHTML = `<b style="font-size:${where === 'mid' ? 44 : 30}px">${text}</b>${sub ? `<small>${sub}</small>` : ''}`;
    el.style.opacity = '1';
  }, [text, where, sub]);
}

async function throughStory(page) {
  for (let i = 0; i < 14; i++) {
    const t = await page.textContent('#btn-story-next').catch(() => null);
    if (t === null) break;
    await page.click('#btn-story-next'); if (t === 'Onward') break;
  }
}

(async () => {
  const { chromium } = require('playwright-core');
  const http = require('http');
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
  const srv = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(data); });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'elderon-video-'));
  const browser = await chromium.launch({ executablePath: chromePath(chromium), headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: tmp, size: { width: W, height: H } } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  await page.goto(`${base}/index.html`);
  await page.waitForSelector('#screen-title.active');
  await page.evaluate(() => document.fonts.ready);
  // 0-3 s: the title, turning.
  await sleep(2600);
  await card(page, '', 'mid');
  // 3-6 s: the realm, two acts in, with the first cities open.
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => {
    const s = game.state; s.chapter = 14; s.gil = 4000; s.cities.redwater = true; s.cities.fordwaterTown = true;
    const jobs = ['knight', 'blackMage', 'archer', 'whiteMage', 'monk'];
    s.party.forEach((u, i) => { u.job = jobs[i % jobs.length]; u.level = 14; u.jp[u.job] = 400; u.jpTotal[u.job] = 400; for (const id of JOBS[u.job].abilities) u.learned[id] = true; const kit = bestGearFor(u.job, null, 7); for (const [slot, id] of Object.entries(kit)) if (id) u.gear[slot] = id; u.resetBattleState(); });
    game.setPace(2); game.showWorld();
  });
  await card(page, 'Five acts. Twenty-four chapters.', 'low', 'A border war, a winter court, a sea of wrecks, and a crown.');
  await sleep(3000);
  // 6-9 s: into the story and onto the field.
  await page.evaluate(() => { game.state.chapter = 8; game.showWorld(); });
  await card(page, '');
  await page.click('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  await sleep(900);
  await throughStory(page);
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  await card(page, 'Choose who fights, and where they stand.', 'low');
  await sleep(1400);
  await page.click('#deploy-panel button[data-a="auto"]');
  await sleep(900);
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  // 9-13 s: the first turn: an attack preview, with the odds.
  await card(page, 'Tempo turns. Height and facing.', 'low', 'Side attacks halve evasion. From behind, nothing is dodged.');
  await sleep(600);
  await page.evaluate(() => { game.renderer.setZoom(1.4); });
  await sleep(3200);
  // 13-22 s: the company fights on its own: spells, shots and steel.
  await card(page, 'Thirty-five jobs. 281 skills.', 'low', 'Earn skill points, learn abilities, equip a second skillset.');
  await page.evaluate(() => game.ui.setAuto(true));
  await sleep(4500);
  await card(page, 'Every blow has a shape.', 'low', 'Fire climbs, ice shatters, thunder falls, holy rises.');
  await sleep(4500);
  await page.evaluate(() => game.ui.setAuto(false));
  await page.evaluate(() => { game.renderer.setZoom(1); game.battle.over = true; game.battle.result = 'defeat'; game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.waitForSelector('#screen-world.active', { timeout: 20000 }).catch(() => {});
  // 22-25 s: the forge at Fordwater.
  await page.evaluate(() => { game.invAdd('ironIngot', 3); game.invAdd('brassFitting', 2); game.invAdd('steelIngot', 1); game.forgeTab = 'improve'; game.goToCity('fordwaterTown'); });
  await sleep(200);
  await page.evaluate(() => document.getElementById('cities').scrollIntoView());
  await card(page, 'Ten cities. A forge in each.', 'low', 'Better your arms to +3. Tame beasts. Send errands.');
  await sleep(3000);
  // 25-28 s: the five roads.
  await page.evaluate(() => { game.showWorld(); game.state.chapter = CAMPAIGN.length; game.state.branch = null; game.openChoice(); });
  await card(page, 'Five roads. Five endings.', 'low', 'Take the crown, break it, sail away, go home, or seize it.');
  await sleep(3000);
  // 28-31 s: out on the title.
  await page.evaluate(() => { game.showWorld(); game.showScreen('title'); });
  await card(page, 'Free in your browser · Android · Desktop', 'low', 'No ads. No accounts. No purchases. Open source.');
  await sleep(3000);
  await card(page, '');
  await sleep(400);
  await ctx.close();
  await browser.close();
  srv.close();
  const webm = fs.readdirSync(tmp).find(f => f.endsWith('.webm'));
  const dst = path.join(OUT, 'trailer.webm');
  fs.copyFileSync(path.join(tmp, webm), dst);
  console.log(`wrote ${path.relative(ROOT, dst)} (YouTube and itch.io take WebM as it is)`);
  // Playwright's own ffmpeg encodes only VP8, so an .mp4 needs a full ffmpeg:
  // point FFMPEG at one and it is made too.
  if (process.env.FFMPEG) {
    try {
      const mp4 = path.join(OUT, 'trailer.mp4');
      execFileSync(ffmpegPath(), ['-y', '-loglevel', 'error', '-i', dst, '-t', '32', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
      console.log(`wrote ${path.relative(ROOT, mp4)}`);
    } catch (e) {
      console.log(`the ffmpeg at FFMPEG could not encode an .mp4: ${e.message.split('\n')[0]}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
