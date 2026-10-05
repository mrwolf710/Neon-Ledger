# NOTES
Running summary for Claude sessions (keep under 60 lines).
## Status
- Current stage: 7A done (#15), untested in browser. Next: 7B (#16) deduction board. Issues #2-#14 closed. Seed 1337 (`SEED`, src/core/rng.js)
## Files
- src/core: rng.js seeded PRNG · input.js action layer · settings.js TIERS high/medium/mobile, ?quality=
- src/render: camera.js orbit cam · lights.js · fog.js height fog + cutaway · post.js bloom, tilt-shift, grade
- src/world: district.js layout, CAST, ZONES · collision.js walk grid · particles.js · timeofday.js moods
- src/gen: palette.js · textures.js · batch.js merge collector · buildings.js · glyphs.js signs · props.js · sprites.js characters · pixelfont.js
- src/game: npc.js billboards + createCast · player.js · interact.js prompts · clock.js · story.js (ALL story data) · dialogue.js · casefile.js · echo.js
- src/ui: touch.js · title.js (title.started) · styles.css (panel frame, key caps, rem, safe-area) · hud.js (HUD + dialogue box)
- src/main.js builds everything + loop · src/debug/panel.js stats + controls (` toggles) · scripts/check-*.mjs (node self-checks), scripts/where.mjs (prints CAST and spot positions)
## Key functions
- `createRng(seed)` -> { seed, rand, range, int, pick, weighted({k:w}), fork(label) }; fork depends only on (seed, label).
- `input`: update()/endFrame(); moveX/moveY, run, zoom, zoomSteps, orbitDX/DY, lookX, click {x,y}, zoomFactor, lastDevice, padType,
  held(a), pressed(a), pressAction/releaseAction. Keys: WASD/arrows, Shift run, Space/Enter interact, Backspace back, F echo, Q/E rotate,
  Z/X zoom, R/V tilt, C reset view, Tab caseFile, B board, N map, H hide controls, Esc pause, ` debug. Pad: PAD_BINDINGS. Touch: stick left
  half, tap = click, right-half drag orbits, 2-finger swipe/pinch.
- `createCamera(aspect)` -> { camera, target, yaw, reset, orbit, follow(p, snap), rotate, tilt, zoom(factor), update }; main keeps POST.tilt.center on Juno.
- `buildDistrict(rng)` -> Group; userData { lights, steam, signs, spots, blocks }. Street along X (40); Z across. `createBatch()` collects per
  material (box, light, steam, sign, spot, block). `groundY(z)`, `zoneAt(x,z)`, CAST {id, at, facing, pose, path, speed} in district.js.
- `createCollision(blocks)` -> { grid, hits, move(pos,dx,dz,r) }. `createPlayer(billboard, collision)` -> { position, facing, walkTo(point, reach, onArrive), update }.
- `createCast(scene, sheets, spots)` -> { list, byId, update }; billboard.facing/anim/fpsScale. `getSheets()` -> sprite sheets (humans 40x64 at
  32 px/unit, cat 16x12; shape-built, 4-tone shading, neon rim SPRITES.rim; ?sprites previews).
- `createInteractions(scene)` -> { add({id, position, height, verb, onInteract}), nearest, pick, current, hide, update(...) }: DOM prompt, pixel font.
- `createHud(collision)` -> { dialogue (box UI), show, setLocation, setClock, setObjective({x,z}|null), toast, toggleControls, update(dt, view) }.
  `createClock()` 1 s = 1 game min from 22:40; phase picks time-of-day mood. `frame(el)` = panel frame.
- Look: `createLights`, `createPost` (edit POST, applyUniforms), `createHeightFog` (+cutaway), `createParticles`, `createTimeOfDay`
  (lateEvening/night/deadHour), `getTexture`, `building`. Debug panel: select/slider/button, FPS/calls/tris/heap. Tunables: constants atop each file.
- `createCaseFile(hud)` -> { has(id), add(id), hasFlag, setFlag, open({present, onPick, onCancel}), close, toggle, isOpen, update(input) }. Tabs People/Facts/Echoes.
  `createEcho({scene, sheets, post, caseFile, hud, cast, spots})` -> { active, hotspots, tryStart(pos), start(id), exit(), update(dt, input, camYaw, lights, scrubAxis, playerPos) }.
  F near a hotspot (cyan diamond) starts it; F/Backspace/Esc exits. Space tags (in a tag window) else play/pause; stick or A/D scrubs, D-pad steps,
  drag the bar. Red seam tick appears once the playhead has crossed it (stutter + pixel tear 0.2 s). `post.setEcho(0..1)`, `setGlitch(0..1)`.
  `createDialogue({hud, caseFile, clock})` -> { active, start(convId), end, update(dt, input), onChar(char, speakerId) } (voice blips hook, Stage 8).
## Data formats
- Character: { name, skin, iris, lips?, lashes?, hair:{style,color,shine?}, top, legs, shoes, outfit?:{type,color,collar}, acc:[{type,color}], poses? }.
- Story data (src/game/story.js): SPEAKERS {id: {name, color}}; ENTRIES {id: {kind people|facts|echoes, title, text, source}};
  TALK {npcId: convId} (FALLBACK 'nobody'); CONVERSATIONS {id: {start: nodeId | [{if, node}], nodes: {id: Node}}}.
  Node { speaker, text, next?, choices?: [Choice], effects?, present?: {factId: nodeId}, presentWrong?: nodeId, end? }. A node with `present` gets an
  automatic "Present evidence…" choice. Choice { text, next?, if?, effects?, end? }. Condition { flag?, notFlag?, fact?, notFact? } (all must hold).
  Effects { addFact | addPerson | addEcho: entryId } { setFlag: name } { setTime: [h, m] }, applied on entering a node / picking a choice.
  Interact skips typewriter (40 cps) then advances; W/S/D-pad choose; click/tap works. Test: Mama Teo (talk twice, present "back lock").
- Echo (story.js ECHOES/HOTSPOTS): HOTSPOTS [{id, echo, at: [x,z] | {spot, dx, dz}, radius}]. ECHOES[id] { title, owner, entry (ENTRIES echoes id, added on first play),
  duration (s), tracks: [{sprite: sheetId, show?: [t0,t1], keys: [{t, x, z, facing?, anim?: idle|walk}]}] (linear; two keys ~0.01 s apart = a jump),
  voices: [{t0, t1, speaker, text}] captions, seams: [t], tags: [{t, window, fact, label}] }. Test: stall hotspot (cyan diamond), seam 3.5 s.
## Known issues
- Chunk > 500 kB warning. Rail deck hits buildings near x=17. NPCs don't block Juno. Point lights cast no shadows. Mobile shadows may be heavy.
## Next
Stage 7A (#15): echo-scan replays, scrubbing, seams, tagging (docs/stages/stage-07-echo-board.md). iPhone: npm run dev -- --host.
