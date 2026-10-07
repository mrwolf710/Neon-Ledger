# Story review — Neon Echoes

Spoilers throughout. Reviewed scope: story.js, dialogue-edits.json (including live overrides), beats.js, the design doc and Stage 9 plan. This review describes the Stage 9A baseline and the changes made for 9B; it does not certify a complete playable demo.

## What works

Keep the Juno reveal. Memory as evidence, institutional control of memory, and the investigator’s missing past reinforce one another. The reveal should be delivered by Dex’s final backup, rather than guessed from an overly specific early clue. Mama Teo is the strongest supporting character: her food, hospitality and practical suspicion establish a voice worth preserving.

## Timeline

The baseline arrival at 22:40 contradicted a murder during Juno’s planned 23:10–23:57 memory gap: Dex was already dead at arrival. Adopt **00:35 arrival on the following calendar day**, keeping the 47-minute gap on the preceding evening. Kit claims 23:00 departure; the alley echo shows her at 23:40; the terminal records auditor access at 23:18. These are historical evidence times, not the live HUD clock. The final replay and log must follow this ordering.

9B updates the initial clock. 9C still needs to resolve the accelerated clock/lighting progression and place the intended 02:10 ending through beat timing. Do not treat the clock as a substitute for explicit evidence timestamps.

## Character and evidence findings

- **Kit:** the design’s courier/client and editor’s maintenance worker were inconsistent. Make maintenance an intentional cover. Keep the nervous thirty-credit solicitation as characterization, then reveal the courier bag and motive: buying a memory of her erased past. Standardize Dex **Morrow**, Kit’s she/her pronouns, speaker IDs and shorter dialogue. The old editor conversation must not override the new evidence-presentation branch.
- **Unknown visitor:** the first echo used the vendor sprite, which implied the vendor was present. Use a dedicated faceless, plain silhouette with no recognizable cast clothing. An edited memory must not provide an accidental identity clue.
- **Glove:** “I have a pair just like it” plus the missing-time line over-signaled Juno. Describe Bureau equipment issued across service roles. The clue supports an institution, not a person.
- **Override:** a city master key does not establish an auditor override. Use the terminal’s separate hardware journal: auditor-class forced unlock at 23:18, credential identity redacted. The editable entry counter can still read one entry and no exits. Preserve that distinction in dialogue and the case file.
- **Deduction chain:** two cups + two voices establish a visitor; visitor + door testimony + access-class trace establish privileged access; override + glove + Kit’s Bureau-coat testimony establish Bureau involvement. Keep the old city-key conclusion for existing saves and optional Teo dialogue, but it must not substitute for the auditor trace.
- **Kit’s contradiction:** allow presenting the timestamped 23:40 echo to break her 23:00 departure story. She admits seeing a coat, not a face. Do not present her initial denial as verified truth.
- **Backup survival:** Dex removed a read-only optical copy before the meeting. Kit hid it under the hostel reception shelf. It is physically separate and disconnected from the burned implant and edited memories. Recovery is interactive; the final replay belongs in 9C.
- **Hale:** retain ambiguity. His final question can imply orchestration, suspicion or a test of recall. Do not add a confession or omniscient explanation.

## 9B implementation and verification

Add the alley replay, Kit interview/presentation path, terminal trace, anonymous echo sprite, three chained deductions, backup recovery and objectives through return to the car. Count tagged evidence rather than merely starting a replay when advancing objectives. Validate dialogue after editor overlays, data references, clue reachability and build output. A browser and device playthrough is still needed to judge pacing and input comfort.

## 9C recommendations

1. Play Dex’s isolated backup from his point of view. Match the revealed Juno sprite to her current outfit; do not identify her in early tracks.
2. Show the red 23:10–23:57 interval on the preceding evening. Arrival is 00:35 the next day.
3. Transition to Dead Hour and cut music on the reveal. Keep Hale’s question: “Juno. Where were you tonight between 23:10 and 23:57?”
4. Cut to black and “Neon Echoes — Case 01 continues.” Add beat timing/skip tools and verify 15–20 minute pacing.
5. Verify the full route and ending on keyboard/mouse, gamepad and iPhone touch, including wrong board links, hints, replay re-tagging and save/load.

## Documentation corrections

The baseline README marked stages 1–9 not started despite implemented systems through 9A. It also claimed no images shipped despite selected PNG assets. Use Neon Echoes as the game title, Neon Ledger as repository identity, and document the hybrid art approach. Completion of underlying systems is distinct from a tested, complete demo.
