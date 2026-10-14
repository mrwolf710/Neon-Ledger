import * as THREE from 'three';
import { rng } from './core/rng.js';
import { input } from './core/input.js';
import { createCamera, CAMERA } from './render/camera.js';
import { createDebugPanel, showSprites } from './debug/panel.js';
import { getSheets } from './gen/sprites.js';
import { loadJunoSheet, loadTeoSheet, loadPriestSheet, loadDexSheet, loadCatSheet, loadDexStandSheet, loadKitSheet, loadVendorSheet, loadWalkerSheet, MARKET1_ART, loadAuditorSheet, WALKER2_ART, WALKER3_ART, WALKER4_ART, loadHaleSheet } from './gen/junoart.js';
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
import { ENTRIES, BOARD } from './game/story.js';
import { createFade } from './ui/fade.js';
import { synth } from './audio/synth.js';
import { createSfx, surfaceAt } from './audio/sfx.js';
import { createMusic } from './audio/music.js';
import { createTitle } from './ui/title.js';
import { createTrailer, TRAILER } from './ui/trailer.js';
import { createMenu } from './ui/menu.js';
import { BEATS } from './game/beats.js';
import { createTutorial } from './ui/tutorial.js';
import { createPlayer } from './game/player.js';
import { createInteractions, INTERACT } from './game/interact.js';
import { settings, TIERS } from './core/settings.js';
import { createSaves } from './core/saves.js';
import { createRailTrain } from './world/railtrain.js';
import { createBarks } from './game/barks.js';
import { createLights } from './render/lights.js';
import { createPost, POST } from './render/post.js';
import { createCrtFrame } from './ui/crtframe.js';
import { createHeightFog, CUTAWAY } from './render/fog.js';
import { createParticles } from './world/particles.js';
import { createTimeOfDay, TIME_OF_DAY, SUNSET } from './world/timeofday.js';

const MAIN = {
  maxDt: 0.1, // seconds; clamps big frame gaps (tab switch)
  background: 0x0b0b14,
  toneMapping: THREE.NeutralToneMapping, exposure: 1.0,
  maxPixels: 2.5e6,   // drawing-buffer cap (about 1440p); the post chain renders several full-size float targets, so 4K at DPR 2 can hang the GPU
  todBlendSeconds: 3, // debug dropdown blends over this long
  indoorRain: 0.25,   // how much of the rain sound leaks into rooms
};

const Q = settings.quality;
console.log('Neon Echoes', Q.name);

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

try { getSheets().mamaTeo = await loadTeoSheet(); } catch (e) { console.warn('Teo art not loaded, using the generated sprite:', e.message); }

try { getSheets().preacher = await loadPriestSheet(); } catch (e) { console.warn('Priest art not loaded, using the generated sprite:', e.message); }
try { getSheets().dex = await loadDexSheet(); } catch (e) { console.warn('Dex art not loaded, using the generated sprite:', e.message); }

