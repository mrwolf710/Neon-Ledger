import * as THREE from 'three';
import { createBatch } from '../gen/batch.js';
import { getMaterials, BUILDINGS } from '../gen/buildings.js';
import { propMats } from '../gen/props.js';
import { PALETTE as P } from '../gen/palette.js';
import { drawText } from '../gen/pixelfont.js';
import { buildDistrict, zoneAt as streetZone } from './district.js';
import { streetBounds } from './collision.js';

// Places the player can be. They sit far apart on the X axis so each keeps its own lights, fog and shadows.
// outdoor: rain falls. surface: footstep sound (null = decided by position, as on the street). mood: music.
export const AREAS = {
  street:   { origin: [0, 0],    name: 'Lowmarket Street',       district: 'Lowmarket', outdoor: true,  mood: 'street', surface: null },
  platform: { origin: [-150, 0], name: 'Line 9 Platform',        district: 'Lowmarket', outdoor: false, mood: 'station', surface: 'tile' },
  sable:    { origin: [150, 0],  name: 'Sable Noodle House',     district: 'Lowmarket', outdoor: false, mood: 'street', surface: 'tile',
    zones: [{ name: 'The Back Room', box: [2.3, -3, 8, 3], mood: 'scene' }] },
  alley:    { origin: [300, 0],  name: 'Alley behind the Sable', district: 'Lowmarket', outdoor: true,  mood: 'scene',  surface: 'asphalt' },
  hostel:   { origin: [450, 0],  name: "Capsule Hostel",   district: 'Lowmarket', outdoor: false, mood: 'street', surface: 'tile' },
  car:      { origin: [600, 0],  name: "Juno's Car",             district: 'Lowmarket', outdoor: false, mood: 'scene',  surface: 'tile' },
};
const at = (id, x, z) => [AREAS[id].origin[0] + x, AREAS[id].origin[1] + z];
const H = Math.PI / 2;

// Doors between areas. facing: radians (0 = +z). Positions are world coordinates; interact near `at` to go through.
const EXIT_DEFS = [
  { id: 'platform-down', area: 'platform', at: at('platform', 8.6, 0), to: 'street', spawn: [13.8, 1.3, -H], verb: 'Take the stairs down' },
  { id: 'street-up', area: 'street', at: [15.6, 0.9], to: 'platform', spawn: [...at('platform', 7.6, 0), -H], verb: 'Climb to Line 9' },
  { id: 'sable-door', area: 'street', at: [-0.3, -4.15], to: 'sable', spawn: [...at('sable', -4.6, 0), H], verb: 'Enter the Sable' },
  { id: 'sable-out', area: 'sable', at: at('sable', -5.4, 0), to: 'street', spawn: [-0.3, -3.3, 0], verb: 'Leave' },
  { id: 'sable-back', area: 'sable', at: at('sable', 7.4, 0), to: 'alley', spawn: [...at('alley', 0, -6.3), 0], verb: 'Go out the back' },
  { id: 'alley-in', area: 'alley', at: at('alley', 0, -7.2), to: 'sable', spawn: [...at('sable', 6.5, 0), -H], verb: 'Back inside' },
  { id: 'hostel-door', area: 'street', at: [10.6, 4.15], to: 'hostel', spawn: [...at('hostel', 0, 2.0), Math.PI], verb: "Enter the capsule hostel" },
  { id: 'hostel-out', area: 'hostel', at: at('hostel', 0, 2.9), to: 'street', spawn: [11.3, 3.5, Math.PI], verb: 'Leave' },
  { id: 'car-door', area: 'street', at: [-13.5, -0.1], to: 'car', spawn: [...at('car', 0.4, 0), H], verb: 'Get in the car' },
  { id: 'car-out', area: 'car', at: at('car', 0.5, 1.3), to: 'street', spawn: [-13.5, 0.7, 0], verb: 'Get out' },
];
export const EXITS = EXIT_DEFS;

