# Neon Echoes (repo: Neon-Ledger): full game brief for a chat

Paste or attach this to a Claude chat so it knows the whole game. Written from the repo on 2026-10-19 (NOTES.md, docs/story-bible.md, docs/chapter-2..5.md). Where the docs disagree, NOTES.md is newest.

## What it is
A single-player cyberpunk detective game in an HD-2D isometric look (pixel-art people in a lit, rainy, miniature-looking 3D city). You play **Juno Vale**, a **memory auditor** who solves crimes by replaying "echoes", the sensory memories stored in people's neural implants. Runs in desktop browsers and iOS Safari; keyboard + mouse, gamepad and touch. Built with three.js + Vite in **strict TypeScript**. Seed 1337. Chapter 1 shipped on itch.io.

Pillars: a diorama you want to live in; deduction, not hunting (clues are easy to find, connecting them is the game); short and sharp.

### Hard rules (owner's)
- **No asset files.** Every texture, mesh and sound is generated in code at runtime (canvas, geometry, Web Audio). The one exception is the owner's own pixel-art PNG sprite sheets in `public/sprites/` (Juno, Teo, Kit, Hale, the auditors, vendors, walkers, the cat, the arcade crowd...), loaded by `src/gen/junoart.ts`.
- All randomness goes through `src/core/rng.ts` (seeded). 1 world unit = 16 texture pixels; textures use NearestFilter.
- The Mobile quality tier (iPhone) must keep working: watch draw calls, lights and texture memory.
- Every change is checked for mouse/keyboard, touch and gamepad. Hale is a woman (she/her).
- Dev flow: `npm run typecheck` (zero errors, no `any` without a `// any: reason` comment), `npm run build`, `node scripts/check-*.mjs`. The owner playtests in the browser; issues are logged with F9 (touch "!" or both stick clicks) into `issues.json` (currently 6 logged, 0 open).

## The truth of the story (spoilers)
The **Civic Audit Bureau** runs an off-book program: it lends memory auditors to the highest bidder as **deniable killers**, then **wipes the auditor's memory** of the job. **Juno is the program's best tool; Hale (her boss, a woman) is her handler** and has run her for years. **Juno killed Dex on Hale's order**, then was wiped (the 47-minute gap, 23:10-23:57; the override code and grey glove are hers). Dex's hidden echo shows a grey-coated woman (Juno) reaching for a dying man's implant: an **earlier victim**, not Dex. A **corporate fixer** (corporation is a client of the program) wants the echo to blackmail the Bureau, not expose it; his chapter 2 deal ("the case closes on a burglar") is a lie. His corporation **kept a copy of every wipe**: the real leverage and the source of Juno's restored memories. Kit, Mama Teo and the vendors are bystanders who pay for it.

## Finale (decided)
Restoration is a playable memory montage (echo scenes, each a kill in her own hands, faster and faster: she has been wiped over and over). She goes back to Lowmarket and asks Kit and Teo for help because Hale will come. On the empty Line 9 platform where the game began, Hale steps off a train and tries to shoot her; **Kit's override damper** (he collects rare cyber gear) disables her, Teo beside him. No combat animation. Then **Juno wipes herself anyway**, and the game closes on the opening: a train arrives, "I think I lost an hour on that train."

