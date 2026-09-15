/* ==========================================================================
   Game controller: screens, campaign progression, formation, saving.
   ========================================================================== */

const SAVE_KEY = 'elderon-tactics-save';
const PACE_KEY = 'elderon.pace';
// Where each chapter sits on the map of the realm, as fractions of the canvas.
// Twelve stops: Act I runs east along the lower road, Act II turns back west
// along the coast above it, so the two never cross on the parchment.
// Seventeen stops in three bands: Act I east along the lower road, Act II
// back west along the coast, Act III north over the ice at the top.
const WORLD_ROUTE = [
  [0.06, 0.86], [0.18, 0.74], [0.30, 0.88], [0.42, 0.74], [0.54, 0.88], [0.66, 0.74], [0.80, 0.86],
  [0.92, 0.66], [0.78, 0.56], [0.62, 0.64], [0.46, 0.54], [0.30, 0.62],
  [0.14, 0.50], [0.10, 0.32], [0.26, 0.22], [0.44, 0.30], [0.62, 0.14],
];
const HIRE_NAMES = ['Aldo', 'Bea', 'Corin', 'Dessa', 'Emeric', 'Faye', 'Gil', 'Hollis', 'Ines', 'Joss', 'Kit', 'Lune', 'Marek', 'Nia', 'Orrin', 'Pell'];

