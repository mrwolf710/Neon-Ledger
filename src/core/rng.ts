// Seeded randomness. All game randomness must come from here so a seed rebuilds the same city.
export const SEED = 1337;

function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a of the label mixed with the parent seed: forks depend only on (seed, label), not call order.
function hash(label, seed) {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function createRng(seed) {
  const next = mulberry32(seed);
  return {
    seed,
    rand: next,                                           // [0, 1)
    range: (a, b) => a + (b - a) * next(),                // [a, b)
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),  // [a, b] inclusive
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    weighted(table) {                                     // { key: weight } -> key
      const entries = Object.entries(table);
      let r = next() * entries.reduce((s, [, w]) => s + w, 0);
      for (const [k, w] of entries) if ((r -= w) < 0) return k;
      return entries[0][0];
    },
    fork: (label) => createRng(hash(label, seed)),
  };
}

export const rng = createRng(SEED);
