/* ==========================================================================
   Sound. Everything is synthesised at runtime with WebAudio, so the game
   still ships as plain files with nothing to download.
   ========================================================================== */

const AUDIO_KEY = 'elderon-audio';
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Eighth-note patterns. `null` holds the previous note's silence.
// Written around A minor so the three pieces sit together.
const TRACKS = {
  town: {
    bpm: 92, wave: 'triangle', gain: 0.16,
    lead: [69, null, 72, null, 76, null, 74, 72, 71, null, 69, null, 67, null, null, null,
           69, null, 71, null, 72, null, 74, null, 76, null, 74, 72, 69, null, null, null],
    bass: [45, null, 52, null, 45, null, 52, null, 41, null, 48, null, 41, null, 48, null,
           43, null, 50, null, 43, null, 50, null, 40, null, 47, null, 40, null, 47, null],
  },
  battle: {
    bpm: 138, wave: 'square', gain: 0.13,
    lead: [69, 69, 76, 69, 72, 69, 74, 69, 71, 71, 78, 71, 74, 71, 76, 71,
           69, 69, 76, 69, 72, 76, 79, 76, 77, null, 76, null, 74, null, 72, 71],
    bass: [33, 33, 40, 33, 33, 33, 40, 33, 35, 35, 42, 35, 35, 35, 42, 35,
           33, 33, 40, 33, 36, 36, 43, 36, 38, 38, 45, 38, 40, 40, 40, 40],
  },
  ruin: {
    bpm: 76, wave: 'sine', gain: 0.15,
    lead: [64, null, null, 67, null, null, 69, null, 68, null, null, 64, null, null, null, null,
           62, null, null, 65, null, null, 67, null, 64, null, null, null, null, null, null, null],
    bass: [40, null, null, null, 47, null, null, null, 38, null, null, null, 45, null, null, null,
           36, null, null, null, 43, null, null, null, 40, null, null, null, 47, null, null, null],
  },
};

/* ==========================================================================
   Combat sounds.

   Each one is a stack of layers rather than a single beep, because that is
   what makes a blow read as a blow: a sword is air moving fast and then metal
   biting, an axe is a slow heavy swing and then a dull crack. The layers are
   data so that a weapon or an element can name a sound and be checked against
   this table, rather than a switch case growing a limb per weapon.

   `t` is a tone layer, `n` a noise layer. `d` delays a layer, which is how a
   crack becomes thunder: the strike lands, the rumble follows it.
   ========================================================================== */
