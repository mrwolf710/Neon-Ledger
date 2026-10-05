# Stage 3 — Lighting, post-processing and rain

At the end of this stage the street has the target look: neon light, wet reflective ground, fog, bloom, tilt-shift blur and rain. This is the go/no-go checkpoint for the whole style. Estimated: 2 sessions (A = lights and post chain, B = rain, fog and time of day).

## Paste into a new chat (session A)

```
Neon Ledger, Stage 3A of 9. three.js HD-2D isometric cyberpunk, all procedural. Rules: one file per reply, changed functions only, short explanations. NOTES.md below.

Target look: like Octopath Traveler's HD-2D style (pixel textures in a 3D diorama, strong tilt-shift, bloom), but a rainy neon night.

Build:
1. src/core/settings.js: quality tiers High / Medium / Mobile, auto-picked (Mobile on iOS or touch-only devices). Each tier sets pixel ratio cap, bloom resolution, max lights, rain count, SSR on/off.
2. src/render/lights.js: moonlight DirectionalLight (cool blue, one shadow map), low hemisphere fill, and a light manager that keeps only the N nearest point lights active (N from settings: 24 High, 12 Mobile). Signs and lamps register lights with it.
3. src/render/post.js: EffectComposer chain: RenderPass -> UnrealBloomPass -> custom tilt-shift pass (sharp horizontal band around the player's screen height, blur ramps toward top and bottom; use depth if cheap, screen position otherwise) -> colour grade pass (lift/gamma/gain uniforms) -> grain + slight chromatic fringe -> output.
4. Wet ground: lower roughness on asphalt and add envMap-free fake reflections of signs (stretched emissive quads under each sign, low opacity, flipped). Skip true SSR for now.

Update NOTES.md at the end.

[paste NOTES.md here]
```

## Paste into a new chat (session B)

```
Neon Ledger, Stage 3B of 9. Same rules. NOTES.md below.

Build:
1. src/world/particles.js: instanced rain streaks (count from settings), splash rings on the ground, steam puffs from vents and the noodle stall, slow floating light motes. All InstancedMesh, updated in one loop.
2. Height fog: patch the standard material via onBeforeCompile to add fog that is thicker near the ground and fades with height.
3. Time-of-day states: Late Evening, Night, Dead Hour. Each sets sky/fog colour, moon intensity, grade values and sign brightness. Add setTimeOfDay(name, seconds) that blends between them, and sign flicker (random per sign, stronger in Dead Hour).
4. Debug panel: add dropdowns for time of day and quality tier, and sliders for bloom strength, tilt-shift band and grade lift/gamma/gain.

Update NOTES.md at the end.

[paste NOTES.md here]
```

## Done when

- [ ] Bloom glows around signs and lamps without washing out the whole frame
- [ ] Top and bottom of the screen blur like a miniature; the player band stays sharp
- [ ] Rain falls, splashes on the ground, and the ground shows neon streak reflections
- [ ] All three time-of-day states look distinct; Dead Hour signs flicker off
- [ ] High tier holds about 60 fps on your PC
- [ ] **Go/no-go:** a screenshot feels like the reference shots in a cyberpunk palette
- [ ] NOTES.md updated, changes committed and pushed

## Keep it cheap

This is the one stage where Opus can be worth it, for the tilt-shift and fog shaders. Do the go/no-go check with a single screenshot at the very end, not after every tweak. Adjust colours yourself through the debug panel sliders instead of asking Claude for each change.
