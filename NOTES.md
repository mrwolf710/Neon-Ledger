# NOTES
Running summary for Claude sessions (keep under 60 lines).
## Status
- Current stage: 5A done (#10). Next: Stage 5B (#11) touch + Mobile tier. Seed: 1337 (`SEED` in src/core/rng.js)
## Files
- src/core: rng.js mulberry32 PRNG · input.js action layer (keyboard, mouse, gamepad; touch TODO 5B)
  · settings.js TIERS high/medium/mobile (pixelRatio, bloomScale, maxLights, shadowMap, rainCount), auto-detect, ?quality=
- src/render: camera.js orbit cam · lights.js moon (shadow) + hemi + nearest-N point light pool · fog.js height fog
  · post.js Render -> UnrealBloom -> tilt-shift H/V -> OutputPass -> grade (lift/gamma/gain, sat, grain, fringe)
- src/world: district.js street layout · collision.js walk grid (0.5 cells) · particles.js rain, splashes, steam, motes · timeofday.js moods + sign flicker
- src/gen: palette.js 32 colours + snap() · textures.js canvas generators (brick, concrete, tiles, metalPanel,
  wetAsphalt, sidewalk, awning, shopWarm/shopCool) · batch.js merge-per-material collector · buildings.js · glyphs.js signs
  · props.js stall, crates, vending, bags, lamp · sprites.js layered pixel characters + cat (data in CHARACTERS/CATS)
- src/main.js builds everything + loop · src/game/npc.js: Y-axis billboard sprites (rim-tint shader, contact shadow), createCast places CAST
  · player.js Juno movement/click-to-move · interact.js interactables + prompt bubble · scripts/check-collision.mjs (node)
- src/debug/panel.js: stats overlay + select/slider/button controls (` toggles)
## Key functions
- `rng` / `createRng(seed)` -> { seed, rand, range, int (inclusive), pick, weighted({k:w}), fork(label) }; fork depends only on (seed, label).
- `input.update()` / `endFrame()`; moveX/moveY, run, zoom, zoomSteps, orbitDX/DY (drag), lookX, click {x,y}, lastDevice,
  padType, held(a), pressed(a). Click = press under INPUT.dragStart px; drag (either button) orbits. Pad: PAD_BINDINGS, dead 0.2.
  Keys: WASD, Shift run, Space interact, F echo, Q/E rotate (hold), Z/X zoom, R/V tilt, C reset view, Tab caseFile, B board, N map, Esc pause, ` debug.
- `createCast(scene, sheets, spots)` -> { list, byId, update(dt, camYaw, lights) }; billboard.facing/anim/fpsScale drivable. CAST (district.js): { id, at:[x,z]|spot name,
  facing (0 = +z), pose idle|walk|slump, path:[[x,z]...], speed }. Row = facing - camYaw (down/right/up/left). NPC tunables.
  `groundY(z)` (district.js) = curb height on sidewalks. `batch.spot(name, x, z)` -> userData.spots (stall, vending).
  `batch.block(x,z,w,d)` -> userData.blocks AABBs. `createCollision(blocks)` -> { hits(x,z,r), move(pos,dx,dz,r) } (axis slide).
- `createPlayer(billboard, collision)` -> { position, facing, walkTo(point, reach, onArrive), update(dt, input, camYaw) }.
- `createInteractions(scene)` -> { add({id, position, height, verb, onInteract}), nearest, pick(click, camera), current,
  update(pos, facing, device, padType) }: prompt sprite with key/mouse/Xbox/PS glyph. NPCs Talk, Miso Pet, vending Use.
- `createCamera(aspect)` -> { camera, target, yaw, reset, orbit(dx,dy), follow(p, snap), rotate(dir,dt), tilt(dir,dt), zoom(factor),
  update(dt) }. Follows Juno (CAMERA.follow lag); main keeps POST.tilt.center on her head each frame.
- `buildDistrict(rng)` -> Group. Street along X (length 40); Z across (road 6, sidewalks 2, buildings 3 deep). Rail x=17.
  userData = { lights: [{color,intensity,base,position}], steam, signs: [{mat, light}], spots, blocks }.
- `createBatch()` -> { setTransform, add, box, light, steam, sign, spot, block, build() -> Group }. Local +z = facing.
  ~1 draw per material + 2 per sign (sign + reflection) + 1 per open shop.
- `building(rng, M, batch, w, d)`: shop (interior texture or shutter, awning, sign) + 1-5 floors of modules; AC units are steam vents.
  Each sign: point light (signLight), additive streak reflection (BUILDINGS.reflection). Glow multipliers signGlow/windowGlow/lamp.glow.
- `getTexture(name, rng, wU, hU)` -> { map, roughnessMap }, Nearest, world-unit UVs, cached, Bayer-dithered ramps.
- `createLights(scene, max, shadowSize)` -> { moon, hemi, register, update(dt, focus) }: nearest-N re-sort 0.25 s; intensity per frame.
- `createPost(renderer, scene, camera, quality)` -> { applyUniforms(), setSize, render(dt) }; edit POST then applyUniforms().
- `createHeightFog(scene)` -> { uniforms, update(camera, focus), patch(root) }: FogExp2 + onBeforeCompile; starts near focus, pools low.
- `createParticles(scene, rng, rainCount, steamVents)` -> { rainScale, update(dt, focus, camera) }: 4 additive InstancedMeshes; rain fixed over district.
- `createTimeOfDay({scene, lights, post, particles, signs, rng})` -> { name, setTimeOfDay(name, seconds), update(dt) }.
  States lateEvening / night / deadHour (TIME_OF_DAY): sky, fog, moon, hemi, grade, signs, flicker, dead, rain.
  Grade is written only while blending, so debug sliders stick until the next change.
- `createDebugPanel(renderer, seed)` -> { toggle, update(dt), select(label, {v:text}, v, fn), slider(label, obj, key, min, max, step, fn, index), button }.
- `getSheets()` -> { juno, mamaTeo, kit, dex, vendor, miso }: `spriteSheet(def, isCat)` -> { texture, canvas, frameW, frameH,
  rows {down,up,left,right[,slump]}, anims {idle:{start:0,frames:2}, walk:{start:2,frames:4}} }. 24x32 (cat 16x12),
  row-run shading (lit left), neon rim (SPRITES.rim) on outermost pixels, ink outline; right = mirrored. ?sprites previews.
- Tunables: constants at the top of each file (CAMERA, INPUT, PLAYER, INTERACT, NPC, POST, FOG, PARTICLES, TIME_OF_DAY, ...).

## Data formats
- Character: { name, skin, eyes, hair:{style,color}, top, legs, shoes, coat?:{color,length,collar}, rolledSleeves?, stoop?,
  acc:[{type,color}] (implant belt apron sticks bag tie stripe soles poncho trim hood visor), poses?:["slump"] }. Palette names. Dialogue/echo/board formats come in Stages 6-7.

## Known issues
- Chunk > 500 kB warning (three.js). Rail deck hits buildings near x=17. NPCs don't block Juno. Point lights cast no shadows.
- Shadows on for Mobile too (shrink if iPhone struggles). renderer.info.autoReset off (reset per frame in main).

## Next
Stage 5B (#11): touch stick/buttons, swipe-rotate, pinch-zoom, landscape lock, Mobile tier checks.
