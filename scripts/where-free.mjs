// node scripts/where-free.mjs — prints the free stretches of each street sidewalk (where a door marker can go).
const ctx = new Proxy({}, { get: (t, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }) : k === 'measureText' ? () => ({ width: 10 }) : () => ctx), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
const { rng } = await import('../src/core/rng.js');
const { buildAreas } = await import('../src/world/areas.js');
const { createCollision } = await import('../src/world/collision.js');
const a = buildAreas(rng).street, c = createCollision(a.blocks, a.bounds);
for (const z of [-4.15, 4.15]) {
  const runs = []; let start = null;
  for (let x = -19.5; x <= 19.5; x += 0.1) {
    const ok = !c.hits(x, z, 0.35);
    if (ok && start === null) start = x;
    if ((!ok || x > 19.4) && start !== null) { if (x - start > 1.2) runs.push(`${start.toFixed(1)}..${(x - 0.1).toFixed(1)}`); start = null; }
  }
  console.log(`z=${z}: free x ranges ${runs.join('  ')}`);
}
console.log('buildings (lot centers every 8, from -16): x = -16 -8 0 8 16 on each side');
