// node scripts/where.mjs — prints where the CAST and named spots land for the current seed.
const ctx = new Proxy({}, { get: (t, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h })
  : k === 'measureText' ? () => ({ width: 10 }) : () => ctx), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
const { rng } = await import('../src/core/rng.js');
const { buildDistrict, CAST } = await import('../src/world/district.js');
const g = buildDistrict(rng.fork('district'));
console.log('spots', JSON.stringify(g.userData.spots.map((s) => ({ ...s, x: +s.x.toFixed(2), z: +s.z.toFixed(2), facing: +s.facing.toFixed(2) }))));
console.log('cast', JSON.stringify(CAST.map((c) => [c.id, c.at])));
