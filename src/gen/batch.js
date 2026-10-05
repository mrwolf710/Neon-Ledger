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
  const data = { lights: [], steam: [], signs: [], spots: [], blocks: [] }; // handed to group.userData by build()
  let rot = 0;

  return {
    setTransform(x = 0, z = 0, rotY = 0) {
      m.makeRotationY(rotY).setPosition(x, 0, z);
      rot = rotY;
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
    // Registers a point light at local (x, y, z) for the light manager (userData.lights). Returns it.
    light(color, intensity, x, y, z) {
      const l = { color, intensity, base: intensity, position: new THREE.Vector3(x, y, z).applyMatrix4(m) };
      data.lights.push(l);
      return l;
    },
    // Steam vent at local (x, y, z) for particles.js (userData.steam).
    steam(x, y, z) { data.steam.push(new THREE.Vector3(x, y, z).applyMatrix4(m)); },
    // Named spot (e.g. 'stall') at local (x, z), facing local +z; for placing characters (userData.spots).
    spot(name, x, z) {
      const p = new THREE.Vector3(x, 0, z).applyMatrix4(m);
      data.spots.push({ name, x: p.x, z: p.z, facing: rot });
    },
    // Solid footprint w x d centred at local (x, z), stored as a world AABB { x0, z0, x1, z1 } (userData.blocks).
    block(x, z, w, d) {
      const xs = [], zs = [];
      for (const [cx, cz] of [[x - w / 2, z - d / 2], [x + w / 2, z + d / 2]]) {
        const p = new THREE.Vector3(cx, 0, cz).applyMatrix4(m);
        xs.push(p.x); zs.push(p.z);
      }
      data.blocks.push({ x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) });
    },
    // Sign material + its light, for brightness and flicker (userData.signs).
    sign(mat, light) { data.signs.push({ mat, light }); },
    build() {
      const group = new THREE.Group();
      for (const k in data) group.userData[k] = data[k].splice(0);
      for (const [mat, geos] of byMat) {
        group.add(new THREE.Mesh(mergeGeometries(geos), mat));
        geos.forEach((g) => g.dispose());
      }
      byMat.clear();
      return group;
    },
  };
}
