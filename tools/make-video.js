#!/usr/bin/env node
/* Records the Play listing's promo video: thirty seconds of the game played
   in a headless Chromium at 1280x720, saved as store/promo.webm and, when
   Playwright's ffmpeg is about, store/promo.mp4. Play takes the video as a
   YouTube link, so upload the file there and paste the link into the console.

   The recording has no sound: a headless browser renders no audio. The game's
   own music and effects play in the app.

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
  await sleep(2200);                                   // 0-2 s: the title
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => {
    const s = game.state; s.chapter = 8; s.gil = 4000;
    const jobs = ['knight', 'blackMage', 'archer', 'whiteMage', 'monk'];
    s.party.forEach((u, i) => { u.job = jobs[i % jobs.length]; u.level = 10; u.jp[u.job] = 400; u.jpTotal[u.job] = 400; for (const id of JOBS[u.job].abilities) u.learned[id] = true; const kit = bestGearFor(u.job, null, 6); for (const [slot, id] of Object.entries(kit)) if (id) u.gear[slot] = id; u.resetBattleState(); });
    game.setPace(2); game.showWorld();
  });
  await sleep(1800);                                   // the camp and the realm
  await page.click('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  await sleep(1500);                                   // a line of the story
  for (let i = 0; i < 12; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  await sleep(600);
  await page.click('#deploy-panel button[data-a="auto"]');
  await sleep(900);
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await sleep(400);
  // The company fights on its own at double speed: spells, shots and steel.
  await page.evaluate(() => game.ui.setAuto(true));
  await sleep(15000);                                  // ~8-23 s: the battle
  await page.evaluate(() => game.ui.setAuto(false));
  await page.evaluate(() => { game.battle.over = true; game.battle.result = 'defeat'; game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await page.click('#btn-results');
  await page.waitForSelector('#screen-world.active', { timeout: 20000 });
  await page.evaluate(() => { game.state.chapter = 14; game.state.cities.redwater = true; game.state.cities.fordwaterTown = true; game.showWorld(); });
  await sleep(2200);                                   // the realm, two acts in
  await page.evaluate(() => { game.state.chapter = CAMPAIGN.length; game.state.branch = null; game.openChoice(); });
  await sleep(2400);                                   // the five roads
  await page.evaluate(() => { game.showWorld(); game.showScreen('title'); });
  await sleep(1500);                                   // and out on the title
  await ctx.close();
  await browser.close();
  srv.close();
  const webm = fs.readdirSync(tmp).find(f => f.endsWith('.webm'));
  const dst = path.join(OUT, 'promo.webm');
  fs.copyFileSync(path.join(tmp, webm), dst);
  console.log(`wrote ${path.relative(ROOT, dst)} (YouTube takes WebM as it is)`);
  // Playwright's own ffmpeg encodes only VP8, so an .mp4 needs a full ffmpeg:
  // point FFMPEG at one and it is made too.
  if (process.env.FFMPEG) {
    try {
      const mp4 = path.join(OUT, 'promo.mp4');
      execFileSync(ffmpegPath(), ['-y', '-loglevel', 'error', '-i', dst, '-t', '32', '-c:v', 'libx264', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
      console.log(`wrote ${path.relative(ROOT, mp4)}`);
    } catch (e) {
      console.log(`the ffmpeg at FFMPEG could not encode an .mp4: ${e.message.split('\n')[0]}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
