const { BASE } = require('./lib');
/* The unit page steps between units: the arrows beside the portrait, a swipe
   across the page, and the arrow keys, each keeping the tab that is open and
   going round the company as a ring. A touch that scrolls, or that starts on
   a control, is not a swipe. */
const { chromePath, OUT: S } = require('./lib');
const { chromium } = require('playwright-core');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };

// A finger drawn across the page, as the browser reports it.
const swipe = (page, dx, dy, onSelector) => page.evaluate(([dx, dy, sel]) => {
  const start = sel ? document.querySelector(sel) : document.querySelector('[data-form-tab]:not(.tab-hidden)');
  const r = start.getBoundingClientRect();
  const x0 = r.left + r.width / 2, y0 = r.top + Math.min(r.height / 2, 40);
  const touch = (x, y, id) => new Touch({ identifier: id, target: start, clientX: x, clientY: y, pageX: x, pageY: y });
  start.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch(x0, y0, 1)], targetTouches: [touch(x0, y0, 1)], changedTouches: [touch(x0, y0, 1)] }));
  start.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [touch(x0 + dx, y0 + dy, 1)] }));
}, [dx, dy, onSelector || null]);
const where = (page) => page.evaluate(() => ({ sel: game.formSel, name: document.querySelector('#form-detail h2').textContent, count: document.querySelector('.unit-count').textContent, tab: game.formTab || 'unit', shown: [...document.querySelectorAll('[data-form-tab]')].find(el => !el.classList.contains('tab-hidden')).dataset.formTab, listSel: +document.querySelector('.form-row.sel').dataset.i }));

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  const n = await page.evaluate(() => game.state.party.length);
  const first = await where(page);
  ok('the unit page opens on the first unit and says where it stands in the company', first.sel === 0 && first.count === `1 of ${n}`, JSON.stringify(first));
  // The arrows.
  await page.click('#form-detail [data-unit-nav="1"]'); await page.waitForTimeout(80);
  const next = await where(page);
  ok('the next arrow steps to the second unit, and the list follows', next.sel === 1 && next.listSel === 1 && next.name !== first.name, JSON.stringify(next));
  await page.click('#form-detail [data-unit-nav="-1"]'); await page.waitForTimeout(80);
  ok('the previous arrow steps back', (await where(page)).sel === 0);
  await page.click('#form-detail [data-unit-nav="-1"]'); await page.waitForTimeout(80);
  const wrapped = await where(page);
  ok('before the first unit comes the last: the company is a ring', wrapped.sel === n - 1 && wrapped.count === `${n} of ${n}`, JSON.stringify(wrapped));
  // A swipe on the Gear tab keeps the Gear tab.
  await page.click('#form-tabs button[data-form="gear"]'); await page.waitForTimeout(80);
  await swipe(page, -120, 8); await page.waitForTimeout(80);
  const swiped = await where(page);
  ok('a swipe left goes to the next unit and keeps the Gear tab open', swiped.sel === 0 && swiped.shown === 'gear', JSON.stringify(swiped));
  await swipe(page, 140, -10); await page.waitForTimeout(80);
  const back = await where(page);
  ok('a swipe right goes to the one before', back.sel === n - 1 && back.shown === 'gear', JSON.stringify(back));
  // Not a swipe: a scroll, a short drag, and a touch that starts on a select.
  await swipe(page, 20, 160); await swipe(page, -30, 0);
  const sel = await page.evaluate(() => { const s = document.querySelector('#form-detail select'); return s ? 'select' : null; });
  if (sel) await swipe(page, -140, 0, '#form-detail select');
  const still = await where(page);
  ok('a scroll, a short drag and a drag that starts on a control change nothing', still.sel === n - 1 && still.shown === 'gear', JSON.stringify(still));
  // The arrow keys, on the Skills tab.
  await page.click('#form-tabs button[data-form="skills"]'); await page.waitForTimeout(80);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80);
  const keyed = await where(page);
  ok('the → key steps on, twice, and keeps the Skills tab', keyed.sel === 1 && keyed.shown === 'skills', JSON.stringify(keyed));
  // The keys do nothing inside a job select.
  await page.click('#form-tabs button[data-form="unit"]'); await page.waitForTimeout(80);
  await page.focus('#sel-job'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(80);
  ok('the keys leave a focused select alone', (await where(page)).sel === 1);
  await page.screenshot({ path: `${S}/unit-swipe.png` });
  // On a phone, the same arrows, a thumb's size.
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
  const tap = await page.evaluate(() => { const b = document.querySelector('#form-detail [data-unit-nav="1"]').getBoundingClientRect(); return { w: b.width, h: b.height }; });
  ok('the arrows are a thumb\'s size on a phone', tap.w >= 36 && tap.h >= 36, JSON.stringify(tap));
  await page.screenshot({ path: `${S}/unit-swipe-phone.png` });
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  if (fails) { console.log(`${fails} check(s) FAILED`); process.exit(1); }
  console.log('all checks passed');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
