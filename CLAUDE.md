# Neon Ledger

Cyberpunk detective game, HD-2D isometric look, three.js + Vite, plain JavaScript modules. Runs in desktop browsers and iOS Safari; keyboard + mouse, gamepad and touch.

## Hard rules

- No asset files. Every texture, sprite, mesh and sound is generated in code at runtime (canvas, geometry, Web Audio). Do not add PNG, GLB, MP3, font atlases or similar.
  - One exception, by the owner's decision: Juno's own pixel-art PNGs in `public/sprites/juno/<state>/<direction>.png` (idle, walk, sneak, tablet; 8 directions; 48x48), and Mama Teo's in `public/sprites/teo/<direction>.png` (idle), and the Holo-preacher's in `public/sprites/priest/sheet.png` (3x3 grid, 8 directions), the cat, standing Dex, Kit and the CRT monitor frame (`public/sprites/cat`, `corpo`, `corpo-stand`, `kit`, `crt`), loaded by `src/gen/junoart.js`. Everything else stays generated.
- All randomness goes through `src/core/rng.js` (seeded) so the same seed rebuilds the same city.
- Pixel rule: 1 world unit = 16 texture pixels; textures use NearestFilter.
- Keep the Mobile quality tier working (iPhone): watch draw calls, light count and texture memory.

## How to work (the owner is on the Claude Pro plan; save tokens)

- Read `NOTES.md` first. It summarizes the code. Only open other files a task actually needs; do not scan the whole repo.
- For stage details, read only the named section of the named file in `docs/stages/`. Ignore "[paste NOTES.md here]" placeholders and "one file per reply" rules there; those are for the Claude web app. Here, edit files directly.
- Keep chat replies short. Do not print file contents back after editing. End with a 3-line summary and what to check in the browser.
- After code changes, run `npm run build` and fix errors. Do not start `npm run dev` yourself; the owner tests in the browser.
- Put tunable numbers (colours, speeds, volumes, sizes) in a constants object at the top of the file so the owner can tweak them without asking.
- At the end of a task: update `NOTES.md` (under 60 lines: files, key functions, data formats, known issues, next step), commit with a clear message that references the issue number, and push.

## Layout

`src/core` rng, input, settings · `src/render` camera, lights, post · `src/gen` palette, textures, buildings, props, sprites, glyphs · `src/world` district, particles, collision · `src/game` player, npc, interact, dialogue, casefile, board, echo, story · `src/ui` hud, styles · `src/audio` synth, music, sfx · `src/debug` panel

Full design: `docs/design-doc.md` (read only the section you need).

# Compact instructions

When compacting, keep: the current issue number and task list, files changed, open errors, and decisions made. Drop file contents and build logs.
