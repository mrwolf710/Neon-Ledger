import * as THREE from 'three';
import { PALETTE as P, snap } from './palette.js';

// Layered pixel characters, realistic proportions (~6 heads), drawn at double density (32 px per unit; the
// street is 16). Each frame is a grid of material keys built from smooth shapes (ovals, tapered limbs, polygons)
// on a simple skeleton, then shaded in 4 tones per row-run (lit from the left), hem shadows, neon rim on the
// silhouette edge and an outline tinted to each material's darkest shade.
// Sheet: rows down, up, left, right (mirrored left), [pose rows]; columns idle 0-1, walk 2-5.
export const SPRITES = {
  w: 40, h: 64, pxPerUnit: 32,
  cat: { w: 16, h: 12, pxPerUnit: 16 },
  rim: { left: 'magentaDeep', right: 'cyanDeep' }, // neon edge light on the silhouette (palette names, null = off)
  fps: { idle: 2, walk: 8 },
};
export const DIRS = ['down', 'up', 'left', 'right'];
export const ANIMS = { idle: { start: 0, frames: 2 }, walk: { start: 2, frames: 4 } };

// Characters are data. Colours are palette names.
// hair.style: bob | short | cropped | slick | bun. outfit: trench | jacket | suit | none.
// acc: implant, belt, apron, sticks, bag, tie, stripe (reflective band), soles (glowing), poncho, trim, hood, visor.
export const CHARACTERS = {
  juno: {
    name: 'Juno Vale', skin: 'bone', iris: 'cyan', lips: 'rust2', lashes: true, hair: { style: 'bob', color: 'night', shine: 'teal' },
    top: 'seaGlass', legs: 'grey0', shoes: 'grey1', outfit: { type: 'trench', color: 'grey2', collar: true },
    acc: [{ type: 'implant', color: 'cyan' }, { type: 'belt', color: 'grey0' }],
  },
  mamaTeo: {
    name: 'Mama Teo', skin: 'rust3', iris: 'rust0', lips: 'rust1', hair: { style: 'bun', color: 'grey5' },
    top: 'magenta', legs: 'grey1', shoes: 'rust0', rolledSleeves: true, stoop: 1,
    acc: [{ type: 'apron', color: 'grey6' }, { type: 'sticks', color: 'amber' }],
  },
  kit: {
    name: 'Kit Lacroix', skin: 'rust2', iris: 'rust0', hair: { style: 'cropped', color: 'ink' },
    top: 'grey1', legs: 'indigo', shoes: 'grey3', outfit: { type: 'jacket', color: 'amber' },
    acc: [{ type: 'stripe', color: 'cyanLight' }, { type: 'bag', color: 'grey0' }, { type: 'soles', color: 'acid' }],
  },
  dex: {
    name: 'Dex Morrow', skin: 'bone', iris: 'teal', hair: { style: 'slick', color: 'rust0', shine: 'rust2' },
    top: 'grey6', legs: 'indigo', shoes: 'ink', outfit: { type: 'suit', color: 'indigo' },
    acc: [{ type: 'tie', color: 'magentaDeep' }], poses: ['slump'],
  },
  vendor: {
    name: 'Street vendor', skin: 'rust3', iris: 'ink', hair: { style: 'short', color: 'ink' },
    top: 'grey2', legs: 'grey1', shoes: 'ink',
    acc: [{ type: 'poncho', color: 'teal' }, { type: 'trim', color: 'pink' }, { type: 'hood', color: 'deepTeal' },
      { type: 'visor', color: 'cyan' }],
  },
};
export const CATS = {
  miso: { name: 'Miso', fur: 'sodium', stripes: 'sodium0', eyes: 'acid', nose: 'pink' },
};

// Shade chains: a colour's tones are its neighbours here (two darker, one lighter).
const CHAINS = [
  ['ink', 'night', 'indigo', 'violet'],
  ['ink', 'deepTeal', 'teal', 'seaGlass', 'cyanLight'],
  ['ink', 'grey0', 'grey1', 'grey2', 'grey3', 'grey4', 'grey5', 'grey6', 'white'],
  ['ink', 'rust0', 'rust1', 'rust2', 'rust3', 'bone', 'white'],
  ['rust0', 'sodium0', 'sodium', 'amber', 'amberLight'],
  ['night', 'magentaDeep', 'magenta', 'pink'],
  ['deepTeal', 'cyanDeep', 'cyan', 'cyanLight'],
  ['teal', 'seaGlass', 'acid', 'amberLight'],
];
// Flat (unshaded, no rim) materials: glows and tiny face features.
const FLAT = new Set(['implant', 'visor', 'eyes', 'iris', 'stripe', 'soles', 'trim', 'nose', 'lips', 'brow']);