// ---------- small building helpers (all coordinates are local to the area origin) ----------
const T = 0.3, WALL_H = 1.0;   // low "dollhouse" walls so the near ones never hide people standing behind them

function wallPiece(b, M, cx, cz, w, d, h = WALL_H, mat = M.walls[0]) {
  b.box(mat, w, h, d, cx, h / 2, cz);
  b.box(M.roof, w + 0.08, 0.08, d + 0.08, cx, h + 0.04, cz); // cap
}
// A wall along X at z, from xa to xb, with door gaps [[g0, g1]]. block: also solid for collision.
function wallX(b, M, z, xa, xb, gaps = [], o = {}) {
  let a = xa;
  for (const [g0, g1] of [...gaps, [xb, xb]].sort((p, q) => p[0] - q[0])) {
    if (g0 - a > 0.02) { wallPiece(b, M, (a + g0) / 2, z, g0 - a, o.t ?? T, o.h, o.mat); if (o.block) b.block((a + g0) / 2, z, g0 - a, o.t ?? T); }
    a = g1;
  }
}
function wallZ(b, M, x, za, zb, gaps = [], o = {}) {
  let a = za;
  for (const [g0, g1] of [...gaps, [zb, zb]].sort((p, q) => p[0] - q[0])) {
    if (g0 - a > 0.02) { wallPiece(b, M, x, (a + g0) / 2, o.t ?? T, g0 - a, o.h, o.mat); if (o.block) b.block(x, (a + g0) / 2, o.t ?? T, g0 - a); }
    a = g1;
  }
}
const floor = (b, mat, x0, z0, x1, z1) => b.box(mat, x1 - x0, 0.1, z1 - z0, (x0 + x1) / 2, -0.05, (z0 + z1) / 2);
const doorMat = (b, M, x, z, w, d) => b.box(M.litCool, w, 0.03, d, x, 0.02, z); // glowing mat where an exit is

function table(b, PM, x, z, w = 1.5, d = 0.9) {
  b.box(PM.wood, w, 0.07, d, x, 0.78, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(PM.pole, 0.07, 0.76, 0.07, x + sx * (w / 2 - 0.1), 0.38, z + sz * (d / 2 - 0.1));
  b.block(x, z, w, d);
}
function stool(b, PM, x, z) {
  b.add(PM.pole, new THREE.CylinderGeometry(0.2, 0.2, 0.08, 8).translate(x, 0.5, z));
  b.add(PM.pole, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6).translate(x, 0.25, z));
  b.block(x, z, 0.4, 0.4);
}
function crates(b, PM, x, z, n = 2) {
  for (let i = 0; i < n; i++) b.box(PM.crates[i % PM.crates.length], 0.7, 0.6, 0.7, x, 0.3 + i * 0.6, z);
  b.block(x, z, 0.7, 0.7);
}

// A pixel-font sign texture: dark backing, bright letters.
function textSign(text, color, bg = P.ink) {
  const w = text.length * 4 + 3, h = 9;
  const cv = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = cv.getContext('2d');
  ctx.fillStyle = `#${bg.toString(16).padStart(6, '0')}`; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, w, 1); ctx.fillRect(0, h - 1, w, 1); ctx.fillRect(0, 0, 1, h); ctx.fillRect(w - 1, 0, 1, h); // border
  drawText(ctx, text, 2, 2, `#${color.toString(16).padStart(6, '0')}`);
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const signMat = (text, color) => new THREE.MeshBasicMaterial({ map: textSign(text, color), color: new THREE.Color().setScalar(BUILDINGS.signGlow) });

function begin(id) {
  const b = createBatch();
  b.setTransform(AREAS[id].origin[0], AREAS[id].origin[1], 0);
  return b;
}
// Finish an area: bounds are local floor rectangles; returns the common record.
function finish(id, b, bounds, extra = {}) {
  const [ox, oz] = AREAS[id].origin, group = b.build();
  group.name = id;
  return {
    id, meta: AREAS[id], group, extra, ...extra,
    blocks: group.userData.blocks, spots: group.userData.spots, lights: group.userData.lights,
    signs: group.userData.signs, steam: group.userData.steam,
    bounds: { x0: ox + bounds[0], z0: oz + bounds[1], x1: ox + bounds[2], z1: oz + bounds[3] },
  };
}

