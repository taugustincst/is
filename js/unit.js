/* ==========================================================================
   Unit model: persistent character data + battle-time state.
   ========================================================================== */

const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const DIR_LIST = ['N', 'E', 'S', 'W'];

let unitSeq = 1;

class Unit {
  constructor(opts) {
    this.id = opts.id || `u${unitSeq++}`;
    this.name = opts.name || JOBS[opts.job].name;
    this.job = opts.job;
    this.level = opts.level || 1;
    this.exp = opts.exp || 0;
    this.team = opts.team || 'player';
    this.leader = !!opts.leader;
    this.boss = !!opts.boss;
    this.jp = opts.jp || {};            // spendable JP per job
    this.jpTotal = opts.jpTotal || {};  // lifetime JP per job (job level)
    this.learned = opts.learned || {};  // abilityId -> true
    this.secondary = opts.secondary || null; // job id whose skillset is equipped as secondary
    // One equipped passive of each kind; they may come from any job ever studied.
    this.passives = Object.assign({ reaction: null, support: null, movement: null }, opts.passives || {});
    // Equipped items keyed by slot. Player recruits arrive in their job's free kit.
    this.gear = opts.gear ? Object.assign({}, opts.gear)
      : (STARTER_GEAR[this.job] ? Object.assign({}, STARTER_GEAR[this.job]) : {});
    this.gilStolen = 0;
    if (opts.autoLearn) this.autoLearn(opts.autoLearn);
    this.resetBattleState();
  }

  static fromSave(data) {
    const u = new Unit(data);
    return u;
  }

  toSave() {
    return {
      id: this.id, name: this.name, job: this.job, level: this.level, exp: this.exp, team: this.team,
      leader: this.leader, jp: this.jp, jpTotal: this.jpTotal, learned: this.learned, secondary: this.secondary,
      gear: this.gear, passives: this.passives,
    };
  }

  get jobData() { return JOBS[this.job]; }

  // Enemies/monsters know a random subset of their job abilities scaled by level.
  autoLearn(frac) {
    const abs = this.jobData.abilities;
    const n = Math.max(1, Math.round(abs.length * frac));
    for (let i = 0; i < n; i++) this.learned[abs[i]] = true;
  }

  jobLevel(job) { return jobLevelFromJP(this.jpTotal[job] || 0); }

  canUseJob(job) {
    const j = JOBS[job];
    if (!j || j.req === null) return false;
    return Object.entries(j.req).every(([rj, lvl]) => this.jobLevel(rj) >= lvl);
  }

  learnedIn(job) { return JOBS[job].abilities.filter(a => this.learned[a]); }

  // ---- passives ------------------------------------------------------------
  hasPassive(id) {
    return this.passives.reaction === id || this.passives.support === id || this.passives.movement === id;
  }

  learnedPassives(kind) {
    return Object.keys(PASSIVES).filter(id => this.learned[id] && (!kind || PASSIVES[id].kind === kind));
  }

  // Equip a passive, clearing whatever held that slot before.
  setPassive(kind, id) {
    if (id && (!PASSIVES[id] || PASSIVES[id].kind !== kind || !this.learned[id])) return false;
    this.passives[kind] = id || null;
    return true;
  }

  equipExtra() { return passiveEquipBonus(this); }
  canEquipItem(id, slot) { return canEquipInSlot(this.job, id, slot, this.equipExtra()); }

  // ---- equipment ----------------------------------------------------------
  equipped(slot) { const id = this.gear[slot]; return id ? ITEMS[id] : null; }

  // Summed stat bonuses from every equipped item.
  gearBonus() {
    const b = { hp: 0, mp: 0, pa: 0, ma: 0, spd: 0, move: 0, jump: 0, evade: 0 };
    for (const slot of Object.keys(SLOT_NAMES)) {
      const it = this.equipped(slot);
      if (!it) continue;
      for (const k of GEAR_STATS) if (it[k]) b[k] += it[k];
    }
    return b;
  }

  // Drop anything this unit's current job cannot wear. Returns the removed ids
  // so the caller can put them back into the shared stock.
  dropInvalidGear() {
    const removed = [];
    for (const slot of Object.keys(SLOT_NAMES)) {
      const id = this.gear[slot];
      if (id && !this.canEquipItem(id, slot)) { removed.push(id); delete this.gear[slot]; }
    }
    // Two Hands needs the offhand free.
    if (this.hasPassive('twoHands') && this.gear.offhand) { removed.push(this.gear.offhand); delete this.gear.offhand; }
    return removed;
  }

  // ---- derived stats -----------------------------------------------------
  // Job and level baseline plus equipment. Battle-time `mods` are added on top
  // by the individual stat getters.
  baseStats() {
    const L = this.level, j = this.jobData, g = this.gearBonus();
    return {
      maxHp: Math.max(1, Math.floor((45 + 9 * L) * j.hp) + g.hp),
      maxMp: Math.max(0, Math.floor((10 + 4 * L) * j.mp) + g.mp),
      pa: Math.max(1, Math.floor((5 + 0.5 * L) * j.pa) + g.pa),
      ma: Math.max(1, Math.floor((5 + 0.5 * L) * j.ma) + g.ma),
      spd: Math.max(1, Math.floor((6 + 0.12 * L) * j.spd) + g.spd),
      move: Math.max(1, j.move + g.move + (this.hasPassive('movePlus1') ? 1 : 0) + (this.hasPassive('movePlus2') ? 2 : 0)),
      jump: this.hasPassive('sureFooting') ? 99 : Math.max(1, j.jump + g.jump + (this.hasPassive('jumpPlus2') ? 2 : 0)),
      evade: Math.max(0, j.evade + g.evade),
    };
  }

