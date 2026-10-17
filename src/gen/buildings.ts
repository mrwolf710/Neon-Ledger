import * as THREE from 'three';
import { PALETTE as P } from './palette.ts';
import { getTexture } from './textures.ts';
import { signTexture } from './glyphs.ts';
import type { Rng } from '../core/rng.ts';
import type { Batch } from './batch.ts';
import type { TextureName } from './textures.ts';

// Shared street materials (see getMaterials); props and districts read these.
export interface Materials {
  road: THREE.MeshStandardMaterial; sidewalk: THREE.MeshStandardMaterial; walls: THREE.MeshStandardMaterial[];
  roof: THREE.MeshStandardMaterial; metal: THREE.MeshStandardMaterial; awnings: THREE.MeshStandardMaterial[];
  frame: THREE.MeshStandardMaterial; glassDark: THREE.MeshStandardMaterial; ac: THREE.MeshStandardMaterial;
  rail: THREE.MeshStandardMaterial; pipe: THREE.MeshStandardMaterial; cable: THREE.MeshStandardMaterial;
  litWarm: THREE.MeshBasicMaterial; litCool: THREE.MeshBasicMaterial;
}

// Rule-based tenements. Local frame: footprint centred on origin, ground at y=0, facade faces +z.
export const BUILDINGS = {
  groundH: 3.4,             // shop floor height
  floorH: 2.2,
  floors: [1, 5] as [number, number],           // upper floors, inclusive
  parapet: 0.35,
  margin: 0.2,              // facade edge kept clear of modules
  module: 1.6,              // target column width
  modules: { window: 45, shutter: 15, windowAC: 20, blank: 20 }, // weights
  window: { w: 0.9, h: 1.2, sill: 0.5, bar: 0.07, depth: 0.08 },
  ac: { w: 0.7, h: 0.5, d: 0.45 },
  litChance: 0.55, coolChance: 0.3,
  shopClosedChance: 0.3,
  shopTex: 8,               // shop interior texture width in units (wider than any shopfront, so no visible repeat)
  balconyChance: 0.25, pipeChance: 0.7, cableChance: 0.35, roofClutterChance: 0.6,
  awning: { depth: 1.1, slope: 0.35, y: 2.35 },
  signs: [1, 2] as [number, number], signGlyphs: [3, 5] as [number, number],
  signColors: [P.magenta, P.cyan, P.amber, P.acid, P.pink],
  signGlow: 1.8, windowGlow: 0.8,   // colour multipliers on emissive materials; >1 feeds bloom
  signLight: 4,                     // point light intensity in front of each sign
  wet: { road: 0.55, sidewalk: 0.85 }, // roughness multipliers (texture roughnessMap still applies)
  // Fake wet reflection under each sign: additive streak over sidewalk then road. Samples only a thin
  // band of the sign texture (vSpan) so glyph columns smear into streaks; fade = (1 - t/length)^fadePow.
  reflection: { opacity: 0.2, length: 5, width: 0.7, vSpan: 0.15, fadePow: 2, sidewalk: 2, curb: 0.15 }, // sidewalk/curb match DISTRICT
  colors: {
    roofTint: 0x9a96aa, frame: P.grey0, glassDark: P.night, ac: P.grey5, rail: P.grey1,
    pipe: P.rust2, cable: P.ink, litWarm: P.amber, litCool: P.cyan,
  },
};

let cached: { seed: number; M: Materials } | null = null;

// Shared materials for the whole street (one draw call each after merging). Props reuse these.
export function getMaterials(rng: Rng): Materials {
  if (cached && cached.seed === rng.seed) return cached.M;
  const C = BUILDINGS.colors;
  const tex = (name: TextureName, w: number, h: number, r = rng) => ({ ...getTexture(name, r, w, h), roughness: 1 });
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
  const glow = (color: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(BUILDINGS.windowGlow) });
  const M: Materials = {
    road: std(tex('wetAsphalt', 8, 6)),
    sidewalk: std(tex('sidewalk', 4, 2)),
    walls: [std(tex('brick', 4, 4)), std(tex('concrete', 4, 4)), std(tex('tiles', 4, 4))],
    roof: std({ ...tex('concrete', 4, 4), color: C.roofTint }),
    metal: std(tex('metalPanel', 4, 4)),
    awnings: [0, 1, 2].map((i) => std(tex('awning', 4, 1, rng.fork(`awning${i}`)))),
    frame: std({ color: C.frame, roughness: 0.6 }),
    glassDark: std({ color: C.glassDark, roughness: 0.1, metalness: 0.3 }),
    ac: std({ color: C.ac, roughness: 0.7 }),
    rail: std({ color: C.rail, roughness: 0.4, metalness: 0.6 }),
    pipe: std({ color: C.pipe, roughness: 0.8 }),
    cable: std({ color: C.cable, roughness: 0.9 }),
    litWarm: glow(C.litWarm),
    litCool: glow(C.litCool),
  };
  M.road.roughness = BUILDINGS.wet.road;
  M.sidewalk.roughness = BUILDINGS.wet.sidewalk;
  cached = { seed: rng.seed, M };
  return M;
}

