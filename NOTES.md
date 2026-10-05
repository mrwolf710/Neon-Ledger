# NOTES
Running summary for Claude sessions (keep under 60 lines).
## Status
- Current stage: 6A done (#13). Next: 6B (#14) dialogue + case file. Issues #2-#12 closed. Seed: 1337 (`SEED` in src/core/rng.js)
## Files
- src/core: rng.js seeded PRNG · input.js action layer · settings.js TIERS high/medium/mobile, ?quality=
- src/render: camera.js orbit cam · lights.js · fog.js height fog + cutaway · post.js bloom, tilt-shift, grade
- src/world: district.js layout, CAST, ZONES · collision.js walk grid · particles.js · timeofday.js moods
- src/gen: palette.js · textures.js · batch.js merge collector · buildings.js · glyphs.js signs · props.js · sprites.js characters
  · pixelfont.js 3x5 font (drawText)
- src/game: npc.js billboards + createCast · player.js · interact.js prompts · clock.js · scripts/check-*.mjs (node)
- src/ui: touch.js · title.js (title.started) · styles.css (panel frame, key caps, rem, safe-area) · hud.js
- src/main.js builds everything + loop · src/debug/panel.js stats + select/slider/button controls (` toggles)
## Key functions
- `rng` / `createRng(seed)` -> { seed, rand, range, int (inclusive), pick, weighted({k:w}), fork(label) }; fork depends only on (seed, label).
- `input.update()` / `endFrame()`; moveX/moveY, run, zoom, zoomSteps, orbitDX/DY (drag), lookX, click {x,y}, lastDevice,
  padType, held(a), pressed(a). Click = press under INPUT.dragStart px; drag (either button) orbits. Pad: PAD_BINDINGS, dead 0.2.
  Touch: left-half floating stick (touchStick, >0.7 runs), tap = click, right-half drag orbits, 2-finger swipe/pinch -> zoomFactor.
  Keys: WASD, Shift run, Space interact, F echo, Q/E rotate (hold), Z/X zoom, R/V tilt, C reset view, Tab caseFile, B board, N map, Esc pause, ` debug.
- `createCast(...)` -> { list, byId, update }; billboard.facing/anim/fpsScale drivable. CAST (district.js): { id, at:[x,z]|spot name,
  facing (0 = +z), pose idle|walk|slump, path:[[x,z]...], speed }. Row = facing - camYaw (down/right/up/left). NPC tunables.
  `groundY(z)` (district.js) = curb height on sidewalks. `batch.spot(name, x, z)` -> userData.spots (stall, vending).
  `batch.block(x,z,w,d)` -> userData.blocks AABBs. `createCollision(blocks)` -> { hits(x,z,r), move(pos,dx,dz,r) } (axis slide).
- `createHud(collision)` -> { show, setLocation(name, district), setClock(text, phase, progress), setObjective({x,z}|null), toast(text),
  toggleControls/setControls, update(dt, {player:{x,z,facing}, yaw, people:[{x,z}]}) }; `frame(el)` adds the panel frame.
  Minimap rotates with the camera, N = world -z. `createClock()` -> { minutes, paused, text, phase{id,label}, progress, setTime(h,m), add, update(dt) }
  1 real s = 1 game min from 22:40; phase picks the time-of-day mood. `zoneAt(x,z)` (district.js ZONES) -> banner text. H hides controls.
- `createPlayer(billboard, collision)` -> { position, facing, walkTo(point, reach, onArrive), update(dt, input, camYaw) }.
- `createInteractions(scene)` -> { add({id, position, height, verb, onInteract}), nearest, pick(click, camera), current,
  update(pos, facing, device, padType, camera) }: DOM prompt (pixel font, x3) with key/mouse/Xbox/PS glyph. NPCs Talk, Miso Pet, vending Use.
- `createCamera(aspect)` -> { camera, target, yaw, reset, orbit(dx,dy), follow(p, snap), rotate(dir,dt), tilt(dir,dt), zoom(factor),
  update(dt) }. Follows Juno (CAMERA.follow lag); main keeps POST.tilt.center on her head each frame.
- `buildDistrict(rng)` -> Group. Street along X (length 40); Z across (road 6, sidewalks 2, buildings 3 deep). Rail x=17.
  userData = { lights: [{color,intensity,base,position}], steam, signs: [{mat, light}], spots, blocks }.
- `createBatch()` -> { setTransform, add, box, light, steam, sign, spot, block, build() -> Group }. Local +z = facing.
  ~1 draw per material + 2 per sign (sign + reflection) + 1 per open shop.
- `getTexture(name, rng, wU, hU)` -> { map, roughnessMap } cached, dithered. `building(rng, M, batch, w, d)`: shop (interior texture or shutter, awning, sign) + 1-5 floors of modules; AC units are steam vents.
  Each sign: point light (signLight), additive streak reflection (BUILDINGS.reflection). Glow multipliers signGlow/windowGlow/lamp.glow.
- `createLights(scene, max, shadowSize)` -> { moon, hemi, register, update }. `createPost(...)` -> { applyUniforms(), setSize, render(dt) }.
- `createHeightFog(scene)` -> { uniforms, update(camera, focus), patch(root) }: FogExp2 + onBeforeCompile; starts near focus, pools low.
  Same patch does the CUTAWAY: cutaway(camera, playerPos, bufW, bufH) dither-cuts geometry in front of Juno.
- `createParticles(scene, rng, rainCount, steamVents)` -> { rainScale, update(dt, focus, camera) }: 4 additive InstancedMeshes; rain fixed over district.
- `createTimeOfDay({scene, lights, post, particles, signs, rng})` -> { name, setTimeOfDay(name, seconds), update(dt) }.
  States lateEvening / night / deadHour (TIME_OF_DAY): sky, fog, moon, hemi, grade, signs, flicker, dead, rain.
  Grade is written only while blending, so debug sliders stick until the next change.
- `createDebugPanel(renderer, seed)` -> { toggle, update, select, slider(label, obj, key, min, max, step, fn, index), button }; FPS/calls/tris/heap.
- `getSheets()` -> { juno, mamaTeo, kit, dex, vendor, miso }: `spriteSheet(def, isCat)` -> { texture, canvas, frameW, frameH, pxPerUnit,
  rows {down,up,left,right[,slump]}, anims {idle:{start:0,frames:2}, walk:{start:2,frames:4}} }. Humans 40x64 at 32 px/unit (double
  density, ~6 heads tall; street stays 16), cat 16x12. Shape-built (ellipse/capsule/poly + 2-bone legs), 4-tone row-run shading,
  neon rim (SPRITES.rim), outline tinted per material. ?sprites previews.
- Tunables: constants at the top of each file (CAMERA, INPUT, PLAYER, INTERACT, NPC, POST, FOG, PARTICLES, TIME_OF_DAY, ...).
## Data formats
- Character: { name, skin, iris, lips?, lashes?, hair:{style,color,shine?}, top, legs, shoes, outfit?:{type trench|jacket|suit,color,collar}, rolledSleeves?, stoop?,
  acc:[{type,color}] (implant belt apron sticks bag tie stripe soles poncho trim hood visor), poses?:["slump"] }. Palette names.
## Known issues
- Chunk > 500 kB warning. renderer.info.autoReset off. Rail deck hits buildings near x=17. NPCs don't block Juno. Point lights cast no shadows.
- Shadows on for Mobile too (shrink if iPhone struggles).
## Next
Stage 6: HUD + dialogue (docs/stages/stage-06-hud-dialogue.md). iPhone: npm run dev -- --host, open the Network URL in Safari landscape.