  get maxHp() { return this.baseStats().maxHp; }
  get maxMp() { return this.baseStats().maxMp; }
  get pa() { return Math.max(1, this.baseStats().pa + (this.mods.pa || 0)); }
  get ma() { return Math.max(1, this.baseStats().ma + (this.mods.ma || 0)); }
  get spd() { return Math.max(1, this.baseStats().spd + (this.mods.spd || 0)); }
  get move() { return this.baseStats().move; }
  get jump() { return this.baseStats().jump; }
  get evade() { return this.baseStats().evade; }
  // The equipped weapon, or the job's innate one (bare hands, claws, fangs),
  // with support abilities folded into its power.
  get weapon() {
    const base = this.equipped('weapon') || this.jobData.weapon;
    let mult = 1;
    if (this.hasPassive('twoHands') && !this.gear.offhand) mult *= 1.5;
    if (this.hasPassive('martialArts') && (base.wtype === 'fist' || base === this.jobData.weapon)) mult *= 1.5;
    if (mult === 1) return base;
    return Object.assign({}, base, { power: Math.floor(base.power * mult) });
  }

  // A second weapon in the offhand, for jobs that dual wield.
  get offhandWeapon() {
    const it = this.equipped('offhand');
    return it && it.slot === 'weapon' ? it : null;
  }
  get dualWielding() { return !!this.offhandWeapon && !this.hasPassive('twoHands'); }

  // Effective CT gain per tick.
  ctSpeed() {
    if (this.hasStatus('stop')) return 0;
    let s = this.spd;
    if (this.hasStatus('haste')) s = Math.floor(s * 1.5);
    if (this.hasStatus('slow')) s = Math.max(1, Math.floor(s * 0.5));
    return s;
  }

  get alive() { return this.hp > 0; }

  resetBattleState() {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.ct = 0;
    this.x = -1; this.y = -1;
    this.facing = 'S';
    this.mods = {};
    this.statuses = {}; // id -> remaining ticks
    this.airborne = false;
    this.turnFlags = { moved: false, acted: false };
    this.anim = null;
  }

  hasStatus(id) { return this.statuses[id] > 0; }
  addStatus(id) { this.statuses[id] = STATUSES[id].dur; }
  removeStatus(id) { delete this.statuses[id]; }

  // ---- progression --------------------------------------------------------
  gainExp(amount) {
    if (this.team !== 'player') return [];
    const events = [];
    this.exp += amount;
    while (this.exp >= 100 && this.level < 50) {
      this.exp -= 100;
      this.level++;
      events.push(`${this.name} reached level ${this.level}!`);
      // Level-ups raise max HP; keep current HP proportional so it feels like growth.
      this.hp = Math.min(this.maxHp, this.hp + 9);
    }
    return events;
  }

  gainJP(amount) {
    if (this.team !== 'player' || this.jobData.kind === 'monster') return null;
    const before = this.jobLevel(this.job);
    this.jp[this.job] = (this.jp[this.job] || 0) + amount;
    this.jpTotal[this.job] = (this.jpTotal[this.job] || 0) + amount;
    const after = this.jobLevel(this.job);
    return after > before ? `${this.name}'s ${this.jobData.name} job reached level ${after}!` : null;
  }

  // Abilities available in battle: Attack + primary skillset + secondary skillset.
  actionMenu() {
    const menu = [{ label: 'Attack', abilities: ['attack'] }];
    const prim = this.learnedIn(this.job);
    if (prim.length) menu.push({ label: this.jobData.skillset, abilities: prim });
    if (this.secondary && this.secondary !== this.job) {
      const sec = this.learnedIn(this.secondary);
      if (sec.length) menu.push({ label: JOBS[this.secondary].skillset, abilities: sec });
    }
    return menu;
  }

  allAbilities() {
    return this.actionMenu().flatMap(m => m.abilities);
  }
}

// Build an enemy unit for a battle. Human foes are kitted out for their level so
// they keep pace with an equipped party; monsters fight with what nature gave them.
function makeEnemy(spec) {
  const job = JOBS[spec.job];
  const u = new Unit({
    name: spec.name || job.name, job: spec.job, level: spec.level, team: 'enemy', boss: spec.boss,
    gear: spec.gear || enemyGearFor(spec.job, spec.level + (spec.boss ? 3 : 0)),
  });
  // Enemies know more abilities at higher levels; bosses know everything.
  const frac = spec.boss ? 1 : Math.min(1, 0.4 + spec.level * 0.08);
  u.autoLearn(frac);
  // From the middle of the campaign on, foes bring passives of their own. A spec
  // may name them outright; otherwise they come from the job's own teachings.
  const slots = spec.boss ? 3 : Math.min(3, Math.floor(spec.level / 3));
  const wanted = spec.passives || passivesOfJob(spec.job).slice(0, 3);
  for (const id of wanted) {
    if (!PASSIVES[id]) continue;
    const kind = PASSIVES[id].kind;
    if (u.passives[kind] || Object.values(u.passives).filter(Boolean).length >= slots) continue;
    u.learned[id] = true;
    u.passives[kind] = id;
  }
  u.x = spec.x; u.y = spec.y;
  return u;
}
