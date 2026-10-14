import { midiToFreq } from './synth.js';

// Step sequencer: slow synthwave / lo-fi built from oscillators and filtered noise. One mood plays at a time;
// setMood cross-fades. All numbers are in TUNING (midi note numbers, volumes 0..1, cutoffs in Hz).
export const TUNING = {
  fade: 2.5,                 // default cross-fade seconds
  lookahead: 0.15, tickMs: 25,
  street: {
    bpm: 88,
    // A minor, dark: Am9  Dm9  Bm7b5  E7b9 (the tense turnaround back to Am), two bars each.
    chords: [[57, 60, 64, 67, 71], [50, 57, 60, 64, 65], [47, 57, 62, 65, 69], [52, 56, 59, 62, 65]],
    roots: [45, 38, 47, 40],
    bassPattern: [0, 0, 12, 0, 0, 7, 0, 12],  // semitones above the root, one per eighth note (rolling bass)
    arpPattern: [0, 2, 1, 3, 2, 4, 3, 2],     // chord tones, one per sixteenth
    pad: { vol: 0.032, cutoff: 700, detune: 9, attack: 1.2, release: 1.8 },
    arp: { vol: 0.03, cutoff: 1900, dur: 0.1, accent: 1.7 },
    bass: { vol: 0.17, cutoff: 520, sub: 0.2 },
    kick: { vol: 0.34, start: 150, end: 38 }, snare: { vol: 0.12, body: 0.09 }, hat: { vol: 0.05, ghost: 0.02, open: 0.045 },
  },
  station: {
    bpm: 52,
    chords: [[50, 57, 62, 65, 69], [46, 53, 57, 62, 65], [43, 50, 55, 58, 62], [45, 52, 57, 60, 64]], // Dm  Bb  Gm  Am (two bars each)
    pad: { vol: 0.05, cutoff: 620, detune: 7, attack: 3.2, release: 3.5 },
    drone: { vol: 0.13 }, bell: { vol: 0.04, chance: 0.14, octave: 24 }, tick: { vol: 0.016, every: 8 },
  },
  scene: {
    bpm: 60, chord: [50, 57, 60, 65], pad: { vol: 0.05, cutoff: 700, detune: 6, attack: 2.5, release: 3 },
    drone: { freq: 55, vol: 0.1 }, pluck: { vol: 0.06, chance: 0.12, scale: [62, 65, 67, 69, 72, 74] },
  },
  echo: {
    bpm: 60, chord: [50, 57, 62, 65], pad: { vol: 0.055, detune: 28, swell: 3.6, cutoff: 1400 },
    heart: { freq: 58, vol: 0.32 },
  },
  // The end card: fast, hard and tense. E phrygian (E, with F a semitone above), 168 bpm, kick on every beat, sixteenth bass, tritone stabs, snare fills.
  finale: {
    bpm: 168, roots: [40, 40, 41, 40],
    bassPattern: [0, 0, 12, 0, 1, 0, 12, 13],
    kick: { vol: 0.55, start: 170, end: 36 }, snare: { vol: 0.22, body: 0.14 }, hat: { vol: 0.07 },
    bass: { vol: 0.2, cutoff: 700 }, stab: { vol: 0.07, cutoff: 2600 }, riser: { vol: 0.12 },
  },
  // The Echo Exchange: slow and silly, a wobbly little marimba tune over an oom-pah bass, almost no percussion. 8 bars of chords, 7 melody bars that are mixed up
  // so the tune takes a long time to repeat. mel: eighth-note slots, numbers = steps up a pentatonic scale (-1 = rest).
  bazaar: {
    bpm: 82,
    chords: [[48, 'maj'], [45, 'min'], [53, 'maj'], [55, 'maj'], [48, 'maj'], [52, 'maj'], [45, 'min'], [55, 'maj']],
    mel: [[0, -1, 2, -1, 4, 2, -1, -1], [4, -1, 3, 2, -1, 0, -1, -1], [2, 2, -1, 4, -1, 5, 4, -1], [-1, 0, 1, 2, -1, -1, 4, -1], [5, -1, 4, -1, 2, -1, 0, -1], [0, 2, 4, 2, -1, -1, -1, -1], [7, -1, 5, 4, 2, -1, -1, -1]],
    pad: { vol: 0.018, cutoff: 800, detune: 6, attack: 1.2, release: 1.5 },
    lead: { vol: 0.07, cutoff: 3000, restChance: 0.15 }, bass: { vol: 0.15, cutoff: 500 }, stab: { vol: 0.035 },
    tick: { vol: 0.03 }, kick: { vol: 0.16, start: 120 }, boing: { vol: 0.05, chance: 0.12 },
  },
  // The implant dealer's shop: slow, low and ominous. A sub drone, a cluster (minor second + tritone) that swells and sinks, a muffled double heartbeat, rare cold bells and metal scrapes, a faint reader beep.
  dealer: {
    bpm: 50, roots: [33, 33, 32, 31],                                    // A, A, Ab, G: a slow chromatic slide down
    drone: { vol: 0.16 }, cluster: { vol: 0.03, cutoff: 650, detune: 10, swell: 4.5, offsets: [12, 13, 18, 19] },
    heart: { vol: 0.2, freq: 62 }, bell: { vol: 0.035, chance: 0.14, octave: 36, offsets: [0, 1, 6, 7] },
    scrape: { vol: 0.03, chance: 0.1 }, beep: { vol: 0.012, chance: 0.15, freq: 1900 },
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
        const S = T.street, sd = stepDur(S.bpm), ci = Math.floor(i / 32) % S.chords.length, chord = S.chords[ci], root = S.roots[ci];
        if (i % 32 === 0) pad(m.out, chord, t, sd * 32, S.pad);
        // Kick on every beat (four on the floor), clap-snare on 2 and 4.
        if (i % 4 === 0) synth.tone({ freq: S.kick.start, type: 'sine', t, dur: 0.2, vol: S.kick.vol, slide: S.kick.end, attack: 0.002, release: 0.06, to: m.out });
        if (i % 8 === 4) {
          synth.noise({ t, dur: 0.12, vol: S.snare.vol, filter: { type: 'bandpass', freq: 1900, q: 0.8 }, to: m.out });
          synth.tone({ freq: 190, type: 'triangle', t, dur: 0.09, vol: S.snare.body, slide: 120, to: m.out });
        }
        // Hats: offbeat eighths, quiet sixteenth ghosts, an open hat before the bar turns.
        if (i % 4 === 2) synth.noise({ t, dur: 0.04, vol: S.hat.vol, filter: { type: 'highpass', freq: 7500 }, to: m.out });
        else if (i % 2 === 1) synth.noise({ t, dur: 0.02, vol: S.hat.ghost, filter: { type: 'highpass', freq: 8500 }, to: m.out });
        if (i % 16 === 14) synth.noise({ t, dur: 0.09, vol: S.hat.open, filter: { type: 'highpass', freq: 6500 }, to: m.out });
        // Rolling bass: eighth notes through a lowpassed saw, a sub sine under the beats.
        if (i % 2 === 0) {
          const semis = S.bassPattern[(i / 2) % S.bassPattern.length], f = midiToFreq(root + semis);
          synth.tone({ freq: f, type: 'sawtooth', t, dur: sd * 1.4, vol: S.bass.vol, attack: 0.003, release: 0.05, filter: { type: 'lowpass', freq: S.bass.cutoff, q: 1.2 }, to: m.out });
          if (i % 4 === 0) synth.tone({ freq: midiToFreq(root), type: 'sine', t, dur: sd * 3, vol: S.bass.sub, release: 0.1, to: m.out });
        }
        // Sixteenth-note arpeggio, accented on the offbeats so it pushes forward.
        const k = S.arpPattern[i % S.arpPattern.length], n = chord[k % chord.length] + 12;
        synth.tone({ freq: midiToFreq(n), type: 'sawtooth', t, dur: S.arp.dur, vol: S.arp.vol * (i % 4 === 2 ? S.arp.accent : 1), attack: 0.002, release: 0.05,
          filter: { type: 'lowpass', freq: S.arp.cutoff, q: 1 }, to: m.out });
      },
    },
    station: {
      bpm: T.station.bpm,
      step(m, i, t) {
        const S = T.station, sd = stepDur(S.bpm), ci = Math.floor(i / 32) % S.chords.length, chord = S.chords[ci];
        if (i % 32 === 0) {
          pad(m.out, chord, t, sd * 32, S.pad);
          synth.tone({ freq: midiToFreq(chord[0] - 12), type: 'sine', t, dur: sd * 32, vol: S.drone.vol, attack: 2.5, release: 3, to: m.out });
        }
        if (i % 4 === 0 && synth.rand() < S.bell.chance) { // a bell far away, ringing out into the reverb
          const n = chord[Math.floor(synth.rand() * chord.length)] + S.bell.octave;
          synth.tone({ freq: midiToFreq(n), type: 'sine', t, dur: 0.12, vol: S.bell.vol, release: 2.6, to: m.out });
        }
        if (i % S.tick.every === 0) synth.noise({ t, dur: 0.03, vol: S.tick.vol, filter: { type: 'bandpass', freq: 1200, q: 1.2 }, to: m.out }); // distant rail ticks
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
    finale: {
      bpm: T.finale.bpm,
      step(m, i, t) {
        const S = T.finale, sd = stepDur(S.bpm), bar = Math.floor(i / 16), root = S.roots[bar % S.roots.length], fill = i % 64 >= 56;
        if (i % 4 === 0 || i % 32 === 30) { // hard kick with a click on top
          synth.tone({ freq: S.kick.start, type: 'sine', t, dur: 0.22, vol: S.kick.vol, slide: S.kick.end, attack: 0.001, release: 0.05, to: m.out });
          synth.noise({ t, dur: 0.012, vol: S.kick.vol * 0.35, filter: { type: 'highpass', freq: 2500 }, to: m.out });
        }
        if (i % 8 === 4 || fill) { // snare on 2 and 4, rolling sixteenths in the last half bar of every four
          synth.noise({ t, dur: 0.12, vol: S.snare.vol * (fill ? 0.7 : 1), filter: { type: 'bandpass', freq: 2100, q: 0.7 }, to: m.out });
          synth.tone({ freq: 200, type: 'triangle', t, dur: 0.09, vol: S.snare.body, slide: 110, to: m.out });
        }
        synth.noise({ t, dur: 0.025, vol: S.hat.vol * (i % 2 ? 0.55 : 1), filter: { type: 'highpass', freq: 8000 }, to: m.out });
        // Sixteenth-note bass, a saw through a lowpass: it never lets up.
        synth.tone({ freq: midiToFreq(root + S.bassPattern[i % S.bassPattern.length]), type: 'sawtooth', t, dur: sd * 0.9, vol: S.bass.vol, attack: 0.002, release: 0.03, filter: { type: 'lowpass', freq: S.bass.cutoff, q: 1.4 }, to: m.out });
        // Tritone stabs on the offbeats.
        if (i % 16 === 3 || i % 16 === 10) for (const n of [root + 24, root + 30, root + 31]) synth.tone({ freq: midiToFreq(n), type: 'sawtooth', t, dur: sd * 1.6, vol: S.stab.vol, attack: 0.002, release: 0.08, detune: i % 2 ? 12 : -12, filter: { type: 'lowpass', freq: S.stab.cutoff, q: 2 }, to: m.out });
        if (i % 64 === 0) synth.noise({ t, dur: sd * 14, vol: S.riser.vol, attack: sd * 12, release: 0.2, filter: { type: 'bandpass', freq: 400, q: 1.2, sweepTo: 7000 }, to: m.out }); // a riser into the next phrase
      },
    },
    bazaar: {
      bpm: T.bazaar.bpm,
      step(m, i, t) {
        const S = T.bazaar, sd = stepDur(S.bpm), bar = Math.floor(i / 16), s = i % 16, [root, q] = S.chords[bar % S.chords.length];
        const notes = q === 'min' ? [0, 3, 7] : [0, 4, 7], pent = q === 'min' ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
        if (s === 0) pad(m.out, notes.map((n) => root + n), t, sd * 16, S.pad);
        // oom-pah: bass on 1 and 3 (root, then fifth), short chord stabs on 2 and 4
        if (s === 0 || s === 8) synth.tone({ freq: midiToFreq(root - 12 + (s ? 7 : 0)), type: 'triangle', t, dur: sd * 3, vol: S.bass.vol, attack: 0.005, release: 0.12, filter: { type: 'lowpass', freq: S.bass.cutoff }, to: m.out });
        if (s === 4 || s === 12) for (const n of notes) synth.tone({ freq: midiToFreq(root + n), type: 'square', t, dur: sd * 1.2, vol: S.stab.vol, attack: 0.003, release: 0.06, filter: { type: 'lowpass', freq: 1400 }, to: m.out });
        // the only percussion: a woodblock tick on 3 and a soft kick every fourth bar
        if (s === 8) synth.noise({ t, dur: 0.02, vol: S.tick.vol, filter: { type: 'bandpass', freq: 2600, q: 3 }, to: m.out });
        if (s === 0 && bar % 4 === 0) kick(m.out, t, S.kick.vol, S.kick.start);
        // melody: marimba-ish plucks; the pattern for each bar is picked so the order shifts every pass
        if (s % 2 === 0) {
          const idx = S.mel[(bar * 3 + (bar >> 3)) % S.mel.length][s / 2];
          if (idx >= 0 && synth.rand() > S.lead.restChance) {
            const n = root + 12 + pent[idx % 5] + 12 * Math.floor(idx / 5) + (bar % 16 >= 8 ? 12 : 0);
            synth.tone({ freq: midiToFreq(n), type: 'triangle', t, dur: sd * 1.5, vol: S.lead.vol, attack: 0.003, release: 0.25, filter: { type: 'lowpass', freq: S.lead.cutoff }, to: m.out });
            synth.tone({ freq: midiToFreq(n + 12), type: 'sine', t, dur: sd, vol: S.lead.vol * 0.35, attack: 0.002, release: 0.1, to: m.out });
          }
        }
        // now and then a silly slide-whistle boing at the end of a bar
        if (s === 13 && synth.rand() < S.boing.chance) synth.tone({ freq: midiToFreq(root + 24), type: 'sine', t, dur: 0.3, vol: S.boing.vol, slide: midiToFreq(root + 36), attack: 0.01, release: 0.1, to: m.out });
      },
    },
    dealer: {
      bpm: T.dealer.bpm,
      step(m, i, t) {
        const S = T.dealer, sd = stepDur(S.bpm), bar = Math.floor(i / 16), root = S.roots[Math.floor(bar / 2) % S.roots.length];
        if (i % 32 === 0) { // two bars: the drone and a swelling cluster
          synth.tone({ freq: midiToFreq(root), type: 'sine', t, dur: sd * 34, vol: S.drone.vol, attack: 3, release: 4, to: m.out });
          synth.tone({ freq: midiToFreq(root + 12), type: 'sawtooth', t, dur: sd * 34, vol: S.drone.vol * 0.25, attack: 4, release: 4, filter: { type: 'lowpass', freq: 240, q: 1 }, to: m.out });
          for (const o of S.cluster.offsets) for (const d of [-S.cluster.detune, S.cluster.detune]) {
            synth.tone({ freq: midiToFreq(root + o), type: 'sawtooth', t, dur: S.cluster.swell * 2, vol: S.cluster.vol, attack: S.cluster.swell, release: S.cluster.swell, detune: d, filter: { type: 'lowpass', freq: S.cluster.cutoff, q: 2 }, to: m.out });
          }
        }
        if (i % 16 === 0) { kick(m.out, t, S.heart.vol, S.heart.freq); kick(m.out, t + 0.3, S.heart.vol * 0.6, S.heart.freq * 0.9); } // a muffled lub-dub every bar
        if (i % 8 === 4 && synth.rand() < S.bell.chance) {
          const o = S.bell.offsets[Math.floor(synth.rand() * S.bell.offsets.length)];
          synth.tone({ freq: midiToFreq(root + S.bell.octave + o), type: 'sine', t, dur: 0.2, vol: S.bell.vol, release: 3.5, to: m.out });
        }
        if (i % 16 === 10 && synth.rand() < S.scrape.chance) synth.noise({ t, dur: 2.2, vol: S.scrape.vol, attack: 0.8, release: 1.2, filter: { type: 'bandpass', freq: 500, q: 6, sweepTo: 2600 }, to: m.out });
        if (i % 4 === 2 && synth.rand() < S.beep.chance * 0.25) synth.tone({ freq: S.beep.freq, type: 'sine', t, dur: 0.05, vol: S.beep.vol, release: 0.04, to: m.out });
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
