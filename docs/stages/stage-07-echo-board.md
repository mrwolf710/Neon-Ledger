# Stage 7 — Echo-scan and deduction board

At the end of this stage Juno can replay echoes as ghostly scenes, scrub through them, spot edited seams, and link facts on the deduction board to reach conclusions. Estimated: 2 sessions (A = echo-scan, B = board).

## Paste into a new chat (session A)

```
Neon Ledger, Stage 7A of 9. three.js HD-2D cyberpunk. Rules: one file per reply, changed functions only, short explanations. NOTES.md below.

Build src/game/echo.js:
1. Echo data format: id, owner, location, duration (5-10 s), a list of tracks (sprite id, keyframed positions/directions/poses over time), optional seams (times where the echo was edited), and tags (time + fact id the player can tag).
2. Echo mode: F / X / echo button near an echo hotspot. Fade the world to a desaturated cyan grade with scanlines (a post pass uniform), spawn translucent ghost copies of the track sprites, and play them back.
3. Scrub bar UI: play/pause, drag or stick/D-pad to scrub, timestamps. Seams show as red ticks; at a seam the replay stutters and shows a pixel-tear glitch for 0.2 s.
4. Tagging: when the playhead is near a tag, a prompt appears; tagging adds that fact to the case file.
5. One test echo: Mama Teo's view, 6 s, two voices heard, one seam at 3.5 s.

Update NOTES.md at the end, including the echo data format.

[paste NOTES.md here]
```

## Paste into a new chat (session B)

```
Neon Ledger, Stage 7B of 9. Same rules. NOTES.md below.

Build src/game/board.js:
1. Board data: conclusions, each needing a specific pair (or trio) of fact ids, with the conclusion text, Juno's line, and effects (addFact, setFlag, unlock location).
2. Full-screen board UI: fact cards on a grid with a cork texture generated in code. Link by dragging card to card (mouse, touch), or in cursor mode: select a card, select a second card (keyboard, gamepad).
3. Correct link: cyan string locks in, conclusion card appears, ticking sound hook. Wrong link: string snaps back with a short Juno line. After 3 wrong tries on a conclusion, Juno hints one of the needed facts.
4. One test conclusion using two facts from the test conversation and test echo.

Update NOTES.md at the end, including the board data format.

[paste NOTES.md here]
```

## Done when

- [ ] Echo mode desaturates the world and plays the ghost replay
- [ ] Scrubbing works with mouse, touch and gamepad; the seam stutters and glitches
- [ ] Tagging a moment adds a fact to the case file
- [ ] The board accepts the correct link, rejects wrong ones, and hints after 3 misses
- [ ] NOTES.md updated (with the echo and board data formats), changes committed and pushed

## Keep it cheap

Same trick as Stage 6: with the echo and board formats saved in NOTES.md, Stage 9 is mostly writing data, which is far cheaper than writing systems.