try { getSheets().vendor = await loadVendorSheet(); } catch (e) { console.warn('Vendor art not loaded, using the generated sprite:', e.message); }
try { getSheets().tobbo = await loadKitSheet(MARKET1_ART); } catch (e) { console.warn('Tobbo art not loaded, using his borrowed sprite:', e.message); getSheets().tobbo = getSheets().walkerD; }
try { const aud = await loadAuditorSheet(); Object.assign(getSheets(), { aud1: aud, aud2: aud, aud3: aud }); } catch (e) { console.warn('Auditor art not loaded, using borrowed sprites:', e.message); Object.assign(getSheets(), { aud1: getSheets().walkerA, aud2: getSheets().walkerD, aud3: getSheets().walkerC }); }
try { getSheets().walkerA = await loadWalkerSheet(); } catch (e) { console.warn('Walker art not loaded, using the generated sprite:', e.message); }
try { getSheets().walkerB = await loadWalkerSheet(WALKER2_ART); } catch (e) { console.warn('Walker 2 art not loaded, using the generated sprite:', e.message); }
try { getSheets().walkerC = await loadWalkerSheet(WALKER3_ART); } catch (e) { console.warn('Walker 3 art not loaded, using the generated sprite:', e.message); }
try { getSheets().walkerD = await loadWalkerSheet(WALKER4_ART); } catch (e) { console.warn('Walker 4 art not loaded, using the generated sprite:', e.message); }
try { getSheets().kit = await loadKitSheet(); } catch (e) { console.warn('Kit art not loaded, using the generated sprite:', e.message); }
try { getSheets().miso = await loadCatSheet(); } catch (e) { console.warn('Cat art not loaded, using the generated sprite:', e.message); }
try { getSheets().dexStanding = await loadDexStandSheet(); } catch (e) { console.warn('Standing Dex art not loaded, using the seated sprite:', e.message); }
try { getSheets().hale = await loadHaleSheet(); } catch (e) { console.warn('Hale art not loaded, using the letter portrait:', e.message); }

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
const crtFrame = createCrtFrame(canvas);
const post = createPost(renderer, scene, cam.camera, Q);
const cast = createCast(scene, getSheets(), world.areas);
const player = createPlayer(cast.byId.juno, world.current.collision);
const interactions = createInteractions(scene);
const touchUI = createTouchUI(input);
const saves = createSaves();
const title = createTitle(() => synth.start(), !!saves.latest());
const sfx = createSfx(synth), music = createMusic(synth);
const hud = createHud(world.current.collision);
const menu = createMenu({ synth, saves, snapshot: () => snapshotGame(), onLoad: (d) => loadGame(d) });
const tutorial = createTutorial(input);
const railTrain = createRailTrain(world.areas.street.group, fog);
const clock = createClock();
const caseFile = createCaseFile(hud, clock);
const dialogue = createDialogue({ hud, caseFile, clock });
const echo = createEcho({ scene, sheets: getSheets(), post, caseFile, hud, cast, areas: world.areas });
for (const h of echo.hotspots.filter((q) => !q.hidden)) {
  interactions.add({ id: `echo:${h.id}`, area: h.area, position: h.position, height: 1.2, verb: 'Echo', glyph: 'echo', onInteract: () => echo.start(h.id) });
}
echo.onCue = (name) => { if (name === 'stinger') sfx.stinger(); };
const board = createBoard({ caseFile, hud });
const barks = createBarks({ cast, caseFile, player, camera: cam.camera });
// The platform train stops: three little bursts of steam from its rear (west) end, each with a hiss. particles.steamOn draws steam on the (indoor) platform.
const STEAM = { bursts: 3, every: 1.7, puffs: 5, scale: 1.7 }; // puffs per burst, and how much bigger than a street vent's
const steamRng = rng.fork('trainsteam');
function trainSteam() {
  const [sx, sz] = world.areas.platform.trainStop;
  particles.steamOn = true;
  for (let k = 0; k < STEAM.bursts; k++) setTimeout(() => {
    sfx.steamHiss();
    for (let j = 0; j < STEAM.puffs; j++) setTimeout(() => particles.puff(sx - 7.6 + steamRng.range(-0.4, 0.4), 0.5 + steamRng.range(0, 0.4), sz + steamRng.range(-0.8, 0.8), STEAM.scale, steamRng.range(-0.5, 0.1)), j * 130);
    if (k === STEAM.bursts - 1) setTimeout(() => { particles.steamOn = false; }, 4500);
  }, 400 + k * STEAM.every * 1000);
}
let deadTone = null; // the low tone held under the cliffhanger
const beats = createBeats({ trainSteam, input, world, cast, caseFile, dialogue, hud, interactions, fade, sfx, player, clock, echo,
  deadHour: () => { tod.setTimeOfDay('blackout', 0.5); lights.scale = 0.3; deadTone = synth.tone({ freq: 55, type: 'sine', dur: 40, vol: 0.3, attack: 2.5, release: 4, bus: 'music' }); }, // beat 7: signs die
  endDeadHour: () => { tod.setTimeOfDay('night', 1.5); lights.scale = 1; deadTone?.gain.gain.setTargetAtTime(0.0001, synth.now, 0.5); deadTone?.osc.stop(synth.now + 3); deadTone = null; }, // chapter 2: she decides to go, the signs and music return, one low tone

  setExposure: (v) => { renderer.toneMappingExposure = MAIN.exposure * v; }, setVhs: (a) => post.setVhs(a), setCrt: (a) => { post.setCrt(a); crtFrame.set(a); fade.cardScale(crtFrame.ratio); } });