const COMBAT_SFX = {
  // ---- weapon swings: air, pitched by how heavy the thing is -------------
  'swing-light': [{ n: 1, freq: 5200, sweep: 2600, dur: 0.06, vol: 0.16, q: 1.5 }],
  'swing-blade': [
    { n: 1, freq: 3200, sweep: 900, dur: 0.10, vol: 0.20, q: 1.2 },
    { t: 1, freq: 1400, to: 700, dur: 0.07, vol: 0.06, type: 'sine' },
  ],
  'swing-fast': [
    { n: 1, freq: 6000, sweep: 3000, dur: 0.06, vol: 0.17, q: 2 },
    { t: 1, freq: 2400, to: 1600, dur: 0.05, vol: 0.07, type: 'sine' },
  ],
  'swing-heavy': [
    { n: 1, freq: 1100, sweep: 220, dur: 0.17, vol: 0.24, q: 0.8 },
    { t: 1, freq: 320, to: 140, dur: 0.14, vol: 0.08, type: 'triangle' },
  ],
  'swing-pierce': [{ n: 1, freq: 4200, sweep: 1600, dur: 0.08, vol: 0.18, q: 3 }],
  'swing-blunt': [{ n: 1, freq: 800, sweep: 260, dur: 0.12, vol: 0.18, q: 0.9 }],
  'swing-rod': [{ n: 1, freq: 1300, sweep: 520, dur: 0.09, vol: 0.15, q: 1.3 }],
  'swing-fist': [{ n: 1, freq: 520, sweep: 160, dur: 0.08, vol: 0.16, q: 0.8 }],

  // ---- what a landed blow sounds like ------------------------------------
  'impact-slash': [
    { n: 1, freq: 2600, sweep: 400, dur: 0.13, vol: 0.30, q: 0.7 },
    { t: 1, freq: 200, to: 80, dur: 0.11, vol: 0.18, type: 'square' },
  ],
  'impact-pierce': [
    { n: 1, freq: 3600, sweep: 900, dur: 0.09, vol: 0.26, q: 2 },
    { t: 1, freq: 300, to: 120, dur: 0.08, vol: 0.14, type: 'square' },
  ],
  'impact-blunt': [
    { n: 1, freq: 420, sweep: 110, dur: 0.18, vol: 0.30, q: 0.6 },
    { t: 1, freq: 130, to: 45, dur: 0.16, vol: 0.24, type: 'square' },
  ],
  'impact-wood': [
    { n: 1, freq: 1100, sweep: 480, dur: 0.09, vol: 0.20, q: 1.2 },
    { t: 1, freq: 300, to: 150, dur: 0.16, vol: 0.18, type: 'triangle' },
    { t: 1, freq: 450, to: 300, dur: 0.11, vol: 0.08, type: 'sine', d: 0.01 },
  ],
  'impact-arrow': [
    { n: 1, freq: 2400, sweep: 700, dur: 0.05, vol: 0.24, q: 3 },
    { t: 1, freq: 560, to: 240, dur: 0.05, vol: 0.14, type: 'square' },
  ],

  // ---- things leaving the hand -------------------------------------------
  'bow-release': [
    { t: 1, freq: 165, to: 98, dur: 0.26, vol: 0.20, type: 'triangle' },
    { t: 1, freq: 330, to: 196, dur: 0.16, vol: 0.08, type: 'sine' },
    { n: 1, freq: 2200, sweep: 900, dur: 0.04, vol: 0.09, q: 3 },
  ],
  'throw': [{ n: 1, freq: 900, sweep: 400, dur: 0.12, vol: 0.13, q: 1 }],
  'cast': [
    { t: 1, freq: 240, to: 900, dur: 0.22, vol: 0.12, type: 'sine' },
    { n: 1, freq: 400, sweep: 1800, dur: 0.20, vol: 0.06, q: 2 },
  ],

  // ---- the elements ------------------------------------------------------
  // Fire roars and then crackles.
  'el-fire': [
    { n: 1, freq: 300, sweep: 2600, dur: 0.38, vol: 0.22, q: 0.8 },
    { t: 1, freq: 90, to: 50, dur: 0.30, vol: 0.10, type: 'sawtooth' },
    { n: 1, freq: 3400, sweep: 1800, dur: 0.05, vol: 0.10, q: 4, d: 0.14 },
    { n: 1, freq: 4200, sweep: 2200, dur: 0.05, vol: 0.09, q: 4, d: 0.23 },
  ],
  // Ice rings, then breaks.
  'el-ice': [
    { t: 1, freq: 1319, dur: 0.16, vol: 0.13, type: 'sine' },
    { t: 1, freq: 1661, dur: 0.16, vol: 0.11, type: 'sine', d: 0.05 },
    { t: 1, freq: 1976, dur: 0.18, vol: 0.10, type: 'sine', d: 0.10 },
    { n: 1, freq: 6000, sweep: 2000, dur: 0.22, vol: 0.20, q: 1.2, d: 0.14 },
  ],
  // Thunder cracks, and the rumble arrives after it.
  'el-thunder': [
    { n: 1, freq: 9000, sweep: 400, dur: 0.12, vol: 0.34, q: 0.5 },
    { t: 1, freq: 70, to: 38, dur: 0.50, vol: 0.16, type: 'sawtooth', d: 0.05 },
    { n: 1, freq: 500, sweep: 90, dur: 0.40, vol: 0.14, q: 0.6, d: 0.07, filter: 'lowpass' },
  ],
  // Earth is all low end and loose stone.
  'el-earth': [
    { n: 1, freq: 260, sweep: 50, dur: 0.42, vol: 0.26, q: 0.7, filter: 'lowpass' },
    { t: 1, freq: 60, to: 34, dur: 0.38, vol: 0.18, type: 'sine' },
    { n: 1, freq: 1400, sweep: 700, dur: 0.05, vol: 0.10, q: 3, d: 0.16 },
    { n: 1, freq: 1000, sweep: 500, dur: 0.05, vol: 0.09, q: 3, d: 0.26 },
  ],
  // Holy is a chord that arrives rather than a noise.
  'el-holy': [
    { t: 1, freq: 1047, dur: 0.50, vol: 0.10, type: 'sine' },
    { t: 1, freq: 1319, dur: 0.50, vol: 0.09, type: 'sine', d: 0.06 },
    { t: 1, freq: 1568, dur: 0.50, vol: 0.08, type: 'sine', d: 0.12 },
    { t: 1, freq: 2093, dur: 0.44, vol: 0.07, type: 'sine', d: 0.18 },
    { n: 1, freq: 7000, sweep: 5000, dur: 0.40, vol: 0.05, q: 1.5 },
  ],
  // Dark is two drones a little out of tune with each other.
  'el-dark': [
    { t: 1, freq: 220, to: 60, dur: 0.45, vol: 0.16, type: 'sawtooth' },
    { t: 1, freq: 233, to: 63, dur: 0.45, vol: 0.12, type: 'sawtooth' },
    { n: 1, freq: 1200, sweep: 200, dur: 0.35, vol: 0.10, q: 1.2 },
  ],
  // A spell with no element of its own.
  'el-arcane': [
    { t: 1, freq: 300, to: 1500, dur: 0.35, vol: 0.18, type: 'sine' },
    { n: 1, freq: 500, sweep: 3000, dur: 0.35, vol: 0.11, q: 2 },
  ],

  // ---- everything else a blow can do -------------------------------------
  'buff': [
    { t: 1, freq: 523, dur: 0.14, vol: 0.14, type: 'triangle' },
    { t: 1, freq: 784, dur: 0.16, vol: 0.13, type: 'triangle', d: 0.07 },
  ],
  'debuff': [
    { t: 1, freq: 415, dur: 0.16, vol: 0.14, type: 'triangle' },
    { t: 1, freq: 277, dur: 0.20, vol: 0.13, type: 'triangle', d: 0.08 },
  ],
  'poison': [
    { n: 1, freq: 320, sweep: 120, dur: 0.30, vol: 0.13, q: 2, filter: 'lowpass' },
    { t: 1, freq: 130, to: 90, dur: 0.28, vol: 0.11, type: 'sine' },
    { t: 1, freq: 165, to: 110, dur: 0.22, vol: 0.07, type: 'sine', d: 0.10 },
  ],
  'absorb': [
    { t: 1, freq: 200, to: 800, dur: 0.30, vol: 0.16, type: 'sine' },
    { n: 1, freq: 600, sweep: 2400, dur: 0.28, vol: 0.07, q: 2 },
  ],
  'revive': [
    { t: 1, freq: 523, dur: 0.20, vol: 0.14, type: 'triangle' },
    { t: 1, freq: 659, dur: 0.20, vol: 0.13, type: 'triangle', d: 0.08 },
    { t: 1, freq: 784, dur: 0.20, vol: 0.13, type: 'triangle', d: 0.16 },
    { t: 1, freq: 1047, dur: 0.36, vol: 0.14, type: 'triangle', d: 0.24 },
  ],
};