// The discarded glove: the owner's pixel art (public/sprites/glove/glove.png) lying flat on the alley floor. Skipped where there is no browser (node checks).
const GLOVE = { size: 1.0, y: 0.05, turn: -0.5 }; // size in world units; turn = rotation on the floor, radians
function gloveSprite(x, z) {
  if (typeof Image === 'undefined') return null;
  const map = new THREE.TextureLoader().load(`${import.meta.env?.BASE_URL ?? '/'}sprites/glove/glove.png`);
  map.magFilter = map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; map.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(GLOVE.size, GLOVE.size).rotateX(-Math.PI / 2).rotateY(GLOVE.turn), new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, roughness: 0.8 }));
  mesh.position.set(x, GLOVE.y, z);
  return mesh;
}

// ---------- Line 9 platform ----------
function platform(M) {
  const b = begin('platform'), PM = propMats(M);
  floor(b, M.sidewalk, -10, -3, 10, 3);
  b.box(M.litWarm, 20, 0.03, 0.18, 0, 0.02, -2.85);                       // safety line at the platform edge
  // Track bed, rails and sleepers.
  b.box(M.road, 26, 0.1, 3.4, 0, -0.35, -4.6);
  for (const z of [-5.4, -3.8]) b.box(M.metal, 26, 0.12, 0.1, 0, -0.24, z);
  for (let x = -12.5; x <= 12.5; x += 0.9) b.box(M.pipe, 0.25, 0.08, 2.2, x, -0.26, -4.6);
  // Back wall with a sign and two benches.
  wallX(b, M, 3 + T / 2, -10 - T, 10 + T, [], { h: 1.2, mat: M.walls[1] });
  b.box(signMat('LINE 9 LOWMARKET', P.cyan), 7.2, 1.0, 0.12, -2, 1.9, 3.15, 0, 0, false);   // above the low wall; readable from both sides
  b.light(P.cyan, 9, -2, 2.0, 2.6);
  for (const x of [-6, 3]) { b.box(PM.wood, 2.0, 0.08, 0.5, x, 0.5, 2.2); b.box(PM.pole, 0.08, 0.5, 0.4, x - 0.85, 0.25, 2.2); b.box(PM.pole, 0.08, 0.5, 0.4, x + 0.85, 0.25, 2.2); b.block(x, 2.2, 2.0, 0.5); }
  // Canopy posts with lamps.
  for (const x of [-8, -4, 4, 8]) { b.box(M.metal, 0.25, 3.6, 0.25, x, 1.8, -2.2); b.block(x, -2.2, 0.3, 0.3); b.box(PM.lamp, 0.5, 0.1, 0.3, x, 3.55, -2.2); b.light(P.amberLight, 11, x, 3.2, -1.6); }
  for (const x of [-9, -4.5, 0, 4.5, 9]) b.light(P.amberLight, 9, x, 2.3, -3.1);   // light for the train side and the platform edge
  b.light(P.cyan, 7, 0, 1.4, -3.3);
  // Stairs down at the east end.
  for (let i = 0; i < 4; i++) b.box(M.metal, 0.5, 0.12, 2.4, 9 + i * 0.35, -0.08 * i, 0);
  doorMat(b, M, 8.6, 0, 1.0, 1.6);
  b.spot('start', -1.0, -2.0); b.spot('exit', 8.6, 0); b.spot('trainstop', 0, -4.6);
  // The train: its own group so it can roll in. Body faces the platform at z = -3.
  const tb = createBatch(); tb.setTransform(0, 0, 0);
  const glow = (hex) => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(BUILDINGS.windowGlow) }); m.userData.base = m.color.clone(); return m; };
  const trainWarm = glow(P.amber), trainCool = glow(P.cyan);          // window and door light; beats fades them in
  const L = 14;
  tb.box(M.walls[1], L, 2.7, 2.6, 0, 1.55, 0);                         // body: pale concrete panels so the platform lamps show it
  tb.box(M.frame, L + 0.2, 0.2, 2.7, 0, 3.0, 0);                       // roof
  tb.box(M.rail, L, 0.5, 2.4, 0, 0.45, 0);                             // undercarriage
  tb.box(trainCool, L, 0.08, 0.06, 0, 0.95, 1.33);                     // thin glowing stripe along the side
  for (let i = -2.5; i <= 2.5; i++) tb.box(trainWarm, 1.7, 0.8, 0.06, i * 2.5, 2.1, 1.33);   // windows on the platform side
  tb.box(trainCool, 1.2, 1.9, 0.06, 0, 1.2, 1.34);                    // the door Juno steps out of
  const train = tb.build();
  train.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  train.position.set(AREAS.platform.origin[0] - 40, 0, AREAS.platform.origin[1] - 4.6);
  return finish('platform', b, [-10, -3, 10, 3], { train, trainGlow: [trainWarm, trainCool], trainStop: [AREAS.platform.origin[0] - 0.5, -4.6] });
}