const chainOf = (name) => CHAINS.find((ch) => ch.indexOf(name) > 0 && ch.indexOf(name) < ch.length - 1)
  ?? CHAINS.find((ch) => ch.includes(name));
// [darkest, dark, mid, light]
function ramp(name) {
  const c = chainOf(name), i = c.indexOf(name), at = (k) => P[c[Math.max(0, Math.min(c.length - 1, k))]];
  return [at(i - 2), at(i - 1), at(i), at(i + 1)];
}
// Cool shadow for a skin colour: 30% of the way to indigo, snapped to the palette (rust tones look orange on pale skin).
const skinShade = (name) => {
  const c = P[name], i = P.indigo, mix = (sh) => Math.round(((c >> sh) & 255) * 0.7 + ((i >> sh) & 255) * 0.3);
  return snap((mix(16) << 16) | (mix(8) << 8) | mix(0));
};
const lum = (c) => (0.2126 * ((c >> 16) & 255) + 0.7152 * ((c >> 8) & 255) + 0.0722 * (c & 255)) / 255;

// --- Grid with shape primitives. Pixel (x, y) covers [x, x+1); shapes test pixel centres. ---
function grid(w, h) {
  const g = { w, h, m: new Array(w * h).fill(null), mask: null };
  const set = (x, y, mat) => {
    if (x < 0 || y < 0 || x >= w || y >= h || (g.mask && !g.mask(x, y))) return;
    g.m[y * w + x] = mat;
  };
  g.rect = (x0, y0, x1, y1, mat) => { // inclusive pixel coords
    for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++) set(x, y, mat);
  };
  g.px = (x, y, mat) => set(Math.round(x), Math.round(y), mat);
  g.ellipse = (cx, cy, rx, ry, mat) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) set(x, y, mat);
      }
    }
  };
  // Tapered segment from (ax, ay, radius ra) to (bx, by, radius rb).
  g.capsule = (ax, ay, bx, by, ra, rb, mat) => {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, r = Math.max(ra, rb);
    for (let y = Math.floor(Math.min(ay, by) - r); y <= Math.ceil(Math.max(ay, by) + r); y++) {
      for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.ceil(Math.max(ax, bx) + r); x++) {
        const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
        if (Math.hypot(px - ax - t * dx, py - ay - t * dy) <= ra + (rb - ra) * t) set(x, y, mat);
      }
    }
  };
  g.poly = (pts, mat) => {
    const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        const px = x + 0.5, py = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) set(x, y, mat);
      }
    }
  };
  g.get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : g.m[y * w + x]);
  g.mirrored = () => {
    const o = grid(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o.m[y * w + x] = g.m[y * w + w - 1 - x];
    return o;
  };
  return g;
}

// Two-segment limb from (x, y): angles in degrees from straight down (+ = toward +x). Returns joints.
function limb(g, x, y, a1, a2, l1, l2, r0, r1, r2, mat) {
  const d = Math.PI / 180;
  const kx = x + Math.sin(a1 * d) * l1, ky = y + Math.cos(a1 * d) * l1;
  const ex = kx + Math.sin(a2 * d) * l2, ey = ky + Math.cos(a2 * d) * l2;
  g.capsule(x, y, kx, ky, r0, r1, mat);
  g.capsule(kx, ky, ex, ey, r1, r2, mat);
  return { kx, ky, ex, ey };
}

