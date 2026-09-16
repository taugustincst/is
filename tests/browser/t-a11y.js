/* Phone layout and accessibility after the review: the job tree reachable at
   360 px, the log clear of the command menu, focus styling, labels, live
   regions, keyboard rows, a button path to revisiting, and a viewport that
   allows zoom. */
const { BASE, chromePath } = require('./lib');
const { chromium } = require('playwright-core');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  for (const w of [360, 412]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); page.on('dialog', d => d.accept());
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto(BASE + '/index.html'); await page.waitForSelector('#screen-title.active');
    await page.evaluate(() => { localStorage.clear(); game.newGame(1); game.state.chapter = 3; game.showWorld(); }); await page.waitForSelector('#screen-world.active');
    if (w === 360) {
      const vp = await page.$eval('meta[name="viewport"]', m => m.content);
      ok('the viewport allows pinch zoom on the reading screens', !/user-scalable=no|maximum-scale/.test(vp), vp);
      const a11y = await page.evaluate(() => { const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch (e) { return []; } }); return { focus: css.some(t => /:focus-visible/.test(t)), labels: ['btn-sound', 'btn-music', 'btn-speed', 'btn-rot-l', 'btn-rot-r', 'btn-log', 'btn-help'].every(id => document.getElementById(id).getAttribute('aria-label')), canvas: document.getElementById('battle-canvas').getAttribute('role') === 'img', live: ['toast', 'hint', 'banner'].every(id => document.getElementById(id).getAttribute('aria-live') === 'polite') }; });
      ok('focus is styled, icon buttons are labelled, the canvas has a role and notices are live regions', a11y.focus && a11y.labels && a11y.canvas && a11y.live, JSON.stringify(a11y));
      // Revisit has a button path, and the rows answer the keyboard.
      const rv = await page.evaluate(() => ({ sel: !!document.getElementById('revisit-sel'), btn: !!document.getElementById('btn-revisit'), options: document.getElementById('revisit-sel').options.length }));
      ok('a won field can be revisited from a button on the road card', rv.sel && rv.btn && rv.options === 3, JSON.stringify(rv));
      await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active'); await page.waitForTimeout(100);
      const kb = await page.evaluate(() => { const rows = document.querySelectorAll('.form-row'); const r = rows[2]; r.focus(); r.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return { tabbable: [...rows].every(x => x.getAttribute('tabindex') === '0' && x.getAttribute('role') === 'button'), selected: game.formSel === 2 }; });
      ok('formation rows are tabbable and Enter selects one', kb.tabbable && kb.selected, JSON.stringify(kb));
      await page.click('#btn-formation-back'); await page.waitForSelector('#screen-world.active');
    }
    await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active'); await page.waitForTimeout(150);
    const tree = await page.evaluate(() => { const b = document.getElementById('btn-tree'); const r = b.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { right: Math.round(r.right), vw: innerWidth, reachable: hit === b || b.contains(hit), small: [...document.querySelectorAll('#screen-formation button')].filter(x => x.offsetParent && x.getBoundingClientRect().height < 36).length }; });
    ok(`at ${w}px the Job Tree button is on screen and tappable, and formation buttons are finger-sized`, tree.right <= tree.vw && tree.reachable && tree.small === 0, JSON.stringify(tree));
    await page.click('#btn-formation-back'); await page.waitForSelector('#screen-world.active');
    await page.click('#btn-train'); await page.waitForSelector('#screen-story.active, #deploy-panel.open', { timeout: 20000 });
    for (let i = 0; i < 6 && await page.isVisible('#screen-story.active'); i++) { await page.click('#btn-story-next'); await page.waitForTimeout(80); }
    await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
    await page.click('#deploy-panel button[data-a="go"]');
    await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
    await page.click('#btn-log'); await page.waitForTimeout(150);
    const l = await page.evaluate(() => { const wait = [...document.querySelectorAll('#action-menu button')].find(b => /Wait/.test(b.textContent)); const r = wait.getBoundingClientRect(); const top = document.elementFromPoint(r.left + 10, r.top + r.height / 2); const log = document.getElementById('log'); const lr = log.getBoundingClientRect(); const bar = document.getElementById('battle-top').getBoundingClientRect(); return { logShown: getComputedStyle(log).display !== 'none', waitClear: top === wait || wait.contains(top), logAboveMenu: lr.bottom <= r.top + 1, barInside: bar.left >= 0 && bar.right <= innerWidth + 1 }; });
    ok(`at ${w}px the open log leaves Wait tappable and the battle bar fits`, l.logShown && l.waitClear && l.logAboveMenu && l.barInside, JSON.stringify(l));
    ok(`no page errors at ${w}px`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'all layout and accessibility checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
