/* ==========================================================================
   Battle engine: Charge Time ticks, turns, actions, damage resolution,
   statuses, experience and enemy AI. Presentation hooks are injected via
   `hooks` so the engine stays independent from the renderer.
   ========================================================================== */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function facingFromDelta(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'E' : 'W';
  return dy >= 0 ? 'S' : 'N';
}

// Relative position of attacker from the defender's perspective: front/side/back.
function relativeFacing(defender, ax, ay) {
  const [fx, fy] = DIRS[defender.facing];
  const dx = ax - defender.x, dy = ay - defender.y;
  const dot = fx * dx + fy * dy;
  const cross = Math.abs(fx * dy - fy * dx);
  if (dot > 0 && dot >= cross) return 'front';
  if (dot < 0 && -dot >= cross) return 'back';
  return 'side';
}

class Battle {
  constructor(mapDef, playerUnits, enemyUnits, hooks) {
    this.grid = new Grid(mapDef);
    this.mapDef = mapDef;
    this.units = [...playerUnits, ...enemyUnits];
    this.hooks = hooks; // { log, animateMove, animateAction, showDamage, awaitPlayerTurn, onStateChange, onTurnStart }
    this.pending = []; // charged actions {unit, ability, tx, ty, ct, speed}
    this.tick = 0;
    this.over = false;
    this.result = null;
    this.rewards = { exp: 0, gil: 0, events: [] };
    this.active = null;
    for (const u of this.units) {
      u.resetBattleState();
    }
    // Restore positions (resetBattleState clears them).
    playerUnits.forEach((u, i) => {
      const d = mapDef.deploy[i]; u.x = d[0]; u.y = d[1];
      u.facing = 'N';
    });
    for (const e of enemyUnits) { /* positions set by makeEnemy; resetBattleState wiped them */ }
  }

  static setup(mapDef, playerUnits, enemySpecs, hooks) {
    const enemies = enemySpecs.map(makeEnemy);
    const b = new Battle(mapDef, playerUnits, [], hooks);
    for (const spec of enemySpecs) {
      const e = enemies.shift();
      e.resetBattleState();
      e.x = spec.x; e.y = spec.y; e.facing = 'S';
      b.units.push(e);
    }
    // Enemies face the nearest player at start.
    for (const e of b.units.filter(u => u.team === 'enemy')) {
      const p = b.nearestEnemyOf(e);
      if (p) e.facing = facingFromDelta(p.x - e.x, p.y - e.y);
    }
    // Random initial CT so the opening order isn't purely by speed.
    for (const u of b.units) u.ct = Math.floor(Math.random() * 30);
    return b;
  }

