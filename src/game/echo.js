import * as THREE from 'three';
import { ECHOES, HOTSPOTS, SPEAKERS } from './story.js';
import { createBillboard } from './npc.js';
import { frame } from '../ui/hud.js';

export const ECHO = {
  fadeSeconds: 0.5,     // world fades to / from the echo grade
  scrubSpeed: 2.5,      // seconds of echo per second with the stick / A-D held
  step: 0.25,           // D-pad step, seconds
  glitchSeconds: 0.2,   // seam stutter + pixel tear
  showRange: 7,         // hotspot markers appear within this distance of Juno
  marker: { color: 0x1fd6e8, size: 0.26, height: 1.5, bob: 0.12, spin: 1.2 },
};

const fmt = (t) => t.toFixed(1).padStart(4, '0');
const el = (tag, cls, parent, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
};

// Position / pose of a track at time t: linear between keys, held outside them.
export function sample(track, t) {
  const k = track.keys;
  if (t <= k[0].t) return { ...k[0] };
  if (t >= k[k.length - 1].t) return { ...k[k.length - 1] };
  let i = 0;
  while (k[i + 1].t <= t) i++;
  const a = k[i], b = k[i + 1], u = (t - a.t) / (b.t - a.t);
  const x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u;
  const facing = a.facing ?? (Math.hypot(b.x - a.x, b.z - a.z) > 1e-4 ? Math.atan2(b.x - a.x, b.z - a.z) : 0);
  return { x, z, facing, anim: a.anim ?? 'idle' };
}