// ---------- Sable Noodle House: front counter (west) and the back room (east) ----------
function sable(M) {
  const b = begin('sable'), PM = propMats(M);
  floor(b, M.walls[2], -6, -3, 2, 3);
  floor(b, M.sidewalk, 2, -3, 8, 3);                       // lighter slabs so the scene reads
  wallX(b, M, -3 - T / 2, -6 - T, 8 + T);
  wallX(b, M, 3 + T / 2, -6 - T, 8 + T);
  wallZ(b, M, -6 - T / 2, -3, 3, [[-0.9, 0.9]]);                       // front door to the street
  wallZ(b, M, 8 + T / 2, -3, 3, [[-0.9, 0.9]]);                        // back door to the alley
  wallZ(b, M, 2, -3, 3, [[-0.9, 0.9]], { block: true });               // divider with a doorway
  doorMat(b, M, -5.55, 0, 0.8, 1.4); doorMat(b, M, 7.6, 0, 0.8, 1.4);
  // Front room: counter, pots, two tables.
  b.box(PM.wood, 5.0, 1.0, 0.9, -3.2, 0.5, -2.45); b.box(M.metal, 5.1, 0.06, 1.0, -3.2, 1.03, -2.45); b.block(-3.2, -2.45, 5.0, 0.9);
  for (const x of [-4.6, -3.4, -2.2]) b.box(PM.lantern, 0.3, 0.2, 0.3, x, 1.16, -2.45);
  table(b, PM, -3.7, 1.5); stool(b, PM, -4.4, 2.3); stool(b, PM, -3.0, 2.3);
  table(b, PM, -0.4, 1.4); stool(b, PM, -1.0, 2.2); stool(b, PM, 0.2, 2.2);
  b.box(signMat('NOODLES', P.magenta), 3.0, 0.8, 0.1, -3.2, 2.9, -2.6, 0, 0, false);   // hangs above Teo's head (she is 2 units tall)
  b.light(P.amberLight, 13, -2.5, 2.4, 0.5); b.light(P.amber, 9, -4.6, 2.2, 1.6); b.light(P.amberLight, 8, -3.2, 1.8, -1.2);
  // Back room: the table, two cups, shelves, the terminal, a smashed lamp.
  table(b, PM, 4.6, 0.2, 1.8, 1.0); stool(b, PM, 4.6, 1.15);
  b.box(PM.crates[0], 0.14, 0.12, 0.14, 4.1, 0.85, 0.05); b.box(PM.crates[1], 0.14, 0.12, 0.14, 5.0, 0.85, 0.35);
  crates(b, PM, 6.9, -2.5, 2); crates(b, PM, 7.6, -2.5, 3); b.box(PM.crates[2], 1.6, 1.2, 0.5, 3.1, 0.6, -2.7); b.block(3.1, -2.7, 1.6, 0.5);
  b.box(M.frame, 0.6, 1.0, 0.4, 5.6, 0.5, -2.75); b.block(5.6, -2.75, 0.6, 0.4); b.box(M.litCool, 0.4, 0.35, 0.02, 5.6, 0.85, -2.54);
  b.box(PM.pole, 0.9, 0.07, 0.07, 3.0, 0.08, -1.2); b.box(PM.lamp, 0.35, 0.18, 0.35, 3.55, 0.12, -1.15);   // the broken lamp lying down, its head still glowing
  for (let i = 0; i < 9; i++) b.box(M.litCool, 0.1, 0.03, 0.07, 2.4 + (i % 3) * 0.28, 0.03, -0.9 + (i >> 1) * 0.12);  // glass
  b.light(P.white, 18, 4.6, 2.5, 0.6);                      // the forensic lamp over the table: Dex, the cups and the floor around them
  b.light(P.cyanLight, 12, 3.2, 2.2, -1.6); b.light(P.magenta, 7, 6.8, 2.0, -1.4); b.light(P.cyan, 9, 3.2, 1.6, 2.0); b.light(P.cyan, 7, 6.8, 1.8, 1.6);
  b.spot('teo', -3.2, -2.9); b.spot('dex', 4.6, 0.95); b.spot('body', 5.5, 1.5); b.spot('port', 3.7, 1.0);
  b.spot('cups', 4.55, -0.9); b.spot('terminal', 5.6, -2.0); b.spot('lamp', 3.0, -0.7); b.spot('echo', 6.0, 1.9);
  b.spot('backroom', 3.0, 0); b.spot('frontdoor', -5.4, 0); b.spot('backdoor', 7.4, 0);
  return finish('sable', b, [-6, -3, 8, 3]);
}

