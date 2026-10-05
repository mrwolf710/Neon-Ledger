import * as THREE from 'three';
import { rng } from './core/rng.js';
import { input } from './core/input.js';
import { createCamera, CAMERA } from './render/camera.js';
import { buildDistrict } from './world/district.js';
import { createDebugPanel } from './debug/panel.js';

const MAIN = {
  maxPixelRatio: 2,
  maxDt: 0.1, // seconds; clamps big frame gaps (tab switch)
  background: 0x0b0b14,
  hemi: { sky: 0xbfc8ff, ground: 0x202028, intensity: 1.2 },
  sun: { color: 0xffffff, intensity: 1.5, position: [10, 20, 8] },
};

console.log('Neon Ledger');

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAIN.maxPixelRatio));

const scene = new THREE.Scene();
scene.background = new THREE.Color(MAIN.background);
scene.add(new THREE.HemisphereLight(MAIN.hemi.sky, MAIN.hemi.ground, MAIN.hemi.intensity));
const sun = new THREE.DirectionalLight(MAIN.sun.color, MAIN.sun.intensity);
sun.position.set(...MAIN.sun.position);
scene.add(sun);

scene.add(buildDistrict(rng.fork('district')));

const cam = createCamera(window.innerWidth / window.innerHeight);
const debug = createDebugPanel(renderer, rng.seed);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
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

  renderer.render(scene, cam.camera);
  debug.update(dt);
  input.endFrame();
});
