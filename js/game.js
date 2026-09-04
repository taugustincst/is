/* ==========================================================================
   Game controller: screens, campaign progression, formation, saving.
   ========================================================================== */

const SAVE_KEY = 'elderon-tactics-save';
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
    if (name === 'battle') audio.playMusic('battle');
    else if (name === 'story') audio.playMusic('ruin');
    else if (name === 'results') audio.stopMusic();
    else if (name !== 'title') audio.playMusic('town');
    else audio.stopMusic();
  }

  bindScreens() {
    $('btn-new').onclick = () => this.newGame();
    $('btn-continue').onclick = () => this.loadGame();
    $('btn-battle').onclick = () => this.startNextChapter();
    $('btn-train').onclick = () => this.startTraining();
    $('btn-formation').onclick = () => this.openFormation();
    $('btn-shop').onclick = () => this.openShop();
    $('btn-shop-back').onclick = () => this.showWorld();
    $('btn-save').onclick = () => { this.saveGame(); this.toast('Game saved.'); };
    $('btn-title').onclick = () => this.showScreen('title');
    $('btn-formation-back').onclick = () => this.showWorld();
    $('btn-hire-squire').onclick = () => this.hire('squire');
    $('btn-hire-chemist').onclick = () => this.hire('chemist');
    $('btn-retreat').onclick = () => this.retreat();
    $('btn-help').onclick = () => $('help').classList.toggle('open');
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
      gil: 500, chapter: 0, victories: 0, inventory: {}, difficulty: this.pendingDifficulty || 'knight',
    };
    this.showWorld();
  }

  saveGame() {
    const data = {
      v: 3, gil: this.state.gil, chapter: this.state.chapter, victories: this.state.victories,
      difficulty: this.state.difficulty,
      inventory: this.state.inventory, party: this.state.party.map(u => u.toSave()),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    $('btn-continue').disabled = false;
  }

  loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    this.state = {
      gil: d.gil, chapter: d.chapter, victories: d.victories || 0, inventory: d.inventory || {},
      difficulty: DIFFICULTIES[d.difficulty] ? d.difficulty : 'knight',
      party: d.party.map(p => Unit.fromSave(Object.assign({ team: 'player' }, p))),
    };
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
  shopTier() { return Math.min(6, this.state.chapter + 1); }

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
    $('world-party').innerHTML = s.party.map((u, i) => `<div class="party-chip ${i < 5 ? '' : 'reserve'}">${u.name} <small>Lv${u.level} ${u.jobData.name}</small></div>`).join('');
    if (ch) {
      const o = ch.objective || { type: 'rout' };
      const goal = o.type === 'survive' ? `Hold out for ${o.rounds} rounds`
        : o.type === 'boss' ? `Defeat ${(ch.enemies.find(e => e.boss) || {}).name || 'the commander'}`
        : 'Defeat every enemy';
      const topLevel = Math.max(...ch.enemies.map(e => e.level));
      const ready = this.readiness(ch);
      $('world-next').innerHTML = `
        <div class="chapter-num">Chapter ${s.chapter + 1}</div>
        <div class="chapter-title">${ch.title}</div>
        <div class="chapter-map">${MAPS[ch.map].name} · ${ch.enemies.length} enemies · up to Lv ${topLevel}</div>
        <div class="chapter-goal">Objective: ${goal}${o.protectLeader ? ' · Rowan must not be lost' : ''}</div>
        ${ready ? `<div class="chapter-warn">${ready}</div>` : ''}`;
      $('btn-battle').disabled = false;
      $('btn-battle').textContent = 'March to Battle';
    } else {
      $('world-next').innerHTML = `<div class="chapter-title">The war is over... for now.</div><div class="chapter-map">Training battles remain available.</div>`;
      $('btn-battle').disabled = true;
      $('btn-battle').textContent = 'Campaign complete';
    }
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
    $('world-stock').textContent = spare ? `${spare} spare item${spare === 1 ? '' : 's'} in the baggage` : 'No spare equipment';
    const hireLvl = Math.max(1, this.avgLevel() - 1);
    $('hire-info').textContent = `Hire a level ${hireLvl} recruit for 300 gil (party max 8).`;
    $('btn-hire-squire').disabled = $('btn-hire-chemist').disabled = s.gil < 300 || s.party.length >= 8;
    this.showScreen('world');
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
        <span class="name">${u.name}${u.leader ? ' ♛' : ''}</span>
        <span class="job">Lv${u.level} ${u.jobData.name}</span>
        <span class="btns"><button data-up="${i}" ${i === 0 ? 'disabled' : ''}>▲</button><button data-down="${i}" ${i === s.party.length - 1 ? 'disabled' : ''}>▼</button></span>
      </div>`).join('');
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
    $('form-detail').innerHTML = `
      <div class="detail-head"><h2>${u.name}</h2><span>Level ${u.level} · ${u.exp}/100 EXP</span></div>
      <div class="detail-grid">
        <label>Job <select id="sel-job">${jobOpts}</select></label>
        <label>Secondary <select id="sel-sec">${secOpts}</select></label>
      </div>
      <p class="job-desc">${u.jobData.desc}</p>
      <div class="stat-grid">
        <span>HP ${st.maxHp}</span><span>MP ${st.maxMp}</span><span>PA ${st.pa}</span><span>MA ${st.ma}</span>
        <span>Speed ${st.spd}</span><span>Move ${st.move}</span><span>Jump ${st.jump}</span><span>Evade ${st.evade}%</span>
      </div>
      <div class="weapon">Weapon: ${u.weapon.name} (power ${u.weapon.power}, range ${u.weapon.range})${u.dualWielding ? ` + ${u.offhandWeapon.name}` : ''}</div>
      <div class="job-levels">Job levels: ${jobLevels}</div>
      ${affLine ? `<div class="job-levels">Elements: ${affLine}</div>` : ''}
      <h3>Equipment <button id="btn-optimize" class="mini">Optimize</button></h3>
      <div class="equip-grid">${this.equipRows(u)}</div>
      <h3>Abilities Equipped</h3>
      <div class="equip-grid">${this.passiveRows(u)}</div>
      <h3>${u.jobData.skillset} <small>${jp} JP available · ${u.jobData.name} Lv${u.jobLevel(u.job)}</small></h3>
      <div class="ab-list">${abilities}</div>
      ${passiveLearn ? `<h3>${u.jobData.name} Passives</h3><div class="ab-list">${passiveLearn}</div>` : ''}`;
    $('sel-job').onchange = (e) => {
      u.job = e.target.value;
      if (u.secondary === u.job) u.secondary = null;
      this.syncGear(u);
      this.openFormation(this.formSel);
    };
    $('sel-sec').onchange = (e) => { u.secondary = e.target.value || null; this.renderFormationDetail(); };
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
      const list = opts.map(id => {
        const owned = this.invCount(id) + (cur === id ? 1 : 0);
        return `<option value="${id}" ${cur === id ? 'selected' : ''}>${ITEMS[id].name} (x${owned}) — ${this.itemSummary(id)}</option>`;
      }).join('');
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
    const stock = Object.keys(ITEMS).filter(id => ITEMS[id].price > 0 && ITEMS[id].tier <= tier);
    const bySlot = {};
    for (const id of stock) (bySlot[ITEMS[id].slot] = bySlot[ITEMS[id].slot] || []).push(id);
    return Object.entries(SLOT_NAMES).filter(([slot]) => bySlot[slot]).map(([slot, label]) => {
      const items = bySlot[slot].sort((a, b) => ITEMS[a].price - ITEMS[b].price).map(id => {
        const it = ITEMS[id], fits = this.fitsList(id);
        const afford = this.state.gil >= it.price;
        return `<div class="shop-row ${fits ? '' : 'unfit'}">
          <div><b>${it.name}</b> <small>${this.itemSummary(id)}</small>
            <div class="fits">${fits ? 'Fits: ' + fits : 'No one in your party can use this yet'}${this.invCount(id) ? ` · in stock: ${this.invCount(id)}` : ''}</div></div>
          <button data-buy="${id}" ${afford ? '' : 'disabled'}>${it.price} gil</button></div>`;
      }).join('');
      return `<h3>${label}</h3>${items}`;
    }).join('');
  }

  shopSellRows() {
    const ids = Object.keys(this.state.inventory).filter(id => this.invCount(id) > 0 && ITEMS[id] && ITEMS[id].price > 0);
    if (!ids.length) return '';
    return ids.sort((a, b) => ITEMS[b].price - ITEMS[a].price).map(id => {
      const it = ITEMS[id], value = Math.floor(it.price / 2);
      return `<div class="shop-row">
        <div><b>${it.name}</b> <small>${this.itemSummary(id)}</small><div class="fits">Spare: ${this.invCount(id)}</div></div>
        <button data-sell="${id}">Sell ${value} gil</button></div>`;
    }).join('');
  }

  buy(id) {
    const it = ITEMS[id];
    if (!it || this.state.gil < it.price) return;
    this.state.gil -= it.price;
    this.invAdd(id);
    this.toast(`Bought ${it.name}.`);
    this.openShop('buy');
  }

  sell(id) {
    const it = ITEMS[id];
    if (!it || !this.invCount(id) || !it.price) return;
    this.invRemove(id);
    this.state.gil += Math.floor(it.price / 2);
    this.toast(`Sold ${it.name}.`);
    this.openShop('sell');
  }

  // A victory sometimes turns up a piece of gear from the field.
  rollLoot(guaranteed) {
    if (!guaranteed && Math.random() > 0.4) return null;
    const tier = this.shopTier();
    const pool = Object.keys(ITEMS).filter(id => ITEMS[id].price > 0 && ITEMS[id].tier <= tier);
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
  async startNextChapter() {
    const ch = CAMPAIGN[this.state.chapter];
    if (!ch) return;
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
    const mapIds = Object.keys(MAPS).filter(m => m !== 'thornwall');
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
    const roster = this.state.party;
    const battle = Battle.setup(mapDef, roster, enemySpecs, this.ui.hooks(), opts.objective, this.state.difficulty);
    this.battle = battle;
    $('battle-name').textContent = mapDef.name;
    this.ui.showObjective();
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
    this.battle = null;
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
    await this.results(result, r, battle.endReason);
    return result;
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

  results(result, r, battleEndReason) {
    return new Promise(resolve => {
      audio.sfx(result === 'victory' ? 'victory' : 'defeat');
      $('results-title').textContent = result === 'victory' ? 'Victory!' : 'Defeat...';
      $('results-title').className = result;
      $('results-body').innerHTML = `
        ${battleEndReason ? `<p class="res-reason">${battleEndReason}</p>` : ''}
        <div class="res-line">Experience earned: <b>${r.exp}</b></div>
        <div class="res-line">Gil ${result === 'victory' ? 'earned' : 'kept'}: <b>${result === 'victory' ? r.gil : 0}</b></div>
        ${r.loot ? `<div class="res-line res-loot">Recovered: <b>${r.loot}</b></div>` : ''}
        ${r.events.length ? `<ul class="res-events">${r.events.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
        ${result === 'defeat' ? '<p class="res-note">Your party regroups. Train, learn new abilities, and try again.</p>' : ''}`;
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
  window.addEventListener('resize', () => { clearTimeout(window.__rt); window.__rt = setTimeout(reframe, 200); });
  // A quiet blip on any button keeps the menus feeling responsive.
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && !e.target.disabled) audio.sfx('menu');
  });
  // A double tap should never zoom the page out from under the board.
  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
  }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
});