// ---------- Alley behind the Sable (runs along Z; the Sable's back door is at the north end) ----------
function alley(M) {
  const b = begin('alley'), PM = propMats(M);
  floor(b, M.road, -1.6, -8, 1.6, 8);
  for (const sx of [-1, 1]) { const h = sx < 0 ? 2.6 : 1.3; b.box(M.walls[0], 1.0, h, 17, sx * 2.1, h / 2, 0); b.box(M.roof, 1.1, 0.1, 17.1, sx * 2.1, h + 0.05, 0); }
  b.box(M.walls[1], 5.2, 2.6, 1.0, 0, 1.3, -8.5);
  b.box(M.litWarm, 1.2, 1.9, 0.06, 0, 0.95, -7.96);                     // the Sable's back door, lit
  b.box(M.walls[0], 5.2, 1.3, 1.0, 0, 0.65, 8.5);
  b.box(M.litCool, 0.8, 0.03, 1.2, 0, 0.02, -7.2);
  b.box(PM.crates[0], 1.2, 1.0, 0.8, -0.9, 0.5, -3.6); b.block(-0.9, -3.6, 1.2, 0.8);
  crates(b, PM, 1.0, 5.8, 2); crates(b, PM, -1.1, 6.3, 1); b.box(PM.bag, 0.5, 0.4, 0.5, 1.1, 0.2, -1.2);
  b.box(M.pipe, 0.18, 2.5, 0.18, -1.45, 1.25, 1.0); b.box(M.pipe, 0.18, 2.5, 0.18, 1.45, 1.25, -2.4);
  b.light(P.white, 7, 0.7, 1.3, 3.2);                                   // a clue deserves a light
  b.light(P.amber, 11, 0, 2.5, -2.5); b.light(P.cyan, 9, 0, 2.4, 5.5); b.light(P.magenta, 6, 0, 2.0, 1.0);
  b.spot('glove', 0.7, 3.3); b.spot('echo', 0, 0.5);
  const area = finish('alley', b, [-1.6, -8, 1.6, 8]);
  const glove = gloveSprite(AREAS.alley.origin[0] + 0.7, 3.3);
  if (glove) area.group.add(glove);
  return area;
}

