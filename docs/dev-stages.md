# Dev stages

The build is split into 9 stages, each sized for one or two short Claude sessions.

- **Using Claude Code (recommended):** follow the GitHub issues in order. Each one has a ready-to-paste Claude Code prompt. See [claude-code.md](claude-code.md).
- **Using the Claude app instead:** start a new chat per session and paste that stage file's prompt plus your NOTES.md. Never paste the whole design doc.

## How to run a stage without burning your limit

1. **One new chat per stage.** Every message in a chat re-sends the whole conversation, so long chats use your limit much faster than short ones.
2. **Paste only what the stage needs:** the stage file, your current NOTES.md, and any design-doc section the stage names. Nothing else.
3. **One file per reply.** Ask for one file at a time. For fixes, ask for only the changed function, not the whole file again.
4. **Report errors small.** Paste the exact console error line and the file name, not the whole file or a screenshot.
5. **Pick the lighter model by default.** Use Sonnet for most stages; switch to Opus only when stuck on a hard bug or shader.
6. **Close every stage the same way.** Ask Claude to update NOTES.md (under 60 lines: files, key functions, known issues, next stage). Save it in the project folder and commit.
7. **If you hit your limit mid-stage,** stop at the last working checkpoint. When it resets, open a new chat with NOTES.md and the stage file and say where you stopped.

## Project file map

Every stage uses this layout, so Claude never has to guess where code goes.

| Folder | Files | Purpose |
| --- | --- | --- |
| / | index.html, package.json, NOTES.md | Page shell, dependencies, running summary |
| src/ | main.js | Starts everything, game loop |
| src/core/ | rng.js, input.js, settings.js | Seeded random, keyboard/mouse/gamepad/touch, quality tiers |
| src/render/ | camera.js, lights.js, post.js | Iso camera, lights, post-processing chain |
| src/gen/ | palette.js, textures.js, buildings.js, props.js, sprites.js, glyphs.js | All procedural asset generators |
| src/world/ | district.js, particles.js, collision.js | Lowmarket layout, rain and motes, walkable areas |
| src/game/ | player.js, npc.js, interact.js, dialogue.js, casefile.js, board.js, echo.js, story.js | Gameplay systems and the case script |
| src/ui/ | hud.js, styles.css | HTML overlays |
| src/audio/ | synth.js, music.js, sfx.js | Web Audio synthesis |
| src/debug/ | panel.js | FPS, draw calls, memory, seed |

## Stage list

| # | Stage | Sessions | You can see at the end |
| --- | --- | --- | --- |
| 1 | [Foundation and grey-box street](stages/stage-01-foundation.md) | 1 | A grey street you can orbit, with a debug panel |
| 2 | [Procedural textures and buildings](stages/stage-02-textures-buildings.md) | 2 | Pixel-textured buildings and signs from a seed |
| 3 | [Lighting, post-processing and rain](stages/stage-03-lighting-rain.md) | 2 | The target look: neon, bloom, tilt-shift, rain |
| 4 | [Pixel character generator](stages/stage-04-characters.md) | 1–2 | Juno, 4 NPCs and Miso as walking sprites |
| 5 | [Movement, input and iOS tier](stages/stage-05-movement-input.md) | 2 | Walk Juno with keyboard, mouse, gamepad or touch, on PC and iPhone |
| 6 | [HUD, dialogue and case file](stages/stage-06-hud-dialogue.md) | 2 | Banner, clock, minimap, conversations, case file |
| 7 | [Echo-scan and deduction board](stages/stage-07-echo-board.md) | 2 | Replays with seams, linking facts into conclusions |
| 8 | [Procedural audio](stages/stage-08-audio.md) | 1 | Rain, footsteps, hum, music |
| 9 | [Demo content and cliffhanger](stages/stage-09-demo-content.md) | 2–3 | The full 15–20 minute demo |

Stage 3 is the go/no-go point. If the street does not look right there, fix the style before starting stage 4.
