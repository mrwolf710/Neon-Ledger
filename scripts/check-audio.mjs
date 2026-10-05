// node scripts/check-audio.mjs — runs every music mood and the SFX functions against a fake synth (no sound, no browser).
import assert from 'node:assert';
globalThis.window = globalThis; globalThis.localStorage = undefined;
const { createMusic, TUNING: MT } = await import('../src/audio/music.js');
const { createSfx, surfaceAt, TUNING: ST } = await import('../src/audio/sfx.js');
const { midiToFreq } = await import('../src/audio/synth.js');

assert.ok(Math.abs(midiToFreq(69) - 440) < 1e-9 && Math.abs(midiToFreq(57) - 220) < 1e-9, 'midi to Hz');
assert.equal(surfaceAt(0, 0), 'asphalt'); assert.equal(surfaceAt(-10, 4), 'tile'); assert.equal(surfaceAt(17, 4), 'metal');

const calls = { tone: 0, noise: 0 };
const param = () => ({ value: 0, cancelScheduledValues() {}, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
const node = () => ({ gain: param(), connect() {}, disconnect() {} });
const osc = () => ({ type: '', frequency: param(), connect() {}, start() {}, stop() {} });
const t0 = performance.now();
const synth = {
  ready: true, musicOn: true, buses: { sfx: node(), music: node() },
  get now() { return ((performance.now() - t0) / 1000) * 25; }, // time runs 25x so the sequencer schedules many steps
  ctx: { createGain: node, createOscillator: osc },
  filter() { return { ...node(), frequency: param() }; },
  rand: Math.random,
  tone() { calls.tone++; }, noise() { calls.noise++; },
  panner() { return { disconnect() {} }; },
};

const music = createMusic(synth);
for (const mood of ['street', 'scene', 'echo', 'board']) {
  const before = calls.tone + calls.noise;
  music.setMood(mood, 0.2);
  if (mood === 'board') { music.addLink(); music.addLink(); }
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(music.mood, mood);
  assert.ok(calls.tone + calls.noise > before, `${mood}: plays notes`);
}
music.setMood('silent', 0.1);
assert.equal(music.mood, 'silent');

const sfx = createSfx(synth);
const pos = { x: 0, y: 0, z: 0 };
sfx.update; // built lazily from the browser; here we only exercise the event functions
const before = calls.tone + calls.noise;
for (const s of ['asphalt', 'tile', 'metal']) sfx.step(s, pos, false);
for (const k of ['move', 'confirm', 'back', 'case', 'linkOk', 'linkWrong', 'echoOn', 'echoOff', 'glitch']) sfx.ui(k);
for (const ch of 'Hello there') sfx.voice(ch, 'mamaTeo');
sfx.voice('x', 'nobody-known');
sfx.crackle({ x: 1, y: 4, z: 1 });
sfx.trainArrive(6); sfx.trainStop();             // the motor swell and its idle
assert.ok(calls.tone + calls.noise > before + 15, 'sfx functions produce sounds');
assert.ok(Object.keys(ST.voices).length >= 7 && MT.street.chords.length === MT.street.roots.length, 'tuning tables line up');
console.log('audio ok');
process.exit(0);
