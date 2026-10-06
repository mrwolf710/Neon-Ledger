import * as THREE from 'three';
import { rng } from './core/rng.js';
import { input } from './core/input.js';
import { createCamera, CAMERA } from './render/camera.js';
import { createDebugPanel, showSprites } from './debug/panel.js';
import { getSheets } from './gen/sprites.js';
import { loadJunoSheet } from './gen/junoart.js';
import { createCast } from './game/npc.js';
import './ui/styles.css';
import { createTouchUI } from './ui/touch.js';
import { createHud } from './ui/hud.js';
import { createClock } from './game/clock.js';
import { createCaseFile } from './game/casefile.js';
import { createDialogue } from './game/dialogue.js';
import { createEcho } from './game/echo.js';
import { createBoard } from './game/board.js';
import { createWorld } from './game/world.js';
import { createBeats } from './game/beats.js';
import { createFade } from './ui/fade.js';
import { synth } from './audio/synth.js';
import { createSfx, surfaceAt } from './audio/sfx.js';
import { createMusic } from './audio/music.js';
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
  indoorRain: 0.25,   // how much of the rain sound leaks into rooms
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

// Juno is the owner's own pixel art (public/sprites/juno). If it cannot load, the generated Juno stays.
try { getSheets().juno = await loadJunoSheet(); } catch (e) { console.warn('Juno art not loaded, using the generated sprite:', e.message); }

const scene = new THREE.Scene();
scene.background = new THREE.Color(MAIN.background);
const lights = createLights(scene, Q.maxLights, Q.shadowMap);
const fog = createHeightFog(scene);
const fade = createFade();
fade.black = true; // the cold open fades in from black once the title is dismissed

// Every area is built once; the world shows one at a time and calls onAreaEnter when it changes.
const world = createWorld({ scene, rng, lights, fog, fade, start: 'platform', onEnter: (area, spawn) => onAreaEnter(area, spawn) });
const street = world.areas.street;
const particles = createParticles(scene, rng.fork('particles'), Q.rainCount, street.steam);

const cam = createCamera(window.innerWidth / window.innerHeight);
const post = createPost(renderer, scene, cam.camera, Q);
const cast = createCast(scene, getSheets(), world.areas);
const player = createPlayer(cast.byId.juno, world.current.collision);
const interactions = createInteractions(scene);
const touchUI = createTouchUI(input);
const title = createTitle(() => synth.start());
const sfx = createSfx(synth), music = createMusic(synth);
const hud = createHud(world.current.collision);
const clock = createClock();
const caseFile = createCaseFile(hud, clock);
const dialogue = createDialogue({ hud, caseFile, clock });
const echo = createEcho({ scene, sheets: getSheets(), post, caseFile, hud, cast, areas: world.areas });
for (const h of echo.hotspots) {
  interactions.add({ id: `echo:${h.id}`, area: h.area, position: h.position, height: 1.2, verb: 'Echo', glyph: 'echo', onInteract: () => echo.start(h.id) });
}
const board = createBoard({ caseFile, hud });
const beats = createBeats({ world, cast, caseFile, dialogue, hud, interactions, fade, sfx, player, clock,
  setExposure: (v) => { renderer.toneMappingExposure = MAIN.exposure * v; } });
beats.setCamera(cam);
beats.register();
let phaseId = '';
const startParam = new URLSearchParams(location.search).get('start'); // ?start=sable jumps straight to an area (testing)
title.started.then(() => {
  if (startParam && world.areas[startParam]) {
    beats.skipOpen();
    world.jump(startParam, world.exits.find((x) => x.to === startParam)?.spawn ?? null);
  } else beats.coldOpen();
});
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const headPos = new THREE.Vector3(), bufSize = new THREE.Vector2();
const tod = createTimeOfDay({ scene, lights, post, particles, signs: street.signs, rng: rng.fork('flicker') });
phaseId = clock.phase.id;
tod.setTimeOfDay(phaseId);

