import * as THREE from 'three';
import { createBatch } from '../gen/batch.js';
import { DISTRICT } from './district.js';

export const TRAIN = {
  cars: 4, carLen: 5, gap: 0.25, width: 2, height: 2.2,
  body: 0x2b2f3d, roof: 0x1a1d27, window: 0xffb347, glow: 1.3, head: 0x9fefff, // window / headlight colours are multiplied by glow so they bloom
  hiddenZ: 60,          // parked here (and hidden) when no train is passing
};

// The Line 9 train crossing the street on the elevated rail. Its z comes from the sound (sfx.trainZ()), so what you see is what you hear.
// Heads toward +z. Plain boxes merged by material: 3 draw calls, no lights.
export function createRailTrain(parent, fog) {
  const T = TRAIN, step = T.carLen + T.gap, total = T.cars * step - T.gap;
  const mat = (c, basic) => (basic ? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(T.glow) })
    : new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.4 }));
  const body = mat(T.body), roof = mat(T.roof), win = mat(T.window, true), head = mat(T.head, true);
  const b = createBatch();
  for (let i = 0; i < T.cars; i++) {
    const z = i * step - total / 2 + T.carLen / 2;
    b.box(body, T.width, T.height, T.carLen, 0, T.height / 2, z);
    b.box(roof, T.width * 0.8, 0.12, T.carLen * 0.9, 0, T.height + 0.06, z);
    for (const sx of [-1, 1]) b.box(win, 0.06, 0.65, T.carLen * 0.8, sx * (T.width / 2 + 0.01), 1.4, z);
  }
  b.box(head, T.width * 0.7, 0.3, 0.08, 0, 1.0, total / 2 + 0.02);
  const group = b.build();
  group.position.set(DISTRICT.rail.x, DISTRICT.rail.height + DISTRICT.rail.deckThickness / 2, T.hiddenZ);
  group.visible = false;
  parent.add(group);
  fog.patch(group);
  return {
    group,
    update(z) { group.visible = z !== null; if (z !== null) group.position.z = z; },
  };
}
