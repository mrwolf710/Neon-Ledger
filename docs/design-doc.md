# Neon Ledger — Game Design Doc

Oct 4, 2026 · Heath Fowler

## Overview

Neon Ledger is a single-player cyberpunk detective game in an HD-2D isometric style, built in three.js with every texture, sprite, mesh and sound generated in code at runtime. The first deliverable is a 15–20 minute playable demo: one district, one murder, and a twist ending that sets up the full game.

**Pitch:** You are Juno Vale, a memory auditor who solves crimes by replaying the sensory "echoes" stored in people's neural implants. A data broker dies in the back room of a noodle bar. The official cause is implant burnout. The echoes say otherwise, and the last one points at you.

**Pillars**

- **A diorama you want to live in.** Pixel-art people in a lit, rainy, miniature-looking 3D city. Every street corner should be screenshot-worthy.
- **Deduction, not hunting.** Clues are easy to find. The challenge is connecting them on the deduction board and catching contradictions.
- **Everything is code.** No image, model or audio files ship with the game. The whole world is generated at load from seeds and rules.
- **Short and sharp.** The demo respects the player's time and ends on a hook strong enough to want the next chapter.

| Item | Decision |
| --- | --- |
| Genre | Narrative investigation / adventure |
| Camera | Isometric-style 3/4 view, rotatable in 90° steps |
| Platform | Browser on desktop (Chrome, Edge, Firefox) and iOS Safari (iPhone and iPad); keyboard + mouse, gamepad, or touch |
| Engine | three.js (WebGL2), plain JavaScript modules |
| Demo length | 15–20 minutes, one sitting |
| Demo ending | Cliffhanger reveal, then "To be continued" card |

## Visual direction

Keep the reference shots' recipe and swap the palette: chunky pixel sprites standing in a real 3D world, a miniature tilt-shift look, warm practical lights, and heavy bloom. The cottages and flower boxes become stacked tenements, noodle stalls, cable bundles and neon kanji-style signs, all soaked in rain.

**What we keep from the reference**

- 2D pixel characters as camera-facing billboards with soft round contact shadows.
- 3D buildings whose surfaces use low-resolution pixel textures with nearest-neighbour filtering, so walls read as pixel art from any angle.
- Strong tilt-shift blur at the top and bottom of the frame, sharp band through the player.
- Bloom on every light source, floating light motes, and a warm/cool lighting contrast.
- Ornate framed UI panels with a small diamond on each corner.

**What changes for cyberpunk**

- **Palette:** deep indigo and teal shadows; magenta, cyan and sodium-orange light. Warm interiors stay amber so they still feel inviting.
- **Weather:** rain is the default state. Wet ground reflects neon as long streaks; puddles ripple.
- **Atmosphere:** low height fog that catches sign light, steam from vents and noodle pots, drifting holo-ads.
- **Density:** taller verticality than the village. Walkways, fire escapes and an elevated train line give layers above the street.

**Time of day:** the demo runs at night, roughly 22:40 to 02:10 in-game. Three lighting states carry it: Late Evening (purple sky edge, signs warming up), Night (full neon), and Dead Hour (signs flicker off, cold blue, for the ending).

**Pixel scale rule:** 1 world unit = 16 texture pixels. Characters are 24–32 px tall sprites. Every procedural texture follows this rule so pixel density matches across walls, floors and people.

## Technical approach

The game ships as JavaScript only. At load, a seeded generator builds every texture, sprite sheet, mesh and sound into memory, then the renderer draws the scene through a short post-processing chain. Load time target: under 4 seconds on a mid-range PC.

**Rules for "no pre-rendered assets"**

- No PNG, GLB, MP3 or font-atlas files. Allowed: three.js and its official add-ons (post-processing passes), plus our own code.
- All randomness comes from a seeded PRNG (for example mulberry32), so the same seed always builds the same city. Seed is shown in the debug panel.
- Generated assets are cached in memory for the session; nothing is written to disk.

**Generators**