## Cast
- **Juno Vale**: the player. Grey coat, Bureau badge. Walk, run, sneak, tablet, listening animations (owner's art).
- **Hale**: Juno's director/handler. Kind, concerned, quietly controlling ("rest", "for your protection"). Own sprite sheet; dialogue portrait uses the rear-left frame. Unseen in person until the Bureau; physical again at the finale.
- **Mama Teo**: runs the Sable Noodle House. She and Juno know and like each other; she wishes Juno would get out of auditing. Refuses to leave Lowmarket in chapter 4.
- **Kit Lacroix**: night worker at the capsule hostel ("Worker" until named). Nervous, sells information, spends it on a collection of rare cyber gear (a shelf in the hostel). Holds the override damper.
- **Dex Morrow**: dead echo broker. **The fixer** (Voss in chapter 5 text; corporation open; "Meridian Tower" is a placeholder). **Three auditors** (shared sprite). **The Echo Exchange vendors**: Vesper, Mari, Lux, Tobbo, Gutter, Pim, Oyo, Ruth, Slate, Jinx, Bolt, Petra. **Implant dealer**, a **prisoner** in the Bureau cell (rants that the Bureau is full of assassins for sale; Juno dismisses him), the street vendor, **Miso** the cat, ambient street walkers, the arcade go-between.

## Chapters (as built)
1. **Lowmarket Street / the Sable.** Cold open: Hale's call as Juno steps off the Line 9 train ("a broker's dead, looks like a burnout, sign off"). Examine the murder scene, scan echoes (Mama Teo's back-room echo, the alley echo), interview Teo, work the hostel to Kit, get Kit's alley echo and name. **Deduction board:** 6 clues -> 3 conclusions -> 2 of those -> 1, leaving 2 cards. Ends: Dex's backup echo (chip slotted into Kit's reader) shows Juno in the room; Hale asks where she was 23:10-23:57; Juno takes the train to the Exchange.
2. **The Echo Exchange** (red/orange/yellow market hub, 12 uneven booths with junk, vendors with sprites). 6 vendors hold clues, the rest brush her off. **Gutter's locker clue needs an errand:** Gutter gives her a cracked drone lens, Bolt swaps it for a relay coil, back to Gutter. Deduction ring -> "Dex hid the echo in a locker at the implant dealer's"; the dealer's door unlocks. Inside: Locker 9, Dex's hidden echo (teaser), the **fixer's offer**, then **three auditors take Juno in**.
3. **The Bureau** (dark, mostly empty station lit by monitors, skyline through glass, three columns, Hale's office with one lamp and monitor, cells, memory lab, archive). The auditors **lead** Juno to Hale; Hale tries to close it as burnout while Juno's asides grow suspicious. Only the front door is locked. Clues: archive (31 clean closes), desk roster (Line 9 arrival before every case), Hale's desk (override signed on her account), cell wall ("They take the hours. Don't sign."), clean-up queue (Dex closed early, her initials). **Auditors pace the aisles and block the computers; Juno phones in a fake threat to draw them away**, then reads desk **e-mail screens** (first two filler, the third, which stays dark until the five other clues are found, holds the lab code 4719). A **keypad** opens the **memory lab**; the reader plays a **security-camera video of Juno in the chair with Hale** and shows Hale's login on every wipe plus a voice note ("Standard story"). That sets `bureau_deduced`; the front door opens and Juno slips out. Hale calls as she leaves and threatens Teo and Kit "for their safety". The deduction `runs_through_hale` is optional proof.
4. **Lowmarket at dawn.** The Sable door is blocked until Juno has warned Kit (asks about the damper, asks him to meet in the back room); the street vendor can agree to watch for auditors. Back-room meeting: Teo and Kit refuse to leave. A stranger's phone call leads to the **pachinko arcade** (animated screens, crowd, parlour sound); the go-between points her to the tower. Sneak-past auditor patrols were planned but are not built.
5. **Meridian Tower and Line 9** (built, partly eyeballed): the fixer offers a deal, a 5-echo memory montage, the plea to Kit and Teo in the Sable, the Line 9 showdown (Kit's damper), Juno wipes herself, a LATER card, THE END. The debug panel has a jump-to-scene list.

## Systems
- **Areas** (far apart in X): street, platform, sable, alley, hostel, car (scenery), exchange, dealer, bureau, drive, arcade, tower. `createWorld` handles enter/jump/spot; EXITS are doors; camera cutaway fades walls in front of Juno.
- **Story data** (`src/game/story.ts`): SPEAKERS, ENTRIES (people / facts / echoes, tagged by chapter), TALK, CONVERSATIONS (nodes with choices, `if` conditions, effects, evidence "present"), `conversationFor` (visit counts, flags), ECHOES/HOTSPOTS (tracks, voices, seams, tags), BOARD (conclusions). An in-browser editor (`/editor.html`, dev only) layers dialogue edits via `dialogue-edits.json`.
- **Echoes:** replay a memory as ghost sprites; scrub, tag moments as facts.
- **Case file** (people, facts, echoes) and the **deduction board** (two-slot ring; link two clues to get a conclusion; clues from earlier chapters are hidden and spent clues drop out).
- **Beats** (`src/game/beats.ts`): cold open, objectives (STEPS), chapter scenes, patrols, desk-computer UI (`src/ui/terminal.ts`: mail reader, door keypad).
- **Audio:** all synthesized; per-area moods (street, station, scene, echo, finale, bazaar, dealer, board, bureau).
- **Saves:** one slot in localStorage; quality tiers high / medium / mobile.

## Known issues and to-do
- Owner to-do: auditors' walk sheet `public/sprites/auditors/walk/sheet.png` (rows 1-8 = directions); owner is fixing dialogue and adding sprites.
- Not browser-verified: Hale jail walk, force field, gamepad Y/RT on the board, the chapter 5 showdown, plea and montage (run headless without errors, only partly eyeballed).
- Timeline: Juno steps off the train at 22:40 but the gap is 23:10-23:57 and the override is signed 23:05 (fix idea: start the clock later).
- The dying man in Dex's echo should be an earlier victim, not Dex; align `dex_secret`, the lab video and the montage.
- Undone ch.3 ideas: Hale asks for the echo and badge, Juno hides the fixer, how Hale knows about Teo and Kit, the grey glove's use, a concrete detail from the prisoner.
- Open story questions: the fixer's name and corporation, does Hale fall or die, what happens to Teo and Kit, does the fixer keep the copies.
- Technical: collision slide keeps full speed along walls; bundle over 500 kB; rail deck hits buildings near x=17; NPCs don't block Juno; point lights cast no shadows; mobile shadows may be heavy.

## Where to look in the repo
`NOTES.md` (short index), `docs/story-bible.md`, `docs/chapter-2.md` to `chapter-5.md`, `docs/design-doc.md` (visual direction, gameplay, UI, audio), `docs/notes-archive.md` (per-feature detail), `CLAUDE.md` (rules). Layout: `src/core` `render` `gen` `world` `game` `ui` `audio` `debug`, shared types in `src/types.ts`.