// ---------- capsule hostel ----------
function hostel(M) {
  const b = begin('hostel'), PM = propMats(M);
  floor(b, M.walls[1], -5, -3.5, 5, 3.5);
  wallX(b, M, -3.5 - T / 2, -5 - T, 5 + T); wallX(b, M, 3.5 + T / 2, -5 - T, 5 + T, [[-0.9, 0.9]]);
  wallZ(b, M, -5 - T / 2, -3.5, 3.5); wallZ(b, M, 5 + T / 2, -3.5, 3.5);
  doorMat(b, M, 0, 3.1, 1.4, 0.6);
  for (const x of [-3.2, -0.6, 2.0]) {                                      // stacked capsules, each with a lit hatch
    b.box(M.metal, 2.3, 1.05, 1.2, x, 0.53, -2.85); b.box(M.litCool, 1.4, 0.55, 0.05, x, 0.55, -2.24); b.block(x, -2.85, 2.3, 1.2);
    b.box(M.metal, 2.3, 1.05, 1.2, x, 1.62, -2.85); b.box(M.litWarm, 1.4, 0.55, 0.05, x, 1.64, -2.24);
  }
  b.box(PM.wood, 2.6, 1.0, 0.8, 3.4, 0.5, 2.5); b.box(M.metal, 2.7, 0.06, 0.9, 3.4, 1.03, 2.5); b.block(3.4, 2.5, 2.6, 0.8); // reception desk
  b.box(PM.vendBody, 0.9, 1.8, 0.7, -4.2, 0.9, 1.0); b.box(PM.vendGlow, 0.6, 1.0, 0.02, -4.2, 1.15, 0.64); b.block(-4.2, 1.0, 0.9, 0.7);
  table(b, PM, -2.2, 1.2, 1.4, 0.8); stool(b, PM, -2.9, 1.9); stool(b, PM, -1.5, 1.9);
  b.box(signMat('CAPSULES', P.pink), 3.2, 0.8, 0.1, 0.5, 2.8, -2.0, 0, 0, false);       // hangs above the bunks, clear of every wall
  b.light(P.magenta, 12, 0, 2.5, -0.5); b.light(P.cyan, 9, 3.0, 2.2, 2.0); b.light(P.amberLight, 8, -3.5, 2.2, 1.0);
  b.spot('kit', 1.2, 0.6); b.spot('door', 0, 2.9); b.spot('capsule3f', -0.6, -1.9); // Dex's capsule: the middle stack
  return finish('hostel', b, [-5, -3.5, 5, 3.5]);
}

// ---------- Juno's car (the board lives here) ----------
function car(M) {
  const b = begin('car'), PM = propMats(M);
  floor(b, M.rail, -3, -1.6, 3, 1.6);
  wallX(b, M, -1.6 - T / 2, -3 - T, 3 + T, [], { h: 1.1, mat: M.rail }); wallX(b, M, 1.6 + T / 2, -3 - T, 3 + T, [[-0.7, 0.7]], { h: 1.1, mat: M.rail });
  wallZ(b, M, -3 - T / 2, -1.6, 1.6, [], { h: 1.1, mat: M.rail }); wallZ(b, M, 3 + T / 2, -1.6, 1.6, [], { h: 1.1, mat: M.rail });
  for (const z of [-0.95, 0.95]) { b.box(PM.vendBody, 0.8, 0.6, 0.8, -0.4, 0.3, z); b.box(PM.vendBody, 0.2, 0.9, 0.8, -0.8, 0.75, z); b.block(-0.4, z, 0.8, 0.8); } // front seats
  b.box(PM.vendBody, 0.9, 0.5, 2.6, 1.6, 0.25, 0); b.block(1.6, 0, 0.9, 2.6);                                                                        // back bench
  b.box(M.frame, 0.6, 0.7, 3.0, -2.5, 0.35, 0); b.box(M.litCool, 0.04, 0.35, 1.4, -2.18, 0.65, 0); b.block(-2.5, 0, 0.6, 3.0);                          // dashboard + glowing screen
  b.box(M.litCool, 0.03, 0.03, 2.8, -2.17, 0.9, 0);
  b.light(P.cyan, 16, -2.0, 1.4, 0); b.light(P.amber, 12, 1.5, 2.0, 0); b.light(P.white, 10, 0.2, 2.2, 0);
  doorMat(b, M, 0.5, 1.35, 1.0, 0.4);
  b.spot('seat', 0.4, 0); b.spot('door', 0.5, 1.3);
  return finish('car', b, [-3, -1.6, 3, 1.6]);
}

