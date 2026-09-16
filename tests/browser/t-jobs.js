const { BASE, ALT } = require('./lib');
/* The new jobs through the real screens: unlock and switch in Formation,
   buy their weapons in the shop, and fight with them -- a katana swing and a
   harp shot both animate and sound without a page error. */
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  const sounds = [];
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new'); await page.waitForSelector('#screen-world.active');
  // Grant the JP that unlocks the second tier, and the gil to shop for it.
  await page.evaluate(() => {
    const [a, b, c, d] = game.state.party;
    for (const u of game.state.party) for (const j of ['knight', 'dragoon', 'blackMage', 'timeMage', 'monk', 'whiteMage', 'archer', 'samurai', 'summoner', 'geomancer', 'bard', 'ninja', 'paladin', 'arcanist', 'assassin', 'sage']) { u.jpTotal[j] = 1000; u.jp[j] = 1000; }
    game.state.gil = 20000; game.state.chapter = CAMPAIGN.length;   // the war is won
    audio.init(); const orig = audio.sfx.bind(audio); audio.sfx = (n) => { window.__sfx = (window.__sfx || []).concat(n); return orig(n); };
    game.showWorld();
  });
  await page.click('#btn-formation'); await page.waitForSelector('#screen-formation.active');
  const jobsOffered = await page.evaluate(() => [...document.querySelectorAll('#sel-job option')].filter(o => !o.disabled).map(o => o.value));
  ok('every tier is offered once its requirements are met', ['samurai', 'summoner', 'geomancer', 'bard', 'paladin', 'arcanist', 'assassin', 'sage', 'dragonlord', 'hierophant', 'fellKnight'].every(j => jobsOffered.includes(j)), jobsOffered.join(','));
  // Empty the hand first: a samurai may keep a sword, so the starter katana
  // is only issued when there is nothing to keep.
  await page.evaluate(() => { const u = game.state.party[0]; game.equip(u, 'weapon', null); });
  await page.selectOption('#sel-job', 'samurai'); await page.waitForTimeout(150);
  const after = await page.evaluate(() => ({ job: game.state.party[0].job, weapon: game.state.party[0].weapon.name, wtype: game.state.party[0].weapon.wtype }));
  ok('switching to Samurai hands over a katana', after.job === 'samurai' && after.wtype === 'katana', JSON.stringify(after));
  // Second unit becomes a bard.
  await page.evaluate(() => { const u = game.state.party[1]; game.equip(u, 'weapon', null); u.job = 'bard'; game.syncGear(u); });
  const bardKit = await page.evaluate(() => ({ job: game.state.party[1].job, wtype: game.state.party[1].weapon.wtype }));
  ok('a new bard is handed a harp', bardKit.job === 'bard' && bardKit.wtype === 'harp', JSON.stringify(bardKit));
  await page.evaluate(() => { const u = game.state.party[2]; game.equip(u, 'weapon', null); u.job = 'paladin'; game.syncGear(u); const v = game.state.party[3]; game.equip(v, 'weapon', null); v.job = 'sage'; game.syncGear(v); });
  const tier3 = await page.evaluate(() => [game.state.party[2].weapon.wtype, game.state.party[3].weapon.wtype]);
  ok('a new paladin and sage are handed a greatsword and a tome', tier3[0] === 'greatsword' && tier3[1] === 'tome', tier3.join(','));
  await page.click('#btn-formation-back'); await page.waitForSelector('#screen-world.active');
  await page.click('#btn-shop'); await page.waitForSelector('#screen-shop.active');
  const stocked = await page.evaluate(() => [...document.querySelectorAll('#shop-list button[data-buy]')].map(b => b.dataset.buy));
  ok('the shop stocks katanas and harps at this chapter', stocked.includes('kotetsu') && stocked.includes('bloodstrings') && stocked.includes('masamune'), stocked.filter(i => /kotetsu|masamune|harp|strings|Hood|walker|songstone/i.test(i)).join(','));
  ok('the wagon carries legendary arms once the war is won', ['ragnarok', 'apocrypha', 'gungnir', 'crownOfKings'].every(i => stocked.includes(i)), stocked.filter(i => /ragnarok|apocrypha|gungnir|crown|genji|dragon|seven/i.test(i)).join(','));
  await page.click('#btn-shop-back'); await page.waitForSelector('#screen-world.active');
  // Into a training battle; find the samurai and swing.
  await page.click('#btn-train'); await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 6; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open', { timeout: 20000 });
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });
  const swung = await page.evaluate(async () => {
    const b = game.battle;
    const sam = b.units.find(u => u.job === 'samurai'), bard = b.units.find(u => u.job === 'bard'), foe = b.units.find(u => u.team === 'enemy' && u.alive);
    const out = {};
    window.__sfx = [];
    if (sam && foe) { await game.renderer.animateAction(sam, ABILITIES.attack, foe.x, foe.y); out.katana = window.__sfx.slice(); }
    window.__sfx = [];
    if (bard && foe) { await game.renderer.animateAction(bard, ABILITIES.attack, foe.x, foe.y); out.harp = window.__sfx.slice(); }
    const pal = b.units.find(u => u.job === 'paladin'), sage = b.units.find(u => u.job === 'sage');
    window.__sfx = [];
    if (pal && foe) { await game.renderer.animateAction(pal, ABILITIES.attack, foe.x, foe.y); out.great = window.__sfx.slice(); }
    window.__sfx = [];
    if (sage && foe) { await game.renderer.animateAction(sage, ABILITIES.attack, foe.x, foe.y); out.tome = window.__sfx.slice(); }
    return { hasSam: !!sam, hasBard: !!bard, hasPal: !!pal, hasSage: !!sage, katana: out.katana || [], harp: out.harp || [], great: out.great || [], tome: out.tome || [] };
  });
  ok('a katana swing plays its own sound', swung.hasSam && swung.katana.includes('swing-katana'), JSON.stringify(swung.katana));
  ok('a harp attack is strummed', swung.hasBard && swung.harp.includes('strum'), JSON.stringify(swung.harp));
  ok('a greatsword swing has its own weight', swung.hasPal && swung.great.includes('swing-great'), JSON.stringify(swung.great));
  ok('a tome is read at the target', swung.hasSage && swung.tome.includes('incant'), JSON.stringify(swung.tome));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'all job checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
