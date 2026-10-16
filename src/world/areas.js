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
  dealer:   { origin: [900, 0],  name: 'Implants',               district: 'Undercity', outdoor: false, mood: 'dealer',  surface: 'tile' }, // chapter 2: the implant dealer's shop (docs/chapter-2.md)
  exchange: { origin: [750, 0],  name: 'The Echo Exchange',      district: 'Undercity', outdoor: true,  mood: 'bazaar', surface: 'asphalt' }, // chapter 2 hub (docs/chapter-2.md)
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
  { id: 'dealer-door', area: 'exchange', at: at('exchange', 0, -8.8), to: 'dealer', spawn: [...at('dealer', 0, 2.0), Math.PI], verb: 'Go into the implant shop' },
  { id: 'dealer-out', area: 'dealer', at: at('dealer', 0, 2.9), to: 'exchange', spawn: [...at('exchange', 0, -7.6), 0], verb: 'Leave' },
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
const signMat = (text, color, noCut = false, minLum = 0) => { // noCut: the see-through circle around Juno never removes this sign; minLum: brighten dark colours (blue, red, purple) until the text is this bright, so every sign blooms
  const c = new THREE.Color(color), lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const m = new THREE.MeshBasicMaterial({ map: textSign(text, color), color: new THREE.Color().setScalar(Math.min(EXCHANGE.signBoostMax, Math.max(BUILDINGS.signGlow, minLum / lum))) });
  m.userData.noCut = noCut;
  return m;
};

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
  b.box(signMat('LINE 9 LOWMARKET', P.cyan, true), 7.2, 1.0, 0.12, -2, 1.9, 3.15, 0, 0, false);   // above the low wall; readable from both sides
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
  // A streamlined nose on the front (+x, the way it rolls in): a sloped wedge with a dark windscreen, a glowing headlight bar and two lamps; red tail lights at the back.
  const nose = new THREE.Shape(); [[0, 0.2], [0, 3.1], [1.6, 2.55], [2.5, 1.7], [2.62, 0.95], [2.45, 0.2]].forEach(([x, y], i) => (i ? nose.lineTo(x, y) : nose.moveTo(x, y)));
  tb.add(M.walls[1], new THREE.ExtrudeGeometry(nose, { depth: 2.64, bevelEnabled: false }).translate(L / 2, 0, -1.32));
  const wsA = [L / 2 + 0.25, 3.016], wsB = [L / 2 + 1.35, 2.636], wz = 0.95, off = [0.012, 0.035];       // the windscreen: a quad lying just above the slope
  const ws = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([wsA[0] + off[0], wsA[1] + off[1], -wz, wsA[0] + off[0], wsA[1] + off[1], wz, wsB[0] + off[0], wsB[1] + off[1], wz, wsB[0] + off[0], wsB[1] + off[1], -wz], 3));
  ws.setIndex([0, 1, 2, 0, 2, 3]); ws.computeVertexNormals();
  tb.add(new THREE.MeshBasicMaterial({ color: 0x0a1822, side: THREE.DoubleSide }), ws);
  const trainHead = glow(0xe8fbff), trainTail = glow(0xff2a3a);
  tb.box(trainHead, 0.1, 0.22, 1.7, L / 2 + 2.57, 1.2, 0);              // headlight bar across the nose
  for (const sz of [-1, 1]) { tb.box(trainHead, 0.14, 0.34, 0.34, L / 2 + 2.56, 1.2, sz * 0.78); tb.box(trainTail, 0.06, 0.18, 0.5, -L / 2 - 0.02, 1.1, sz * 0.7); }
  const train = tb.build();
  train.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  train.position.set(AREAS.platform.origin[0] - 40, 0, AREAS.platform.origin[1] - 4.6);
  return finish('platform', b, [-10, -3, 10, 3], { train, trainGlow: [trainWarm, trainCool, trainHead, trainTail], trainStop: [AREAS.platform.origin[0] - 0.5, -4.6] });
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
  b.box(PM.wood, 5.0, 1.0, 0.7, -3.2, 0.5, -1.5); b.box(M.metal, 5.1, 0.06, 0.8, -3.2, 1.03, -1.5); b.block(-3.2, -1.5, 5.0, 0.7);   // counter stands clear of the back wall: Mama Teo has room to stand behind it
  for (const x of [-4.6, -3.4, -2.2]) b.box(PM.lantern, 0.3, 0.2, 0.3, x, 1.16, -1.5);
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
  b.spot('teo', -3.2, -2.45); b.spot('dex', 4.6, 0.95); b.spot('body', 5.5, 1.5); b.spot('port', 3.7, 1.0);
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
  // Room numbers above each hatch: the lower row 3E 3F 3G (Dex's is 3F, the middle one), the upper row 3H 3J 3K.
  [-3.2, -0.6, 2.0].forEach((x, i) => {
    b.box(signMat(['3E', '3F', '3G'][i], i === 1 ? P.amber : P.cyan), 0.8, 0.4, 0.03, x, 0.96, -2.21, 0, 0, false);
    b.box(signMat(['3H', '3J', '3K'][i], P.cyan), 0.8, 0.4, 0.03, x, 2.05, -2.21, 0, 0, false);
  });
  b.box(PM.wood, 2.6, 1.0, 0.8, 3.4, 0.5, 2.5); b.box(M.metal, 2.7, 0.06, 0.9, 3.4, 1.03, 2.5); b.block(3.4, 2.5, 2.6, 0.8); // reception desk
  b.box(PM.vendBody, 0.9, 1.8, 0.7, -4.2, 0.9, 1.0); b.box(PM.vendGlow, 0.6, 1.0, 0.02, -4.2, 1.15, 0.64); b.block(-4.2, 1.0, 0.9, 0.7);
  table(b, PM, -2.2, 1.2, 1.4, 0.8); stool(b, PM, -2.9, 1.9); stool(b, PM, -1.5, 1.9);
  b.box(signMat('CAPSULES', P.pink), 3.2, 0.8, 0.1, 0.5, 2.8, -2.0, 0, 0, false);       // hangs above the bunks, clear of every wall
  b.light(P.magenta, 12, 0, 2.5, -0.5); b.light(P.cyan, 9, 3.0, 2.2, 2.0); b.light(P.amberLight, 8, -3.5, 2.2, 1.0);
  b.spot('kit', 1.2, 0.6); b.spot('door', 0, 2.9); b.spot('capsule3f', -0.6, -1.9); // Dex's capsule: the middle stack
  return finish('hostel', b, [-5, -3.5, 5, 3.5]);
}