const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    this.state = null;
    this.renderer = new Renderer($('battle-canvas'));
    this.ui = new BattleUI(this.renderer);
    this.bindScreens();
    // Audio can only start after a gesture, so arm it on the first interaction.
    const arm = () => { audio.init(); if (this.screen === 'world') audio.playMusic('town'); };
    window.addEventListener('pointerdown', arm, { once: true });
    window.addEventListener('keydown', arm, { once: true });
    this.showScreen('title');
    $('btn-continue').disabled = !localStorage.getItem(SAVE_KEY);
  }

  // ---- screens -----------------------------------------------------------------------
  showScreen(name) {
    this.screen = name;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
    // Each part of the game keeps its own theme.
    if (name === 'battle') { audio.playMusic(this.battleMusic || 'battle'); audio.startAmbient(AMBIENCE[this.renderer.mood] || null); }
    else if (name === 'story') { audio.playMusic('ruin'); audio.stopAmbient(); }
    else if (name === 'results') { audio.stopMusic(); audio.stopAmbient(); }
    else if (name !== 'title') { audio.playMusic('town'); audio.stopAmbient(); }
    else { audio.stopMusic(); audio.stopAmbient(); }
  }

  bindScreens() {
    $('btn-new').onclick = () => this.newGame();
    $('btn-continue').onclick = () => this.loadGame();
    $('btn-battle').onclick = () => this.startNextChapter();
    $('btn-train').onclick = () => this.startTraining();
    $('btn-formation').onclick = () => this.openFormation();
    $('btn-shop').onclick = () => this.openShop();
    $('btn-baggage').onclick = () => this.openBaggage();
    $('world-stock').onclick = () => this.openBaggage();
    $('btn-shop-back').onclick = () => this.showWorld();
    $('btn-bag-back').onclick = () => this.showWorld();
    $('btn-bag-shop').onclick = () => this.openShop('buy');
    $('btn-save').onclick = () => { this.saveGame(); this.toast('Game saved.'); };
    $('btn-title').onclick = () => this.showScreen('title');
    $('btn-formation-back').onclick = () => this.showWorld();
    $('btn-hire-squire').onclick = () => this.hire('squire');
    $('btn-hire-chemist').onclick = () => this.hire('chemist');
    $('btn-retreat').onclick = () => this.retreat();
    $('btn-help').onclick = () => $('help').classList.toggle('open');
    $('btn-speed').onclick = () => this.cyclePace();
    $('btn-auto').onclick = () => this.ui.setAuto(!this.ui.auto);
    this.setPace(+localStorage.getItem(PACE_KEY) || 1);
    $('btn-rot-l').onclick = () => this.ui.turnField(-1);
    $('btn-rot-r').onclick = () => this.ui.turnField(1);
    for (const id of ['btn-sound', 'btn-sound-world']) {
      const b = $(id);
      if (b) b.onclick = () => { audio.init(); audio.setMuted(!audio.muted); this.renderSound(); };
    }
    const bm = $('btn-music');
    if (bm) bm.onclick = () => { audio.init(); audio.setMusicMuted(!audio.musicMuted); this.renderSound(); };
    // On a phone the battle log is hidden by default and toggled from the bar.
    const bl = $('btn-log');
    if (bl) bl.onclick = () => $('log').classList.toggle('hidden');
    this.renderSound();
    $('btn-help-close').onclick = () => $('help').classList.remove('open');
  }

  renderSound() {
    for (const id of ['btn-sound', 'btn-sound-world']) {
      const b = $(id);
      if (b) { b.textContent = audio.muted ? '🔇' : '🔊'; b.title = audio.muted ? 'Sound off' : 'Sound on'; }
    }
    const bm = $('btn-music');
    if (bm) { bm.textContent = audio.musicMuted ? '♪̸' : '♪'; bm.title = audio.musicMuted ? 'Music off' : 'Music on'; }
  }

  toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 1600);
  }

  // ---- state -----------------------------------------------------------------------------
  newGame() {
    this.state = {
      party: STARTING_PARTY.map(p => new Unit(Object.assign({ team: 'player' }, p))),
      gil: 500, chapter: 0, victories: 0, trials: 0, inventory: {}, difficulty: this.pendingDifficulty || 'knight',
      errands: { offered: [], active: [], reports: [] }, cities: {},
    };
    this.showWorld();
  }

  saveGame() {
    const data = {
      v: 3, gil: this.state.gil, chapter: this.state.chapter, victories: this.state.victories, trials: this.state.trials || 0,
      difficulty: this.state.difficulty, errands: this.state.errands, cities: this.state.cities || {},
      inventory: this.state.inventory, party: this.state.party.map(u => u.toSave()),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    $('btn-continue').disabled = false;
  }

  loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    let d;
    try {
      d = JSON.parse(raw);
      if (!d || !Array.isArray(d.party) || !d.party.length) throw new Error('no party');
    } catch (e) {
      // A truncated or hand-edited save used to throw inside the click handler,
      // leaving the player on the title screen with a button that did nothing.
      localStorage.removeItem(SAVE_KEY);
      $('btn-continue').disabled = true;
      this.toast('That save could not be read. Start a new game.');
      return;
    }
    // Anything a Unit cannot make sense of, it heals on the way in.
    this.state = {
      gil: Number.isFinite(d.gil) ? d.gil : 0,
      chapter: Number.isFinite(d.chapter) ? Math.max(0, Math.min(CAMPAIGN.length, d.chapter)) : 0,
      victories: d.victories || 0,
      trials: d.trials || 0,
      inventory: {},
      difficulty: DIFFICULTIES[d.difficulty] ? d.difficulty : 'knight',
      party: d.party.map(p => Unit.fromSave(Object.assign({ team: 'player' }, p))),
      errands: { offered: [], active: [], reports: [] },
      cities: {},
    };
    for (const id of Object.keys(d.cities || {})) if (CITIES.some(c => c.id === id) && d.cities[id]) this.state.cities[id] = true;
    // Errands are kept only where they still make sense: a known errand, sent
    // with a unit that is still in the party.
    const e = d.errands || {};
    const ids = new Set(this.state.party.map(u => u.id));
    this.state.errands.offered = (e.offered || []).filter(id => ERRANDS.some(x => x.id === id));
    this.state.errands.active = (e.active || []).filter(a => a && ERRANDS.some(x => x.id === a.id) && ids.has(a.unit) && a.left > 0);
    this.state.errands.reports = (e.reports || []).filter(r => typeof r === 'string').slice(-3);
    for (const [id, n] of Object.entries(d.inventory || {})) {
      if (ITEMS[id] && n > 0) this.state.inventory[id] = n;
    }
    this.showWorld();
  }

  avgLevel() { return Math.max(1, Math.round(this.state.party.reduce((a, u) => a + u.level, 0) / this.state.party.length)); }

  // ---- inventory and equipment -------------------------------------------------------------------
  invCount(id) { return this.state.inventory[id] || 0; }

  invAdd(id, n = 1) {
    // Free starter kit belongs to the unit it was granted to. Letting it into
    // the shared baggage would mint a new copy on every job change.
    if (!ITEMS[id] || ITEMS[id].price === 0) return;
    this.state.inventory[id] = this.invCount(id) + n;
  }

  invRemove(id, n = 1) {
    const left = this.invCount(id) - n;
    if (left > 0) this.state.inventory[id] = left; else delete this.state.inventory[id];
  }

  // Item ids a unit could put in a slot right now: whatever is in stock, plus
  // whatever it is already wearing there.
  slotOptions(unit, slot) {
    const ids = Object.keys(this.state.inventory).filter(id => this.invCount(id) > 0);
    if (unit.gear[slot]) ids.push(unit.gear[slot]);
    if (slot === 'offhand' && unit.hasPassive('twoHands')) return []; // both hands are busy
    return [...new Set(itemsForSlot(unit.job, slot, ids, unit.equipExtra()))];
  }

  equip(unit, slot, id) {
    if (id && !unit.canEquipItem(id, slot)) return false;
    if (id && !this.invCount(id)) return false;
    const old = unit.gear[slot];
    if (old) this.invAdd(old);
    if (id) { this.invRemove(id); unit.gear[slot] = id; } else delete unit.gear[slot];
    return true;
  }

  // Equip the best available loadout for this unit out of stock plus whatever it
  // already wears. Worked as a diff so a slot is never emptied for want of a
  // replacement, which would quietly destroy a free starter item.
  optimize(unit) {
    const pool = [];
    for (const [id, n] of Object.entries(this.state.inventory)) for (let i = 0; i < n; i++) pool.push(id);
    for (const slot of Object.keys(SLOT_NAMES)) if (unit.gear[slot]) pool.push(unit.gear[slot]);
    const best = bestGearFor(unit.job, pool, undefined, unit.equipExtra());
    for (const slot of Object.keys(SLOT_NAMES)) {
      if (slot === 'offhand' && unit.hasPassive('twoHands')) continue;
      const want = best[slot];
      const have = unit.gear[slot];
      if (!want || want === have) continue;
      // Release the old piece first so the new one can be drawn from stock.
      if (have) this.equip(unit, slot, null);
      if (!this.equip(unit, slot, want) && have) unit.gear[slot] = have; // put it back
    }
  }

  // Gear the shop stocks, widening as the campaign advances.
  // From the Aether Yards on, and after the war, the wagon carries the legendary arms, tier 7.
  shopTier() { const c = this.state.chapter; return !CAMPAIGN[c] || c >= 10 ? 7 : Math.min(6, c + 1); }

  // Reconcile a unit's gear with its job after a job change: anything the new job
  // cannot wear goes back into stock, and empty core slots are refilled from
  // stock, falling back to the job's free starter kit only if stock has nothing.
  syncGear(unit) {
    for (const id of unit.dropInvalidGear()) this.invAdd(id);
    const starter = STARTER_GEAR[unit.job] || {};
    for (const slot of ['weapon', 'body']) {
      if (unit.gear[slot]) continue;
      const opts = this.slotOptions(unit, slot);
      if (opts.length) {
        const best = opts.reduce((a, b) => (gearScore(unit.job, b) > gearScore(unit.job, a) ? b : a));
        this.equip(unit, slot, best);
      } else if (starter[slot]) {
        unit.gear[slot] = starter[slot]; // free kit, price 0 so it cannot be sold
      }
    }
  }

  // ---- world screen --------------------------------------------------------------------------
  showWorld() {
    const s = this.state;
    const ch = CAMPAIGN[s.chapter];
    $('world-gil').textContent = `${s.gil} gil`;
    $('world-party').innerHTML = s.party.map((u, i) => {
      const away = this.errandOf(u);
      const learn = !away && this.canLearnSomething(u);
      return `<div class="party-chip ${i < 5 ? '' : 'reserve'} ${away ? 'away' : ''}" title="${away ? `Away: ${ERRANDS.find(x => x.id === away.id).title}` : learn ? 'Has JP to spend in Formation' : ''}">${u.name}${learn ? ' <span class="learn-mark">✦</span>' : ''} <small>${away ? 'on an errand' : `Lv${u.level} ${u.jobData.name}`}</small></div>`;
    }).join('');
    this.renderErrands();
    if (ch) {
      const o = ch.objective || { type: 'rout' };
      const goal = o.type === 'survive' ? `Hold out for ${o.rounds} rounds`
        : o.type === 'boss' ? `Defeat ${(ch.enemies.find(e => e.boss) || {}).name || 'the commander'}`
        : 'Defeat every enemy';
      const topLevel = Math.max(...ch.enemies.map(e => e.level));
      const ready = this.readiness(ch);
      const act = ACTS.find(a => s.chapter >= a.from && s.chapter <= a.to) || ACTS[0];
      $('world-next').innerHTML = `
        <div class="chapter-num">Act ${ACTS.indexOf(act) + 1} · ${act.title} · Chapter ${s.chapter + 1}</div>
        <div class="chapter-title">${ch.title}</div>
        <div class="chapter-map">${MAPS[ch.map].name} · ${ch.enemies.length} enemies · up to Lv ${topLevel}</div>
        <div class="chapter-goal">Objective: ${goal}${o.protectLeader ? ' · Rowan must not be lost' : ''}</div>
        ${ready ? `<div class="chapter-warn">${ready}</div>` : ''}`;
      $('btn-battle').disabled = false;
      $('btn-battle').textContent = 'March to Battle';
    } else {
      // The war is won; the trials are what a company does with peace.
      const n = (s.trials || 0) + 1, t = this.trialSpec(n);
      $('world-next').innerHTML = `
        <div class="chapter-num">After the war · Trial ${n}</div>
        <div class="chapter-title">${t.title}</div>
        <div class="chapter-map">${MAPS[t.map].name} · ${t.enemies.length} enemies · Lv ${t.level}</div>
        <div class="chapter-goal">Objective: Defeat every enemy · ${t.gil} gil</div>
        <div class="chapter-map">The war is won. Each trial is harder than the last, and nothing is lost by failing one. The wagon now carries legendary arms, and a trial won may turn one up.</div>
        <div class="chapter-goal act-after">${AFTER_THE_WAR}</div>`;
      $('btn-battle').disabled = false;
      $('btn-battle').textContent = `Trial ${n}`;
    }
    this.renderCampTabs();
    this.renderCampfire();
    this.renderCities();
    const diff = DIFFICULTIES[s.difficulty] || DIFFICULTIES.knight;
    $('world-difficulty').innerHTML = Object.entries(DIFFICULTIES).map(([id, d]) =>
      `<button data-diff="${id}" class="${id === s.difficulty ? 'sel' : ''}" title="${d.desc}">${d.name}</button>`).join('') +
      `<div class="diff-desc">${diff.desc}</div>`;
    $('world-difficulty').querySelectorAll('button').forEach(b => b.onclick = () => {
      this.state.difficulty = b.dataset.diff;
      this.toast(`Difficulty set to ${DIFFICULTIES[b.dataset.diff].name}.`);
      this.showWorld();
    });
    const spare = Object.values(this.state.inventory).reduce((a, b) => a + b, 0);
    $('world-stock').textContent = spare ? `Baggage: ${spare} spare item${spare === 1 ? '' : 's'} · open` : 'Baggage: nothing spare · open';
    const hireLvl = Math.max(1, this.avgLevel() - 1);
    $('hire-info').textContent = `Hire a level ${hireLvl} recruit for 300 gil (party max 8).`;
    $('btn-hire-squire').disabled = $('btn-hire-chemist').disabled = s.gil < 300 || s.party.length >= 8;
    this.showScreen('world');
    // Drawn once the screen is showing, so the canvas has a width to fit.
    this.drawWorldMap();
  }

  // The camp in four pages, so the screen is never a scroll of every card at
  // once. The page stays where it was left, across visits and sessions.
  renderCampTabs() {
    const el = $('camp-tabs'); if (!el) return;
    const s = this.state;
    const cur = this.campTab || localStorage.getItem('elderon.campTab') || 'road';
    const liberable = CITIES.filter(c => this.cityReachable(c) && !this.cityOpen(c.id)).length;
    const reports = (s.errands && s.errands.reports || []).length;
    const tabs = [
      ['road', 'Road', 0], ['company', 'Company', reports], ['cities', 'Cities', liberable], ['options', 'Options', 0],
    ];
    el.innerHTML = tabs.map(([id, label, n]) => `<button data-camp="${id}" class="${id === cur ? 'sel' : ''}">${label}${n ? `<span class="badge">${n}</span>` : ''}</button>`).join('');
    el.querySelectorAll('button').forEach(b => b.onclick = () => { audio.sfx('menu'); this.showCampTab(b.dataset.camp); });
    this.showCampTab(cur, true);
  }

  showCampTab(id, silent) {
    this.campTab = id;
    try { localStorage.setItem('elderon.campTab', id); } catch (e) { /* private mode */ }
    document.querySelectorAll('[data-camp-tab]').forEach(el => el.classList.toggle('tab-hidden', el.dataset.campTab !== id));
    document.querySelectorAll('#camp-tabs button').forEach(b => b.classList.toggle('sel', b.dataset.camp === id));
  }

  // What the company says the night before: the next chapter's talk, or, once
  // the war is won, the epilogue a line or two at a time as the trials go by.
  renderCampfire() {
    const el = $('campfire'); if (!el) return;
    const s = this.state, ch = CAMPAIGN[s.chapter];
    let lines;
    if (ch) lines = ch.camp || [];
    else { const n = Math.min(EPILOGUE_CAMP.length, 2 + (s.trials || 0)); lines = EPILOGUE_CAMP.slice(0, n); }
    el.innerHTML = lines.map(l => `<p>${l}</p>`).join('') || '<p class="muted">The fire burns low. Nobody has anything to say.</p>';
  }

  // A word of warning when the party is walking into a chapter underprepared.
  // Levels and equipment are the two levers, so name whichever is behind.
  readiness(ch) {
    const s = this.state;
    const deploy = s.party.slice(0, 5);
    if (!deploy.length) return '';
    const foeLevel = Math.max(...ch.enemies.map(e => e.level));
    const avgLevel = deploy.reduce((a, u) => a + u.level, 0) / deploy.length;
    // Average gear tier of the pieces actually worn, against what the shop sells.
    let tiers = 0, slots = 0;
    for (const u of deploy) {
      for (const slot of Object.keys(SLOT_NAMES)) {
        const it = u.equipped(slot);
        tiers += it ? it.tier : 0;
        slots++;
      }
    }
    const gearTier = slots ? tiers / slots : 0;
    const want = this.shopTier();
    const notes = [];
    if (avgLevel < foeLevel - 1) notes.push('they outrank you');
    if (gearTier < want - 1.6) notes.push('your kit is behind what the shop stocks');
    if (!notes.length) return '';
    const advice = notes.includes('your kit is behind what the shop stocks')
      ? 'Spend at the shop, or fight a training battle first.'
      : 'A training battle or two would even the odds.';
    return `This looks like a hard fight: ${notes.join(' and ')}. ${advice}`;
  }

  hire(job) {
    const s = this.state;
    if (s.gil < 300 || s.party.length >= 8) return;
    s.gil -= 300;
    const used = new Set(s.party.map(u => u.name));
    const pool = HIRE_NAMES.filter(n => !used.has(n));
    const name = pool[Math.floor(Math.random() * pool.length)] || `Recruit ${s.party.length}`;
    s.party.push(new Unit({ name, job, level: Math.max(1, this.avgLevel() - 1), team: 'player' }));
    this.toast(`${name} the ${JOBS[job].name} joins the party.`);
    this.showWorld();
  }

  // ---- formation screen -------------------------------------------------------------------------
  openFormation(selIdx = 0) {
    const s = this.state;
    this.formSel = Math.min(selIdx, s.party.length - 1);
    $('form-gil').textContent = `${s.gil} gil`;
    $('form-list').innerHTML = s.party.map((u, i) => `
      <div class="form-row ${i === this.formSel ? 'sel' : ''} ${i >= 5 ? 'reserve' : ''}" data-i="${i}">
        <span class="slot">${i < 5 ? i + 1 : 'R'}</span>
        <canvas class="row-portrait" data-portrait="${i}"></canvas>
        <span class="name">${u.name}${u.leader ? ' ♛' : ''}</span>
        <span class="job">Lv${u.level} ${u.jobData.name}${this.errandOf(u) ? ' · away' : ''}${this.canLearnSomething(u) ? ' <span class="learn-mark" title="JP to spend">✦</span>' : ''}</span>
        <span class="btns"><button data-up="${i}" ${i === 0 ? 'disabled' : ''}>▲</button><button data-down="${i}" ${i === s.party.length - 1 ? 'disabled' : ''}>▼</button></span>
      </div>`).join('');
    $('form-list').querySelectorAll('canvas[data-portrait]').forEach(cv => paintUnitSprite(cv, s.party[+cv.dataset.portrait], 1));
    $('form-list').querySelectorAll('.form-row').forEach(r => r.onclick = (e) => { if (e.target.tagName !== 'BUTTON') this.openFormation(+r.dataset.i); });
    $('form-list').querySelectorAll('button').forEach(b => b.onclick = () => {
      const i = b.dataset.up !== undefined ? +b.dataset.up : +b.dataset.down;
      const j = b.dataset.up !== undefined ? i - 1 : i + 1;
      [s.party[i], s.party[j]] = [s.party[j], s.party[i]];
      this.openFormation(j);
    });
    this.renderFormationDetail();
    this.showScreen('formation');
  }

  renderFormationDetail() {
    const u = this.state.party[this.formSel];
    const st = u.baseStats();
    const jobOpts = Object.entries(JOBS).filter(([, j]) => j.req !== null).map(([id, j]) => {
      const ok = u.canUseJob(id);
      const req = Object.entries(j.req).map(([r, l]) => `${JOBS[r].name} ${l}`).join(', ');
      return `<option value="${id}" ${id === u.job ? 'selected' : ''} ${ok ? '' : 'disabled'}>${j.name}${ok ? '' : ` (needs ${req})`}</option>`;
    }).join('');
    const secOpts = ['<option value="">— none —</option>'].concat(Object.keys(JOBS).filter(id => id !== u.job && u.learnedIn(id).length).map(id =>
      `<option value="${id}" ${u.secondary === id ? 'selected' : ''}>${JOBS[id].skillset} (${JOBS[id].name})</option>`)).join('');
    const jp = u.jp[u.job] || 0;
    const abilities = u.jobData.abilities.map(id => {
      const ab = ABILITIES[id];
      const learned = !!u.learned[id];
      return `<div class="ab-row ${learned ? 'learned' : ''}">
        <div><b>${ab.name}</b> <small>${ab.mp ? ab.mp + ' MP · ' : ''}Range ${ab.range === 'weapon' ? 'weapon' : ab.range}${ab.aoe ? ' · Area' : ''}${ab.ct ? ' · Charge ' + ab.ct : ''}</small><div class="ab-desc">${ab.desc}</div></div>
        <div>${learned ? '<span class="tag">Learned</span>' : `<button data-learn="${id}" ${jp >= ab.jp ? '' : 'disabled'}>${ab.jp} JP</button>`}</div>
      </div>`;
    }).join('');
    const jobLevels = Object.keys(JOBS).filter(j => u.jpTotal[j]).map(j => `${JOBS[j].name} Lv${u.jobLevel(j)}`).join(' · ') || 'none yet';
    const affLine = Object.keys(ELEMENTS).map(e => ({ e, m: affinityOf(u, e) })).filter(a => a.m !== 1)
      .map(a => `<span style="color:${ELEMENTS[a.e].color}">${ELEMENTS[a.e].name} ${affinityLabel(a.m)}</span>`).join(' · ');
    const passiveLearn = passivesOfJob(u.job).map(id => {
      const p = PASSIVES[id], learned = !!u.learned[id];
      return `<div class="ab-row ${learned ? 'learned' : ''}">
        <div><b>${p.name}</b> <small>${PASSIVE_KINDS[p.kind]}</small><div class="ab-desc">${p.desc}</div></div>
        <div>${learned ? '<span class="tag">Learned</span>' : `<button data-learn="${id}" ${jp >= p.jp ? '' : 'disabled'}>${p.jp} JP</button>`}</div>
      </div>`;
    }).join('');
    const tab = this.formTab || 'unit';
    const learnable = this.canLearnSomething(u);
    $('form-detail').innerHTML = `
      <div class="detail-head">
        <canvas id="form-portrait" class="portrait"></canvas>
        <div class="detail-id"><h2>${u.name}</h2><span>Level ${u.level} · ${u.exp}/100 EXP · ${u.jobData.name}</span></div>
      </div>
      <div id="form-tabs" class="tabs form-tabs">
        <button data-form="unit" class="${tab === 'unit' ? 'sel' : ''}">Unit</button>
        <button data-form="gear" class="${tab === 'gear' ? 'sel' : ''}">Gear</button>
        <button data-form="skills" class="${tab === 'skills' ? 'sel' : ''}">Skills${learnable ? '<span class="badge">✦</span>' : ''}</button>
      </div>
      <div data-form-tab="unit" class="${tab === 'unit' ? '' : 'tab-hidden'}">
        <div class="detail-grid">
          <label>Job <select id="sel-job">${jobOpts}</select></label>
          <label>Secondary <select id="sel-sec">${secOpts}</select></label>
          <label>&nbsp;<button id="btn-tree" class="mini">Job tree</button></label>
        </div>
        <p class="job-desc">${u.jobData.desc}</p>
        <div class="stat-grid">
          <span>HP ${st.maxHp}</span><span>MP ${st.maxMp}</span><span>PA ${st.pa}</span><span>MA ${st.ma}</span>
          <span>Speed ${st.spd}</span><span>Move ${st.move}</span><span>Jump ${st.jump}</span><span>Evade ${st.evade}%</span>
        </div>
        <div class="weapon">Weapon: ${u.weapon.name} (power ${u.weapon.power}, range ${u.weapon.range})${u.dualWielding ? ` + ${u.offhandWeapon.name}` : ''}</div>
        <div class="job-levels">Job levels: ${jobLevels}</div>
        <div class="job-levels">Record: ${recordLine(u)}</div>
        ${affLine ? `<div class="job-levels">Elements: ${affLine}</div>` : ''}
      </div>
      <div data-form-tab="gear" class="${tab === 'gear' ? '' : 'tab-hidden'}">
        <h3>Equipment <button id="btn-optimize" class="mini">Optimize</button></h3>
        <div class="equip-grid">${this.equipRows(u)}</div>
        <h3>Abilities Equipped</h3>
        <div class="equip-grid">${this.passiveRows(u)}</div>
      </div>
      <div data-form-tab="skills" class="${tab === 'skills' ? '' : 'tab-hidden'}">
        <h3>${u.jobData.skillset} <small>${jp} JP available · ${u.jobData.name} Lv${u.jobLevel(u.job)}</small></h3>
        <div class="ab-list">${abilities}</div>
        ${passiveLearn ? `<h3>${u.jobData.name} Passives</h3><div class="ab-list">${passiveLearn}</div>` : ''}
      </div>`;
    $('form-tabs').querySelectorAll('button').forEach(b => b.onclick = () => { audio.sfx('menu'); this.formTab = b.dataset.form; this.renderFormationDetail(); });
    paintUnitSprite($('form-portrait'), u, 3);
    $('sel-job').onchange = (e) => {
      u.job = e.target.value;
      if (u.secondary === u.job) u.secondary = null;
      this.syncGear(u);
      this.openFormation(this.formSel);
    };
    $('sel-sec').onchange = (e) => { u.secondary = e.target.value || null; this.renderFormationDetail(); };
    $('btn-tree').onclick = () => this.renderJobTree(u.job);
    $('btn-optimize').onclick = () => { this.optimize(u); this.renderFormationDetail(); };
    $('form-detail').querySelectorAll('select[data-slot]').forEach(sel => sel.onchange = (e) => {
      this.equip(u, sel.dataset.slot, e.target.value || null);
      this.renderFormationDetail();
    });
    $('form-detail').querySelectorAll('select[data-passive]').forEach(sel => sel.onchange = (e) => {
      u.setPassive(sel.dataset.passive, e.target.value || null);
      this.syncGear(u); // Two Hands frees the offhand
      this.renderFormationDetail();
    });
    $('form-detail').querySelectorAll('button[data-learn]').forEach(b => b.onclick = () => {
      const id = b.dataset.learn;
      const ab = ABILITIES[id] || PASSIVES[id];
      if (!ab || (u.jp[u.job] || 0) < ab.jp) return;
      u.jp[u.job] -= ab.jp; u.learned[id] = true;
      let note = `${u.name} learned ${ab.name}!`;
      // A newly learned passive goes straight into an empty slot, so it is not
      // sitting unused behind a menu the player has yet to open.
      if (PASSIVES[id] && !u.passives[PASSIVES[id].kind]) {
        u.setPassive(PASSIVES[id].kind, id);
        this.syncGear(u); // Two Hands frees the offhand
        note += ` Equipped as ${PASSIVE_KINDS[PASSIVES[id].kind].toLowerCase()}.`;
      }
      this.toast(note);
      this.renderFormationDetail();
    });
  }

  // The whole tree at once, for the selected unit: what they are, what they
  // could be now, and exactly how far off everything else is.
  renderJobTree(selJob) {
    const u = this.state.party[this.formSel];
    const ids = Object.keys(JOBS).filter(id => JOBS[id].req !== null);
    const tiers = [];
    for (const id of ids) (tiers[jobTier(id)] = tiers[jobTier(id)] || []).push(id);
    const reqText = (id) => Object.entries(JOBS[id].req).map(([r, l]) => {
      const have = u.jobLevel(r);
      return `<span class="${have >= l ? 'met' : 'unmet'}">${JOBS[r].name} ${Math.min(have, l)}/${l}</span>`;
    }).join(' · ');
    const stateOf = (id) => id === u.job ? 'current' : u.canUseJob(id) ? 'open' : 'locked';
    const rows = tiers.map((list, t) => `
      <div class="tree-tier">
        <div class="tier-label">${TIER_NAMES[t] || `Tier ${t}`}</div>
        <div class="tree-row">${list.map(id => {
          const j = JOBS[id], st = stateOf(id);
          const lv = u.jobLevel(id), learned = u.learnedIn(id).length;
          const sub = st === 'locked' ? reqText(id)
            : `${u.jpTotal[id] ? `Lv${lv}` : 'unstudied'}${learned ? ` · ${learned}/${j.abilities.length} learned` : ''}`;
          return `<div class="job-card ${st} ${id === selJob ? 'sel' : ''}" data-job="${id}">
            <canvas data-tree-portrait="${id}"></canvas><b>${j.name}</b><small>${sub}</small></div>`;
        }).join('')}</div>
      </div>`).join('');
    $('form-detail').innerHTML = `
      <div class="tree-head"><h2>Job Tree</h2><span class="muted">${u.name} · ${u.jobData.name}</span><button id="btn-tree-back" class="mini">Back to ${u.name}</button></div>
      <p class="muted tree-key"><span class="key current">current</span> <span class="key open">open to ${u.name}</span> <span class="key locked">locked, with what it asks for</span></p>
      ${rows}
      <div class="tree-detail" id="tree-detail"></div>`;
    $('form-detail').querySelectorAll('canvas[data-tree-portrait]').forEach(cv => {
      // The unit's own face in each job's dress: this is you, as that.
      const ghost = new Unit({ job: cv.dataset.treePortrait, name: u.name, id: u.id });
      paintUnitSprite(cv, ghost, 1);
    });
    $('btn-tree-back').onclick = () => this.renderFormationDetail();
    $('form-detail').querySelectorAll('.job-card').forEach(card => card.onclick = () => this.renderJobTree(card.dataset.job));
    // The detail panel for the selected job.
    if (!selJob || !JOBS[selJob]) return;
    const j = JOBS[selJob], st = stateOf(selJob);
    const eq = JOB_EQUIP[selJob] || { w: [] };
    const abilities = j.abilities.map(id => `<span class="tree-ab ${u.learned[id] ? 'learned' : ''}">${ABILITIES[id].name} <small>${ABILITIES[id].jp} JP</small></span>`).join('');
    const passives = passivesOfJob(selJob).map(id => `<span class="tree-ab ${u.learned[id] ? 'learned' : ''}">${PASSIVES[id].name} <small>${PASSIVE_KINDS[PASSIVES[id].kind]}</small></span>`).join('');
    const mult = (v) => `×${v}`;
    $('tree-detail').innerHTML = `
      <div class="tree-detail-head"><h3>${j.name}</h3><span class="muted">${j.skillset}</span></div>
      <p class="job-desc">${j.desc}</p>
      <div class="job-levels">HP ${mult(j.hp)} · MP ${mult(j.mp)} · PA ${mult(j.pa)} · MA ${mult(j.ma)} · Speed ${mult(j.spd)} · Move ${j.move} · Jump ${j.jump} · Evade ${j.evade}%</div>
      <div class="job-levels">Arms: ${eq.w.join(', ')}${eq.shield ? ', shields' : ''}</div>
      ${Object.keys(j.req).length ? `<div class="job-levels">Asks for: ${reqText(selJob)}</div>` : '<div class="job-levels">A root job: open to everyone.</div>'}
      <div class="tree-abs">${abilities}${passives}</div>
      ${st === 'current' ? `<span class="tag">${u.name}'s current job</span>`
        : st === 'open' ? `<button id="btn-tree-become" class="primary">Make ${u.name} a ${j.name}</button>`
        : `<span class="muted">Earn the job levels above to open it. Job levels come from JP earned while in that job.</span>`}`;
    const become = $('tree-detail').querySelector('#btn-tree-become');
    if (become) become.onclick = () => {
      u.job = selJob;
      if (u.secondary === u.job) u.secondary = null;
      this.syncGear(u);
      audio.sfx('select');
      this.toast(`${u.name} is now a ${j.name}.`);
      this.openFormation(this.formSel);
    };
  }

  // Can this unit afford an ability or passive of its current job it has not learned?
  canLearnSomething(u) {
    const jp = u.jp[u.job] || 0;
    return u.jobData.abilities.some(id => !u.learned[id] && ABILITIES[id].jp <= jp)
      || passivesOfJob(u.job).some(id => !u.learned[id] && PASSIVES[id].jp <= jp);
  }

  // ---- cities ----------------------------------------------------------------------------
  cityOpen(id) { return !!(this.state.cities && this.state.cities[id]); }
  cityReachable(city) { return this.state.chapter >= city.from; }

  renderCities() {
    const el = $('cities'); if (!el) return;
    const s = this.state;
    if (this.cityView) { const city = CITIES.find(c => c.id === this.cityView); if (city && this.cityOpen(city.id)) return this.renderCityPanel(city); this.cityView = null; }
    const rows = CITIES.filter(c => this.cityReachable(c)).map(c => {
      const open = this.cityOpen(c.id);
      return `<div class="city ${open ? 'open' : 'held'}" data-city="${c.id}">
        <div class="city-text"><b>${c.name}</b> <small>${open ? 'open' : c.held + ' · Lv ' + Math.max(c.level, this.avgLevel() - 1)}</small><div class="city-blurb">${open ? c.open : c.blurb}</div></div>
        <button data-city-go="${c.id}" class="${open ? '' : 'primary'}">${open ? 'Visit' : 'Liberate'}</button>
      </div>`;
    }).join('');
    const ahead = CITIES.filter(c => !this.cityReachable(c)).length;
    el.innerHTML = rows + (ahead ? `<div class="city muted"><small>${ahead} more ${ahead === 1 ? 'city lies' : 'cities lie'} further along the road.</small></div>` : '');
    el.querySelectorAll('button[data-city-go]').forEach(b => b.onclick = () => this.goToCity(b.dataset.cityGo));
  }

  goToCity(id) {
    const city = CITIES.find(c => c.id === id);
    if (!city || !this.cityReachable(city)) return;
    audio.sfx('select');
    if (this.cityOpen(id)) { this.cityView = id; this.renderCities(); $('cities').scrollIntoView({ block: 'nearest' }); }
    else this.liberateCity(city);
  }

  renderCityPanel(city) {
    const el = $('cities'), s = this.state;
    const lvl = Math.max(1, this.avgLevel() - 1);
    const hires = city.hires.map(j => `<button data-hire-at="${j}" ${s.gil < city.hireCost || s.party.length >= 8 ? 'disabled' : ''}>Hire ${JOBS[j].name} · ${city.hireCost} gil</button>`).join('');
    const stock = city.stock.map(id => { const it = ITEMS[id], fits = this.fitsList(id); return `<div class="shop-row ${fits ? '' : 'unfit'}"><div><b>${it.name}</b> <small>${this.itemSummary(id)}</small><div class="fits">${fits ? 'Fits: ' + fits : 'No one in your party can use this yet'}${this.invCount(id) ? ` · in stock: ${this.invCount(id)}` : ''}</div></div><button data-buy-at="${id}" ${s.gil >= it.price ? '' : 'disabled'}>${it.price} gil</button></div>`; }).join('');
    el.innerHTML = `
      <div class="city-head"><b>${city.name}</b><span class="muted">${city.open}</span><button id="btn-city-back" class="mini">Back to the road</button></div>
      <h4>Tavern <small>level ${lvl} recruits, trained in their trade (party max 8)</small></h4>
      <div class="city-hires">${hires}</div>
      <h4>Market <small>sold here and nowhere else</small></h4>
      <div class="city-stock">${stock}</div>`;
    $('btn-city-back').onclick = () => { this.cityView = null; this.renderCities(); };
    el.querySelectorAll('button[data-hire-at]').forEach(b => b.onclick = () => this.hireAt(city, b.dataset.hireAt));
    el.querySelectorAll('button[data-buy-at]').forEach(b => b.onclick = () => this.buyAt(city, b.dataset.buyAt));
  }

  hireAt(city, job) {
    const s = this.state;
    if (!city.hires.includes(job) || s.gil < city.hireCost || s.party.length >= 8) return;
    s.gil -= city.hireCost;
    const used = new Set(s.party.map(u => u.name));
    const pool = HIRE_NAMES.filter(n => !used.has(n));
    const name = pool[Math.floor(Math.random() * pool.length)] || `Recruit ${s.party.length}`;
    const u = new Unit({ name, job, level: Math.max(1, this.avgLevel() - 1), team: 'player' });
    // Trained in their trade: enough JP for the first thing on the list, and the job levels the trade needs.
    u.jp[job] = 120; u.jpTotal[job] = 120;
    for (const [rj, lv] of Object.entries(JOBS[job].req || {})) u.jpTotal[rj] = Math.max(u.jpTotal[rj] || 0, JOB_LEVEL_JP[lv] || 0);
    s.party.push(u);
    audio.sfx('select');
    this.toast(`${name} the ${JOBS[job].name} joins the party at ${city.name}.`);
    this.showWorld();
  }

  buyAt(city, id) {
    const it = ITEMS[id];
    if (!it || !city.stock.includes(id) || this.state.gil < it.price) return;
    this.state.gil -= it.price;
    this.invAdd(id);
    audio.sfx('coin');
    this.toast(`Bought ${it.name}.`);
    this.showWorld();
  }

  // A city's battle: its holders placed as a training fight would place them,
  // at the city's level or a step under the party's, whichever is higher.
  async liberateCity(city) {
    const map = MAPS[city.map];
    const lvl = Math.max(city.level, this.avgLevel() - 1);
    const cands = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      if ('wtx'.includes(map.terrain[y][x])) continue;
      const d = Math.min(...map.deploy.map(p => Math.abs(p[0] - x) + Math.abs(p[1] - y)));
      if (d >= 5) cands.push({ x, y, d });
    }
    cands.sort(() => Math.random() - 0.5);
    const enemies = city.enemies.map((e, i) => Object.assign({ level: lvl, x: cands[i % cands.length].x, y: cands[i % cands.length].y }, e));
    await this.story(`${city.name}, ${city.held}`, city.intro);
    const res = await this.runBattle(map, enemies, city.gil, { objective: { type: 'rout' } });
    if (res === 'aborted') return;
    if (res === 'victory') {
      this.state.cities[city.id] = true;
      await this.story(city.name, city.outro);
    }
    this.saveGame();
    this.showWorld();
  }

  // ---- errands ---------------------------------------------------------------------------
  errandOf(u) { return (this.state.errands.active || []).find(a => a.unit === u.id) || null; }

  // Two errands on the board at a time, drawn from the list in an order the
  // chapter sets, so the same camp does not offer the same work twice running.
  offeredErrands() {
    const e = this.state.errands;
    const activeIds = new Set(e.active.map(a => a.id));
    e.offered = e.offered.filter(id => !activeIds.has(id));
    let seed = (this.state.chapter * 7 + (this.state.victories || 0) * 3 + (this.state.trials || 0)) % ERRANDS.length;
    for (let i = 0; e.offered.length < 2 && i < ERRANDS.length * 2; i++) {
      const cand = ERRANDS[(seed + i) % ERRANDS.length].id;
      if (!e.offered.includes(cand) && !activeIds.has(cand)) e.offered.push(cand);
    }
    return e.offered.map(id => ERRANDS.find(x => x.id === id));
  }

  errandPay(spec) {
    const lvl = this.avgLevel();
    return { gil: Math.round((120 + lvl * 45) * spec.gil), jp: Math.round((50 + lvl * 8) * spec.jp) };
  }

  sendOnErrand(spec, unit) {
    if (!unit || unit.leader || this.errandOf(unit)) return false;
    const free = this.state.party.filter(u => !this.errandOf(u) && u !== unit).length;
    if (free < 1) { this.toast('Someone has to stay and fight.'); return false; }
    this.state.errands.active.push({ id: spec.id, unit: unit.id, left: spec.days });
    this.state.errands.offered = this.state.errands.offered.filter(id => id !== spec.id);
    audio.sfx('select');
    this.toast(`${unit.name} sets out: ${spec.title.toLowerCase()}.`);
    this.showWorld();
    return true;
  }

  // Called once per battle fought. Errands that come due pay out, and the
  // report waits at camp.
  advanceErrands() {
    const e = this.state.errands;
    if (!e || !e.active.length) return;
    e.reports = [];
    const still = [];
    for (const a of e.active) {
      a.left -= 1;
      const u = this.state.party.find(x => x.id === a.unit), spec = ERRANDS.find(x => x.id === a.id);
      if (!u || !spec) continue;
      if (a.left > 0) { still.push(a); continue; }
      const pay = this.errandPay(spec);
      this.state.gil += pay.gil;
      u.gainJP(pay.jp);
      let found = null;
      if (Math.random() < spec.item) {
        const pool = Object.keys(ITEMS).filter(id => ITEMS[id].price > 0 && !ITEMS[id].city && ITEMS[id].tier <= this.shopTier() && ITEMS[id].tier >= Math.max(0, this.shopTier() - 2));
        if (pool.length) { found = pool[Math.floor(Math.random() * pool.length)]; this.invAdd(found); }
      }
      e.reports.push(`${u.name} returns from "${spec.title}": ${pay.gil} gil and ${pay.jp} JP as a ${u.jobData.name}${found ? `, and brings back a ${ITEMS[found].name}` : ''}.`);
    }
    e.active = still;
  }

  renderErrands() {
    const el = $('errands'); if (!el) return;
    const s = this.state, e = s.errands;
    const offered = this.offeredErrands();
    const eligible = s.party.filter(u => !u.leader && !this.errandOf(u));
    const active = e.active.map(a => {
      const u = s.party.find(x => x.id === a.unit), spec = ERRANDS.find(x => x.id === a.id);
      return `<div class="errand active"><span class="errand-text"><b>${u ? u.name : '?'}</b> · ${spec.title}</span><small>back after ${a.left} more battle${a.left === 1 ? '' : 's'}</small></div>`;
    }).join('');
    const reports = e.reports.map(r => `<div class="errand report">${r}</div>`).join('');
    const offers = offered.map(spec => {
      const pay = this.errandPay(spec);
      const opts = eligible.map(u => `<option value="${u.id}">${u.name} (Lv${u.level} ${u.jobData.name})</option>`).join('');
      return `<div class="errand offer" data-errand="${spec.id}">
        <div class="errand-text"><b>${spec.title}</b> <small>${spec.days} battle${spec.days === 1 ? '' : 's'} · ${pay.gil} gil · ${pay.jp} JP${spec.item >= 0.4 ? ' · likely something found' : spec.item >= 0.2 ? ' · maybe something found' : ''}</small><div class="errand-flavour">${spec.text}</div></div>
        <div class="errand-send">${eligible.length ? `<select data-unit>${opts}</select><button data-send="${spec.id}">Send</button>` : '<small class="muted">No one free to send.</small>'}</div>
      </div>`;
    }).join('');
    el.innerHTML = `${reports}${active}${offers}`;
    el.querySelectorAll('button[data-send]').forEach(b => b.onclick = () => {
      const row = b.closest('.errand'); const id = row.querySelector('select[data-unit]').value;
      this.sendOnErrand(ERRANDS.find(x => x.id === b.dataset.send), s.party.find(u => u.id === id));
    });
  }

  // A one-line summary of an item's bonuses, e.g. "Pw 8 · Rng 1 · HP +15".
  itemSummary(id) {
    const it = ITEMS[id];
    if (!it) return '';
    const parts = [];
    if (it.power) parts.push(`Pw ${it.power}`);
    if (it.range) parts.push(`Rng ${it.range}`);
    for (const k of GEAR_STATS) {
      if (!it[k]) continue;
      const label = { hp: 'HP', mp: 'MP', pa: 'PA', ma: 'MA', spd: 'Spd', move: 'Move', jump: 'Jump', evade: 'Ev' }[k];
      parts.push(`${label} ${it[k] > 0 ? '+' : ''}${it[k]}`);
    }
    for (const [el, kind] of Object.entries(it.resist || {})) {
      parts.push(`${ELEMENTS[el].name} ${affinityLabel(AFFINITY[kind])}`);
    }
    return parts.join(' · ');
  }

  equipRows(u) {
    return Object.entries(SLOT_NAMES).map(([slot, label]) => {
      const cur = u.gear[slot] || '';
      const opts = this.slotOptions(u, slot);
      if (!opts.length && !cur) return `<label class="equip-row"><span>${label}</span><em class="none">nothing available</em></label>`;
      const groups = {};
      for (const id of opts.sort((a, b) => (TYPE_ORDER.indexOf(itemType(a)) - TYPE_ORDER.indexOf(itemType(b))) || (ITEMS[a].tier - ITEMS[b].tier))) (groups[itemType(id)] = groups[itemType(id)] || []).push(id);
      const list = Object.entries(groups).map(([t, ids]) => `<optgroup label="${TYPE_NAMES[t] || t}">${ids.map(id => {
        const owned = this.invCount(id) + (cur === id ? 1 : 0);
        return `<option value="${id}" ${cur === id ? 'selected' : ''}>${ITEMS[id].name} (x${owned}) — ${this.itemSummary(id)}</option>`;
      }).join('')}</optgroup>`).join('');
      return `<label class="equip-row"><span>${label}</span><select data-slot="${slot}"><option value="">— empty —</option>${list}</select></label>`;
    }).join('');
  }

  passiveRows(u) {
    return Object.entries(PASSIVE_KINDS).map(([kind, label]) => {
      const opts = u.learnedPassives(kind);
      const cur = u.passives[kind] || '';
      if (!opts.length) return `<label class="equip-row"><span>${label}</span><em class="none">none learned yet</em></label>`;
      const list = opts.map(id => `<option value="${id}" ${cur === id ? 'selected' : ''}>${PASSIVES[id].name} — ${PASSIVES[id].desc}</option>`).join('');
      return `<label class="equip-row"><span>${label}</span><select data-passive="${kind}"><option value="">— none —</option>${list}</select></label>`;
    }).join('');
  }

  // ---- shop -------------------------------------------------------------------------------------
  openShop(tab = 'buy') {
    this.shopTab = tab;
    const s = this.state;
    $('shop-gil').textContent = `${s.gil} gil`;
    $('shop-tabs').innerHTML = ['buy', 'sell'].map(t =>
      `<button data-tab="${t}" class="${t === tab ? 'sel' : ''}">${t === 'buy' ? 'Buy' : 'Sell'}</button>`).join('');
    $('shop-tabs').querySelectorAll('button').forEach(b => b.onclick = () => this.openShop(b.dataset.tab));
    const rows = tab === 'buy' ? this.shopBuyRows() : this.shopSellRows();
    $('shop-list').innerHTML = rows || `<p class="muted">${tab === 'buy' ? 'Nothing in stock.' : 'You have no spare equipment to sell.'}</p>`;
    $('shop-list').querySelectorAll('button[data-buy]').forEach(b => b.onclick = () => this.buy(b.dataset.buy));
    $('shop-list').querySelectorAll('button[data-sell]').forEach(b => b.onclick = () => this.sell(b.dataset.sell));
    this.showScreen('shop');
  }

  // Which party jobs can make use of an item, for the shop's "fits" column.
  fitsList(id) {
    const jobs = [...new Set(this.state.party.map(u => u.job))].filter(j => canEquip(j, id));
    return jobs.map(j => JOBS[j].name).join(', ');
  }

  shopBuyRows() {
    const tier = this.shopTier();
    const stock = Object.keys(ITEMS).filter(id => ITEMS[id].price > 0 && ITEMS[id].tier <= tier && !ITEMS[id].city);
    const bySlot = {};
    for (const id of stock) (bySlot[ITEMS[id].slot] = bySlot[ITEMS[id].slot] || []).push(id);
    return Object.entries(CATEGORY_NAMES).filter(([slot]) => bySlot[slot]).map(([slot, label]) => {
      // Shelved by kind within the slot, cheapest first on each shelf.
      const sorted = bySlot[slot].sort((a, b) => (TYPE_ORDER.indexOf(itemType(a)) - TYPE_ORDER.indexOf(itemType(b))) || (ITEMS[a].price - ITEMS[b].price));
      let items = '', lastType = null;
      for (const id of sorted) {
        const it = ITEMS[id], fits = this.fitsList(id), t = itemType(id);
        if (slot !== 'acc' && t !== lastType) { items += `<h4>${TYPE_NAMES[t] || t}</h4>`; lastType = t; }
        const afford = this.state.gil >= it.price;
        items += `<div class="shop-row ${fits ? '' : 'unfit'}">
          <div><b>${it.name}</b> <small>${this.itemSummary(id)}</small>
            <div class="fits">${fits ? 'Fits: ' + fits : 'No one in your party can use this yet'}${this.invCount(id) ? ` · in stock: ${this.invCount(id)}` : ''}</div></div>
          <button data-buy="${id}" ${afford ? '' : 'disabled'}>${it.price} gil</button></div>`;
      }
      return `<h3>${label}</h3>${items}`;
    }).join('');
  }

  shopSellRows() {
    const ids = Object.keys(this.state.inventory).filter(id => this.invCount(id) > 0 && ITEMS[id] && ITEMS[id].price > 0);
    if (!ids.length) return '';
    let html = '', lastType = null;
    for (const id of ids.sort((a, b) => (TYPE_ORDER.indexOf(itemType(a)) - TYPE_ORDER.indexOf(itemType(b))) || (ITEMS[b].price - ITEMS[a].price))) {
      const it = ITEMS[id], value = Math.floor(it.price / 2), t = itemType(id);
      if (t !== lastType) { html += `<h3>${TYPE_NAMES[t] || t}</h3>`; lastType = t; }
      html += `<div class="shop-row">
        <div><b>${it.name}</b> <small>${this.itemSummary(id)}</small><div class="fits">Spare: ${this.invCount(id)}</div></div>
        <button data-sell="${id}">Sell ${value} gil</button></div>`;
    }
    return html;
  }

  buy(id) {
    const it = ITEMS[id];
    if (!it || this.state.gil < it.price) return;
    this.state.gil -= it.price;
    this.invAdd(id);
    this.toast(`Bought ${it.name}.`);
    this.openShop('buy');
  }

  sell(id, from = 'shop') {
    const it = ITEMS[id];
    if (!it || !this.invCount(id) || !it.price) return;
    this.invRemove(id);
    this.state.gil += Math.floor(it.price / 2);
    audio.sfx('coin');
    this.toast(`Sold ${it.name}.`);
    if (from === 'baggage') this.openBaggage(this.bagCat, this.bagType); else this.openShop('sell');
  }

  // ---- baggage ---------------------------------------------------------------------------
  /* Everything spare, shelved by category and kind, with what each piece
     fits, who could wear it now, and a way to hand it over or sell it from
     the shelf. Below the shelves, what the party is wearing. */
  openBaggage(cat = 'all', type = 'all') {
    this.bagCat = cat; this.bagType = type;
    const s = this.state;
    const ids = Object.keys(s.inventory).filter(id => this.invCount(id) > 0 && ITEMS[id]);
    const spare = ids.reduce((n, id) => n + this.invCount(id), 0);
    $('bag-gil').textContent = `${s.gil} gil`;
    $('bag-count').textContent = spare ? `${spare} spare piece${spare === 1 ? '' : 's'}` : 'nothing spare';
    const cats = ['all', ...Object.keys(CATEGORY_NAMES).filter(c => ids.some(id => ITEMS[id].slot === c))];
    $('bag-tabs').innerHTML = cats.map(c => `<button data-cat="${c}" class="${c === cat ? 'sel' : ''}">${c === 'all' ? 'All' : CATEGORY_NAMES[c]}</button>`).join('');
    $('bag-tabs').querySelectorAll('button').forEach(b => b.onclick = () => this.openBaggage(b.dataset.cat, 'all'));
    const inCat = ids.filter(id => cat === 'all' || ITEMS[id].slot === cat);
    const types = [...new Set(inCat.map(itemType))].sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b));
    $('bag-types').innerHTML = types.length > 1 ? ['all', ...types].map(t => `<button class="chip ${t === type ? 'sel' : ''}" data-type="${t}">${t === 'all' ? 'Every kind' : TYPE_NAMES[t] || t}</button>`).join('') : '';
    $('bag-types').querySelectorAll('button').forEach(b => b.onclick = () => this.openBaggage(cat, b.dataset.type));
    const shown = inCat.filter(id => type === 'all' || itemType(id) === type)
      .sort((a, b) => (TYPE_ORDER.indexOf(itemType(a)) - TYPE_ORDER.indexOf(itemType(b))) || (ITEMS[a].tier - ITEMS[b].tier) || (ITEMS[a].price - ITEMS[b].price));
    let html = '', lastType = null;
    for (const id of shown) {
      const it = ITEMS[id], t = itemType(id);
      if (t !== lastType) { html += `<h3>${TYPE_NAMES[t] || t}</h3>`; lastType = t; }
      const slot = it.slot;
      const wearers = s.party.filter(u => u.canEquipItem(id, slot));
      const opts = wearers.map(u => `<option value="${u.id}">${u.name} · ${u.jobData.name}${u.gear[slot] ? ` (wears ${ITEMS[u.gear[slot]].name})` : ' (empty)'}</option>`).join('');
      html += `<div class="shop-row inv-row ${wearers.length ? '' : 'unfit'}" data-item="${id}">
        <div class="inv-main"><b>${it.name}</b> <small>${this.itemSummary(id)}</small>
          <div class="fits">x${this.invCount(id)} · tier ${it.tier}${it.late ? ' · legendary' : ''}${it.city ? ' · ' + CITIES.find(c => c.id === it.city).name : ''} · ${wearers.length ? 'fits ' + [...new Set(wearers.map(u => u.jobData.name))].join(', ') : 'no one in your party can use this yet'}</div></div>
        <div class="inv-actions">${wearers.length ? `<select data-wearer="${id}">${opts}</select><button data-equip="${id}">Equip</button>` : ''}${it.price ? `<button data-sell="${id}" class="mini">Sell ${Math.floor(it.price / 2)}</button>` : ''}</div>
      </div>`;
    }
    $('bag-list').innerHTML = html || `<p class="muted">${ids.length ? 'Nothing of that kind.' : 'The baggage is empty. Spare gear from the shop, the field and the cities collects here.'}</p>`;
    $('bag-list').querySelectorAll('button[data-equip]').forEach(b => b.onclick = () => {
      const id = b.dataset.equip, uid = b.closest('.inv-row').querySelector('select[data-wearer]').value;
      const u = s.party.find(x => x.id === uid); if (!u) return;
      if (this.equip(u, ITEMS[id].slot, id)) { audio.sfx('select'); this.toast(`${u.name} takes the ${ITEMS[id].name}.`); }
      this.openBaggage(cat, type);
    });
    $('bag-list').querySelectorAll('button[data-sell]').forEach(b => b.onclick = () => this.sell(b.dataset.sell, 'baggage'));
    // Worn: the party's kit, slot by slot, each piece a click from coming off.
    $('bag-worn').innerHTML = `<table class="worn"><thead><tr><th>Unit</th>${Object.values(SLOT_NAMES).map(l => `<th>${l}</th>`).join('')}</tr></thead><tbody>${
      s.party.map(u => `<tr><td><b>${u.name}</b><br><small>${u.jobData.name}</small></td>${Object.keys(SLOT_NAMES).map(slot => {
        const id = u.gear[slot];
        return `<td>${id ? `<span title="${this.itemSummary(id)}">${ITEMS[id].name}</span> <button class="mini" data-unequip="${u.id}:${slot}" title="Back to the baggage">×</button>` : '<span class="none">—</span>'}</td>`;
      }).join('')}</tr>`).join('')}</tbody></table>`;
    $('bag-worn').querySelectorAll('button[data-unequip]').forEach(b => b.onclick = () => {
      const [uid, slot] = b.dataset.unequip.split(':'); const u = s.party.find(x => x.id === uid); if (!u) return;
      this.equip(u, slot, null); audio.sfx('cancel'); this.openBaggage(cat, type);
    });
    this.showScreen('inventory');
  }

  // A victory sometimes turns up a piece of gear from the field.
  rollLoot(guaranteed) {
    if (!guaranteed && Math.random() > 0.4) return null;
    const tier = this.shopTier();
    const pool = Object.keys(ITEMS).filter(id => ITEMS[id].price > 0 && ITEMS[id].tier <= tier && !ITEMS[id].city);
    if (!pool.length) return null;
    const id = pool[Math.floor(Math.random() * pool.length)];
    this.invAdd(id);
    return ITEMS[id].name;
  }

  // ---- story screen ----------------------------------------------------------------------------
  story(title, lines) {
    return new Promise(resolve => {
      $('story-title').textContent = title;
      const box = $('story-text');
      box.innerHTML = '';
      let i = 0;
      const btn = $('btn-story-next');
      const next = () => {
        if (i < lines.length) {
          const p = document.createElement('p'); p.textContent = lines[i++]; box.appendChild(p);
          btn.textContent = i < lines.length ? 'Continue' : 'Onward';
        } else { btn.onclick = null; resolve(); }
      };
      btn.onclick = next;
      next();
      this.showScreen('story');
    });
  }

  // ---- battles ----------------------------------------------------------------------------------
  /* After the last chapter the road keeps going: numbered trials on a
     random field, drawn from the campaign's toughest pools and a level or
     two above the party, climbing one trial at a time. */
  trialSpec(n) {
    const s = this.state;
    const seed = (s.victories * 7919 + n * 104729) >>> 0;
    const rnd = (k) => ((seed * (k + 1) * 2654435761) >>> 0) / 4294967296;
    const mapIds = Object.keys(MAPS);
    const map = mapIds[Math.floor(rnd(1) * mapIds.length)];
    const pool = TRAINING_POOL[Math.min(TRAINING_POOL.length - 1, 4 + Math.floor(n / 2))];
    const count = Math.min(7, pool.length + Math.floor((n - 1) / 3));
    const jobs = []; for (let i = 0; i < count; i++) jobs.push(pool[Math.floor(rnd(10 + i) * pool.length)]);
    const level = this.avgLevel() + 1 + Math.floor(n / 2);
    const titles = ['Echoes of the War', 'The Road Not Taken', 'Old Debts', 'A Rumour of Banners', 'Ghosts of Thornwall',
                    'The Long Watch', 'Hired Steel', 'What the Marsh Kept', 'The Last Company', 'No Crown but Ours'];
    return { map, jobs, level, enemies: jobs, gil: 400 + 120 * n, title: titles[(n - 1) % titles.length] };
  }

  async startTrial() {
    const n = (this.state.trials || 0) + 1, t = this.trialSpec(n);
    const map = MAPS[t.map];
    // Spawn on passable ground far from the deploy zone, as training does.
    const cands = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      if ('wtx'.includes(map.terrain[y][x])) continue;
      const d = Math.min(...map.deploy.map(p => Math.abs(p[0] - x) + Math.abs(p[1] - y)));
      if (d >= 6) cands.push({ x, y, d });
    }
    cands.sort(() => Math.random() - 0.5);
    const enemies = t.jobs.map((job, i) => ({ job, level: t.level, x: cands[i % cands.length].x, y: cands[i % cands.length].y }));
    await this.story(`Trial ${n}: ${t.title}`, [`${map.name}. Word has spread of the company that ended the war, and ${enemies.length} have come to test it.`]);
    const res = await this.runBattle(map, enemies, t.gil, { objective: { type: 'rout' } });
    if (res === 'aborted') return;
    if (res === 'victory') { this.state.trials = n; this.state.victories++; }
    this.saveGame();
    this.showWorld();
  }

  /* The realm, drawn: the seventeen chapters as stops along a road, coloured by
     the mood of the field each is fought on, with the company's own leader
     standing where the story has reached. */
  drawWorldMap() {
    const cv = $('world-map');
    if (!cv) return;
    const cssW = Math.max(280, cv.clientWidth || 800), cssH = Math.round(cssW * 0.62), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    const c = cv.getContext('2d');
    c.setTransform(dpr, dpr, 0, 0, 0, 0); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = cssW, H = cssH;
    const bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#1c1a2e'); bg.addColorStop(1, '#0f0e1a');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // Contours, so the parchment is a land and not a panel.
    c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      for (let x = 0; x <= W; x += 16) {
        const y = H * (0.12 + i * 0.1) + Math.sin(x / 60 + i) * 8 + Math.sin(x / 23 + i * 2) * 3;
        if (x) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.stroke();
    }
    const pts = WORLD_ROUTE.map(([fx, fy]) => ({ x: fx * W, y: fy * H }));
    // The road, dashed where it has not yet been walked.
    const reached = Math.min(this.state.chapter, pts.length - 1);
    const road = (from, to, dashed) => {
      c.beginPath(); c.setLineDash(dashed ? [5, 6] : []);
      c.moveTo(pts[from].x, pts[from].y);
      for (let i = from + 1; i <= to; i++) {
        const a = pts[i - 1], b = pts[i], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + (i % 2 ? 18 : -18);
        c.quadraticCurveTo(mx, my, b.x, b.y);
      }
      c.stroke(); c.setLineDash([]);
    };
    c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.5)'; road(0, pts.length - 1, false);
    c.lineWidth = 2; c.strokeStyle = '#8a7a58'; road(0, reached, false);
    c.strokeStyle = 'rgba(138,122,88,0.5)'; road(reached, pts.length - 1, true);
    c.font = '11px Georgia, serif'; c.textAlign = 'center';
    CAMPAIGN.forEach((ch, i) => {
      const p = pts[i], mood = MOODS[MAPS[ch.map].mood] || MOODS.day;
      const done = i < this.state.chapter, next = i === this.state.chapter;
      c.beginPath(); c.arc(p.x, p.y, 9, 0, Math.PI * 2);
      c.fillStyle = done || next ? mood.sky[0] : '#1a1a26'; c.fill();
      c.lineWidth = next ? 3 : 1.5;
      c.strokeStyle = next ? '#ffd84a' : done ? '#c9b98a' : 'rgba(255,255,255,0.18)'; c.stroke();
      if (next) { c.beginPath(); c.arc(p.x, p.y, 15, 0, Math.PI * 2); c.strokeStyle = 'rgba(255,216,74,0.35)'; c.lineWidth = 1; c.stroke(); }
      if (done) { c.fillStyle = '#c9b98a'; c.fillRect(p.x - 1, p.y - 14, 2, 10); c.fillStyle = '#d8483b'; c.beginPath(); c.moveTo(p.x + 1, p.y - 14); c.lineTo(p.x + 9, p.y - 11); c.lineTo(p.x + 1, p.y - 8); c.closePath(); c.fill(); }
      // Labels are kept inside the canvas; a stop near an edge would
      // otherwise lose half its name.
      const lx = Math.max(56, Math.min(W - 56, p.x));
      c.fillStyle = done || next ? '#e6e6f0' : 'rgba(230,230,240,0.35)';
      const label = done || next ? MAPS[ch.map].name : '?';
      c.fillText(label, lx, p.y + 24);
      // The number sits inside its stop; only the next stop is named above,
      // so numbers and neighbours' names never collide on a narrow screen.
      if (next) { c.fillStyle = '#ffd84a'; c.fillText('Chapter ' + (i + 1), lx, p.y - 14); }
      else { c.fillStyle = done ? '#1a1a26' : 'rgba(230,230,240,0.5)'; c.font = 'bold 10px Georgia, serif'; c.fillText(String(i + 1), p.x, p.y + 4); c.font = '11px Georgia, serif'; }
    });
    // Cities: a walled square on the road, gold once open, red while held.
    const cityPts = CITIES.filter(c => this.cityReachable(c)).map(c => ({ c, x: c.pos[0] * W, y: c.pos[1] * H }));
    for (const { c: city, x, y } of cityPts) {
      const open = this.cityOpen(city.id);
      c.save(); c.translate(x, y);
      c.fillStyle = open ? '#e8c45a' : '#5a2a2a'; c.strokeStyle = open ? '#fff0b0' : '#d8483b'; c.lineWidth = 1.5;
      c.beginPath(); c.rect(-8, -6, 16, 12); c.fill(); c.stroke();
      c.fillStyle = open ? '#fff6d0' : '#8a4a4a';
      c.fillRect(-6, -11, 4, 5); c.fillRect(2, -11, 4, 5); c.fillRect(-1, -14, 2, 8);
      if (!open) { c.strokeStyle = '#ff9a8a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-5, 5); c.lineTo(5, -5); c.moveTo(-5, -5); c.lineTo(5, 5); c.stroke(); }
      c.restore();
      c.fillStyle = open ? '#f4e6b0' : 'rgba(255,200,190,0.8)'; c.font = '10px Georgia, serif'; c.textAlign = 'center';
      c.fillText(city.name, Math.max(46, Math.min(W - 46, x)), y + 22);
    }
    // The company, where the story has reached.
    const leader = this.state.party.find(u => u.leader) || this.state.party[0];
    if (leader) {
      const at = pts[Math.min(this.state.chapter, pts.length - 1)];
      const face = document.createElement('canvas');
      paintUnitSprite(face, leader, 1);
      c.imageSmoothingEnabled = false;
      // Beside the stop, clear of its label.
      c.drawImage(face, at.x + 18, at.y - face.height + 6);
    }
    cv.onclick = (e) => {
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) * (W / r.width), y = (e.clientY - r.top) * (H / r.height);
      const next = pts[this.state.chapter];
      if (next && Math.hypot(x - next.x, y - next.y) < 22) return $('btn-battle').click();
      const hit = cityPts.find(p => Math.hypot(x - p.x, y - p.y) < 16);
      if (hit) this.goToCity(hit.c.id);
    };
  }

  async startNextChapter() {
    const ch = CAMPAIGN[this.state.chapter];
    if (!ch) return this.startTrial();
    await this.story(ch.title, ch.intro);
    const result = await this.runBattle(MAPS[ch.map], ch.enemies, ch.gil, { objective: ch.objective });
    if (result === 'aborted') return;
    // Experience and JP are earned even in a losing battle, so record the run
    // either way rather than letting a defeat quietly discard it.
    if (result === 'victory') {
      this.state.chapter++;
      this.state.victories++;
      if (ch.recruit) {
        const r = new Unit({ name: ch.recruit.name, job: ch.recruit.job, level: ch.recruit.level, team: 'player' });
        // Recruits arrive with a little JP invested in their trade.
        r.jp[r.job] = 60; r.jpTotal[r.job] = 60;
        this.state.party.push(r);
      }
      await this.story(ch.title, ch.outro);
    }
    this.saveGame();
    this.showWorld();
  }

  async startTraining() {
    const s = this.state;
    const mapIds = Object.keys(MAPS).filter(m => !['thornwall', 'brassgate', 'starfall'].includes(m));
    const map = MAPS[mapIds[Math.floor(Math.random() * mapIds.length)]];
    const poolIdx = Math.min(TRAINING_POOL.length - 1, Math.floor(Math.random() * (s.chapter + 1)));
    const pool = TRAINING_POOL[poolIdx];
    const lvl = Math.max(1, this.avgLevel() + Math.floor(Math.random() * 2) - 1);
    // Spawn enemies on passable tiles far from the deploy zone.
    const deploy = map.deploy;
    const cands = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      if ('wtx'.includes(map.terrain[y][x])) continue;
      const d = Math.min(...deploy.map(p => Math.abs(p[0] - x) + Math.abs(p[1] - y)));
      if (d >= 6) cands.push({ x, y, d });
    }
    cands.sort(() => Math.random() - 0.5);
    const enemies = pool.map((job, i) => ({ job, level: lvl, x: cands[i].x, y: cands[i].y }));
    await this.story('Training', [`${map.name}. Word has it that ${pool.length} hostiles are camped here. Good practice.`]);
    const res = await this.runBattle(map, enemies, 300 + lvl * 70, { objective: { type: 'rout' } });
    if (res === 'aborted') return;
    this.saveGame();
    this.showWorld();
  }

  async runBattle(mapDef, enemySpecs, gilReward, opts = {}) {
    const roster = this.state.party.filter(u => !this.errandOf(u));
    const jpBefore = new Map(roster.map(u => [u, Object.values(u.jpTotal).reduce((a, b) => a + b, 0)]));
    const battle = Battle.setup(mapDef, roster, enemySpecs, this.ui.hooks(), opts.objective, this.state.difficulty);
    this.battle = battle;
    $('battle-name').textContent = mapDef.name;
    this.ui.showObjective();
    // The field's mood: sky, light, weather and which theme plays.
    this.renderer.mood = mapDef.mood || 'day';
    this.battleMusic = (MOODS[this.renderer.mood] || MOODS.day).music;
    this.renderer.setBattle(battle);
    this.ui.bind(battle);
    this.showScreen('battle');
    // Small screens start with the log out of the way; the bar toggles it back.
    $('log').classList.toggle('hidden', window.innerWidth <= 820 || window.innerHeight <= 520);
    this.renderer.start();
    // Let the deployment panels lay out, then frame the board in what is left.
    requestAnimationFrame(() => { this.ui.measureInsets(); this.renderer.centerCamera(); });
    if (!opts.skipDeploy) await this.ui.deployPhase(battle, roster);
    this.ui.measureInsets();
    this.renderer.centerCamera();
    if (battle.over && battle.result === 'defeat' && !battle.tick) {
      // Left the field before a blow was struck: no losses, no rewards.
      this.renderer.stop();
      this.battle = null;
      for (const u of this.state.party) u.resetBattleState();
      this.showWorld();
      return 'aborted';
    }
    this.ui.log(`Battle begins at ${mapDef.name}!`, 'lvl');
    const result = await battle.run();
    await sleep(600);
    this.renderer.stop();
    // Who stood on the field, for the results screen, before the battle is
    // let go of.
    const fought = battle.units.filter(u => u.team === 'player' && (u.x >= 0 || u.carriedOff));
    for (const u of fought) { u.record.battles++; if (result === 'victory') u.record.wins++; }
    this.battle = null;
    const r0 = battle.rewards;
    r0.jpBy = new Map(fought.map(u => [u, Object.values(u.jpTotal).reduce((a, b) => a + b, 0) - (jpBefore.get(u) || 0)]));
    // A battle is a day gone by for anyone away on an errand.
    this.advanceErrands();
    // Revive and reset everyone after the fight.
    for (const u of this.state.party) u.resetBattleState();
    const r = battle.rewards;
    if (result === 'victory') {
      const mult = (DIFFICULTIES[this.state.difficulty] || DIFFICULTIES.knight).gilMult;
      r.gil = Math.round((r.gil + gilReward) * mult);
      this.state.gil += r.gil;
      audio.sfx('coin');
      const loot = this.rollLoot(!!gilReward && gilReward >= 250);
      if (loot) r.loot = loot;
    }
    await this.results(result, r, battle.endReason, fought);
    return result;
  }

  // Battle speed: 1x, 2x, 3x, remembered between sessions.
  setPace(scale) {
    PACE.scale = [1, 2, 3].includes(scale) ? scale : 1;
    localStorage.setItem(PACE_KEY, String(PACE.scale));
    const b = $('btn-speed');
    if (b) { b.textContent = `${PACE.scale}×`; b.classList.toggle('on', PACE.scale > 1); }
  }
  cyclePace() {
    this.setPace(PACE.scale >= 3 ? 1 : PACE.scale + 1);
    this.toast(`Battle speed ${PACE.scale}×`);
  }

  retreat() {
    if (!this.battle || this.battle.over) return;
    const deploying = !!this.ui.deploy;
    if (!confirm(deploying ? 'Leave without giving battle?' : 'Retreat from battle? This counts as a defeat.')) return;
    this.battle.over = true;
    this.battle.result = 'defeat';
    this.ui.log('The party retreats!', 'ko');
    // Mid-action the engine is still applying effects. Let it finish and unwind
    // on its own rather than resolving the turn out from under it.
    if (this.ui.turn && this.ui.turn.mode === 'busy') return;
    this.ui.abort();
  }

  results(result, r, battleEndReason, fought = []) {
    return new Promise(resolve => {
      audio.sfx(result === 'victory' ? 'victory' : 'defeat');
      $('results-title').textContent = result === 'victory' ? 'Victory!' : 'Defeat...';
      $('results-title').className = result;
      $('results-body').innerHTML = `
        ${battleEndReason ? `<p class="res-reason">${battleEndReason}</p>` : ''}
        <div class="res-line">Experience earned: <b>${r.exp}</b></div>
        <div class="res-line">Gil ${result === 'victory' ? 'earned' : 'kept'}: <b>${result === 'victory' ? r.gil : 0}</b></div>
        ${r.loot ? `<div class="res-line res-loot">Recovered: <b>${r.loot}</b></div>` : ''}
        <div class="res-party"></div>
        ${r.events.length ? `<ul class="res-events">${r.events.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
        ${result === 'defeat' ? '<p class="res-note">Your party regroups. Train, learn new abilities, and try again.</p>' : ''}`;
      // Everyone who fought, with a mark on those who came out of it stronger.
      const roll = $('results-body').querySelector('.res-party');
      for (const u of fought) {
        const up = r.events.some(ev => ev.startsWith(u.name + ' ') && /level/i.test(ev));
        const item = document.createElement('div');
        item.className = 'res-unit' + (up ? ' up' : '') + (u.alive ? '' : ' down');
        const cv = document.createElement('canvas');
        paintUnitSprite(cv, u, 2);
        item.appendChild(cv);
        const cap = document.createElement('span');
        cap.textContent = `${u.name} · Lv${u.level}${up ? ' ↑' : ''}`;
        item.appendChild(cap);
        const jp = r.jpBy ? (r.jpBy.get(u) || 0) : 0;
        const learn = this.canLearnSomething(u);
        const sub = document.createElement('small');
        sub.className = 'res-jp' + (learn ? ' learn' : '');
        sub.textContent = `${jp ? `+${jp} JP` : 'no JP'}${learn ? ' ✦' : ''}`;
        item.appendChild(sub);
        if (learn) item.classList.add('learn');
        roll.appendChild(item);
      }
      if (fought.some(u => this.canLearnSomething(u))) {
        const note = document.createElement('p');
        note.className = 'res-note';
        note.textContent = '✦ has JP enough for something new. Spend it in Formation.';
        roll.after(note);
      }
      $('btn-results').onclick = () => { $('btn-results').onclick = null; resolve(); };
      this.showScreen('results');
    });
  }
}

