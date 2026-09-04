/* ==========================================================================
   Battle UI: player turn state machine, menus, turn order, log, prediction.
   ========================================================================== */

class BattleUI {
  constructor(renderer) {
    this.r = renderer;
    this.cv = renderer.cv;
    this.battle = null;
    this.turn = null;      // {unit, mode, ability, reach, targets, resolve}
    this.hover = null;
    this.drag = null;
    this.el = {
      order: document.getElementById('turn-order'),
      card: document.getElementById('unit-card'),
      menu: document.getElementById('action-menu'),
      pred: document.getElementById('prediction'),
      log: document.getElementById('log'),
      roster: document.getElementById('deploy-panel'),
      banner: document.getElementById('banner'),
      tileInfo: document.getElementById('tile-info'),
      objective: document.getElementById('objective'),
      hint: document.getElementById('hint'),
    };
    this.bindInput();
  }

  bind(battle) {
    this.battle = battle;
    this.turn = null;
    this.deploy = null;
    this.el.log.innerHTML = '';
    this.el.menu.innerHTML = '';
    this.el.pred.innerHTML = '';
    this.refresh();
  }

  hooks() {
    return {
      log: (m, cls) => this.log(m, cls),
      refresh: () => this.refresh(),
      showFloat: (u, t, c) => this.r.showFloat(u, t, c),
      animateMove: (u, p) => { audio.sfx('move'); return this.r.animateMove(u, p); },
      animateAction: (u, ab, x, y) => {
        audio.sfx(ab.kind === 'magic' ? 'magic' : ab.kind === 'support' || ab.kind === 'item' ? 'heal' : 'hit');
        return this.r.animateAction(u, ab, x, y);
      },
      onJump: (u) => this.r.onJump(u),
      onLand: (u, x, y) => this.r.onLand(u, x, y),
      onDeath: (u) => this.r.onDeath(u),
      focus: (u) => this.r.focus(u),
      onTurnStart: async (u) => { await this.r.focus(u); this.banner(`${u.name}'s turn`, u.team); this.refresh(); },
      onTurnEnd: () => { this.r.clearHighlights(); this.refresh(); },
      awaitPlayerTurn: (u) => this.awaitPlayerTurn(u),
    };
  }

  // ---- logging / info panels ---------------------------------------------------------
  // Every engine event is logged, so the log is also where battle sound lives.
  static LOG_SFX = { dmg: 'hit', heal: 'heal', miss: 'miss', ko: 'ko', lvl: 'levelup' };

  log(msg, cls = '') {
    const sfx = BattleUI.LOG_SFX[cls];
    if (sfx) audio.sfx(sfx);
    const d = document.createElement('div');
    d.className = `log-line ${cls}`;
    d.textContent = msg;
    this.el.log.appendChild(d);
    while (this.el.log.children.length > 60) this.el.log.removeChild(this.el.log.firstChild);
    this.el.log.scrollTop = this.el.log.scrollHeight;
  }

  banner(text, team) {
    const b = this.el.banner;
    b.textContent = text;
    b.className = `banner show ${team}`;
    clearTimeout(this._bt);
    this._bt = setTimeout(() => { b.className = 'banner'; }, 1100);
  }

  showObjective() {
    if (!this.battle || !this.el.objective) return;
    this.el.objective.textContent = this.battle.objectiveText();
  }

  refresh() {
    if (!this.battle) return;
    this.showObjective();
    if (this.deploy) this.renderEnemyRoster(); else this.renderOrder();
    const u = (this.hover && this.battle.unitAt(this.hover.x, this.hover.y)) || (this.turn && this.turn.unit) || this.battle.active;
    this.renderCard(u);
  }

  renderOrder() {
    const list = this.battle.forecast(9);
    let html = '<div class="panel-title">Turn Order</div>';
    for (const e of list) {
      if (e.kind === 'unit') html += `<div class="order-row ${e.unit.team} ${e.unit.alive ? '' : 'fallen'}"><span class="dot"></span>${e.unit.name}<span class="sub">${e.unit.alive ? e.unit.jobData.name : 'fallen'}</span></div>`;
      else html += `<div class="order-row pending"><span class="dot"></span>${e.p.ability.name}<span class="sub">${e.p.unit.name}</span></div>`;
    }
    this.el.order.innerHTML = html;
  }