beats.setCamera(cam);
beats.register();
let phaseId = '', sunsetT = null, lastAreaId = null, cameFromSable = false;
const trailerOn = new URLSearchParams(location.search).has('trailer'); // ?trailer plays a scripted teaser (src/ui/trailer.js)
const trailer = createTrailer({ cam, world, player, post, fade, cast, sfx, synth });
const startParam = new URLSearchParams(location.search).get('start'); // ?start=sable jumps straight to an area (testing)
// Save slots in the browser (core/saves.js), each: where Juno is, the case file, the board, the clock, who she has talked to and Miso.
function snapshotGame() {
  if (beats.locked || dialogue.active) { hud.toast("Can't save during a scene"); return null; } // the menu also opens during cutscenes and conversations now
  const miso = cast.byId.miso, b = board.logic;
  const data = {
    v: 1, area: world.current.id, pos: [player.position.x, player.position.z], facing: cast.byId.juno.facing,
    minutes: clock.minutes, caseFile: caseFile.dump(), visits: { ...beats.visits }, sunsetT,
    board: { solved: [...b.solved], edges: [...b.edges], tries: [...b.tries] },
    miso: { follow: !!miso.follow, area: miso.area, pos: [miso.position.x, miso.position.z] },
  };
  return data;
}
function loadGame(s) {
  if (beats.locked || dialogue.active) { hud.toast("Can't load during a scene"); return; }
  const num = (n) => Number.isFinite(n);
  if (!s || s.v !== 1 || !world.areas[s.area] || !Array.isArray(s.pos) || !s.pos.every(num) || !num(s.minutes) || !num(s.facing)
    || !s.board || !Array.isArray(s.board.solved) || !Array.isArray(s.board.edges) || !Array.isArray(s.board.tries)
    || !s.miso || !Array.isArray(s.miso.pos) || !s.miso.pos.every(num) || !s.caseFile || typeof s.visits !== 'object') { hud.toast('Save is damaged'); return; }
  caseFile.restore(s.caseFile);
  const b = board.logic;
  b.solved.clear(); b.edges.clear(); b.tries.clear();
  s.board.solved.forEach((x) => b.solved.add(x)); s.board.edges.forEach(([k, v]) => b.edges.set(k, v)); s.board.tries.forEach(([k, v]) => b.tries.set(k, v));
  clock.add(s.minutes - clock.minutes);
  Object.assign(beats.visits, s.visits);
  sunsetT = s.sunsetT;
  const miso = cast.byId.miso;
  miso.follow = s.miso.follow ? { target: cast.byId.juno, ...BEATS.misoFollow } : null;
  miso.area = s.miso.area; miso.position.set(s.miso.pos[0], 0, s.miso.pos[1]);
  world.jump(s.area, [s.pos[0], s.pos[1], s.facing]); // places Juno and (if he follows) Miso, and refreshes who is drawn
  if (miso.follow) miso.position.set(s.pos[0] + 0.7, 0, s.pos[1] + 0.7);
  cam.follow(player.position, true);
  hud.show();
  hud.toast('Game loaded');
}
title.started.then(() => {
  if (trailerOn) { beats.skipOpen(); const q = new URLSearchParams(location.search); setTimeout(() => trailer.start(Math.max(0, (parseInt(q.get('trailer')) || 1) - 1)), (parseFloat(q.get('delay')) || 8) * 1000); return; } // 8 s head start (press a key, then start recording); ?delay=N changes it
  if (title.continuing && saves.latest()) { beats.skipOpen(); loadGame(saves.latest().data); return; }
  if (startParam && world.areas[startParam]) {
    beats.skipOpen();
    const sp = world.spot(startParam, 'start'); world.jump(startParam, world.exits.find((x) => x.to === startParam)?.spawn ?? (sp ? [sp.x, sp.z, Math.PI / 2] : null)); // areas with no door in (the Exchange) use their 'start' spot
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
  particles.active = area.meta.outdoor; particles.motes = area.id !== 'exchange'; // no floating motes in the market
  tod.setIndoor(!area.meta.outdoor);
  CUTAWAY.minY = area.id === 'exchange' ? 1e3 : area.meta.outdoor ? 0.3 : 1.15; // exchange: never cut, the booths must always be visible; // indoors, tables and the counter stay solid; only walls and signs above them are cut
  tod.setScene(area.id);
  if (area.id === 'hostel' || area.id === 'dealer') cam.reset(true); // the default view looks at the back wall: Kit and the capsules, no spinning needed
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
  const nl = window.__nl = { trainSteam, CUTAWAY, fade, crtFrame, music, input, tutorial, menu, title, snapshotGame, loadGame, saves, menu, sfx, synth, cam, world, player, beats, caseFile, dialogue, cast, echo, hud, clock, board, THREE };
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
// ---- Debug menu (backtick): Story / World / Audio / Graphics pages ----
const STORY_JUMPS = { 2: 'Ch1 beat 2: the street', 3: 'Ch1 beat 3: the Sable', 4: 'Ch1 beat 4: the echo', 5: 'Ch1 beat 5: Teo and Kit', 6: 'Ch1 beat 6: second board pass', 7: 'Ch1 beat 7: chip in the car', 8: 'Ch2: Exchange, no clues', 9: 'Ch2: Exchange, all 6 clues', 10: 'Ch2: all deductions, dealer open' };
const solveHeld = () => { for (const c of BOARD.conclusions) if (caseFile.has(c.result)) board.logic.solved.add(c.id); }; // the board shows deductions the debug jump already granted as done
debug.tab('Story');
debug.heading('Jump to a point in the story (with the clues you would hold)');
debug.select('jump to', { '': '-', ...STORY_JUMPS }, '', (n) => { if (n) { beats.skipTo(+n); solveHeld(); } });
debug.heading('Scenes');
debug.button('Play the chapter 1 ending', () => { beats.skipTo(7); solveHeld(); beats.cliffhanger(); });
debug.button('Chapter 2: dealer shop, receipt shown (then open Locker 9)', () => { beats.skipTo(10); solveHeld(); caseFile.setFlag('locker_ok'); const s = world.exits.find((e) => e.id === 'dealer-door').spawn; world.jump('dealer', s); });
debug.heading('Case file');
debug.button('Give every clue (ch1 + ch2)', () => { for (const id of Object.keys(ENTRIES)) caseFile.add(id); solveHeld(); });
debug.button('Unlock the dealer door', () => caseFile.setFlag('dealer_open'));
debug.button('Show a case-file toast', () => hud.toast('Case file updated'));
debug.extra = () => `beat ${beats.beatNo}  ${beats.beatTimes.map((s, i) => (s ? `${i + 1}:${Math.round(s)}s` : '')).filter(Boolean).join(' ')}`;

debug.tab('World');
const labels = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.name ?? v.label]));
debug.heading('Place and time');
debug.select('go to', Object.fromEntries(Object.entries(world.areas).map(([id, a]) => [id, a.meta.name])), world.current.id, (id) => {
  const e = world.exits.find((x) => x.to === id);
  world.jump(id, e ? e.spawn : null);
});
debug.select('time of day', labels(TIME_OF_DAY), phaseId, (v) => tod.setTimeOfDay(v, MAIN.todBlendSeconds));
debug.button('Clock +30 minutes', () => clock.add(30));
debug.button('Pause / resume clock', () => { clock.paused = !clock.paused; });
debug.heading('Save');
debug.button('Clear saves and reload', () => { try { localStorage.removeItem('nl.save'); } catch {} location.reload(); });

