# Stage 4 — Pixel character generator

At the end of this stage Juno, four NPCs and Miso the cat stand in the street as pixel sprites that walk in four directions and pick up the colour of nearby neon. Estimated: 1–2 sessions.

## Paste into a new chat

```
Neon Ledger, Stage 4 of 9. three.js HD-2D isometric cyberpunk, all procedural. Rules: one file per reply, changed functions only, short explanations. NOTES.md below.

Build:
1. src/gen/sprites.js: layered pixel character generator drawn on canvas. Layers: body base, skin tone, outfit, coat, hair, accessory, palette from palette.js. Sprites 24 px wide x 32 px tall, 1 px dark outline, 2-3 shade levels per colour. Output one sprite sheet per character: 4 directions (down, up, left, right; right = mirrored left) x idle (2 frames) + walk (4 frames). NearestFilter.
2. Define these characters as data (not code branches):
   - Juno Vale: long grey coat, short dark hair, collar up, small glowing implant dot at temple.
   - Mama Teo: older, apron over red tunic, hair bun, sleeves rolled.
   - Kit Lacroix: courier, bright yellow jacket, cropped hair, bag strap.
   - Dex Morrow: suit jacket, slicked hair; also a seated slumped pose (single frame).
   - Street vendor: hooded poncho, visor.
   - Miso: small orange stray cat, 16 x 12 px, idle sit + 4-frame trot.
3. src/game/npc.js: Billboard class using a camera-facing plane (rotates on the Y axis only, so sprites don't tilt), picks the right direction row relative to the camera angle, plays frames by time, and has a soft round contact shadow decal under it.
4. Sprite material: a small shader that adds a rim tint from the nearest registered light colour, so sprites look lit by the neon.
5. Place Juno and the NPCs in the street from district.js.

Update NOTES.md at the end.

[paste NOTES.md here]
```

## Done when

- [ ] All six characters appear and are clearly different at normal zoom
- [ ] Sprites stay upright and readable from all four camera rotations
- [ ] Walk cycles animate smoothly (test by making an NPC walk a loop)
- [ ] Sprites near a magenta sign get a magenta edge tint
- [ ] NOTES.md updated, changes committed and pushed

## Keep it cheap

Characters are data, so tweaking a look means changing a few values yourself in the character list instead of asking Claude. Only ask Claude when a new layer type is needed.
