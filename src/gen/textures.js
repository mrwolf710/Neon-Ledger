import * as THREE from 'three';
import { PALETTE as P } from './palette.js';

// Procedural surface textures. Each generator takes (rng, widthUnits, heightUnits) and returns
// { map, roughnessMap } as seamless tiles at 16 px per unit. Colours come from palette ramps
// (ordered-dithered between entries), so every pixel is already palette-snapped.
export const TEXTURES = {
  pxPerUnit: 16,
  dither: 0.9, // 0 = hard bands, 1 = full Bayer spread between ramp steps
  brick: { w: 8, h: 4, ramp: [P.rust0, P.rust1, P.rust2, P.rust3], mortar: [P.grey1, P.grey2], rough: 0.85 },
  concrete: { seam: 32, ramp: [P.grey1, P.grey2, P.grey3, P.grey4], rough: [0.65, 0.95] },
  tiles: { size: 4, ramp: [P.deepTeal, P.teal, P.seaGlass], grout: [P.grey1, P.grey2], missing: 0.04, rough: 0.35 },
  metalPanel: { w: 16, h: 32, ramp: [P.grey1, P.grey2, P.grey3, P.grey4], rust: [P.rust0, P.rust1, P.rust2], rough: 0.5 },
  wetAsphalt: { ramp: [P.ink, P.night, P.grey0, P.grey1, P.grey2], puddle: [P.ink, P.night, P.indigo], puddleLevel: 0.38, rough: [0.05, 0.9] },
  awning: { stripe: 4, pairs: [[P.magentaDeep, P.magenta], [P.cyanDeep, P.seaGlass], [P.sodium0, P.amber], [P.indigo, P.violet]], rough: 0.9 },
  sidewalk: { slab: 16, ramp: [P.grey2, P.grey3, P.grey4, P.grey5], seam: [P.grey0, P.grey1], rough: [0.4, 0.75] },
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (i, n) => ((i % n) + n) % n;

// Periodic value noise over a w x h pixel tile, lattice cells of cx x cy pixels.
function noise(rng, w, h, cx, cy = cx) {
  const gw = Math.max(1, Math.round(w / cx)), gh = Math.max(1, Math.round(h / cy));
  const g = Array.from({ length: gw * gh }, () => rng.rand());
  const at = (i, j) => g[wrap(j, gh) * gw + wrap(i, gw)];
  return (x, y) => {
    const fx = (x * gw) / w, fy = (y * gh) / h;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = smooth(fx - x0), ty = smooth(fy - y0);
    return lerp(lerp(at(x0, y0), at(x0 + 1, y0), tx), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), tx), ty);
  };
}

function fbm(rng, w, h, cells) {
  const ns = cells.map((c) => noise(rng, w, h, c));
  const total = ns.reduce((s, _, i) => s + 0.5 ** i, 0);
  return (x, y) => ns.reduce((s, n, i) => s + n(x, y) * 0.5 ** i, 0) / total;
}

// Per-cell random values on a wrapped grid (one value per brick / tile / slab).
function cells(rng, nx, ny) {
  const v = Array.from({ length: nx * ny }, () => rng.rand());
  return (i, j) => v[wrap(j, ny) * nx + wrap(i, nx)];
}

function makeTexture(canvas, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// px(x, y) -> [v 0..1 along ramp, roughness 0..1, ramp]. Runs row-major so rng use is deterministic.
function paint(wu, hu, px) {
  const w = wu * TEXTURES.pxPerUnit, h = hu * TEXTURES.pxPerUnit;
  const make = () => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const cc = make(), rc = make();
  const cctx = cc.getContext('2d'), rctx = rc.getContext('2d');
  const col = cctx.createImageData(w, h), rough = rctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [v, r, ramp] = px(x, y);
      const n = ramp.length - 1;
      const k = Math.min(n, Math.max(0, Math.round(v * n + BAYER[(y & 3) * 4 + (x & 3)] * TEXTURES.dither)));
      const c = ramp[k], o = (y * w + x) * 4;
      col.data[o] = (c >> 16) & 255; col.data[o + 1] = (c >> 8) & 255; col.data[o + 2] = c & 255; col.data[o + 3] = 255;
      rough.data[o] = rough.data[o + 1] = rough.data[o + 2] = Math.round(Math.min(1, Math.max(0, r)) * 255);
      rough.data[o + 3] = 255;
    }
  }
  cctx.putImageData(col, 0, 0);
  rctx.putImageData(rough, 0, 0);
  const map = makeTexture(cc, true), roughnessMap = makeTexture(rc, false);
  // UVs are in world units (see district.js), so one tile spans wu x hu units.
  map.repeat.set(1 / wu, 1 / hu);
  roughnessMap.repeat.copy(map.repeat);
  return { map, roughnessMap };
}

