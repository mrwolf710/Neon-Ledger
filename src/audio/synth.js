import { rng } from '../core/rng.js';

// Web Audio core. Everything is synthesized; no sample files. start() must run from a user gesture
// (the "Tap to start" screen), which is what unlocks audio on iOS. Before that every helper is a no-op.
export const TUNING = {
  master: 0.9,
  compressor: { threshold: -20, knee: 24, ratio: 5, attack: 0.004, release: 0.25 },
  defaults: { music: 0.55, sfx: 0.8 },        // bus volumes 0..1 (saved in localStorage)
  reverb: { seconds: 2.4, decay: 3.2, wet: 0.34, sfxSend: 0.12, musicSend: 0.45 },
  storageKey: 'neon-ledger.audio',
};

const R = rng.fork('audio'); // seeded: noise buffers and sound variation are the same every run
export const midiToFreq = (m) => 440 * 2 ** ((m - 69) / 12);

export const synth = {
  ctx: null,
  ready: false,
  volumes: { ...TUNING.defaults },
  musicOn: true,
  buses: {},
  get now() { return this.ctx ? this.ctx.currentTime : 0; },

  start() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    const C = TUNING.compressor;
    const comp = ctx.createDynamicsCompressor();
    Object.entries(C).forEach(([k, v]) => { comp[k].value = v; });
    const master = ctx.createGain(); master.gain.value = TUNING.master;
    master.connect(comp); comp.connect(ctx.destination);

    const music = ctx.createGain(), sfx = ctx.createGain(), reverb = ctx.createConvolver(), wet = ctx.createGain();
    reverb.buffer = this.impulse(TUNING.reverb.seconds, TUNING.reverb.decay);
    wet.gain.value = TUNING.reverb.wet;
    reverb.connect(wet); wet.connect(master);
    music.connect(master); sfx.connect(master);
    const send = (bus, amount) => { const g = ctx.createGain(); g.gain.value = amount; bus.connect(g); g.connect(reverb); };
    send(music, TUNING.reverb.musicSend); send(sfx, TUNING.reverb.sfxSend);
    this.buses = { music, sfx, master, reverb };

    try { Object.assign(this.volumes, JSON.parse(localStorage.getItem(TUNING.storageKey) ?? '{}')); } catch { /* private mode */ }
    this.applyVolumes();
    this.ready = true;
    // Browsers can suspend the context again (tab switches, iOS interruptions): resume on the next gesture.
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, () => { if (ctx.state !== 'running') ctx.resume(); }, { passive: true });
  },

  applyVolumes() {
    if (!this.ready) return;
    const t = this.now;
    this.buses.music.gain.setTargetAtTime(this.musicOn ? this.volumes.music : 0, t, 0.05);
    this.buses.sfx.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
  },
  setVolume(bus, v) {
    this.volumes[bus] = Math.min(1, Math.max(0, v));
    this.applyVolumes();
    try { localStorage.setItem(TUNING.storageKey, JSON.stringify(this.volumes)); } catch { /* ignore */ }
  },
  setMusicOn(on) { this.musicOn = on; this.applyVolumes(); },

  // Decaying stereo noise: a cheap, good-enough room.
  impulse(seconds, decay) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (R.rand() * 2 - 1) * (1 - i / n) ** decay;
    }
    return buf;
  },
  noiseBuffer(seconds = 2) {
    this._noise ??= {};
    if (!this._noise[seconds]) {
      const ctx = this.ctx, n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = R.rand() * 2 - 1;
      this._noise[seconds] = buf;
    }
    return this._noise[seconds];
  },
  // A looping noise source (for rain, rumble). Returns the source node; connect it where you like.
  noiseLoop() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuffer(3); s.loop = true; s.start();
    return s;
  },
  filter(type, freq, q = 0.7) {
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    return f;
  },
  dest(o) { return o.to ?? this.buses[o.bus ?? 'sfx']; },

  // One oscillator note with an attack / release envelope and optional filter and pitch slide.
  // o: { freq, type, t, dur, vol, attack, release, bus | to, slide (target Hz), detune (cents), filter: {type, freq, q} }
  tone(o) {
    if (!this.ready) return null;
    const ctx = this.ctx, t = o.t ?? ctx.currentTime, dur = o.dur ?? 0.2, a = o.attack ?? 0.005, r = o.release ?? 0.08, vol = o.vol ?? 0.2;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type ?? 'sine'; osc.frequency.setValueAtTime(o.freq, t); osc.detune.value = o.detune ?? 0;
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, Math.max(t + a, t + dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
    let node = osc;
    if (o.filter) { const f = this.filter(o.filter.type, o.filter.freq, o.filter.q); osc.connect(f); node = f; }
    node.connect(g); g.connect(this.dest(o));
    osc.start(t); osc.stop(t + dur + r + 0.05);
    return { osc, gain: g };
  },

  // A noise burst through a filter (optionally swept), same envelope shape.
  // o: { t, dur, vol, attack, release, filter: {type, freq, q, sweepTo}, bus | to }
  noise(o) {
    if (!this.ready) return null;
    const ctx = this.ctx, t = o.t ?? ctx.currentTime, dur = o.dur ?? 0.1, a = o.attack ?? 0.002, r = o.release ?? 0.05, vol = o.vol ?? 0.2;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = this.noiseBuffer(2);
    const f = this.filter(o.filter?.type ?? 'lowpass', o.filter?.freq ?? 1000, o.filter?.q ?? 0.7);
    if (o.filter?.sweepTo) f.frequency.exponentialRampToValueAtTime(o.filter.sweepTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
    src.connect(f); f.connect(g); g.connect(this.dest(o));
    src.start(t, R.rand() * 1.5); src.stop(t + dur + r + 0.05);
    return { src, gain: g };
  },

  // Panner for a world-space sound. Connects to the SFX bus; returns the node.
  panner(x, y, z, { ref = 3, rolloff = 1.2, max = 70 } = {}) {
    const p = this.ctx.createPanner();
    p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = rolloff; p.maxDistance = max;
    this.setPos(p, x, y, z);
    p.connect(this.buses.sfx);
    return p;
  },
  setPos(p, x, y, z) {
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
  },
  // Listener at the player, facing along the camera's "up the screen" direction.
  setListener(x, y, z, yaw) {
    if (!this.ready) return;
    const L = this.ctx.listener, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    if (L.positionX) {
      L.positionX.value = x; L.positionY.value = y; L.positionZ.value = z;
      L.forwardX.value = fx; L.forwardY.value = 0; L.forwardZ.value = fz; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else { L.setPosition(x, y, z); L.setOrientation(fx, 0, fz, 0, 1, 0); }
  },
  rand: () => R.rand(),
};
