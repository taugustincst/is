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

  noise({ dur = 0.15, vol = 0.3, delay = 0, freq = 1200, q = 1, sweep = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.setValueAtTime(freq, t); filt.Q.value = q;
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
