import * as THREE from 'three';
import { PALETTE as P } from './palette.js';

// Layered pixel characters. Each frame is a grid of material keys drawn as row spans (rounded head, tapered
// torso, flared coats), then shaded per row-run (lit left third, shadow right third, darker hem rows),
// rim-lit with two neon colours on the silhouette edges, and outlined in ink.
// Sheet: rows down, up, left, right (mirrored left), [extra pose rows]; columns idle 0-1, walk 2-5.
export const SPRITES = {
  w: 24, h: 32,
  cat: { w: 16, h: 12 },
  outline: P.ink,
  rim: { left: 'magentaDeep', right: 'cyanDeep' }, // neon edge light on the silhouette (palette names, null = off)
  fps: { idle: 2, walk: 8 },
};
export const DIRS = ['down', 'up', 'left', 'right'];
export const ANIMS = { idle: { start: 0, frames: 2 }, walk: { start: 2, frames: 4 } };

// Characters are data. Colours are palette names.
// hair.style: short | cropped | slick | bun | long. coat: { color, length: long | short, collar?, lapels? }.
// acc types: implant, belt, apron, sticks (hair sticks), bag, tie, stripe (reflective band), soles (glowing),
// poncho, trim (poncho hem pattern), hood, visor. Glowing ones are in GLOW.
export const CHARACTERS = {
  juno: {
    name: 'Juno Vale', skin: 'bone', eyes: 'ink', hair: { style: 'short', color: 'night' },
    top: 'violet', legs: 'grey0', shoes: 'ink', coat: { color: 'grey3', length: 'long', collar: true },
    acc: [{ type: 'implant', color: 'cyan' }, { type: 'belt', color: 'grey0' }],
  },
  mamaTeo: {
    name: 'Mama Teo', skin: 'rust3', eyes: 'ink', hair: { style: 'bun', color: 'grey5' },
    top: 'magenta', legs: 'grey1', shoes: 'rust0', rolledSleeves: true, stoop: 1,
    acc: [{ type: 'apron', color: 'grey6' }, { type: 'sticks', color: 'amber' }],
  },
  kit: {
    name: 'Kit Lacroix', skin: 'rust2', eyes: 'ink', hair: { style: 'cropped', color: 'ink' },
    top: 'grey1', legs: 'indigo', shoes: 'grey2', coat: { color: 'amber', length: 'short' },
    acc: [{ type: 'stripe', color: 'cyanLight' }, { type: 'bag', color: 'grey0' }, { type: 'soles', color: 'acid' }],
  },
  dex: {
    name: 'Dex Morrow', skin: 'bone', eyes: 'ink', hair: { style: 'slick', color: 'rust0' },
    top: 'grey6', legs: 'indigo', shoes: 'ink', coat: { color: 'indigo', length: 'short', lapels: true },
    acc: [{ type: 'tie', color: 'magentaDeep' }], poses: ['slump'],
  },
  vendor: {
    name: 'Street vendor', skin: 'rust3', eyes: 'ink', hair: { style: 'short', color: 'ink' },
    top: 'grey2', legs: 'grey1', shoes: 'ink',
    acc: [{ type: 'poncho', color: 'teal' }, { type: 'trim', color: 'pink' }, { type: 'hood', color: 'deepTeal' },
      { type: 'visor', color: 'cyan' }],
  },
};
export const CATS = {
  miso: { name: 'Miso', fur: 'sodium', stripes: 'sodium0', eyes: 'acid', nose: 'pink' },
};

// Shade chains: a colour's dark/light tones are its neighbours here.
const CHAINS = [
  ['ink', 'night', 'indigo', 'violet'],
  ['deepTeal', 'teal', 'seaGlass'],
  ['ink', 'grey0', 'grey1', 'grey2', 'grey3', 'grey4', 'grey5', 'grey6', 'white'],
  ['rust0', 'rust1', 'rust2', 'rust3', 'bone', 'white'],
  ['sodium0', 'sodium', 'amber', 'amberLight'],
  ['magentaDeep', 'magenta', 'pink'],
  ['cyanDeep', 'cyan', 'cyanLight'],
  ['seaGlass', 'acid', 'amberLight'],
];
const GLOW = new Set(['implant', 'visor', 'eyes', 'stripe', 'soles', 'trim', 'nose']); // flat, no shading or rim

