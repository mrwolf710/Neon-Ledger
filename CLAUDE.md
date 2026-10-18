# Neon Ledger

Cyberpunk detective game, HD-2D isometric look, three.js + Vite, strict TypeScript modules (shared data shapes in `src/types.ts`). Runs in desktop browsers and iOS Safari; keyboard + mouse, gamepad and touch.

## Hard rules

- No asset files. Every texture, sprite, mesh and sound is generated in code at runtime (canvas, geometry, Web Audio). Do not add PNG, GLB, MP3, font atlases or similar.
  - One exception, by the owner's decision: Juno's own pixel-art PNGs in `public/sprites/juno/<state>/<direction>.png` (idle, walk, sneak, tablet, listening, sit; 8 directions; 48x48) plus her run and walk sheets `public/sprites/juno/run/sheet.png` and `walk/sheet.png` (80 px cells, rows 1-8 = one direction each), and Mama Teo's in `public/sprites/teo/<direction>.png` (idle), and the Holo-preacher's in `public/sprites/priest/sheet.png` (3x3 grid, 8 directions), the cat, standing Dex, Kit, the vendor (`vendor`), the Echo Exchange vendors as the owner draws them (`market1` = Tobbo, `market3` = Gutter, `market4` = Slate, `market5` = Ruth, `market6` = Oyo, `market7` = Pim, so far), the implant dealer (`dealer`), the three Bureau auditors (`auditors`), street walkers 1-4 (`public/sprites/walker1..4/sheet.png`), the CRT monitor frame and the alley glove (`public/sprites/cat`, `corpo`, `corpo-stand`, `kit`, `crt`, `glove`), loaded by `src/gen/junoart.js`. Everything else stays generated.
- All randomness goes through `src/core/rng.js` (seeded) so the same seed rebuilds the same city.
- Hale's owner-supplied PNG sheet is also approved: `public/sprites/hale/sheet.png`, copied from `Assets/Hale`, plus her walk sheet `public/sprites/hale/walk/sheet.png` (80 px cells, 6 frames, rows 1-8). Her dialogue portrait uses its north-west (rear-left) frame.
- Pixel rule: 1 world unit = 16 texture pixels; textures use NearestFilter.
- Keep the Mobile quality tier working (iPhone): watch draw calls, light count and texture memory.

## How to work (the owner is on the Claude Pro plan; save tokens)

- Issues: the owner logs problems while playing (F9, the touch "!" icon, or both stick clicks; dev server or `?issues` only) into `issues.json` in the project folder. At the start of every session, read it and tell the owner the open issues (`status: "open"`, newest last) before other work. When you fix one, set its `status` to `"fixed"` and add `"fixedIn": "<commit>"`; never delete entries. Cloud sessions only see issues the owner has committed and pushed.
- Read `NOTES.md` first. It summarizes the code. Only open other files a task actually needs; do not scan the whole repo.
- For stage details, read only the named section of the named file in `docs/stages/`. Ignore "[paste NOTES.md here]" placeholders and "one file per reply" rules there; those are for the Claude web app. Here, edit files directly.
- Keep chat replies short. Do not print file contents back after editing. End with a 3-line summary and what to check in the browser.
- After code changes, run `npm run typecheck` (zero errors, no `any` without a `// any: reason` comment) and `npm run build`, and fix errors. Keep syntax erasable (no enums, namespaces or parameter properties) because scripts/check-*.mjs run the .ts files with Node type stripping. Do not start `npm run dev` yourself; the owner tests in the browser.
- Put tunable numbers (colours, speeds, volumes, sizes) in a constants object at the top of the file so the owner can tweak them without asking.
- At the end of a task: update `NOTES.md` (under 60 lines: files, key functions, data formats, known issues, next step), commit with a clear message that references the issue number, and push.

## Layout

`src/core` rng, input, settings · `src/render` camera, lights, post · `src/gen` palette, textures, buildings, props, sprites, glyphs · `src/world` district, particles, collision · `src/game` player, npc, interact, dialogue, casefile, board, echo, story · `src/ui` hud, styles · `src/audio` synth, music, sfx · `src/debug` panel

Full design: `docs/design-doc.md` (read only the section you need).

# Compact instructions

When compacting, keep: the current issue number and task list, files changed, open errors, and decisions made. Drop file contents and build logs.
