# Stage 9 — Demo content and cliffhanger

At the end of this stage the full 15–20 minute demo plays from the train arrival to the cliffhanger. All systems exist by now, so this stage is mostly writing data. Estimated: 3 sessions, one per group of beats.

## Session A — locations and beats 1–3

Also paste the **Story and setting** section and beats 1–3 of the **Demo script** table from [the design doc](../design-doc.md).

```
Neon Ledger, Stage 9A of 9. All systems are built; NOTES.md lists the dialogue, echo and board data formats. Rules: one file per reply, changed functions only, short explanations. Story and beats 1-3 are below.

Build:
1. Interior/area layouts in district.js: Line 9 platform, Sable Noodle House (front counter + back room), the alley behind the Sable, Kit's capsule hostel, Juno's car interior. Area transitions with a short fade and banner update.
2. src/game/story.js: a beat manager (current beat, flags, objective text, minimap objective mark, time of day per beat).
3. Beat 1 cold open: train arrival camera move, title card, Hale comms lines, Juno's "lost another hour" line.
4. Beat 2 street: walk to the Sable, Miso joins and follows, optional vendor and holo-preacher chats.
5. Beat 3 crime scene: 5 examinables (body, burned port, two cups, door terminal with log "1 entry, 0 exits", smashed lamp), each adding a fact.

Update NOTES.md at the end.

[paste NOTES.md, Story and setting, beats 1-3 here]
```

## Session B — beats 4–6

Also paste beats 4–6 of the **Demo script** table.

```
Neon Ledger, Stage 9B of 9. Same rules. NOTES.md and beats 4-6 below.

Write as data using the formats in NOTES.md:
1. Beat 4: Mama Teo's echo (two voices, one seam).
2. Beat 5: Mama Teo interview; alley echo (grey Bureau glove closing the door); Kit interview where she claims she left at 23:00, and her echo shows her outside at 23:40. Presenting that echo to Kit breaks her story.
3. Beat 6: board conclusions "Someone else was in the room", "The killer used an auditor override", "Kit saw them leave". Final pressed line from Kit describes a Bureau coat.
4. Hint lines for each conclusion.

Update NOTES.md at the end.

[paste NOTES.md and beats 4-6 here]
```

## Session C — beat 7, ending and pacing

Also paste the **Beat 7 shot list** from the design doc.

```
Neon Ledger, Stage 9C of 9. Same rules. NOTES.md and the beat 7 shot list below.

Build:
1. Beat 7 cliffhanger exactly as the shot list: Dex's backup echo from his point of view, the figure revealed as Juno, Juno's implant log with a red 47-minute gap (23:10-23:57), all signs flicker off into Dead Hour, music cuts to one low tone, Hale's line, cut to black, end card "Neon Ledger - Case 01 continues."
2. Juno's sprite in the echo must match her current outfit.
3. Pacing tools: a debug timer per beat and a "skip to beat N" menu in the debug panel.
4. Pause menu with Resume, Settings, Restart demo.

Update NOTES.md at the end.

[paste NOTES.md and the beat 7 shot list here]
```

## Done when

- [ ] A full playthrough runs from train to end card with no dead ends
- [ ] Skipping optional chats, it takes about 15 minutes; reading everything, about 20
- [ ] The twist is fair: the glove, the override and Juno's memory-gap line all appear before the reveal
- [ ] Full playthrough works on PC (keyboard, mouse, gamepad) and on iPhone (touch)
- [ ] Final NOTES.md saved, changes committed and pushed

## Keep it cheap

You can write or rewrite dialogue lines yourself straight in the data files, since the format is in NOTES.md. Use Claude for new logic, not for wording changes. Time your own playthrough with the debug beat timer and fix pacing by trimming lines rather than asking for system changes.
