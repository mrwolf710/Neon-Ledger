import { midiToFreq } from './synth.js';

// Step sequencer: slow synthwave / lo-fi built from oscillators and filtered noise. One mood plays at a time;
// setMood cross-fades. All numbers are in TUNING (midi note numbers, volumes 0..1, cutoffs in Hz).
export const TUNING = {
  fade: 2.5,                 // default cross-fade seconds
  lookahead: 0.15, tickMs: 25,
  street: {
    bpm: 66,
    // A minor, dark: Am9  Dm9  Bm7b5  E7b9 (the tense turnaround back to Am), two bars each.
    chords: [[57, 60, 64, 67, 71], [50, 57, 60, 64, 65], [47, 57, 62, 65, 69], [52, 56, 59, 62, 65]],
    roots: [45, 38, 47, 40], bassSteps: [0, 10, 16, 26], arpPattern: [0, 2, 1, 3, 2, 4, 3, 1],
    pad: { vol: 0.045, cutoff: 780, detune: 9, attack: 1.8, release: 2.6 },
    arp: { vol: 0.042, cutoff: 1500, dur: 0.24 }, bass: { vol: 0.19 },
    kick: { vol: 0.2 }, snare: { vol: 0.05 }, hat: { vol: 0.024 },
  },
  scene: {
    bpm: 60, chord: [50, 57, 60, 65], pad: { vol: 0.05, cutoff: 700, detune: 6, attack: 2.5, release: 3 },
    drone: { freq: 55, vol: 0.1 }, pluck: { vol: 0.06, chance: 0.12, scale: [62, 65, 67, 69, 72, 74] },
  },
  echo: {
    bpm: 60, chord: [50, 57, 62, 65], pad: { vol: 0.055, detune: 28, swell: 3.6, cutoff: 1400 },
    heart: { freq: 58, vol: 0.32 },
  },
  board: {
    bpm: 96, tick: { vol: 0.04 }, pulse: { freq: 55, vol: 0.13 },
    ladder: [57, 60, 64, 67, 69, 72, 76], noteVol: 0.06, dingVol: 0.12,
  },
};

