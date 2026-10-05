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
  // Lit shop interior seen through the glass: light strip, shelves of goods, dark counter. Tile 4 x 2 units.
  shop: { light: 2, lamps: [2, 4], poolW: 22, poolH: 20, pool: 0.3, back: 0.1, counter: [7, 10],
    sectionW: [12, 32], sections: { shelves: 6, fridge: 2, door: 1, menu: 1, empty: 1 },
    shelfGap: [4, 7], itemW: [2, 6], emptyChance: 0.3, fridgeDoor: 8, keeperChance: 0.5,
    warm: [P.rust0, P.rust2, P.sodium0, P.amber, P.amberLight], cool: [P.deepTeal, P.cyanDeep, P.teal, P.cyan, P.cyanLight] },
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

// Lit shop interior seen through the glass. Built as a pixel buffer: dark back wall, ceiling lamps with light pools,
// then random sections across the width (shelves of mixed goods, a fridge in the other ramp, a doorway, a menu board,
// empty wall), a counter along the bottom and maybe a shopkeeper silhouette. alt = the contrasting ramp.
function shopInterior(rng, wu, hu, ramp, alt) {
  const S = TEXTURES.shop, w = wu * 16, h = hu * 16;
  const val = new Float32Array(w * h), useAlt = new Uint8Array(w * h);
  const rect = (x0, y0, x1, y1, v, other = 0) => {
    for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) { val[y * w + x] = v; useAlt[y * w + x] = other; }
    }
  };
  const haze = noise(rng, w, h, 16, 8);
  const lamps = Array.from({ length: rng.int(...S.lamps) }, () => rng.int(4, w - 4));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pool = lamps.reduce((m, lx) => Math.max(m, 1 - Math.hypot((x - lx) / S.poolW, y / S.poolH)), 0);
      val[y * w + x] = S.back + haze(x, y) * 0.08 + Math.max(0, pool) * S.pool;
    }
  }
  const counterY = h - rng.int(...S.counter);
  for (let x = 0; x < w;) {
    const sw = Math.min(w - x, rng.int(...S.sectionW)), kind = rng.weighted(S.sections);
    if (kind === 'shelves') {
      for (let y = S.light + 1; y < counterY - 2;) {
        const gap = rng.int(...S.shelfGap);
        rect(x, y + gap, x + sw, y + gap + 1, 0.08);                       // plank
        for (let gx = x + 1; gx < x + sw - 1;) {
          const iw = rng.int(...S.itemW), ih = rng.int(1, gap - 1);
          if (rng.rand() > S.emptyChance) rect(gx, y + gap - ih, Math.min(gx + iw, x + sw - 1), y + gap, rng.range(0.45, 0.95));
          gx += iw + rng.int(0, 1);
        }
        y += gap + 1;
      }
    } else if (kind === 'fridge') {
      rect(x + 1, S.light + 2, x + sw - 1, counterY, 0.85, 1);
      for (let fx = x + 1 + S.fridgeDoor; fx < x + sw - 1; fx += S.fridgeDoor) rect(fx, S.light + 2, fx + 1, counterY, 0.3, 1);
      for (let fy = S.light + 6; fy < counterY; fy += 5) rect(x + 1, fy, x + sw - 1, fy + 1, 0.55, 1);
    } else if (kind === 'door') {
      rect(x + 2, S.light + 4, x + Math.min(sw, 12) - 2, h, 0.02);
    } else if (kind === 'menu') {
      rect(x + 2, S.light + 2, x + sw - 2, S.light + 9, 0.95);
      for (let my = S.light + 4; my < S.light + 8; my += 2) {
        for (let mx = x + 4; mx < x + sw - 4; mx += rng.int(3, 6)) rect(mx, my, mx + rng.int(1, 3), my + 1, 0.2);
      }
    }
    x += sw;
  }
  rect(0, counterY, w, counterY + 1, 0.5);                                 // counter top edge
  rect(0, counterY + 1, w, h, 0.05);                                       // counter front
  if (rng.rand() < S.keeperChance) {                                       // shopkeeper behind the counter
    const kx = rng.int(8, w - 12);
    rect(kx, counterY - 5, kx + 8, counterY, 0.03);
    rect(kx + 2, counterY - 9, kx + 6, counterY - 5, 0.03);
  }
  for (const lx of lamps) rect(lx - 3, 0, lx + 3, S.light, 1);             // lamp fixtures
  return paint(wu, hu, (x, y) => [val[y * w + x], 1, useAlt[y * w + x] ? alt : ramp]);
}

const GENERATORS = {
  shopWarm: (rng, wu, hu) => shopInterior(rng, wu, hu, TEXTURES.shop.warm, TEXTURES.shop.cool),
  shopCool: (rng, wu, hu) => shopInterior(rng, wu, hu, TEXTURES.shop.cool, TEXTURES.shop.warm),

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
