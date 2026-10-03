/* ==========================================================================
   Sound. Everything is synthesised at runtime with WebAudio, so the game
   still ships as plain files with nothing to download.
   ========================================================================== */

const AUDIO_KEY = 'elderon-audio';
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

/* ==========================================================================
   Music.

   Every piece is a few voices over a drum line, written in eighth notes.
   A voice is a wave, a gain and a line: a MIDI note starts a tone, '.' is
   a rest, and '-' holds the note before it, so a melody can breathe and a
   chord can lie under it for a bar. The drum line is a string, one glyph a
   step: k kick, s snare, h hat, H open hat, t tom, . nothing. Voices may be
   shorter than the piece and loop inside it: a four-bar bass under an
   eight-bar tune. `once` plays a piece through and stops: a fanfare, a dirge.

   The pieces sit together in A minor and its neighbours, so a battle theme
   gives way to the camp without a lurch.
   ========================================================================== */
const seq = (s) => s.replace(/\|/g, ' ').trim().split(/\s+/).map(t => (t === '.' ? null : t === '-' ? '-' : +t));

const TRACKS = {
  // The title: a hymn for the crown, slow and sure, the melody carried by a
  // second voice a third below and a held chord under both.
  title: {
    bpm: 76, gain: 1,
    voices: [
      { wave: 'triangle', gain: 0.14, vib: true, notes: seq(
        '69 - 72 - 76 - 74 72 | 71 - 69 - 65 - - - | 72 - 76 - 79 - 77 76 | 74 - 71 - 67 - - - |' +
        '69 - 72 - 76 - 81 - | 77 - 81 - 77 - 76 74 | 76 - 74 - 71 - 68 - | 69 - - - - - - -') },
      { wave: 'sine', gain: 0.09, notes: seq(
        '64 - 69 - 72 - 71 69 | 67 - 65 - 60 - - - | 67 - 72 - 76 - 74 72 | 71 - 67 - 62 - - - |' +
        '64 - 69 - 72 - 76 - | 72 - 77 - 72 - 72 71 | 71 - 71 - 68 - 64 - | 64 - - - - - - -') },
      { wave: 'sine', gain: 0.05, notes: seq('57 - - - - - - - | 53 - - - - - - - | 60 - - - - - - - | 55 - - - - - - - | 57 - - - - - - - | 53 - - - - - - - | 52 - - - - - - - | 57 - - - - - - -') },
      { wave: 'sine', gain: 0.045, notes: seq('64 - - - - - - - | 60 - - - - - - - | 67 - - - - - - - | 62 - - - - - - - | 64 - - - - - - - | 60 - - - - - - - | 59 - - - - - - - | 64 - - - - - - -') },
      { wave: 'triangle', gain: 0.13, notes: seq('45 - - - 52 - - - | 41 - - - 48 - - - | 48 - - - 55 - - - | 43 - - - 50 - - - | 45 - - - 52 - - - | 41 - - - 48 - - - | 40 - - - 47 - - - | 45 - - - - - - -') },
    ],
  },
  // The camp: the old road song with a second voice and a brush on the drum.
  camp: {
    bpm: 92, gain: 1, drums: 'k...h...',
    voices: [
      { wave: 'triangle', gain: 0.15, notes: seq(
        '69 . 72 . 76 . 74 72 | 71 . 69 . 67 . . . | 69 . 71 . 72 . 74 . | 76 . 74 72 69 . . . |' +
        '76 - 74 72 71 - 72 74 | 76 - - - 74 - 72 - | 71 - 72 74 76 - 74 72 | 69 - - - - - - -') },
      { wave: 'sine', gain: 0.07, notes: seq(
        '64 . 69 . 72 . 71 67 | 67 . 65 . 64 . . . | 64 . 67 . 69 . 71 . | 72 . 71 67 64 . . . |' +
        '72 - 71 67 67 - 69 71 | 72 - - - 71 - 69 - | 67 - 69 71 72 - 71 67 | 64 - - - - - - -') },
      { wave: 'triangle', gain: 0.15, notes: seq('45 . 52 . 45 . 52 . | 41 . 48 . 41 . 48 . | 43 . 50 . 43 . 50 . | 40 . 47 . 40 . 47 .') },
    ],
  },
  battle: {
    bpm: 138, gain: 1, drums: 'k.h.s.h.k.h.s.hh',
    voices: [
      { wave: 'square', gain: 0.12, notes: seq('69 69 76 69 72 69 74 69 | 71 71 78 71 74 71 76 71 | 69 69 76 69 72 76 79 76 | 77 . 76 . 74 . 72 71') },
      { wave: 'triangle', gain: 0.08, notes: seq('64 . 72 . 69 . 71 . | 67 . 74 . 71 . 72 . | 64 . 72 . 69 72 76 72 | 74 . 72 . 71 . 69 67') },
      { wave: 'triangle', gain: 0.14, notes: seq('33 33 40 33 33 33 40 33 | 35 35 42 35 35 35 42 35 | 33 33 40 33 36 36 43 36 | 38 38 45 38 40 40 40 40') },
    ],
  },
  // Slow and low, for the marsh, the mist and the rain: a battle you would
  // rather not be having. A tom on the bar, like something walking.
  dread: {
    bpm: 92, gain: 1, drums: 't.......',
    voices: [
      { wave: 'triangle', gain: 0.15, vib: true, notes: seq('57 . . 60 . . 59 . | 57 . . . 55 . . . | 57 . . 60 . . 62 . | 60 . 59 . 57 . . .') },
      { wave: 'sine', gain: 0.05, notes: seq('45 - - - - - - - | 41 - - - - - - - | 45 - - - - - - - | 46 - - - 43 - - -') },
      { wave: 'triangle', gain: 0.16, notes: seq('45 . . . 45 . . . | 41 . . . 43 . . . | 45 . . . 45 . . . | 46 . . . 43 . . .') },
    ],
  },
  // Fast and bright-edged, for the cathedral: the last of it.
  finale: {
    bpm: 152, gain: 1, drums: 'k.h.s.h.k.h.s.h.',
    voices: [
      { wave: 'sawtooth', gain: 0.09, notes: seq('74 74 81 74 77 74 79 74 | 76 76 83 76 79 76 81 76 | 74 74 81 74 77 81 84 81 | 82 . 81 . 79 . 77 76') },
      { wave: 'triangle', gain: 0.11, notes: seq('38 38 45 38 38 38 45 38 | 40 40 47 40 40 40 47 40 | 38 38 45 38 41 41 48 41 | 43 43 50 43 45 45 45 45') },
    ],
  },
  // Slow, high and thin, for the ice: the same key, with the warmth gone out of it.
  frost: {
    bpm: 84, gain: 1,
    voices: [
      { wave: 'triangle', gain: 0.13, vib: true, notes: seq('76 . . 81 . . 79 . | 76 . . . 74 . . . | 72 . . 76 . . 74 . | 72 . 71 . 69 . . .') },
      { wave: 'sine', gain: 0.04, notes: seq('57 - - - - - - - | 53 - - - - - - - | 52 - - - - - - - | 55 - - - - - - -') },
      { wave: 'triangle', gain: 0.15, notes: seq('45 . . . 52 . . . | 41 . . . 48 . . . | 40 . . . 47 . . . | 43 . . . 45 . . .') },
    ],
  },
  // Rolling, for the coast: a swell that never quite settles.
  tide: {
    bpm: 104, gain: 1, drums: 'k..k..h.',
    voices: [
      { wave: 'triangle', gain: 0.13, notes: seq('57 60 64 . 60 64 67 . | 55 59 62 . 59 62 67 . | 57 60 64 . 64 67 72 . | 65 64 62 . 60 . 59 .') },
      { wave: 'triangle', gain: 0.15, notes: seq('45 . . 45 . . 45 . | 43 . . 43 . . 43 . | 45 . . 45 . . 45 . | 41 . . 41 . 43 . .') },
    ],
  },
  // Slow and far down, for the sea floor: pressure more than melody.
  deep: {
    bpm: 72, gain: 1,
    voices: [
      { wave: 'sine', gain: 0.15, vib: true, notes: seq('52 . . . 55 . . . | 53 . . . 50 . . . | 52 . . . 57 . . . | 55 . 53 . 52 . . .') },
      { wave: 'sine', gain: 0.17, notes: seq('40 - - - - - - - | 37 - - - - - - - | 40 - - - - - - - | 38 - - - 36 - - -') },
    ],
  },
  // A march for the capital: square and certain, with the bass on the beat.
  crown: {
    bpm: 112, gain: 1, drums: 'k.s.k.s.',
    voices: [
      { wave: 'square', gain: 0.10, notes: seq('67 . 67 69 71 . 74 . | 71 . 69 67 69 . . . | 67 . 67 69 71 . 74 . | 76 . 74 71 74 . . .') },
      { wave: 'triangle', gain: 0.07, notes: seq('62 . 62 65 67 . 67 . | 67 . 65 62 65 . . . | 62 . 62 65 67 . 67 . | 71 . 67 67 67 . . .') },
      { wave: 'triangle', gain: 0.12, notes: seq('43 . 43 . 43 . 43 . | 38 . 38 . 43 . 43 . | 43 . 43 . 43 . 43 . | 40 . 40 . 43 . 43 .') },
    ],
  },
  // The story: a slow line over a held low chord.
  ruin: {
    bpm: 76, gain: 1,
    voices: [
      { wave: 'sine', gain: 0.14, vib: true, notes: seq('64 . . 67 . . 69 . | 68 . . 64 . . . . | 62 . . 65 . . 67 . | 64 . . . . . . .') },
      { wave: 'sine', gain: 0.05, notes: seq('52 - - - - - - - | 50 - - - - - - - | 48 - - - - - - - | 52 - - - - - - -') },
      { wave: 'triangle', gain: 0.15, notes: seq('40 . . . 47 . . . | 38 . . . 45 . . . | 36 . . . 43 . . . | 40 . . . 47 . . .') },
    ],
  },
  // A fanfare for a field won: once through, and quiet.
  victory: {
    bpm: 140, gain: 1, once: true, drums: 'k.s.k.s.k...s.s.k.......',
    voices: [
      { wave: 'square', gain: 0.15, notes: seq('72 72 72 - 76 - 74 76 | 79 - - - 77 76 74 72 | 76 - - - - - - -') },
      { wave: 'triangle', gain: 0.10, notes: seq('67 67 67 - 72 - 71 72 | 76 - - - 74 72 71 67 | 72 - - - - - - -') },
      { wave: 'triangle', gain: 0.14, notes: seq('48 . 48 . 55 . 55 . | 48 . . . 53 . 55 . | 48 - - - - - - -') },
    ],
  },
  // And a dirge for one lost.
  defeat: {
    bpm: 66, gain: 1, once: true,
    voices: [
      { wave: 'triangle', gain: 0.15, vib: true, notes: seq('69 - - 67 - - 65 - | - - 64 - - - - - | 62 - - - - - - -') },
      { wave: 'sine', gain: 0.08, notes: seq('65 - - 64 - - 62 - | - - 60 - - - - - | 59 - - - - - - -') },
      { wave: 'triangle', gain: 0.13, notes: seq('45 - - - - - - - | 41 - - - 40 - - - | 38 - - - - - - -') },
    ],
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
  // A swing is a noise burst through a filter that sweeps as the blade
  // travels, and the burst decays twice over -- in the buffer and in the gain
  // -- so the levels here are high for what they are: at the old ones a
  // swing measured a tenth of its own impact and was lost under it.
  'swing-light': [{ n: 1, freq: 6000, sweep: 3500, dur: 0.07, vol: 0.55, q: 2.0 }],
  'swing-blade': [
    { n: 1, freq: 3000, sweep: 700, dur: 0.13, vol: 0.60, q: 2.2 },
    { t: 1, freq: 1600, to: 600, dur: 0.09, vol: 0.10, type: 'sine' },
  ],
  // A ninja blade is two cuts, not one.
  'swing-fast': [
    { n: 1, freq: 6500, sweep: 3000, dur: 0.05, vol: 0.38, q: 1.6 },
    { n: 1, freq: 6500, sweep: 3000, dur: 0.05, vol: 0.34, q: 1.6, d: 0.07 },
  ],
  'swing-heavy': [
    { n: 1, freq: 900, sweep: 160, dur: 0.24, vol: 0.55, q: 0.7 },
    { t: 1, freq: 260, to: 110, dur: 0.20, vol: 0.14, type: 'triangle' },
  ],
  // A thrust rises where every other swing falls.
  'swing-pierce': [{ n: 1, freq: 1200, sweep: 5200, dur: 0.10, vol: 0.55, q: 3 }],
  'swing-blunt': [{ n: 1, freq: 700, sweep: 220, dur: 0.16, vol: 0.62, q: 2.0 }],
  'swing-rod': [
    { n: 1, freq: 1800, sweep: 500, dur: 0.11, vol: 0.58, q: 2.4 },
    { t: 1, freq: 900, to: 500, dur: 0.06, vol: 0.07, type: 'sine' },
  ],
  'swing-fist': [{ n: 1, freq: 500, sweep: 140, dur: 0.07, vol: 0.55, q: 1.2 }],
  // A katana is drawn and cut in one motion: a long bright whoosh with the
  // ring of the steel left hanging after it.
  'swing-katana': [
    { n: 1, freq: 5200, sweep: 2200, dur: 0.16, vol: 0.50, q: 2.6 },
    { t: 1, freq: 2600, to: 2300, dur: 0.18, vol: 0.07, type: 'sine', d: 0.04 },
  ],
  // A greatsword takes both hands and all of a second: the lowest, longest
  // whoosh on the field, with the weight of it in a low tone underneath.
  'swing-great': [
    { n: 1, freq: 700, sweep: 120, dur: 0.30, vol: 0.62, q: 1.6 },
    { t: 1, freq: 180, to: 70, dur: 0.26, vol: 0.16, type: 'triangle' },
  ],
  // A word read aloud: a breath of noise falling, and a low hum under it.
  'incant': [
    { n: 1, freq: 1400, sweep: 320, dur: 0.22, vol: 0.34, q: 3 },
    { t: 1, freq: 160, to: 220, dur: 0.24, vol: 0.10, type: 'sine' },
  ],
  // A harp is not swung; three strings are plucked in a rising run.
  'strum': [
    { t: 1, freq: 660, to: 655, dur: 0.14, vol: 0.12, type: 'triangle' },
    { t: 1, freq: 880, to: 875, dur: 0.14, vol: 0.11, type: 'triangle', d: 0.05 },
    { t: 1, freq: 1100, to: 1090, dur: 0.16, vol: 0.10, type: 'triangle', d: 0.10 },
  ],

  // ---- what a landed blow sounds like ------------------------------------
  'impact-slash': [
    { n: 1, freq: 2600, sweep: 400, dur: 0.13, vol: 0.30, q: 0.7 },
    { t: 1, freq: 200, to: 80, dur: 0.11, vol: 0.18, type: 'square' },
    // The edge rings after it bites, and the body under it thuds.
    { t: 1, freq: 3400, to: 3300, dur: 0.16, vol: 0.05, type: 'sine', d: 0.02 },
    { t: 1, freq: 90, to: 40, dur: 0.14, vol: 0.16, type: 'sine' },
  ],
  'impact-pierce': [
    { n: 1, freq: 3600, sweep: 900, dur: 0.09, vol: 0.26, q: 2 },
    { t: 1, freq: 300, to: 120, dur: 0.08, vol: 0.14, type: 'square' },
    { t: 1, freq: 110, to: 50, dur: 0.10, vol: 0.12, type: 'sine' },
  ],
  'impact-blunt': [
    { n: 1, freq: 420, sweep: 110, dur: 0.18, vol: 0.30, q: 0.6 },
    { t: 1, freq: 130, to: 45, dur: 0.16, vol: 0.24, type: 'square' },
    // Weight: a sub-thump you feel more than hear, and a dull knock on top.
    { t: 1, freq: 60, to: 30, dur: 0.22, vol: 0.22, type: 'sine' },
    { n: 1, freq: 180, sweep: 90, dur: 0.06, vol: 0.20, q: 1.5, filter: 'lowpass' },
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

  // A note that lands rings like a struck bell.
  'impact-chime': [
    { t: 1, freq: 1760, to: 1700, dur: 0.24, vol: 0.14, type: 'sine' },
    { t: 1, freq: 2640, to: 2600, dur: 0.16, vol: 0.06, type: 'sine' },
    { n: 1, freq: 3000, sweep: 1500, dur: 0.03, vol: 0.20, q: 2 },
  ],

  // ---- things leaving the hand -------------------------------------------
  'bow-release': [
    { t: 1, freq: 165, to: 98, dur: 0.26, vol: 0.20, type: 'triangle' },
    { t: 1, freq: 330, to: 196, dur: 0.16, vol: 0.08, type: 'sine' },
    { n: 1, freq: 2200, sweep: 900, dur: 0.04, vol: 0.09, q: 3 },
  ],
  // A gun: a sharp crack, a low thump behind it, and the powder's hiss.
  'gunshot': [
    { n: 1, freq: 3200, sweep: 1800, dur: 0.05, vol: 0.55, q: 0.5 },
    { t: 1, freq: 110, to: 40, dur: 0.18, vol: 0.30, type: 'square' },
    { n: 1, freq: 900, sweep: 300, dur: 0.22, vol: 0.18, q: 0.8, d: 0.03 },
    // The report: a sub-bass punch, and the smoke rolling off after it.
    { t: 1, freq: 55, to: 25, dur: 0.24, vol: 0.28, type: 'sine' },
    { n: 1, freq: 400, sweep: 120, dur: 0.45, vol: 0.10, q: 0.5, d: 0.06, filter: 'lowpass' },
  ],
  // Something thrown whistles as it goes.
  'throw': [
    { t: 1, freq: 1500, to: 650, dur: 0.16, vol: 0.09, type: 'sine' },
    { n: 1, freq: 1400, sweep: 500, dur: 0.12, vol: 0.22, q: 1 },
  ],
  'cast': [
    { t: 1, freq: 240, to: 900, dur: 0.22, vol: 0.12, type: 'sine' },
    { n: 1, freq: 400, sweep: 1800, dur: 0.20, vol: 0.06, q: 2 },
    // A shimmer over the rise: two high partials a little apart, beating.
    { t: 1, freq: 1810, to: 2400, dur: 0.26, vol: 0.035, type: 'sine', d: 0.05 },
    { t: 1, freq: 1830, to: 2440, dur: 0.26, vol: 0.035, type: 'sine', d: 0.05 },
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
  // Water gathers, breaks, and runs off.
  'el-water': [
    { n: 1, freq: 200, sweep: 1400, dur: 0.22, vol: 0.20, q: 0.8, filter: 'lowpass' },
    { n: 1, freq: 2400, sweep: 600, dur: 0.30, vol: 0.16, q: 1.0, d: 0.16 },
    { t: 1, freq: 180, to: 90, dur: 0.28, vol: 0.10, type: 'sine', d: 0.10 },
    { n: 1, freq: 900, sweep: 300, dur: 0.18, vol: 0.08, q: 1.5, d: 0.36 },
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
    let pref = {};
    try { pref = JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}') || {}; } catch (e) { pref = {}; }
    this.muted = !!pref.muted;
    this.musicMuted = !!pref.musicMuted;
    // Levels, 0 to 1, apart from the on/off switches: a phone player wants
    // the music down, not gone.
    const level = (v) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : 1);
    this.sfxVolume = level(pref.sfxVolume);
    this.musicVolume = level(pref.musicVolume);
    // A game in the background should be silent, on a phone above all: the
    // engine is suspended when the page is hidden and picks up where it left
    // off when it is shown again. (The tools load this file without a DOM.)
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend();
        else if (this.ctx.state !== 'running') this.ctx.resume(); // 'suspended', or 'interrupted' after a call on iOS
      });
    }
  }

  save() {
    try { localStorage.setItem(AUDIO_KEY, JSON.stringify({ muted: this.muted, musicMuted: this.musicMuted, sfxVolume: this.sfxVolume, musicVolume: this.musicVolume })); } catch (e) { /* storage blocked: the setting lasts the session */ }
  }

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
    this.musicGain.gain.value = this.musicMuted ? 0 : this.musicVolume;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.master);
    if (this.pendingTrack) this.playMusic(this.pendingTrack);
    if (this.pendingAmbient) this.startAmbient(this.pendingAmbient);
  }

  setMuted(v) {
    this.muted = v; this.save();
    if (this.master) this.master.gain.value = v ? 0 : 0.9;
  }

  setMusicMuted(v) {
    this.musicMuted = v; this.save();
    if (this.musicGain) this.musicGain.gain.value = v ? 0 : this.musicVolume;
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, +v || 0)); this.save();
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, +v || 0)); this.save();
    if (this.musicGain && !this.musicMuted) this.musicGain.gain.value = this.musicVolume;
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
    // Two filters in a row, not one. White noise carries most of its energy
    // up high, and a single biquad's skirts let enough of it through that a
    // "700 Hz" whoosh hissed like a 5 kHz one; every swing sounded alike.
    // The second stage steepens the slope so the centre frequency is what
    // you hear, and a mace swing is finally lower than a knife.
    const mk = () => {
      const f = this.ctx.createBiquadFilter();
      f.type = filter; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
      if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t + dur);
      return f;
    };
    const f1 = mk(), f2 = mk();
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f1); f1.connect(f2); f2.connect(g); g.connect(this.sfxGain);
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
      // The menus: a wooden tick with a soft tone in it, not a bare bleep.
      case 'menu': this.noise({ dur: 0.03, vol: 0.14, freq: 2400, q: 1.2 }); this.tone({ freq: 660, dur: 0.05, type: 'triangle', vol: 0.10 }); break;
      case 'select': this.noise({ dur: 0.03, vol: 0.12, freq: 3000, q: 1.2 }); this.tone({ freq: 880, to: 1320, dur: 0.09, type: 'triangle', vol: 0.14 }); break;
      case 'cancel': this.noise({ dur: 0.04, vol: 0.10, freq: 1200, q: 1 }); this.tone({ freq: 500, to: 300, dur: 0.1, type: 'triangle', vol: 0.13 }); break;
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
    this.trackLength = Math.max(...track.voices.map(v => v.notes.length), track.drums ? track.drums.length : 0);
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
    const tr = this.track;
    const spb = 60 / tr.bpm / 2; // eighth notes
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      if (tr.once && this.step >= this.trackLength) { this.stopMusic(); return; }
      const i = this.step % this.trackLength;
      for (const v of tr.voices) {
        const n = v.notes[i % v.notes.length];
        if (typeof n !== 'number') continue;
        // A note lasts until the next note or rest in its line: holds extend it.
        let d = 1;
        while (d < v.notes.length && v.notes[(i + d) % v.notes.length] === '-') d++;
        this.voice(n, this.nextTime, spb * (d - 0.1), v.wave, v.gain * tr.gain, v);
      }
      if (tr.drums) this.drum(tr.drums[i % tr.drums.length], this.nextTime, tr.gain);
      this.nextTime += spb;
      this.step++;
    }
  }

  voice(note, t, dur, type, vol, v = {}) {
    if (note === null || note === undefined) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(midi(note), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (type === 'sine' ? 0.03 : 0.015));
    // A long note settles to two thirds and fades out at the end, so a held
    // chord does not sit at full weight under the melody.
    if (dur > 0.5) g.gain.exponentialRampToValueAtTime(vol * 0.66, t + 0.4);
    g.gain.setValueAtTime(dur > 0.5 ? vol * 0.66 : vol, t + Math.max(0.02, dur - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    // A sawtooth is softened through a low-pass; a bare one is a buzz.
    if (type === 'sawtooth') { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; osc.connect(f); node = f; }
    node.connect(g); g.connect(this.musicGain);
    // A singing voice has a little vibrato on any note it holds.
    if (v.vib && dur > 0.35) {
      const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = midi(note) * 0.006;
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t + 0.15); lfo.stop(t + dur + 0.02);
    }
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  // One drum hit at a time: a kick is a falling sine, a snare a burst of
  // noise with a knock in it, a hat a tick of filtered noise, a tom a lower
  // kick. They go through the music bus, so the music fader carries them.
  drum(glyph, t, gain = 1) {
    if (!glyph || glyph === '.') return;
    const now = this.ctx.currentTime, delay = Math.max(0, t - now);
    const bus = this.musicGain;
    const thump = (f0, f1, dur, vol) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol * gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
    };
    const hiss = (dur, vol, freq, filter, q = 0.8) => {
      const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(vol * gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(bus); src.start(t); src.stop(t + dur + 0.02);
    };
    switch (glyph) {
      case 'k': thump(150, 42, 0.14, 0.32); break;
      case 't': thump(110, 70, 0.22, 0.26); break;
      case 's': hiss(0.12, 0.16, 1800, 'bandpass', 0.6); thump(190, 120, 0.08, 0.12); break;
      case 'h': hiss(0.035, 0.07, 7000, 'highpass'); break;
      case 'H': hiss(0.12, 0.06, 6000, 'highpass'); break;
    }
    void delay;
  }
}

// What a field sounds like under the music: keyed by the map's mood.
const AMBIENCE = { day: null, dusk: 'wind', mist: 'wind', marsh: 'marsh', rain: 'rain', ember: 'embers', night: 'night', snow: 'wind', aurora: 'night', tide: 'sea', storm: 'rain', abyss: 'sea', dawn: 'wind', court: null };

// Continuous weather and wildlife, built from the same noise and tones as the
// effects, sitting quietly under the theme and muted with it.
GameAudio.prototype.startAmbient = function (kind) {
  if (!kind) { this.stopAmbient(); return; }
  if (!this.ctx) { this.pendingAmbient = kind; return; }
  if (this.ambient && this.ambient.kind === kind) return;
  this.stopAmbient();
  const ctx = this.ctx;
  const out = ctx.createGain(); out.gain.value = 0.0001; out.connect(this.musicGain);
  out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.5);
  const amb = { kind, out, nodes: [], timers: [] };
  const loop = (vol, filters, lfo) => {
    const frames = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    let node = src;
    for (const f of filters) { const b = ctx.createBiquadFilter(); b.type = f.type; b.frequency.value = f.freq; b.Q.value = f.q || 0.7; node.connect(b); node = b; if (f.lfo) f.lfo(b); }
    const g = ctx.createGain(); g.gain.value = vol; node.connect(g); g.connect(out);
    src.start();
    amb.nodes.push(src, g);
    return g;
  };
  const swell = (param, base, depth, rate) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = rate;
    const g = ctx.createGain(); g.gain.value = depth;
    o.connect(g); g.connect(param); param.value = base; o.start();
    amb.nodes.push(o);
  };
  const every = (minMs, maxMs, fn) => {
    // Nothing is queued while the page is hidden or the sound is off, so a
    // minute away does not come back as sixty drops landing at once.
    const tick = () => {
      if (this.ambient !== amb) return;
      if (ctx.state === 'running' && !this.muted && !this.musicMuted) fn();
      amb.timers.push(setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
    };
    amb.timers.push(setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
  };
  const chirp = (freq, dur, vol, type = 'sine') => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  };
  const patter = (freq, dur, vol) => {
    const t = ctx.currentTime, n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 2;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(out); src.start(t);
  };
  if (kind === 'rain') {
    // A steady hush with a slow swell, and drops landing on stone and leaf.
    const g = loop(0.08, [{ type: 'highpass', freq: 400 }, { type: 'lowpass', freq: 2600 }]);
    swell(g.gain, 0.08, 0.02, 0.11);
    every(70, 220, () => patter(2400 + Math.random() * 2500, 0.03, 0.05));
  } else if (kind === 'wind') {
    // Wind over the ridge: a band of noise whose pitch wanders.
    const g = loop(0.11, [{ type: 'bandpass', freq: 380, q: 0.9, lfo: (b) => swell(b.frequency, 380, 160, 0.07) }, { type: 'lowpass', freq: 1200 }]);
    swell(g.gain, 0.11, 0.05, 0.05);
  } else if (kind === 'sea') {
    // Surf: a slow swell of low noise, each wave a little different from the last.
    const g = loop(0.13, [{ type: 'lowpass', freq: 420, lfo: (b) => swell(b.frequency, 420, 220, 0.09) }]);
    swell(g.gain, 0.13, 0.07, 0.09);
    every(4000, 9000, () => patter(1400 + Math.random() * 600, 0.6, 0.02));
  } else if (kind === 'marsh') {
    // Low water, frogs, and now and then something moving in the reeds.
    loop(0.14, [{ type: 'lowpass', freq: 240 }]);
    every(900, 3200, () => { chirp(150 + Math.random() * 40, 0.16, 0.05, 'sawtooth'); if (Math.random() < 0.5) setTimeout(() => chirp(130, 0.14, 0.04, 'sawtooth'), 180); });
    every(2500, 7000, () => patter(900, 0.25, 0.03));
  } else if (kind === 'embers') {
    // Heat in the air and the crackle of what is still burning.
    loop(0.06, [{ type: 'bandpass', freq: 2200, q: 1.5 }]);
    every(90, 420, () => patter(3200 + Math.random() * 2000, 0.02, 0.08));
    every(1500, 5000, () => patter(600, 0.4, 0.03));
  } else if (kind === 'night') {
    // Crickets in short bursts over the faintest breeze.
    loop(0.08, [{ type: 'bandpass', freq: 300, q: 0.8 }]);
    every(500, 1400, () => { for (let i = 0; i < 3; i++) setTimeout(() => chirp(4300 + Math.random() * 300, 0.035, 0.06), i * 70); });
  }
  this.ambient = amb;
};

GameAudio.prototype.stopAmbient = function () {
  this.pendingAmbient = null;
  const amb = this.ambient;
  this.ambient = null;
  if (!amb) return;
  for (const t of amb.timers) clearTimeout(t);
  const ctx = this.ctx;
  try {
    amb.out.gain.setValueAtTime(amb.out.gain.value, ctx.currentTime);
    amb.out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
  } catch (e) { /* context gone */ }
  setTimeout(() => { for (const n of amb.nodes) { try { n.stop && n.stop(); } catch (e) { /* already stopped */ } try { n.disconnect(); } catch (e) { /* fine */ } } try { amb.out.disconnect(); } catch (e) { /* fine */ } }, 700);
};

const audio = new GameAudio();
