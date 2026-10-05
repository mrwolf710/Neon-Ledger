import { DISTRICT } from '../world/district.js';

// Sound effects. All numbers live in TUNING so they can be tweaked without touching the code.
export const TUNING = {
  rain: { hiss: 0.1, body: 0.075, patter: 0.1, hissFreq: 3400, bodyFreq: 600, patterFreq: 1500, awningDuck: 0.5,
    drift: [0.31, 0.83],   // Hz of two slow, unrelated wobbles in the patter level (no regular beat)
    droplets: { perSecond: 4, awningPerSecond: 8, vol: 0.03, freq: [1800, 4800] }, smooth: 0.35 },
  awningZ: 3.85,         // |z| beyond this on the sidewalk counts as under an awning
  steps: {
    asphalt: { vol: 0.26, lp: 950, hp: 180, dur: 0.1, splash: 0.08 },
    tile: { vol: 0.21, bp: 2400, q: 1.8, dur: 0.05, thump: 120, thumpVol: 0.15 },
    metal: { vol: 0.22, ring: [430, 640], dur: 0.2, click: 0.11, ringVol: 0.08 },
    runBoost: 1.35, otherRange: 14, jitter: 0.06,
  },
  hum: { voices: 3, vol: 0.055, base: 50, lowpass: 520, ref: 4, update: 0.5, buzz: 0.18 },
  crackle: { vol: 0.12, hp: 3200, bursts: 3 },
  train: { minGap: 38, maxGap: 75, first: 14, duration: 8.5, startZ: -44, endZ: 44, x: DISTRICT.rail.x, y: DISTRICT.rail.height,
    speed: 60, c: 343, vol: 0.5, rumbleFreq: 150, clack: 0.19 },
  echo: { ambientLevel: 0.05, fadeOut: 0.35, fadeIn: 0.5,   // ambient bus level during an echo, and fade time constants (s)
    rumble: { vol: 0.55, lowpass: 95, sub: 41, subVol: 0.5, wobble: 0.17, in: 0.7 } },
  // Electric train motor for the cold open: a growl and a rising whine that swell as the train closes in, then settle to a quiet idle hum.
  motor: { base: 34, peak: 92, idle: 44, whineMult: 9, lowpass: 950, swell: 0.3, idleGain: 0.03, idleAfter: 0.4, idleTime: 0.9 },
  ui: { vol: 0.16 },
  voice: { vol: 0.07, dur: 0.05, every: 2 },
  voices: { // per speaker: base Hz and waveform
    juno: [230, 'triangle'], mamaTeo: [310, 'square'], kit: [400, 'sawtooth'], dex: [165, 'square'], vendor: [195, 'triangle'],
    miso: [760, 'sine'], hale: [135, 'triangle'], preacher: [150, 'sine'], unknown: [112, 'sawtooth'], vending: [540, 'square'],
  },
};

// Which surface is under (x, z): wet asphalt on the road, metal grating under the rail, tile on the sidewalks.
export function surfaceAt(x, z) {
  const D = DISTRICT;
  if (Math.abs(z) < D.roadWidth / 2) return 'asphalt';
  if (Math.abs(x - D.rail.x) < D.rail.deckWidth / 2 + 1.2) return 'metal';
  return 'tile';
}