// What changes when the player moves to another area: collision, who is drawn, what can be used, rain, the minimap.
function onAreaEnter(area, spawn) {
  player.setCollision(area.collision);
  hud.setCollision(area.collision);
  if (area.id !== 'platform') sfx.trainStop(); // the train's idle hum ends when Juno leaves the station
  cast.byId.juno.area = area.id; // the player always belongs to the current area (else she vanishes when you change area)
  cast.setArea(area.id); interactions.setArea(area.id); echo.setArea(area.id);
  particles.active = area.meta.outdoor;
  tod.setIndoor(!area.meta.outdoor);
  particles.center.x = area.meta.origin[0]; particles.center.z = area.meta.origin[1];
  if (spawn) {
    player.position.set(spawn[0], 0, spawn[1]);
    cast.byId.juno.facing = spawn[2] ?? 0;
    cam.follow(player.position, true);
  }
  const miso = cast.byId.miso;
  if (miso.follow && spawn) { miso.area = area.id; miso.position.set(spawn[0] + 0.7, 0, spawn[1] + 0.7); cast.apply(); } // Miso comes along
  beats.onEnter(area);
}
onAreaEnter(world.current, null);

// Audio events: dialogue voice blips, UI sounds, board links, footsteps, sign crackle.
dialogue.onChar = (ch, speaker) => sfx.voice(ch, speaker);
dialogue.onUi = caseFile.onUi = echo.onUi = board.onUi = (kind) => sfx.ui(kind);
caseFile.onAdd = () => sfx.ui('case');
board.onLock = () => { sfx.ui('linkOk'); music.addLink(); };
board.onWrong = () => sfx.ui('linkWrong');
cast.byId.juno.onStep = (fi, anim) => sfx.step(world.current.meta.surface ?? surfaceAt(player.position.x, player.position.z), player.position, input.run, anim === 'sneak');
tod.onFlicker = (i) => sfx.crackle(street.signs[i].light.position);

