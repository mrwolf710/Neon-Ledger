import * as THREE from 'three';
import { DISTRICT, groundY } from './district.js';

export const PARTICLES = {
  rain: { color: 0x8fa8d8, size: [0.02, 0.5], speed: 22, wind: [2, 0.6], area: [52, 18, 28], intensity: 0.35 }, // area: x/y/z box centred on the district
  splash: { color: 0x9fb8e8, max: 300, perDrop: 0.08, life: 0.35, size: 0.18, inner: 0.8 }, // inner: ring hole (0..1) // perDrop: chance a landing drop splashes
  steam: { color: 0x8a8aa0, max: 60, rate: 6, life: 2.5, rise: 0.8, size: [0.25, 1.0], range: 16, opacity: 0.45, texPx: 16 }, // texPx: puff texture size (pixel-art round blob)
  motes: { color: 0xffc070, count: 50, area: [20, 6, 14], drift: 0.25, size: 0.05 },
};

const D = DISTRICT;
const onStreet = (x, z) => Math.abs(x) < D.length / 2 && Math.abs(z) < D.roadWidth / 2 + D.sidewalkWidth;

// Round puff: brightness falls off from the centre, Bayer-dithered to stay pixel-art (additive, so black = clear).
function puffTexture(n) {
  const cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const ctx = cv.getContext('2d'), img = ctx.createImageData(n, n);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2);
      const v = Math.max(0, 1 - d) * 4;                       // 0..4 levels
      const lvl = Math.min(4, Math.floor(v + bayer[(y & 3) * 4 + (x & 3)] / 16)) / 4;
      const o = (y * n + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = lvl * 255; img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

const additive = (color, opacity = 1) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
});

function instanced(geo, mat, count, colored) {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false; // instances move around the focus; the bounding sphere would be stale
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (colored) mesh.setColorAt(0, new THREE.Color()); // allocates instanceColor
  return mesh;
}

