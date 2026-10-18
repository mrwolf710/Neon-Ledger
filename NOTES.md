# NOTES (Neon Ledger)
Short index. Full per-feature detail (the old long NOTES) is in `docs/notes-archive.md`; read the section you need there. Story plans: `docs/story-bible.md`, `docs/chapter-2..5.md`. Seed 1337.

## Status
- Chapters 1-4 built (ch.1 shipped on itch.io, zip via `npm run itch`, then `npm run build`). Ch.4 ends on the arcade stranger and a "COMING SOON" card. Ch.5 is plan only: `docs/chapter-5.md` (arcade rework, Meridian Tower, memory montage, Lowmarket plea, Line 9 showdown, self-wipe, closing loop).
- Next step: owner answers the ch.5 open questions (fixer name/corporation, Hale's fate, Teo and Kit's fate, echo handed over or not), then rework the arcade and build the tower. `refused_deal` (ch.2) is stored but unused.
- Open issues: none (issues.json).
- OWNER TODO: auditors' walk sheet `public/sprites/auditors/walk/sheet.png` (68 px cells, rows 1-8 = directions; optional, they slide in idle until then).
- Not browser-verified: Hale jail walk, force field, gamepad Y/RT on the board.

## Layout (src/, all strict .ts; shared shapes in src/types.ts)
- core: rng (seeded; all randomness), input (action layer), settings (tiers high/medium/mobile)
- render: camera, lights, fog (cutaway), post · gen: palette, textures, batch, buildings, props, sprites, junoart (owner PNGs), glyphs, pixelfont
- world: district (street, CAST), areas (all areas, EXITS, constants per area), collision, particles, timeofday, railtrain
- game: npc, world, beats (scenes, STEPS, doors), player, interact, clock, story (ALL story data), dialogue, casefile, echo, board, barks
- ui: menu, touch, title, hud, fade, issues, terminal, trailer · audio: synth, music, sfx · debug: panel, flow-editor
- main.ts builds everything + loop. Tunables sit in constants at the top of each file.

## Key APIs and data (details in archive)
- `createRng(seed)`; `input` (held/pressed, keys: WASD, Shift run, G sneak, Space/Enter interact, F echo, Tab case file, B board, Esc pause, ` debug).
- Areas: street, platform, sable, alley, hostel, car, exchange, dealer, bureau, drive, arcade; far apart in X. `createWorld` -> enter/jump/spot; EXITS = doors.
- Story: SPEAKERS, ENTRIES (people|facts|echoes, `ch`/`ch2` tags), TALK, CONVERSATIONS (nodes, choices, `if`, `effects`, `present`), RULES/conversationFor (visit counts, flags). Editor edits layer on top via dialogue-edits.json.
- Echo: ECHOES/HOTSPOTS (tracks, voices, seams, tags). Board: BOARD conclusions (needs 2-3 facts, result, line, effects); pure rules in `createBoardLogic`.
- Beats: cold open, STEPS objectives, chapter scenes (cliffhanger, dealerScene, outsideScene, bureauArrival, labVideo, bureauSlip, sableMeeting, arcadeScene), patrols (auditors).
- Save: one slot in localStorage `nl.save`; quality in `nl.quality`. Issue box: F9 / touch "!" / both stick clicks, dev server or `?issues`.

## Chapters in one line each
- Ch.1 Sable murder, Kit named via hostel chain, Dex backup echo (chip slotted into Kit's reader, hostel spot `reader`; the car is street scenery only, its door removed), Hale's call, then Juno takes the Line 9 train to the Exchange (train sound, no drive scene). Ch.2 Echo Exchange (12 vendors, 6 clues, ring -> `dealer_open`), dealer shop, fixer offer, auditors. Ch.3 Bureau: Hale scene, 6 clues, lab reader + video is the climax (`bureau_deduced`), slip out. Ch.4 dawn Lowmarket: Kit/vendor, Sable back-room meeting, call, arcade.
- Hale is female (she/her). Kit is "Worker" until `kit_named`.

## Testing
- `npm run typecheck`, `npm run build`, `scripts/check-*.mjs`. Headless look: `QS="?start=<area>&hooks" node scripts/drive.mjs "eval:..." wait:5000 shot:name` (`window.__nl` hooks). Do not start `npm run dev` yourself.
- Known issues: collision slide keeps full speed along walls; chunk > 500 kB warning; rail deck hits buildings near x=17; NPCs don't block Juno; point lights cast no shadows; mobile shadows may be heavy.