// ---------- Chapter 2: the implant dealer's shop (the only interior of the Exchange). Locker 9 is Dex's. Spots: door, dealer (behind the counter), locker (in front of Locker 9), locker7 / 8 / 10 / 11, fixer (where the suit steps in). ----------
const DEALER = { numbers: [7, 8, 9, 10, 11], dexLocker: 9, step: 1.75 }; // five lockers along the back wall, each numbered above it; Locker 9 (Dex's) is the middle one
function dealer(M) {
  const b = begin('dealer'), PM = propMats(M);
  floor(b, M.walls[1], -5, -3.5, 5, 3.5);
  wallX(b, M, -3.5 - T / 2, -5 - T, 5 + T); wallX(b, M, 3.5 + T / 2, -5 - T, 5 + T, [[-0.9, 0.9]]);
  wallZ(b, M, -5 - T / 2, -3.5, 3.5); wallZ(b, M, 5 + T / 2, -3.5, 3.5);
  doorMat(b, M, 0, 3.1, 1.4, 0.6);
  // The locker wall: five tall steel doors, each with its number on a plate above it; Locker 9 glows amber.
  DEALER.numbers.forEach((n, i) => {
    const x = (i - (DEALER.numbers.length - 1) / 2) * DEALER.step, mine = n === DEALER.dexLocker;
    b.box(M.metal, 1.5, 1.5, 0.45, x, 0.75, -3.25); b.box(mine ? M.litWarm : M.frame, 1.0, 0.07, 0.03, x, 1.2, -3.02); b.box(M.frame, 0.1, 0.3, 0.04, x + 0.62, 0.7, -3.02); b.box(M.litCool, 0.55, 0.38, 0.03, x, 0.78, -3.02); b.spot(mine ? 'locker' : `locker${n}`, x, -2.3); // door, a status strip, a handle, and the blue panel you use it by
    b.box(signMat(String(n), mine ? P.amber : P.cyan), 0.75, 0.4, 0.04, x, 1.85, -3.02, 0, 0, false);                                                           // the number above it
  });
  b.block(0, -3.25, 9.6, 0.45);
  b.box(PM.wood, 3.0, 1.0, 0.9, -2.9, 0.5, 0.4); b.box(M.metal, 3.1, 0.06, 1.0, -2.9, 1.03, 0.4); b.block(-2.9, 0.4, 3.0, 0.9); // the dealer's counter
  b.box(M.litCool, 0.8, 0.03, 0.5, -2.2, 1.08, 0.4);                                                                             // the counter's reader pad
  table(b, PM, 3.2, 0.4, 1.3, 0.8); stool(b, PM, 2.6, 1.2); stool(b, PM, 3.8, 1.2);
  b.box(signMat('IMPLANTS', 0xff3b2f), 3.2, 0.8, 0.1, -2.9, 2.8, -0.2, 0, 0, false); // over the counter, clear of the lockers and their numbers
  b.light(0xff3b2f, 16, 0, 2.5, -0.5); b.light(0xffa23a, 13, 3.0, 2.2, 2.0); b.light(0xffd23a, 12, -3.5, 2.2, 1.0); b.light(0xff6a1f, 10, 0.5, 2.0, -2.0);
  b.spot('door', 0, 2.9); b.spot('dealer', -2.9, -0.7); b.spot('fixer', 2.6, 1.8);
  return finish('dealer', b, [-5, -3.5, 5, 3.5]);
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

// ---------- Chapter 2 hub: the Echo Exchange (open market square; docs/chapter-2.md) ----------
// The implant dealer's shopfront sits in the north-middle gap. First pass: placeholder booths with sign text, lights and collision. Vendors are cast later (spots 'v_<id>', each facing its counter's customer side).
export const EXCHANGE = {
  half: [15, 10.5],                 // square half-size (x, z)
  neon: { red: 0xff3b2f, orange: 0xff8a1f, yellow: 0xffd23a, blue: 0x2f8bff, green: 0x2fe07a, purple: 0xa43bff },   // the palette of the whole square; booths cycle through `order`
  signLum: 1.3, signBoostMax: 7,   // every sign's text is lifted to this brightness (over the bloom threshold 0.85) up to this multiplier, so dark colours glow as much as yellow
  deadSign: 0x7a6a92, deadFrame: 0x4a4052, deadLight: 0x8a78b0,   // the abandoned booth: a dull violet sign and frame, lit only by one weak cold light
  order: ['red', 'blue', 'yellow', 'purple', 'orange', 'green'],
  // id, sign text, x, z (the vendor's spot), side (-1: customers come from +z, +1: from -z), width, yaw offset (radians), style (awning | kiosk | cart).
  // Deliberately uneven: no two booths share a width, angle or style for long, and none sit on a grid. Placeholder stock; the cast list is in docs/chapter-2.md.
  booths: [
    ['echoes', 'ECHO CHAMBER', -10.4, -8.9, -1, 3.6, 0.10, 'kiosk'], ['sauce', 'SAUCY BUSINESS', -4.2, -8.2, -1, 2.6, -0.14, 'cart'], ['noodles', 'SLURP CITY', 3.4, -9.1, -1, 3.0, 0.08, 'awning'], ['tarot', 'TAROT OR NOT', 10.1, -8.4, -1, 3.8, -0.12, 'kiosk'],
    ['parts', 'PART TIME PARTS', -9.4, 8.7, 1, 3.4, -0.16, 'awning'], ['jewels', 'BLING THING', -2.6, 8.2, 1, 2.4, 0.2, 'cart'], ['umbrellas', 'RAIN CHECK', 4.6, 8.9, 1, 3.8, 0.09, 'kiosk'], ['idprint', 'FAUX REAL', 11.2, 8.0, 1, 2.8, -0.22, 'awning'],
    ['cables', 'CABLE GUY', -4.6, -2.9, -1, 3.0, 0.42, 'awning'], ['stim', 'STIMULATING STIMS', 4.0, -2.0, -1, 2.5, -0.34, 'cart'], ['drones', 'DRONE ZONE', -3.4, 3.4, 1, 3.5, 0.19, 'kiosk'], ['flowers', 'FLOWERS FOR HOURS', 5.2, 3.2, 1, 2.8, 0.22, 'cart'],
    ['abandoned', 'BACK SOON', -9.0, 3.0, 1, 3.0, -0.08, 'kiosk', true],
    ['closed', 'CLOSED FOREVER', 10.8, -3.6, -1, 3.0, 0.05, 'kiosk', true],   // a second dead booth at the east end of the middle aisle, against the wall behind Stim (from the owner's screenshot circle): sign off, no vendor   // an abandoned booth in the nook off the aisle's west end (from screenshots/abandoned_booth.png): sign and neon off, no vendor, stock left on the shelves
  ],
  // Back-alley debris walls (x0, z0, x1, z1), drawn by the owner on screenshots/path.png: solid piles of crates, barrels and pallets that force one route (view: camera yaw 270, the entrance at the bottom,
  // up = east, right = south). From the west entrance the only way is south, then east along the south lane, up the east end (between the walls' east end and the east wall), back west through the middle aisle,
  // north up the left lane, then east along the north lane (booths, the dealer's door) to a dead end in the north-east corner.
  barriers: [
    [-15, -4.3, -11.4, -4.3], [-11.4, -4.3, -11.4, 4.1],       // the entrance pocket: shut to the north and east, so the only way is south
    [-11.4, 4.1, 8.1, 4.1],                                    // behind Drones and Flowers: the south lane and the middle aisle only meet at the east end
    [-6.6, -4.6, 14.6, -4.6],                                  // behind Cables and Stim, to the east wall: the north lane is not reachable from the east
  ],
  barrierStep: 0.62,                // spacing of the piles along a wall
  lanes: [[-15, 4.1, 15, 7.2], [-11.4, -4.6, 15, 4.1], [-15, -7.2, 15, -4.6], [-11.4, -10.5, -6.6, -4.6], [-15, -4.3, -11.4, 4.1]],   // x0, z0, x1, z1: south lane, middle aisle, north lane, left lane, entrance pocket (big junk and loose crates stay out)
  junk: { small: 90, large: 14, seedLabel: 'junk' },            // how much loose clutter litters the square (placed with the seeded rng, so it is the same every run)
  scatter: [[-12.4, -4.5, 3], [-12.6, 5.4, 2], [12.8, -3.6, 2], [13.2, 3.8, 3], [0.6, 5.7, 1], [-0.8, -5.6, 2], [8.2, 0.6, 1]],   // loose crate stacks: x, z, height in crates
};
function exchange(M, rng) {
  const b = begin('exchange'), PM = propMats(M), [hx, hz] = EXCHANGE.half, glow = BUILDINGS.windowGlow;
  const neon = Object.fromEntries(Object.entries(EXCHANGE.neon).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(glow) })]));
  const cycle = EXCHANGE.order.map((k) => neon[k]), tint = EXCHANGE.order.map((k) => EXCHANGE.neon[k]), N = cycle.length;
  const sr = rng.fork('stock'), stock = [P.rust2, P.sodium0, P.rust1, P.magentaDeep, P.grey3, 0x2a4f8a, 0x2c6b4a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); // goods piled behind and on every booth
  const deadMat = new THREE.MeshStandardMaterial({ color: EXCHANGE.deadFrame, roughness: 0.9 }); // frame of a booth whose neon is off
  floor(b, M.sidewalk, -hx, -hz, hx, hz);
  for (const z of [-hz - T / 2, hz + T / 2]) wallX(b, M, z, -hx - T, hx + T, [], { h: 1.2, mat: M.walls[0] });
  wallZ(b, M, -hx - T / 2, -hz, hz, [[-1.2, 1.2]], { h: 1.2, mat: M.walls[0] });                   // west: the way in (from the car)
  for (const [x, z, ry, len, col] of [[-6, 1, 0.5, 6, neon.blue], [3, -5.5, -0.35, 5, neon.purple], [7, 6, 0.8, 4, neon.green]]) b.box(col, len, 0.04, 0.05, x, 0.02, z, 0, ry); // a few glowing floor strips at odd angles
  EXCHANGE.booths.forEach(([id, text, x, z, side, w, rot, style, off], i) => {
    const yaw = rot + (side === 1 ? Math.PI : 0), c = Math.cos(yaw), sn = Math.sin(yaw), mat = off ? deadMat : cycle[i % N], sgn = () => (off ? signMat(text, EXCHANGE.deadSign) : signMat(text, tint[i % N], false, EXCHANGE.signLum)); // an abandoned booth (off) has a dull frame and an unlit sign
    // part in the booth's own frame: lx along the counter, lz toward the customer (+z), rotated into the world with the booth.
    const part = (m, sx, sy, sz, lx, ly, lz, ry = 0, uv = true) => b.box(m, sx, sy, sz, x + lx * c + lz * sn, ly, z - lx * sn + lz * c, 0, yaw + ry, uv); // uv false = the texture fills each face (sign text)
    const fit = (aw, ah) => { const a = (text.length * 4 + 3) / 9, sw = Math.min(aw, ah * a); return [sw, sw / a]; }; // sign size that keeps the text's proportions, so long names get smaller instead of squashed
    const cd = style === 'cart' ? 0.8 : 0.9, ch = style === 'cart' ? 0.85 : 1.0, cz = 0.9;               // counter depth, height, distance from the vendor
    part(PM.wood, w, ch, cd, 0, ch / 2, cz); part(mat, w, 0.05, 0.06, 0, ch + 0.02, cz + cd / 2);          // counter + thin neon edge on the customer side
    const hw = Math.abs(c) * w / 2 + Math.abs(sn) * cd / 2, hd = Math.abs(sn) * w / 2 + Math.abs(c) * cd / 2; // axis-aligned bounds of the rotated counter
    b.block(x + cz * sn, z + cz * c, hw * 2, hd * 2);
    if (style === 'awning') {
      for (const sx of [-1, 1]) part(PM.pole, 0.08, 2.3, 0.08, sx * (w / 2 - 0.05), 1.15, cz);
      part(mat, w, 0.08, 0.08, 0, 2.3, cz);
      part(sgn(), ...fit(w - 0.3, 0.55), 0.06, 0, 2.75, -0.2, 0, false);
    } else if (style === 'kiosk') {
      for (const sx of [-1, 1]) for (const lz of [-0.4, cz + 0.3]) part(PM.pole, 0.08, 2.2, 0.08, sx * (w / 2 - 0.05), 1.1, lz);
      part(PM.wood, w + 0.3, 0.08, cz + 1.0, 0, 2.24, cz / 2 - 0.05); part(mat, w + 0.3, 0.05, 0.05, 0, 2.2, cz + 0.45);
      part(sgn(), ...fit(w - 0.4, 0.5), 0.06, 0, 2.7, -0.05, 0, false);
    } else { // cart: low, with two wheels and a tall sign on a pole
      for (const sx of [-1, 1]) b.add(PM.pole, new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10).rotateZ(Math.PI / 2).rotateY(yaw).translate(x + sx * (w / 2) * c + cz * sn, 0.22, z - sx * (w / 2) * sn + cz * c));
      part(PM.pole, 0.07, 2.0, 0.07, w / 2 - 0.1, 1.0, cz - 0.1); part(sgn(), ...fit(2.2, 0.5), 0.06, w / 2 - 0.7, 2.1, cz - 0.1, 0, false);
    }
    part(PM.crates[i % PM.crates.length], 0.6, 0.6, 0.6, -w / 2 + 0.4, 0.3, -0.5);
    // The back of the booth: a backboard with three shelves of goods, crate piles at both ends and a few wares on the counter, so it never looks open.
    part(PM.wood, w + 0.2, 2.1, 0.06, 0, 1.05, -1.15);
    for (const lv of [0.6, 1.2, 1.8]) {
      part(PM.wood, w, 0.05, 0.4, 0, lv, -0.93);
      for (let lx = -w / 2 + 0.25; lx < w / 2 - 0.15; lx += sr.range(0.3, 0.5)) {
        const h = sr.range(0.18, 0.42), glow = sr.rand() < 0.22 && !off;
        part(glow ? cycle[(i + sr.int(0, N - 1)) % N] : sr.pick(stock), sr.range(0.18, 0.34), glow ? 0.1 : h, 0.26, lx, lv + 0.025 + (glow ? 0.05 : h / 2), -0.93);
      }
    }
    for (const sx of [-1, 1]) { const n = sr.int(1, 3); for (let k = 0; k < n; k++) part(PM.crates[(i + k) % PM.crates.length], 0.55, 0.5, 0.55, sx * (w / 2 + 0.35), 0.25 + k * 0.5, -0.7 + sr.range(-0.1, 0.1), sr.range(-0.2, 0.2)); }
    for (let k = 0; k < 3; k++) part(sr.rand() < 0.4 && !off ? cycle[(i + k) % N] : sr.pick(stock), sr.range(0.15, 0.3), sr.range(0.1, 0.25), 0.2, sr.range(-w / 2 + 0.3, w / 2 - 0.3), ch + 0.05 + 0.06, cz + 0.05);
    if (off) b.light(EXCHANGE.deadLight, 8, x, 2.3, z - 1.3 * c);
    b.spot(`v_${id}`, x + 0.3 * c, z - 0.3 * sn);
  });
  for (const [x, z, n] of EXCHANGE.scatter) if (!EXCHANGE.lanes.some(([x0, z0, x1, z1]) => x > x0 - 0.8 && x < x1 + 0.8 && z > z0 - 0.8 && z < z1 + 0.8)) crates(b, PM, x, z, n); // loose stacks never stand in the walking lanes (the debris walls are the only thing in the way)
  // Random junk: the square should feel chaotic. Clutter keeps out of the booths, the entrance and the dealer's doorway; small pieces never block, large ones do.
  const jr = rng.fork(EXCHANGE.junk.seedLabel), jstd = (color, rough = 0.8) => new THREE.MeshStandardMaterial({ color, roughness: rough });
  const JM = { tarp: [jstd(P.rust2), jstd(P.sodium0), jstd(0x2a4f8a), jstd(P.magentaDeep), jstd(0x2c6b4a)], barrel: jstd(P.rust1, 0.6), drum: jstd(P.sodium0, 0.5), can: jstd(P.grey3, 0.4) };
  const booths = EXCHANGE.booths.map(([, , x, z, , w]) => [x, z, w / 2 + 1.5]);
  const free = (x, z, r) => Math.abs(x) < hx - 0.7 && Math.abs(z) < hz - 0.7 && !(x < -11 && Math.abs(z) < 3) && !(Math.abs(x) < 3.2 && z < -hz + 3.4)
    && booths.every(([bx, bz, br]) => Math.hypot(x - bx, z - bz) > br + r)
    && (r < 0.5 || !EXCHANGE.lanes.some(([x0, z0, x1, z1]) => x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r)); // big (solid) junk keeps out of the lanes, so the debris walls are the only thing in the way
  const spot = (r) => { for (let t = 0; t < 40; t++) { const x = jr.range(-hx + 0.8, hx - 0.8), z = jr.range(-hz + 0.8, hz - 0.8); if (free(x, z, r)) return [x, z]; } return null; };
  const bigAt = [];
  for (let i = 0; i < EXCHANGE.junk.large; i++) {
    const p = spot(0.9); if (!p || bigAt.some(([qx, qz]) => Math.hypot(p[0] - qx, p[1] - qz) < 2.2)) continue;
    bigAt.push(p);
    const kind = jr.pick(['crates', 'barrel', 'barrels', 'pallet']);
    if (kind === 'crates') crates(b, PM, p[0], p[1], jr.int(1, 3));
    else if (kind === 'pallet') { b.box(PM.wood, 1.3, 0.14, 1.0, p[0], 0.07, p[1], 0, jr.range(0, 3)); b.box(PM.crates[jr.int(0, 2)], 0.8, 0.5, 0.7, p[0], 0.39, p[1], 0, jr.range(0, 3)); b.block(p[0], p[1], 1.3, 1.3); }
    else for (let k = 0; k < (kind === 'barrels' ? 3 : 1); k++) {
      const bx = p[0] + k * 0.55 - (kind === 'barrels' ? 0.55 : 0), bz = p[1] + (k % 2) * 0.3;
      b.add(jr.rand() < 0.5 ? JM.barrel : JM.drum, new THREE.CylinderGeometry(0.28, 0.28, 0.9, 10).translate(bx, 0.45, bz)); b.block(bx, bz, 0.58, 0.58);
    }
  }
  for (let i = 0; i < EXCHANGE.junk.small; i++) {
    const p = spot(0.3); if (!p) continue;
    const [x, z] = p, ry = jr.range(0, Math.PI * 2), kind = jr.weighted({ bag: 3, box: 3, tarp: 3, pipe: 2, coil: 2, can: 2, shard: 2 });
    if (kind === 'bag') b.box(PM.bag, jr.range(0.35, 0.6), jr.range(0.25, 0.4), jr.range(0.3, 0.5), x, 0.15, z, 0, ry);
    else if (kind === 'box') { const w = jr.range(0.3, 0.6); b.box(PM.crates[jr.int(0, 2)], w, jr.range(0.2, 0.4), w * jr.range(0.7, 1.1), x, 0.15, z, 0, ry); }
    else if (kind === 'tarp') b.box(jr.pick(JM.tarp), jr.range(0.9, 1.7), 0.04, jr.range(0.6, 1.2), x, 0.03, z, 0, ry);
    else if (kind === 'pipe') b.box(M.pipe, jr.range(0.8, 1.6), 0.1, 0.1, x, 0.07, z, 0, ry);
    else if (kind === 'coil') b.add(JM.can, new THREE.CylinderGeometry(0.24, 0.24, 0.12, 8).translate(x, 0.06, z));
    else if (kind === 'can') b.add(jr.rand() < 0.5 ? JM.can : JM.drum, new THREE.CylinderGeometry(0.1, 0.1, 0.22, 7).translate(x, 0.11, z));
    else b.box(jr.pick(cycle), jr.range(0.15, 0.3), 0.05, jr.range(0.06, 0.12), x, 0.04, z, 0, ry); // a glowing shard of broken neon
  }
  // Debris walls: a pile every barrierStep along each segment, so the square is a winding back alley. Each pile is solid.
  const br = rng.fork('barriers');
  for (const [x0, z0, x1, z1] of EXCHANGE.barriers) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / EXCHANGE.barrierStep));
    for (let k = 0; k <= n; k++) {
      const x = x0 + (x1 - x0) * k / n + br.range(-0.08, 0.08), z = z0 + (z1 - z0) * k / n + br.range(-0.08, 0.08), kind = br.pick(['crates', 'crates', 'barrel', 'pallet']);
      if (kind === 'crates') crates(b, PM, x, z, br.int(2, 3));
      else if (kind === 'barrel') { b.add(br.rand() < 0.5 ? JM.barrel : JM.drum, new THREE.CylinderGeometry(0.3, 0.3, 1.0, 10).translate(x, 0.5, z)); b.block(x, z, 0.7, 0.7); }
      else { b.box(PM.wood, 0.9, 0.14, 0.9, x, 0.07, z, 0, br.range(0, 3)); b.box(PM.crates[br.int(0, 2)], 0.7, 0.9, 0.7, x, 0.59, z, 0, br.range(0, 3)); b.block(x, z, 0.8, 0.8); }
    }
  }
  // The implant dealer: a shopfront in the gap between the two middle north booths (faces +z, toward the camera; the interior is added later, the door is a glowing mat for now).
  b.box(M.walls[1], 2.6, 3.4, 1.0, 0, 1.7, -hz + 0.5); b.block(0, -hz + 0.5, 2.6, 1.0);
  b.box(neon.red, 1.1, 2.0, 0.06, 0, 1.0, -hz + 1.03);
  b.box(signMat('IMPLANTS', EXCHANGE.neon.red, false, EXCHANGE.signLum), 2.4, 0.6, 0.06, 0, 3.7, -hz + 1.0, 0, 0, false);
  b.box(M.litCool, 1.4, 0.03, 0.8, 0, 0.02, -hz + 1.6);
  b.light(0xff3b2f, 14, 0, 2.6, -8); b.light(0x2f8bff, 16, -8, 3.2, -4); b.light(0xa43bff, 16, 8, 3.2, 4); b.light(0xffd23a, 14, 0, 3.4, 0);
  b.light(0x2fe07a, 12, -8, 3.2, 5); b.light(0xff6a1f, 12, 8, 3.2, -4); b.light(0xffd23a, 10, -13, 2.6, 0);
  b.steam(-6, 0, -5.2); b.steam(6, 0, 5.2);
  b.spot('start', -12.5, 0); b.spot('dealerDoor', 0, -hz + 1.7);
  return finish('exchange', b, [-hx, -hz, hx, hz]);
}