export function createMusic(synth) {
  const T = TUNING;
  let cur = null, old = [], curName = '', nextTime = 0, timer = null, links = 0;
  const stepDur = (bpm) => 60 / bpm / 4; // a 16th note

  const pad = (out, notes, t, dur, c) => {
    for (const n of notes) for (const d of [-c.detune, c.detune]) {
      synth.tone({ freq: midiToFreq(n), type: 'sawtooth', t, dur, vol: c.vol, attack: c.attack, release: c.release, detune: d,
        filter: { type: 'lowpass', freq: c.cutoff, q: 0.5 }, to: out });
    }
  };
  const kick = (out, t, vol, f = 120) => synth.tone({ freq: f, type: 'sine', t, dur: 0.16, vol, slide: 42, attack: 0.002, release: 0.05, to: out });

  // Each mood: bpm + step(m, i, t) where m = { out (its gain node) }. i counts 16th notes since the mood began.
  const MOODS = {
    street: {
      bpm: T.street.bpm,
      step(m, i, t) {
        const S = T.street, sd = stepDur(S.bpm), ci = Math.floor(i / 32) % S.chords.length, chord = S.chords[ci];
        if (i % 32 === 0) pad(m.out, chord, t, sd * 32, S.pad);
        if (S.bassSteps.includes(i % 32)) {
          const f = midiToFreq(S.roots[ci]);
          synth.tone({ freq: f, type: 'sine', t, dur: sd * 3, vol: S.bass.vol, release: 0.25, to: m.out });
          synth.tone({ freq: f * 2, type: 'triangle', t, dur: sd * 2, vol: S.bass.vol * 0.25, release: 0.15, to: m.out });
        }
        if (i % 2 === 0) {
          const k = S.arpPattern[(i / 2) % S.arpPattern.length], n = chord[k % chord.length] + 12, accent = i % 8 === 0 ? 1.4 : 1;
          synth.tone({ freq: midiToFreq(n), type: 'triangle', t, dur: S.arp.dur, vol: S.arp.vol * accent, release: 0.18,
            filter: { type: 'lowpass', freq: S.arp.cutoff, q: 0.6 }, to: m.out });
        }
        if (i % 16 === 0) kick(m.out, t, S.kick.vol);
        if (i % 16 === 8) synth.noise({ t, dur: 0.1, vol: S.snare.vol, filter: { type: 'bandpass', freq: 1800, q: 0.9 }, to: m.out });
        if (i % 4 === 2) synth.noise({ t, dur: 0.03, vol: S.hat.vol, filter: { type: 'highpass', freq: 7000 }, to: m.out });
      },
    },
    scene: {
      bpm: T.scene.bpm,
      step(m, i, t) {
        const S = T.scene, sd = stepDur(S.bpm);
        if (i % 32 === 0) pad(m.out, S.chord, t, sd * 32, S.pad);
        if (i % 64 === 0) synth.tone({ freq: S.drone.freq, type: 'sine', t, dur: sd * 64, vol: S.drone.vol, attack: 3, release: 3, to: m.out });
        if (i % 2 === 0 && synth.rand() < S.pluck.chance) {
          const sc = S.pluck.scale, n = sc[Math.floor(synth.rand() * sc.length)];
          synth.tone({ freq: midiToFreq(n), type: 'triangle', t, dur: 0.5, vol: S.pluck.vol, release: 0.6, filter: { type: 'lowpass', freq: 1800 }, to: m.out });
        }
      },
    },
    echo: {
      bpm: T.echo.bpm,
      step(m, i, t) {
        const S = T.echo, sd = stepDur(S.bpm);
        if (i % 32 === 0) { // reversed envelope: long swell in, then an abrupt cut
          for (const n of S.chord) for (const d of [-S.pad.detune, S.pad.detune]) {
            synth.tone({ freq: midiToFreq(n), type: 'sawtooth', t, dur: S.pad.swell, vol: S.pad.vol, attack: S.pad.swell, release: 0.05, detune: d,
              filter: { type: 'lowpass', freq: S.pad.cutoff, q: 2 }, to: m.out });
          }
        }
        if (i % 4 === 0) { // heartbeat: lub-dub
          kick(m.out, t, S.heart.vol, S.heart.freq * 2);
          kick(m.out, t + 0.24, S.heart.vol * 0.65, S.heart.freq * 1.7);
        }
        if (i % 32 === 16) synth.tone({ freq: midiToFreq(S.chord[0] + 24), type: 'sine', t, dur: sd * 6, vol: 0.03, release: 1.2, to: m.out });
      },
    },
    board: {
      bpm: T.board.bpm,
      step(m, i, t) {
        const S = T.board;
        if (i % 2 === 0) synth.noise({ t, dur: 0.015, vol: S.tick.vol * (i % 8 === 0 ? 1.6 : 1), filter: { type: 'highpass', freq: 6500 }, to: m.out });
        if (i % 8 === 0) synth.tone({ freq: S.pulse.freq, type: 'sine', t, dur: 0.18, vol: S.pulse.vol, release: 0.1, to: m.out });
        if (links > 0 && i % 4 === 0) { // one note in the loop per correct link
          const k = (i / 4) % links;
          synth.tone({ freq: midiToFreq(S.ladder[Math.min(k, S.ladder.length - 1)]), type: 'triangle', t, dur: 0.2, vol: S.noteVol, release: 0.12,
            filter: { type: 'lowpass', freq: 2200 }, to: m.out });
        }
      },
    },
  };

  function tick() {
    if (!synth.ready) return;
    const now = synth.now;
    if (nextTime < now) nextTime = now + 0.05;      // tab was in the background: skip what we missed
    while (nextTime < now + T.lookahead) {
      for (const m of [cur, ...old]) if (m) m.def.step(m, m.i++, nextTime);
      nextTime += stepDur(cur ? cur.def.bpm : 72);
    }
    old = old.filter((m) => { if (now < m.killAt) return true; m.out.disconnect(); return false; });
  }

  return {
    get mood() { return curName; },
    // fade: cross-fade seconds. 'silent' fades everything out (for the cliffhanger).
    setMood(name, fade = T.fade) {
      if (!synth.ready || name === curName) return;
      curName = name;
      const t = synth.now;
      if (cur) { cur.out.gain.setTargetAtTime(0, t, fade / 3); cur.killAt = t + fade * 1.6; old.push(cur); cur = null; }
      if (name === 'silent' || !MOODS[name]) return;
      const out = synth.ctx.createGain(); out.gain.value = 0; out.connect(synth.buses.music);
      out.gain.setTargetAtTime(1, t, fade / 3);
      cur = { def: MOODS[name], out, i: 0, name };
      timer ??= setInterval(tick, T.tickMs);
    },
    // Correct board link: add a note to the loop and ring a chime.
    addLink() {
      const S = T.board;
      links++;
      synth.tone({ freq: midiToFreq(S.ladder[Math.min(links - 1, S.ladder.length - 1)] + 12), type: 'sine', dur: 0.7, vol: S.dingVol, release: 0.6, bus: 'music' });
    },
    resetLinks() { links = 0; },
  };
}
