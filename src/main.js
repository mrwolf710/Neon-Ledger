import * as THREE from 'three';
import { rng } from './core/rng.js';
import { input } from './core/input.js';
import { createCamera, CAMERA } from './render/camera.js';
import { buildDistrict } from './world/district.js';
import { createDebugPanel, showSprites } from './debug/panel.js';
import { getSheets } from './gen/sprites.js';
import { createCast } from './game/npc.js';
import { createCollision } from './world/collision.js';
import './ui/styles.css';
import { createTouchUI } from './ui/touch.js';
import { createHud } from './ui/hud.js';
import { createClock } from './game/clock.js';
import { createCaseFile } from './game/casefile.js';
import { createDialogue } from './game/dialogue.js';
import { createEcho } from './game/echo.js';
import { createBoard } from './game/board.js';
import { TALK, FALLBACK } from './game/story.js';
import { zoneAt } from './world/district.js';
import { createTitle } from './ui/title.js';
import { createPlayer } from './game/player.js';
import { createInteractions, INTERACT } from './game/interact.js';
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
  todBlendSeconds: 3, // debug dropdown blends over this long
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
const collision = createCollision(district.userData.blocks);
const player = createPlayer(cast.byId.juno, collision);
const interactions = createInteractions(scene);
for (const b of cast.list) {
  if (b.id === 'juno') continue;
  interactions.add({
    id: b.id, position: b.position, height: b.id === 'miso' ? 0.8 : 2, verb: b.id === 'miso' ? 'Pet' : 'Talk',
    onInteract: () => {
      if (b.anim !== 'walk' && b.anim !== 'slump') b.facing = Math.atan2(player.position.x - b.position.x, player.position.z - b.position.z);
      dialogue.start(TALK[b.id] ?? FALLBACK);
    },
  });
}
for (const s of district.userData.spots.filter((p) => p.name === 'vending')) {
  interactions.add({ id: 'vending', position: new THREE.Vector3(s.x, 0, s.z), height: 1.8, verb: 'Use', onInteract: () => dialogue.start(TALK.vending) });
}
const touchUI = createTouchUI(input);
const title = createTitle();
const hud = createHud(collision);
const clock = createClock();
const caseFile = createCaseFile(hud, clock);
const dialogue = createDialogue({ hud, caseFile, clock });
const echo = createEcho({ scene, sheets: getSheets(), post, caseFile, hud, cast, spots: district.userData.spots });
for (const h of echo.hotspots) {
  interactions.add({ id: `echo:${h.id}`, position: h.position, height: 1.2, verb: 'Echo', glyph: 'echo', onInteract: () => echo.start(h.id) });
}
const board = createBoard({ caseFile, hud });
let phaseId = '';
title.started.then(() => hud.show());
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const headPos = new THREE.Vector3(), bufSize = new THREE.Vector2();
cam.follow(player.position, true);
const tod = createTimeOfDay({ scene, lights, post, particles, signs: district.userData.signs, rng: rng.fork('flicker') });
phaseId = clock.phase.id;
tod.setTimeOfDay(phaseId);

