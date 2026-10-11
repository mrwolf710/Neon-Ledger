import * as THREE from 'three';

// ?trailer: a scripted 40 s teaser. Click once to start (browsers need the tap for audio), then record the screen.
// Esc or a second tap stops it. All numbers are in TRAILER / SHOTS so they can be tweaked without touching the logic.
export const TRAILER = {
  bars: 0.115,              // letterbox bar height as a fraction of screen height (0 = off)
  fadeSeconds: 0.9,         // black fade between shots
  green: '#39ff14', cyan: '#1fd6e8', white: '#ffffff',
  title: 'NEON ECHOES', tagline: 'A DETECTIVE GAME', endHold: 4,
};

const rad = THREE.MathUtils.degToRad;
const ease = (t) => t * t * (3 - 2 * t);

// Camera moves: from/to hold the focus point (x, z), yaw/pitch in degrees and distance. follow: look at Juno instead of a fixed point.
// walk: [x, z] Juno walks to. spawn: [x, z, facing] where Juno appears when the shot starts.
// card: [{ text, color, scale }] pixel-font lines shown over the shot.
const SHOTS = [
  { area: 'platform', spawn: [-1, -2, Math.PI], dur: 5, from: { x: -1, z: -2, yaw: 40, pitch: 22, dist: 34 }, to: { x: -1, z: -2, yaw: 52, pitch: 18, dist: 20 } },
  { area: 'street', spawn: [13.8, 1.3, Math.PI * 1.5], walk: [-7, 1.6], dur: 8, follow: true, from: { yaw: 35, pitch: 16, dist: 18 }, to: { yaw: 70, pitch: 20, dist: 15 },
    card: [{ text: 'LOWMARKET. 23:40.', color: TRAILER.cyan, scale: 5 }, { text: 'THE RAIN NEVER STOPS.', color: TRAILER.white, scale: 4 }] },
  { area: 'street', spawn: [-3, 1.6, Math.PI * 1.5], dur: 5, from: { x: -9.5, z: -2.2, yaw: 20, pitch: 10, dist: 16 }, to: { x: -9.5, z: -2.2, yaw: 5, pitch: 14, dist: 9 } },
  { area: 'sable', spawn: [-1.0, 0.5, Math.PI / 2], walk: [3, 0.5], dur: 6, from: { x: 0, z: 0, yaw: 35, pitch: 28, dist: 18 }, to: { x: 4, z: 0.5, yaw: 50, pitch: 24, dist: 12 },
    card: [{ text: 'EVERY MEMORY HAS A SEAM.', color: TRAILER.white, scale: 4 }] },
  { area: 'sable', spawn: [2.6, 1.2, Math.PI / 2], echo: true, dur: 6, from: { x: 4.8, z: 1.0, yaw: 30, pitch: 18, dist: 13 }, to: { x: 4.8, z: 1.0, yaw: 40, pitch: 14, dist: 7 },
    card: [{ text: 'FIND IT.', color: TRAILER.green, scale: 6 }] },
  { area: 'street', spawn: [0, 1.6, Math.PI], dur: 6, from: { x: 0, z: 0, yaw: 45, pitch: 30, dist: 28 }, to: { x: 0, z: 0, yaw: 65, pitch: 55, dist: 70 }, end: true },
];

export function createTrailer({ cam, world, player, post, fade, hud, onStart }) {
  const state = { active: false, focus: null, shot: null };
  let t = 0, stop = false, resolveWait = null, waitLeft = 0;
  const f = new THREE.Vector3();

  // Waits in game time (frames), so a slow recording still keeps its pacing.
  const wait = (s) => new Promise((r) => { waitLeft = s; resolveWait = r; });

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

  function setCam(shot, u) {
    const a = shot.from, b = shot.to, k = ease(u), L = (p) => a[p] + (b[p] - a[p]) * k;
    if (shot.follow) state.focus = null; else state.focus = f.set(L('x'), 0, L('z'));
    cam.set({ yaw: rad(a.yaw + (b.yaw - a.yaw) * k), pitch: rad(a.pitch + (b.pitch - a.pitch) * k), distance: a.dist + (b.dist - a.dist) * k });
  }

  async function run() {
    state.active = true; document.body.classList.add('trailer'); document.body.appendChild(bars);
    onStart?.();
    for (const shot of SHOTS) {
      if (stop) break;
      state.shot = shot;
      fade.black = true;
      world.jump(shot.area, shot.spawn ?? null);
      player.cancel();
      if (shot.walk) player.walkTo(new THREE.Vector3(shot.walk[0], 0, shot.walk[1]), 0.2);
      t = 0; setCam(shot, 0);
      cam.follow(shot.follow ? player.position : (state.focus ?? player.position), true);
      cam.snap();
      post.setEcho(0); post.setGlitch(0);
      fade.in(); // real-time fade, runs beside the shot
      if (shot.card) setTimeout(() => fade.card(shot.card, Math.max(1, shot.dur - 3.6)), 700);
      await wait(shot.dur);
      if (!shot.end) fade.out();
      await wait(TRAILER.fadeSeconds * 0.5);
    }
    if (!stop) {
      await fade.card([{ text: TRAILER.title, color: TRAILER.green, scale: 8 }, { text: TRAILER.tagline, color: TRAILER.cyan, scale: 3 }], TRAILER.endHold);
    }
    post.setEcho(0); post.setGlitch(0);
    state.active = false; state.focus = null; document.body.classList.remove('trailer'); bars.remove();
  }

  window.addEventListener('keydown', (e) => { if (state.active && e.key === 'Escape') { stop = true; waitLeft = 0; resolveWait?.(); } });

  return Object.assign(state, {
    start: run,
    // Called each frame by main with the frame time.
    update(dt) {
      if (!state.active) return;
      t += dt;
      const shot = state.shot;
      if (shot) {
        const u = Math.min(1, t / shot.dur);
        setCam(shot, u);
        if (shot.echo) { // the seam: the world tears, then settles
          const wave = Math.max(0, Math.sin(t * 1.3)) ;
          post.setEcho(Math.min(1, t / 1.5) * 0.9);
          post.setGlitch(t > 2.5 && t < 3.2 || t > 4.2 && t < 4.5 ? 0.8 : wave * 0.12);
        }
      }
      if (resolveWait) { waitLeft -= dt; if (waitLeft <= 0) { const r = resolveWait; resolveWait = null; r(); } }
    },
  });
}