  renderCard(u) {
    if (!u) { this.el.card.innerHTML = ''; return; }
    const st = Object.keys(u.statuses).map(s => `<span class="status" style="background:${STATUSES[s].color}">${STATUSES[s].name}</span>`).join('');
    const mods = Object.entries(u.mods).filter(([, v]) => v).map(([k, v]) => `${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`).join(', ');
    this.el.card.innerHTML = `
      <div class="card-head ${u.team}"><b>${u.name}</b><span>Lv ${u.level} ${u.jobData.name}${u.boss ? ' ★' : ''}</span></div>
      <div class="bar hp"><i style="width:${(u.hp / u.maxHp) * 100}%"></i><span>HP ${u.hp}/${u.maxHp}</span></div>
      <div class="bar mp"><i style="width:${u.maxMp ? (u.mp / u.maxMp) * 100 : 0}%"></i><span>MP ${u.mp}/${u.maxMp}</span></div>
      <div class="bar ct"><i style="width:${Math.min(100, u.ct)}%"></i><span>CT ${u.ct}</span></div>
      <div class="stats">
        <span>PA ${u.pa}</span><span>MA ${u.ma}</span><span>SPD ${u.spd}</span>
        <span>Move ${u.move}</span><span>Jump ${u.jump}</span><span>Evade ${u.evade}%</span>
      </div>
      ${mods ? `<div class="mods">${mods}</div>` : ''}
      <div class="statuses">${st}</div>
      ${u.alive ? '' : `<div class="ko">KO${u.koCount ? ` — carried off in ${u.koCount}` : ''}</div>`}`;
  }

  renderTileInfo(t) {
    if (!t) { this.el.tileInfo.textContent = ''; return; }
    const names = { g: 'Grass', d: 'Dirt', s: 'Stone', b: 'Wood', w: 'Water', t: 'Tree' };
    this.el.tileInfo.textContent = `${names[t.t] || '?'}  (${t.x},${t.y})  height ${t.h}`;
  }

  // ---- deployment -------------------------------------------------------------------
  // Runs before the first tick: pick who fights and where they stand.
  deployPhase(battle, roster) {
    return new Promise(resolve => {
      this.battle = battle;
      this.deploy = { roster, sel: roster.find(u => u.x >= 0) || roster[0], resolve };
      battle.showDeploy = true;
      document.getElementById('command').style.display = 'none';
      this.renderDeploy();
      this.renderEnemyRoster();
    });
  }

  endDeploy() {
    const d = this.deploy;
    if (!d) return;
    if (!this.battle.deployed().length) { this.toastHint('Place at least one unit.'); return; }
    this.deploy = null;
    this.battle.showDeploy = false;
    this.el.roster.innerHTML = '';
    this.el.roster.classList.remove('open');
    document.getElementById('command').style.display = '';
    this.el.hint.textContent = '';
    d.resolve();
  }

  toastHint(msg) {
    this.el.hint.textContent = msg;
    this.el.hint.classList.add('warn');
    setTimeout(() => this.el.hint.classList.remove('warn'), 900);
  }

  renderEnemyRoster() {
    const foes = this.battle.units.filter(u => u.team === 'enemy');
    this.el.order.innerHTML = '<div class="panel-title">Opposition</div>' + foes.map(u =>
      `<div class="order-row enemy"><span class="dot"></span>${u.name}<span class="sub">Lv${u.level} ${u.jobData.name}</span></div>`).join('');
  }

  renderDeploy() {
    const d = this.deploy;
    if (!d) return;
    const b = this.battle;
    const placed = b.deployed().length;
    this.el.hint.textContent = `Click a green tile to place ${d.sel ? d.sel.name : 'a unit'}. Click a deployed unit to pick it up.`;
    this.el.roster.classList.add('open');
    this.el.roster.innerHTML = `
      <div class="panel-title">Deploy <small>${placed}/${b.maxDeploy}</small></div>
      <div class="roster-list">${d.roster.map((u, i) => `
        <div class="roster-row ${u === d.sel ? 'sel' : ''} ${u.x >= 0 ? 'placed' : ''}" data-i="${i}">
          <span class="name">${u.name}${u.leader ? ' ♛' : ''}</span>
          <span class="job">Lv${u.level} ${u.jobData.name}</span>
          <span class="mark">${u.x >= 0 ? '●' : '○'}</span>
        </div>`).join('')}</div>
      <div class="dirs deploy-dirs">
        <button data-d="N">↗ N</button><button data-d="E">↘ E</button>
        <button data-d="W">↖ W</button><button data-d="S">↙ S</button>
      </div>
      <div class="deploy-actions">
        <button data-a="auto">Auto-place</button>
        <button data-a="clear">Clear</button>
        <button data-a="go" class="primary">Begin Battle</button>
      </div>`;
    this.el.roster.querySelectorAll('.roster-row').forEach(r => r.onclick = () => {
      d.sel = d.roster[+r.dataset.i];
      if (d.sel.x >= 0) this.r.focus(d.sel);
      this.renderDeploy();
    });
    this.el.roster.querySelectorAll('button[data-d]').forEach(btn => btn.onclick = () => {
      if (d.sel && d.sel.x >= 0) { d.sel.facing = btn.dataset.d; this.refresh(); }
    });
    this.el.roster.querySelectorAll('button[data-a]').forEach(btn => btn.onclick = () => {
      const a = btn.dataset.a;
      if (a === 'auto') b.autoDeploy(d.roster);
      else if (a === 'clear') for (const u of d.roster) b.withdraw(u);
      else return this.endDeploy();
      this.renderDeploy();
    });
    this.refresh();
  }

