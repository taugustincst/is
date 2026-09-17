const { BASE, ALT } = require('./lib');
// Plays the whole campaign through the real UI: story, deployment, battles
// (AI driving the player's turns), results, shopping, jobs and saving.
const { open, beginBattle } = require('./lib');
const S = require('./lib').OUT;

(async () => {
  const { browser, page, errors } = await open();
  await page.addInitScript(() => {
    window.__ready = () => {
      BattleUI.prototype.awaitPlayerTurn = function (u) { return game.battle.aiTurn(u); };
      // Skip animation waits so a whole campaign fits in one test run. Engine
      // logic is untouched; only the drawing and its delays are removed.
      const noop = () => Promise.resolve();
      for (const m of ['animateMove', 'animateAction', 'onJump', 'onLand', 'onDeath', 'focus']) Renderer.prototype[m] = noop;
      Renderer.prototype.draw = function () {};
    };
  });
  await page.goto(BASE + '/index.html');
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.evaluate(() => window.__ready());

  const clickThroughStory = async () => {
    if (!await page.isVisible('#screen-story.active')) return;
    for (let i = 0; i < 10; i++) {
      const t = await page.textContent('#btn-story-next');
      await page.click('#btn-story-next');
      await page.waitForTimeout(60);
      if (t === 'Onward') break;
    }
  };
  // Spend JP and gil the way a player would, through the real screens.
  const develop = async () => {
    await page.click('#btn-shop');
    await page.waitForSelector('#screen-shop.active');
    for (let round = 0; round < 14; round++) {
      const bought = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('#shop-list button[data-buy]')].filter(b => !b.disabled);
        if (!btns.length) return false;
        btns[Math.floor(Math.random() * Math.min(4, btns.length))].click();
        return true;
      });
      if (!bought) break;
      await page.waitForTimeout(40);
    }
    await page.click('#btn-shop-back');
    await page.waitForSelector('#screen-world.active');
    await page.click('#btn-formation');
    await page.waitForSelector('#screen-formation.active');
    const n = await page.evaluate(() => game.state.party.length);
    for (let i = 0; i < n; i++) {
      await page.evaluate((i) => game.openFormation(i), i);
      await page.waitForTimeout(50);
      // Learn whatever is affordable, take any newly unlocked job, then optimise.
      for (let k = 0; k < 6; k++) {
        const did = await page.evaluate(() => {
          const b = [...document.querySelectorAll('button[data-learn]')].find(x => !x.disabled);
          if (!b) return false; b.click(); return true;
        });
        if (!did) break;
        await page.waitForTimeout(40);
      }
      await page.evaluate(() => {
        const sel = document.getElementById('sel-job');
        const rank = ['ninja','dragoon','monk','knight','timeMage','blackMage','whiteMage','thief','archer'];
        const open = [...sel.options].filter(o => !o.disabled).map(o => o.value);
        const pick = rank.find(j => open.includes(j));
        if (pick && pick !== sel.value) { sel.value = pick; sel.dispatchEvent(new Event('change')); }
      });
      await page.waitForTimeout(60);
      await page.evaluate(() => { const b = document.getElementById('btn-optimize'); if (b) b.click(); });
      await page.waitForTimeout(40);
    }
    await page.click('#btn-formation-back');
    await page.waitForSelector('#screen-world.active');
  };

  const fight = async (label) => {
    await clickThroughStory();
    await beginBattle(page);
    await page.waitForSelector('#screen-results.active', { timeout: 240000 });
    const title = (await page.textContent('#results-title')).trim();
    await page.click('#btn-results');
    await page.waitForTimeout(200);
    await clickThroughStory();
    await page.waitForSelector('#screen-world.active', { timeout: 30000 });
    return title;
  };

  let chapter = 0, guard = 0, log = [], attempts = 0;
  // The common road, then one of the five roads out of the capital, chosen by
  // the day so every road gets walked over a week of runs.
  const ROAD = process.env.ELDERON_ROAD || ['crown', 'council', 'exile', 'quiet', 'iron'][new Date().getDay() % 5];
  const CH = await page.evaluate(() => CAMPAIGN.length + 2);
  while (chapter < CH && guard++ < 80) {
    if (await page.evaluate(() => game.atFork())) {
      await page.evaluate((id) => game.chooseRoad(id), ROAD);
      console.log('road chosen:', ROAD, 'party', await page.evaluate(() => game.state.party.length));
    }
    await develop();
    // A training battle before each chapter, as the balance pass assumes.
    await page.click('#btn-train');
    const tr = await fight('training');
    await page.click('#btn-battle');
    const res = await fight('chapter');
    const now = await page.evaluate(() => ({ ch: game.state.chapter, lv: Math.round(game.state.party.reduce((a,u)=>a+u.level,0)/game.state.party.length), gil: game.state.gil, party: game.state.party.length }));
    log.push(`ch${chapter + 1}: ${res} (training ${tr}) -> chapter ${now.ch}, party ${now.party} @Lv${now.lv}, ${now.gil} gil`);
    console.log(log[log.length - 1]);
    attempts++;
    if (now.ch > chapter) chapter = now.ch;
  }
  console.log('--- campaign finished at chapter index', chapter, 'after', attempts, 'attempts; ending:', await page.evaluate(() => Object.keys(game.state.endings).join(',')), '---');
  await page.screenshot({ path: `${S}/shot-endgame.png` });
  // Save and reload keeps everything.
  await page.click('#btn-save');
  await page.reload();
  await page.click('#btn-continue');
  await page.waitForSelector('#screen-world.active');
  const restored = await page.evaluate(() => ({
    ch: game.state.chapter, party: game.state.party.length, gil: game.state.gil,
    gear: game.state.party.filter(u => u.gear.weapon).length,
    passives: game.state.party.filter(u => Object.values(u.passives).some(Boolean)).length,
    jobs: [...new Set(game.state.party.map(u => u.job))].join(','),
  }));
  console.log('after reload:', JSON.stringify(restored));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (chapter < CH) { console.log('CAMPAIGN NOT COMPLETED'); process.exit(2); }
})().catch(e => { console.error('FAILED', e); process.exit(1); });
