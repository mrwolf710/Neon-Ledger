import * as THREE from 'three';
import { PALETTE as P } from './palette.js';

// Layered pixel characters. Each frame is a grid of material keys drawn shape by shape (body, outfit, coat,
// hair, accessories), then shaded (lit top-left edges, dark bottom-right edges, 3 tones from RAMPS) and
// outlined. Sheet: rows down, up, left, right (mirrored left), [extra pose row]; columns idle 0-1, walk 2-5.
export const SPRITES = {
  w: 24, h: 32,
  cat: { w: 16, h: 12 },
  outline: P.ink,
  fps: { idle: 2, walk: 8 },
};
export const DIRS = ['down', 'up', 'left', 'right'];
export const ANIMS = { idle: { start: 0, frames: 2 }, walk: { start: 2, frames: 4 } };

// Characters are data. Colours are palette names. hair.style: short | cropped | slick | bun | long.
// coat.length: long | short. acc: implant | apron | bag | tie | visor | hood | poncho (each with a colour).
export const CHARACTERS = {
  juno: {
    name: 'Juno Vale', skin: 'bone', eyes: 'ink', hair: { style: 'short', color: 'night' },
    top: 'grey1', legs: 'grey0', shoes: 'ink', coat: { color: 'grey3', length: 'long', collar: true },
    acc: [{ type: 'implant', color: 'cyan' }],
  },
  mamaTeo: {
    name: 'Mama Teo', skin: 'rust3', eyes: 'ink', hair: { style: 'bun', color: 'grey5' },
    top: 'magenta', legs: 'grey1', shoes: 'rust0', rolledSleeves: true, stoop: 1,
    acc: [{ type: 'apron', color: 'grey6' }],
  },
  kit: {
    name: 'Kit Lacroix', skin: 'rust2', eyes: 'ink', hair: { style: 'cropped', color: 'ink' },
    top: 'grey1', legs: 'indigo', shoes: 'grey6', coat: { color: 'amber', length: 'short' },
    acc: [{ type: 'bag', color: 'grey0' }],
  },
  dex: {
    name: 'Dex Morrow', skin: 'bone', eyes: 'ink', hair: { style: 'slick', color: 'rust0' },
    top: 'grey6', legs: 'indigo', shoes: 'ink', coat: { color: 'indigo', length: 'short' },
    acc: [{ type: 'tie', color: 'magentaDeep' }], poses: ['slump'],
  },
  vendor: {
    name: 'Street vendor', skin: 'rust3', eyes: 'ink', hair: { style: 'short', color: 'ink' },
    top: 'grey2', legs: 'grey1', shoes: 'ink',
    acc: [{ type: 'poncho', color: 'teal' }, { type: 'hood', color: 'teal' }, { type: 'visor', color: 'cyan' }],
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
const GLOW = new Set(['implant', 'visor', 'eyes']); // materials drawn flat (no shading)

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
  g.get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : g.m[y * w + x]);
  return g;
}

