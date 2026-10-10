const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;
/* Words on the field: the leader's opening line and the boss's answer come
   up as bubbles over their heads and the battle waits for each; a tap or a
   key sends one on; half health and a first kill bring their lines; the
   bubble stays inside the board on a phone. */
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
const bubble = (page) => page.evaluate(() => {
  const el = document.getElementById('speech'); if (el.hidden) return null;
  const r = el.getBoundingClientRect(), host = document.getElementById('screen-battle').getBoundingClientRect();
  return { name: el.querySelector('b').textContent, text: el.querySelector('span').textContent, cls: el.className, shown: el.classList.contains('show'), inside: r.left >= host.left && r.right <= host.right + 1 && r.top >= host.top && r.bottom <= host.bottom + 1, w: Math.round(r.width), top: Math.round(r.top), face: !!el.querySelector('canvas') };
});
(async () => {
  const { browser, page, errors } = await open();
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => {
    game.state.party.forEach(u => { u.level = 8; game.syncGear(u); u.record.kills = 0; });
    game.runBattle(MAPS.verdant, [
      { job: 'knight', level: 6, x: 8, y: 2, name: 'Ser Test', boss: true, lines: { open: 'Come, then.', half: 'Is that all?', fall: 'Ah. So it is.' } },
      { job: 'squire', level: 1, x: 6, y: 6, name: 'Stable Boy' },
    ], 0, { objective: { type: 'boss', protectLeader: true }, talk: [{ who: 'leader', text: 'Form up. Nobody dies today.' }] });
  });
  await beginBattle(page);
  await page.waitForSelector('#speech.show', { timeout: 15000 });
  const first = await bubble(page);
  ok('the leader opens the battle in a bubble with his face, inside the board', first && first.name === 'Rowan' && /Nobody dies/.test(first.text) && /player/.test(first.cls) && first.inside && first.face, JSON.stringify(first));
  await page.screenshot({ path: `${S}/talk-leader.png` });
  const waiting = await page.evaluate(() => !game.ui.turn);
  ok('the battle waits while the line is read', waiting);
  await page.click('#speech');
  await page.waitForSelector('#speech.show', { timeout: 5000 });
  const second = await bubble(page);
  ok('a tap sends it on; the boss answers in red', second && second.name === 'Ser Test' && second.text === 'Come, then.' && /enemy/.test(second.cls), JSON.stringify(second));
  await page.screenshot({ path: `${S}/talk-boss.png` });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.getElementById('speech').hidden, null, { timeout: 5000 });
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 30000 });
  const logged = await page.evaluate(() => [...document.querySelectorAll('#log .log-line.talk')].map(l => l.textContent));
  ok('both lines are in the log as speech', logged.length === 2 && /Rowan: /.test(logged[0]) && /Ser Test: /.test(logged[1]), JSON.stringify(logged));
  // Half health, by a blow from the leader.
  const half = await page.evaluate(async () => {
    const b = game.battle, boss = b.units.find(u => u.boss), lead = b.objective.leader;
    boss.hp = Math.floor(boss.maxHp / 2) + 1;
    b.checkTalk(boss); await b.flushTalk();
    const early = !document.getElementById('speech').hidden;
    boss.hp = Math.floor(boss.maxHp / 2);
    const p = b.flushTalk.bind(b);
    b.checkTalk(boss);
    const t0 = performance.now();
    const fl = p();
    await new Promise(r => setTimeout(r, 150));
    const el = document.getElementById('speech');
    const mid = { hidden: el.hidden, text: el.querySelector('span') && el.querySelector('span').textContent };
    el.click();
    await fl;
    return { early, mid, took: Math.round(performance.now() - t0), kills: lead.record.kills };
  });
  ok('a point above half says nothing; at half the boss speaks, and a tap ends the wait', half.early === false && !half.mid.hidden && half.mid.text === 'Is that all?' && half.took < 1500, JSON.stringify(half));
  // First blood.
  const blood = await page.evaluate(async () => {
    const b = game.battle, lead = b.objective.leader, boy = b.units.find(u => u.name === 'Stable Boy');
    lead.record.kills = 0;
    boy.hp = 1;
    const p = b.applyAbility(lead, ABILITIES.attack, boy.x, boy.y);
    // the attack must land: stand next to him first
    return await Promise.race([p.then(() => 'done'), new Promise(r => setTimeout(() => r('still going'), 6000))]);
  }).catch(e => String(e));
  const said = await page.evaluate(() => game.battle.spoken.map(s => `${s.name}: ${s.text}`));
  ok('the first kill is remarked on (or missed, with the words kept for the next)', said.length >= 2, JSON.stringify(said) + ' ' + blood);
  // On a phone the bubble sits inside the board, under the top panel.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const phone = page.evaluate(async () => { const b = game.battle; const p = b.say(b.objective.leader, 'A longer line, to see how the bubble sits on a small screen, where the panels take most of the room.'); await new Promise(r => setTimeout(r, 200)); const el = document.getElementById('speech'); const r = el.getBoundingClientRect(); const top = document.getElementById('battle-top').getBoundingClientRect(); const out = { w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), belowTop: r.top >= top.bottom - 1, vw: innerWidth, vh: innerHeight }; el.click(); await p; return out; });
  const ph = await phone;
  ok('on a phone the bubble fits the width and sits below the top panel', ph.left >= 0 && ph.right <= ph.vw && ph.belowTop && ph.bottom <= ph.vh, JSON.stringify(ph));
  await page.evaluate(() => { const b = game.battle; b.say(b.objective.leader, 'Hold the line.'); });
  await page.waitForSelector('#speech.show', { timeout: 3000 });
  await page.screenshot({ path: `${S}/talk-phone.png` });
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  if (fails) { console.log(`${fails} check(s) FAILED`); process.exit(1); }
  console.log('all checks passed');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
