# Stage 6 — HUD, dialogue and case file

At the end of this stage the screen has its full HUD, you can hold branching conversations, and facts you learn land in a case file. Estimated: 2 sessions (A = HUD, B = dialogue and case file).

## Paste into a new chat (session A)

Also paste the **UI and HUD** table from [the design doc](../design-doc.md#ui-and-hud), below the prompt.

```
Neon Ledger, Stage 6A of 9. three.js HD-2D cyberpunk. Rules: one file per reply, changed functions only, short explanations. NOTES.md and the HUD spec table are below.

Style: dark translucent panels, 1 px cyan border, small diamond on each corner, magenta for active items. HTML/CSS over the canvas. Use a condensed display web font for names and a readable font for body text (Google Fonts link in index.html). All sizes in rem so it scales; respect safe-area insets.

Build:
1. src/ui/styles.css: shared panel frame style, nameplate, key-cap and button-glyph styles.
2. src/ui/hud.js: location banner (slides in on area change), clock with phase name and night-progress slider, minimap drawn on a canvas from the collision grid (player arrow, NPC dots, objective mark, north marker), toast queue (3 s), controls panel (H to hide; hidden on touch), all fed by simple setter functions.
3. Game clock in main.js: 1 real second = 1 game minute by default, pausable, with setTime().

Update NOTES.md at the end.

[paste NOTES.md and the HUD table here]
```

## Paste into a new chat (session B)

```
Neon Ledger, Stage 6B of 9. Same rules. NOTES.md below.

Build:
1. src/game/dialogue.js: runs conversations from plain data objects: nodes with speaker, text, optional choices (text + next), optional effects (addFact, setFlag, giveEcho, setTime). Conditions on flags/facts. Typewriter text at 40 chars/s; interact skips to end, then advances. Choice box on the right; works with keyboard, mouse, gamepad D-pad and tap. Emits a per-character event for voice blips later.
2. Dialogue box UI in hud.js: full-width bottom panel, speaker nameplate with a small gem, matching the frame style.
3. "Present" choice: during a conversation the player can open the case file and present a fact; the node lists which fact ids it reacts to.
4. src/game/casefile.js: People / Facts / Echoes tabs, each entry with title, one-line description and where it came from. Opens with Tab / Y / icon. Toast "Case file updated" on new entries.
5. A 4-line test conversation with Mama Teo that adds one fact, to prove it works.

Update NOTES.md at the end. Include the dialogue data format in NOTES.md so Stage 9 can write content without re-reading the code.

[paste NOTES.md here]
```

## Done when

- [ ] Banner, clock, minimap and toast all appear and update
- [ ] Talking to Mama Teo runs the test conversation with a choice
- [ ] The fact appears in the case file and can be presented in dialogue
- [ ] Everything works with keyboard, mouse, gamepad and touch
- [ ] HUD stays clear of the notch and home bar on iPhone
- [ ] NOTES.md updated (including the dialogue data format), changes committed and pushed

## Keep it cheap

Recording the dialogue format in NOTES.md is the big saver here: in Stage 9 you can write scenes without Claude ever reading dialogue.js again.
