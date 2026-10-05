import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// UV scale per face (+x -x +y -y +z -z): UVs in world units keep 16 px per unit at any box size.
const FACE_UV = (sx, sy, sz) => [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];

export function boxGeo(sx, sy, sz, worldUV = true) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  if (worldUV) {
    const uv = geo.attributes.uv, dims = FACE_UV(sx, sy, sz);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * dims[i >> 2][0], uv.getY(i) * dims[i >> 2][1]);
  }
  return geo;
}

// Collects geometry per material, then merges: one draw call per material for everything added.
// setTransform(x, z, rotY) places the following parts (local +z = facing direction).
export function createBatch() {
  const byMat = new Map();
  const m = new THREE.Matrix4();
  const tmp = new THREE.Matrix4();
  const euler = new THREE.Euler();

  return {
    setTransform(x = 0, z = 0, rotY = 0) {
      m.makeRotationY(rotY).setPosition(x, 0, z);
    },
    // geo is in local space; it is consumed.
    add(mat, geo) {
      geo.applyMatrix4(m);
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat).push(g);
    },
    // Box centred at local (x, y, z), optional rotation (radians).
    box(mat, sx, sy, sz, x, y, z, rx = 0, ry = 0, worldUV = true) {
      const geo = boxGeo(sx, sy, sz, worldUV);
      if (rx || ry) geo.applyMatrix4(tmp.makeRotationFromEuler(euler.set(rx, ry, 0)));
      this.add(mat, geo.translate(x, y, z));
    },
    build() {
      const group = new THREE.Group();
      for (const [mat, geos] of byMat) {
        group.add(new THREE.Mesh(mergeGeometries(geos), mat));
        geos.forEach((g) => g.dispose());
      }
      byMat.clear();
      return group;
    },
  };
}