// ?hooks exposes the game objects for the headless test driver (scripts/drive.mjs eval: steps).
if (new URLSearchParams(location.search).has('hooks')) {
  const nl = window.__nl = { cam, world, player, beats, caseFile, dialogue, cast, echo, hud, clock, board, THREE };
  // Visual tour helpers: stand the player d units from a point (camera side) in any area, as in play, so the cutaway applies.
  nl.look = (areaId, x, z, d = 1.8) => {
    const b = world.areas[areaId].bounds, dx = (b.x0 + b.x1) / 2 - x, dz = (b.z0 + b.z1) / 2 - z, len = Math.hypot(dx, dz) || 1;
    world.jump(areaId, [x + (dx / len) * d, z + (dz / len) * d, Math.atan2(-dx, -dz)]);
    cam.follow(player.position, true);
    return `${areaId} ${x.toFixed(1)},${z.toFixed(1)}`;
  };
  nl.lookSpot = (areaId, name, d) => { const q = world.spot(areaId, name); return nl.look(areaId, q.x, q.z, d); };
  nl.lookCast = (id, d) => { const b = cast.byId[id]; return nl.look(b.area, b.position.x, b.position.z, d); };
}
const debug = createDebugPanel(renderer, rng.seed);
if (new URLSearchParams(location.search).has('sprites')) showSprites(getSheets());
const labels = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.name ?? v.label]));
debug.select('time', labels(TIME_OF_DAY), phaseId, (v) => tod.setTimeOfDay(v, MAIN.todBlendSeconds));
debug.select('tier', labels(TIERS), settings.tier, (v) => { location.search = `?quality=${v}`; });
debug.select('go to', Object.fromEntries(Object.entries(world.areas).map(([id, a]) => [id, a.meta.name])), world.current.id, (id) => {
  const e = world.exits.find((x) => x.to === id);
  world.jump(id, e ? e.spawn : null);
});
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
debug.slider('music volume', synth.volumes, 'music', 0, 1, 0.05, () => synth.setVolume('music', synth.volumes.music));
debug.slider('sfx volume', synth.volumes, 'sfx', 0, 1, 0.05, () => synth.setVolume('sfx', synth.volumes.sfx));
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
  const area = world.current;

  input.update();
  if (input.pressed('resetView')) cam.reset();
  cam.rotate((input.held('rotateR') ? 1 : 0) - (input.held('rotateL') ? 1 : 0) + input.lookX, dt);
  cam.orbit(input.orbitDX, input.orbitDY);
  if (input.pressed('debug')) debug.toggle();
  cam.zoom(CAMERA.wheelZoom ** input.zoomSteps * CAMERA.keyZoom ** (input.zoom * dt) * input.zoomFactor);
  touchUI.update();
  const scrubAxis = input.moveX; // echo mode scrubs with the move axis
  // Title, cutscene, area change, conversation, case file, echo or board: the world waits for the player.
  const modal = !title.done || beats.locked || world.busy || dialogue.active || caseFile.isOpen || echo.active || board.isOpen;
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
  player.update(dt, input, cam.yaw, !modal);
  const cfWasOpen = caseFile.isOpen, bdWasOpen = board.isOpen;
  const free = title.done && !beats.locked && !world.busy; // nothing scripted is running
  board.update(input);
  if (!bdWasOpen && !board.isOpen && free && !dialogue.active && !echo.active && !caseFile.isOpen && input.pressed('board')) board.open();
  caseFile.update(input);
  if (!cfWasOpen && !caseFile.isOpen && !dialogue.active && !echo.active && !board.isOpen && free && input.pressed('caseFile')) caseFile.open();
  const echoWas = echo.active;
  if (echoWas) echo.update(dt, input, cam.yaw, area.lights, scrubAxis, player.position);
  else if (dialogue.active) { if (!cfWasOpen) dialogue.update(dt, input); }
  else if (!cfWasOpen && !bdWasOpen && !board.isOpen && free) {
    if (input.pressed('echo')) echo.tryStart(player.position);
    else if (input.pressed('interact')) interactions.current?.onInteract();
  }
  if (!echoWas && !echo.active) echo.update(dt, input, cam.yaw, area.lights, 0, player.position); // markers + fade-out while idle
  beats.update(dt);
  const focus = beats.focus ?? player.position; // cutscenes can point the camera elsewhere
  cam.follow(focus);
  cam.update(dt);

  // Keep the tilt-shift sharp band on whatever the camera follows.
  headPos.copy(focus).setY(focus.y + 1).project(cam.camera);
  POST.tilt.center = (headPos.y + 1) / 2;
  post.applyUniforms();

  // Clock: runs once the title is dismissed; the phase picks the time-of-day mood.
  if (free && !echo.active) clock.update(dt);
  if (clock.phase.id !== phaseId) { phaseId = clock.phase.id; tod.setTimeOfDay(phaseId, 8); }
  hud.setClock(clock.text, clock.phase.label, clock.progress);
  if (input.pressed('hideControls')) hud.toggleControls();
  const place = world.placeAt(player.position.x, player.position.z);
  if (free) hud.setLocation(place.name, place.district);
  hud.update(dt, {
    player: { x: player.position.x, z: player.position.z, facing: player.facing }, yaw: cam.yaw,
    people: cast.list.filter((b) => b.id !== 'juno' && b.root.visible).map((b) => ({ x: b.position.x, z: b.position.z })),
  });
  if (input.pressed('music')) { synth.setMusicOn(!synth.musicOn); hud.toast(synth.musicOn ? 'Music on' : 'Music off'); }
  music.setMood(echo.active ? 'echo' : board.isOpen ? 'board' : place.mood);
  sfx.setEcho(echo.active);
  sfx.update(dt, {
    player: player.position, yaw: cam.yaw, signs: area.id === 'street' ? street.signs : [],
    rainScale: particles.rainScale * (area.meta.outdoor ? 1 : MAIN.indoorRain),
  });
  tod.update(dt);
  particles.update(dt, cam.target, cam.camera);
  cast.update(dt, cam.yaw, area.lights);
  if (modal) interactions.hide(); else interactions.update(player.position, player.facing, input.lastDevice, input.padType, cam.camera);
  fog.update(cam.camera, cam.target);
  const db = renderer.getDrawingBufferSize(bufSize);
  fog.cutaway(cam.camera, player.position, db.x, db.y);
  lights.focus(cam.target);
  lights.update(dt, cam.target);
  renderer.info.reset();
  post.render(dt);
  debug.update(dt);
  input.endFrame();
});