// Rain streaks, splash rings, steam puffs from vents, floating motes. Four InstancedMeshes, one update loop.
// steamVents: Vector3[] (district userData.steam). Fades use per-instance colour (additive: black = invisible).
export function createParticles(scene, rng, rainCount, steamVents) {
  const P = PARTICLES, R = P.rain, S = P.splash, St = P.steam, Mo = P.motes;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();

  const rain = instanced(new THREE.BoxGeometry(R.size[0], R.size[1], R.size[0]), additive(R.color, R.intensity), rainCount);
  const splash = instanced(new THREE.RingGeometry(S.inner, 1, 10).rotateX(-Math.PI / 2), additive(S.color), S.max, true);
  const steamMat = additive(St.color, St.opacity);
  steamMat.map = puffTexture(St.texPx);
  const steam = instanced(new THREE.PlaneGeometry(1, 1), steamMat, St.max, true); // camera-facing quads
  const motes = instanced(new THREE.BoxGeometry(Mo.size, Mo.size, Mo.size), additive(Mo.color), Mo.count);
  scene.add(rain, splash, steam, motes);

  // Rain tilt follows the wind so streaks line up with their motion.
  const fall = new THREE.Vector3(R.wind[0], -R.speed, R.wind[1]);
  const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), fall.clone().normalize());

  const [ax, ay, az] = R.area;
  const drops = Array.from({ length: rainCount }, () => ({ x: rng.range(-ax, ax) / 2, y: rng.range(0, ay), z: rng.range(-az, az) / 2 }));
  const splashes = Array.from({ length: S.max }, () => ({ t: 1, x: 0, y: 0, z: 0 }));
  const puffs = Array.from({ length: St.max }, () => ({ t: 1, x: 0, y: 0, z: 0, dx: 0 }));
  const moteList = Array.from({ length: Mo.count }, () => ({
    x: rng.range(-1, 1), y: rng.range(0, 1), z: rng.range(-1, 1), p: rng.range(0, 6.28),
  }));
  let nextSplash = 0, nextPuff = 0, steamAcc = 0, time = 0;
  const api = { rainScale: 1, active: true, center: { x: 0, z: 0 } }; // center: the outdoor area the shower covers // 0..1 fraction of drops shown (time of day can lighten the rain)

  api.update = (dt, focus, camera) => {
    for (const mesh of [rain, splash, steam, motes]) mesh.visible = api.active;
    if (!api.active) return;
    time += dt;
    const cx = api.center.x, cz = api.center.z;
    // Rain: drops live in a fixed box over the district and wrap at its edges, so the shower stays put when the camera moves.
    const shown = Math.floor(rainCount * api.rainScale);
    for (let i = 0; i < rainCount; i++) {
      const d = drops[i];
      d.x += fall.x * dt; d.y += fall.y * dt; d.z += fall.z * dt;
      const wx = cx + THREE.MathUtils.euclideanModulo(d.x - cx + ax / 2, ax) - ax / 2;
      const wz = cz + THREE.MathUtils.euclideanModulo(d.z - cz + az / 2, az) - az / 2;
      d.x = wx; d.z = wz;
      const gy = groundY(wz - cz, wx - cx);
      if (d.y < gy) {
        if (i < shown && onStreet(wx - cx, wz - cz) && rng.rand() < S.perDrop) {
          Object.assign(splashes[nextSplash], { t: 0, x: wx, y: gy + 0.02, z: wz });
          nextSplash = (nextSplash + 1) % S.max;
        }
        d.y += ay;
      }
      m.compose(v.set(wx, d.y, wz), tilt, s.setScalar(i < shown ? 1 : 0));
      rain.setMatrixAt(i, m);
    }

    // Splashes: ring grows and fades.
    splashes.forEach((p, i) => {
      p.t = Math.min(1, p.t + dt / S.life);
      const k = S.size * (0.3 + p.t);
      m.compose(v.set(p.x, p.y, p.z), q.identity(), s.set(k, 1, k));
      splash.setMatrixAt(i, m);
      splash.setColorAt(i, c.setScalar(1 - p.t));
    });

    // Steam: spawn from vents near the focus, rise, swell, fade.
    const near = steamVents.filter((e) => Math.abs(e.x - focus.x) < St.range && Math.abs(e.z - focus.z) < St.range);
    steamAcc += dt * St.rate * Math.min(1, near.length / 4);
    while (near.length && steamAcc >= 1) {
      steamAcc -= 1;
      const e = rng.pick(near);
      Object.assign(puffs[nextPuff], { t: 0, x: e.x + rng.range(-0.1, 0.1), y: e.y, z: e.z + rng.range(-0.1, 0.1), dx: rng.range(-0.2, 0.2) });
      nextPuff = (nextPuff + 1) % St.max;
    }
    puffs.forEach((p, i) => {
      p.t = Math.min(1, p.t + dt / St.life);
      p.y += St.rise * dt; p.x += p.dx * dt;
      const k = p.t >= 1 ? 0 : THREE.MathUtils.lerp(St.size[0], St.size[1], p.t);
      m.compose(v.set(p.x, p.y, p.z), camera.quaternion, s.setScalar(k));
      steam.setMatrixAt(i, m);
      steam.setColorAt(i, c.setScalar(Math.sin(p.t * Math.PI)));
    });

    // Motes: slow sine drift in a box around the focus.
    moteList.forEach((p, i) => {
      const x = focus.x + p.x * Mo.area[0] / 2 + Math.sin(time * Mo.drift + p.p) * 0.6;
      const y = 0.5 + p.y * Mo.area[1] + Math.sin(time * Mo.drift * 1.3 + p.p * 2) * 0.4;
      const z = focus.z + p.z * Mo.area[2] / 2 + Math.cos(time * Mo.drift + p.p) * 0.6;
      motes.setMatrixAt(i, m.makeTranslation(x, y, z));
    });

    for (const mesh of [rain, splash, steam, motes]) mesh.instanceMatrix.needsUpdate = true;
    splash.instanceColor.needsUpdate = steam.instanceColor.needsUpdate = true;
  };
  return api;
}
