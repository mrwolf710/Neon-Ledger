# Stage 2 — Procedural textures and buildings

At the end of this stage the grey boxes are pixel-textured tenements with windows, AC units, balconies and glowing signs, all built from the seed. Estimated: 2 sessions (session A = textures, session B = buildings and signs).

## Paste into a new chat (session A)

```
Neon Ledger, Stage 2A of 9. three.js, HD-2D isometric cyberpunk, everything procedural, no asset files. My NOTES.md is below.

Rules: one file per reply; changed functions only for edits; explanations 2 lines max.

Pixel rule: 1 world unit = 16 texture pixels. Textures use NearestFilter, no mipmaps blur.

Build:
1. src/gen/palette.js: a 32-colour cyberpunk palette (deep indigo/teal shadows, concrete greys, rust, sodium orange, neon magenta, cyan, warm amber) plus a helper that snaps any colour to the nearest palette entry.
2. src/gen/textures.js: Canvas 2D generators, each takes (rng, widthUnits, heightUnits): brick, concrete, tiles, metalPanel, wetAsphalt, sidewalk. Use value noise plus ordered dithering, then palette snap. Also return a roughness map (asphalt darker = wetter = lower roughness). Cache by key.
3. Apply them to the grey-box street and buildings from Stage 1.

Update NOTES.md at the end.

[paste NOTES.md here]
```

## Paste into a new chat (session B)

```
Neon Ledger, Stage 2B of 9. Same rules as before: one file per reply, changed functions only, short explanations. NOTES.md below.

Build:
1. src/gen/glyphs.js: draw pseudo-kanji sign glyphs from stroke rules (3-7 strokes from a small set of horizontal, vertical, hook and box strokes) onto a canvas. Return a texture for a vertical or horizontal sign of N glyphs.
2. src/gen/buildings.js: building(rng, footprint) builds floors, then facade modules per floor: window (lit or dark), shutter, AC unit box, balcony with rail, pipe, cable bundle. Ground floor gets a shopfront with an awning. Add 1-2 signs per building using glyphs.js with an emissive material.
3. Merge each building's static meshes into as few draw calls as possible (BufferGeometryUtils.mergeGeometries, grouped by material).
4. src/gen/props.js: noodle stall, crates, vending machine, trash bags, lamp post. Simple primitives plus textures.
5. Replace the grey boxes in district.js with generated buildings and scatter props on the sidewalks.

Target: whole street under 200 draw calls (check the debug panel). Update NOTES.md at the end.

[paste NOTES.md here]
```

## Done when

- [ ] Walls, ground and sidewalks show crisp pixel textures that stay sharp when you zoom in
- [ ] Each building is different, and the same seed always rebuilds the same street
- [ ] Signs show readable-looking invented glyphs
- [ ] Debug panel shows under 200 draw calls for the street
- [ ] NOTES.md updated, changes committed and pushed

## Keep it cheap

If a texture looks wrong, describe it in one line ("brick looks like static") instead of sending screenshots; images use a lot of your limit. Ask for only the one generator function to be rewritten.