// --- Human figure. view: down | up | left. pose: idle | walk | slump. f: frame within the animation. ---
function human(def, view, pose, f) {
  const g = grid(SPRITES.w, SPRITES.h);
  const acc = Object.fromEntries((def.acc ?? []).map((a) => [a.type, a]));
  const slump = pose === 'slump';
  const stride = pose === 'walk' ? [1, 0, -1, 0][f] : 0;
  const bob = (pose === 'walk' ? [0, 1, 0, 1][f] : pose === 'idle' ? f : 0) + (def.stoop ?? 0) + (slump ? 6 : 0);
  const headDrop = slump ? 2 : 0;
  const side = view === 'left', back = view === 'up';
  const coat = def.coat, sleeve = 'sleeve'; // own key so arms shade apart from the torso
  const legTop = 22, b = bob, hb = bob + headDrop;

  // Legs and shoes.
  if (slump) {
    g.rect(7, 26, 16, 29, 'legs');               // thighs coming toward the camera
    g.rect(6, 30, 9, 31, 'shoes'); g.rect(14, 30, 17, 31, 'shoes');
  } else if (side) {
    for (const [dx, far] of [[-stride * 2, 0], [stride * 2, 1]]) {
      const x = 11 + dx;
      g.rect(x, legTop, x + 2, 29, far ? 'legsFar' : 'legs');
      g.rect(x - 1, 30, x + 2, 31, 'shoes');
    }
  } else {
    const lift = (s) => (stride === s ? 1 : 0);
    g.rect(8, legTop, 10, 29 - lift(1), 'legs'); g.rect(8, 30 - lift(1), 10, 31 - lift(1), 'shoes');
    g.rect(13, legTop, 15, 29 - lift(-1), 'legs'); g.rect(13, 30 - lift(-1), 15, 31 - lift(-1), 'shoes');
    g.rect(11, legTop, 12, 24, 'legs');          // crotch
  }

  // Torso, arms, hands.
  const hand = (x, y) => g.rect(x, y, x + 1, y + 1, 'skin');
  if (side) {
    g.rect(9, 12 + b, 14, 21 + b, 'top');
    const ax = 11 - stride;
    g.rect(ax, 13 + b, ax + 2, 20 + b, sleeve);
    if (def.rolledSleeves) g.rect(ax, 17 + b, ax + 2, 20 + b, 'skin');
    hand(ax, 21 + b);
  } else {
    g.rect(7, 12 + b, 16, 21 + b, 'top');
    for (const [x, s] of [[5, 1], [17, -1]]) {
      const len = slump ? 2 : stride === s ? -1 : stride === -s ? 1 : 0;
      g.rect(x, 13 + b, x + 1, 20 + b + len, sleeve);
      if (def.rolledSleeves) g.rect(x, 17 + b, x + 1, 20 + b + len, 'skin');
      hand(x, 21 + b + len);
    }
  }

  // Coat over the torso (long coats hang over the legs).
  if (coat) {
    const long = coat.length === 'long', hem = long ? 28 : 22 + b;
    if (side) {
      g.rect(9, 12 + b, 14, 21 + b, 'coat');
      if (long) g.rect(8, 22 + b, 15, hem, 'coat');
    } else {
      g.rect(7, 12 + b, 16, 21 + b, 'coat');
      g.rect(long ? 6 : 7, 22 + b, long ? 17 : 16, hem, 'coat');
      if (!back) { g.rect(11, 14 + b, 12, 21 + b, 'top'); if (long) g.rect(11, 22 + b, 12, hem, 'legs'); } // open front
    }
    if (side) { const ax = 11 - stride; g.rect(ax, 13 + b, ax + 2, 20 + b, sleeve); } // arm stays in front of the coat
  }
  if (acc.poncho) {
    for (let y = 12; y <= 23; y++) {
      const half = Math.min(9, 4 + Math.floor((y - 12) * 0.6));
      if (side) g.rect(12 - Math.min(4, half), y + b, 12 + Math.min(4, half), y + b, 'poncho');
      else g.rect(12 - half, y + b, 11 + half, y + b, 'poncho');
    }
  }
  if (acc.apron && !back) {
    if (side) g.rect(8, 15 + b, 8, 26, 'apron');
    else { g.rect(8, 15 + b, 15, 26, 'apron'); g.px(9, 13 + b, 'apron'); g.px(14, 13 + b, 'apron'); }
  }
  if (acc.tie && !back && !side) g.rect(11, 13 + b, 12, 19 + b, 'tie');
  if (acc.bag) {
    if (!side) for (let i = 0; i < 10; i++) g.px((back ? 16 - i : 7 + i), 12 + b + i, 'bag');
    g.rect(side ? 14 : 16, 19 + b, side ? 16 : 18, 23 + b, 'bag');
  }

  // Neck and head.
  const hx = side ? 9 : 8;
  g.rect(11, 11 + hb, 12, 12 + b, 'skin');
  g.rect(hx, 4 + hb, hx + 7, 11 + hb, 'skin');
  if (coat?.collar) {
    if (side) g.rect(13, 9 + hb, 15, 12 + b, 'coat');
    else { g.rect(7, 9 + hb, 8, 12 + b, 'coat'); g.rect(15, 9 + hb, 16, 12 + b, 'coat'); }
  }

  // Hair.
  const H = def.hair, st = H.style, y0 = 3 + hb;
  if (st === 'bun') g.rect(10, y0 - 3, 13, y0 - 1, 'hair');
  if (back) {
    g.rect(8, y0, 15, (st === 'cropped' ? 7 : 9) + hb, 'hair');
    if (st === 'long') g.rect(7, 6 + hb, 16, 14 + hb, 'hair');
  } else if (side) {
    g.rect(9, y0, 16, y0 + (st === 'cropped' ? 1 : 2), 'hair');
    g.rect(12, y0, 16, (st === 'cropped' ? 6 : 8) + hb, 'hair');
    if (st === 'long') g.rect(13, 6 + hb, 16, 14 + hb, 'hair');
  } else {
    g.rect(8, y0, 15, y0 + (st === 'cropped' ? 1 : 2), 'hair');
    if (st !== 'cropped' && st !== 'slick') { g.rect(8, y0 + 3, 8, y0 + 4, 'hair'); g.rect(15, y0 + 3, 15, y0 + 4, 'hair'); }
    if (st === 'long') { g.rect(7, 6 + hb, 8, 13 + hb, 'hair'); g.rect(15, 6 + hb, 16, 13 + hb, 'hair'); }
  }
  if (acc.hood) {
    if (side) { g.rect(10, 2 + hb, 17, 11 + hb, 'hood'); g.rect(9, 6 + hb, 11, 11 + hb, 'skin'); }
    else {
      g.rect(7, 2 + hb, 16, 12 + hb, 'hood');
      if (!back) g.rect(9, 6 + hb, 14, 11 + hb, 'skin');
    }
  }

  // Face.
  if (!back) {
    const eyeY = 8 + hb;
    if (slump) { g.rect(9, eyeY + 1, 10, eyeY + 1, 'eyes'); g.rect(13, eyeY + 1, 14, eyeY + 1, 'eyes'); } // eyes shut
    else if (side) g.px(10, eyeY, 'eyes');
    else { g.px(10, eyeY, 'eyes'); g.px(13, eyeY, 'eyes'); }
    if (acc.visor) g.rect(side ? 9 : 9, eyeY, side ? 12 : 14, eyeY, 'visor');
    if (acc.implant) g.px(side ? 14 : 15, 7 + hb, 'implant');
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

// Material key -> palette name for a definition.
function materials(def) {
  const acc = Object.fromEntries((def.acc ?? []).map((a) => [a.type, a.color]));
  const m = { skin: def.skin, eyes: def.eyes, hair: def.hair?.color, top: def.top, legs: def.legs, shoes: def.shoes,
    coat: def.coat?.color, fur: def.fur, stripes: def.stripes, nose: def.nose, ...acc };
  m.legsFar = m.legs; m.furFar = m.fur; m.sleeve = m.coat ?? m.top;
  return m;
}

// Shade + outline one grid into image data at (ox, oy), optionally mirrored.
function paintGrid(img, sheetW, g, ox, oy, names, mirror) {
  const put = (x, y, c) => {
    const o = ((oy + y) * sheetW + ox + (mirror ? g.w - 1 - x : x)) * 4;
    img.data[o] = (c >> 16) & 255; img.data[o + 1] = (c >> 8) & 255; img.data[o + 2] = c & 255; img.data[o + 3] = 255;
  };
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const k = g.get(x, y);
      if (k === null) {
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g.get(x + dx, y + dy) !== null)) put(x, y, SPRITES.outline);
        continue;
      }
      const r = ramp(names[k]);
      if (GLOW.has(k)) { put(x, y, r[1]); continue; }
      const lit = g.get(x - 1, y) !== k || g.get(x, y - 1) !== k;
      const shadow = g.get(x + 1, y) !== k || g.get(x, y + 1) !== k;
      let t = lit && !shadow ? 2 : shadow && !lit ? 0 : 1;
      if (k.endsWith('Far')) t = 0; // far leg / far paws sit in shadow
      put(x, y, r[t]);
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
      for (let f = 0; f < A.frames; f++) paintGrid(img, canvas.width, draw(def, view, anim, f), (A.start + f) * fw, r * fh, names, dir === 'right');
    }
  });
  poses.forEach((pose, i) => {
    rows[pose] = DIRS.length + i;
    paintGrid(img, canvas.width, draw(def, 'down', pose, 0), 0, rows[pose] * fh, names, false);
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