| System | How it is generated |
| --- | --- |
| Surface textures | Canvas 2D at 16 px per unit: brick, concrete, tile, metal panel, wet asphalt. Built from noise, dithering and a 32-colour palette. Uploaded with NearestFilter. |
| Normal and roughness maps | Derived from the same canvases (height from luminance), so rain wetness can lower roughness on the ground. |
| Buildings | Grammar-based: footprint → floors → facade modules (windows, AC units, balconies, shutters, signs). Merged per block to cut draw calls. |
| Signs | Pseudo-glyphs drawn from stroke rules on canvas, plus a small invented script for street names. Emissive material, flicker by shader time. |
| Characters | Layered pixel sprites: body base, outfit, coat, hair, accessory, palette swap. 4 directions × idle and 4-frame walk, drawn into one sprite sheet per character. |
| Props | Low-poly primitives (box, cylinder, extruded shape) with generated textures: stalls, crates, vending machines, cables, puddles. |
| Particles | Instanced quads for rain, splashes, steam and light motes. |
| Audio | Web Audio synthesis (see Audio). |

**Rendering**

- **Camera:** perspective camera with a narrow field of view (about 20°) placed far back at a 35° pitch and 45° yaw. This looks isometric but keeps the slight depth that sells the diorama. Q/E snap-rotate 90° with easing.
- **Lighting:** one moonlight directional light with shadows; neon and lamps as point/spot lights capped at about 24 active, culled by distance. Sign glow beyond that comes from emissive surfaces plus bloom.
- **Wet ground:** low roughness plus a cheap reflection of emissive signs (screen-space reflection pass, or a mirrored low-res render of signs only if SSR is too slow).
- **Fog:** custom height fog in the material shaders, tinted by nearby light colour.
- **Post chain:** render → SSR (optional) → bloom (UnrealBloomPass) → tilt-shift depth blur → colour grade (lift/gamma/gain per time of day) → film grain and a light chromatic fringe → output.

**Performance budget (1080p, mid-range GPU such as an RTX 3060)**

| Metric | Target |
| --- | --- |
| Frame rate | 60 fps |
| Draw calls | under 300 |
| Active dynamic lights | 24 or fewer |
| Shadow-casting lights | 1 (moon) plus 1 hero spot |
| Rain particles | about 6,000, instanced |
| Generated texture memory | under 256 MB |

A quality setting drops SSR, halves bloom resolution and reduces rain for weaker machines.

**iOS Safari support**

