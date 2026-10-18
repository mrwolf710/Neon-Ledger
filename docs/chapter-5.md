# Chapter 5: the Meridian Tower and the Line 9 platform (plan, proposals marked)

Hale is a woman (she/her). Status: planning only, nothing built. Source: `docs/story-bible.md` (finale decisions) and `docs/chapter-4.md` (what ch.4 sets up). Items marked **(proposal)** are not yet agreed with the owner.

## Where chapter 4 leaves us
Juno has been told by the arcade stranger to go to the Meridian Tower, 41st floor, and say "Dex sent you". Teo and Kit refused to leave Lowmarket; Kit has the override damper; Hale's auditors reach the Sable "by eight". Flags: `chapter4`, `kit_warned`, `teo_meet`, `arcade_call`, `arcade_met`. The end card in `beats.arcadeScene` ("CHAPTER 5 ... COMING SOON") is replaced by the chapter 5 card.

## The pachinko arcade (chapter 4's closing scene; rework before the tower)
Built as a first pass (`areas.ts` `arcade()`, `beats.arcadeScene`, conv `arcade_stranger`, stranger = placeholder `walkerD`). Bible brief: a quick scene, loud, colourful and packed with flashing machines, the opposite of the dark empty Bureau; **one intermediary** who points Juno to the fixer. Gaps and proposals:
- **Look (proposal):** today it is a 10x7 room with 6 cabinets, 6 pachinko machines and 4 lights, nothing animated. Make it dense and bright: flickering cabinet screens (shader/canvas animation in code), falling-ball pachinko panels, strings of marquee bulbs, a crowd of ambient NPCs (reuse the street walker sheets), a prize counter with tokens. Keep mobile in budget: merge the machines into the batch, animate with a few shared materials, not per-machine lights.
- **Sound (proposal):** synthesized parlour din in `sfx.ts` (bells, coin cascades, ball rattle, jingles) under the bazaar music; the din drops to a muffle when the stranger talks.
- **The intermediary:** unnamed and a placeholder sprite. Conflict: the bible makes them the fixer's go-between, but the current line "someone who wants Hale gone as much as you do" suggests an enemy of Hale. **(proposal)** Make them the fixer's go-between, polite and bored, who plays it as a friendly warning; drop the anti-Hale line. Needs a name, a sprite and a talk portrait from the owner.
- **Play beat (proposal):** the call says "come alone" but the stranger is not visible. Juno finds them among the crowd (a marked cabinet, or the one person not playing), then sits at the machine beside them. No new UI: the existing Talk prompt.
- **Dialogue:** Juno only asks questions. **(proposal)** Let her react (anger at "the others", the lift password "Dex sent you" landing hard) and have the stranger confirm only what the Exchange fixer would: the tower, the floor, the password, "your forty-seven minutes and the rest".
- **Exit:** replace the "COMING SOON" card in `arcadeScene` with the CHAPTER 5 card and the fade to the tower. Optional: Juno steps outside to see Hale's auditors arriving at the Sable, which sets the clock for the Lowmarket return in beat 6.

## Beats
1. **The tower (new area `tower`).** Lift ride (scripted, the password line), then one floor: reception, the fixer's glass office, a server room. Look: corporate gold/white against the Bureau's cold steel and the Exchange's red; clean and bright, the opposite of everything so far. Mobile budget: keep it one floor.
2. **The fixer's real offer.** He drops the chapter 2 lie (the case closes on a burglar). Real offer: her memories back in exchange for Dex's echo. He names the price and does not hurry her. **(proposal)** Name him and his corporation here; both are still open in the bible.
3. **His leverage:** his corporation is a client of the program and kept a copy of every wipe as insurance. That is why the offer is credible and what he really wants the echo for (blackmail of the Bureau, not exposure).
4. **The montage (playable).** Juno takes the restore. A short run of echo scenes in the existing echo system (`story.ts` ECHOES; scrub/tag UI), each a kill seen through her own hands, each shorter than the last. The earliest is the dying man from Dex's teaser (first victim, months ago); Dex is in it. Faster and faster, then a hard cut. She learns she was wiped over and over. **(proposal)** 5 scenes, the last about 3 s; first-person framing reuses the echo ghost tracks, no new engine.
5. **Fallout in the tower.** Juno's reaction, one short exchange with the fixer. **(proposal)** She does not give him the echo; she walks out. What happens to him is open (see Open).
6. **Back to Lowmarket.** She asks Kit and Teo for help, because she knows Hale will come. Short scene in the Sable back room, reusing the ch.4 spots (`kitmeet`, `teomeet`). Teo's earlier hint ("get out of auditing") pays off: Teo helps because she wants Juno out of it.
7. **The Line 9 platform showdown** (area `platform`, already built, dark and empty as in the cold open). Juno waits; a train arrives; Hale steps out and raises her weapon. Kit (with Teo beside him) uses the damper. No shouting, no combat animation: a short effect (screen glitch, Hale's HUD/implant dies, she goes down) with a sting. Setup already in place: Kit's gear shelf, "the credits go to the collection", `ex_kitgear`.
8. **The self-wipe.** Juno wipes herself anyway; Teo and Kit watch. **(proposal)** Reuse the lab reader's look from the Bureau. Fade out.
9. **Closing loop.** Cold-open platform, a train arrives, Juno says "I think I lost an hour on that train." Cut to title.

## What chapters 1-4 must already plant (check, fix if missing)
- Hale believably dangerous and personally invested: ch.3 has the kind-but-controlling scene, the lab video and the threat call. Missing: a physical presence before the finale. Ch.4 chose to keep her unseen, which makes the platform entrance the surprise.
- Dex's echo and the dying man are an earlier victim, not Dex. Check chapter 1 and 2 clue text never states Juno killed Dex; the montage reveals it.
- `refused_deal` (ch.2) is stored and unused. **(proposal)** The fixer comments on it: "You turned me down once."

## Build list
- `areas.ts`: `tower` area (+ `AREAS` entry, exits, `mood`), reuse `platform` for the ending.
- `story.ts`: conversations for lift, fixer offer, montage voices/ECHOES, Lowmarket plea, platform, closing line; new flags `fixer_offer`, `memories_restored`, `kit_help`, `hale_down`, `juno_wiped`.
- `beats.ts`: `towerScene`, `montage`, `showdown`, `selfWipe`, closing loop; add STEPS. Replace the ch.4 end card.
- Audio/visuals: a tower mood in `music.ts`; damper effect via `post` glitch; no asset files.
- Debug panel: jump buttons for tower, montage and showdown.

## Open (need the owner)
- The fixer's name and corporation (and the placeholder "Meridian Tower").
- Does Hale fall, die, or just get disabled? Is she present at the self-wipe?
- What happens to Teo and Kit after (the bible's open question).
- Does the fixer survive or get his comeuppance, and does he keep the copies?
- Does Juno actually hand over Dex's echo, or does the self-wipe destroy it too ("destroys the proof and her own memory together")?
- Sneak-past patrols in ch.4 are unbuilt; skip them or add before ch.5.