function ramp(name) {
  const c = CHAINS.find((ch) => ch.includes(name) && ch.indexOf(name) > 0 && ch.indexOf(name) < ch.length - 1)
    ?? CHAINS.find((ch) => ch.includes(name));
  const i = c.indexOf(name);
  return [P[c[Math.max(0, i - 1)]], P[name], P[c[Math.min(c.length - 1, i + 1)]]];
}

// --- Grid helpers ---
function grid(w, h) {
  const g = { w, h, m: new Array(w * h).fill(null) };
  g.rect = (x0, y0, x1, y1, mat) => { // inclusive
    for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) g.m[y * w + x] = mat;
    }
  };
  g.px = (x, y, mat) => g.rect(x, y, x, y, mat);
  // Rows centred on the sprite's middle line (between x 11 and 12): widths are even.
  g.rows = (y0, widths, mat, dx = 0) => widths.forEach((wd, i) => g.rect(12 - wd / 2 + dx, y0 + i, 11 + wd / 2 + dx, y0 + i, mat));
  // Rows from explicit [x0, x1] ranges.
  g.ranges = (y0, list, mat) => list.forEach(([a, b], i) => g.rect(a, y0 + i, b, y0 + i, mat));
  g.get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : g.m[y * w + x]);
  g.mirrored = () => {
    const o = grid(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o.m[y * w + x] = g.m[y * w + w - 1 - x];
    return o;
  };
  return g;
}

const HEAD = [6, 8, 10, 10, 10, 10, 10, 10, 8, 6];                     // front head rows (10 tall)
const HEAD_SIDE = [[10, 14], [9, 15], [8, 16], [8, 16], [8, 16], [8, 16], [8, 16], [8, 16], [8, 15], [9, 14]];
const TORSO = [12, 12, 12, 12, 10, 10, 10, 10, 10, 10];                 // y 13..22, shoulders to hips
const LONG_HEM = [12, 12, 14, 14, 14, 16, 16];                          // y 23..29, trench flare
const PONCHO = [10, 12, 12, 14, 14, 16, 16, 16, 18, 18, 18, 20, 20];    // y 13..25