debug.tab('Audio');
debug.heading('Volume');
debug.slider('music', synth.volumes, 'music', 0, 1, 0.05, () => synth.setVolume('music', synth.volumes.music));
debug.slider('sfx', synth.volumes, 'sfx', 0, 1, 0.05, () => synth.setVolume('sfx', synth.volumes.sfx));
debug.heading('Music track');
let musicForce = '';
debug.select('play track', { '': 'auto (by area)', street: 'street', station: 'station', scene: 'scene', echo: 'echo', board: 'board', finale: 'finale (ch1 ending)', bazaar: 'bazaar (Exchange)', dealer: 'dealer (implant shop)', silent: 'silent' }, '', (v) => { musicForce = v; if (v) music.setMood(v, 0.4); });
debug.heading('Sound effects');
debug.select('play sfx', { '': '-', phoneRing: 'phone ring', trainNow: 'street train pass', comms: 'Hale comms', override: 'Hale override alarm', stinger: 'reveal stinger', move: 'ui move', confirm: 'ui confirm', back: 'ui back', case: 'ui case', linkOk: 'link ok', linkWrong: 'link wrong', echoOn: 'echo on', echoOff: 'echo off', glitch: 'glitch' }, '', (v) => { if (!v) return; if (sfx[v]) sfx[v](); else sfx.ui(v); });