  onDeployClick(tile) {
    const d = this.deploy, b = this.battle;
    if (!d || !tile) return;
    audio.sfx('menu');
    const occupant = b.unitAt(tile.x, tile.y);
    if (occupant && occupant.team === 'player') {
      // Clicking the selected unit picks it back up; clicking another selects it.
      if (occupant === d.sel) b.withdraw(occupant); else d.sel = occupant;
      return this.renderDeploy();
    }
    if (occupant) return; // an enemy stands there
    if (!d.sel) return;
    if (!b.placeUnit(d.sel, tile.x, tile.y)) {
      this.toastHint(b.deployKeys.has(`${tile.x},${tile.y}`) ? `Only ${b.maxDeploy} units may deploy.` : 'Outside the deployment zone.');
      return;
    }
    // Move the selection along to the next unit still waiting in reserve.
    const next = d.roster.find(u => u.x < 0);
    if (next && b.deployed().length < b.maxDeploy) d.sel = next;
    this.renderDeploy();
  }

  // ---- player turn ------------------------------------------------------------------
  awaitPlayerTurn(unit) {
    return new Promise(resolve => {
      this.turn = { unit, mode: 'menu', ability: null, reach: null, targets: null, resolve };
      this.setMode('menu');
    });
  }

  endTurn() {
    const t = this.turn;
    this.turn = null;
    this.r.clearHighlights();
    this.el.menu.innerHTML = '';
    this.el.pred.innerHTML = '';
    this.el.hint.textContent = '';
    if (t) t.resolve();
  }

  // Called from the game screen when the player retreats.
  abort() {
    if (this.deploy) {
      const d = this.deploy;
      this.deploy = null;
      this.battle.showDeploy = false;
      this.el.roster.innerHTML = '';
      this.el.roster.classList.remove('open');
      document.getElementById('command').style.display = '';
      d.resolve();
      return;
    }
    if (this.turn) this.endTurn();
  }

