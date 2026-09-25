/* The QA report of 24 September 2026, finding by finding, through the real
   screens: a Retreat that answers, toasts that go, a click on a tile that
   moves the unit or says why not, Continue and Load Game in step, the
   Squire's skillset spelled right, the fallen marked on the results screen,
   volume levels that stick, and credits. No native dialog is used anywhere:
   they are refused inside a sandboxed frame, which is how Retreat went dead. */
const { BASE, chromePath } = require('./lib');
const { chromium } = require('playwright-core');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };

// A tile's centre in page coordinates, and whether a click there resolves to it.
const tilePoint = (page, tx, ty) => page.evaluate(([tx, ty]) => {
  const rd = game.renderer, b = game.battle;
  const cv = document.getElementById('battle-canvas'), r = cv.getBoundingClientRect(), z = rd.zoom || 1;
  const W = rd.W || cv.width, H = rd.H || cv.height;
  const s = rd.toScreen(tx, ty, b.grid.height(tx, ty));
  const px = (s.sx - W / 2) * z + W / 2, py = (s.sy - H / 2) * z + H / 2;
  const onScreen = px > 20 && px < W - 20 && py > 20 && py < H - 20;
  const got = rd.pickGround(px, py);
  return { x: r.left + px * r.width / W, y: r.top + py * r.height / H, onScreen, clean: !!got && got.x === tx && got.y === ty };
}, [tx, ty]);

