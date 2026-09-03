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

  // ---- derived stats -----------------------------------------------------
  baseStats() {
    const L = this.level, j = this.jobData;
    return {
      maxHp: Math.floor((45 + 9 * L) * j.hp),
      maxMp: Math.floor((10 + 4 * L) * j.mp),
      pa: Math.floor((5 + 0.5 * L) * j.pa),
      ma: Math.floor((5 + 0.5 * L) * j.ma),
      spd: Math.floor((6 + 0.12 * L) * j.spd),
      move: j.move, jump: j.jump, evade: j.evade,
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
  get weapon() { return this.jobData.weapon; }

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

// Build an enemy unit for a battle.
function makeEnemy(spec) {
  const job = JOBS[spec.job];
  const u = new Unit({
    name: spec.name || job.name, job: spec.job, level: spec.level, team: 'enemy', boss: spec.boss,
  });
  // Enemies know more abilities at higher levels; bosses know everything.
  const frac = spec.boss ? 1 : Math.min(1, 0.4 + spec.level * 0.08);
  u.autoLearn(frac);
  u.x = spec.x; u.y = spec.y;
  return u;
}