// Echo mode: hotspot markers in the world, then a desaturated replay of ghost sprites with a scrub bar,
// seam glitches and tagging. Data lives in story.js (ECHOES / HOTSPOTS); format documented in NOTES.md.
export function createEcho({ scene, sheets, post, caseFile, hud, cast, areas }) {
  let areaId = null;
  // --- Hotspots and their floating markers ---
  const hotspots = [];
  const mGeo = new THREE.OctahedronGeometry(ECHO.marker.size), mMat = new THREE.MeshBasicMaterial({ color: ECHO.marker.color, transparent: true, opacity: 0.9, fog: false });
  for (const h of HOTSPOTS) {
    let x, z;
    if (Array.isArray(h.at)) [x, z] = h.at;
    else {
      const s = areas[h.area ?? 'street']?.spots.find((p) => p.name === h.at.spot);
      if (!s) { console.warn('echo: no spot', h.at.spot); continue; }
      [x, z] = [s.x + (h.at.dx ?? 0), s.z + (h.at.dz ?? 0)];
    }
    const marker = new THREE.Mesh(mGeo, mMat);
    marker.position.set(x, ECHO.marker.height, z);
    marker.visible = false;
    scene.add(marker);
    hotspots.push({ ...h, area: h.area ?? 'street', position: new THREE.Vector3(x, 0, z), marker });
  }

  // --- Scrub bar UI ---
  const root = el('div', '', document.body); root.id = 'echo';
  const title = el('div', 'echo-title nameplate', root);
  const caption = el('div', 'echo-caption', root);
  const tagBtn = frame(el('button', 'echo-tag', root));
  const tagTxt = el('span', '', tagBtn);
  const bar = frame(el('div', 'echo-bar', root));
  const playBtn = el('button', 'echo-btn', bar, '▶');
  const cur = el('span', 'echo-time', bar);
  const rail = el('div', 'echo-rail', bar);
  const fill = el('i', '', rail), head = el('b', '', rail);
  const total = el('span', 'echo-time', bar);
  const closeBtn = el('button', 'echo-btn', bar, '✕');

  let active = null, fade = 0, dragging = false;

  function setFromPointer(e) {
    const r = rail.getBoundingClientRect();
    active.t = Math.min(active.def.duration, Math.max(0, ((e.clientX - r.left) / r.width) * active.def.duration));
    crossSeams(active.last, active.t, true);
    active.last = active.t;
  }
  rail.addEventListener('pointerdown', (e) => { if (!active || active.cine) return; dragging = true; rail.setPointerCapture(e.pointerId); setFromPointer(e); });
  rail.addEventListener('pointermove', (e) => { if (dragging) setFromPointer(e); });
  rail.addEventListener('pointerup', () => { dragging = false; });
  rail.addEventListener('pointercancel', () => { dragging = false; });
  playBtn.addEventListener('click', () => { if (active && !active.cine) active.playing = !active.playing; });
  closeBtn.addEventListener('click', () => { if (!active?.cine) api.exit(); });
  tagBtn.addEventListener('click', () => doTag());

  function crossSeams(a, b, scrubbed) {
    if (a === b) return;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    for (const s of active.def.seams ?? []) {
      if (s >= lo && s <= hi) {
        active.glitch = ECHO.glitchSeconds; active.seen.add(s); api.onUi?.('glitch');
        if (!scrubbed && active.playing) active.freeze = ECHO.glitchSeconds; // the replay stutters
      }
    }
  }

  const tagNear = () => active.def.tags?.find((g) => !active.tagged.has(g.fact) && Math.abs(active.t - g.t) <= g.window);
  function doTag() {
    const g = active && !active.cine && tagNear();
    if (!g) return false;
    active.tagged.add(g.fact);
    caseFile.add(g.fact);
    return true;
  }

  function buildBar() {
    rail.querySelectorAll('.seam, .tagmark').forEach((n) => n.remove());
    for (const s of active.def.seams ?? []) { const n = el('u', 'seam', rail); n.style.left = `${(s / active.def.duration) * 100}%`; n.dataset.t = s; }
    for (const g of active.def.tags ?? []) { const n = el('s', 'tagmark', rail); n.style.left = `${(g.t / active.def.duration) * 100}%`; n.dataset.f = g.fact; }
  }

  const api = {
    get active() { return !!active; },
    hotspots,
    setArea(id) { areaId = id; },
    // Starts the echo of the hotspot within reach of pos; false (and a toast) when there is none.
    tryStart(pos) {
      const h = hotspots.filter((q) => !q.hidden && q.area === areaId && Math.hypot(q.position.x - pos.x, q.position.z - pos.z) <= q.radius)
        .sort((a, b) => a.position.distanceTo(pos) - b.position.distanceTo(pos))[0];
      if (!h) { hud.toast('No echo here'); return false; }
      api.start(h.id);
      return true;
    },
    // cine: a function = cinematic play (no scrubbing, no exit, no loop); it is called when the replay ends.
    start(hotspotId, cine) {
      const h = hotspots.find((q) => q.id === hotspotId), def = h && ECHOES[h.echo];
      if (!def) return;
      const ghosts = def.tracks.map((tr) => {
        const b = createBillboard(sheets[tr.sprite], { ghost: true, x: tr.keys[0].x, z: tr.keys[0].z });
        scene.add(b.root);
        return { b, tr };
      });
      active = { def, t: 0, last: 0, playing: true, freeze: 0, glitch: 0, tagged: new Set(), seen: new Set(), ghosts, cine };
      cast.setHidden(true);
      document.body.classList.add('echo');
      root.classList.add('on');
      title.textContent = `Echo · ${def.title}`;
      total.textContent = fmt(def.duration);
      buildBar();
      if (def.entry) caseFile.add(def.entry);
      api.onUi?.('echoOn');
    },
    exit() {
      if (!active) return;
      for (const { b } of active.ghosts) {
        scene.remove(b.root);
        b.root.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      }
      active = null; dragging = false;
      cast.setHidden(false);
      document.body.classList.remove('echo');
      root.classList.remove('on');
      post.setGlitch(0);
      api.onUi?.('echoOff');
    },
    // Every frame. axis = scrub input (-1..1, stick / A-D); lights for ghost tinting.
    update(dt, input, camYaw, lights, axis, playerPos) {
      // World grade fade in / out.
      const target = active ? 1 : 0;
      fade += Math.max(-dt / ECHO.fadeSeconds, Math.min(dt / ECHO.fadeSeconds, target - fade));
      post.setEcho(fade);
      // Hotspot markers: bob and spin while Juno is near.
      const time = performance.now() / 1000;
      for (const h of hotspots) {
        h.marker.visible = !active && !h.hidden && h.area === areaId && Math.hypot(h.position.x - playerPos.x, h.position.z - playerPos.z) < ECHO.showRange;
        h.marker.rotation.y = time * ECHO.marker.spin;
        h.marker.position.y = ECHO.marker.height + Math.sin(time * 2) * ECHO.marker.bob;
      }
      if (!active) return;

      const A = active, D = A.def;
      if (!A.cine && (input.pressed('echo') || input.pressed('back') || input.pressed('pause'))) { api.exit(); return; }
      let scrubbing = dragging && !A.cine;
      if (!A.cine && Math.abs(axis) > 0.2) { A.t += axis * ECHO.scrubSpeed * dt; scrubbing = true; }
      if (!A.cine && input.pressed('menuLeft')) A.t -= ECHO.step;
      if (!A.cine && input.pressed('menuRight')) A.t += ECHO.step;
      if (!A.cine && input.pressed('interact') && !doTag()) A.playing = !A.playing;
      A.t = Math.min(D.duration, Math.max(0, A.t));

      A.freeze = Math.max(0, A.freeze - dt);
      if (A.playing && !scrubbing && A.freeze <= 0) {
        A.t += dt;
        if (A.cine && A.t >= D.duration) { const done = A.cine; api.exit(); done(); return; }
        if (A.t >= D.duration) { A.t = 0; A.last = 0; } // loop
      }
      crossSeams(A.last, A.t, scrubbing);
      A.last = A.t;
      A.glitch = Math.max(0, A.glitch - dt);
      post.setGlitch(A.glitch / ECHO.glitchSeconds);

      // Ghosts follow their keyframes.
      const moving = A.playing && !scrubbing && A.freeze <= 0;
      for (const { b, tr } of A.ghosts) {
        const show = !tr.show || (A.t >= tr.show[0] && A.t <= tr.show[1]);
        b.root.visible = show;
        const s = sample(tr, A.t);
        b.position.set(s.x, 0, s.z);
        b.facing = s.facing; b.anim = s.anim; b.fpsScale = moving ? 1 : 0;
        b.update(dt, camYaw, lights);
      }

      // UI.
      const pct = `${(A.t / D.duration) * 100}%`;
      head.style.left = pct; fill.style.width = pct;
      cur.textContent = fmt(A.t);
      playBtn.textContent = A.playing ? '❚❚' : '▶';
      rail.querySelectorAll('.seam').forEach((n) => n.classList.toggle('seen', A.seen.has(+n.dataset.t)));
      rail.querySelectorAll('.tagmark').forEach((n) => n.classList.toggle('done', A.tagged.has(n.dataset.f)));
      const v = D.voices?.find((q) => A.t >= q.t0 && A.t <= q.t1);
      caption.textContent = v ? `${SPEAKERS[v.speaker]?.name ?? v.speaker}: “${v.text}”` : '';
      caption.style.visibility = v ? 'visible' : 'hidden';
      const g = tagNear();
      const hint = input.lastDevice === 'gamepad' ? (input.padType === 'playstation' ? '×' : 'A') : input.lastDevice === 'keyboard' ? 'Space' : '';
      tagTxt.textContent = g ? `${hint ? `[${hint}] ` : ''}Tag: ${g.label}` : '';
      tagBtn.style.display = g ? 'block' : 'none';
    },
  };
  return api;
}
