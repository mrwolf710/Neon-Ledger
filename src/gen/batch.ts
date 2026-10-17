import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Block, Spot } from '../types.ts';

export interface BatchLight { color: number; intensity: number; base: number; position: THREE.Vector3 }
export interface BatchSign { mat: THREE.Material; light: BatchLight }
export interface BatchData { lights: BatchLight[]; steam: THREE.Vector3[]; signs: BatchSign[]; spots: Spot[]; blocks: Block[] }
export interface Batch {
  setTransform(x?: number, z?: number, rotY?: number): void;
  add(mat: THREE.Material, geo: THREE.BufferGeometry): void;
  box(mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number, rx?: number, ry?: number, worldUV?: boolean): void;
  light(color: number, intensity: number, x: number, y: number, z: number): BatchLight;
  steam(x: number, y: number, z: number): void;
  spot(name: string, x: number, z: number): void;
  block(x: number, z: number, w: number, d: number): void;
  sign(mat: THREE.Material, light: BatchLight): void;
  build(): THREE.Group;
}

// UV scale per face (+x -x +y -y +z -z): UVs in world units keep 16 px per unit at any box size.
const FACE_UV = (sx: number, sy: number, sz: number): [number, number][] => [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];

export function boxGeo(sx: number, sy: number, sz: number, worldUV = true) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  if (worldUV) {
    const uv = geo.attributes.uv as THREE.BufferAttribute, dims = FACE_UV(sx, sy, sz);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * dims[i >> 2][0], uv.getY(i) * dims[i >> 2][1]);
  }
  return geo;
}

// Collects geometry per material, then merges: one draw call per material for everything added.
// setTransform(x, z, rotY) places the following parts (local +z = facing direction).
export function createBatch(): Batch {
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const m = new THREE.Matrix4();
  const tmp = new THREE.Matrix4();
  const euler = new THREE.Euler();
  const data: BatchData = { lights: [], steam: [], signs: [], spots: [], blocks: [] }; // handed to group.userData by build()
  let rot = 0;

  return {
    setTransform(x = 0, z = 0, rotY = 0) {
      m.makeRotationY(rotY).setPosition(x, 0, z);
      rot = rotY;
    },
    // geo is in local space; it is consumed.
    add(mat: THREE.Material, geo: THREE.BufferGeometry) {
      geo.applyMatrix4(m);
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat)!.push(g);
    },
    // Box centred at local (x, y, z), optional rotation (radians).
    box(mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number, rx = 0, ry = 0, worldUV = true) {
      const geo = boxGeo(sx, sy, sz, worldUV);
      if (rx || ry) geo.applyMatrix4(tmp.makeRotationFromEuler(euler.set(rx, ry, 0)));
      this.add(mat, geo.translate(x, y, z));
    },
    // Registers a point light at local (x, y, z) for the light manager (userData.lights). Returns it.
    light(color: number, intensity: number, x: number, y: number, z: number) {
      const l = { color, intensity, base: intensity, position: new THREE.Vector3(x, y, z).applyMatrix4(m) };
      data.lights.push(l);
      return l;
    },
    // Steam vent at local (x, y, z) for particles.js (userData.steam).
    steam(x: number, y: number, z: number) { data.steam.push(new THREE.Vector3(x, y, z).applyMatrix4(m)); },
    // Named spot (e.g. 'stall') at local (x, z), facing local +z; for placing characters (userData.spots).
    spot(name: string, x: number, z: number) {
      const p = new THREE.Vector3(x, 0, z).applyMatrix4(m);
      data.spots.push({ name, x: p.x, z: p.z, facing: rot });
    },
    // Solid footprint w x d centred at local (x, z), stored as a world AABB { x0, z0, x1, z1 } (userData.blocks).
    block(x: number, z: number, w: number, d: number) {
      const xs: number[] = [], zs: number[] = [];
      for (const [cx, cz] of [[x - w / 2, z - d / 2], [x + w / 2, z + d / 2]]) {
        const p = new THREE.Vector3(cx, 0, cz).applyMatrix4(m);
        xs.push(p.x); zs.push(p.z);
      }
      data.blocks.push({ x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) });
    },
    // Sign material + its light, for brightness and flicker (userData.signs).
    sign(mat: THREE.Material, light: BatchLight) { data.signs.push({ mat, light }); },
    build() {
      const group = new THREE.Group();
      for (const k in data) group.userData[k] = data[k as keyof BatchData].splice(0);
      for (const [mat, geos] of byMat) {
        group.add(new THREE.Mesh(mergeGeometries(geos), mat));
        geos.forEach((g: THREE.BufferGeometry) => g.dispose());
      }
      byMat.clear();
      return group;
    },
  };
}
