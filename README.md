# Neon Echoes

Neon Echoes is a cyberpunk detective game with an HD-2D isometric look, built with three.js, Vite and plain JavaScript. **Neon Ledger** is the repository/project name.

Play Juno Vale, a memory auditor investigating an echo broker’s death in Lowmarket. Examine evidence, replay implant memories, question witnesses and connect facts on the deduction board. The target is a 15–20 minute demo with a cliffhanger; the full ending and pacing pass are still in development.

Desktop browsers and iOS Safari are targets, with keyboard/mouse, gamepad and touch input. Device playthrough validation remains outstanding.

## Status

| Stage | Status |
| --- | --- |
| 1. Foundation and grey-box street | Complete |
| 2. Procedural textures and buildings | Complete |
| 3. Lighting, post-processing and rain | Complete |
| 4. Character generation | Complete; selected characters now use PNG art |
| 5. Movement, input and mobile tier | Complete; device validation ongoing |
| 6. HUD, dialogue and case file | Complete |
| 7. Echo-scan and deduction board | Complete |
| 8. Procedural audio | Complete |
| 9A. Locations and beats 1–3 | Implemented; browser playthrough pending |
| 9B. Echoes, interviews and deductions | Implemented in this change; playthrough validation pending |
| 9C. Final backup replay, cliffhanger and pacing | Planned; not implemented |

## Art and audio

The game uses a hybrid approach: procedural buildings, geometry, surface textures, lighting, effects and synthesized Web Audio, alongside selected PNG sprites and props. Juno, Mama Teo, Kit, the vendor, Dex, Miso, the holo-preacher, CRT frame and alley glove use curated PNG art. Procedural character generation provides fallbacks; unidentified echo visitors use a dedicated anonymous silhouette. See [CLAUDE.md](CLAUDE.md) for the approved asset exceptions.

## Run and build

Use Node.js compatible with Vite 8 (Node 22.12+ or a supported newer release).

```powershell
npm ci
npm run dev
```

Open the local URL Vite prints. For an iPhone on the same Wi-Fi, use `npm run dev -- --host` and open the Network URL in Safari. Build with `npm run build`. The development dialogue/scene editor is at `/editor.html`; dialogue edits are saved in `src/game/dialogue-edits.json` and override the base story text.

## Documentation

- [Design doc](docs/design-doc.md): setting, systems, visuals and intended demo.
- [Story review](docs/story-review.md): narrative findings and Stage 9B/9C decisions (contains spoilers).
- [Stage 9 plan](docs/stages/stage-09-demo-content.md): content sessions and completion checks.
- [Build stages](docs/dev-stages.md) and [stage files](docs/stages/): historical implementation plan.
- [NOTES.md](NOTES.md): current implementation summary and next steps.
- [CLAUDE.md](CLAUDE.md): repository working rules.