export function createSfx(synth) {
  const T = TUNING;
  let ambient = null, rumble = null, echoOn = false, echoApplied = null;
  let motor = null;
  let rain = null, hum = null, train = null, lastPlayer = { x: 0, y: 0, z: 0 }, lastYaw = 0;
  let droplet = 0, humTimer = 0, trainTimer = T.train.first, voiceCount = 0, rainLevel = 1;

  // ---------- Rain (built lazily once audio is ready) ----------
  function buildRain() {
    // Each layer: its own noise loop (different lengths) -> filter -> level gain (controlled in update) -> bus.
    const mk = (type, freq, q, loopSeconds) => {
      const f = synth.filter(type, freq, q), g = synth.ctx.createGain();
      g.gain.value = 0;
      synth.noiseLoop(loopSeconds).connect(f); f.connect(g);
      return { g, f };
    };
    const R = T.rain;
    const hiss = mk('lowpass', R.hissFreq, 0.4, 5.3), body = mk('lowpass', R.bodyFreq, 0.5, 4.1), patter = mk('bandpass', R.patterFreq, 0.9, 6.7);
    hiss.g.connect(ambient); body.g.connect(ambient);
    // Patter: gentle irregular wobble (two slow, unrelated LFOs) applied as a multiplier, never as an additive offset.
    const wob = synth.ctx.createGain(); wob.gain.value = 0.75;
    R.drift.forEach((hz, i) => {
      const lfo = synth.ctx.createOscillator(), amp = synth.ctx.createGain();
      lfo.frequency.value = hz; amp.gain.value = i ? 0.1 : 0.15; lfo.connect(amp); amp.connect(wob.gain); lfo.start();
    });
    patter.g.connect(wob); wob.connect(ambient);
    rain = { hiss, body, patter, awning: 0 };
  }

  // ---------- Train motor (cold open) ----------
  function startMotor(seconds) {
    stopMotor(0.1);
    const ctx = synth.ctx, t = synth.now, M = T.motor;
    const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.connect(synth.buses.sfx);
    const lp = synth.filter('lowpass', M.lowpass, 0.8); lp.connect(out);
    const oscs = [['sawtooth', 1, 0.5], ['square', 2, 0.16], ['sine', M.whineMult, 0.22]].map(([type, mult, v]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; g.gain.value = v; o.connect(g); g.connect(lp);
      o.frequency.setValueAtTime(M.base * mult, t);
      o.frequency.linearRampToValueAtTime(M.peak * mult, t + seconds * 0.7);   // pitch climbs as it nears...
      o.frequency.linearRampToValueAtTime(M.idle * mult, t + seconds);          // ...and drops as it brakes
      o.start(t);
      return o;
    });
    out.gain.exponentialRampToValueAtTime(M.swell, t + seconds * 0.85);         // swells as it gets closer
    out.gain.setTargetAtTime(M.idleGain, t + seconds + M.idleAfter, M.idleTime); // then turned right down while Juno is on the platform
    motor = { out, oscs };
  }
  function stopMotor(fade = 0.6) {
    if (!motor) return;
    const t = synth.now, m = motor;
    motor = null;
    m.out.gain.cancelScheduledValues(t);
    m.out.gain.setTargetAtTime(0.0001, t, fade / 3);
    for (const o of m.oscs) o.stop(t + fade * 2 + 0.2);
  }

  // ---------- Echo rumble: very low filtered noise + a sub sine, slowly breathing ----------
  function buildRumble() {
    const R = T.echo.rumble, ctx = synth.ctx;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(synth.buses.sfx);
    const lp = synth.filter('lowpass', R.lowpass, 1.1);
    synth.noiseLoop(7.1).connect(lp); lp.connect(g);
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = 'sine'; sub.frequency.value = R.sub; sg.gain.value = R.subVol; sub.connect(sg); sg.connect(g); sub.start();
    // Slow breathing: the filter and the sub drift with an unhurried LFO.
    const lfo = ctx.createOscillator(), la = ctx.createGain(), ls = ctx.createGain();
    lfo.frequency.value = R.wobble; la.gain.value = R.lowpass * 0.35; ls.gain.value = 4;
    lfo.connect(la); la.connect(lp.frequency); lfo.connect(ls); ls.connect(sub.frequency); lfo.start();
    rumble = { g };
  }

  // ---------- Neon hum: a few buzzing voices parked on the nearest signs ----------
  function buildHum() {
    const H = T.hum;
    hum = Array.from({ length: H.voices }, () => {
      const out = synth.ctx.createGain(); out.gain.value = 0;
      const lp = synth.filter('lowpass', H.lowpass, 0.6);
      [[1, 'sawtooth', 0.5], [2, 'square', 0.25], [3, 'triangle', 0.35]].forEach(([mult, type, v]) => {
        const o = synth.ctx.createOscillator(), g = synth.ctx.createGain();
        o.type = type; o.frequency.value = H.base * mult; g.gain.value = v; o.connect(g); g.connect(lp); o.start();
      });
      lp.connect(out);
      const p = synth.panner(0, 4, 0, { ref: H.ref, to: ambient });
      out.connect(p);
      return { out, p };
    });
  }

  // ---------- Train ----------
  function startTrain() {
    const Tr = T.train, ctx = synth.ctx;
    const g = ctx.createGain(); g.gain.value = 0;
    const rumble = synth.noiseLoop(), lp = synth.filter('lowpass', Tr.rumbleFreq, 0.8);
    rumble.connect(lp); lp.connect(g);
    const osc = ctx.createOscillator(), og = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = 52; og.gain.value = 0.35; osc.connect(og); og.connect(g); osc.start();
    const p = synth.panner(Tr.x, Tr.y, Tr.startZ, { ref: 10, rolloff: 0.8, max: 120, to: ambient });
    g.connect(p);
    train = { g, lp, osc, rumble, p, t: 0, clack: 0 };
  }
  function updateTrain(dt) {
    const Tr = T.train;
    if (!train) { trainTimer -= dt; if (trainTimer <= 0) { startTrain(); trainTimer = Tr.minGap + synth.rand() * (Tr.maxGap - Tr.minGap); } return; }
    train.t += dt;
    const u = train.t / Tr.duration, z = Tr.startZ + (Tr.endZ - Tr.startZ) * u;
    synth.setPos(train.p, Tr.x, Tr.y, z);
    // Doppler: pitch rises while approaching, drops after passing (radial speed along the line to the listener).
    const dx = Tr.x - lastPlayer.x, dz = z - lastPlayer.z, d = Math.hypot(dx, dz, Tr.y) || 1;
    const vz = Math.sign(Tr.endZ - Tr.startZ) * Tr.speed, vr = -(dz * vz) / d; // speed toward the listener (+ = approaching)
    const ratio = Tr.c / (Tr.c - Math.max(-Tr.c * 0.5, Math.min(Tr.c * 0.5, vr)));
    const t = synth.now;
    train.osc.frequency.setTargetAtTime(52 * ratio, t, 0.05);
    train.lp.frequency.setTargetAtTime(Tr.rumbleFreq * ratio, t, 0.05);
    const env = Math.sin(Math.min(1, Math.max(0, u)) * Math.PI);
    train.g.gain.setTargetAtTime(Tr.vol * env ** 0.6, t, 0.1);
    // Wheel clacks while it passes.
    train.clack -= dt;
    if (train.clack <= 0 && env > 0.15) {
      train.clack = Tr.clack;
      synth.noise({ dur: 0.04, vol: 0.5 * env, filter: { type: 'bandpass', freq: 850 * ratio, q: 1.4 }, to: train.g });
    }
    if (u >= 1) {
      train.osc.stop(); train.rumble.stop(); train.p.disconnect(); train = null;
    }
  }

  // ---------- Helpers ----------
  const distance = (pos) => Math.hypot(pos.x - lastPlayer.x, pos.z - lastPlayer.z);
  const pan = (pos) => { const rx = Math.cos(lastYaw), rz = -Math.sin(lastYaw); const d = distance(pos) || 1;
    return Math.max(-1, Math.min(1, ((pos.x - lastPlayer.x) * rx + (pos.z - lastPlayer.z) * rz) / d)) * Math.min(1, d / 4); };
  function stereo(node, p) {
    const sp = synth.ctx.createStereoPanner?.();
    if (!sp) return node;
    sp.pan.value = p; sp.connect(node);
    return sp;
  }

  const api = {
    // Called every frame. s: { player: {x,y,z}, yaw, rainScale, signs: [{light}] }
    update(dt, s) {
      if (!synth.ready) return;
      lastPlayer = s.player; lastYaw = s.yaw;
      synth.setListener(s.player.x, 1, s.player.z, s.yaw);
      const t = synth.now, R = T.rain;
      if (!ambient) { // ambient bus: rain, hum, train, droplets. Ducks during an echo while the rumble swells.
        ambient = synth.ctx.createGain(); ambient.connect(synth.buses.sfx);
        buildRumble();
      }
      if (echoOn !== echoApplied) {
        echoApplied = echoOn;
        const E = T.echo;
        ambient.gain.setTargetAtTime(echoOn ? E.ambientLevel : 1, t, echoOn ? E.fadeOut : E.fadeIn);
        rumble.g.gain.setTargetAtTime(echoOn ? E.rumble.vol : 0, t, echoOn ? E.rumble.in : 0.4);
      }
      if (!rain) buildRain();
      if (!hum) buildHum();
      // Rain: brighter hiss in the open, drumming patter under awnings.
      rainLevel = 0.3 + 0.7 * (s.rainScale ?? 1);
      const under = Math.abs(s.player.z) > T.awningZ && Math.abs(s.player.z) < DISTRICT.roadWidth / 2 + DISTRICT.sidewalkWidth ? 1 : 0;
      rain.awning += (under - rain.awning) * Math.min(1, dt * 3);
      const k = R.smooth;
      rain.hiss.g.gain.setTargetAtTime(R.hiss * rainLevel * (1 - R.awningDuck * rain.awning), t, k);
      rain.body.g.gain.setTargetAtTime(R.body * rainLevel, t, k);
      rain.patter.g.gain.setTargetAtTime(R.patter * rainLevel * rain.awning * 0.5, t, k);
      // Droplet clicks.
      droplet -= dt;
      if (droplet <= 0) {
        const rate = R.droplets.perSecond + (R.droplets.awningPerSecond - R.droplets.perSecond) * rain.awning;
        droplet = (0.5 + synth.rand()) / (rate * rainLevel + 0.1);
        const [lo, hi] = R.droplets.freq, p = (synth.rand() * 2 - 1) * 0.8;
        const g = synth.ctx.createGain(); g.gain.value = 1; const sp = stereo(ambient, p); g.connect(sp);
        synth.tone({ freq: lo + synth.rand() * (hi - lo), type: 'sine', dur: 0.012, release: 0.025, vol: R.droplets.vol * (0.5 + synth.rand()), to: g });
      }
      // Neon hum: re-park the voices on the nearest signs a couple of times a second.
      humTimer -= dt;
      if (humTimer <= 0 && s.signs?.length) {
        humTimer = T.hum.update;
        const near = [...s.signs].sort((a, b) => a.light.position.distanceToSquared(s.player) - b.light.position.distanceToSquared(s.player));
        hum.forEach((v, i) => {
          const sg = near[i];
          if (!sg) { v.out.gain.setTargetAtTime(0, t, 0.2); return; }
          const pp = sg.light.position, bright = sg.light.base ? sg.light.intensity / sg.light.base : 1;
          synth.setPos(v.p, pp.x, pp.y, pp.z);
          v.out.gain.setTargetAtTime(T.hum.vol * bright, t, 0.25); // flickering signs hum quieter
        });
      }
      updateTrain(dt);
    },

    // ---- Footsteps: surface, level, world position of the walker ----
    step(surface, pos, run = false, quiet = false) {
      if (!synth.ready) return;
      const S = T.steps, d = distance(pos);
      if (d > S.otherRange) return;
      const v = (1 - d / S.otherRange) ** 1.5 * (run ? S.runBoost : 1) * (quiet ? 0.35 : 1) * (1 + (synth.rand() - 0.5) * S.jitter * 2);
      const out = d > 0.5 ? stereo(synth.buses.sfx, pan(pos)) : synth.buses.sfx;
      if (surface === 'asphalt') {
        const c = S.asphalt;
        synth.noise({ dur: c.dur, vol: c.vol * v, filter: { type: 'lowpass', freq: c.lp * (0.85 + synth.rand() * 0.3) }, to: out });
        synth.noise({ dur: 0.07, vol: c.splash * v, filter: { type: 'bandpass', freq: 3200, q: 1 }, to: out }); // splash
      } else if (surface === 'tile') {
        const c = S.tile;
        synth.noise({ dur: c.dur, vol: c.vol * v, filter: { type: 'bandpass', freq: c.bp * (0.9 + synth.rand() * 0.2), q: c.q }, to: out });
        synth.tone({ freq: c.thump, type: 'sine', dur: 0.05, vol: c.thumpVol * v, slide: 60, to: out });
      } else {
        const c = S.metal;
        c.ring.forEach((f, i) => synth.tone({ freq: f * (0.97 + synth.rand() * 0.06), type: 'triangle', dur: c.dur, release: 0.12, vol: c.ringVol * v / (i + 1), to: out }));
        synth.noise({ dur: 0.03, vol: c.click * v, filter: { type: 'highpass', freq: 2500 }, to: out });
      }
    },

    // ---- Neon crackle when a sign flickers off, at the sign's position ----
    // The cold-open train pulling into the platform over `seconds`: swelling rumble, wheel clacks, a brake squeal at the end.
    trainArrive(seconds = 6) {
      if (!synth.ready) return;
      startMotor(seconds);
      const t = synth.now;
      synth.noise({ t, dur: seconds, vol: 0.45, attack: seconds * 0.5, release: 1.2, filter: { type: 'lowpass', freq: 220, sweepTo: 90 } });
      synth.tone({ freq: 55, t, dur: seconds, vol: 0.22, attack: seconds * 0.5, release: 1.2, type: 'sawtooth', filter: { type: 'lowpass', freq: 160 } });
      for (let i = 0; i < seconds * 4; i++) {
        const k = 1 - i / (seconds * 4);
        synth.noise({ t: t + i * 0.25 * (1 + (1 - k) * 0.6), dur: 0.04, vol: 0.18 * (0.3 + k), filter: { type: 'bandpass', freq: 900, q: 1.3 } });
      }
      synth.tone({ freq: 2100, t: t + seconds - 1.8, dur: 1.6, type: 'sawtooth', vol: 0.04, slide: 600, release: 0.3, filter: { type: 'bandpass', freq: 1500, q: 2 } });
    },

    // Leaving the platform ends the idling train's hum.
    trainStop() { if (synth.ready) stopMotor(); },

    // Echo mode on / off: ambient sound fades away and a low rumble swells in.
    setEcho(on) { echoOn = on; },

    crackle(pos) {
      if (!synth.ready || echoOn || distance(pos) > 22) return;
      const C = T.crackle, t = synth.now, p = synth.panner(pos.x, pos.y, pos.z, { ref: 4 });
      for (let i = 0; i < C.bursts; i++) {
        synth.noise({ t: t + i * (0.02 + synth.rand() * 0.03), dur: 0.015, vol: C.vol * (0.5 + synth.rand() * 0.5), filter: { type: 'highpass', freq: C.hp }, to: p });
      }
      setTimeout(() => p.disconnect(), 400);
    },

    // ---- UI ----
    ui(kind) {
      if (!synth.ready) return;
      const v = T.ui.vol, t = synth.now;
      const n = (f, dt, d = 0.07, type = 'triangle') => synth.tone({ freq: f, t: t + dt, dur: d, type, vol: v, release: 0.06 });
      if (kind === 'move') n(660, 0, 0.03, 'square');
      else if (kind === 'confirm') { n(520, 0, 0.05); n(780, 0.06, 0.09); }
      else if (kind === 'back') { n(520, 0, 0.05); n(340, 0.06, 0.09); }
      else if (kind === 'case') { n(880, 0, 0.07, 'sine'); n(1320, 0.09, 0.16, 'sine'); }
      else if (kind === 'linkOk') {
        [440, 554, 659, 880].forEach((f, i) => n(f, i * 0.07, 0.14, 'sine'));
        synth.tone({ freq: 1760, t: t + 0.3, dur: 0.5, type: 'sine', vol: v * 0.5, release: 0.4 });
      } else if (kind === 'linkWrong') {
        synth.tone({ freq: 200, type: 'sawtooth', dur: 0.22, vol: v * 0.9, slide: 90, filter: { type: 'lowpass', freq: 700 } });
        synth.noise({ dur: 0.12, vol: v * 0.5, filter: { type: 'bandpass', freq: 400, q: 2 } });
      } else if (kind === 'echoOn') {
        synth.noise({ dur: 0.7, vol: v * 1.2, attack: 0.3, release: 0.3, filter: { type: 'bandpass', freq: 300, q: 2, sweepTo: 5000 } });
        synth.tone({ freq: 110, type: 'sine', dur: 0.8, vol: v, slide: 440, release: 0.3 });
      } else if (kind === 'echoOff') {
        synth.noise({ dur: 0.5, vol: v, filter: { type: 'bandpass', freq: 5000, q: 2, sweepTo: 200 } });
      } else if (kind === 'glitch') {
        synth.noise({ dur: 0.18, vol: v * 1.3, filter: { type: 'highpass', freq: 1200 } });
        synth.tone({ freq: 90, type: 'square', dur: 0.15, vol: v * 0.7, slide: 40 });
      }
    },

    // ---- Voice blips: one per two letters, pitch from the speaker and the letter ----
    voice(ch, speaker) {
      if (!synth.ready || /[\s.,!?;:'"“”…\-—()]/.test(ch)) return;
      if (++voiceCount % T.voice.every) return;
      const [base, type] = T.voices[speaker] ?? T.voices.juno;
      const semis = ((ch.toLowerCase().charCodeAt(0) * 7) % 7) - 3;
      synth.tone({ freq: base * 2 ** (semis / 12), type, dur: T.voice.dur, release: 0.03, vol: T.voice.vol,
        filter: { type: 'lowpass', freq: base * 5, q: 0.7 } });
    },
  };
  return api;
}
