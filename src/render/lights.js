import * as THREE from 'three';

export const LIGHTS = {
  moon: { color: 0x8aa0ff, intensity: 0.9, position: [-12, 30, 14], shadowSize: 24, bias: -0.0005 },
  hemi: { sky: 0x3a4078, ground: 0x120c1a, intensity: 0.35 },
  point: { distance: 9, decay: 2 },
  reassignEvery: 0.25, // seconds between nearest-N re-sorts
};

// Moonlight + fill + a fixed pool of point lights. The pool size never changes (no shader recompiles);
// each re-sort moves the pool onto the N registered lights nearest the focus point.
export function createLights(scene, maxLights, shadowMapSize) {
  const L = LIGHTS;
  const hemi = new THREE.HemisphereLight(L.hemi.sky, L.hemi.ground, L.hemi.intensity);
  const moon = new THREE.DirectionalLight(L.moon.color, L.moon.intensity);
  moon.position.set(...L.moon.position);
  moon.castShadow = true;
  moon.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  moon.shadow.bias = L.moon.bias;
  const s = L.moon.shadowSize, sc = moon.shadow.camera;
  sc.left = sc.bottom = -s; sc.right = sc.top = s; sc.near = 1; sc.far = 80;
  scene.add(hemi, moon, moon.target);

  const pool = [];
  for (let i = 0; i < maxLights; i++) {
    const p = new THREE.PointLight(0xffffff, 0, L.point.distance, L.point.decay);
    pool.push(p);
    scene.add(p);
  }

  const registered = []; // { position: Vector3, color, intensity }
  let timer = 0;

  return {
    moon, hemi,
    register(list) { registered.push(...list); timer = 0; },
    // Re-sorts every reassignEvery; copies intensity every frame so flicker shows.
    update(dt, focus) {
      if ((timer -= dt) <= 0) {
        timer = L.reassignEvery;
        for (const r of registered) r.d = r.position.distanceToSquared(focus);
        // ponytail: full sort each re-sort, fine for a few hundred lights; use a grid if a district gets thousands
        const near = registered.slice().sort((a, b) => a.d - b.d);
        pool.forEach((p, i) => {
          p.userData.src = near[i];
          if (near[i]) { p.position.copy(near[i].position); p.color.setHex(near[i].color); }
        });
      }
      for (const p of pool) p.intensity = p.userData.src ? p.userData.src.intensity : 0;
    },
  };
}