// Side-view walk (facing -x, so negative angles step forward). Leg [thigh, shin], arm = upper-arm angle.
const SIDE_WALK = [
  { a: [-24, -6], b: [20, 14], armA: 18, armB: -18 },
  { a: [0, 2], b: [-10, 38], armA: 4, armB: -4 },
  { a: [20, 14], b: [-24, -6], armA: -18, armB: 18 },
  { a: [-10, 38], b: [0, 2], armA: -4, armB: 4 },
];
const FRONT_WALK = [{ lift: [0, 0], arm: [1, -1] }, { lift: [0, 3], arm: [0, 0] }, { lift: [0, 0], arm: [-1, 1] }, { lift: [3, 0], arm: [0, 0] }];
const CX = 20, HIP = 35, ANKLE = 57, THIGH = 11, SHIN = 11;

// --- Human figure. view: down | up | left. pose: idle | walk | slump. f: frame within the animation. ---
function human(def, view, pose, f) {
  const g = grid(SPRITES.w, SPRITES.h);
  const acc = Object.fromEntries((def.acc ?? []).map((a) => [a.type, a]));
  const side = view === 'left', back = view === 'up', slump = pose === 'slump';
  const outfit = def.outfit ?? { type: 'none' }, coat = outfit.type !== 'none';
  const cx = CX, st = def.hair.style;

  // Skeleton offsets: legs place the hips so the planted foot touches the ground; U shifts the upper body.
  const sw = side && pose === 'walk' ? SIDE_WALK[f] : null, fw = !side && pose === 'walk' ? FRONT_WALK[f] : null;
  let hipY = HIP;
  if (sw) {
    const d = Math.PI / 180, foot = (l) => THIGH * Math.cos(l[0] * d) + SHIN * Math.cos(l[1] * d);
    hipY = ANKLE - Math.max(foot(sw.a), foot(sw.b));
  }
  if (fw && (fw.lift[0] || fw.lift[1])) hipY -= 1;                        // passing frames rise
  if (slump) hipY = 47;
  const U = hipY - HIP + (pose === 'idle' ? f : 0) + (def.stoop ?? 0);

  // Legs and boots (also redrawn through the coat's front split).
  function legs() {
    if (slump) {
      for (const s of [-1, 1]) {
        g.capsule(cx + s * 3.5, 47, cx + s * 5, 53, 3, 2.6, 'legs');
        g.capsule(cx + s * 5, 53, cx + s * 6.5, 58, 2.6, 2.2, 'legs');
        g.rect(cx + s * 6.5 - 3, 58, cx + s * 6.5 + 2, 62, 'shoes'); g.rect(cx + s * 6.5 - 3, 63, cx + s * 6.5 + 2, 63, acc.soles ? 'soles' : 'sole');
      }
      return;
    }
    if (side) {
      for (const [l, mat] of [[sw ? sw.b : [0, 0], 'legsFar'], [sw ? sw.a : [0, 0], 'legs']]) {
        const j = limb(g, cx + 0.5, hipY, l[0], l[1], THIGH, SHIN, 3, 2.5, 2.1, mat);
        const ax = Math.round(j.ex), ay = Math.round(j.ey);
        g.rect(ax - 4, ay - 1, ax + 1, ay + 4, mat === 'legsFar' ? 'shoesFar' : 'shoes');
        g.rect(ax - 4, ay + 5, ax + 1, ay + 5, acc.soles ? 'soles' : 'sole');
      }
      return;
    }
    for (const [i, s] of [[0, -1], [1, 1]]) {
      const lift = fw ? fw.lift[i] : 0, x = cx + s * 3.3;
      g.capsule(x, hipY, x + s * 0.2, hipY + THIGH - lift / 2, 3, 2.5, 'legs');
      g.capsule(x + s * 0.2, hipY + THIGH - lift / 2, x + s * 0.3, ANKLE - lift, 2.5, 2.1, 'legs');
      const ax = Math.round(x + s * 0.3 - 0.5), ay = ANKLE - lift;
      g.rect(ax - 2, ay - 1, ax + 3, ay + 4, 'shoes');
      g.rect(ax - 2, ay + 5, ax + 3, ay + 5, acc.soles ? 'soles' : 'sole');
    }
    g.rect(cx - 6, hipY - 2, cx + 5, hipY + 1, 'legs');                    // pelvis
  }

  // Arms: near/far in side view; both beside the torso otherwise.
  function arm(which) {
    const sleeve = which === 'far' ? 'sleeveFar' : 'sleeve';
    if (slump) {
      const s = which === 'l' ? -1 : 1;
      const j = limb(g, cx + s * 7.6, 18 + U, s * 18, s * 6, 9, 8, 2.2, 1.9, 1.6, sleeve);
      g.ellipse(j.ex, j.ey + 1.5, 1.8, 1.8, 'skin');
      return;
    }
    if (side) {
      const a = sw ? (which === 'far' ? sw.armB : sw.armA) : 0;
      const j = limb(g, cx + 0.5, 18 + U, a, a * 0.6 - 10, 9, 8, 2.2, 1.9, 1.6, sleeve);
      if (def.rolledSleeves) g.capsule(j.kx, j.ky, j.ex, j.ey, 1.7, 1.5, 'skin');
      if (acc.stripe) g.ellipse(j.kx, j.ky - 3, 2.3, 0.8, 'stripe');
      g.ellipse(j.ex - 0.5, j.ey + 1.5, 1.8, 1.8, 'skin');
      return;
    }
    const s = which === 'l' ? -1 : 1, swing = fw ? fw.arm[which === 'l' ? 0 : 1] : 0;
    const ex = cx + s * (coat ? 11 : 10.3), wx = ex + s * 0.3, wy = 35 + U + swing;
    g.capsule(cx + s * 9, 18.5 + U, ex, 27 + U, 2.7, 2.2, sleeve);
    g.capsule(ex, 27 + U, wx, wy, 2.2, 1.8, def.rolledSleeves ? 'skin' : sleeve);
    if (acc.stripe) g.rect(ex - 2, 24 + U, ex + 1, 24 + U, 'stripe');
    g.ellipse(wx, wy + 2, 1.8, 2, 'skin');
  }

  // Torso, coats and clothing layers.
  function torso() {
    const T = (pts) => pts.map(([x, y]) => [x, y + U]);
    if (side) g.poly(T([[cx - 4, 17], [cx + 3.5, 17], [cx + 4, 26], [cx + 3.5, 36], [cx - 3.5, 36], [cx - 4.5, 26]]), 'top');
    else g.poly(T([[cx - 9.5, 17], [cx + 9.5, 17], [cx + 8.5, 26], [cx + 6.5, 33], [cx + 7.5, 36], [cx - 7.5, 36], [cx - 6.5, 33], [cx - 8.5, 26]]), 'top');
    if (!coat) return;
    const t = outfit.type, hem = t === 'trench' ? 53 : t === 'suit' ? 39 : 37, flare = t === 'trench' ? 12 : t === 'jacket' ? 9.5 : 8.5;
    if (side) {
      const sway = sw ? -sw.a[0] / 8 : 0;
      g.poly(T([[cx - 4.5, 16.5], [cx + 4.5, 16.5], [cx + 5.5, 30], [cx + (t === 'trench' ? 7.5 + sway : 5), hem - U],
        [cx - (t === 'trench' ? 5.5 - sway / 2 : 5), hem - U], [cx - 5, 30]]), 'coat');
      if (outfit.collar) g.poly(T([[cx - 1, 17], [cx + 4, 17], [cx + 4.5, 11.5], [cx + 1, 12.5]]), 'coat');
      return;
    }
    g.poly(T([[cx - 10, 16.5], [cx + 10, 16.5], [cx + 9.5, 26], [cx + 8, 33], [cx + flare, hem - U], [cx - flare, hem - U], [cx - 8, 33], [cx - 9.5, 26]]), 'coat');
    if (back) { if (outfit.collar) g.rect(cx - 6, 12 + U, cx + 5, 17 + U, 'coat'); return; }
    if (t === 'suit') {                                                    // V opening with lapels
      g.poly(T([[cx - 3.5, 16.5], [cx + 3.5, 16.5], [cx, 30]]), 'top');
      g.capsule(cx - 3.5, 17 + U, cx - 0.5, 29 + U, 0.6, 0.5, 'coatDark'); g.capsule(cx + 3.5, 17 + U, cx + 0.5, 29 + U, 0.6, 0.5, 'coatDark');
    } else {
      g.poly(T([[cx - 3.5, 16.5], [cx + 3.5, 16.5], [cx + 1.3, 32], [cx - 1.3, 32]]), 'top');
      g.capsule(cx - 3.5, 17 + U, cx - 1.3, 31 + U, 0.6, 0.5, 'coatDark');
    }
    if (t === 'trench') {                                                  // split skirt shows the legs
      const gap = [[cx - 1, 34 + U], [cx + 1, 34 + U], [cx + 3.5, hem], [cx - 3.5, hem]];
      g.poly(gap, null);
      const inGap = grid(SPRITES.w, SPRITES.h); inGap.poly(gap, 1);
      g.mask = (x, y) => inGap.get(x, y) === 1; legs(); g.mask = null;
    }
  }

  function head() {
    const hy = 8 + U + (slump ? 2 : 0), hx = slump ? cx + 1.5 : cx;
    if (st === 'bob' && !back) g.ellipse(side ? hx + 1.5 : hx, hy + 0.5, side ? 5.4 : 6.8, 6.6, 'hair'); // volume behind the face
    g.rect(hx - 1.6, hy + 4, hx + 1.4, 17 + U, 'neck');                    // neck (shaded under the jaw)
    if (side) g.ellipse(hx - 0.5, hy, 4.8, 5.9, 'skin'); else g.ellipse(hx, hy, 5.2, 5.9, 'skin');
    // Face.
    const ey = Math.round(hy);
    if (!back) {
      if (side) {
        g.px(hx - 5.5, ey + 3, 'skin');                                     // nose
        g.rect(hx - 4, ey, hx - 3, ey, slump ? 'eyes' : 'eyes'); if (!slump) g.px(hx - 4, ey + 1, 'iris');
        g.rect(hx - 4, ey - 2, hx - 2, ey - 2, 'brow');
        if (def.lips) g.px(hx - 4.5, ey + 5, 'lips');
      } else {
        for (const s of [-1, 1]) {
          const x0 = s < 0 ? hx - 4 : hx + 2;
          if (slump) g.rect(x0, ey + 1, x0 + 1, ey + 1, 'eyes');
          else { g.rect(x0, ey, x0 + 1, ey, 'eyes'); g.rect(x0, ey + 1, x0 + 1, ey + 1, 'iris'); }
          g.rect(x0 - (s < 0 ? 0 : 0), ey - 2, x0 + 1, ey - 2, 'brow');
          if (def.lashes && !slump) g.px(s < 0 ? x0 - 1 : x0 + 2, ey, 'eyes');
        }
        g.px(hx, ey + 3, 'skinDark');                                       // nose shadow
        g.rect(hx - 1, ey + 5, hx, ey + 5, def.lips ? 'lips' : 'skinDark');
      }
    }
    if (outfit.collar && !side && !back) {
      g.poly([[cx - 9.5, 17.5 + U], [cx - 3.5, 17.5 + U], [cx - 4, 12 + U], [cx - 7.5, 13 + U]], 'coat');
      g.poly([[cx + 9.5, 17.5 + U], [cx + 3.5, 17.5 + U], [cx + 4, 12 + U], [cx + 7.5, 13 + U]], 'coat');
    }
    // Hair.
    if (back) {
      g.ellipse(hx, hy - 0.5, st === 'bob' ? 6.8 : 5.5, st === 'bob' ? 7 : st === 'cropped' ? 4.8 : 5.4, 'hair');
    } else if (side) {
      g.ellipse(hx + 1.8, hy - 0.5, 4.4, st === 'cropped' ? 4.6 : st === 'bob' ? 6.4 : 5.6, 'hair');
      g.ellipse(hx, hy - 3.8, 5.2, 2.6, 'hair');
      if (st === 'bob' || st === 'short') g.poly([[hx - 5, hy - 4], [hx - 1, hy - 5], [hx - 2, hy - 1.5], [hx - 4.5, hy - 1]], 'hair');
    } else {
      g.ellipse(hx, hy - 3.6, 5.8, st === 'cropped' ? 2.4 : 3, 'hair');
      if (st === 'bob') g.poly([[hx - 5.4, hy - 4], [hx + 3, hy - 5], [hx - 0.5, hy - 1.6], [hx - 4.8, hy + 0.5]], 'hair'); // swept fringe
      if (st === 'short') { g.rect(hx - 5, hy - 3, hx - 4, hy, 'hair'); g.rect(hx + 4, hy - 3, hx + 4, hy, 'hair'); }
      if (st === 'slick' || st === 'bun') { g.rect(hx - 5, hy - 3, hx - 5, hy, 'hair'); g.rect(hx + 4, hy - 3, hx + 4, hy, 'hair'); }
    }
    if (def.hair.shine && !back) g.capsule(hx - 2.5, hy - 5, hx + (side ? 1 : 0.5), hy - 4.2, 0.6, 0.5, 'hairShine');
    if (st === 'bun') {
      g.ellipse(side ? hx + 2.5 : hx, hy - 6, 2.6, 2, 'hair');
      if (acc.sticks) { g.capsule(hx - 3, hy - 9, hx + 3.5, hy - 5, 0.5, 0.5, 'sticks'); }
    }
    if (acc.hood) {
      if (side) { g.ellipse(hx + 0.8, hy - 0.5, 5.6, 7, 'hood'); g.ellipse(hx - 3, hy + 1, 2.6, 3.8, 'skinDark'); }
      else {
        g.ellipse(hx, hy - 0.5, 6.6, 7.4, 'hood');
        if (!back) g.ellipse(hx, hy + 1.5, 3.8, 4.2, 'skinDark');
      }
    }
    if (acc.visor && !back) g.rect(side ? hx - 5 : hx - 4.5, ey, side ? hx - 1 : hx + 3.5, ey + 1, 'visor');
    if (acc.implant && !back) g.px(side ? hx + 0.5 : hx + 4, ey - 1, 'implant');
  }

  function extras() {
    const T = (pts) => pts.map(([x, y]) => [x, y + U]);
    if (acc.apron) {
      if (back) g.rect(cx - 1, 30 + U, cx, 31 + U, 'apron');
      else if (side) g.rect(cx - 5, 27 + U, cx - 4, 47, 'apron');
      else { g.rect(cx - 4, 21 + U, cx + 3, 27 + U, 'apron'); g.poly(T([[cx - 6, 28], [cx + 6, 28], [cx + 6.5, 47 - U], [cx - 6.5, 47 - U]]), 'apron'); g.rect(cx + 1, 33 + U, cx + 3, 35 + U, 'apronDark'); }
    }
    if (acc.tie && !back && !side) { g.rect(cx - 1, 18 + U, cx, 27 + U, 'tie'); g.px(cx - 1, 28 + U, 'tie'); }
    if (acc.stripe && !side) g.rect(cx - 8, 24 + U, cx + 7, 24 + U, 'stripe');
    if (acc.bag) {
      if (!side) g.capsule(back ? cx + 7 : cx - 7, 17 + U, back ? cx - 6 : cx + 6, 34 + U, 0.6, 0.6, 'bag');
      g.rect(side ? cx + 3 : cx + 6, 32 + U, side ? cx + 7 : cx + 10, 38 + U, 'bag');
    }
    if (acc.belt && coat && !side) { g.rect(cx - 7, 32 + U, cx + 6, 33 + U, 'belt'); if (!back) g.rect(cx - 1, 32 + U, cx, 33 + U, 'buckle'); }
    if (acc.poncho) {
      if (side) g.poly(T([[cx - 3, 15], [cx + 3.5, 15], [cx + 9, 43], [cx - 8.5, 43]]), 'poncho');
      else g.poly(T([[cx - 6, 15], [cx + 6, 15], [cx + 14, 43], [cx - 14, 43]]), 'poncho');
      if (acc.trim) for (let x = 0; x < SPRITES.w; x++) if (g.get(x, 41 + U) === 'poncho' && x % 3) g.px(x, 41 + U, 'trim');
    }
  }

  // Draw order.
  if (side) { legs(); if (!acc.poncho) arm('far'); torso(); extras(); if (!acc.poncho) arm('near'); head(); }
  else { legs(); torso(); extras(); if (!acc.poncho) { arm('l'); arm('r'); } head(); }
  return g;
}