const litMat = (rng: Rng, M: Materials) => {
  const B = BUILDINGS;
  if (rng.rand() >= B.litChance) return M.glassDark;
  return rng.rand() < B.coolChance ? M.litCool : M.litWarm;
};

// Pane flush on the wall, frame bars standing proud of it.
function framedOpening(batch: Batch, M: Materials, pane: THREE.Material, x: number, y: number, w: number, h: number, fz: number) {
  const { bar, depth } = BUILDINGS.window;
  const z = fz + depth / 2;
  batch.box(pane, w, h, 0.02, x, y, fz + 0.01);
  batch.box(M.frame, w + bar * 2, bar, depth, x, y + h / 2 + bar / 2, z);
  batch.box(M.frame, w + bar * 2, bar * 1.5, depth * 1.6, x, y - h / 2 - bar * 0.75, fz + depth * 0.8); // sill
  batch.box(M.frame, bar, h, depth, x - w / 2 - bar / 2, y, z);
  batch.box(M.frame, bar, h, depth, x + w / 2 + bar / 2, y, z);
}

function facadeModule(rng: Rng, batch: Batch, M: Materials, kind: string, x: number, y0: number, fz: number) {
  const W = BUILDINGS.window, A = BUILDINGS.ac;
  const wy = y0 + W.sill + W.h / 2;
  if (kind === 'blank') return;
  if (kind === 'shutter') {
    batch.box(M.metal, W.w + 0.1, W.h + 0.1, 0.06, x, wy, fz + 0.03);
    return;
  }
  framedOpening(batch, M, litMat(rng, M), x, wy, W.w, W.h, fz);
  if (kind === 'windowAC') {
    const ax = x + rng.range(-0.15, 0.15);
    batch.box(M.ac, A.w, A.h, A.d, ax, y0 + A.h / 2, fz + A.d / 2);
    batch.steam(ax, y0 + A.h, fz + A.d / 2);
  }
}

function balcony(batch: Batch, M: Materials, x: number, y0: number, w: number, fz: number) {
  const d = 0.7, railH = 0.85, z = fz + d;
  batch.box(M.roof, w, 0.1, d, x, y0 + 0.05, fz + d / 2);
  batch.box(M.rail, w, 0.05, 0.05, x, y0 + railH, z - 0.03);
  for (let i = 0; i <= 4; i++) batch.box(M.rail, 0.04, railH, 0.04, x - w / 2 + 0.03 + (i * (w - 0.06)) / 4, y0 + railH / 2, z - 0.03);
  for (const s of [-1, 1]) batch.box(M.rail, 0.04, 0.05, d, x + s * (w / 2 - 0.02), y0 + railH, fz + d / 2);
}

// Ground streak from the facade (local z = fz) outward, texture bottom nearest the wall, fading out.
function addReflection(batch: Batch, tex: THREE.Texture, x: number, w: number, fz: number) {
  const R = BUILDINGS.reflection;
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: R.opacity, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true, fog: false,
  });
  for (const [t0, t1, y] of [[0, R.sidewalk, R.curb + 0.01], [R.sidewalk, R.length, 0.01]]) {
    const g = new THREE.PlaneGeometry(w * R.width, t1 - t0).rotateX(-Math.PI / 2).translate(x, y, fz + (t0 + t1) / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute, col = new Float32Array(uv.count * 3);
    for (let i = 0; i < uv.count; i++) {
      const v = (uv.getY(i) === 1 ? t0 : t1) / R.length; // plane top edge (uv.y 1) ends up nearest the wall
      uv.setY(i, 0.5 + (v - 0.5) * R.vSpan);
      col.fill((1 - v) ** R.fadePow, i * 3, i * 3 + 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    batch.add(mat, g);
  }
}

function addSign(rng: Rng, batch: Batch, M: Materials, vertical: boolean, n: number, x: number, y: number, z: number, fz: number) {
  const B = BUILDINGS, color = rng.pick(B.signColors);
  const tex = signTexture(rng, n, vertical, color);
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(B.signGlow, B.signGlow, B.signGlow) });
  batch.sign(mat, batch.light(color, B.signLight, x, y, z + (vertical ? 0 : 0.6)));
  addReflection(batch, tex, x, vertical ? 0.5 : n, fz);
  if (vertical) {
    batch.box(mat, 0.12, n, 1, x, y, z, 0, 0, false); // blade sign 0.1 off the wall, glyphs on both sides
    for (const dy of [-1, 1]) batch.box(M.rail, 0.06, 0.06, 0.15, x, y + dy * (n / 2 - 0.2), z - 0.575); // brackets
  } else {
    batch.box(mat, n, 1, 0.1, x, y, z, 0, 0, false);
  }
}