  setMode(mode) {
    const t = this.turn; if (!t) return;
    t.mode = mode;
    this.r.clearHighlights();
    this.el.pred.innerHTML = '';
    const u = t.unit;
    const hint = this.el.hint;
    if (mode === 'menu') {
      hint.textContent = 'Choose an action. Right-click or Esc cancels.';
      this.el.menu.innerHTML = `
        <div class="menu-title">${u.name}</div>
        <button data-a="move" ${u.turnFlags.moved ? 'disabled' : ''}>Move</button>
        <button data-a="act" ${u.turnFlags.acted ? 'disabled' : ''}>Act</button>
        <button data-a="wait">Wait</button>`;
      this.el.menu.querySelectorAll('button').forEach(b => b.onclick = () => this.menuAction(b.dataset.a));
    } else if (mode === 'move') {
      t.reach = this.battle.grid.reachable(u, this.battle.units);
      for (const k of t.reach.keys()) if (k !== `${u.x},${u.y}`) this.r.hl.move.add(k);
      hint.textContent = 'Select a tile to move to.';
      this.el.menu.innerHTML = `<div class="menu-title">Move</div><button data-a="cancel">Cancel</button>`;
      this.el.menu.querySelector('button').onclick = () => this.setMode('menu');
    } else if (mode === 'act') {
      hint.textContent = 'Choose a skillset.';
      const sets = u.actionMenu();
      this.el.menu.innerHTML = `<div class="menu-title">Act</div>` +
        sets.map((s, i) => `<button data-i="${i}">${s.label}</button>`).join('') + `<button data-a="cancel">Cancel</button>`;
      this.el.menu.querySelectorAll('button').forEach(b => b.onclick = () => {
        if (b.dataset.a === 'cancel') return this.setMode('menu');
        t.set = sets[+b.dataset.i];
        if (t.set.abilities.length === 1 && t.set.abilities[0] === 'attack') this.chooseAbility('attack');
        else this.setMode('abilities');
      });
    } else if (mode === 'abilities') {
      hint.textContent = 'Choose an ability. Hover for details.';
      this.el.menu.innerHTML = `<div class="menu-title">${t.set.label}</div>` +
        t.set.abilities.map(id => {
          const ab = ABILITIES[id];
          const ok = this.battle.canAfford(u, ab);
          return `<button data-id="${id}" ${ok ? '' : 'disabled'}><span>${ab.name}</span><small>${ab.mp ? ab.mp + ' MP' : ''}${ab.ct ? ' · CT ' + ab.ct : ''}</small></button>`;
        }).join('') + `<button data-a="cancel">Back</button>`;
      this.el.menu.querySelectorAll('button').forEach(b => {
        b.onclick = () => b.dataset.a === 'cancel' ? this.setMode('act') : this.chooseAbility(b.dataset.id);
        b.onmouseenter = () => { if (b.dataset.id) this.showAbilityInfo(ABILITIES[b.dataset.id]); };
      });
    } else if (mode === 'target') {
      const ab = t.ability;
      t.targets = this.battle.targetTilesFor(u, ab);
      for (const tile of t.targets) this.r.hl.target.add(`${tile.x},${tile.y}`);
      hint.textContent = `${ab.name}: select a target tile.`;
      this.el.menu.innerHTML = `<div class="menu-title">${ab.name}</div><button data-a="cancel">Cancel</button>`;
      this.el.menu.querySelector('button').onclick = () => this.setMode(ab === ABILITIES.attack ? 'act' : 'abilities');
      if (ab.self) { this.previewTarget(this.battle.grid.tile(u.x, u.y)); }
    } else if (mode === 'wait') {
      hint.textContent = 'Choose a direction to face (or click a tile).';
      this.el.menu.innerHTML = `<div class="menu-title">Face</div>
        <div class="dirs">
          <button data-d="N">↗ North</button><button data-d="E">↘ East</button>
          <button data-d="W">↖ West</button><button data-d="S">↙ South</button>
        </div><button data-a="keep">Keep facing</button>`;
      this.el.menu.querySelectorAll('button').forEach(b => b.onclick = () => {
        if (b.dataset.d) u.facing = b.dataset.d;
        this.endTurn();
      });
    }
    this.refresh();
  }

  showAbilityInfo(ab) {
    const u = this.turn.unit;
    const range = this.battle.abilityRange(u, ab), vert = this.battle.abilityVert(u, ab);
    this.el.pred.innerHTML = `<div class="ab-info"><b>${ab.name}</b><div>${ab.desc}</div>
      <div class="ab-meta">Range ${range} · Area ${ab.aoe ? (ab.aoe === 1 ? 'cross' : 'wide') : 'single'} · Vert ${vert}${ab.mp ? ` · ${ab.mp} MP` : ''}${ab.ct ? ` · Charge ${ab.ct}` : ' · Instant'}</div></div>`;
  }

  menuAction(a) {
    const t = this.turn; if (!t) return;
    audio.sfx('select');
    if (a === 'move') this.setMode('move');
    else if (a === 'act') this.setMode('act');
    else if (a === 'wait') this.setMode('wait');
  }

  chooseAbility(id) {
    const t = this.turn; if (!t) return;
    audio.sfx('select');
    t.ability = ABILITIES[id];
    this.setMode('target');
  }

  previewTarget(tile) {
    const t = this.turn; if (!t || t.mode !== 'target') return;
    this.r.hl.area.clear();
    if (!tile || !t.targets.some(x => x.x === tile.x && x.y === tile.y)) { this.el.pred.innerHTML = ''; return; }
    const ab = t.ability, u = t.unit;
    for (const a of this.battle.grid.areaTiles(tile.x, tile.y, ab.aoe)) this.r.hl.area.add(`${a.x},${a.y}`);
    const preds = this.battle.predict(u, ab, tile.x, tile.y);
    if (!preds.length) { this.el.pred.innerHTML = '<div class="pred-none">No target in area.</div>'; return; }
    this.el.pred.innerHTML = preds.map(p => {
      const parts = [];
      if (p.dmg) parts.push(`<span class="p-dmg">${p.dmg} dmg</span>`);
      if (p.heal) parts.push(`<span class="p-heal">+${p.heal} HP</span>`);
      for (const n of p.notes) parts.push(`<span class="p-note">${n}</span>`);
      const rel = relativeFacing(p.unit, u.x, u.y);
      return `<div class="pred-row ${p.unit.team}"><b>${p.unit.name}</b> <span class="p-hit">${p.hit}% hit</span> ${parts.join(' ')}<span class="p-rel">${ab.kind === 'physical' && p.unit.team !== u.team ? rel : ''}</span></div>`;
    }).join('');
  }

