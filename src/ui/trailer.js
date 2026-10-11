import * as THREE from 'three';
import { CUTAWAY } from '../render/fog.js';

// ?trailer: a scripted ~38 s teaser. Click once to start (browsers need the tap for audio), then record the screen. Esc stops it.
// ?trailer=4 starts at shot 4 (1-based) to check one shot quickly.
// Every number is in TRAILER / SHOTS so it can be tweaked without touching the logic.
export const TRAILER = {
  bars: 0.115,              // letterbox bar height as a fraction of screen height (0 = off)
  gap: 0.35,                // seconds of black between shots
  kick: 0.55,               // glitch burst at each hard cut (0 = off)
  cutRadius: 8.5, cutMargin: 0.25, // see-through cutaway while the trailer plays: wider than in play so nothing hides a character
  green: '#39ff14', cyan: '#1fd6e8', white: '#ffffff', red: '#ff3b5c',
  title: 'NEON ECHOES', tagline: 'A DETECTIVE GAME', endHold: 3.2,
};

const rad = THREE.MathUtils.degToRad;
const ease = (t) => t * t * (3 - 2 * t);
const H = Math.PI / 2;

// One shot = one area, one subject the camera looks at (and the see-through circle is centred on), one camera move.
//  area      street | platform | sable | alley | hostel | car
//  juno      { at: [x, z] local to the area, face: radians, walk: [x, z] local } where Juno stands / walks to
//  subject   'juno' (default) or a cast id (mamaTeo, dex, kit, preacher, vendor, miso ...)
//  from/to   camera yaw, pitch (degrees) and distance; the move eases between them
//  both      true = frame the subject and Juno together (focus on the midpoint)
//  pan       [dx, dz] world units the focus drifts away from the subject over the shot
//  card      pixel-font lines;  fx: 'echo' (seam glitch)  | 'ui' sound
const SHOTS = [
  // 1. Cold arrival: starts tight on Juno on the platform and pulls out to the empty station.
  { area: 'platform', juno: { at: [-0.5, -2], face: Math.PI }, dur: 4.2, from: { yaw: 40, pitch: 30, dist: 9 }, to: { yaw: 48, pitch: 34, dist: 26 }, ui: 'echoOn' },
  // 2. The street from the stairs: a long tracking pan beside her as she walks into the rain.
  { area: 'street', juno: { at: [13.8, 1.3], face: -H, walk: [-4, 1.6] }, dur: 6.5, from: { yaw: 25, pitch: 30, dist: 14 }, to: { yaw: 62, pitch: 36, dist: 22 }, pan: [-3, 0],
    card: [{ text: 'LOWMARKET. 23:40.', color: TRAILER.cyan, scale: 5 }, { text: 'THE RAIN NEVER STOPS.', color: TRAILER.white, scale: 4 }] },
  // 3. The Holo-preacher: slow zoom in on the hologram.
  { area: 'street', subject: 'preacher', juno: { at: [-4.8, 0.9], face: H * 3, walk: [-6.6, 0.5] }, dur: 4, from: { yaw: 50, pitch: 34, dist: 17 }, to: { yaw: 42, pitch: 30, dist: 8.5 },
    card: [{ text: 'THE CITY IS WATCHING.', color: TRAILER.red, scale: 4 }] },
  // 4. Mama Teo behind her counter: Juno steps in from the door, camera drifts across the room.
  { area: 'sable', subject: 'mamaTeo', juno: { at: [-4.6, 0], face: H, walk: [-3.0, -1.2] }, dur: 4.2, from: { yaw: 36, pitch: 50, dist: 13 }, to: { yaw: 46, pitch: 44, dist: 9.5 }, both: true },
  // 5. The back room: push in on the dead man.
  { area: 'sable', subject: 'dex', juno: { at: [2.2, 0.2], face: H, walk: [3.2, 0.1] }, dur: 4.4, from: { yaw: 42, pitch: 42, dist: 16 }, to: { yaw: 44, pitch: 34, dist: 7.5 },
    card: [{ text: 'ONE DEAD CORPO.', color: TRAILER.white, scale: 4 }, { text: 'ONE MISSING MEMORY.', color: TRAILER.green, scale: 4 }] },
  // 6. The echo: the world tears while Juno scans the room.
  { area: 'sable', juno: { at: [4.8, 1.6], face: -H }, dur: 4, from: { yaw: 36, pitch: 34, dist: 7 }, to: { yaw: 52, pitch: 36, dist: 15 }, fx: 'echo',
    card: [{ text: 'REPLAY THE PAST.', color: TRAILER.cyan, scale: 6 }] },
  // 7. Capsule hostel: Kit.
  { area: 'hostel', subject: 'kit', juno: { at: [0, 2.0], face: Math.PI, walk: [0.4, 1.3] }, dur: 3.4, from: { yaw: 50, pitch: 36, dist: 14 }, to: { yaw: 40, pitch: 30, dist: 8.5 }, ui: 'glitch' },
  // 8. Pull back over the street for the title.
  { area: 'street', juno: { at: [0, 1.8], face: Math.PI, walk: [3, 1.8] }, dur: 7.5, from: { yaw: 40, pitch: 32, dist: 16 }, to: { yaw: 60, pitch: 52, dist: 70 }, end: true },
];

export function createTrailer({ cam, world, player, post, fade, cast, sfx, onStart }) {
  const state = { active: false, focus: null, subject: null };
  let t = 0, stop = false, resolveWait = null, waitLeft = 0, shot = null;
  const focus = new THREE.Vector3(), subj = new THREE.Vector3(), walkPt = new THREE.Vector3();
  const saved = { ...CUTAWAY };

  // Waits in game time (frames), so a slow recording still keeps its pacing.
  const wait = (s) => new Promise((r) => { waitLeft = s; resolveWait = r; });
  const cardY = () => Math.round(window.innerHeight * (TRAILER.bars + 0.04)); // just above the bottom letterbox bar
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
    state.active = true; document.body.classList.add('trailer'); document.body.appendChild(bars);
    Object.assign(CUTAWAY, { radius: TRAILER.cutRadius, margin: TRAILER.cutMargin });
    onStart?.();
    for (let i = first; i < SHOTS.length && !stop; i++) {
      shot = SHOTS[i];
      const [ox, oz] = origin(shot.area), j = shot.juno;
      fade.black = true;
      world.jump(shot.area, [ox + j.at[0], oz + j.at[1], j.face ?? 0]);
      player.cancel();
      if (j.walk) player.walkTo(walkPt.set(ox + j.walk[0], 0, oz + j.walk[1]), 0.2);
      t = 0; aim(0);
      cam.follow(focus, true); cam.snap();
      post.setEcho(0); post.setGlitch(0);
      if (shot.ui) sfx?.ui(shot.ui);
      fade.in(); // real-time fade, runs beside the shot
      if (shot.card) setTimeout(() => fade.card(shot.card, Math.max(0.8, shot.dur - 3.4), cardY()), 500);
      if (shot.end) setTimeout(() => fade.card([{ text: TRAILER.title, color: TRAILER.green, scale: 8 }, { text: TRAILER.tagline, color: TRAILER.cyan, scale: 3 }], TRAILER.endHold), 3300); // once the camera is high and Juno is small
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