// --- Cat, 16 x 12. pose: idle (sit, tail flick) | walk (trot). ---
function cat(def, view, pose, f) {
  const g = grid(SPRITES.cat.w, SPRITES.cat.h);
  if (view === 'left') {
    if (pose === 'idle') {
      g.rect(6, 5, 11, 10, 'fur'); g.rect(5, 9, 12, 11, 'fur');            // haunches
      g.rect(3, 1, 8, 5, 'fur'); g.px(3, 0, 'fur'); g.px(7, 0, 'fur');      // head + ears
      g.px(4, 3, 'eyes'); g.px(3, 4, 'nose');
      g.rect(5, 10, 6, 11, 'fur');                                          // front paws
      g.rect(12, 10 - f, 14, 10 - f, 'fur'); g.px(14, 9 - f, 'fur');        // tail on the ground, tip flicks
      for (const x of [8, 10]) g.rect(x, 6, x, 9, 'stripes');
    } else {
      const s = [1, 0, -1, 0][f], up = [0, 1, 0, 1][f];
      g.rect(4, 4 - up, 12, 7 - up, 'fur');                                 // body
      g.rect(1, 2 - up, 5, 6 - up, 'fur'); g.px(1, 1 - up, 'fur'); g.px(4, 1 - up, 'fur');
      g.px(2, 3 - up, 'eyes'); g.px(1, 5 - up, 'nose');
      for (const [x, d] of [[5, s], [7, -s], [10, -s], [12, s]]) g.rect(x + d, 8 - up, x + d, 11, x === 7 || x === 12 ? 'furFar' : 'fur');
      g.rect(13, 2 - up, 13, 4 - up, 'fur'); g.px(14, 1 - up, 'fur');       // tail up
      for (const x of [7, 9, 11]) g.rect(x, 4 - up, x, 6 - up, 'stripes');
    }
  } else {
    const back = view === 'up', up = pose === 'walk' ? [0, 1, 0, 1][f] : 0;
    g.rect(5, 6 - up, 10, 10, 'fur'); g.rect(4, 1 - up, 11, 6 - up, 'fur'); // body, head
    g.px(4, 0 - up, 'fur'); g.px(11, 0 - up, 'fur');                        // ears
    if (pose === 'walk') { const s = [1, 0, -1, 0][f]; g.rect(5, 11 - (s > 0 ? 1 : 0), 6, 11, 'fur'); g.rect(9, 11 - (s < 0 ? 1 : 0), 10, 11, 'fur'); }
    else g.rect(5, 11, 10, 11, 'fur');
    if (back) { g.rect(7, 6, 8, 6, 'stripes'); g.rect(11, 7 - (pose === 'idle' ? f : 0), 12, 10, 'fur'); }
    else { g.px(6, 3 - up, 'eyes'); g.px(9, 3 - up, 'eyes'); g.px(7, 4 - up, 'nose'); g.px(8, 4 - up, 'nose'); }
    if (!back) g.rect(6, 7, 9, 7, 'stripes');
  }
  return g;
}

