const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
/* The field without a mouse: the arrow keys walk a tile cursor (in the
   direction the board is seen from, so a turned board keeps the keys
   honest), Enter does what a click there would, up and down walk an open
   list, Shift pans; and a gamepad does the same through the d-pad and its
   buttons, and walks the buttons of any other screen. */
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
const cursor = (page) => page.evaluate(() => ({ c: game.ui.cursor, hl: game.renderer.hl.cursor && { x: game.renderer.hl.cursor.x, y: game.renderer.hl.cursor.y }, info: document.getElementById('tile-info').textContent.slice(0, 40), mode: game.ui.turn && game.ui.turn.mode, focus: document.activeElement && document.activeElement.textContent }));
// A pretend gamepad the page can be handed: buttons and axes set from the test.
const padSetup = (page) => page.evaluate(() => {
  window.__pad = { id: 'test pad', index: 0, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] };
  navigator.getGamepads = () => [window.__pad];
});
const press = async (page, i, ms = 60) => { await page.evaluate((i) => { window.__pad.buttons[i].pressed = true; window.__pad.buttons[i].value = 1; }, i); await page.waitForTimeout(ms); await page.evaluate((i) => { window.__pad.buttons[i].pressed = false; window.__pad.buttons[i].value = 0; }, i); await page.waitForTimeout(ms); };
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => {
    game.state.party.forEach(u => { u.level = 5; game.syncGear(u); });
    game.runBattle(MAPS.verdant, [{ job: 'squire', level: 3, x: 8, y: 2 }], 0, { objective: { type: 'rout' } });
  });
  await beginBattle(page);
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  await page.waitForFunction(() => !game.renderer.camAnim, null, { timeout: 5000 }).catch(() => {});
  const start = await cursor(page);
  const unit = await page.evaluate(() => ({ x: game.ui.turn.unit.x, y: game.ui.turn.unit.y, name: game.ui.turn.unit.name }));
  ok('a turn starts with the cursor on the unit', start.c && start.c.x === unit.x && start.c.y === unit.y, JSON.stringify({ start: start.c, unit }));
  // Right steps the cursor one tile along the board's near-right edge, as seen.
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60);
  const right = await cursor(page);
  const stepped = right.c && (Math.abs(right.c.x - unit.x) + Math.abs(right.c.y - unit.y) === 1);
  ok('→ steps the cursor to a neighbouring tile, drawn and described', stepped && right.hl && right.hl.x === right.c.x && right.info.length > 0, JSON.stringify(right));
  const seen = await page.evaluate(([ux, uy]) => { const r = game.renderer; const a = r.gridRot(ux, uy), b = r.gridRot(game.ui.cursor.x, game.ui.cursor.y); return { dx: Math.round(b.x - a.x), dy: Math.round(b.y - a.y) }; }, [unit.x, unit.y]);
  ok('the step is to the right as the board is seen', seen.dx === 1 && seen.dy === 0, JSON.stringify(seen));
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(60);
  ok('← steps back', (await cursor(page)).c.x === unit.x && (await cursor(page)).c.y === unit.y);
  // Turn the board, and → still means right as seen.
  await page.keyboard.press('e'); await page.waitForTimeout(500);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60);
  const turned = await page.evaluate(([ux, uy]) => { const r = game.renderer; const a = r.gridRot(ux, uy), b = r.gridRot(game.ui.cursor.x, game.ui.cursor.y); return { rot: r.rot, dx: Math.round(b.x - a.x), dy: Math.round(b.y - a.y), c: game.ui.cursor }; }, [unit.x, unit.y]);
  ok('on a turned board → is still right as seen', turned.rot !== 0 && turned.dx === 1 && turned.dy === 0, JSON.stringify(turned));
  await page.keyboard.press('q'); await page.waitForTimeout(500);
  await page.evaluate((u) => game.ui.placeCursor(u.x, u.y), unit); await page.waitForTimeout(60);
  // Up and down walk the action menu while it is open; Enter presses.
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(60);
  const walked = await cursor(page);
  ok('↓ walks the action menu rather than the cursor', walked.focus === 'Move' && walked.c.x === unit.x && walked.c.y === unit.y, JSON.stringify(walked));
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(60);
  ok('…and goes round the list', (await cursor(page)).focus === 'Wait');
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(60);
  await page.keyboard.press('Enter'); await page.waitForTimeout(120);
  ok('Enter presses the focused entry: Move opens', (await cursor(page)).mode === 'move');
  // In Move, the cursor walks the field; Enter on a reachable tile goes there.
  const dest = await page.evaluate(() => { const t = game.ui.turn, u = t.unit; const n = [...t.reach.values()].filter(c => c.cost > 0).sort((a, b) => a.cost - b.cost)[0]; return n ? { x: n.x, y: n.y, ux: u.x, uy: u.y } : null; });
  await page.evaluate((d) => game.ui.placeCursor(d.x, d.y), dest);
  await page.waitForTimeout(100);
  const previewed = await page.evaluate(() => game.renderer.hl.path.size > 0);
  ok('the cursor on a reachable tile shows the path', previewed);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu' && game.ui.turn.unit.turnFlags.moved, null, { timeout: 8000 });
  const moved = await page.evaluate(() => ({ x: game.ui.turn.unit.x, y: game.ui.turn.unit.y }));
  ok('Enter there moves the unit', moved.x === dest.x && moved.y === dest.y, JSON.stringify({ moved, dest }));
  // Shift with the arrows pans instead.
  const cam0 = await page.evaluate(() => ({ ...game.renderer.cam }));
  await page.keyboard.down('Shift'); await page.keyboard.press('ArrowLeft'); await page.keyboard.up('Shift'); await page.waitForTimeout(60);
  const cam1 = await page.evaluate(() => ({ ...game.renderer.cam }));
  const after = await cursor(page);
  ok('Shift+← pans the camera and leaves the cursor', cam1.x !== cam0.x && after.c.x === moved.x && after.c.y === moved.y, JSON.stringify({ cam0, cam1 }));
  await page.screenshot({ path: `${S}/pad-cursor.png` });
  // Escape backs out; the gamepad does the rest.
  await padSetup(page);
  await press(page, 3); // Y: Act
  ok('Y opens Act', (await cursor(page)).mode === 'act', (await cursor(page)).mode);
  await press(page, 1); // B: cancel
  ok('B cancels back to the menu', (await cursor(page)).mode === 'menu');
  await press(page, 15); // d-pad right
  const padRight = await cursor(page);
  ok('the d-pad moves the cursor', padRight.c && Math.abs(padRight.c.x - moved.x) + Math.abs(padRight.c.y - moved.y) === 1, JSON.stringify(padRight.c));
  await press(page, 14); // back left
  await press(page, 2); // X: Wait
  ok('X is Wait: the facing menu opens', (await cursor(page)).mode === 'wait', (await cursor(page)).mode);
  await press(page, 13); await press(page, 0); // d-pad down walks to the first facing, A takes it
  await page.waitForFunction(() => !game.ui.turn || game.ui.turn.unit.name !== 'Rowan' || !game.ui.turn.unit.turnFlags.moved, null, { timeout: 8000 }).catch(() => {});
  const ended = await page.evaluate(() => !game.ui.turn || game.ui.turn.mode !== 'wait');
  ok('A presses the facing in hand and the turn ends', ended);
  // Start opens the help; Back toggles Auto.
  await press(page, 9);
  ok('Start opens the help', await page.evaluate(() => document.getElementById('help').classList.contains('open')));
  await press(page, 9);
  await press(page, 8);
  ok('Back toggles Auto', await page.evaluate(() => game.ui.auto));
  await press(page, 8);
  // Off the field: the d-pad walks the camp's buttons and A presses one.
  await page.evaluate(() => { game.battle.over = true; game.battle.result = 'victory'; game.ui.abort(); });
  await page.waitForSelector('#screen-results.active', { timeout: 20000 });
  await press(page, 13);
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
  ok('on the results screen the d-pad lands on a button', !!focused, focused);
  await press(page, 0);
  await page.waitForTimeout(300);
  ok('A presses it: the Continue button has been taken', await page.evaluate(() => document.getElementById('btn-results').onclick === null));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  if (fails) { console.log(`${fails} check(s) FAILED`); process.exit(1); }
  console.log('all checks passed');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
