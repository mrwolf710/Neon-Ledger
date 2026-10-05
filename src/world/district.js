import * as THREE from 'three';

// Grey-box Lowmarket street. Street runs along X; Z is across it.
export const DISTRICT = {
  length: 40,
  roadWidth: 6,
  sidewalkWidth: 2,
  curbHeight: 0.15,
  buildingsPerSide: 5,
  buildingDepth: 3,       // road 6 + sidewalks 2x2 + buildings 2x3 = 16 wide
  buildingGap: [0.4, 1.6],
  buildingHeight: [4, 14],
  rail: { x: 17, height: 7, deckWidth: 2.5, deckThickness: 0.6, deckLength: 24, pillarSize: 0.8 },
  colors: {
    road: 0x2a2a2e,
    sidewalk: 0x55555a,
    buildings: [0x5c5c62, 0x6a6a70, 0x7a7a80],
    rail: 0x45454a,
  },
};

const box = new THREE.BoxGeometry(1, 1, 1);

function addBox(group, mat, sx, sy, sz, x, y, z) {
  const m = new THREE.Mesh(box, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

export function buildDistrict(rng) {
  const D = DISTRICT;
  const C = D.colors;
  const group = new THREE.Group();
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const roadMat = mat(C.road), walkMat = mat(C.sidewalk), railMat = mat(C.rail);
  const buildingMats = C.buildings.map(mat);

  // Road and raised sidewalks.
  addBox(group, roadMat, D.length, 0.1, D.roadWidth, 0, -0.05, 0);
  const walkZ = D.roadWidth / 2 + D.sidewalkWidth / 2;
  for (const s of [-1, 1]) {
    addBox(group, walkMat, D.length, D.curbHeight, D.sidewalkWidth, 0, D.curbHeight / 2, s * walkZ);
  }

  // Buildings: one per lot on each side.
  const lot = D.length / D.buildingsPerSide;
  const bz = D.roadWidth / 2 + D.sidewalkWidth + D.buildingDepth / 2;
  for (const s of [-1, 1]) {
    for (let i = 0; i < D.buildingsPerSide; i++) {
      const w = lot - rng.range(...D.buildingGap);
      const h = rng.range(...D.buildingHeight);
      const x = -D.length / 2 + lot * (i + 0.5);
      addBox(group, rng.pick(buildingMats), w, h, D.buildingDepth, x, h / 2, s * bz);
    }
  }

  // Elevated rail crossing the street near the +X end, pillars on the sidewalks.
  const R = D.rail;
  addBox(group, railMat, R.deckWidth, R.deckThickness, R.deckLength, R.x, R.height, 0);
  for (const s of [-1, 1]) {
    addBox(group, railMat, R.pillarSize, R.height, R.pillarSize, R.x, R.height / 2, s * walkZ);
  }

  return group;
}