// --- Human figure. view: down | up | left. pose: idle | walk | slump. f: frame within the animation. ---
function human(def, view, pose, f) {
  const g = grid(SPRITES.w, SPRITES.h);
  const acc = Object.fromEntries((def.acc ?? []).map((a) => [a.type, a]));
  const slump = pose === 'slump', side = view === 'left', back = view === 'up';
  const stride = pose === 'walk' ? [1, 0, -1, 0][f] : 0;
  const b = (pose === 'walk' ? [0, 1, 0, 1][f] : pose === 'idle' ? f : 0) + (def.stoop ?? 0) + (slump ? 6 : 0);
  const Y = 2 + b + (slump ? 2 : 0);                                     // head top
  const coat = def.coat, long = coat?.length === 'long';

  // Legs and shoes.
  if (slump) {
    g.rows(27, [14, 14, 14], 'legs');                                   // thighs toward the camera
    g.rect(4, 30, 8, 31, 'shoes'); g.rect(15, 30, 19, 31, 'shoes');
    if (acc.soles) { g.rect(4, 31, 8, 31, 'soles'); g.rect(15, 31, 19, 31, 'soles'); }
  } else if (side) {
    for (const [dx, far] of [[stride * 2, 1], [-stride * 2, 0]]) {
      const x = 10 + dx;
      g.rect(x, 23, x + 2, 29, far ? 'legsFar' : 'legs');
      g.rect(x - 1, 30, x + 2, 31, 'shoes');
      if (acc.soles) g.rect(x - 1, 31, x + 2, 31, 'soles');
    }
  } else {
    for (const [x0, s] of [[8, 1], [13, -1]]) {
      const lift = stride === s ? 1 : 0;
      g.rect(x0, 23, x0 + 2, 29 - lift, 'legs');
      g.rect(x0 + (x0 < 12 ? -1 : 0), 30 - lift, x0 + (x0 < 12 ? 2 : 3), 31 - lift, 'shoes');
      if (acc.soles) g.rect(x0 + (x0 < 12 ? -1 : 0), 31 - lift, x0 + (x0 < 12 ? 2 : 3), 31 - lift, 'soles');
    }
    g.rows(23, [8], 'legs');                                             // crotch
  }

  // Torso and arms.
  const hand = (x, y) => g.rect(x, y, x + 1, y + 1, 'skin');
  if (side) {
    g.ranges(13 + b, [[10, 14], [9, 14], [9, 14], [9, 14], [9, 14], [10, 14], [10, 14], [10, 14], [10, 14], [10, 14]], 'top');
  } else {
    g.rows(13 + b, TORSO, 'top');
  }
  if (coat) {
    if (side) {
      g.ranges(13 + b, [[9, 15], [8, 15], [8, 15], [8, 15], [8, 15], [9, 15], [9, 15], [9, 15], [9, 15], [9, 15]], 'coat');
      if (long) g.ranges(23 + b, [[9, 15], [9, 16], [9, 16], [9, 17], [9, 17], [9, 17], [9, 18]].slice(0, 7 - b), 'coat');
      else g.rect(9, 23 + b, 15, 23 + b, 'coat');
      if (coat.collar) g.ranges(Y + 7, [[13, 15], [13, 16], [12, 16], [12, 16]], 'coat');
    } else {
      g.rows(13 + b, TORSO.map((w) => w + 2), 'coat');
      if (long) g.rows(23 + b, LONG_HEM.slice(0, 7 - b), 'coat');
      else g.rows(23 + b, [12], 'coat');
      if (!back) {                                                       // open front
        if (coat.lapels) { g.rows(13 + b, [4, 4, 2, 2, 2, 2, 2], 'top'); g.px(9, 14 + b, 'coatDark'); g.px(14, 14 + b, 'coatDark'); }
        else g.rect(11, 14 + b, 12, 22 + b, 'top');
        if (long) g.rect(11, 23 + b, 12, 29, 'legs');
      }
      if (coat.collar) {
        if (back) g.rows(Y + 7, [12, 12, 12], 'coat');
        else { g.rect(6, Y + 6, 8, Y + 10, 'coat'); g.rect(15, Y + 6, 17, Y + 10, 'coat'); }
      }
    }
  }
  if (acc.belt && !side) g.rows(21 + b, [coat ? 12 : 10], 'belt');
  if (acc.belt && !side && !back) g.rect(11, 21 + b, 12, 21 + b, 'buckle');

  const sleeve = 'sleeve';
  if (side) {
    const ax = 11 - stride;
    g.rect(ax, 14 + b, ax + 1, 21 + b, sleeve);
    if (def.rolledSleeves) g.rect(ax, 18 + b, ax + 1, 21 + b, 'skin');
    if (acc.stripe) g.rect(ax, 17 + b, ax + 1, 17 + b, 'stripe');
    hand(ax, 22 + b);
  } else {
    const ax = coat ? [4, 18] : [5, 17];
    for (const [x, s] of [[ax[0], 1], [ax[1], -1]]) {
      const len = slump ? 3 : stride === s ? -1 : stride === -s ? 1 : 0;
      g.rect(x, 14 + b, x + 1, 21 + b + len, sleeve);
      if (def.rolledSleeves) g.rect(x, 18 + b, x + 1, 21 + b + len, 'skin');
      if (acc.stripe) g.rect(x, 17 + b, x + 1, 17 + b, 'stripe');
      hand(x, 22 + b + len);
    }
  }
  if (acc.stripe && !side) g.rows(17 + b, [coat ? 12 : 10], 'stripe');
  if (acc.stripe && !side && !back) g.rect(11, 17 + b, 12, 17 + b, 'top');

  if (acc.poncho) {
    if (side) g.ranges(13 + b, PONCHO.map((w) => [12 - Math.min(5, w / 4), 13 + Math.min(5, w / 4)]), 'poncho');
    else g.rows(13 + b, PONCHO, 'poncho');
    if (acc.trim) {
      const y = 13 + b + PONCHO.length - 2, [x0, x1] = side ? [7, 18] : [2, 21];
      for (let x = x0; x <= x1; x++) if (g.get(x, y) === 'poncho' && (x % 3 !== 0)) g.px(x, y, 'trim');
    }
  }
  if (acc.apron) {
    if (back) g.rect(11, 18 + b, 12, 18 + b, 'apron');                  // bow
    else if (side) g.rect(8, 16 + b, 8, 27, 'apron');
    else {
      g.rows(15 + b, [6, 6], 'apron');
      g.rows(17 + b, Array(10 - b).fill(10), 'apron');
      g.px(9, 14 + b, 'apron'); g.px(14, 14 + b, 'apron');
      g.rect(13, 20 + b, 14, 21 + b, 'apronDark');                         // pocket
    }
  }
  if (acc.tie && !back && !side) g.rect(11, 14 + b, 12, 20 + b, 'tie');
  if (acc.bag) {
    if (!side) for (let i = 0; i < 10; i++) g.px(back ? 17 - i : 6 + i, 13 + b + i, 'bag');
    g.rect(side ? 14 : 17, 20 + b, side ? 16 : 19, 24 + b, 'bag');
  }

  // Neck and head.
  g.rect(10, Y + 9, 13, 13 + b, 'skin');
  if (side) g.ranges(Y, HEAD_SIDE, 'skin'); else g.rows(Y, HEAD, 'skin');
  if (side) g.px(7, Y + 6, 'skin');                                      // nose
  if (coat?.collar && !back && !side) { g.rect(6, Y + 7, 7, Y + 10, 'coat'); g.rect(16, Y + 7, 17, Y + 10, 'coat'); }

  // Hair.
  const st = def.hair.style;
  if (st === 'bun') {
    g.rect(side ? 13 : 10, Y - 3, side ? 16 : 13, Y - 1, 'hair');
    if (acc.sticks) { g.px(side ? 17 : 14, Y - 4, 'sticks'); g.px(side ? 18 : 15, Y - 5, 'sticks'); g.px(side ? 12 : 9, Y - 4, 'sticks'); }
  }
  if (back) {
    g.rows(Y, HEAD.slice(0, st === 'cropped' ? 6 : 8), 'hair');
    if (st === 'long') g.rows(Y + 4, [12, 12, 12, 12, 12, 10, 10, 8], 'hair');
  } else if (side) {
    g.ranges(Y, HEAD_SIDE.slice(0, 3), 'hair');
    const backRows = st === 'cropped' ? 4 : 7;
    g.ranges(Y + 3, Array(backRows).fill([12, 16]), 'hair');
    if (st === 'short' || st === 'long') g.rect(8, Y + 3, 10, Y + 3, 'hair');  // fringe
    if (st === 'long') g.ranges(Y + 6, Array(7).fill([13, 17]), 'hair');
  } else {
    g.rows(Y, HEAD.slice(0, st === 'cropped' ? 2 : 3), 'hair');
    if (st === 'short' || st === 'long') {                               // side-swept fringe over one eye
      g.rect(7, Y + 3, 13, Y + 3, 'hair'); g.rect(7, Y + 4, 10, Y + 4, 'hair'); g.px(7, Y + 5, 'hair');
      g.rect(16, Y + 3, 16, Y + 5, 'hair');
    } else if (st === 'slick') {
      g.rect(7, Y + 3, 16, Y + 3, 'hair'); g.rect(7, Y + 4, 7, Y + 5, 'hair'); g.rect(16, Y + 4, 16, Y + 5, 'hair');
      g.rect(9, Y + 1, 12, Y + 1, 'hairShine');
    } else if (st === 'bun') {
      g.rect(7, Y + 3, 16, Y + 3, 'hair'); g.rect(7, Y + 4, 7, Y + 6, 'hair'); g.rect(16, Y + 4, 16, Y + 6, 'hair');
    } else if (st === 'cropped') {
      g.rect(7, Y + 2, 8, Y + 3, 'hair'); g.rect(15, Y + 2, 16, Y + 3, 'hair');
    }
    if (st === 'long') { g.rect(6, Y + 4, 7, Y + 12, 'hair'); g.rect(16, Y + 4, 17, Y + 12, 'hair'); }
  }
  if (acc.hood) {
    if (side) { g.ranges(Y - 1, [[10, 15], [9, 16], [8, 17], [9, 17], [10, 17], [11, 17], [11, 17], [11, 17], [11, 17], [11, 17], [11, 16]], 'hood'); }
    else {
      g.rows(Y - 1, [8, 10, 12, 12, 12, 12, 12, 12, 12, 12, 10, 8], 'hood');
      if (!back) g.ranges(Y + 4, [[9, 14], [9, 14], [9, 14], [9, 14], [10, 13]], 'skin');
    }
  }

  // Face.
  if (!back) {
    const ey = Y + 6;
    if (slump) { g.rect(9, ey, 10, ey, 'eyes'); g.rect(13, ey, 14, ey, 'eyes'); }
    else if (side) g.px(9, ey - 1, 'eyes');
    else { g.rect(9, ey - 1, 9, ey, 'eyes'); g.rect(14, ey - 1, 14, ey, 'eyes'); }
    if (acc.visor) { if (side) g.rect(7, ey - 1, 11, ey - 1, 'visor'); else g.rect(8, ey - 1, 15, ey - 1, 'visor'); }
    if (acc.implant) g.px(side ? 12 : 16, Y + 4, 'implant');
  }
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

// Material key -> palette name for a definition. *Dark keys reuse a colour but shade one tone down.
function materials(def) {
  const acc = Object.fromEntries((def.acc ?? []).map((a) => [a.type, a.color]));
  const m = { skin: def.skin, eyes: def.eyes, hair: def.hair?.color, top: def.top, legs: def.legs, shoes: def.shoes,
    coat: def.coat?.color, fur: def.fur, stripes: def.stripes, nose: def.nose, ...acc };
  Object.assign(m, { legsFar: m.legs, furFar: m.fur, sleeve: m.coat ?? m.top, coatDark: m.coat, apronDark: m.apron,
    hairShine: m.hair, buckle: 'grey5' });
  return m;
}

// Shade + rim + outline one grid into image data at (ox, oy).
function paintGrid(img, sheetW, g, ox, oy, names) {
  const put = (x, y, c) => {
    const o = ((oy + y) * sheetW + ox + x) * 4;
    img.data[o] = (c >> 16) & 255; img.data[o + 1] = (c >> 8) & 255; img.data[o + 2] = c & 255; img.data[o + 3] = 255;
  };
  const rimL = SPRITES.rim.left && P[SPRITES.rim.left], rimR = SPRITES.rim.right && P[SPRITES.rim.right];
  for (let y = 0; y < g.h; y++) {
    let first = -1, last = -1; // outermost filled pixels of this row get the rim
    for (let x = 0; x < g.w; x++) if (g.get(x, y) !== null) { if (first < 0) first = x; last = x; }
    for (let x = 0; x < g.w; x++) {
      const k = g.get(x, y);
      if (k === null) {
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g.get(x + dx, y + dy) !== null)) put(x, y, SPRITES.outline);
        continue;
      }
      const r = ramp(names[k]);
      if (GLOW.has(k)) { put(x, y, r[1]); continue; }
      // Row-run shading: light from the left, so each shape reads as rounded.
      let xl = x, xr = x;
      while (g.get(xl - 1, y) === k) xl--;
      while (g.get(xr + 1, y) === k) xr++;
      const t = xr === xl ? 0.5 : (x - xl) / (xr - xl);
      let tone = t < 0.34 ? 2 : t > 0.67 ? 0 : 1;
      const below = g.get(x, y + 1);
      if (below !== null && below !== k) tone = Math.max(0, tone - 1);   // hem / overlap shadow
      if (k.endsWith('Far') || k.endsWith('Dark')) tone = 0;
      if (k === 'hairShine') tone = 2;
      // Neon rim on the silhouette edges (not on skin, so faces stay readable).
      if (k !== 'skin') {
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
  return { texture, canvas, frameW: fw, frameH: fh, rows, anims: ANIMS };
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
