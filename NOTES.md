# NOTES (Neon Echoes)
## Status
- Current stage: 9A (#18) and 9B (#19) implemented; browser/device playthrough pending. Next: 9C (#20), final replay + pacing. Issues #2-#17 closed. Seed 1337
- src/core: rng.js seeded PRNG · input.js action layer · settings.js TIERS high/medium/mobile, ?quality=
- src/render: camera.js · lights.js · fog.js (height fog + cutaway) · post.js · src/world: district.js (street, CAST, ZONES), areas.js (all areas, EXITS), collision.js, particles.js, timeofday.js
- src/gen: palette.js · textures.js · batch.js · buildings.js · glyphs.js · props.js · sprites.js · pixelfont.js
- src/game: npc.js billboards + createCast · world.js · beats.js · player.js · interact.js prompts · clock.js · story.js (ALL story data) · dialogue.js · casefile.js · echo.js · board.js
- src/audio: synth.js (AudioContext, buses, reverb, tone/noise helpers) · sfx.js · music.js (all synthesized; TUNING at the top of each)
- src/ui: menu.js (pause menu: Esc/pad Start/touch pause; sound, video quality + fullscreen, restart, quit; quality saved in localStorage nl.quality) · touch.js · title.js (title.started) · styles.css (panel frame, key caps, rem, safe-area) · hud.js (HUD + dialogue box) · fade.js (black fade, title card)
- src/main.js builds everything + loop · src/debug/panel.js (` toggles; "go to" area select) · scripts/: check-*.mjs (node self-checks), where*.mjs (positions),
  drive.mjs = headless Edge on the BUILT game: `QS="?start=sable&hooks" LOAD_MS=20000 node scripts/drive.mjs "eval:__nl.cam.zoom(0.5)" wait:5000 shot:name` (?start=<area> skips the cold open, ?hooks exposes window.__nl: look(area,x,z) / lookSpot(area,name) / lookCast(id) stand Juno beside anything for a screenshot tour; CHECK EVERY NEW THING THIS WAY before calling it done)
- `createRng(seed)` -> { seed, rand, range, int, pick, weighted, fork(label) }; fork depends only on (seed, label). All randomness goes through it.
- `input`: update()/endFrame(); moveX/moveY, run, zoom, zoomSteps, orbitDX/DY, lookX, click {x,y}, zoomFactor, lastDevice, padType,
  held(a), pressed(a), pressAction/releaseAction. Keys: WASD/arrows, Shift run, G sneak (hold), Space/Enter interact, Backspace back, F echo, Q/E rotate,
  Z/X zoom, R/V tilt, C reset view, Tab caseFile, B board, N map, H hide controls, M music, Esc pause, ` debug. Pad: PAD_BINDINGS. Touch: stick left half, tap = click, right-half drag orbits, 2-finger swipe/pinch.
- `createCamera(aspect)` -> { camera, target, yaw, reset, orbit, follow(p, snap), rotate, tilt, zoom(factor), update }; main keeps POST.tilt.center on Juno.
- Areas (areas.js): street, platform (-150), sable (150), alley (300), hostel (450), car (600): far apart in X, each with group, blocks, bounds, spots, lights, collision, exits.
  AREAS meta: origin, name, outdoor (rain), mood, surface. `createWorld({scene, rng, lights, fog, fade, start, onEnter})` -> { areas, current, busy, enter(id, spawn) (fades),
  jump, routeExit, spot(area, name), placeAt }. onEnter in main swaps collision, cast, interactions, echo, rain, minimap. EXITS = doors [{id, area, at, to, spawn[x,z,facing], verb}].
  `createBatch()` collects per material (box, light, steam, sign, spot, block). `groundY(z, x)`, CAST {id, area, at (xz | spot name), facing, pose, ghost} in district.js.
- `createCollision(blocks, bounds, {road})` -> { grid, bounds, hits, move }. `createPlayer(billboard, collision)` -> { position, facing, walkTo(point, reach, onArrive), update }.
- `createCast(scene, sheets, areas)` -> { list, byId, update, setArea, setHidden, apply }; billboard.facing/anim/fpsScale/follow/away. `getSheets()` -> sheets (Juno is the owner's PNG art (public/sprites/juno, 8 dirs, gen/junoart.js; Mama Teo too: public/sprites/teo, idle only; Holo-preacher: public/sprites/priest/sheet.png, 3x3 grid = 8 dirs, loadPriestSheet; the generated Juno is only a fallback); player.setPose("tablet") or 7 s idle; humans 40x64 at 32 px/unit, cat 16x12; shape-built, 4-tone shading, neon rim SPRITES.rim; ?sprites previews).
- Dialogue portrait: ids in `PORTRAIT.holo` (hud.js) get a cyan wash, scanlines and flicker. Dead corpo (seated, 8 dirs, 48x48): public/sprites/corpo/<dir>.png, from Pixellab; Dex (sable back room): loadDexSheet, one still frame. Animated idles (junoart loadLoopSheet; south = 8-frame loop, other dirs a still): Miso = public/sprites/cat (sheets.miso, no walk anim, he slides), standing Dex = public/sprites/corpo-stand (sheets.dexStanding, used by his echo); Kit and the vendor = owner sheets (public/sprites/kit, /vendor; loadKitSheet(A), cell px, footPx offset). Every cast member now uses owner art. Cold open plays inside the owner CRT PNG (public/sprites/crt/frame.png, ui/crtframe.js: canvas CSS-scaled into the glass, zooms out with post.setCrt) with a VHS look (post.setVhs). HUD help is collapsed to "H Help"; H opens the list.
- `createInteractions(scene)` -> { add({id, position, height, verb, onInteract}), nearest, pick, current, hide, update(...) }: DOM prompt, pixel font.
- `createHud(collision)` -> { dialogue (box UI; speaker portrait cropped from the sheet by drawPortrait), show, setCollision, setLocation, setClock, setObjectiveText, setObjective({x,z}|null), toast, toggleControls, update(dt, view) }.
  `createClock()` 1 s = 1 game min from 00:35 (next day after the 23:10–23:57 gap); phase picks the time-of-day mood. `frame(el)` = panel frame. Debug panel: select/slider/button + stats. Tunables are constants atop each file.
- `createCaseFile(hud, clock)` -> { apply(effects), facts(), has(id), add(id), hasFlag, setFlag, open({present, onPick, onCancel}), close, toggle, isOpen, update(input) }. Tabs People/Facts/Echoes.
  `createEcho({scene, sheets, post, caseFile, hud, cast, areas})` -> { active, hotspots, tryStart(pos), start(id), exit(), update(dt, input, camYaw, lights, scrubAxis, playerPos) }.
  F near a hotspot (cyan diamond) starts it; F/Backspace/Esc exits. Space tags (in a tag window) else play/pause; stick or A/D scrubs, D-pad steps,
  drag the bar. Red seam tick appears once the playhead has crossed it (stutter + pixel tear 0.2 s). `post.setEcho(0..1)`, `setGlitch(0..1)`.
  `createBoard({caseFile, hud})` -> { isOpen, open/close/toggle, update(input), onLock(conclusion), onWrong(), logic }. B / View / BRD icon. Drag a card onto another
  (or tap/Space two cards; arrows or D-pad move the cursor). Pure rules in `createBoardLogic(data, hasFact)` -> link(a,b) = {kind same|wrong|partial|solved, line, hint}.
  `createDialogue({hud, caseFile, clock})` -> { active, start(convId), end, update(dt, input), onChar(char, speakerId) } (voice blips hook, Stage 8).
- Audio: `synth.start()` runs inside the title tap (createTitle(onStart)); before that every call is a no-op. Volumes music/sfx saved in localStorage
  (debug sliders and the pause menu); M toggles music. `createSfx(synth)` -> { update(dt, {player, yaw, rainScale, signs}),
  step(surface, pos, run), crackle(pos), ui(kind: move|confirm|back|case|linkOk|linkWrong|echoOn|echoOff|glitch), voice(ch, speakerId) }; rain (louder
  patter under awnings), neon hum on the 3 nearest signs, train + doppler every 40-75 s (sound only); setEcho(on) ducks the ambient bus and swells a low rumble. `createMusic(synth)` -> { setMood(street|scene|echo|
  board|silent, fade), addLink(), mood }; main picks echo/board/street. Hooks: dialogue.onChar/onUi, caseFile.onAdd/onUi, board.onLock/onWrong/onUi,
  echo.onUi, tod.onFlicker(i), billboard.onStep(frame). Voices per speaker in sfx TUNING.voices.
- Neon Editor (dev only): run npm run dev, open /editor.html; Each conversation has a "plays when Juno talks to X, on visit N, only if she knows fact F / has talked to Y" row (story.js RULES, conversationFor; beats counts visits); Scenes tab = per-scene lighting (world/scenes.js keys, saved to world/scene-edits.json, applied by timeofday.setScene); "+ Add line after this" inserts boxes (_insert in the edits file). Lists every CONVERSATIONS entry (new ones in story.js appear by themselves); edits text, speaker, choice labels; "+ New conversation" = pick who Juno talks to + lines. Saves via vite.config.js to src/game/dialogue-edits.json, which story.js lays over its data (_new = your conversations; active ones replace TALK[person]).
- Save game: pause menu Save/Load (one slot, localStorage nl.save, main.js saveGame/loadGame: area, position, clock, caseFile.dump(), board logic, beats.visits, Miso, sunsetT); title offers "press C to continue" when a save exists.
- Character: { name, skin, iris, lips?, lashes?, hair:{style,color,shine?}, top, legs, shoes, outfit?:{type,color,collar}, acc:[{type,color}], poses? }.
- Beats (beats.js): cold open (dark platform, train, lamps fade up, title card, Hale), STEPS = objective list (text, area, pos, done), registers doors / EXAMINABLES
  / NPCs as interactables. Miso follows after being petted (flag miso_joined). dialogue.start(id) returns a promise. Flags: visited_<area>, ex_<id>, seen_backroom.
- Story data (src/game/story.js): SPEAKERS {id: {name, color}}; ENTRIES {id: {kind people|facts|echoes, title, text, source}};
  TALK {npcId: convId} (FALLBACK 'nobody'); CONVERSATIONS {id: {start: nodeId | [{if, node}], nodes: {id: Node}}}.
  Node { speaker, text, next?, choices?: [Choice], effects?, present?: {factId: nodeId}, presentWrong?: nodeId, end? }. A node with `present` gets an
  automatic "Present evidence…" choice. Choice { text, next?, if?, effects?, end? }. Condition { flag?, notFlag?, fact?, notFact? } (all must hold).
  Effects { addFact | addPerson | addEcho: entryId } { setFlag: name } { setTime: [h, m] }, applied on entering a node / picking a choice.
  Question menus: loop back with `next` and hide asked choices with `if: {notFlag}` + a choice `setFlag` (see Mama Teo). Interact skips typewriter (40 cps) then advances; W/S/D-pad choose; click/tap works. Present shows only once you hold a fact. Test: Mama Teo (ask about the back door, then talk again and present it).
- Echo (story.js ECHOES/HOTSPOTS): HOTSPOTS [{id, echo, at: [x,z] | {spot, dx, dz}, radius}]. ECHOES[id] { title, owner, entry (ENTRIES echoes id, added on first play),
  duration (s), tracks: [{sprite: sheetId, show?: [t0,t1], keys: [{t, x, z, facing?, anim?: idle|walk}]}] (linear; two keys ~0.01 s apart = a jump),
  voices: [{t0, t1, speaker, text}] captions, seams: [t], tags: [{t, window, fact, label}] }. Test: Sable back-room hotspot, seam 3.5 s.
- Board (story.js BOARD): { wrongLines[], partialLine, hintLine ("{fact}" = fact title), conclusions: [{id, needs: [factId x2-3], result: ENTRIES fact id,
  line (Juno), effects}] }. A pair locks on one link; a trio needs links connecting all three. Every 3rd wrong link touching a conclusion's facts hints a needed
  fact. Result facts (source "Deduction board") show as cyan CONCLUSION cards. Style: holographic grid, cut-corner cards, flowing neon strings (CSS in styles.css). Test: door_unlocked + master_keys + two_voices (a trio) -> someone_had_key.
## Known issues
- 9B: terminal hardware journal at 23:18; Kit’s maintenance cover/23:00 claim + alley echo at 23:40; present kit_at_2340 for bureau_coat; recover isolated backup at hostel backup spot. Board: two_cups+two_voices -> someone_else; +door_unlocked+override_trace -> auditor_override; +grey_glove+bureau_coat -> bureau_involved. Anonymous echoes use unknownEcho. Old city-key rule retained for saves. 9C ending and live-clock/lighting pacing remain unimplemented.
- Chunk > 500 kB warning. Rail deck hits buildings near x=17. NPCs don't block Juno. Point lights cast no shadows. Mobile shadows may be heavy. iPhone test: npm run dev -- --host (Network URL, Safari landscape).
