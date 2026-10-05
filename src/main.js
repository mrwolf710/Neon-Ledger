import * as THREE from 'three';
import { rng } from './core/rng.js';
import { input } from './core/input.js';
import { createCamera, CAMERA } from './render/camera.js';
import { buildDistrict } from './world/district.js';
import { createDebugPanel, showSprites } from './debug/panel.js';
import { getSheets } from './gen/sprites.js';
import { createCast } from './game/npc.js';
import { settings, TIERS } from './core/settings.js';
import { createLights } from './render/lights.js';
import { createPost, POST } from './render/post.js';
import { createHeightFog } from './render/fog.js';
import { createParticles } from './world/particles.js';
import { createTimeOfDay, TIME_OF_DAY } from './world/timeofday.js';

const MAIN = {
  maxDt: 0.1, // seconds; clamps big frame gaps (tab switch)
  background: 0x0b0b14,
  toneMapping: THREE.NeutralToneMapping, exposure: 1.0,
  timeOfDay: 'night', todBlendSeconds: 3, // start state; debug dropdown blends over this long
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
const fog = createHeightFog(scene);

const district = buildDistrict(rng.fork('district'));
district.traverse((o) => {
  if (!o.isMesh) return;
  o.receiveShadow = true;
  o.castShadow = !o.material.transparent;
});
lights.register(district.userData.lights);
fog.patch(district);
scene.add(district);
const particles = createParticles(scene, rng.fork('particles'), Q.rainCount, district.userData.steam);

const cam = createCamera(window.innerWidth / window.innerHeight);
const post = createPost(renderer, scene, cam.camera, Q);
const cast = createCast(scene, getSheets(), district.userData.spots);
const tod = createTimeOfDay({ scene, lights, post, particles, signs: district.userData.signs, rng: rng.fork('flicker') });
tod.setTimeOfDay(MAIN.timeOfDay);

const debug = createDebugPanel(renderer, rng.seed);
if (new URLSearchParams(location.search).has('sprites')) showSprites(getSheets());
const labels = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.name ?? v.label]));
debug.select('time', labels(TIME_OF_DAY), MAIN.timeOfDay, (v) => tod.setTimeOfDay(v, MAIN.todBlendSeconds));
debug.select('tier', labels(TIERS), settings.tier, (v) => { location.search = `?quality=${v}`; });
const pu = () => post.applyUniforms();
debug.slider('bloom', POST.bloom, 'strength', 0, 2, 0.05, pu);
debug.slider('bloom thr', POST.bloom, 'threshold', 0, 1.5, 0.05, pu);
debug.slider('tilt band', POST.tilt, 'band', 0, 0.5, 0.01, pu);
debug.slider('tilt blur', POST.tilt, 'maxBlur', 0, 8, 0.25, pu);
for (const k of ['lift', 'gamma', 'gain']) {
  const [min, max] = k === 'lift' ? [-0.1, 0.2] : [0.5, 1.5];
  'rgb'.split('').forEach((ch, i) => debug.slider(`${k} ${ch}`, POST.grade, k, min, max, 0.01, pu, i));
}
debug.slider('saturation', POST.grade, 'saturation', 0, 2, 0.05, pu);
debug.slider('fog falloff', fog.uniforms.fogFalloff, 'value', 0, 1, 0.01);
debug.slider('fog high', fog.uniforms.fogHigh, 'value', 0, 1, 0.01);
debug.slider('fog ground', fog.uniforms.fogGround, 'value', 0, 1, 0.01);
debug.button('log values', () => console.log(JSON.stringify({ POST, fogFalloff: fog.uniforms.fogFalloff.value, fogHigh: fog.uniforms.fogHigh.value, fogGround: fog.uniforms.fogGround.value })));

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
  cam.pan(input.moveX, input.moveY, dt * (input.held('run') ? 2 : 1)); // ponytail: free-look until Stage 4 player
  cam.tilt((input.held('tiltDown') ? 1 : 0) - (input.held('tiltUp') ? 1 : 0), dt);
  cam.update(dt);

  tod.update(dt);
  particles.update(dt, cam.target, cam.camera);
  cast.update(dt, cam.yaw, district.userData.lights);
  fog.update(cam.camera, cam.target);
  lights.update(dt, cam.target);
  renderer.info.reset();
  post.render(dt);
  debug.update(dt);
  input.endFrame();
});
