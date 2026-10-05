# NOTES
Running summary for Claude sessions (keep under 60 lines).
## Status
- Current stage: 8 done (#17), untested in browser. Next: Stage 9 (#18-#21) demo content (docs/stages/stage-09-demo-content.md). Issues #2-#16 closed. Seed 1337 (`SEED`, src/core/rng.js)
## Files
- src/core: rng.js seeded PRNG · input.js action layer · settings.js TIERS high/medium/mobile, ?quality=
- src/render: camera.js · lights.js · fog.js (height fog + cutaway) · post.js · src/world: district.js (layout, CAST, ZONES), collision.js, particles.js, timeofday.js
- src/gen: palette.js · textures.js · batch.js · buildings.js · glyphs.js · props.js · sprites.js · pixelfont.js
- src/game: npc.js billboards + createCast · player.js · interact.js prompts · clock.js · story.js (ALL story data) · dialogue.js · casefile.js · echo.js · board.js
- src/audio: synth.js (AudioContext, buses, reverb, tone/noise helpers) · sfx.js · music.js (all synthesized; TUNING at the top of each)
- src/ui: touch.js · title.js (title.started) · styles.css (panel frame, key caps, rem, safe-area) · hud.js (HUD + dialogue box)
- src/main.js builds everything + loop · src/debug/panel.js stats + controls (` toggles) · scripts/check-*.mjs (node self-checks), scripts/where.mjs (CAST/spot positions), scripts/drive.mjs (headless Edge runs the built game: `node scripts/drive.mjs wait:2000 hold:KeyD+ShiftLeft:2500 shot:name`, prints console errors; screenshots go to the temp folder)
## Key functions
- `createRng(seed)` -> { seed, rand, range, int, pick, weighted, fork(label) }; fork depends only on (seed, label). All randomness goes through it.
- `input`: update()/endFrame(); moveX/moveY, run, zoom, zoomSteps, orbitDX/DY, lookX, click {x,y}, zoomFactor, lastDevice, padType,
  held(a), pressed(a), pressAction/releaseAction. Keys: WASD/arrows, Shift run, Space/Enter interact, Backspace back, F echo, Q/E rotate,
  Z/X zoom, R/V tilt, C reset view, Tab caseFile, B board, N map, H hide controls, M music, Esc pause, ` debug. Pad: PAD_BINDINGS. Touch:
  stick left half, tap = click, right-half drag orbits, 2-finger swipe/pinch.
- `createCamera(aspect)` -> { camera, target, yaw, reset, orbit, follow(p, snap), rotate, tilt, zoom(factor), update }; main keeps POST.tilt.center on Juno.
- `buildDistrict(rng)` -> Group; userData { lights, steam, signs, spots, blocks }. Street along X (40); Z across. `createBatch()` collects per
  material (box, light, steam, sign, spot, block). `groundY(z)`, `zoneAt(x,z)`, CAST {id, at, facing, pose, path, speed} in district.js.
- `createCollision(blocks)` -> { grid, hits, move }. `createPlayer(billboard, collision)` -> { position, facing, walkTo(point, reach, onArrive), update }.
- `createCast(scene, sheets, spots)` -> { list, byId, update }; billboard.facing/anim/fpsScale. `getSheets()` -> sprite sheets (humans 40x64 at
  32 px/unit, cat 16x12; shape-built, 4-tone shading, neon rim SPRITES.rim; ?sprites previews).
- `createInteractions(scene)` -> { add({id, position, height, verb, onInteract}), nearest, pick, current, hide, update(...) }: DOM prompt, pixel font.
- `createHud(collision)` -> { dialogue (box UI), show, setLocation, setClock, setObjective({x,z}|null), toast, toggleControls, update(dt, view) }.
  `createClock()` 1 s = 1 game min from 22:40; phase picks time-of-day mood. `frame(el)` = panel frame. Look: createLights/Post/HeightFog/
  Particles/TimeOfDay (lateEvening|night|deadHour). Debug panel: select/slider/button + stats. Tunables are constants atop each file.
- `createCaseFile(hud)` -> { has(id), add(id), hasFlag, setFlag, open({present, onPick, onCancel}), close, toggle, isOpen, update(input) }. Tabs People/Facts/Echoes.
  `createEcho({scene, sheets, post, caseFile, hud, cast, spots})` -> { active, hotspots, tryStart(pos), start(id), exit(), update(dt, input, camYaw, lights, scrubAxis, playerPos) }.
  F near a hotspot (cyan diamond) starts it; F/Backspace/Esc exits. Space tags (in a tag window) else play/pause; stick or A/D scrubs, D-pad steps,
  drag the bar. Red seam tick appears once the playhead has crossed it (stutter + pixel tear 0.2 s). `post.setEcho(0..1)`, `setGlitch(0..1)`.
  `createBoard({caseFile, hud})` -> { isOpen, open/close/toggle, update(input), onLock(conclusion), onWrong(), logic }. B / View / BRD icon. Drag a card onto another
  (or tap/Space two cards; arrows or D-pad move the cursor). Pure rules in `createBoardLogic(data, hasFact)` -> link(a,b) = {kind same|wrong|partial|solved, line, hint}.
  `caseFile.apply(effects)` runs story effects; `caseFile.facts()` lists known facts. `createCaseFile(hud, clock)`.
  `createDialogue({hud, caseFile, clock})` -> { active, start(convId), end, update(dt, input), onChar(char, speakerId) } (voice blips hook, Stage 8).
- Audio: `synth.start()` runs inside the title tap (createTitle(onStart)); before that every call is a no-op. Volumes music/sfx saved in localStorage
  (debug sliders; a real settings menu comes with the pause menu, 9C); M toggles music. `createSfx(synth)` -> { update(dt, {player, yaw, rainScale, signs}),
  step(surface, pos, run), crackle(pos), ui(kind: move|confirm|back|case|linkOk|linkWrong|echoOn|echoOff|glitch), voice(ch, speakerId) }; rain (louder
  patter under awnings), neon hum on the 3 nearest signs, train + doppler every 40-75 s (sound only); setEcho(on) ducks the ambient bus and swells a low rumble. `createMusic(synth)` -> { setMood(street|scene|echo|
  board|silent, fade), addLink(), mood }; main picks echo/board/street. Hooks: dialogue.onChar/onUi, caseFile.onAdd/onUi, board.onLock/onWrong/onUi,
  echo.onUi, tod.onFlicker(i), billboard.onStep(frame). Voices per speaker in sfx TUNING.voices.
## Data formats
- Character: { name, skin, iris, lips?, lashes?, hair:{style,color,shine?}, top, legs, shoes, outfit?:{type,color,collar}, acc:[{type,color}], poses? }.
- Story data (src/game/story.js): SPEAKERS {id: {name, color}}; ENTRIES {id: {kind people|facts|echoes, title, text, source}};
  TALK {npcId: convId} (FALLBACK 'nobody'); CONVERSATIONS {id: {start: nodeId | [{if, node}], nodes: {id: Node}}}.
  Node { speaker, text, next?, choices?: [Choice], effects?, present?: {factId: nodeId}, presentWrong?: nodeId, end? }. A node with `present` gets an
  automatic "Present evidence…" choice. Choice { text, next?, if?, effects?, end? }. Condition { flag?, notFlag?, fact?, notFact? } (all must hold).
  Effects { addFact | addPerson | addEcho: entryId } { setFlag: name } { setTime: [h, m] }, applied on entering a node / picking a choice.
  Question menus: loop back with `next` and hide asked choices with `if: {notFlag}` + a choice `setFlag` (see Mama Teo).
  Interact skips typewriter (40 cps) then advances; W/S/D-pad choose; click/tap works. Present shows only once you hold a fact. Test: Mama Teo (ask about the back door, then talk again and present it).
- Echo (story.js ECHOES/HOTSPOTS): HOTSPOTS [{id, echo, at: [x,z] | {spot, dx, dz}, radius}]. ECHOES[id] { title, owner, entry (ENTRIES echoes id, added on first play),
  duration (s), tracks: [{sprite: sheetId, show?: [t0,t1], keys: [{t, x, z, facing?, anim?: idle|walk}]}] (linear; two keys ~0.01 s apart = a jump),
  voices: [{t0, t1, speaker, text}] captions, seams: [t], tags: [{t, window, fact, label}] }. Test: stall hotspot (cyan diamond), seam 3.5 s.
- Board (story.js BOARD): { wrongLines[], partialLine, hintLine ("{fact}" = fact title), conclusions: [{id, needs: [factId x2-3], result: ENTRIES fact id,
  line (Juno), effects}] }. A pair locks on one link; a trio needs links connecting all three. Every 3rd wrong link touching a conclusion's facts hints a needed
  fact. Result facts (source "Deduction board") show as cyan CONCLUSION cards. Style: holographic grid, cut-corner cards, flowing neon strings (CSS in styles.css). Test: door_unlocked + master_keys + two_voices (a trio) -> someone_had_key.
## Known issues
- Chunk > 500 kB warning. Rail deck hits buildings near x=17. NPCs don't block Juno. Point lights cast no shadows. Mobile shadows may be heavy. iPhone test: npm run dev -- --host (Network URL, Safari landscape).
