import * as THREE from 'three';
import { rng } from './core/rng.js';
import { input } from './core/input.js';
import { createCamera, CAMERA } from './render/camera.js';
import { buildDistrict } from './world/district.js';
import { createDebugPanel } from './debug/panel.js';
import { settings } from './core/settings.js';
import { createLights } from './render/lights.js';
import { createPost } from './render/post.js';

const MAIN = {
  maxDt: 0.1, // seconds; clamps big frame gaps (tab switch)
  background: 0x0b0b14,
  toneMapping: THREE.NeutralToneMapping, exposure: 1.0,
};

const Q = settings.quality;
console.log('Neon Ledger', Q.name);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.pixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = MAIN.toneMapping;
renderer.toneMappingExposure = MAIN.exposure;
renderer.info.autoReset = false; // composer renders several passes; count the whole frame

const scene = new THREE.Scene();
scene.background = new THREE.Color(MAIN.background);
const lights = createLights(scene, Q.maxLights, Q.shadowMap);

const district = buildDistrict(rng.fork('district'));
district.traverse((o) => {
  if (!o.isMesh) return;
  o.receiveShadow = true;
  o.castShadow = !o.material.transparent;
});
lights.register(district.userData.lights);
scene.add(district);

const cam = createCamera(window.innerWidth / window.innerHeight);
const post = createPost(renderer, scene, cam.camera, Q);
const debug = createDebugPanel(renderer, rng.seed);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  post.setSize(window.innerWidth, window.innerHeight);
  cam.camera.aspect = window.innerWidth / window.innerHeight;
  cam.camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, MAIN.maxDt);
  last = now;

  input.update();
  if (input.pressed('rotateL')) cam.rotate(-1);
  if (input.pressed('rotateR')) cam.rotate(1);
  if (input.pressed('debug')) debug.toggle();
  cam.zoom(input.zoom * CAMERA.zoomSpeed * dt + input.zoomSteps * CAMERA.wheelStep);
  cam.update(dt);

  lights.update(dt, cam.target);
  renderer.info.reset();
  post.render(dt);
  debug.update(dt);
  input.endFrame();
});