// Adds one building to the batch (batch transform already set). Returns its height.
export function building(rng: Rng, M: Materials, batch: Batch, w: number, d: number): number {
  const B = BUILDINGS, fz = d / 2;
  const floors = rng.int(B.floors[0], B.floors[1]);
  const h = B.groundH + floors * B.floorH;

  batch.box(rng.pick(M.walls), w, h, d, 0, h / 2, 0);
  batch.box(M.roof, w + 0.1, B.parapet, d + 0.1, 0, h + B.parapet / 2, 0);
  if (rng.rand() < B.roofClutterChance) {
    const tank = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 8).translate(rng.range(-w / 4, w / 4), h + B.parapet + 0.6, rng.range(-0.3, 0.3));
    batch.add(M.ac, tank);
  }

  // Shopfront: glass (lit or dark) or rolled shutter, then a striped awning.
  const sw = w - 0.8, shopOpen = rng.rand() >= B.shopClosedChance;
  if (shopOpen) {
    // Own interior per building (+1 draw per open shop); the fork leaves this building's rng sequence untouched.
    const kind = rng.rand() < B.coolChance ? 'shopCool' : 'shopWarm';
    const map = getTexture(kind, rng.fork('shop'), B.shopTex, 2).map;
    framedOpening(batch, M, new THREE.MeshBasicMaterial({ map, color: new THREE.Color().setScalar(B.windowGlow) }), 0, 1.1, sw, 2.0, fz);
  }
  else batch.box(M.metal, sw, 2.0, 0.06, 0, 1.1, fz + 0.03);
  const Aw = B.awning;
  batch.box(rng.pick(M.awnings), sw + 0.2, 0.06, Aw.depth, 0, Aw.y, fz + (Aw.depth / 2) * Math.cos(Aw.slope), Aw.slope);

  // Upper floors: columns of modules, maybe one balcony per floor.
  const usable = w - B.margin * 2, cols = Math.max(1, Math.floor(usable / B.module)), colW = usable / cols;
  const colX = (c: number) => -usable / 2 + colW * (c + 0.5);
  for (let f = 0; f < floors; f++) {
    const y0 = B.groundH + f * B.floorH;
    for (let c = 0; c < cols; c++) facadeModule(rng, batch, M, rng.weighted(B.modules), colX(c), y0, fz);
    if (rng.rand() < B.balconyChance) balcony(batch, M, colX(rng.int(0, cols - 1)), y0, colW - 0.1, fz);
    if (rng.rand() < B.cableChance) {
      for (let i = rng.int(2, 3); i > 0; i--) batch.box(M.cable, w, 0.04, 0.04, 0, y0 - 0.12 - i * 0.07, fz + 0.04 + i * 0.03);
    }
  }
  if (rng.rand() < B.pipeChance) {
    const side = rng.pick([-1, 1]);
    batch.add(M.pipe, new THREE.CylinderGeometry(0.07, 0.07, h, 6).translate(side * (w / 2 - 0.1), h / 2, fz + 0.1));
  }

  // Signs: a shop sign over the awning and/or a vertical blade sign.
  const signCount = rng.int(B.signs[0], B.signs[1]);
  const bladeN = Math.min(rng.int(B.signGlyphs[0], B.signGlyphs[1]), Math.floor(h - B.groundH - 0.5));
  const bladeSide = rng.pick([-1, 1]);
  const blade = bladeN >= 2 && (signCount === 2 || rng.rand() < 0.5);
  if (signCount === 2 || !blade) {
    const n = Math.min(rng.int(B.signGlyphs[0], B.signGlyphs[1]), Math.floor(sw));
    addSign(rng, batch, M, false, n, 0, Aw.y + 0.75, fz + 0.05, fz);
  }
  if (blade) addSign(rng, batch, M, true, bladeN, bladeSide * (w / 2 - 0.3), B.groundH + 0.3 + bladeN / 2, fz + 0.6, fz);
  return h;
}
