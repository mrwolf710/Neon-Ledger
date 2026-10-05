# NOTES

Running summary for Claude sessions. Paste this file at the start of every stage chat. Keep it under 60 lines.

## Status

- Current stage: 2A done (#3). Next: Stage 2B (#4).
- Seed: 1337 (`SEED` in src/core/rng.js)

## Files

- index.html: full-window canvas#game, loads src/main.js
- src/main.js: renderer (pixel ratio cap 2), scene, temp hemi + directional light, resize, game loop
- src/core/rng.js: mulberry32 seeded PRNG
- src/core/input.js: action layer; keyboard + wheel live, mouse/gamepad/touch stubs (TODO 5A/5B)
- src/render/camera.js: orbit camera, fov 20, pitch 35, yaw 45, 90 deg snap rotate, zoom
- src/world/district.js: textured street (road, sidewalks, 10 buildings, elevated rail)
- src/gen/palette.js: 32-colour PALETTE (named 0xRRGGBB) + `snap(color)` nearest entry
- src/gen/textures.js: canvas generators brick, concrete, tiles, metalPanel, wetAsphalt, sidewalk
- src/debug/panel.js: FPS, draw calls, triangles, seed overlay

## Key functions

- `rng` (root) / `createRng(seed)` -> { seed, rand, range(a,b), int(a,b) inclusive, pick(arr), fork(label) }.
  fork depends only on (seed, label), not call order. main uses `rng.fork('district')`.
- `input.update()` at frame start, `input.endFrame()` at end. Read `input.moveX/moveY` (-1..1, +Y forward),
  `input.zoom` (held Z/X), `input.zoomSteps` (wheel notches), `input.held(a)`, `input.pressed(a)`.
  Keys: WASD, Shift run, Space interact, F echo, Q/E rotate, Z/X zoom, Tab caseFile, B board, N map, Esc pause, ` debug.
- `createCamera(aspect)` -> { camera, target, yaw, rotate(+1/-1), zoom(delta), update(dt) }.
- `buildDistrict(rng)` -> THREE.Group. Street along X (length 40); Z across (road 6, sidewalks 2, buildings 3 deep).
  Rail at x=17, height 7. Each box has its own BoxGeometry with UVs in world units (FACE_UV).
- `getTexture(name, rng, wUnits, hUnits)` -> { map, roughnessMap }, seamless tile, Nearest, no mipmaps,
  repeat = 1/size (expects world-unit UVs). Cached by name:seed:size; uses rng.fork(key). Each pixel picks
  from a palette ramp via 4x4 Bayer dither. Roughness: puddles/seams low (wet), dry high.
- `createDebugPanel(renderer, seed)` -> { toggle(), update(dt) } (call after render).
- Tunables: CAMERA, DISTRICT (surfaces), TEXTURES, PANEL, MAIN constants at the top of each file.

## Data formats

(dialogue, echo and board formats are added in Stages 6 and 7)

## Known issues

- Build warns chunk > 500 kB (three.js). Harmless for now.
- Lights in main.js are temporary; Stage 3A moves them to src/render/lights.js.

## Next

Stage 2B (#4): building variety, windows, AC units, balconies, glyph signs (roofs currently share wall texture).