// On Android the hardware back button arrives as a history pop (in a browser or
// an installed PWA) or as a call to this hook (from the native wrapper). Either
// way it should step back through the game rather than close it.
function handleBack() {
  const g = window.game;
  if (!g) return false;
  if (document.getElementById('help').classList.contains('open')) {
    document.getElementById('help').classList.remove('open');
    return true;
  }
  if (g.screen === 'battle') {
    // In battle, back cancels the current selection; it never leaves the fight.
    if (g.ui.turn || g.ui.deploy) { g.ui.cancel(); return true; }
    return true;
  }
  const parent = { formation: 'world', shop: 'world', results: 'world', world: 'title', story: null, title: null };
  const to = parent[g.screen];
  if (to === 'world') { g.showWorld(); return true; }
  if (to === 'title') { g.showScreen('title'); return true; }
  return false; // nothing left to go back to: let the app close
}
window.handleBack = handleBack;

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
  // Keep a history entry parked so a browser back gesture reaches handleBack.
  history.replaceState({ game: true }, '');
  history.pushState({ game: true }, '');
  window.addEventListener('popstate', () => {
    const handled = handleBack();
    if (handled) history.pushState({ game: true }, '');
  });
  // A phone rotating is a layout change the board has to be re-framed for.
  const reframe = () => {
    if (!game.battle) return;
    game.renderer.fit();
    game.ui.measureInsets();
    game.renderer.centerCamera();
  };
  window.addEventListener('orientationchange', () => setTimeout(reframe, 250));
  window.addEventListener('resize', () => { clearTimeout(window.__rt); window.__rt = setTimeout(() => { reframe(); if (game.screen === 'world') game.drawWorldMap(); }, 200); });
  // A quiet blip on any button keeps the menus feeling responsive.
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && !e.target.disabled) audio.sfx('menu');
  });
  // Double-tap zoom is disabled in CSS with touch-action, which is the right
  // tool for it: intercepting touchend here also swallowed legitimate repeat
  // taps on the same button. Safari still needs the gesture events refused.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
});
