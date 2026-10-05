# NOTES
Running summary for Claude sessions. Paste this file at the start of every stage chat. Keep it under 60 lines.

## Status
- Current stage: 3A done (#5). Next: Stage 3B (#6).
- Seed: 1337 (`SEED` in src/core/rng.js)

## Files
- index.html: full-window canvas#game, loads src/main.js
- src/main.js: renderer (shadows, Neutral tone map), scene, lights, district (shadows on), post, game loop
- src/core/settings.js: TIERS high/medium/mobile (pixelRatio, bloomScale, maxLights, shadowMap, rainCount, ssr), auto-detect, ?quality=
- src/render/lights.js: moon (shadow), hemi fill, fixed pool of N point lights moved to nearest registered lights
- src/render/post.js: Render -> UnrealBloom -> tilt-shift H/V -> OutputPass -> grade (lift/gamma/gain, sat, grain, fringe)
- src/core/rng.js: mulberry32 seeded PRNG
- src/core/input.js: action layer; keyboard + wheel live, mouse/gamepad/touch stubs (TODO 5A/5B)
- src/render/camera.js: orbit camera, fov 20, pitch 35, yaw 45, Q/E rotate in rotateStepDeg (30) steps, zoom
- src/world/district.js: street layout: road, sidewalks, 10 buildings, rail, curb lamps, scattered props
- src/gen/palette.js: 32-colour PALETTE (named 0xRRGGBB) + `snap(color)` nearest entry
- src/gen/textures.js: canvas generators brick, concrete, tiles, metalPanel, wetAsphalt, sidewalk, awning
- src/gen/batch.js: geometry collector, merged per material; boxGeo with world-unit UVs
- src/gen/buildings.js: BUILDINGS rules, getMaterials (shared street materials), building()
- src/gen/glyphs.js: pseudo-kanji sign textures from strokes; src/gen/props.js: stall, crates, vending, bags, lamp
- src/debug/panel.js: FPS, draw calls, triangles, seed overlay

## Key functions
- `rng` (root) / `createRng(seed)` -> { seed, rand, range(a,b), int(a,b) inclusive, pick(arr), weighted({k:w}), fork(label) }.
  fork depends only on (seed, label), not call order. main uses `rng.fork('district')`.
- `input.update()` at frame start, `input.endFrame()` at end. Read `input.moveX/moveY` (-1..1, +Y forward),
  `input.zoom` (held Z/X), `input.zoomSteps` (wheel notches), `input.held(a)`, `input.pressed(a)`.
  Keys: WASD, Shift run, Space interact, F echo, Q/E rotate, Z/X zoom, R/V tilt, Tab caseFile, B board, N map, Esc pause, ` debug.
- `createCamera(aspect)` -> { camera, target, yaw, rotate(+1/-1), zoom(delta), update(dt) }.
- `buildDistrict(rng)` -> THREE.Group. Street along X (length 40); Z across (road 6, sidewalks 2, buildings 3 deep).
  Rail at x=17, height 7. Each building uses rng.fork(`building:side:i`); props use fork('props').
- `createBatch()` -> { setTransform(x,z,rotY), add(mat, geo), box(mat, sx,sy,sz, x,y,z, rx, ry, worldUV), build() -> Group }.
  Local +z = facing. Whole street = 1 draw per material + 1 per sign (44 calls, ~7.8k tris at seed 1337).
- `building(rng, M, batch, w, d)`: ground shop (glass/shutter, awning, sign) + 1-5 floors of window/shutter/AC/blank
  modules, balconies, cables, pipe, roof tank, 1-2 signs (horizontal shop sign, vertical blade sign).
- `signTexture(rng, glyphCount, vertical, color)` -> CanvasTexture, 16 px per glyph. Signs/lit windows are MeshBasic.
- `getTexture(name, rng, wUnits, hUnits)` -> { map, roughnessMap }, seamless tile, Nearest, no mipmaps,
  repeat = 1/size (expects world-unit UVs). Cached by name:seed:size; uses rng.fork(key). Each pixel picks
  from a palette ramp via 4x4 Bayer dither. Roughness: puddles/seams low (wet), dry high.
- `settings.quality` = active tier. `createLights(scene, maxLights, shadowMapSize)` -> { moon, hemi, register(list), update(dt, focus) }.
  `createPost(renderer, scene, camera, quality)` -> { composer, applyUniforms(), setSize(w,h), render(dt) }; tweak POST then applyUniforms().
- `batch.light(color, intensity, x, y, z)` registers a light (local coords); build() puts them in group.userData.lights.
  Signs (BUILDINGS.signLight) and lamps (PROPS.lamp.light) register lights. Each sign adds an additive fading ground
  reflection quad (BUILDINGS.reflection), +1 draw per sign. Emissives get colour multipliers (signGlow, windowGlow, lamp.glow) for bloom.
- `createDebugPanel(renderer, seed)` -> { toggle(), update(dt) } (call after render).
- Tunables: CAMERA, DISTRICT, TEXTURES, BUILDINGS, GLYPHS, PROPS, PANEL, MAIN, TIERS, LIGHTS, POST constants at the top of each file.

## Data formats

## Known issues
- Build warns chunk > 500 kB (three.js). Harmless for now.
- WASD pans the camera target (temporary free-look until the Stage 4 player; remove the cam.pan line in main).
- Rail deck runs into the buildings near x=17 (since Stage 1). No collision on props yet.
- Tilt-shift band is fixed at screen centre (POST.tilt.center) until there is a player. renderer.info.autoReset is off (reset per frame in main).
- Point lights don't cast shadows; reflections stop at the road centre-ish (reflection.length).

## Next
Stage 3B: particles/rain (rainCount from tier), height fog, time-of-day states, debug sliders for POST.
