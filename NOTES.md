# NOTES
Running summary for Claude sessions (keep under 60 lines).

## Status
- Current stage: 4B done (#9). Next: Stage 5A (see docs/stages/stage-05-movement-input.md). Seed: 1337 (`SEED` in src/core/rng.js)
## Files
- src/core: rng.js mulberry32 PRNG · input.js action layer (keyboard + wheel; mouse/gamepad/touch TODO 5A/5B)
  · settings.js TIERS high/medium/mobile (pixelRatio, bloomScale, maxLights, shadowMap, rainCount), auto-detect, ?quality=
- src/render: camera.js orbit cam · lights.js moon (shadow) + hemi + nearest-N point light pool · fog.js height fog
  · post.js Render -> UnrealBloom -> tilt-shift H/V -> OutputPass -> grade (lift/gamma/gain, sat, grain, fringe)
- src/world: district.js street layout · particles.js rain, splashes, steam, motes · timeofday.js moods + sign flicker
- src/gen: palette.js 32 colours + snap() · textures.js canvas generators (brick, concrete, tiles, metalPanel,
  wetAsphalt, sidewalk, awning, shopWarm/shopCool) · batch.js merge-per-material collector · buildings.js · glyphs.js signs
  · props.js stall, crates, vending, bags, lamp · sprites.js layered pixel characters + cat (data in CHARACTERS/CATS)
- src/main.js builds everything + loop · src/game/npc.js: Y-axis billboard sprites (rim-tint shader, contact shadow), createCast places CAST
- src/debug/panel.js: stats overlay + select/slider/button controls (` toggles)
## Key functions
- `rng` / `createRng(seed)` -> { seed, rand, range, int (inclusive), pick, weighted({k:w}), fork(label) }; fork depends only on (seed, label).
- `input.update()` / `input.endFrame()`; `moveX/moveY`, `zoom`, `zoomSteps`, `held(a)`, `pressed(a)`.
  Keys: WASD, Shift run, Space interact, F echo, Q/E rotate, Z/X zoom, R/V tilt, Tab caseFile, B board, N map, Esc pause, ` debug.
- `createCast(scene, sheets, spots)` -> { list, update(dt, camYaw, lights) }. CAST (district.js): { id, at:[x,z]|spot name,
  facing (0 = +z), pose idle|walk|slump, path:[[x,z]...], speed }. Row = facing - camYaw (down/right/up/left). NPC tunables.
  `groundY(z)` (district.js) = curb height on sidewalks. `batch.spot(name, x, z)` -> userData.spots (stall cook spot).
- `createCamera(aspect)` -> { camera, target, yaw, rotate(±1) (30 deg steps), pan(x,y,dt), tilt(dir,dt), zoom(d), update(dt) }.
- `buildDistrict(rng)` -> Group. Street along X (length 40); Z across (road 6, sidewalks 2, buildings 3 deep). Rail x=17.
  group.userData = { lights: [{color,intensity,base,position}], steam: [Vector3], signs: [{mat, light}] }.
- `createBatch()` -> { setTransform(x,z,rotY), add(mat,geo), box(...), light(color,int,x,y,z) -> light, steam(x,y,z),
  sign(mat, light), build() -> Group }. Local +z = facing. ~1 draw per material + 2 per sign (sign + reflection) + 1 per open shop (own interior texture).
- `building(rng, M, batch, w, d)`: shop (interior texture or shutter, awning, sign) + 1-5 floors of modules; AC units are steam vents.
  Each sign: point light (signLight), additive streak reflection (BUILDINGS.reflection). Glow multipliers signGlow/windowGlow/lamp.glow.
- `getTexture(name, rng, wU, hU)` -> { map, roughnessMap }, Nearest, world-unit UVs (repeat 1/size), cached, Bayer-dithered ramps.
- `createLights(scene, max, shadowSize)` -> { moon, hemi, register(list), update(dt, focus) }: re-sorts every 0.25 s,
  copies each source's .intensity every frame (flicker).
- `createPost(renderer, scene, camera, quality)` -> { applyUniforms(), setSize, render(dt) }; edit POST then applyUniforms().
- `createHeightFog(scene)` -> { uniforms, update(camera, focus), patch(root) }: scene.fog FogExp2 + onBeforeCompile on every
  fogged material under root. Distance fog starts near the focus (FOG.startOffset) + ground mist; thins with height.
- `createParticles(scene, rng, rainCount, steamVents)` -> { rainScale, update(dt, focus, camera) }: 4 InstancedMeshes, additive,
  fades via instance colour. Rain box is fixed over the district (PARTICLES.rain.area).
- `createTimeOfDay({scene, lights, post, particles, signs, rng})` -> { name, setTimeOfDay(name, seconds), update(dt) }.
  States lateEvening / night / deadHour (TIME_OF_DAY): sky, fog, moon, hemi, grade, signs, flicker, dead, rain.
  Grade is written only while blending, so debug sliders stick until the next change.
- `createDebugPanel(renderer, seed)` -> { toggle, update(dt), select(label, {v:text}, v, fn), slider(label, obj, key, min, max, step, fn, index), button }.
  Panel has time, tier (reloads), bloom, tilt, grade RGB, saturation, fog sliders, "log values" (prints JSON to console).
- `getSheets()` -> { juno, mamaTeo, kit, dex, vendor, miso }: `spriteSheet(def, isCat)` -> { texture, canvas, frameW, frameH,
  rows {down,up,left,right[,slump]}, anims {idle:{start:0,frames:2}, walk:{start:2,frames:4}} }. 24x32 (cat 16x12),
  row-run shading (lit left), neon rim (SPRITES.rim) on outermost pixels, ink outline; right = mirrored. ?sprites previews.
- Tunables: constants at the top of each file (CAMERA, DISTRICT, TEXTURES, BUILDINGS, PROPS, TIERS, LIGHTS, POST, FOG,
  PARTICLES, TIME_OF_DAY, FLICKER, PANEL, MAIN, SPRITES).

## Data formats
- Character: { name, skin, eyes, hair:{style,color}, top, legs, shoes, coat?:{color,length,collar}, rolledSleeves?, stoop?,
  acc:[{type,color}] (implant belt apron sticks bag tie stripe soles poncho trim hood visor), poses?:["slump"] }. Palette names. Dialogue/echo/board formats come in Stages 6-7.

## Known issues
- Chunk > 500 kB warning (three.js). Rail deck hits buildings near x=17. No prop collision. Point lights cast no shadows.
- Shadows on for Mobile too (shrink if iPhone struggles). renderer.info.autoReset off (reset per frame in main).

## Next
Stage 5A: player movement + input (Juno becomes the player; replace the WASD camera pan, move the tilt band to her; remove cam.pan in main).