// Material key -> palette name for a definition. *Far / *Dark keys reuse a colour, shaded darker.
function materials(def) {
  const acc = Object.fromEntries((def.acc ?? []).map((a) => [a.type, a.color]));
  const m = { skin: def.skin, eyes: 'ink', iris: def.iris ?? 'ink', hair: def.hair?.color, top: def.top, legs: def.legs,
    shoes: def.shoes, coat: def.outfit?.color, fur: def.fur, stripes: def.stripes, nose: def.nose, ...acc };
  if (def.eyes && !def.skin) m.eyes = def.eyes; // cats
  Object.assign(m, {
    legsFar: m.legs, shoesFar: m.shoes, sole: 'ink', furFar: m.fur, sleeve: m.coat ?? m.top, sleeveFar: m.coat ?? m.top,
    coatDark: m.coat, apronDark: m.apron, skinDark: m.skin, neck: m.skin, hairShine: def.hair?.shine ?? m.hair, brow: m.hair,
    buckle: 'grey5', lips: def.lips,
  });
  return m;
}

// Shade, rim and outline one grid into image data at (ox, oy).
function paintGrid(img, sheetW, g, ox, oy, names) {
  const put = (x, y, c) => {
    const o = ((oy + y) * sheetW + ox + x) * 4;
    img.data[o] = (c >> 16) & 255; img.data[o + 1] = (c >> 8) & 255; img.data[o + 2] = c & 255; img.data[o + 3] = 255;
  };
  const rimL = SPRITES.rim.left && P[SPRITES.rim.left], rimR = SPRITES.rim.right && P[SPRITES.rim.right];
  const N4 = [[0, 1], [1, 0], [-1, 0], [0, -1]];
  for (let y = 0; y < g.h; y++) {
    let first = -1, last = -1; // outermost filled pixels of this row get the rim
    for (let x = 0; x < g.w; x++) if (g.get(x, y) !== null) { if (first < 0) first = x; last = x; }
    for (let x = 0; x < g.w; x++) {
      const k = g.get(x, y);
      if (k === null) {
        // Outline tinted to the touching material's darkest tone (ink when that is too light).
        const n = N4.map(([dx, dy]) => g.get(x + dx, y + dy)).find((v) => v !== null);
        if (n !== undefined) { const d = ramp(names[n])[0]; put(x, y, lum(d) > 0.2 ? P.ink : d); }
        continue;
      }
      const r = ramp(names[k]);
      if (FLAT.has(k)) { put(x, y, k === 'brow' || k === 'iris' ? r[1] : r[2]); continue; }
      // Row-run shading, lit from the left: light, mid, dark across each shape.
      let xl = x, xr = x;
      while (g.get(xl - 1, y) === k) xl--;
      while (g.get(xr + 1, y) === k) xr++;
      const t = xr === xl ? 0.4 : (x - xl) / (xr - xl);
      let tone = t < 0.22 ? 3 : t < 0.65 ? 2 : 1;
      const below = g.get(x, y + 1);
      if (below !== null && below !== k && tone > 1) tone--;               // hem / overlap shadow
      if (k === 'skin' || k === 'neck' || k === 'skinDark') {
        const up = g.get(x, y - 1), shaded = k !== 'skin' || up === 'hair' || up === 'hood'; // neck, hood interior, under the hairline
        put(x, y, shaded ? skinShade(names.skin) : r[2]);
        continue;
      }
      if (k.endsWith('Far')) tone = 1;
      if (k.endsWith('Dark') || k === 'sole') tone = 0;
      if (k === 'hairShine') tone = 2;
      if (k !== 'skin' && k !== 'skinDark' && k !== 'neck') {
        if (rimL && x === first) { put(x, y, rimL); continue; }
        if (rimR && x === last) { put(x, y, rimR); continue; }
      }
      put(x, y, r[tone]);
    }
  }
}