// ---------- Street extras: the Sable's sign, the car, and a glowing mat at each door ----------
function streetExtras(M) {
  const b = createBatch(), PM = propMats(M);
  b.setTransform(0, 0, 0);
  b.box(signMat('SABLE', P.amber), 6, 1.2, 0.1, 0, 3.1, -4.82, 0, 0, false);          // covers the random shop sign on that building
  b.light(P.amberLight, 4.5, 0, 3.0, -4.2);
  b.box(PM.vendBody, 3.0, 0.6, 1.4, -13.5, 0.4, -1.9); b.box(M.glassDark, 1.6, 0.5, 1.3, -13.7, 0.95, -1.9); b.block(-13.5, -1.9, 3.0, 1.4);   // Juno's car
  b.box(M.litWarm, 0.12, 0.12, 0.3, -12.0, 0.45, -1.4); b.box(M.litWarm, 0.12, 0.12, 0.3, -12.0, 0.45, -2.4);
  b.light(P.cyan, 3, -13.5, 1.4, -1.9);
  for (const e of EXIT_DEFS.filter((x) => x.area === 'street')) b.box(M.litCool, 1.2, 0.03, 0.8, e.at[0], 0.03 + (Math.abs(e.at[1]) > 3 ? 0.15 : 0), e.at[1]);
  const g = b.build();
  return { group: g, blocks: g.userData.blocks, lights: g.userData.lights };
}

// Builds every area. rng: the world rng; returns { id: area }.
export function buildAreas(rng) {
  const M = getMaterials(rng.fork('district').fork('textures'));   // same shared materials the street uses
  const d = buildDistrict(rng.fork('district'));
  const ex = streetExtras(M);
  d.add(ex.group);
  const street = {
    id: 'street', meta: AREAS.street, group: d, extra: {},
    blocks: [...d.userData.blocks, ...ex.blocks], spots: d.userData.spots, lights: [...d.userData.lights, ...ex.lights],
    signs: d.userData.signs, steam: d.userData.steam, bounds: streetBounds(), road: [-3, 3],
  };
  const areas = { street, platform: platform(M), sable: sable(M), alley: alley(M), hostel: hostel(M), car: car(M) };
  // The train is a child of the platform group so it shows and hides with it.
  areas.platform.group.add(areas.platform.train);
  for (const e of EXIT_DEFS) (areas[e.area].exits ??= []).push(e);
  return areas;
}

// Which named place (for the banner) and music mood the player is in.
export function placeAt(area, x, z) {
  if (area.id === 'street') return { ...streetZone(x, z), mood: 'street' };
  const [ox, oz] = area.meta.origin, lx = x - ox, lz = z - oz;
  const zone = [...(area.meta.zones ?? [])].reverse().find((q) => lx >= q.box[0] && lx <= q.box[2] && lz >= q.box[1] && lz <= q.box[3]);
  return { name: zone?.name ?? area.meta.name, district: area.meta.district, mood: zone?.mood ?? area.meta.mood };
}
