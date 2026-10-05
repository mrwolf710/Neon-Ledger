import * as THREE from 'three';
import { getTexture } from '../gen/textures.js';

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
  // [texture name, tile width, tile height] in world units
  surfaces: {
    road: ['wetAsphalt', 8, 6],
    sidewalk: ['sidewalk', 4, 2],
    walls: [['brick', 4, 4], ['concrete', 4, 4], ['tiles', 4, 4]],
    rail: ['metalPanel', 4, 4],
  },
};

// UV scale per face (+x -x +y -y +z -z): UVs in world units keep 16 px per unit at any box size.
const FACE_UV = (sx, sy, sz) => [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];

function addBox(group, mat, sx, sy, sz, x, y, z) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const uv = geo.attributes.uv, dims = FACE_UV(sx, sy, sz);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * dims[i >> 2][0], uv.getY(i) * dims[i >> 2][1]);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

export function buildDistrict(rng) {
  const D = DISTRICT;
  const S = D.surfaces;
  const group = new THREE.Group();
  const texRng = rng.fork('textures');
  const mat = ([name, w, h]) => new THREE.MeshStandardMaterial({ ...getTexture(name, texRng, w, h), roughness: 1 });
  const roadMat = mat(S.road), walkMat = mat(S.sidewalk), railMat = mat(S.rail);
  const buildingMats = S.walls.map(mat);

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
