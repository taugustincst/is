const { BASE, ALT } = require('./lib');
const { open, beginBattle } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  // Count every node the game actually creates, so silence is detectable.
  await page.addInitScript(() => {
    window.__audio = { osc: 0, buf: 0, ctx: 0 };
    const AC = window.AudioContext;
    window.AudioContext = function (...a) {
      window.__audio.ctx++;
      const c = new AC(...a);
      const o = c.createOscillator.bind(c), b = c.createBufferSource.bind(c);
      c.createOscillator = () => { window.__audio.osc++; return o(); };
      c.createBufferSource = () => { window.__audio.buf++; return b(); };
      return c;
    };
  });
  await page.goto(BASE + '/index.html');
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.waitForTimeout(400);
  const afterWorld = await page.evaluate(() => ({ ...window.__audio, track: audio.trackName, muted: audio.muted }));
  console.log('after entering camp:', JSON.stringify(afterWorld));
  // Mute toggles persist
  await page.click('#btn-sound-world');
  console.log('muted:', await page.evaluate(() => audio.muted), '| label', await page.textContent('#btn-sound-world'));
  await page.click('#btn-sound-world');
  console.log('unmuted:', await page.evaluate(() => audio.muted));
  await page.evaluate(() => { audio.setMusicMuted(true); });
  await page.reload();
  await page.click('#btn-continue').catch(async () => { await page.click('#btn-new'); });
  await page.waitForTimeout(200);
  console.log('music pref survived reload:', await page.evaluate(() => audio.musicMuted));
  await page.evaluate(() => audio.setMusicMuted(false));
  // Battle: music switches and combat sounds fire
  await page.evaluate(() => {
    BattleUI.prototype.awaitPlayerTurn = function (u) { return game.battle.aiTurn(u); };
    game.state.party.forEach(u => { u.level = 6; game.syncGear(u); });
    game.runBattle(MAPS.verdant, [{ job: 'squire', level: 3, x: 3, y: 2 }], 0, { objective: { type: 'rout' } });
  });
  await beginBattle(page);
  const beforeFight = await page.evaluate(() => ({ ...window.__audio, track: audio.trackName }));
  await page.waitForSelector('#screen-results.active', { timeout: 90000 });
  await page.waitForTimeout(600);
  const afterFight = await page.evaluate(() => ({ ...window.__audio, track: audio.trackName }));
  console.log('battle track:', beforeFight.track, '| results track:', afterFight.track);
  console.log('sound nodes made during the fight: osc', afterFight.osc - beforeFight.osc, 'noise', afterFight.buf - beforeFight.buf);
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
