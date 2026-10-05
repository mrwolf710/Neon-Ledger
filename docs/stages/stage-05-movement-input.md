# Stage 5 — Movement, input and iOS tier

At the end of this stage you can walk Juno around the street with keyboard, mouse, gamepad or touch, on your PC and on your iPhone. Estimated: 2 sessions (A = movement, keyboard, mouse, gamepad; B = touch and iPhone).

## Paste into a new chat (session A)

```
Neon Ledger, Stage 5A of 9. three.js HD-2D isometric cyberpunk. Rules: one file per reply, changed functions only, short explanations. NOTES.md below.

Build:
1. src/world/collision.js: walkable area as a grid (0.5 unit cells) generated from district layout; circle-vs-grid collision with sliding along walls.
2. src/game/player.js: Juno moves camera-relative (W = up the screen at any camera rotation), walk 3 u/s, run 6 u/s, smooth acceleration, sets sprite direction and walk animation. Camera follows with slight lag.
3. Finish src/core/input.js:
   - Mouse: click ground = walk there (straight line with collision slide is fine), click a person/object = walk to it then interact, right-drag = rotate 90 deg steps, wheel = zoom.
   - Gamepad (Gamepad API, standard mapping): left stick move (full tilt runs), A interact, B back, X echo, Y case file, LB/RB rotate, right stick Y zoom, View board, Menu pause, D-pad menu navigation. Dead zone 0.2.
   - Track lastDevice (keyboard, mouse, gamepad, touch) so prompts can switch glyphs.
4. src/game/interact.js: objects register as interactables with a radius and verb. Nearest one in front of Juno shows a prompt bubble above it with the right glyph for lastDevice (key cap, Xbox or PlayStation button drawn on canvas).

Update NOTES.md at the end.

[paste NOTES.md here]
```

## Paste into a new chat (session B)

```
Neon Ledger, Stage 5B of 9. Same rules. NOTES.md below.

Build:
1. Touch in src/core/input.js: floating virtual stick on the left half (appears where the thumb lands; push past 70% to run), tap a person/object = walk to it and interact, two-finger horizontal swipe = rotate, pinch = zoom. Echo button bottom right; case file, board, map, pause icons top right. Prevent page scroll, double-tap zoom and the iOS text-selection popup.
2. Landscape lock message in portrait. Respect safe-area insets for all on-screen buttons.
3. Mobile tier tuning: confirm settings.js picks Mobile on iPhone; render pixel ratio 1.5 max; show FPS, draw calls and JS heap (if available) in the debug panel.
4. Add a "Tap to start" title screen (needed later to unlock audio on iOS).

Update NOTES.md at the end.

[paste NOTES.md here]
```

## Testing on your iPhone

1. Stop the dev server, then start it with `npm run dev -- --host`. It prints a Network address like http://192.168.1.50:5173.
2. If Windows asks about the firewall, allow Node.js on private networks.
3. Put the iPhone on the same Wi-Fi and open that address in Safari, in landscape.
4. If the gamepad or other features don't work over that plain http address, ask Claude to add `@vitejs/plugin-basic-ssl` so the dev server runs on https, then accept the certificate warning on the phone.

## Done when

- [ ] Juno walks and runs with WASD, collides with buildings, and slides along walls
- [ ] Click-to-move and click-to-interact work with the mouse
- [ ] An Xbox or PlayStation controller moves Juno and rotates the camera; prompts switch to controller buttons
- [ ] On iPhone: stick, tap-to-interact, swipe-rotate and pinch-zoom all work, with no page scrolling
- [ ] iPhone holds 30 fps or better on the Mobile tier
- [ ] NOTES.md updated, changes committed and pushed

## Keep it cheap

When something breaks on the phone, write down what happened in one sentence ("stick drifts after letting go") rather than recording a video. Fix desktop input fully in session A before touching mobile, so session B stays short.