debug.tab('Graphics');
const pu = () => post.applyUniforms();
debug.heading('Quality');
debug.select('quality tier', labels(TIERS), settings.tier, (v) => { location.search = `?quality=${v}`; });
debug.heading('See-through (what hides buildings in front of Juno)');
debug.select('mode', { circle: 'circle around Juno', roof: 'roofs off along the sight line' }, CUTAWAY.mode, (v) => { CUTAWAY.mode = v; });
debug.slider('roof slot half-width', CUTAWAY, 'roofReach', 1, 8, 0.1);
debug.slider('roof cut height', CUTAWAY, 'roofFloor', 1, 5, 0.1);
debug.slider('circle radius', CUTAWAY, 'radius', 2, 10, 0.1);
debug.heading('Glow and blur');
debug.slider('bloom', POST.bloom, 'strength', 0, 2, 0.05, pu);
debug.slider('bloom threshold', POST.bloom, 'threshold', 0, 1.5, 0.05, pu);
debug.slider('tilt band', POST.tilt, 'band', 0, 0.5, 0.01, pu);
debug.slider('tilt blur', POST.tilt, 'maxBlur', 0, 8, 0.25, pu);
debug.heading('Colour grade');
for (const k of ['lift', 'gamma', 'gain']) {
  const [min, max] = k === 'lift' ? [-0.1, 0.2] : [0.5, 1.5];
  'rgb'.split('').forEach((ch, i) => debug.slider(`${k} ${ch}`, POST.grade, k, min, max, 0.01, pu, i));
}
debug.slider('saturation', POST.grade, 'saturation', 0, 2, 0.05, pu);
debug.heading('Fog');
debug.slider('falloff', fog.uniforms.fogFalloff, 'value', 0, 1, 0.01);
debug.slider('high', fog.uniforms.fogHigh, 'value', 0, 1, 0.01);
debug.slider('ground', fog.uniforms.fogGround, 'value', 0, 1, 0.01);
debug.button('Log these values to the console', () => console.log(JSON.stringify({ POST, fogFalloff: fog.uniforms.fogFalloff.value, fogHigh: fog.uniforms.fogHigh.value, fogGround: fog.uniforms.fogGround.value })));

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.pixelRatio, Math.sqrt(MAIN.maxPixels / (w * h))));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  post.setSize(window.innerWidth, window.innerHeight);
  cam.camera.aspect = window.innerWidth / window.innerHeight;
  cam.camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); renderer.setAnimationLoop(null); setTimeout(() => location.reload(), 500); }); // ponytail: reload instead of rebuilding GPU state
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
  if (import.meta.env.MODE !== 'itch' && input.pressed('debug')) debug.toggle(); // the itch.io build (npm run itch) has no debug menu
  cam.zoom(CAMERA.wheelZoom ** input.zoomSteps * CAMERA.keyZoom ** (input.zoom * dt) * input.zoomFactor);
  touchUI.update();
  const scrubAxis = input.moveX; // echo mode scrubs with the move axis
  // Title, cutscene, area change, conversation, case file, echo or board: the world waits for the player.
  const menuWasOpen = menu.isOpen;
  menu.update(input);
  const tutWasOpen = tutorial.isOpen;
  if (area.id !== lastAreaId) { cameFromSable = lastAreaId === 'sable' && area.id === 'street'; lastAreaId = area.id; }
  tutorial.update();
  // First time Juno steps back out of the Sable: show how to spin the camera.
  if (!trailer.active && cameFromSable && !world.busy && !beats.locked && !dialogue.active && !tutorial.isOpen) { cameFromSable = false; if (!caseFile.hasFlag('tut_camera')) { caseFile.setFlag('tut_camera'); tutorial.open('camera'); } }
  // First time Juno holds 3 clues inside the Sable: explain the board.
  if (!trailer.active && world.current.id === 'sable' && !dialogue.active && !tutorial.isOpen && !caseFile.hasFlag('tut_board') && caseFile.facts().length >= 2) { caseFile.setFlag('tut_board'); tutorial.open('board'); }
  if (!trailer.active && echo.active && !tutorial.isOpen && !caseFile.hasFlag('tut_echo')) { caseFile.setFlag('tut_echo'); tutorial.open('echo'); } // first echo: explain it (the echo waits)
  const paused = menu.isOpen || menuWasOpen; // the menu freezes cutscenes and conversations too (it opens during both)
  const modal = trailer.active || tutorial.isOpen || tutWasOpen || !title.done || beats.locked || world.busy || dialogue.active || caseFile.isOpen || echo.active || board.isOpen || menu.isOpen || menuWasOpen;
  if (input.click && beats.calling && !paused) beats.answerCall(); // a click or tap answers Hale's call (it is locked, so the click would otherwise be thrown away below)
  if (modal) { input.click = null; input.moveX = input.moveY = 0; }
  if (!trailer.active && !menuWasOpen && !tutorial.isOpen && !tutWasOpen && title.done && !world.busy && !caseFile.isOpen && !echo.active && !board.isOpen && input.pressed('pause')) menu.open();
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
  const free = title.done && !beats.locked && !world.busy && !tutorial.isOpen && !tutWasOpen; // nothing scripted is running
  // First time Juno is free to move on a touch screen: how to move.
  if ((input.lastDevice === 'touch' || matchMedia('(pointer: coarse)').matches) && free && !trailer.active && !dialogue.active && !menu.isOpen && !caseFile.hasFlag('tut_move')) { caseFile.setFlag('tut_move'); tutorial.open('move'); }
  board.update(input);
  if (!bdWasOpen && !board.isOpen && free && !dialogue.active && !echo.active && !caseFile.isOpen && input.pressed('board')) board.open();
  caseFile.update(input);
  if (!cfWasOpen && !caseFile.isOpen && !dialogue.active && !echo.active && !board.isOpen && free && input.pressed('caseFile')) caseFile.open();
  const echoWas = echo.active;
  if (paused) { /* frozen */ }
  else if (echoWas && !tutorial.isOpen && !tutWasOpen) echo.update(dt, input, cam.yaw, area.lights, scrubAxis, player.position);
  else if (dialogue.active) { if (!cfWasOpen) dialogue.update(dt, input); }
  else if (!cfWasOpen && !bdWasOpen && !board.isOpen && free) {
    if (input.pressed('echo')) echo.tryStart(player.position);
    else if (input.pressed('interact')) interactions.current?.onInteract();
  }
  if (!paused && !echoWas && !echo.active) echo.update(dt, input, cam.yaw, area.lights, 0, player.position); // markers + fade-out while idle
  if (!paused) beats.update(dt);
  trailer.update(dt);
  const focus = trailer.focus ?? beats.focus ?? player.position; // cutscenes can point the camera elsewhere
  cam.follow(focus);
  cam.update(dt);

  // Keep the tilt-shift sharp band on whatever the camera follows.
  headPos.copy(focus).setY(focus.y + 1).project(cam.camera);
  POST.tilt.center = (headPos.y + 1) / 2;
  post.applyUniforms();

  // Clock: runs once the title is dismissed; the phase picks the time-of-day mood.
  if (free && !echo.active && !paused) clock.update(dt);
  if (clock.phase.id !== phaseId && !beats.ending) { phaseId = clock.phase.id; tod.setTimeOfDay(phaseId, 8); }
  hud.setClock(clock.text, clock.phase.label, clock.progress);
  if (input.pressed('hideControls')) hud.toggleControls();
  if (input.pressed('map')) document.body.classList.toggle('nomap'); // N / the MAP button: hide or show the clock and minimap
  const place = world.placeAt(player.position.x, player.position.z);
  if (free) hud.setLocation(place.name, place.district);
  hud.update(dt, {
    player: { x: player.position.x, z: player.position.z, facing: player.facing }, yaw: cam.yaw,
    people: cast.list.filter((b) => b.id !== 'juno' && !b.ambient && b.root.visible).map((b) => ({ x: b.position.x, z: b.position.z })),
  });
  if (input.pressed('music')) { synth.setMusicOn(!synth.musicOn); hud.toast(synth.musicOn ? 'Music on' : 'Music off'); }
  music.setMood(musicForce ? musicForce : trailer.active ? trailer.mood : beats.finale ? 'finale' : beats.ending ? 'silent' : echo.active ? 'echo' : board.isOpen ? 'board' : place.mood, trailer.active ? 0.25 : beats.finale ? 0.4 : undefined);
  sfx.setEcho(echo.active);
  sfx.update(dt, {
    player: player.position, yaw: cam.yaw, signs: area.id === 'street' ? street.signs : [],
    rainScale: particles.rainScale * (area.meta.outdoor ? 1 : MAIN.indoorRain), noRain: area.id === 'platform',
  });
  // Sunset: starts when Juno first reaches the street, fades to the night mood over SUNSET.seconds.
  if (area.id === 'street' && sunsetT === null) sunsetT = 0;
  if (sunsetT !== null && !modal) sunsetT += dt;
  tod.sunset = sunsetT === null ? 0 : (1 - Math.min(1, sunsetT / tod.sunsetSeconds)) ** 1.5;
  tod.update(dt);
  if (trailer.active && TRAILER.void) { scene.background.setRGB(0, 0, 0); scene.fog.color.setRGB(0, 0, 0); } // trailer: no lit haze around the street
  particles.update(dt, cam.target, cam.camera);
  cast.update(dt, cam.yaw, area.lights);
  barks.update(dt, area.id, !modal);
  railTrain.update(trailer.trainZ() ?? sfx.trainZ());
  if (modal) interactions.hide(); else interactions.update(player.position, player.facing, input.lastDevice, input.padType, cam.camera);
  fog.update(cam.camera, cam.target);
  const db = renderer.getDrawingBufferSize(bufSize);
  fog.cutaway(cam.camera, trailer.subject ?? player.position, db.x, db.y); // the trailer centres it on whoever it is filming
  lights.focus(cam.target);
  lights.update(dt, cam.target);
  renderer.info.reset();
  post.render(dt);
  debug.update(dt);
  input.endFrame();
});
