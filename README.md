# Neon Ledger

A cyberpunk detective game in an HD-2D isometric style, built in three.js. Every texture, character, mesh and sound is generated in code at runtime: the game ships no image, model or audio files.

You play Juno Vale, a memory auditor who solves crimes by replaying the "echoes" stored in people's neural implants. The first goal is a 15–20 minute playable demo that ends on a cliffhanger.

**Platforms:** desktop browsers (Chrome, Edge, Firefox) and iOS Safari. **Input:** keyboard and mouse, gamepad, or touch.

## Docs

| File | What's in it |
| --- | --- |
| [docs/claude-code.md](docs/claude-code.md) | **Start here.** Install Claude Code, work through issues, and save usage on the Pro plan |
| [CLAUDE.md](CLAUDE.md) | Standing rules Claude Code reads automatically every session |
| [docs/design-doc.md](docs/design-doc.md) | Full game design: visuals, tech approach, gameplay, story, demo script, UI, audio |
| [docs/dev-stages.md](docs/dev-stages.md) | The 9-stage build plan and how to run each stage cheaply with Claude |
| [docs/stages/](docs/stages/) | One file per stage, each with a paste-ready prompt and a done-when checklist |
| [NOTES.md](NOTES.md) | Running summary of the code, updated at the end of every stage |

## Status

| Stage | Status |
| --- | --- |
| 1. Foundation and grey-box street | Not started |
| 2. Procedural textures and buildings | Not started |
| 3. Lighting, post-processing and rain | Not started |
| 4. Pixel character generator | Not started |
| 5. Movement, input and iOS tier | Not started |
| 6. HUD, dialogue and case file | Not started |
| 7. Echo-scan and deduction board | Not started |
| 8. Procedural audio | Not started |
| 9. Demo content and cliffhanger | Not started |

## Running it (from Stage 1 on)

```
npm install
npm run dev
```

Then open http://localhost:5173. To test on an iPhone on the same Wi-Fi, run `npm run dev -- --host` and open the Network address it prints.

## Saving to GitHub

At the end of each stage (or any time the game is in a working state), run these in PowerShell from the project folder:

```
git add .
git commit -m "Stage 1: foundation and grey-box street"
git push
```

Change the message to describe what you did. If something breaks later, every commit is a safe point you can go back to.
