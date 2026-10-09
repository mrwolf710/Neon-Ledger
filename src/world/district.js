import { createBatch } from '../gen/batch.js';
import { building, getMaterials } from '../gen/buildings.js';
import { PROPS, PROP_BUILDERS } from '../gen/props.js';

// Lowmarket street. Street runs along X; Z is across it. Everything is merged by material.
export const DISTRICT = {
  length: 40,
  roadWidth: 6,
  sidewalkWidth: 2,
  curbHeight: 0.15,
  buildingsPerSide: 5,
  buildingDepth: 3,       // road 6 + sidewalks 2x2 + buildings 2x3 = 16 wide
  buildingGap: [0.4, 1.6],
  rail: { x: 17, height: 7, deckWidth: 2.5, deckThickness: 0.6, deckLength: 24, pillarSize: 0.8 },
  lamps: { spacing: 10, curbInset: 0.25, southStart: 9, block: 0.16 }, // southStart keeps the south poles off the hostel door (x 10.6) and the rail pillar (x 17),
  props: { inset: 0.7, gap: [1.5, 4], pillarClear: 1.4, depth: 0.9 }, // inset from the building line; depth = collision
};

// Who stands where. at: [x, z] or a spot name from the batch (first match), facing: radians (0 = +z).
// pose: idle | walk | slump. path: loop of [x, z] points for walkers.
// Who stands where. area: which place they live in (default street). at: [x, z] in world coordinates, or a spot name
// from that area's builder (areas.js). facing: radians (0 = +z). pose: idle | walk | slump. ghost: drawn as a hologram.
// follow: set later by the story (Miso follows Juno once she has been petted).
export const CAST = [
  { id: 'juno', area: 'platform', at: 'start', facing: Math.PI },
  { id: 'mamaTeo', area: 'sable', at: 'teo' },
  { id: 'dex', area: 'sable', at: 'dex', facing: Math.PI, pose: 'slump' },
  { id: 'vendor', area: 'street', at: [7.2, -4.2], facing: 0 }, // north sidewalk, camera side of the street is the south; she stays visible without rotating
  { id: 'preacher', area: 'street', at: [-9.5, -2.2], facing: Math.PI / 2, ghost: true },
  { id: 'kit', area: 'hostel', at: 'kit' },
  { id: 'miso', area: 'street', at: [12.4, 2.4], facing: 2.2 }, // right at the foot of the station stairs (spawn 13.8, 1.3): the first character Juno sees
];

// Named areas for the location banner; the last matching zone wins. box: [x0, z0, x1, z1].
export const ZONES = [
  { name: 'Lowmarket Street', district: 'Lowmarket', box: [-30, -30, 30, 30] },
  { name: 'Line 9 Underpass', district: 'Lowmarket', box: [DISTRICT.rail.x - 3, -30, DISTRICT.rail.x + 3, 30] },
];
export const zoneAt = (x, z) => [...ZONES].reverse().find((q) => x >= q.box[0] && x <= q.box[2] && z >= q.box[1] && z <= q.box[3]) ?? ZONES[0];

// Ground height at z: sidewalks are raised by the curb.
export function groundY(z, x = 0) {
  const D = DISTRICT, a = Math.abs(z);
  if (Math.abs(x) > D.length / 2 + 2) return 0; // other areas are flat
  return a > D.roadWidth / 2 && a < D.roadWidth / 2 + D.sidewalkWidth ? D.curbHeight : 0;
}

export function buildDistrict(rng) {
  const D = DISTRICT;
  const M = getMaterials(rng.fork('textures'));
  const batch = createBatch();
  const sideRot = (s) => (s < 0 ? 0 : Math.PI); // local +z faces the road

  // Road and raised sidewalks.
  batch.box(M.road, D.length, 0.1, D.roadWidth, 0, -0.05, 0);
  const walkZ = D.roadWidth / 2 + D.sidewalkWidth / 2;
  for (const s of [-1, 1]) {
    batch.box(M.sidewalk, D.length, D.curbHeight, D.sidewalkWidth, 0, D.curbHeight / 2, s * walkZ);
  }

  // Buildings: one per lot on each side, each from its own fork so edits elsewhere don't reshuffle them.
  const lot = D.length / D.buildingsPerSide;
  const bz = D.roadWidth / 2 + D.sidewalkWidth + D.buildingDepth / 2;
  for (const s of [-1, 1]) {
    for (let i = 0; i < D.buildingsPerSide; i++) {
      const br = rng.fork(`building:${s}:${i}`);
      const w = lot - br.range(...D.buildingGap);
      batch.setTransform(-D.length / 2 + lot * (i + 0.5), s * bz, sideRot(s));
      building(br, M, batch, w, D.buildingDepth);
    }
  }

  // Elevated rail crossing the street near the +X end, pillars on the sidewalks.
  const R = D.rail;
  batch.setTransform();
  batch.box(M.metal, R.deckWidth, R.deckThickness, R.deckLength, R.x, R.height, 0);
  for (const s of [-1, 1]) {
    batch.box(M.metal, R.pillarSize, R.height, R.pillarSize, R.x, R.height / 2, s * walkZ);
    batch.block(R.x, s * walkZ, R.pillarSize, R.pillarSize);
  }

  // Lamp posts on the curbs, staggered between sides.
  const pr = rng.fork('props');
  const curbZ = D.roadWidth / 2 + D.lamps.curbInset;
  for (const s of [-1, 1]) {
    for (let x = -D.length / 2 + (s < 0 ? 5 : D.lamps.southStart); x < D.length / 2; x += D.lamps.spacing) {
      batch.setTransform(x, s * curbZ, sideRot(s));
      PROP_BUILDERS.lamp(pr, M, batch);
      batch.block(0, 0, D.lamps.block, D.lamps.block);
    }
  }

  // Props scattered along the building side of each sidewalk, clear of the rail pillars.
  const propZ = D.roadWidth / 2 + D.sidewalkWidth - D.props.inset;
  for (const s of [-1, 1]) {
    let x = -D.length / 2 + pr.range(...D.props.gap) / 2;
    while (x < D.length / 2 - 1) {
      const kind = pr.weighted(PROPS.scatter), half = PROPS.width[kind] / 2;
      if (Math.abs(x + half - R.x) > half + D.props.pillarClear && x + PROPS.width[kind] < D.length / 2) {
        batch.setTransform(x + half, s * propZ, sideRot(s));
        PROP_BUILDERS[kind](pr, M, batch);
        batch.block(0, -0.1, PROPS.width[kind], D.props.depth);
      }
      x += PROPS.width[kind] + pr.range(...D.props.gap);
    }
  }

  return batch.build();
}