// Builds a sheet: { texture, canvas, frameW, frameH, rows: { down, up, left, right, [pose] }, anims: ANIMS }.
export function spriteSheet(def, isCat = false) {
  const fw = isCat ? SPRITES.cat.w : SPRITES.w, fh = isCat ? SPRITES.cat.h : SPRITES.h;
  const draw = isCat ? cat : human;
  const poses = def.poses ?? [];
  const cols = ANIMS.idle.frames + ANIMS.walk.frames, rowsN = DIRS.length + poses.length;
  const canvas = Object.assign(document.createElement('canvas'), { width: fw * cols, height: fh * rowsN });
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(canvas.width, canvas.height);
  const names = materials(def), rows = {};
  DIRS.forEach((dir, r) => {
    rows[dir] = r;
    const view = dir === 'right' ? 'left' : dir;
    for (const [anim, A] of Object.entries(ANIMS)) {
      for (let f = 0; f < A.frames; f++) {
        const g = draw(def, view, anim, f);
        paintGrid(img, canvas.width, dir === 'right' ? g.mirrored() : g, (A.start + f) * fw, r * fh, names);
      }
    }
  });
  poses.forEach((pose, i) => {
    rows[pose] = DIRS.length + i;
    paintGrid(img, canvas.width, draw(def, 'down', pose, 0), 0, rows[pose] * fh, names);
  });
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, canvas, frameW: fw, frameH: fh, pxPerUnit: isCat ? SPRITES.cat.pxPerUnit : SPRITES.pxPerUnit, rows, anims: ANIMS };
}

// All sheets by id, built once.
let sheets = null;
export function getSheets() {
  if (!sheets) {
    sheets = {};
    for (const [id, def] of Object.entries(CHARACTERS)) sheets[id] = spriteSheet(def);
    for (const [id, def] of Object.entries(CATS)) sheets[id] = spriteSheet(def, true);
  }
  return sheets;
}
