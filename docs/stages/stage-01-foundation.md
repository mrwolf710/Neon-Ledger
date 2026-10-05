# Stage 1 — Foundation and grey-box street

At the end of this stage you have a grey-box Lowmarket street in the browser that you can rotate and zoom, with a debug panel. Estimated: 1 session.

## One-time setup on your PC

1. Install **Node.js LTS** from nodejs.org (accept the defaults).
2. Install **Git for Windows** from git-scm.com (accept the defaults).
3. Install **VS Code** from code.visualstudio.com if you don't have it.
4. Open PowerShell in the folder where you keep projects and run these one at a time:

```
git clone https://github.com/mrwolf710/Neon-Ledger.git
cd Neon-Ledger
npm create vite@latest . -- --template vanilla
npm install
npm install three
npm run dev
```

   When Vite says the folder is not empty, choose **Ignore files and continue**. It must not delete the `docs` folder or `NOTES.md`.

5. Open the address it prints (usually http://localhost:5173). You should see the Vite starter page.
6. Open the neon-ledger folder in VS Code. Delete the starter files `counter.js`, `javascript.svg` and the contents of `style.css`.

## Paste into a new chat

```
I'm building Neon Ledger, a cyberpunk detective game in three.js with an HD-2D isometric look. Everything is generated in code at runtime: no image, model or audio files. Project is Vite vanilla JS with three installed. This is Stage 1 of 9.

Rules for your replies: one file per reply. Full file only when it's new; for changes, show only the changed function. Keep explanations to 2 lines unless I ask.

File layout: src/main.js, src/core/, src/render/, src/gen/, src/world/, src/game/, src/ui/, src/audio/, src/debug/.

Build, in this order (wait for my "next" between files):
1. src/core/rng.js: seeded PRNG (mulberry32) with rand(), range(a,b), int(a,b), pick(arr), fork(label) for sub-seeds.
2. src/render/camera.js: PerspectiveCamera, fov 20, pitch 35 deg, yaw 45 deg, orbiting a target. rotate(+1/-1) snaps 90 deg with 300 ms easing. zoom(delta) between min and max distance.
3. src/core/input.js: one action layer (moveX, moveY, run, interact, echo, rotateL, rotateR, zoom, caseFile, board, map, pause, debug). Keyboard now: WASD, Shift, Space, F, Q/E, Z/X, Tab, B, N, Esc, ~. Leave clearly marked stubs for mouse, gamepad and touch.
4. src/world/district.js: grey-box street 40 x 16 units with sidewalks, 10 box buildings with heights from rng, an elevated rail across one end. Plain grey MeshStandardMaterial.
5. src/debug/panel.js: toggled with ~, shows FPS, draw calls, triangles, seed.
6. src/main.js and index.html: full-window canvas, resize handling, pixel ratio capped at 2, game loop.

When done, write NOTES.md (under 60 lines): files, key functions, how to run, next stage.
```

## Done when

- [ ] `npm run dev` shows the grey street with no console errors
- [ ] Q and E rotate the camera in smooth 90° steps; Z/X and the mouse wheel zoom
- [ ] ~ toggles the debug panel and FPS reads about 60
- [ ] Changing the seed in rng.js changes the building heights
- [ ] NOTES.md is saved in the project folder
- [ ] Changes committed and pushed (see "Saving to GitHub" in the README)

## Keep it cheap

This stage is mostly boilerplate, so Sonnet is plenty. The "wait for next" line stops Claude from dumping all six files in one long reply you might need to redo.