class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.track = null;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.lastSfx = {};
    const saved = localStorage.getItem(AUDIO_KEY);
    const pref = saved ? JSON.parse(saved) : {};
    this.muted = !!pref.muted;
    this.musicMuted = !!pref.musicMuted;
  }

  save() { localStorage.setItem(AUDIO_KEY, JSON.stringify({ muted: this.muted, musicMuted: this.musicMuted })); }

  // Browsers only allow audio after a gesture, so this is called on first input.
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicMuted ? 0 : 1;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1;
    this.sfxGain.connect(this.master);
    if (this.pendingTrack) this.playMusic(this.pendingTrack);
  }

  setMuted(v) {
    this.muted = v; this.save();
    if (this.master) this.master.gain.value = v ? 0 : 0.9;
  }

  setMusicMuted(v) {
    this.musicMuted = v; this.save();
    if (this.musicGain) this.musicGain.gain.value = v ? 0 : 1;
  }

  // ---- one-shot voices ---------------------------------------------------
  tone({ freq, to, dur = 0.12, type = 'square', vol = 0.25, delay = 0, attack = 0.005 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  noise({ dur = 0.15, vol = 0.3, delay = 0, freq = 1200, q = 1, sweep = 0, filter = 'bandpass' }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = filter; filt.frequency.setValueAtTime(freq, t); filt.Q.value = q;
    if (sweep) filt.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  // ---- named effects -----------------------------------------------------
  sfx(name) {
    if (!this.ctx || this.muted) return;
    // Collapse bursts of the same sound (area attacks hitting five units).
    const now = performance.now();
    if (now - (this.lastSfx[name] || 0) < 55) return;
    this.lastSfx[name] = now;
    const layers = COMBAT_SFX[name];
    if (layers) {
      for (const l of layers) {
        if (l.n) this.noise({ dur: l.dur, vol: l.vol, delay: l.d || 0, freq: l.freq, q: l.q, sweep: l.sweep, filter: l.filter });
        else this.tone({ freq: l.freq, to: l.to, dur: l.dur, type: l.type, vol: l.vol, delay: l.d || 0 });
      }
      return;
    }
    switch (name) {
      case 'menu': this.tone({ freq: 660, dur: 0.06, type: 'square', vol: 0.12 }); break;
      case 'select': this.tone({ freq: 880, to: 1320, dur: 0.09, type: 'square', vol: 0.14 }); break;
      case 'cancel': this.tone({ freq: 500, to: 300, dur: 0.1, type: 'square', vol: 0.13 }); break;
      case 'move':
        this.noise({ dur: 0.08, vol: 0.13, freq: 900, sweep: 400 });
        break;
      case 'hit':
        this.noise({ dur: 0.16, vol: 0.32, freq: 1800, sweep: 300, q: 0.7 });
        this.tone({ freq: 180, to: 70, dur: 0.14, type: 'square', vol: 0.22 });
        break;
      case 'miss': this.noise({ dur: 0.12, vol: 0.16, freq: 2600, sweep: 1600, q: 3 }); break;
      case 'heal':
        [72, 76, 79].forEach((n, i) => this.tone({ freq: midi(n), dur: 0.18, type: 'triangle', vol: 0.17, delay: i * 0.05 }));
        break;
      case 'magic':
        this.tone({ freq: 300, to: 1500, dur: 0.35, type: 'sine', vol: 0.2 });
        this.noise({ dur: 0.35, vol: 0.12, freq: 500, sweep: 3000, q: 2 });
        break;
      case 'ko':
        this.tone({ freq: 300, to: 60, dur: 0.5, type: 'sawtooth', vol: 0.25 });
        break;
      case 'levelup':
        [72, 76, 79, 84].forEach((n, i) => this.tone({ freq: midi(n), dur: 0.22, type: 'square', vol: 0.16, delay: i * 0.08 }));
        break;
      case 'coin':
        [88, 95].forEach((n, i) => this.tone({ freq: midi(n), dur: 0.12, type: 'square', vol: 0.13, delay: i * 0.06 }));
        break;
      case 'victory':
        [72, 72, 72, 76, 74, 76, 79].forEach((n, i) =>
          this.tone({ freq: midi(n), dur: i === 6 ? 0.7 : 0.16, type: 'square', vol: 0.2, delay: i * 0.13 }));
        break;
      case 'defeat':
        [69, 67, 65, 62].forEach((n, i) =>
          this.tone({ freq: midi(n), dur: i === 3 ? 0.9 : 0.3, type: 'triangle', vol: 0.2, delay: i * 0.26 }));
        break;
    }
  }

  // ---- music -------------------------------------------------------------
  playMusic(name) {
    if (!this.ctx) { this.pendingTrack = name; return; }
    if (this.trackName === name) return;
    this.stopMusic();
    const track = TRACKS[name];
    if (!track) return;
    this.trackName = name;
    this.track = track;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    // Schedule a little ahead of the clock so timing survives a busy main thread.
    this.timer = setInterval(() => this.schedule(), 40);
  }

  stopMusic() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.track = null;
    this.trackName = null;
  }

  schedule() {
    if (!this.track || !this.ctx) return;
    const spb = 60 / this.track.bpm / 2; // eighth notes
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const i = this.step % this.track.lead.length;
      this.voice(this.track.lead[i], this.nextTime, spb * 0.9, this.track.wave, this.track.gain);
      this.voice(this.track.bass[i], this.nextTime, spb * 1.6, 'triangle', this.track.gain * 1.1);
      this.nextTime += spb;
      this.step++;
    }
  }

  voice(note, t, dur, type, vol) {
    if (note === null || note === undefined) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(midi(note), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + dur + 0.02);
  }
}

const audio = new GameAudio();
