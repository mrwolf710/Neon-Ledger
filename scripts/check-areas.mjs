// node scripts/check-areas.mjs — builds every area (no browser) and checks that doors, spawn points and clues can be reached on foot.
import assert from 'node:assert';
const ctx = new Proxy({}, { get: (t, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h })
  : k === 'measureText' ? () => ({ width: 10 }) : () => ctx), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
const { rng } = await import('../src/core/rng.js');
const { buildAreas, EXITS, AREAS } = await import('../src/world/areas.js');
const { createCollision } = await import('../src/world/collision.js');

const areas = buildAreas(rng);
const R = 0.3; // Juno's radius
for (const [id, a] of Object.entries(areas)) {
  a.collision = createCollision(a.blocks, a.bounds, { road: a.road });
  assert.ok(a.spots.length || id === 'street', `${id}: has spots`);
}
const free = (id, x, z) => !areas[id].collision.hits(x, z, R);

// Doors and where they drop you must be standable.
for (const e of EXITS) {
  assert.ok(free(e.area, e.at[0], e.at[1]), `exit ${e.id} sits on open floor of ${e.area} (${e.at})`);
  assert.ok(free(e.to, e.spawn[0], e.spawn[1]), `exit ${e.id} lands on open floor of ${e.to} (${e.spawn.slice(0, 2)})`);
}

// Flood fill on a 0.25 grid from a spawn: every exit and clue of the area has to be within reach (1.4 units of a reachable point).
function reach(id, start) {
  const c = areas[id].collision, step = 0.25, b = c.bounds, seen = new Set(), pts = [];
  const key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const q = [[start[0], start[1]]];
  seen.add(key(...q[0]));
  while (q.length) {
    const [x, z] = q.pop(); pts.push([x, z]);
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz);
      if (seen.has(k) || nx < b.x0 || nx > b.x1 || nz < b.z0 || nz > b.z1 || c.hits(nx, nz, R)) continue;
      seen.add(k); q.push([nx, nz]);
    }
  }
  return (x, z, r = 1.4) => pts.some(([px, pz]) => Math.hypot(px - x, pz - z) <= r);
}
const START = { street: [-0.3, -3.3], platform: null, sable: null, alley: null, hostel: null, car: null };
for (const e of EXITS) if (!START[e.to]) START[e.to] = e.spawn;
START.platform = areas.platform.spots.find((s) => s.name === 'start') ? [areas.platform.spots.find((s) => s.name === 'start').x, areas.platform.spots.find((s) => s.name === 'start').z] : START.platform;
for (const [id, a] of Object.entries(areas)) {
  const can = reach(id, START[id]);
  for (const e of EXITS.filter((x) => x.area === id)) assert.ok(can(e.at[0], e.at[1], 0.6), `${id}: exit ${e.id} reachable`);
  for (const s of a.spots.filter((q) => q.name !== 'trainstop')) assert.ok(can(s.x, s.z, 1.5), `${id}: spot ${s.name} within reach (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`);
  for (const e of EXITS.filter((x) => x.to === id)) assert.ok(can(e.spawn[0], e.spawn[1], 0.4), `${id}: spawn from ${e.id} connects to the rest`);
}
// Lights and groups exist.
assert.ok(areas.sable.lights.length >= 3 && areas.alley.lights.length >= 2, 'interior lights registered');
assert.ok(Object.keys(AREAS).every((id) => areas[id].group), 'every area has a group');
console.log('areas ok');