  log(msg, cls) { if (this.hooks.log) this.hooks.log(msg, cls); }
  unitAt(x, y) { return this.units.find(u => u.alive && !u.airborne && u.x === x && u.y === y) || null; }
  alliesOf(u) { return this.units.filter(o => o.team === u.team); }
  enemiesOf(u) { return this.units.filter(o => o.team !== u.team); }
  nearestEnemyOf(u) {
    let best = null, bd = 1e9;
    for (const e of this.enemiesOf(u)) {
      if (!e.alive) continue;
      const d = Grid.dist(u.x, u.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ---- ability geometry ----------------------------------------------------
  abilityRange(unit, ab) { return ab.range === 'weapon' ? unit.weapon.range : ab.range; }
  abilityVert(unit, ab) { return ab.vert === 'weapon' ? unit.weapon.vert : ab.vert; }

  targetTilesFor(unit, ab, fromX = unit.x, fromY = unit.y) {
    if (ab.self) return [this.grid.tile(fromX, fromY)];
    return this.grid.targetTiles(fromX, fromY, this.abilityRange(unit, ab), this.abilityVert(unit, ab), !!ab.allowSelf);
  }

  affectedUnits(unit, ab, tx, ty) {
    const tiles = this.grid.areaTiles(tx, ty, ab.aoe);
    const out = [];
    for (const t of tiles) {
      for (const u of this.units) {
        if (u.x !== t.x || u.y !== t.y) continue;
        if (u.airborne) continue;
        if (ab.deadOnly ? u.alive : !u.alive) continue;
        const isAlly = u.team === unit.team;
        if (ab.affects === 'ally' && !isAlly) continue;
        if (ab.affects === 'enemy' && isAlly) continue;
        out.push(u);
      }
    }
    return out;
  }

  // ---- prediction / resolution ----------------------------------------------
  hitChance(user, ab, target) {
    if (ab.kind !== 'physical') return 100;
    if (target.team === user.team) return 100;
    const rel = relativeFacing(target, user.x, user.y);
    const mult = rel === 'front' ? 1 : rel === 'side' ? 0.5 : 0;
    return Math.max(5, Math.min(100, Math.round(100 - target.evade * mult)));
  }

  computeEffect(user, ab, eff, target) {
    const wpow = user.weapon.power;
    const power = eff.power === 'weapon' ? wpow + (eff.bonus || 0) : (eff.power || 0);
    let base = 0;
    if (eff.formula === 'pa') base = user.pa * power;
    else if (eff.formula === 'ma') base = user.ma * power;
    else if (eff.formula === 'curhp') base = user.hp;
    else base = eff.flat || 0;
    if (eff.mult) base *= eff.mult;
    if (eff.type === 'damage' || eff.type === 'drain') {
      // Height advantage for physical attacks.
      if (ab.kind === 'physical') {
        const dh = this.grid.height(user.x, user.y) - this.grid.height(target.x, target.y);
        if (dh >= 2) base *= 1.1; else if (dh <= -2) base *= 0.9;
        if (target.hasStatus('protect')) base *= 2 / 3;
      } else if (ab.kind === 'magic') {
        if (target.hasStatus('shell')) base *= 2 / 3;
      }
    }
    return Math.max(0, Math.floor(base));
  }

  // Preview for UI: list of {unit, hit, dmg, heal, notes}
  predict(user, ab, tx, ty) {
    return this.affectedUnits(user, ab, tx, ty).map(t => {
      const p = { unit: t, hit: this.hitChance(user, ab, t), dmg: 0, heal: 0, notes: [] };
      for (const eff of ab.effects) {
        if (eff.type === 'damage') p.dmg += this.computeEffect(user, ab, eff, t);
        else if (eff.type === 'drain') { const v = this.computeEffect(user, ab, eff, t); p.dmg += v; p.notes.push(`drain ${v}`); }
        else if (eff.type === 'heal') p.heal += this.computeEffect(user, ab, eff, t);
        else if (eff.type === 'mpheal') p.notes.push(`MP +${this.computeEffect(user, ab, eff, t)}`);
        else if (eff.type === 'revive') p.notes.push(`revive ${Math.round(eff.pct * 100)}%`);
        else if (eff.type === 'status') p.notes.push(`${STATUSES[eff.status].name} ${eff.hit}%`);
        else if (eff.type === 'statmod') p.notes.push(`${eff.stat.toUpperCase()} ${eff.amount > 0 ? '+' : ''}${eff.amount}`);
        else if (eff.type === 'cure') p.notes.push('cure');
        else if (eff.type === 'gil') p.notes.push(`steal ${t.level * 20} gil`);
        else if (eff.type === 'ctmod') p.notes.push(`CT ${eff.amount}`);
        else if (eff.type === 'ctset') p.notes.push(`CT = ${eff.amount}`);
      }
      if (user.dualWielding && ab === ABILITIES.attack) {
        // The offhand swings too, for its own weapon's power.
        const off = user.offhandWeapon;
        const extra = ab.effects.filter(e => e.type === 'damage')
          .reduce((a, e) => a + this.computeEffect(user, ab, Object.assign({}, e, { power: off.power }), t), 0);
        p.dmg += extra;
        p.notes.push('2 hits');
      }
      return p;
    });
  }

  async applyAbility(user, ab, tx, ty) {
    const targets = this.affectedUnits(user, ab, tx, ty);
    if (ab.mp) user.mp -= ab.mp;
    user.facing = (tx === user.x && ty === user.y) ? user.facing : facingFromDelta(tx - user.x, ty - user.y);
    if (this.hooks.animateAction) await this.hooks.animateAction(user, ab, tx, ty);
    let didSomething = false;
    const hits = user.dualWielding && ab === ABILITIES.attack ? 2 : 1;
    for (const t of targets) {
      for (let h = 0; h < hits; h++) {
        const roll = Math.random() * 100;
        const hit = this.hitChance(user, ab, t);
        if (roll >= hit) {
          this.log(`${t.name} evades ${user.name}'s ${ab.name}!`, 'miss');
          if (this.hooks.showFloat) this.hooks.showFloat(t, 'Miss', '#ddd');
          continue;
        }
        const off = h === 1 ? user.offhandWeapon : null;
        for (const eff of ab.effects) {
          const use = off && eff.power === 'weapon' ? Object.assign({}, eff, { power: off.power }) : eff;
          const r = this.applyEffect(user, ab, use, t);
          if (r) didSomething = true;
        }
        if (!t.alive && t.hp <= 0 && !t._deathLogged) {
          t._deathLogged = true;
          this.log(`${t.name} falls!`, 'ko');
          if (this.hooks.onDeath) await this.hooks.onDeath(t);
          if (user.team !== t.team) this.awardKill(user, t);
        }
        if (this.hooks.refresh) this.hooks.refresh();
        if (hits > 1) await sleep(250);
      }
    }
    if (!targets.length) this.log(`${user.name}'s ${ab.name} hits nothing.`);
    if (ab.suicide) { user.hp = 0; this.log(`${user.name} is consumed by the blast!`, 'ko'); if (this.hooks.onDeath) await this.hooks.onDeath(user); }
    if (didSomething || targets.length) this.awardAction(user, targets);
    if (this.hooks.refresh) this.hooks.refresh();
    await sleep(200);
  }

  applyEffect(user, ab, eff, t) {
    switch (eff.type) {
      case 'damage': {
        const v = this.computeEffect(user, ab, eff, t);
        t.hp = Math.max(0, t.hp - v);
        this.log(`${user.name}'s ${ab.name} deals ${v} damage to ${t.name}.`, 'dmg');
        if (this.hooks.showFloat) this.hooks.showFloat(t, `${v}`, '#ff6a5a');
        if (t.hp === 0) this.onUnitKO(t);
        return true;
      }
      case 'drain': {
        const v = Math.min(this.computeEffect(user, ab, eff, t), t.hp);
        t.hp -= v; user.hp = Math.min(user.maxHp, user.hp + v);
        this.log(`${user.name} drains ${v} HP from ${t.name}.`, 'dmg');
        if (this.hooks.showFloat) { this.hooks.showFloat(t, `${v}`, '#c56aff'); this.hooks.showFloat(user, `+${v}`, '#7cff7c'); }
        if (t.hp === 0) this.onUnitKO(t);
        return true;
      }
      case 'heal': {
        if (!t.alive) return false;
        const v = this.computeEffect(user, ab, eff, t);
        const real = Math.min(v, t.maxHp - t.hp);
        t.hp += real;
        this.log(`${t.name} recovers ${real} HP.`, 'heal');
        if (this.hooks.showFloat) this.hooks.showFloat(t, `+${real}`, '#7cff7c');
        return true;
      }
      case 'mpheal': {
        const v = this.computeEffect(user, ab, eff, t);
        const real = Math.min(v, t.maxMp - t.mp);
        t.mp += real;
        this.log(`${t.name} recovers ${real} MP.`, 'heal');
        if (this.hooks.showFloat) this.hooks.showFloat(t, `+${real} MP`, '#7cc8ff');
        return true;
      }
      case 'revive': {
        if (t.alive) return false;
        t.hp = Math.max(1, Math.floor(t.maxHp * eff.pct));
        t._deathLogged = false;
        t.ct = 0;
        this.log(`${t.name} is revived!`, 'heal');
        if (this.hooks.showFloat) this.hooks.showFloat(t, 'Revive', '#ffe97c');
        return true;
      }
      case 'status': {
        if (!t.alive) return false;
        if (Math.random() * 100 >= eff.hit) { this.log(`${t.name} resists ${STATUSES[eff.status].name}.`, 'miss'); return false; }
        t.addStatus(eff.status);
        if (eff.status === 'haste') t.removeStatus('slow');
        if (eff.status === 'slow') t.removeStatus('haste');
        this.log(`${t.name} is affected by ${STATUSES[eff.status].name}.`, STATUSES[eff.status].bad ? 'dmg' : 'heal');
        if (this.hooks.showFloat) this.hooks.showFloat(t, STATUSES[eff.status].name, STATUSES[eff.status].color);
        return true;
      }
      case 'cure': {
        let any = false;
        for (const s of eff.statuses) if (t.hasStatus(s)) { t.removeStatus(s); any = true; }
        if (any) { this.log(`${t.name} is cured.`, 'heal'); if (this.hooks.showFloat) this.hooks.showFloat(t, 'Cured', '#7cff7c'); }
        return any;
      }
      case 'statmod': {
        if (!t.alive) return false;
        t.mods[eff.stat] = (t.mods[eff.stat] || 0) + eff.amount;
        this.log(`${t.name}'s ${eff.stat.toUpperCase()} ${eff.amount > 0 ? 'rises' : 'falls'} by ${Math.abs(eff.amount)}.`, eff.amount > 0 ? 'heal' : 'dmg');
        if (this.hooks.showFloat) this.hooks.showFloat(t, `${eff.stat.toUpperCase()} ${eff.amount > 0 ? '+' : ''}${eff.amount}`, eff.amount > 0 ? '#ffe97c' : '#c56aff');
        return true;
      }
      case 'gil': {
        const v = t.level * 20;
        this.rewards.gil += user.team === 'player' ? v : 0;
        this.log(`${user.name} steals ${v} gil from ${t.name}!`, 'heal');
        if (this.hooks.showFloat) this.hooks.showFloat(t, `-${v} gil`, '#ffe97c');
        return true;
      }
      case 'ctmod': {
        t.ct = Math.max(0, t.ct + eff.amount);
        if (this.hooks.showFloat) this.hooks.showFloat(t, `CT ${eff.amount}`, '#c2c2c2');
        return true;
      }
      case 'ctset': {
        t.ct = eff.amount;
        this.log(`${t.name}'s Charge Time is set to ${eff.amount}!`, 'heal');
        if (this.hooks.showFloat) this.hooks.showFloat(t, 'Quick!', '#ffe97c');
        return true;
      }
    }
    return false;
  }

  onUnitKO(t) {
    t.statuses = {};
    t.ct = 0;
    // Cancel anything the unit was charging.
    this.pending = this.pending.filter(p => p.unit !== t);
    t.airborne = false;
  }

  awardAction(user, targets) {
    if (user.team !== 'player') return;
    const tgt = targets[0];
    const exp = tgt ? Math.max(4, Math.min(30, 10 + (tgt.level - user.level) * 3)) : 6;
    for (const ev of user.gainExp(exp)) { this.log(ev, 'lvl'); this.rewards.events.push(ev); }
    const jpEv = user.gainJP(10);
    if (jpEv) { this.log(jpEv, 'lvl'); this.rewards.events.push(jpEv); }
    this.rewards.exp += exp;
  }

  awardKill(user, t) {
    if (user.team !== 'player') return;
    const exp = 10 + Math.max(0, (t.level - user.level) * 2);
    for (const ev of user.gainExp(exp)) { this.log(ev, 'lvl'); this.rewards.events.push(ev); }
    user.gainJP(6);
    this.rewards.exp += exp;
    this.rewards.gil += 10 + t.level * 5;
  }

  // ---- charge-time loop -------------------------------------------------------
  checkEnd() {
    const pAlive = this.units.some(u => u.team === 'player' && u.alive);
    const eAlive = this.units.some(u => u.team === 'enemy' && u.alive);
    if (!eAlive) { this.over = true; this.result = 'victory'; }
    else if (!pAlive) { this.over = true; this.result = 'defeat'; }
    return this.over;
  }

  // Simulates upcoming turns for the turn-order display.
  forecast(n = 8) {
    // The acting unit's CT resets after its turn, so forecast it from zero.
    const sim = this.units.filter(u => u.alive).map(u => ({ u, ct: u === this.active ? 0 : u.ct, spd: u.ctSpeed() }));
    const pend = this.pending.map(p => ({ p, ct: p.ct }));
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 400) {
      for (const p of pend) { p.ct += p.p.speed; if (p.ct >= 100) { out.push({ kind: 'pending', p: p.p }); p.ct = -1e9; } }
      for (const s of sim) s.ct += s.spd;
      const ready = sim.filter(s => s.ct >= 100).sort((a, b) => b.ct - a.ct || b.spd - a.spd);
      for (const r of ready) { out.push({ kind: 'unit', unit: r.u }); r.ct -= 100; }
      if (out.length >= n) break;
    }
    return out.slice(0, n);
  }

  async run() {
    if (this.hooks.refresh) this.hooks.refresh();
    while (!this.over) {
      // Advance one tick.
      this.tick++;
      // Pending charged actions resolve first.
      for (const p of this.pending) p.ct += p.speed;
      const ready = this.pending.filter(p => p.ct >= 100);
      for (const p of ready) {
        this.pending.splice(this.pending.indexOf(p), 1);
        if (!p.unit.alive || p.unit.hasStatus('stop')) { p.unit.airborne = false; continue; }
        this.log(`${p.unit.name} unleashes ${p.ability.name}!`, 'act');
        if (this.hooks.refresh) this.hooks.refresh();
        if (p.ability.airborne) { p.unit.airborne = false; if (this.hooks.onLand) await this.hooks.onLand(p.unit, p.tx, p.ty); }
        if (this.hooks.focus) this.hooks.focus(p.unit);
        await this.applyAbility(p.unit, p.ability, p.tx, p.ty);
        if (this.checkEnd()) return this.result;
      }
      // Units gain CT; tick down statuses.
      for (const u of this.units) {
        if (!u.alive) continue;
        u.ct += u.ctSpeed();
        for (const s of Object.keys(u.statuses)) { u.statuses[s]--; if (u.statuses[s] <= 0) delete u.statuses[s]; }
      }
      const turnUnits = this.units.filter(u => u.alive && u.ct >= 100 && !u.airborne && !u.hasStatus('stop'))
        .sort((a, b) => b.ct - a.ct || b.spd - a.spd);
      for (const u of turnUnits) {
        if (!u.alive || this.over) continue;
        await this.takeTurn(u);
        if (this.checkEnd()) return this.result;
      }
      if (this.hooks.refresh) this.hooks.refresh();
    }
    return this.result;
  }

  async takeTurn(unit) {
    this.active = unit;
    unit.turnFlags = { moved: false, acted: false };
    // Poison / regen at turn start.
    if (unit.hasStatus('poison')) {
      const v = Math.max(1, Math.floor(unit.maxHp / 8));
      unit.hp = Math.max(0, unit.hp - v);
      this.log(`${unit.name} takes ${v} poison damage.`, 'dmg');
      if (this.hooks.showFloat) this.hooks.showFloat(unit, `${v}`, '#a05fd6');
      if (unit.hp === 0) { this.log(`${unit.name} succumbs to poison!`, 'ko'); this.onUnitKO(unit); if (this.hooks.onDeath) await this.hooks.onDeath(unit); this.active = null; return; }
    }
    if (unit.hasStatus('regen')) {
      const v = Math.min(Math.max(1, Math.floor(unit.maxHp / 8)), unit.maxHp - unit.hp);
      unit.hp += v;
      if (v > 0) { this.log(`${unit.name} regenerates ${v} HP.`, 'heal'); if (this.hooks.showFloat) this.hooks.showFloat(unit, `+${v}`, '#7cff7c'); }
    }
    if (this.hooks.onTurnStart) await this.hooks.onTurnStart(unit);
    if (unit.team === 'player') await this.hooks.awaitPlayerTurn(unit);
    else await this.aiTurn(unit);
    // End of turn: CT reset with a bonus for skipped actions.
    unit.ct = 0;
    if (!unit.turnFlags.moved) unit.ct += 20;
    if (!unit.turnFlags.acted) unit.ct += 20;
    if (unit.airborne) unit.ct = 0;
    this.active = null;
    if (this.hooks.onTurnEnd) this.hooks.onTurnEnd(unit);
  }

  // ---- commands used by both the player UI and the AI -------------------------
  async moveUnit(unit, path) {
    if (path.length < 2) return;
    unit.turnFlags.moved = true;
    if (this.hooks.animateMove) await this.hooks.animateMove(unit, path);
    const last = path[path.length - 1], prev = path[path.length - 2];
    unit.x = last.x; unit.y = last.y;
    unit.facing = facingFromDelta(last.x - prev.x, last.y - prev.y);
    if (this.hooks.refresh) this.hooks.refresh();
  }

  async useAbility(unit, ab, tx, ty) {
    unit.turnFlags.acted = true;
    if (ab.ct > 0) {
      if (ab.mp) { /* MP is spent when the spell resolves */ }
      unit.facing = (tx === unit.x && ty === unit.y) ? unit.facing : facingFromDelta(tx - unit.x, ty - unit.y);
      this.pending.push({ unit, ability: ab, tx, ty, ct: 0, speed: ab.ct });
      if (ab.airborne) { unit.airborne = true; if (this.hooks.onJump) await this.hooks.onJump(unit); }
      this.log(`${unit.name} begins charging ${ab.name}.`, 'act');
      if (this.hooks.refresh) this.hooks.refresh();
      await sleep(250);
      return;
    }
    this.log(`${unit.name} uses ${ab.name}.`, 'act');
    await this.applyAbility(unit, ab, tx, ty);
  }

  canAfford(unit, ab) { return unit.mp >= (ab.mp || 0); }

  // ---- enemy AI ----------------------------------------------------------------
  scoreTarget(unit, ab, fromX, fromY, tx, ty) {
    // Temporarily place the unit to compute previews from the candidate tile.
    const ox = unit.x, oy = unit.y;
    unit.x = fromX; unit.y = fromY;
    let score = 0;
    const preds = this.predict(unit, ab, tx, ty);
    for (const p of preds) {
      const t = p.unit;
      const enemy = t.team !== unit.team;
      const hitF = p.hit / 100;
      if (p.dmg) {
        const dmg = Math.min(p.dmg, t.hp);
        const lethal = p.dmg >= t.hp;
        score += (enemy ? 1 : -1.2) * hitF * (dmg + (lethal ? 40 : 0) + (t.leader ? 10 : 0));
        if (ab.suicide) score -= unit.hp * 0.9;
      }
      if (p.heal) {
        const heal = Math.min(p.heal, t.maxHp - t.hp);
        score += (enemy ? -1 : 1) * heal * (t.hp < t.maxHp * 0.5 ? 1.4 : 0.6);
      }
      for (const n of p.notes) {
        if (n.startsWith('revive')) score += enemy ? -60 : 60;
        else if (/Poison|Slow|Stop/.test(n)) score += enemy && !t.hasStatus(n.split(' ')[0].toLowerCase()) ? 25 : (enemy ? 0 : -25);
        else if (/Haste|Protect|Shell|Regen/.test(n)) score += !enemy && !t.hasStatus(n.split(' ')[0].toLowerCase()) ? 20 : 0;
        else if (/PA \+|SPD \+/.test(n)) score += enemy ? -8 : 8;
        else if (/PA -|SPD -|MA -/.test(n)) score += enemy ? 12 : -12;
        else if (n.startsWith('steal')) score += enemy ? 10 : 0;
        else if (n.startsWith('drain')) score += enemy ? 5 : 0;
        else if (n.startsWith('CT =')) score += !enemy ? 30 : 0;
      }
    }
    unit.x = ox; unit.y = oy;
    return score;
  }

  async aiTurn(unit) {
    await sleep(350);
    const reach = this.grid.reachable(unit, this.units);
    const abilities = unit.allAbilities().map(id => ABILITIES[id]).filter(ab => this.canAfford(unit, ab));
    let best = { score: 0, tile: null, ab: null, tx: 0, ty: 0 };
    const candidates = [...reach.values()];
    for (const c of candidates) {
      for (const ab of abilities) {
        const targets = this.targetTilesFor(unit, ab, c.x, c.y);
        for (const t of targets) {
          const s = this.scoreTarget(unit, ab, c.x, c.y, t.x, t.y);
          if (s <= 0) continue;
          // Slight preference for staying put and for higher ground.
          const adj = (c.cost === 0 ? 2 : 0) + this.grid.height(c.x, c.y) * 0.5;
          if (s + adj > best.score) best = { score: s + adj, tile: c, ab, tx: t.x, ty: t.y };
        }
      }
    }
    const near = this.nearestEnemyOf(unit);
    const involvesEnemy = best.ab && this.affectedUnits(unit, best.ab, best.tx, best.ty).some(t => t.team !== unit.team);
    if (best.tile && (involvesEnemy || best.ab.effects.some(e => e.type === 'heal' || e.type === 'revive'))) {
      const path = this.grid.pathTo(reach, best.tile.x, best.tile.y);
      if (path.length > 1) await this.moveUnit(unit, path);
      await this.useAbility(unit, best.ab, best.tx, best.ty);
      if (near && !unit.airborne) unit.facing = facingFromDelta(near.x - unit.x, near.y - unit.y);
      return;
    }
    // Nothing offensive worth doing: close in on the nearest enemy, then buff if possible.
    if (near) {
      let bestTile = null, bd = 1e9;
      for (const c of candidates) {
        const d = Grid.dist(c.x, c.y, near.x, near.y) + (c.cost * 0.01) - this.grid.height(c.x, c.y) * 0.05;
        if (d < bd) { bd = d; bestTile = c; }
      }
      if (bestTile && (bestTile.x !== unit.x || bestTile.y !== unit.y)) {
        await this.moveUnit(unit, this.grid.pathTo(reach, bestTile.x, bestTile.y));
      }
      unit.facing = facingFromDelta(near.x - unit.x, near.y - unit.y);
    }
    if (best.ab && best.ab.self) {
      await this.useAbility(unit, best.ab, unit.x, unit.y);
    } else if (best.ab) {
      // Re-evaluate the support ability from the new position.
      let b2 = { score: 0, tx: 0, ty: 0 };
      for (const t of this.targetTilesFor(unit, best.ab)) {
        const s = this.scoreTarget(unit, best.ab, unit.x, unit.y, t.x, t.y);
        if (s > b2.score) b2 = { score: s, tx: t.x, ty: t.y };
      }
      if (b2.score > 0) await this.useAbility(unit, best.ab, b2.tx, b2.ty);
    }
    if (near && !unit.airborne) unit.facing = facingFromDelta(near.x - unit.x, near.y - unit.y);
    await sleep(200);
  }
}
