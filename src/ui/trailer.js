import * as THREE from 'three';
import { CUTAWAY } from '../render/fog.js';

// ?trailer: a scripted ~38 s teaser. Click once to start (browsers need the tap for audio), then record the screen. Esc stops it.
// ?trailer=4 starts at shot 4 (1-based) to check one shot quickly.
// Every number is in TRAILER / SHOTS so it can be tweaked without touching the logic.
export const TRAILER = {
  bars: 0.115,              // letterbox bar height as a fraction of screen height (0 = off)
  gap: 0.25,                // seconds of black between shots
  kick: 0.55,               // glitch burst at each hard cut (0 = off)
  cutRadius: 8.5, cutMargin: 0.25, // see-through cutaway while the trailer plays: wider than in play so nothing hides a character
  green: '#39ff14', cyan: '#1fd6e8', white: '#ffffff', red: '#ff3b5c',
  title: 'NEON ECHOES', tagline: 'A DETECTIVE GAME', endHold: 3.2,
};

const rad = THREE.MathUtils.degToRad;
const ease = (t) => t * t * (3 - 2 * t);
const H = Math.PI / 2;

// One shot = one area, one subject the camera looks at (and the see-through circle is centred on), one camera move.
// The camera sits on the +x/+z side (yaw ~45) and Juno always walks toward +x / +z, so she faces the lens, never away from it.
//  area      street | platform | sable | alley | hostel | car
//  juno      { at: [x, z] local to the area, face: radians (0 = +z, PI/2 = +x), walk: [x, z] local } where Juno stands / walks to
//  subject   'juno' (default) or a cast id (mamaTeo, dex, kit, preacher, miso ...)
//  both      true = frame the subject and Juno together (focus on the midpoint)
//  pan       [dx, dz] world units the focus drifts away from the subject over the shot
//  from/to   camera yaw, pitch (degrees) and distance; the move eases between them
//  margin    cutaway depth margin override: only things this far nearer than the subject are cut (keeps a counter in front of her solid)
//  train     seconds into the Line 9 train's 8.5 s run to join the shot at (2.8 = it crosses the street, x 17, during the shot)
//  card      pixel-font lines;  fx: 'echo' (seam glitch);  ui: sfx.ui kind
//  mood      music mood at the cut (echo = heartbeat + tension, finale = fast and hard, silent = drop);  hit: boom at the cut;  riser: seconds of rising noise
//  events    [{ t, hit, mood }] things that happen t seconds into the shot
const SHOTS = [
  { area: 'platform', juno: { at: [-3, -2], face: 0.5, walk: [-1.4, -0.9] }, dur: 3.2, from: { yaw: 35, pitch: 28, dist: 8 }, to: { yaw: 50, pitch: 34, dist: 20 }, ui: 'echoOn', mood: 'echo', riser: 3.2 },
  { area: 'street', juno: { at: [-9, 1.3], face: H, walk: [5, 1.3] }, dur: 4, from: { yaw: 28, pitch: 32, dist: 34 }, to: { yaw: 60, pitch: 38, dist: 46 }, pan: [2, 0], hit: 'small',
    card: [{ text: 'LOWMARKET. 23:40.', color: TRAILER.cyan, scale: 5 }, { text: 'THE RAIN NEVER STOPS.', color: TRAILER.white, scale: 4 }] },
  { area: 'street', subject: 'preacher', both: true, juno: { at: [-13, 1.0], face: H, walk: [-11, 0.4] }, dur: 2.8, from: { yaw: 40, pitch: 33, dist: 34 }, to: { yaw: 46, pitch: 32, dist: 26 }, hit: 'small',
    card: [{ text: 'THE CITY IS WATCHING.', color: TRAILER.red, scale: 4 }] },
  { area: 'street', subject: 'miso', both: true, juno: { at: [9, 1.0], face: H, walk: [11.2, 2.0] }, pan: [4, 0], dur: 3.4, from: { yaw: 30, pitch: 33, dist: 36 }, to: { yaw: 45, pitch: 34, dist: 30 }, hit: 'small', riser: 3.4, train: 2.8 },
  { area: 'sable', subject: 'mamaTeo', both: true, juno: { at: [-4.6, 0], face: H, walk: [-3, -1.2] }, dur: 3, from: { yaw: 40, pitch: 33, dist: 34 }, to: { yaw: 40, pitch: 32, dist: 28 }, margin: 2.2, hit: 'big', mood: 'finale' },
  { area: 'sable', subject: 'dex', both: true, juno: { at: [2.2, 0.2], face: H, walk: [3.2, 0.1] }, dur: 3, from: { yaw: 42, pitch: 42, dist: 14 }, to: { yaw: 44, pitch: 34, dist: 7.5 }, hit: 'small',
    card: [{ text: 'ONE DEAD CORPO.', color: TRAILER.white, scale: 4 }, { text: 'ONE MISSING MEMORY.', color: TRAILER.green, scale: 4 }] },
  { area: 'sable', juno: { at: [4.8, 1.6], face: 0.6 }, dur: 3, from: { yaw: 36, pitch: 34, dist: 7 }, to: { yaw: 52, pitch: 36, dist: 15 }, fx: 'echo', hit: 'small',
    card: [{ text: 'REPLAY THE PAST.', color: TRAILER.cyan, scale: 6 }] },
  { area: 'alley', juno: { at: [0, -1.5], face: 0, walk: [0, 2.6] }, dur: 2.6, from: { yaw: 22, pitch: 36, dist: 12 }, to: { yaw: 38, pitch: 40, dist: 8 }, hit: 'small' },
  { area: 'hostel', subject: 'kit', both: true, juno: { at: [-1.4, -0.8], face: H, walk: [0, 0.2] }, dur: 2.4, from: { yaw: 48, pitch: 38, dist: 14 }, to: { yaw: 40, pitch: 34, dist: 10 }, hit: 'small', ui: 'glitch' },
  { area: 'car', juno: { at: [0.4, 0], face: H }, dur: 2.2, from: { yaw: 50, pitch: 36, dist: 9 }, to: { yaw: 38, pitch: 32, dist: 6 }, hit: 'small' },
  { area: 'street', juno: { at: [-9, 1.3], face: H, walk: [6, 1.3] }, dur: 8.5, from: { yaw: 55, pitch: 28, dist: 30 }, to: { yaw: 60, pitch: 52, dist: 90 }, end: true, hit: 'small', riser: 3,
    events: [{ t: 1.6, mood: 'silent' }, { t: 3.1, hit: 'big', mood: 'finale' }] },
];