const GENERATORS = {
  brick(rng, wu, hu) {
    const B = TEXTURES.brick, w = wu * 16, h = hu * 16;
    const shade = cells(rng, w / B.w, h / B.h), grit = fbm(rng, w, h, [8, 2]);
    const streak = noise(rng, w, h, 3, h);
    return paint(wu, hu, (x, y) => {
      const row = Math.floor(y / B.h), ox = x + (row & 1 ? B.w / 2 : 0);
      if (y % B.h === 0 || ox % B.w === 0) return [grit(x, y), 0.95, B.mortar];
      const v = 0.2 + shade(Math.floor(ox / B.w), row) * 0.6 + (grit(x, y) - 0.5) * 0.5 - streak(x, y) * 0.25;
      return [v, B.rough, B.ramp];
    });
  },

  concrete(rng, wu, hu) {
    const C = TEXTURES.concrete, w = wu * 16, h = hu * 16;
    const base = fbm(rng, w, h, [16, 6, 2]), stain = noise(rng, w, h, 4, 24);
    return paint(wu, hu, (x, y) => {
      if (x % C.seam === 0 || y % C.seam === 0) return [0, C.rough[1], C.ramp];
      const hole = x % C.seam === C.seam / 2 && y % (C.seam / 2) === C.seam / 4;
      const v = hole ? 0 : base(x, y) * 1.1 - stain(x, y) * 0.35 + 0.1;
      return [v, lerp(C.rough[0], C.rough[1], v), C.ramp];
    });
  },

  tiles(rng, wu, hu) {
    const T = TEXTURES.tiles, w = wu * 16, h = hu * 16;
    const shade = cells(rng, w / T.size, h / T.size), grime = fbm(rng, w, h, [16, 4]);
    return paint(wu, hu, (x, y) => {
      if (x % T.size === 0 || y % T.size === 0) return [grime(x, y), 0.9, T.grout];
      const s = shade(Math.floor(x / T.size), Math.floor(y / T.size));
      if (s < T.missing) return [0.2, 0.95, T.grout];
      const gloss = x % T.size === 1 && y % T.size === 1 ? 0.3 : 0; // highlight pixel per tile
      return [0.25 + s * 0.5 - grime(x, y) * 0.3 + gloss, T.rough, T.ramp];
    });
  },

  metalPanel(rng, wu, hu) {
    const M = TEXTURES.metalPanel, w = wu * 16, h = hu * 16;
    const shade = cells(rng, w / M.w, h / M.h), rust = noise(rng, w, h, 2, 20), grit = fbm(rng, w, h, [8, 2]);
    return paint(wu, hu, (x, y) => {
      const px = x % M.w, py = y % M.h;
      if (px === 0 || py === 0) return [0, 0.7, M.ramp];
      if ((px === 2 || px === M.w - 2) && (py === 2 || py === M.h - 2)) return [1, 0.3, M.ramp]; // rivets
      const r = rust(x, y) * grit(x, y);
      if (r > 0.45) return [(r - 0.45) * 3, 0.9, M.rust];
      return [0.3 + shade(Math.floor(x / M.w), Math.floor(y / M.h)) * 0.4 + (grit(x, y) - 0.5) * 0.3, M.rough, M.ramp];
    });
  },

  wetAsphalt(rng, wu, hu) {
    const A = TEXTURES.wetAsphalt, w = wu * 16, h = hu * 16;
    const base = fbm(rng, w, h, [12, 3, 1]), wet = fbm(rng, w, h, [32, 12]);
    return paint(wu, hu, (x, y) => {
      const d = wet(x, y);
      if (d < A.puddleLevel) return [d / A.puddleLevel, A.rough[0], A.puddle];
      const v = base(x, y);
      // darker asphalt reads as damp: lower roughness
      return [v, lerp(A.rough[0] + 0.3, A.rough[1], v), A.ramp];
    });
  },

  // Striped cloth; colour pair picked from the seed, so different forks give different awnings.
  awning(rng, wu, hu) {
    const A = TEXTURES.awning, w = wu * 16, h = hu * 16;
    const ramp = rng.pick(A.pairs), grime = fbm(rng, w, h, [8, 2]);
    return paint(wu, hu, (x, y) => [(Math.floor(x / A.stripe) & 1) * 0.8 + (grime(x, y) - 0.5) * 0.6 + 0.1, A.rough, ramp]);
  },

  sidewalk(rng, wu, hu) {
    const S = TEXTURES.sidewalk, w = wu * 16, h = hu * 16;
    const shade = cells(rng, w / S.slab, h / S.slab), grit = fbm(rng, w, h, [8, 2]);
    return paint(wu, hu, (x, y) => {
      if (x % S.slab === 0 || y % S.slab === 0) return [grit(x, y), S.rough[0], S.seam]; // wet seams
      const v = 0.2 + shade(Math.floor(x / S.slab), Math.floor(y / S.slab)) * 0.5 + (grit(x, y) - 0.5) * 0.4;
      return [v, lerp(S.rough[0], S.rough[1], v), S.ramp];
    });
  },
};

const cache = new Map();

// Cached by (name, seed, size); output depends only on that key. Tile sizes must be whole units.
export function getTexture(name, rng, wu, hu) {
  const key = `${name}:${rng.seed}:${wu}x${hu}`;
  if (!cache.has(key)) cache.set(key, GENERATORS[name](rng.fork(key), wu, hu));
  return cache.get(key);
}
