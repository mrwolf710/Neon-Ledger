# Chapter 3: the Civic Audit Bureau station (planning notes, agreed with the owner)

Hale is a woman (she/her). Use she/her for Hale in text, dialogue and comments.

Chapter 2 ends with three auditors taking Juno in. Chapter 3 starts at the Bureau station: a real hub she can walk around, mostly empty (a late night shift). Story beats are not decided yet.

## The station (first pass built: area `bureau`, view with `?start=bureau`; not connected to the story yet)
- Big central hall: rows of desks with chairs and glowing monitors, three evenly spaced columns down the middle aisle, tall windows on the north and west walls onto a generated skyline.
- Off the hall: **Hale's office** (north-east, glass, the only warm room), **holding cells** (east, three cells, red light), **memory-audit lab** (south-east: reader chair under a halo, three screens), **echo archive** (south-west corner of the hall: racks of memory slots).
- Vibe (owner): empty, dark, mostly lit by the computer screens. Hale's office is lit by a monitor and one desk lamp only. At most 3 columns in the whole station (no pier columns on the window walls). Cold steel/cyan palette, the opposite of the red-orange Echo Exchange. Constants in `BUREAU` (areas.js).
- Spots: start (entrance), hale, chair, cell1, archive.

## The Bureau chapter (agreed with the owner)
Goal: Juno learns her gap is a wipe, that it has happened over and over on a schedule, and that it all runs through Hale's account (suspicion only; the assassinations are revealed in the fixer's tower).
- **Hale is kind, concerned and quietly controlling** in the first scene; she wants the case closed as a burnout, puts Juno on "rest", and says the doors are locked until dawn "for her protection".
- **Only the front door is locked;** everything inside is open. It opens after the level-2 deduction.
- **Six clues:** A wipe signature (lab reader), B 31 clean closes (archive), C Line 9 arrival logged before every case (a hall desk roster), D override request signed on Hale's account (Hale's desk), E "They take the hours. Don't sign." (cell wall), F Dex's case closed with no echo review, Hale's initials (a hall desk queue).
- **Pairs:** A+C = the wipes run on a schedule; D+F = Hale signed the override and buried the case; B+E = other auditors have been wiped too. **Level 2:** schedule + Hale's account = everything runs through Hale's account (points at Hale but leaves doubt). Two cards are left on the board.
- **The ending:** Juno **slips out** of the station (the owner's choice: it gives Hale a reason to hunt her in the finale). Next: Lowmarket at dawn (chapter 4, not built).

## Built (headless-checked)
- The end of chapter 2 no longer shows a "coming soon" card: after the auditors' talk it fades to a CHAPTER 3 / THE BUREAU card, then Juno is at the station entrance with the three auditors, who walk her up the middle aisle and through the aisle between the desks to Hale's office (beats.bureauArrival; each leg gives up after 9 s if she snags). Hale (her own sprite) stands facing the door. PLACEHOLDER dialogue `hale_office` (Hale: "Sit down, Juno." / "Auditors. Wait outside.") and `hale_talk`; the auditors step back into the hall; control returns and the station is hers to walk. Debug panel button runs the scene.
- The city shows through the windows: dense towers right behind the glass, lit windows in cyan, amber, red and a little pink.
- Music (area mood `bureau`, music.js): slow, serious, restrained: a low drone, a two-chord pad changing every 12 s, one soft high note now and then. Nothing else.

## Open
- Which rooms are locked until the story opens them; the actual Hale scene (the placeholder lines need replacing).
- Named auditors (sprites), what each room holds for the plot, Hale's scenes.