export function createTrailer({ cam, world, player, post, fade, cast, sfx, synth, onStart }) {
  const state = { active: false, focus: null, subject: null, mood: 'silent' }; // mood: what main tells the music to play
  let t = 0, stop = false, resolveWait = null, waitLeft = 0, shot = null;
  const focus = new THREE.Vector3(), subj = new THREE.Vector3(), walkPt = new THREE.Vector3();
  const saved = { ...CUTAWAY };

  // Waits in game time (frames), so a slow recording still keeps its pacing.
  const wait = (s) => new Promise((r) => { waitLeft = s; resolveWait = r; });
  const cardY = () => Math.round(window.innerHeight * (TRAILER.bars + 0.04)); // just above the bottom letterbox bar
  // Trailer sound design: booms at the cuts, a rising whoosh before the big moments.
  function hit(kind) {
    if (!synth.ready) return;
    const big = kind === 'big', t = synth.now;
    synth.tone({ freq: big ? 78 : 95, slide: big ? 26 : 42, type: 'sine', t, dur: big ? 1.3 : 0.4, vol: big ? 0.9 : 0.55, release: 0.2, bus: 'music' });
    synth.noise({ t, dur: big ? 1.4 : 0.3, vol: big ? 0.3 : 0.14, release: 0.3, filter: { type: 'lowpass', freq: big ? 5000 : 2200, sweepTo: 120 }, bus: 'music' });
    if (big) synth.tone({ freq: 41, type: 'sawtooth', t, dur: 1.6, vol: 0.18, release: 0.6, filter: { type: 'lowpass', freq: 220 }, bus: 'music' });
  }
  function riser(seconds) {
    if (!synth.ready) return;
    synth.noise({ t: synth.now, dur: seconds, attack: seconds * 0.95, vol: 0.2, release: 0.05, filter: { type: 'bandpass', freq: 250, q: 1.2, sweepTo: 7000 }, bus: 'music' });
    synth.tone({ freq: 110, slide: 880, type: 'sawtooth', dur: seconds, attack: seconds * 0.95, vol: 0.05, release: 0.05, filter: { type: 'lowpass', freq: 1800 }, bus: 'music' });
  }
  let fired = 0;
  const origin = (id) => world.areas[id].meta.origin;

  const style = document.createElement('style');
  style.textContent = `body.trailer #hud,body.trailer .ring,body.trailer .knob,body.trailer .btn,body.trailer .icons{display:none!important}
    body.trailer{cursor:none}
    #trailer-bars div{position:fixed;left:0;right:0;background:#000;z-index:12;pointer-events:none}`;
  document.head.appendChild(style);
  const bars = document.createElement('div'); bars.id = 'trailer-bars';
  const top = document.createElement('div'), bot = document.createElement('div');
  top.style.top = bot.style.bottom = '0';
  top.style.height = bot.style.height = `${TRAILER.bars * 100}vh`;
  bars.append(top, bot);

  const subjectPos = () => {
    const b = shot.subject && shot.subject !== 'juno' ? cast.byId[shot.subject] : null;
    return (b ?? { position: player.position }).position;
  };

  function aim(u) {
    const k = ease(u), a = shot.from, b = shot.to;
    subj.copy(subjectPos());
    const [dx, dz] = shot.pan ?? [0, 0], p = player.position, m = shot.both ? 0.5 : 0;
    state.subject = subj;
    state.focus = focus.set(subj.x + (p.x - subj.x) * m + dx * k, subj.y, subj.z + (p.z - subj.z) * m + dz * k);
    cam.set({ yaw: rad(a.yaw + (b.yaw - a.yaw) * k), pitch: rad(a.pitch + (b.pitch - a.pitch) * k), distance: a.dist + (b.dist - a.dist) * k });
  }

  async function run(first = 0) {
    state.active = true; state.mood = 'echo'; document.body.classList.add('trailer'); document.body.appendChild(bars);
    Object.assign(CUTAWAY, { radius: TRAILER.cutRadius, margin: TRAILER.cutMargin });
    onStart?.();
    for (let i = first; i < SHOTS.length && !stop; i++) {
      shot = SHOTS[i]; CUTAWAY.margin = shot.margin ?? TRAILER.cutMargin; for (const e of shot.events ?? []) e.done = false;
      const [ox, oz] = origin(shot.area), j = shot.juno;
      fade.black = true;
      world.jump(shot.area, [ox + j.at[0], oz + j.at[1], j.face ?? 0]);
      player.cancel();
      if (j.walk) player.walkTo(walkPt.set(ox + j.walk[0], 0, oz + j.walk[1]), 0.2);
      t = 0; fired = 0; aim(0);
      if (shot.mood) state.mood = shot.mood;
      if (shot.hit) hit(shot.hit);
      if (shot.riser) riser(shot.riser);
      cam.follow(focus, true); cam.snap();
      post.setEcho(0); post.setGlitch(0);
      if (shot.ui) sfx?.ui(shot.ui);
      if (shot.train != null) sfx?.trainNow(shot.train);
      fade.in(); // real-time fade, runs beside the shot
      if (shot.card) setTimeout(() => fade.card(shot.card, Math.max(0.8, shot.dur - 3.4), cardY()), 500);
      if (shot.end) setTimeout(() => fade.card([{ text: TRAILER.title, color: TRAILER.green, scale: 8 }, { text: TRAILER.tagline, color: TRAILER.cyan, scale: 3 }], TRAILER.endHold), (shot.dur - 2.2) * 1000); // once the camera is high and Juno is small
      await wait(shot.dur);
      if (!shot.end) { fade.out(); await wait(TRAILER.gap); }
    }
    post.setEcho(0); post.setGlitch(0); Object.assign(CUTAWAY, saved);
    state.active = false; state.focus = state.subject = null; document.body.classList.remove('trailer'); bars.remove();
  }

  window.addEventListener('keydown', (e) => { if (state.active && e.key === 'Escape') { stop = true; waitLeft = 0; resolveWait?.(); } });

  return Object.assign(state, {
    start: run,
    // Called each frame by main with the frame time.
    update(dt) {
      if (!state.active) return;
      t += dt;
      if (shot) {
        aim(Math.min(1, t / shot.dur));
        for (const e of shot.events ?? []) if (t >= e.t && !e.done) { e.done = true; if (e.hit) hit(e.hit); if (e.mood) state.mood = e.mood; }
        const kick = Math.max(0, TRAILER.kick * (1 - t / 0.35)); // a glitch burst on every cut
        if (shot.fx === 'echo') { // the seam: the world tears, then settles
          post.setEcho(Math.min(1, t / 1.2) * 0.9);
          post.setGlitch(t > 1.6 && t < 2.2 || t > 3 && t < 3.3 ? 0.85 : Math.max(kick, Math.max(0, Math.sin(t * 1.3)) * 0.12));
        } else post.setGlitch(kick);
      }
      if (resolveWait) { waitLeft -= dt; if (waitLeft <= 0) { const r = resolveWait; resolveWait = null; r(); } }
    },
  });
}
