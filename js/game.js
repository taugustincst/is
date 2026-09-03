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
    this.showScreen('title');
    $('btn-continue').disabled = !localStorage.getItem(SAVE_KEY);
  }

  // ---- screens -----------------------------------------------------------------------
  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
  }

  bindScreens() {
    $('btn-new').onclick = () => this.newGame();
    $('btn-continue').onclick = () => this.loadGame();
    $('btn-battle').onclick = () => this.startNextChapter();
    $('btn-train').onclick = () => this.startTraining();
    $('btn-formation').onclick = () => this.openFormation();
    $('btn-save').onclick = () => { this.saveGame(); this.toast('Game saved.'); };
    $('btn-title').onclick = () => this.showScreen('title');
    $('btn-formation-back').onclick = () => this.showWorld();
    $('btn-hire-squire').onclick = () => this.hire('squire');
    $('btn-hire-chemist').onclick = () => this.hire('chemist');
    $('btn-retreat').onclick = () => this.retreat();
    $('btn-help').onclick = () => $('help').classList.toggle('open');
    $('btn-help-close').onclick = () => $('help').classList.remove('open');
  }

  toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 1600);
  }

  // ---- state -----------------------------------------------------------------------------
  newGame() {
    this.state = {
      party: STARTING_PARTY.map(p => new Unit(Object.assign({ team: 'player' }, p))),
      gil: 500, chapter: 0, victories: 0,
    };
    this.showWorld();
  }

  saveGame() {
    const data = { v: 1, gil: this.state.gil, chapter: this.state.chapter, victories: this.state.victories, party: this.state.party.map(u => u.toSave()) };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    $('btn-continue').disabled = false;
  }

  loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    this.state = { gil: d.gil, chapter: d.chapter, victories: d.victories || 0, party: d.party.map(p => Unit.fromSave(Object.assign({ team: 'player' }, p))) };
    this.showWorld();
  }

  avgLevel() { return Math.max(1, Math.round(this.state.party.reduce((a, u) => a + u.level, 0) / this.state.party.length)); }

  // ---- world screen --------------------------------------------------------------------------
  showWorld() {
    const s = this.state;
    const ch = CAMPAIGN[s.chapter];
    $('world-gil').textContent = `${s.gil} gil`;
    $('world-party').innerHTML = s.party.map((u, i) => `<div class="party-chip ${i < 5 ? '' : 'reserve'}">${u.name} <small>Lv${u.level} ${u.jobData.name}</small></div>`).join('');
    if (ch) {
      $('world-next').innerHTML = `<div class="chapter-num">Chapter ${s.chapter + 1}</div><div class="chapter-title">${ch.title}</div><div class="chapter-map">${MAPS[ch.map].name} · ${ch.enemies.length} enemies · Lv ${ch.enemies[0].level}</div>`;
      $('btn-battle').disabled = false;
      $('btn-battle').textContent = 'March to Battle';
    } else {
      $('world-next').innerHTML = `<div class="chapter-title">The war is over... for now.</div><div class="chapter-map">Training battles remain available.</div>`;
      $('btn-battle').disabled = true;
      $('btn-battle').textContent = 'Campaign complete';
    }
    const hireLvl = Math.max(1, this.avgLevel() - 1);
    $('hire-info').textContent = `Hire a level ${hireLvl} recruit for 300 gil (party max 8).`;
    $('btn-hire-squire').disabled = $('btn-hire-chemist').disabled = s.gil < 300 || s.party.length >= 8;
    this.showScreen('world');
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
      <div class="weapon">Weapon: ${u.weapon.name} (power ${u.weapon.power}, range ${u.weapon.range})</div>
      <div class="job-levels">Job levels: ${jobLevels}</div>
      <h3>${u.jobData.skillset} <small>${jp} JP available · ${u.jobData.name} Lv${u.jobLevel(u.job)}</small></h3>
      <div class="ab-list">${abilities}</div>`;
    $('sel-job').onchange = (e) => { u.job = e.target.value; if (u.secondary === u.job) u.secondary = null; this.openFormation(this.formSel); };
    $('sel-sec').onchange = (e) => { u.secondary = e.target.value || null; this.renderFormationDetail(); };
    $('form-detail').querySelectorAll('button[data-learn]').forEach(b => b.onclick = () => {
      const ab = ABILITIES[b.dataset.learn];
      if ((u.jp[u.job] || 0) < ab.jp) return;
      u.jp[u.job] -= ab.jp; u.learned[b.dataset.learn] = true;
      this.toast(`${u.name} learned ${ab.name}!`);
      this.renderFormationDetail();
    });
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
    const result = await this.runBattle(MAPS[ch.map], ch.enemies, ch.gil);
    if (result === 'victory') {
      this.state.chapter++;
      this.state.victories++;
      if (ch.recruit) {
        const r = new Unit({ name: ch.recruit.name, job: ch.recruit.job, level: ch.recruit.level, team: 'player' });
        // Recruits arrive with a little JP invested in their trade.
        r.jp[r.job] = 60; r.jpTotal[r.job] = 60;
        this.state.party.push(r);
      }
      this.saveGame();
      await this.story(ch.title, ch.outro);
    }
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
    await this.runBattle(map, enemies, 100 + lvl * 20);
    this.saveGame();
    this.showWorld();
  }

  async runBattle(mapDef, enemySpecs, gilReward) {
    const deploy = this.state.party.slice(0, Math.min(5, mapDef.deploy.length));
    const battle = Battle.setup(mapDef, deploy, enemySpecs, this.ui.hooks());
    this.battle = battle;
    $('battle-name').textContent = mapDef.name;
    this.renderer.setBattle(battle);
    this.ui.bind(battle);
    this.showScreen('battle');
    this.renderer.start();
    this.ui.log(`Battle begins at ${mapDef.name}!`, 'lvl');
    const result = await battle.run();
    await sleep(600);
    this.renderer.stop();
    this.battle = null;
    // Revive and reset everyone after the fight.
    for (const u of this.state.party) u.resetBattleState();
    const r = battle.rewards;
    if (result === 'victory') { r.gil += gilReward; this.state.gil += r.gil; }
    await this.results(result, r);
    return result;
  }

  retreat() {
    if (!this.battle || this.battle.over) return;
    if (!confirm('Retreat from battle? This counts as a defeat.')) return;
    this.battle.over = true; this.battle.result = 'defeat';
    this.ui.log('The party retreats!', 'ko');
    this.ui.abort();
  }

  results(result, r) {
    return new Promise(resolve => {
      $('results-title').textContent = result === 'victory' ? 'Victory!' : 'Defeat...';
      $('results-title').className = result;
      $('results-body').innerHTML = `
        <div class="res-line">Experience earned: <b>${r.exp}</b></div>
        <div class="res-line">Gil ${result === 'victory' ? 'earned' : 'kept'}: <b>${result === 'victory' ? r.gil : 0}</b></div>
        ${r.events.length ? `<ul class="res-events">${r.events.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
        ${result === 'defeat' ? '<p class="res-note">Your party regroups. Train, learn new abilities, and try again.</p>' : ''}`;
      $('btn-results').onclick = () => { $('btn-results').onclick = null; resolve(); };
      this.showScreen('results');
    });
  }
}

window.addEventListener('DOMContentLoaded', () => { window.game = new Game(); });
