const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 660 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');

  // Render every sound offline and measure it. A name that resolves but makes
  // no signal is the same as no sound at all.
  const measured = await page.evaluate(async () => {
    const SEC = 1.2, SR = 44100;
    const one = async (name) => {
      const off = new OfflineAudioContext(1, SR * SEC, SR);
      const a = new GameAudio();
      a.ctx = off; a.muted = false; a.lastSfx = {};
      a.master = off.createGain(); a.master.gain.value = 0.9; a.master.connect(off.destination);
      a.sfxGain = off.createGain(); a.sfxGain.connect(a.master);
      a.sfx(name);
      const buf = await off.startRendering();
      const d = buf.getChannelData(0);
      let sum = 0, peak = 0, zc = 0, last = 0;
      for (let i = 0; i < d.length; i++) {
        sum += d[i] * d[i];
        if (Math.abs(d[i]) > peak) peak = Math.abs(d[i]);
        if (i && (d[i] >= 0) !== (d[i - 1] >= 0)) zc++;
        if (Math.abs(d[i]) > 0.01) last = i;
      }
      // Zero crossings per second stand in for brightness; a bright metallic
      // swing crosses far more often than a low rumble. Counted over the
      // audible span, so a short sound is not read as dull; and split in
      // two, so a sound that rises reads differently from one that falls.
      const span = Math.max(1, last);
      let zc1 = 0, zc2 = 0;
      for (let i = 1; i <= span; i++) if ((d[i] >= 0) !== (d[i - 1] >= 0)) { if (i < span / 2) zc1++; else zc2++; }
      return { rms: +Math.sqrt(sum / d.length).toFixed(5), peak: +peak.toFixed(4),
               zcr: Math.round(zc / SEC), bright: Math.round((zc1 + zc2) / (span / SR)),
               slope: Math.sign(zc2 - zc1), ms: Math.round(last / SR * 1000) };
    };
    const names = Object.keys(COMBAT_SFX);
    const out = {};
    // Rendered twice: the second pass measures how much a noise-based sound
    // varies between renders, so "the same sound" can be judged against that
    // rather than against fixed buckets a sound can straddle by chance.
    // Four renders each, averaged: a noise burst measures a little differently
    // every time, and the spread of the four is the tolerance for calling two
    // sounds the same.
    const K = 4;
    for (const n of names) {
      const runs = []; for (let k = 0; k < K; k++) runs.push(await one(n));
      const avg = {}; for (const key of Object.keys(runs[0])) avg[key] = runs.reduce((a, r) => a + r[key], 0) / K;
      avg.slope = Math.sign(avg.slope);
      avg.jit = {}; for (const key of ['bright', 'rms', 'ms']) avg.jit[key] = Math.max(...runs.map(r => Math.abs(r[key] - avg[key])));
      avg.again = runs[1];
      out[n] = avg;
    }
    return out;
  });

  const names = Object.keys(measured);
  const m0 = (n) => measured[n];
  if (process.env.DUMP) for (const n of names) console.log(`${n.padEnd(16)} bright ${String(Math.round(m0(n).bright)).padStart(6)}±${String(Math.round(m0(n).jit.bright)).padEnd(5)} slope ${String(m0(n).slope).padStart(2)} rms ${m0(n).rms.toFixed(4)} ms ${String(Math.round(m0(n).ms)).padStart(4)}±${Math.round(m0(n).jit.ms)}`);
  const silent = names.filter(n => measured[n].peak < 0.005);
  ok('every sound actually makes a sound', silent.length === 0, silent.join(',') || `${names.length} rendered`);
  const tooLong = names.filter(n => measured[n].ms > 900);
  ok('no sound outstays a turn', tooLong.length === 0, tooLong.join(',') || `longest ${Math.max(...names.map(n => measured[n].ms))}ms`);
  const clipping = names.filter(n => measured[n].peak > 0.99);
  ok('no sound clips', clipping.length === 0, clipping.map(n => `${n}=${measured[n].peak}`).join(',') || `loudest ${Math.max(...names.map(n => measured[n].peak))}`);

  // Weight should be audible: a knife is brighter than an axe, thunder and
  // earth sit low, holy sits high.
  const m = (n) => measured[n];
  ok('a knife is brighter than an axe', m('swing-light').zcr > m('swing-heavy').zcr * 1.5,
     `knife ${m('swing-light').zcr} vs axe ${m('swing-heavy').zcr}`);
  ok('a fist is duller than a blade', m('swing-fist').zcr < m('swing-blade').zcr,
     `fist ${m('swing-fist').zcr} vs blade ${m('swing-blade').zcr}`);
  ok('earth rumbles lower than ice rings', m('el-earth').zcr < m('el-ice').zcr,
     `earth ${m('el-earth').zcr} vs ice ${m('el-ice').zcr}`);
  ok('holy sits above dark', m('el-holy').zcr > m('el-dark').zcr,
     `holy ${m('el-holy').zcr} vs dark ${m('el-dark').zcr}`);
  ok('a blunt impact is heavier than a pierce', m('impact-blunt').zcr < m('impact-pierce').zcr,
     `blunt ${m('impact-blunt').zcr} vs pierce ${m('impact-pierce').zcr}`);

  // No two sounds may be acoustically the same thing under different names.
  // Two sounds count as the same when every metric sits within twice the
  // render-to-render jitter of the other's, which a sound and its own second
  // rendering will always satisfy and two designed sounds should never.
  const METRICS = ['bright', 'rms', 'ms'];
  // Each sound's own jitter, not the noisiest sound's: a tolerance taken
  // from the whole table let everything match everything.
  const jit = (n, k) => m(n).jit[k];
  // The smaller of the two jitters: a crackling sound's own spread must not
  // license a match with a steady one.
  const same = (a, b) => m(a).slope === m(b).slope && METRICS.every(k =>
    Math.abs(m(a)[k] - m(b)[k]) <= 2 * Math.min(jit(a, k), jit(b, k)) + (k === 'bright' ? 150 : k === 'ms' ? 6 : 0.002));
  const dupes = [];
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) if (same(names[i], names[j])) dupes.push(`${names[i]}=${names[j]}`);
  ok('no two sounds are the same sound twice', dupes.length === 0,
     dupes.join(' , ') || `${names.length} distinct`);

  console.log('\nsounds:', names.length);
  console.log('ERRORS:', errs.length ? errs : 'none');
  if (errs.length) fails++;
  await browser.close();
  console.log(fails ? `\n${fails} sound check(s) FAILED` : '\nall sound checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