  async confirmTarget(tile) {
    const t = this.turn; if (!t || t.mode !== 'target') return;
    if (!tile || !t.targets.some(x => x.x === tile.x && x.y === tile.y)) return;
    const u = t.unit, ab = t.ability;
    t.mode = 'busy';
    this.r.clearHighlights();
    this.el.menu.innerHTML = '';
    this.el.pred.innerHTML = '';
    await this.battle.useAbility(u, ab, tile.x, tile.y);
    if (!this.turn) return; // battle ended / aborted
    if (this.battle.over || u.airborne || !u.alive) return this.endTurn();
    if (u.turnFlags.moved) this.setMode('wait'); else this.setMode('menu');
  }

  async confirmMove(tile) {
    const t = this.turn; if (!t || t.mode !== 'move') return;
    const path = this.battle.grid.pathTo(t.reach, tile.x, tile.y);
    if (!path || path.length < 2) return;
    t.mode = 'busy';
    this.r.clearHighlights();
    this.el.menu.innerHTML = '';
    await this.battle.moveUnit(t.unit, path);
    if (!this.turn) return;
    if (t.unit.turnFlags.acted) this.setMode('wait'); else this.setMode('menu');
  }

  // ---- input ---------------------------------------------------------------------------
  bindInput() {
    const cv = this.cv;
    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
    };
    cv.addEventListener('mousemove', (e) => {
      const p = pos(e);
      if (this.drag) {
        const dx = p.x - this.drag.x, dy = p.y - this.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) this.drag.moved = true;
        if (this.drag.moved) { const z = this.r.zoom || 1; this.r.cam.x += dx / z; this.r.cam.y += dy / z; this.drag.x = p.x; this.drag.y = p.y; }
        return;
      }
      if (!this.battle) return;
      const t = this.r.pickTile(p.x, p.y);
      this.hover = t;
      this.r.hl.cursor = t;
      this.renderTileInfo(t);
      this.refresh();
      if (this.turn && this.turn.mode === 'target') this.previewTarget(t);
    });
    cv.addEventListener('mouseleave', () => { this.hover = null; this.r.hl.cursor = null; this.refresh(); });
    cv.addEventListener('mousedown', (e) => { if (e.button === 0) { const p = pos(e); this.drag = { x: p.x, y: p.y, moved: false }; } });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0 || !this.drag) return;
      const moved = this.drag.moved; this.drag = null;
      if (moved || e.target !== cv) return;
      const p = pos(e);
      const t = this.r.pickTile(p.x, p.y);
      this.onClick(t);
    });
    cv.addEventListener('contextmenu', (e) => { e.preventDefault(); this.cancel(); });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.r.setZoom((this.r.zoom || 1) * (e.deltaY < 0 ? 1.1 : 0.9)); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!this.battle) return;
      if (e.key === 'Escape') this.cancel();
      const pan = 32;
      if (e.key === 'ArrowLeft') this.r.cam.x += pan;
      if (e.key === 'ArrowRight') this.r.cam.x -= pan;
      if (e.key === 'ArrowUp') this.r.cam.y += pan;
      if (e.key === 'ArrowDown') this.r.cam.y -= pan;
    });
  }

  onClick(tile) {
    if (this.deploy) return this.onDeployClick(tile);
    const t = this.turn;
    if (!t || !tile) return;
    if (t.mode === 'move') this.confirmMove(tile);
    else if (t.mode === 'target') this.confirmTarget(tile);
    else if (t.mode === 'wait') {
      if (tile.x !== t.unit.x || tile.y !== t.unit.y) t.unit.facing = facingFromDelta(tile.x - t.unit.x, tile.y - t.unit.y);
      this.endTurn();
    }
  }

  cancel() {
    const t = this.turn; if (!t) return;
    audio.sfx('cancel');
    if (t.mode === 'move' || t.mode === 'act' || t.mode === 'wait') this.setMode('menu');
    else if (t.mode === 'abilities') this.setMode('act');
    else if (t.mode === 'target') this.setMode(t.ability === ABILITIES.attack ? 'act' : 'abilities');
  }
}
