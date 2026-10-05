import { buildAreas, EXITS, placeAt } from '../world/areas.js';
import { createCollision } from '../world/collision.js';

// Owns every area. Areas are built once and sit far apart in world space; entering one hides the others,
// swaps collision and moves the player. onEnter(area, spawn) lets main re-point everything else.
export function createWorld({ scene, rng, lights, fog, fade, start = 'platform', onEnter }) {
  const areas = buildAreas(rng);
  for (const a of Object.values(areas)) {
    a.collision = createCollision(a.blocks, a.bounds, { road: a.road });
    a.group.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = !o.material.transparent; } });
    lights.register(a.lights);
    fog.patch(a.group);
    scene.add(a.group);
    a.group.visible = false;
  }
  let current = areas[start], busy = false;
  current.group.visible = true;

  // Breadth-first over the door graph: which exit in `from` leads toward `to`.
  function routeExit(from, to) {
    if (from === to) return null;
    const prev = new Map([[from, null]]), q = [from];
    while (q.length) {
      const id = q.shift();
      if (id === to) break;
      for (const e of EXITS.filter((x) => x.area === id)) if (!prev.has(e.to)) { prev.set(e.to, e); q.push(e.to); }
    }
    let step = prev.get(to);
    if (!step) return null;
    while (prev.get(step.area)) step = prev.get(step.area);
    return step;
  }

  const api = {
    areas, exits: EXITS,
    get current() { return current; },
    get busy() { return busy; },
    routeExit,
    spot: (area, name) => areas[area].spots.find((s) => s.name === name),
    placeAt: (x, z) => placeAt(current, x, z),
    // Fade out, switch, fade in. spawn = [x, z, facing].
    async enter(id, spawn) {
      if (busy || !areas[id]) return;
      busy = true;
      await fade.out();
      api.jump(id, spawn);
      await fade.in();
      busy = false;
    },
    // Switch right now (no fade): first load, debug skips.
    jump(id, spawn) {
      current.group.visible = false;
      current = areas[id];
      current.group.visible = true;
      onEnter?.(current, spawn);
    },
  };
  return api;
}