async function toBattle(page) {
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.waitForFunction(() => !game.renderer.camAnim, null, { timeout: 5000 }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  // Any native dialog is a finding: count them, and refuse them as a sandbox would.
  let native = 0; page.on('dialog', d => { native++; d.dismiss(); });
  await page.addInitScript(() => { localStorage.clear(); });
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.evaluate(() => { localStorage.clear(); game.syncTitleButtons(); });

  // QA-007: with nothing saved, Continue and Load Game agree.
  const fresh = await page.evaluate(() => ({ cont: $('btn-continue').disabled, load: $('btn-load').disabled }));
  ok('QA-007: with no save, Load Game is disabled as Continue is', fresh.cont && fresh.load, JSON.stringify(fresh));
  // Retest: which build is running is on the title screen, for anyone reporting.
  const shown = await page.evaluate(() => ({ text: $('title-version').textContent, visible: $('title-version').offsetParent !== null, v: GAME_VERSION }));
  ok('retest: the title screen shows the running version', shown.visible && shown.text === 'v' + shown.v, JSON.stringify(shown));

  // QA-011: credits, with the version, and Back returns to the title.
  await page.click('#btn-credits'); await page.waitForSelector('#screen-credits.active');
  const credits = await page.evaluate(() => ({ version: $('credits-version').textContent, entries: document.querySelectorAll('.credits-list dt').length }));
  ok('QA-011: a credits screen names the version and the makers', /^Version \d+\.\d+\.\d+$/.test(credits.version) && credits.entries >= 4, JSON.stringify(credits));
  ok('QA-011: Back leaves the credits for the title', await page.evaluate(() => handleBack() && game.screen === 'title'));

  // QA-004 and QA-002: the Squire's skillset, and the toast from learning.
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-save');
  const saved = await page.evaluate(() => ({ cont: $('btn-continue').disabled, load: $('btn-load').disabled }));
  ok('QA-007: once a game is saved, both title buttons open it', !saved.cont && !saved.load, JSON.stringify(saved));
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  ok('QA-004: the Squire skillset reads "Fundamentals"', await page.evaluate(() => JOBS.squire.skillset === 'Fundamentals' && !document.body.innerText.includes('Fundaments')));
  await page.evaluate(() => { const u = game.state.party[0]; u.jp[u.job] = 999; game.formTab = 'skills'; game.renderFormationDetail(); });
  await page.waitForTimeout(1900); // let the save toast fade first
  await page.click('#form-detail button[data-learn]');
  const toastNow = await page.evaluate(() => ({ text: $('toast').textContent, shown: $('toast').classList.contains('show') }));
  ok('QA-002: learning an ability says so', toastNow.shown && /learned/.test(toastNow.text), JSON.stringify(toastNow));
  await page.waitForTimeout(4600);
  const toastLater = await page.evaluate(() => ({ text: $('toast').textContent, shown: $('toast').classList.contains('show') }));
  ok('QA-002: the toast is gone from the page once it fades, not only from sight', !toastLater.shown && toastLater.text === '', JSON.stringify(toastLater));
  await page.evaluate(() => game.toast('A message that should not follow anyone'));
  await page.click('#btn-formation-back'); await page.waitForSelector('#screen-world.active');
  ok('QA-002: a change of screen clears a toast at once', await page.evaluate(() => $('toast').textContent === '' && !$('toast').classList.contains('show')));

  // QA-010: effects and music levels, and they stick.
  const levels = await page.evaluate(() => {
    const sl = document.querySelector('#screen-world input[data-vol="music"]');
    sl.value = 35; sl.dispatchEvent(new Event('input'));
    const saved = JSON.parse(localStorage.getItem('elderon-audio') || '{}');
    return { sliders: document.querySelectorAll('input[data-vol]').length, music: audio.musicVolume, saved: saved.musicVolume, help: document.querySelector('#help input[data-vol="music"]').value };
  });
  ok('QA-010: volume sliders for effects and music, at camp and in battle help', levels.sliders === 4 && Math.abs(levels.music - 0.35) < 1e-9 && levels.saved === 0.35 && levels.help === '35', JSON.stringify(levels));

  // Into a battle.
  await page.click('#btn-title'); await page.waitForSelector('#screen-title.active');
  await page.click('#btn-continue'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.waitForFunction(() => !game.renderer.camAnim, null, { timeout: 5000 }).catch(() => {});

  // QA-006: from the command menu, a click on a tile the unit can reach moves it.
  const plan = await page.evaluate(() => {
    const b = game.battle, u = game.ui.turn.unit;
    const reach = b.grid.reachable(u, b.units);
    const near = [...reach.values()].filter(n => n.cost > 0).map(n => ({ x: n.x, y: n.y }));
    const far = [];
    for (let y = 0; y < b.grid.h; y++) for (let x = 0; x < b.grid.w; x++) {
      const t = b.grid.tile(x, y);
      if (t && t.t !== 'x' && !reach.has(`${x},${y}`) && !b.units.some(o => o.alive && o.x === x && o.y === y)) far.push({ x, y });
    }
    return { unit: u.name, from: { x: u.x, y: u.y }, near, far };
  });
  let dest = null;
  for (const t of plan.near) { const p = await tilePoint(page, t.x, t.y); if (p.onScreen && p.clean) { dest = { t, p }; break; } }
  let miss = null;
  for (const t of plan.far) { const p = await tilePoint(page, t.x, t.y); if (p.onScreen && p.clean) { miss = { t, p }; break; } }
  ok('QA-006: the field offers a reachable tile and an unreachable one to click', !!dest && !!miss, `${plan.near.length} near, ${plan.far.length} far`);
  if (miss) {
    await page.mouse.move(miss.p.x, miss.p.y); await page.waitForTimeout(80);
    await page.mouse.click(miss.p.x, miss.p.y); await page.waitForTimeout(150);
    const said = await page.evaluate(() => ({ hint: $('hint').textContent, mode: game.ui.turn && game.ui.turn.mode }));
    ok('QA-006: a click out of reach says so instead of doing nothing', /cannot reach that tile/.test(said.hint) && said.mode === 'menu', JSON.stringify(said));
  }
  if (dest) {
    await page.mouse.move(dest.p.x, dest.p.y); await page.waitForTimeout(80);
    await page.mouse.click(dest.p.x, dest.p.y);
    await page.waitForFunction((to) => { const u = game.ui.turn && game.ui.turn.unit; return u && u.x === to.x && u.y === to.y && game.ui.turn.mode === 'menu'; }, dest.t, { timeout: 10000 }).catch(() => {});
    const moved = await page.evaluate(() => { const u = game.ui.turn && game.ui.turn.unit; return u ? { x: u.x, y: u.y, moved: u.turnFlags.moved, mode: game.ui.turn.mode } : null; });
    ok('QA-006: a click on a reachable tile moves the unit there, without pressing Move', moved && moved.x === dest.t.x && moved.y === dest.t.y && moved.moved && moved.mode === 'menu', JSON.stringify({ to: dest.t, moved }));
    // Undo, then choose Move and hover: the walk is shown before the click.
    await page.evaluate(() => game.ui.undoMove());
    await page.click('#action-menu button[data-a="move"]');
    await page.waitForFunction(() => !game.renderer.camAnim, null, { timeout: 5000 }).catch(() => {});
    const p2 = await tilePoint(page, dest.t.x, dest.t.y);
    await page.mouse.move(p2.x - 3, p2.y - 2); await page.waitForTimeout(60);
    await page.mouse.move(p2.x, p2.y); await page.waitForTimeout(120);
    const preview = await page.evaluate((to) => ({ size: game.renderer.hl.path.size, has: game.renderer.hl.path.has(`${to.x},${to.y}`) }), dest.t);
    ok('QA-006: while choosing a move, the walk to the tile under the pointer is drawn', preview.size >= 1 && preview.has, JSON.stringify(preview));
    await page.evaluate(() => game.ui.cancel());
  }

  // QA-005: battle speed changes, then the battle is left.
  await page.click('#btn-speed'); await page.click('#btn-speed');
  ok('QA-005: the speed change is announced in battle', /Battle speed 3×/.test(await page.textContent('#toast')));

  // QA-001: Retreat asks in the game's own dialog; No keeps fighting.
  await page.click('#btn-retreat');
  const asked = await page.evaluate(() => ({ open: !$('ask').hidden, text: $('ask-text').textContent, yes: $('ask-yes').textContent, no: $('ask-no').textContent, focus: document.activeElement && document.activeElement.id }));
  ok('QA-001: Retreat asks first, in the game\'s own dialog', asked.open && /Retreat from battle/.test(asked.text) && asked.yes === 'Retreat' && asked.focus === 'ask-yes', JSON.stringify(asked));
  await page.click('#ask-no');
  ok('QA-001: "Keep fighting" keeps the battle going', await page.evaluate(() => $('ask').hidden && game.battle && !game.battle.over && game.screen === 'battle'));
  await page.click('#btn-retreat'); await page.keyboard.press('Escape');
  ok('QA-001: Escape answers no, and does not also cancel a selection behind it', await page.evaluate(() => $('ask').hidden && game.battle && !game.battle.over));
  await page.click('#btn-retreat');
  ok('QA-001: the phone\'s Back answers no', await page.evaluate(() => handleBack() && $('ask').hidden && game.battle && !game.battle.over));
  // QA-009: someone falls; Retreat, and the defeat screen shows them fallen.
  const fallen = await page.evaluate(() => { const b = game.battle; const u = b.units.find(x => x.team === 'player' && x.alive && x !== game.ui.turn.unit); u.hp = 0; b.onUnitKO(u); return u.name; });
  await page.click('#btn-retreat'); await page.click('#ask-yes');
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  const res = await page.evaluate((name) => {
    const rows = [...document.querySelectorAll('.res-unit')];
    const row = rows.find(r => r.querySelector('span').textContent.startsWith(name + ' '));
    return { title: $('results-title').textContent, down: rows.filter(r => r.classList.contains('down')).map(r => r.querySelector('span').textContent), mine: row ? row.classList.contains('down') : null };
  }, fallen);
  ok('QA-001: "Retreat" leaves the battle as a defeat', res.title === 'Defeat...', res.title);
  ok('QA-009: a unit that fell is shown fallen on the results screen', res.mine === true && res.down.length === 1 && / · fell$/.test(res.down[0]), JSON.stringify(res));
  // QA-005: nothing about battle speed follows the party out of the battle.
  const after = await page.evaluate(() => ({ toast: $('toast').textContent, speedShown: $('btn-speed').offsetParent !== null }));
  ok('QA-005: no battle-speed message or control is left on the results screen', !/speed/i.test(after.toast) && !after.speedShown, JSON.stringify(after));
  await page.click('#btn-results');
  await page.waitForSelector('#screen-world.active, #screen-story.active', { timeout: 20000 });
  const camp = await page.evaluate(() => ({ text: document.body.innerText.includes('Battle speed'), toast: $('toast').textContent }));
  ok('QA-005: nor on the camp screen after it', !camp.text && camp.toast === '', JSON.stringify(camp));

  // N2 and N3: a results screen with a level-up and JP to spend names who,
  // and gives the level as from and to rather than a lone mark.
  const named = await page.evaluate(() => {
    const [a, b] = game.state.party;
    for (const u of [a, b]) { u.jp[u.job] = 999; u.learned = {}; }
    const from = a.level; a.level = from + 1;
    game.results('victory', { exp: 10, gil: 0, events: [`${a.name} reached level ${a.level}!`], jpBy: new Map(), levelFrom: new Map([[a, from], [b, b.level]]) }, '', [a, b]);
    const caps = [...document.querySelectorAll('.res-unit span')].map(s => s.textContent);
    const note = [...document.querySelectorAll('.res-note')].map(n => n.textContent).join(' ');
    return { caps, note, a: a.name, b: b.name, from, to: a.level };
  });
  ok('N3: a level-up reads as from and to, with no stray mark', named.caps[0] === `${named.a} · Lv${named.from}→${named.to}` && named.caps[1] === `${named.b} · Lv${(await page.evaluate(() => game.state.party[1].level))}` && !named.caps.some(c => / !|↑/.test(c)), JSON.stringify(named.caps));
  ok('N2: the JP note names who has JP to spend', named.note.includes(`✦ ${named.a} and ${named.b} have JP enough`), named.note);
  await page.click('#btn-results');

  ok('no native dialog was raised anywhere', native === 0, `${native} raised`);
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(fails ? `${fails} QA check(s) FAILED` : 'all QA checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