three.js runs in Safari on iPhone and iPad through WebGL2, which every iOS browser uses (they all run on Safari's engine). The look is achievable on recent iPhones, but phones need their own quality tier.

| Area | Mobile rule |
| --- | --- |
| Quality tier | Auto-select "Mobile" on iOS: no SSR (fake wet reflections with emissive streak decals), bloom at half resolution, about 2,500 rain particles. |
| Resolution | Render at a pixel ratio of 1.5 at most, not the phone's full 3x. Pixel art hides the lower resolution well. |
| Lights | 12 or fewer active dynamic lights; rely more on emissive surfaces plus bloom. |
| Memory | Keep generated textures under 128 MB. Safari reloads the tab if memory runs too high, so free canvases after uploading textures. |
| Draw calls | Under 150; merge building geometry per block. |
| Frame rate | 60 fps target on iPhone 13 or newer, with a 30 fps fallback. |
| Audio | Unlock Web Audio on the first tap (the "Tap to start" title screen). Respect the silent switch. |
| Screen | Landscape only. iPhone Safari has no true fullscreen, so offer "Add to Home Screen" for a full-screen web app. Keep the HUD clear of the notch and home bar using safe-area insets. |
| Testing | Test on a real iPhone often. On Windows you can debug Safari remotely only from a Mac, so keep the in-game debug panel (FPS, draw calls, memory) visible on mobile builds. |

## Core gameplay

The loop is explore → examine → echo-scan → question → deduce. Players can always find the clues; they earn progress by linking clues correctly on the deduction board.

**Investigation loop**

1. **Explore** the district on foot. Points of interest show a small marker when the player is close.
2. **Examine** an object with Space. Juno comments, and new facts go into the case file.
3. **Echo-scan** with F near a marked spot. The world desaturates, and a ghostly replay of a few seconds from someone's implant plays out as translucent sprites. The player can scrub the replay and tag details.
4. **Question** people. Facts and echo tags become topics the player can raise. Presenting the right fact to the right person opens new lines.
5. **Deduce** on the board. Drag two facts together to propose a link. A correct link produces a conclusion, which unlocks the next location or a confrontation.

**Clue types**

| Type | Example in the demo | Source |
| --- | --- | --- |
| Physical | Melted implant port on the victim | Examine |
| Testimony | The cook heard two voices, not one | Dialogue |
| Echo | A hand in a grey glove closes the door | Echo-scan |
| Record | Door log shows one entry, no exit | Terminal |
| Contradiction | "I left at 23:00" vs a 23:40 echo showing her | Board |

**Echo rules**

- Each echo is a 5–10 second replay from one person's point of view, so it can be wrong, partial or edited.
- Edited echoes show visible "seams": a frame stutter and a pixel tear. Spotting a seam is a clue on its own.
- Echo-scanning costs nothing in the demo. A stamina-style "strain" meter is an option for the full game.

**Failure and hints**

- Wrong board links just bounce apart with a short line from Juno. No game over in the demo.
- After 3 wrong attempts on the same conclusion, Juno offers a hint naming one of the two facts needed.

**Controls (keyboard and mouse)**

| Key | Action |
| --- | --- |
| WASD | Move |
| Shift | Run |
| Space | Talk / Examine |
| F | Echo-scan |
| Q / E | Rotate camera 90° |
| Z / X or wheel | Zoom |
| Tab | Case file |
| B | Deduction board |
| N | District map |
| P | Photo mode |
| M | Music on/off |
| H | Hide controls panel |
| ~ | Debug panel |

**Touch controls (iOS)**

| Gesture or button | Action |
| --- | --- |
| Left-thumb virtual stick | Move (push further to run) |
| Tap a person or object | Walk to it and Talk / Examine |
| Echo button (right side) | Echo-scan |
| Two-finger swipe | Rotate camera 90° |
| Pinch | Zoom |
| Top-right icons | Case file, deduction board, map, settings |
| Drag on the board | Link two facts |

The controls panel hides on touch devices; the interact prompt shows a tap icon instead of a key cap.

**Mouse**

Click a spot to walk there, click a person or object to Talk / Examine, right-drag to rotate the camera, wheel to zoom. Mouse and keyboard work together; the player never has to choose one.

**Gamepad (Xbox and PlayStation layouts)**

| Input | Action |
| --- | --- |
| Left stick | Move (full tilt runs) |
| A / Cross | Talk / Examine, advance dialogue |
| B / Circle | Back, close menus |
| X / Square | Echo-scan |
| Y / Triangle | Case file |
| LB / L1, RB / R1 | Rotate camera 90° |
| Right stick up/down | Zoom |
| View / Touchpad | Deduction board |
| Menu / Options | Pause and settings |
| D-pad | Move between cards on the board and menu items |

Uses the browser Gamepad API, which works on desktop browsers and in iOS Safari with Bluetooth Xbox or PlayStation controllers.

**Input rules**

- All three schemes are live at once. The prompts switch to whatever the player touched last: key caps, controller buttons (Xbox or PlayStation glyphs, drawn in code), or tap icons.
- Every screen, including the deduction board, must be fully usable with a gamepad alone, so the board needs a cursor mode: pick a card, then pick a second card to link.
- Rebinding is out of scope for the demo.

## Story and setting

The city of Saint Halvard runs on implants that record what people see and hear. Those recordings, called echoes, are legal evidence, and the Civic Audit Bureau employs memory auditors to read them. The demo takes place in one district, Lowmarket, a wet market street under the elevated Line 9 train.

**The world in three facts**

- Nearly everyone has a basic implant. Echoes fade after about 72 hours unless someone copies them.
- Copying and selling echoes is illegal, so a black market of brokers trades in other people's memories.
- The Bureau can override any implant's lock with an auditor code. Officially, that power is never misused.

**Lowmarket locations (demo)**

| Location | Role in the demo |
| --- | --- |
| Line 9 platform | Arrival and title moment |
| Lowmarket Street | Hub: stalls, signs, the stray cat, street NPCs |
| Sable Noodle House | Crime scene: front counter and back room |
| Alley behind the Sable | Echo hotspot, discarded glove |
| Kit's capsule hostel | Interview and contradiction |
| Juno's car | Deduction board and final scene |

**Cast**

| Character | Who they are | What they want |
| --- | --- | --- |
| Juno Vale | Memory auditor, 6 years at the Bureau. Dry, tired, sharp. Has short memory gaps she blames on overwork. | Close the case cleanly |
| Dex Morrow | The victim, a mid-level echo broker. Found slumped at a table with a burned implant port. | (dead) Kept a backup of one echo he was afraid of |
| Mama Teo | Owner of the Sable. Found the body. Warm, nosy, fiercely loyal to her regulars. | Keep her shop out of the news |
| Kit Lacroix | Courier and Dex's last client. Nervous, funny, lies badly. | Hide that she was buying an echo of her own erased past |
| Inspector Hale Brandt | Juno's handler, heard only over comms in the demo. | Have it logged as implant burnout by morning |
| Miso | Lowmarket's stray cat. Follows Juno and sits near clues. | Noodles |

**The truth of the case (hidden from the player until the end)**

Dex was selling an echo that proved the Bureau wipes auditors' memories after off-book jobs. Someone used an auditor override to enter the back room, burned out Dex's implant, and edited the nearby echoes. The override code and the grey Bureau glove both trace to Juno. Juno has no memory of it.

## Demo script

The demo runs about 18 minutes across seven beats, from Juno's arrival at 22:40 to the reveal at 02:10. Each beat teaches one system before the next one leans on it.

| # | Beat | Time | Location | What happens | What it teaches |
| --- | --- | --- | --- | --- | --- |
| 1 | Cold open | ~1 min | Line 9 platform | Train pulls in through rain. Title card fades over the district. Hale on comms: "Burnout case. Sign it and go home." Juno jokes she lost another hour on the train. | Mood, camera rotate |
| 2 | Lowmarket Street | ~2 min | Street hub | Juno walks to the Sable. Miso the cat joins. Optional chats with a vendor and a holo-preacher. | Move, run, talk |
| 3 | The scene | ~4 min | Sable back room | Examine 5 spots: body, burned port, two cups, door terminal, smashed lamp. Door log shows one entry, no exit. | Examine, case file |
| 4 | First echo | ~2 min | Sable back room | Echo from Mama Teo: she hears two voices before finding Dex. The echo has a visible seam. | Echo-scan, scrubbing, seams |
| 5 | Interviews | ~4 min | Counter, alley, hostel | Mama Teo, then Kit. Alley echo shows a grey-gloved hand. Kit says she left at 23:00; her echo puts her outside at 23:40. | Questioning, presenting facts |
| 6 | The board | ~3 min | Juno's car | Link 3 conclusions: "Someone else was in the room", "The killer used an override", "Kit saw them leave". Kit, pressed, describes a Bureau coat. | Deduction board |
| 7 | The last echo | ~2 min | Juno's car | Juno recovers Dex's hidden backup echo. Cliffhanger plays. | (payoff) |

**Beat 7 — the cliffhanger, shot by shot**

1. Juno slots Dex's backup chip. The world drains to the echo palette, and the replay is from Dex's eyes.
2. The door opens. A figure in a grey Bureau glove sits across from him. Rain on the window, two cups on the table.
3. The figure leans into the light. It is Juno, calm, wearing the same coat she has on now.
4. Back in the car, Juno opens her own implant log. A red band shows a 47-minute gap, 23:10 to 23:57.
5. All the Lowmarket signs flicker off at once (the Dead Hour lighting state). Only her dashboard glows.
6. Hale on comms, gently: "Juno. Where were you tonight between 23:10 and 23:57?"
7. Cut to black. Card: "Neon Ledger — Case 01 continues."

**Pacing guardrails**

- No beat should run past 5 minutes for an average player; hints kick in earlier if it does.
- The player must be able to finish in 15 minutes by skipping optional chats, and in 20 by reading everything.
- Plant the twist fairly: the glove, the override code and Juno's "memory gaps" line in beat 1 all appear before the reveal.

## UI and HUD

The UI copies the reference layout and frame style, re-skinned for cyberpunk: dark translucent panels, a thin cyan border, a small diamond at each corner, and a magenta accent for anything active. All panels are HTML/CSS over the canvas, so they stay crisp at any resolution.

| Element | Position | Content and behaviour |
| --- | --- | --- |
| Location banner | Top left | Compass glyph, location name in caps ("SABLE NOODLE HOUSE"), district in italics ("Lowmarket"). Slides in when the area changes. |
| Clock | Top right | 24-hour time, phase name (Late Evening, Night, Dead Hour), moon icon, a small slider showing progress through the night. |
| Minimap | Under the clock | Generated from the same layout data as the world. North marker, player arrow, dots for people, a red mark for the active objective. |
| Toast | Top centre | One-line notices: "Case file updated", "New echo found". Fades after 3 seconds. |
| Dialogue box | Bottom, full width | Speaker nameplate with a small portrait gem, typewriter text, Space to advance. Choice box pops up on the right, as in the reference. |
| Controls panel | Bottom left | Key caps and labels from the Controls table. H hides it. Hidden by default after beat 2. |
| Interact prompt | Above target | Small bubble with the key cap and verb: "Space Talk", "F Echo". |
| Case file | Full screen (Tab) | Tabs for People, Facts, Echoes. Each entry shows where it came from. |
| Deduction board | Full screen (B) | Corkboard-style grid of fact cards with drag-to-link strings. Correct links glow cyan and lock. |
| Echo overlay | Full screen | Desaturated world, scanlines, a scrub bar with timestamps, tag button. Seams show as a red tick on the bar. |

**Text and fonts:** use a web font loaded as CSS (for example a condensed display face for names and a readable serif or sans for dialogue). That is code-loaded rather than a shipped asset; see Open questions if you want a fully code-drawn pixel font instead.

## Audio

All sound is synthesized live with the Web Audio API: no sample files. Audio starts only after the player's first click or key press, which browsers require.

**Music:** a small sequencer plays slow synthwave and lo-fi loops built from oscillators, filters and a generated reverb impulse. Each location has a key and tempo; the score shifts layers by beat.

| Moment | Music treatment |
| --- | --- |
| Cold open, street | Warm pad, soft arpeggio, 72 BPM |
| Crime scene | Pad only, low drone, sparse plucks |
| Echo-scan | Detuned, reversed-envelope pad, heartbeat pulse |
| Deduction board | Ticking pulse that adds a note per correct link |
| Cliffhanger | Music cuts out on the reveal; one low tone holds under Hale's line |

**Sound effects (all generated):**

- Rain: filtered noise with random droplet clicks; louder near awnings.
- Footsteps: short noise bursts shaped by surface (wet asphalt, tile, metal grate).
- Neon hum and flicker: 50/60 Hz buzz with crackle on flicker.
- Train: low rumble with doppler pitch shift on Line 9.
- UI: soft synth blips for text, confirm, link correct and link wrong.
- Voices: no voice acting. Each speaker gets a short pitched "babble" blip per character, like classic RPGs.

The mix is spatialized with PannerNodes on the player position, with a master compressor to keep levels steady.

## Build plan

The build runs in 9 stages, each with its own file in [docs/stages](stages/) and an overview in [dev-stages.md](dev-stages.md). Each stage has a paste-ready prompt, a done-when checklist, and tips to keep Claude usage low on the Pro plan.

Stages 1–3 build the look before any gameplay. If the street doesn't look right after Stage 3, adjust the style before going further.

Every stage ends by updating NOTES.md, a short running summary of the code. The next stage's chat starts from that file instead of the whole project.

## Open questions

- [ ] Is "Neon Ledger" the working title, or do you have a name in mind?
- [ ] Keep Juno Vale as the protagonist, or change name, look or background?
- [ ] Fonts: allow CSS web fonts for the UI, or generate a pixel font in code to keep the rule absolute?
- [ ] Should echo-scanning have a cost (strain meter) in the demo, or stay free?
- [ ] Which controller do you test with first: Xbox, PlayStation, or both?
- [ ] Where will the demo live: a local build only, or a hosted page people can play?
- [ ] Does the full game stay single-player, or is co-op on the table later?