// ---------- Street extras: the Sable's sign, the car, and a glowing mat at each door ----------
// Juno's car on the street: a big square-shouldered luxury sedan (two-tone: dark blue upper, brushed steel lower, a tall slatted grille, a headlight bar, big rimmed wheels). Front faces +x.
const CAR = {
  at: [-13.5, -1.9], length: 3.3, width: 1.55,        // world position of the centre and the footprint (the first version was 3.0 x 1.4: about 10% bigger now)
  blue: 0x2d4f8f, steel: 0xb4bac4, trim: 0x0b0b12, rim: 0xc9ccd4, tail: 0xff2a3a, head: 0xdff6ff,
};
function junoCar(b, M) {
  const [cx, cz] = CAR.at, L = CAR.length, W = CAR.width, std = (color, metalness, roughness) => new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive: color, emissiveIntensity: 0.18 }); // a faint self-glow so the dark paint still reads at night
  const blue = std(CAR.blue, 0.55, 0.35), steel = std(CAR.steel, 0.8, 0.4), trim = std(CAR.trim, 0.3, 0.6), rim = std(CAR.rim, 0.9, 0.3);
  const glow = (hex) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(BUILDINGS.windowGlow) }), tail = glow(CAR.tail), head = glow(CAR.head);
  const part = (m, sx, sy, sz, x, y, z) => b.box(m, sx, sy, sz, cx + x, y, cz + z, 0, 0, false); // x along the car (front +x), z across
  part(steel, L, 0.4, W, 0, 0.42, 0);                                   // lower body, steel
  part(trim, L - 0.5, 0.1, W - 0.2, 0, 0.22, 0);                         // dark sill under it
  part(blue, L - 0.4, 0.34, W - 0.02, -0.1, 0.8, 0);                     // blue shoulder line
  part(blue, 1.0, 0.1, W - 0.12, 1.0, 1.0, 0);                           // long flat hood
  part(M.glassDark, 1.5, 0.34, W - 0.2, -0.45, 1.15, 0);                 // cabin glass
  part(blue, 1.62, 0.07, W - 0.16, -0.45, 1.34, 0);                      // roof
  for (const sx of [-1, 1]) part(blue, 0.07, 0.34, 0.07, sx * 0.0 - 0.45, 1.15, 0.52), part(blue, 0.07, 0.34, 0.07, sx * 0.0 - 0.45, 1.15, -0.52); // pillars, mid-cabin
  part(blue, 0.08, 0.34, W - 0.2, 0.3, 1.15, 0);                         // windscreen frame
  part(blue, 0.08, 0.34, W - 0.2, -1.2, 1.15, 0);                        // rear window frame
  part(trim, 0.06, 0.5, W - 0.25, L / 2 + 0.02, 0.62, 0);                // grille block
  for (let i = -8; i <= 8; i++) part(steel, 0.03, 0.46, 0.035, L / 2 + 0.06, 0.62, i * 0.07); // tall vertical grille slats
  part(head, 0.06, 0.1, 0.3, L / 2 + 0.03, 0.78, 0.55); part(head, 0.06, 0.1, 0.3, L / 2 + 0.03, 0.78, -0.55); // the headlights
  part(tail, 0.05, 0.07, W - 0.25, -L / 2 - 0.01, 0.78, 0);              // tail light bar
  part(steel, 0.6, 0.05, W + 0.04, 0.9, 0.62, 0);                        // chrome band across the nose
  for (const sz of [-1, 1]) {                                            // door seams on both sides, and the steel / blue split line
    part(trim, 0.025, 0.4, 0.02, -0.15, 0.82, sz * (W / 2 - 0.005)); part(trim, 0.025, 0.4, 0.02, -0.95, 0.82, sz * (W / 2 - 0.005));
    part(trim, L - 0.5, 0.02, 0.02, 0, 0.62, sz * (W / 2 + 0.01));
  }
  part(steel, 0.02, 0.2, 0.02, 1.2, 1.12, 0);                            // hood ornament
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {                  // four wheels: tyre, rim, hub
    const wx = cx + sx * (L / 2 - 0.62), wz = cz + sz * (W / 2 - 0.1);
    b.add(trim, new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14).rotateX(Math.PI / 2).translate(wx, 0.32, wz));
    b.add(rim, new THREE.CylinderGeometry(0.21, 0.21, 0.235, 12).rotateX(Math.PI / 2).translate(wx, 0.32, wz));
    b.add(trim, new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8).rotateX(Math.PI / 2).translate(wx, 0.32, wz));
  }
  b.block(cx, cz, L, W);
  b.light(P.cyan, 3, cx, 1.6, cz); b.light(0xdff6ff, 3, cx + L / 2 + 0.6, 0.8, cz);
}

function streetExtras(M) {
  const b = createBatch(), PM = propMats(M);
  b.setTransform(0, 0, 0);
  b.box(signMat('SABLE', P.amber), 6, 1.2, 0.1, 0, 3.1, -4.82, 0, 0, false);          // covers the random shop sign on that building
  b.light(P.amberLight, 4.5, 0, 3.0, -4.2);
  b.box(signMat('CAPSULE', P.pink), 3.4, 0.8, 0.1, 10.6, 3.0, 4.82, 0, 0, false);       // over the hostel entrance (the door is at x 10.6, z 4.15)
  junoCar(b, M);
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
  const areas = { street, platform: platform(M), sable: sable(M), alley: alley(M), hostel: hostel(M), car: car(M), dealer: dealer(M), exchange: exchange(M, rng.fork('exchange')) };
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