const debug = createDebugPanel(renderer, rng.seed);
if (new URLSearchParams(location.search).has('sprites')) showSprites(getSheets());
const labels = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.name ?? v.label]));
debug.select('time', labels(TIME_OF_DAY), phaseId, (v) => tod.setTimeOfDay(v, MAIN.todBlendSeconds));
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
debug.button('toast', () => hud.toast('Case file updated'));
debug.button('clock +30 min', () => clock.add(30));
debug.button('pause clock', () => { clock.paused = !clock.paused; });
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
  if (input.pressed('resetView')) cam.reset();
  cam.rotate((input.held('rotateR') ? 1 : 0) - (input.held('rotateL') ? 1 : 0) + input.lookX, dt);
  cam.orbit(input.orbitDX, input.orbitDY);
  if (input.pressed('debug')) debug.toggle();
  cam.zoom(CAMERA.wheelZoom ** input.zoomSteps * CAMERA.keyZoom ** (input.zoom * dt) * input.zoomFactor);
  touchUI.update();
  const scrubAxis = input.moveX; // echo mode scrubs with the move axis
  const modal = !title.done || dialogue.active || caseFile.isOpen || echo.active || board.isOpen; // title, conversation or case file: the world waits
  if (modal) { input.click = null; input.moveX = input.moveY = 0; }
  cam.tilt((input.held('tiltDown') ? 1 : 0) - (input.held('tiltUp') ? 1 : 0), dt);

  // Click: a person/object walks there then interacts; the ground walks there.
  if (input.click) {
    const it = interactions.pick(input.click, cam.camera);
    if (it) player.walkTo(it.position, INTERACT.range - 0.2, it.onInteract);
    else {
      ndc.set((input.click.x / window.innerWidth) * 2 - 1, -(input.click.y / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, cam.camera);
      const hit = ray.ray.intersectPlane(ground, new THREE.Vector3());
      if (hit) player.walkTo(hit);
    }
  }
  player.update(dt, input, cam.yaw);
  const cfWasOpen = caseFile.isOpen, bdWasOpen = board.isOpen;
  board.update(input);
  if (!bdWasOpen && !board.isOpen && title.done && !dialogue.active && !echo.active && !caseFile.isOpen && input.pressed('board')) board.open();
  caseFile.update(input);
  if (!cfWasOpen && !caseFile.isOpen && !dialogue.active && !echo.active && !board.isOpen && title.done && input.pressed('caseFile')) caseFile.open();
  const echoWas = echo.active;
  if (echoWas) echo.update(dt, input, cam.yaw, district.userData.lights, scrubAxis, player.position);
  else if (dialogue.active) { if (!cfWasOpen) dialogue.update(dt, input); }
  else if (!cfWasOpen && !bdWasOpen && !board.isOpen && title.done) {
    if (input.pressed('echo')) echo.tryStart(player.position);
    else if (input.pressed('interact')) interactions.current?.onInteract();
  }
  if (!echoWas && !echo.active) echo.update(dt, input, cam.yaw, district.userData.lights, 0, player.position); // markers + fade-out while idle
  cam.follow(player.position);
  cam.update(dt);

  // Keep the tilt-shift sharp band on Juno.
  headPos.copy(player.position).setY(player.position.y + 1).project(cam.camera);
  POST.tilt.center = (headPos.y + 1) / 2;
  post.applyUniforms();

  // Clock: runs once the title is dismissed; the phase picks the time-of-day mood.
  if (title.done && !echo.active) clock.update(dt);
  if (clock.phase.id !== phaseId) { phaseId = clock.phase.id; tod.setTimeOfDay(phaseId, 8); }
  hud.setClock(clock.text, clock.phase.label, clock.progress);
  if (input.pressed('hideControls')) hud.toggleControls();
  { const z = zoneAt(player.position.x, player.position.z); if (title.done) hud.setLocation(z.name, z.district); }
  hud.update(dt, {
    player: { x: player.position.x, z: player.position.z, facing: player.facing }, yaw: cam.yaw,
    people: cast.list.filter((b) => b.id !== 'juno').map((b) => ({ x: b.position.x, z: b.position.z })),
  });
  tod.update(dt);
  particles.update(dt, cam.target, cam.camera);
  cast.update(dt, cam.yaw, district.userData.lights);
  if (modal) interactions.hide(); else interactions.update(player.position, player.facing, input.lastDevice, input.padType, cam.camera);
  fog.update(cam.camera, cam.target);
  const db = renderer.getDrawingBufferSize(bufSize);
  fog.cutaway(cam.camera, player.position, db.x, db.y);
  lights.update(dt, cam.target);
  renderer.info.reset();
  post.render(dt);
  debug.update(dt);
  input.endFrame();
});
