const { BASE, ALT } = require('./lib');
const { chromePath } = require('./lib');
const { chromium } = require('playwright-core');
let fails = 0;
const ok = (n, c, d) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (d ? `  [${d}]` : '')); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 660 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + '/index.html');
  await page.waitForSelector('#screen-title.active');
  await page.click('#btn-new');
  await page.waitForSelector('#screen-world.active');
  await page.click('#btn-battle');
  await page.waitForSelector('#screen-story.active');
  for (let i = 0; i < 8; i++) { const t = await page.textContent('#btn-story-next'); await page.click('#btn-story-next'); if (t === 'Onward') break; }
  await page.waitForSelector('#deploy-panel.open');
  await page.click('#deploy-panel button[data-a="go"]');
  await page.waitForFunction(() => game.ui.turn && game.ui.turn.mode === 'menu', null, { timeout: 40000 });

  const r = await page.evaluate(async () => {
    const b = game.battle;
    // Listen in on the mixer rather than the speakers.
    const heard = [];
    const real = audio.sfx.bind(audio);
    audio.sfx = (n) => { heard.push(n); };
    const me = b.units.find(u => u.team === 'player' && u.alive);
    const foe = b.units.find(u => u.team !== 'player' && u.alive);
    const adj = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => b.grid.tile(foe.x+dx, foe.y+dy))
      .find(t => t && t.t !== 'x' && !b.units.some(o => o.alive && o !== me && o.x === t.x && o.y === t.y));
    if (adj) { me.x = adj.x; me.y = adj.y; }
    b.hitChance = () => 100;
    const run = async (weapon, abId) => {
      if (weapon) me.gear.weapon = weapon;
      foe.hp = foe.maxHp;
      heard.length = 0;
      await b.applyAbility(me, ABILITIES[abId], foe.x, foe.y);
      return heard.slice();
    };
    const out = {};
    out.sword = await run('broadsword', 'attack');
    out.axe = await run('battleAxe', 'attack');
    out.spear = await run('spear', 'attack');
    out.knife = await run('dagger', 'attack');
    out.bow = await run('shortbow', 'attack');
    out.fire = await run(null, 'fire');
    out.ice = await run(null, 'blizzard');
    out.thunder = await run(null, 'thunder');
    out.earth = await run(null, 'stone');
    out.holy = await run(null, 'holyBolt');
    out.dark = await run(null, 'blackTide');
    out.cure = await run(null, 'cure');
    out.stone = await run('broadsword', 'throwStone');
    // A blow that is turned aside.
    b.hitChance = () => 0;
    out.miss = await run('broadsword', 'attack');
    audio.sfx = real;
    return out;
  });

  const has = (k, s) => (r[k] || []).includes(s);
  ok('a sword swings and bites', has('sword', 'swing-blade') && has('sword', 'impact-slash'), r.sword.join(' '));
  ok('an axe swings heavy and lands dull', has('axe', 'swing-heavy') && has('axe', 'impact-blunt'), r.axe.join(' '));
  ok('a spear pierces', has('spear', 'swing-pierce') && has('spear', 'impact-pierce'), r.spear.join(' '));
  ok('a knife is heard twice', r.knife.filter(s => s === 'swing-light').length === 2, r.knife.join(' '));
  ok('a bow twangs then thuds', has('bow', 'bow-release') && has('bow', 'impact-arrow'), r.bow.join(' '));
  ok('a thrown stone is heard leaving the hand', has('stone', 'throw'), r.stone.join(' '));
  for (const [el, snd] of [['fire','el-fire'],['ice','el-ice'],['thunder','el-thunder'],['earth','el-earth'],['holy','el-holy'],['dark','el-dark']]) {
    ok(`${el} is heard as ${snd}`, has(el, snd), r[el].join(' '));
  }
  ok('a spell is heard being gathered first', r.fire.indexOf('cast') === 0, r.fire.join(' '));
  ok('a cure is heard mending', has('cure', 'heal'), r.cure.join(' '));
  ok('an elemental blow is not also heard as its weapon',
     !r.fire.some(s => s.startsWith('impact-')), r.fire.join(' '));
  ok('a blow that misses is heard missing', has('miss', 'miss') && !r.miss.some(s => s.startsWith('impact-')), r.miss.join(' '));
  ok('nothing plays the old generic thump', !Object.values(r).some(l => l.includes('hit')),
     'no "hit" anywhere');

  console.log('ERRORS:', errs.length ? errs : 'none');
  if (errs.length) fails++;
  await browser.close();
  console.log(fails ? `\n${fails} check(s) FAILED` : '\nall combat sound cues fire correctly');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
