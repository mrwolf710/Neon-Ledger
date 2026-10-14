# Chapter 2 design (draft, agreed with the owner in conversation)

Status: planning only, nothing built yet. Chapter 1 ends with Juno realizing she was in the room with Dex (she may or may not have killed him; undecided).

## Premise
Chapter 2 is about **Dex's secret echo**: proof that the Bureau wipes auditors' memories after off-book jobs. A **corporate fixer** also wants it. Juno follows the trail through the Echo Exchange to an implant dealer, then three auditors take her in for questioning, which leads into Bureau HQ and Hale (chapter 3).

## Entry
A cut straight from Juno's car (end of chapter 1) into the Echo Exchange. The street is not revisited.

## Hub: the Echo Exchange
- Big open market square, neon, **colour scheme limited to reds, oranges and yellows**.
- **8 booths around the edge** and **2 rows of 2 booths in the centre** (12 booths).
- All vendors are approachable and talkative. **6 have real clues; 6 only brush Juno off** ("If you're not buying, move along"), a few of them nervous because she is an auditor.
- The owner draws a new sprite for every vendor.
- The **implant dealer's shopfront** is a 13th stop on the square's edge (not one of the 12 booths). It is the only interior.

## Vendors with information (draft, order is flexible)
1. **Echo broker** (copied memories in vials): Dex tried to sell an echo days ago, refused as "too hot"; echoes fade in 72 h unless copied.
2. **Hot-sauce cook**: Dex ate here nightly; last week he paid for an implant fitting. Points to the dealer.
3. **Fortune-teller** ("memory tarot", really gossip): a man in a dark suit (the fixer) has been paying to hear about Dex.
4. **Cable and wire seller**: saw Dex arguing with the suit; the suit paid him to go away.
5. **Parts scrapper** (used implants and ports): recognises a clean-burned port as Bureau override work; only a dealer can read what Dex carried. Points to the dealer.
6. **Umbrella seller**: saw **a woman with a Bureau badge** enter the Sable ~23:10 and leave ~23:57 (matches Juno's 47-minute gap).

Brush-off booths (suggestions): noodle cart, cheap jewellery, fake-ID printer, stim drinks, drone repair, flowers.

## The implant dealer's store (only interior)
- Juno finds **Dex's hidden echo**. The echo is a **teaser only**: a few seconds of a grey-coated woman (herself) reaching toward a dying man's implant, then cut off. It confirms the doubt without answering it.
- The **corporate fixer is there** and **offers her a deal**: calm, polite, he knows what the echo proves and offers to make her gap and the case disappear if she hands it over.
- She walks out; **three auditors are waiting** to take her in for questioning.

## Finale
Three auditors take Juno in. Cut to Bureau HQ and Hale.


## Clue logic (agreed with the owner)
Rules: every vendor gives their clue the first time you talk to them (no flags, no prerequisites, any order); each clue is used in exactly one ring pair (the ring spends clues); every conclusion follows from its two inputs alone; vendors never speak as if they know what another vendor said and do not point to each other (the owner chose: let the player explore).

| Clue | Vendor | Text |
|---|---|---|
| F1 | Echo broker | Dex came to sell an echo; refused as "too hot", Dex took it back. |
| F2 | Hot-sauce cook | Dex dropped a receipt here: "Locker 9, paid through the month", stamped with the implant dealer's mark. |
| F3 | Fortune-teller | A man in a dark suit pays well for anything about Dex's visitors tonight, "especially Bureau". |
| F4 | Cable seller | Dex shouted at the man in the dark suit: "You're too late. It's somewhere you can't buy it." |
| F5 | Parts scrapper | The implant dealer rents lockers: spare implants kept in the shop, readable only on the dealer's reader. |
| F6 | Umbrella seller | A woman with a Bureau badge went into the Sable about 23:10 and left about 23:57. |

Deduction ring (pairs; 6 clues + 4 conclusions = 10 cards):
- F1 + F4 -> **C1 Dex hid the echo before he died.**
- F2 + F5 -> **C3 Dex rented a locker at the implant dealer's.**
- C1 + C3 -> **C4 The echo is in a locker at the dealer's shop.** (required; unlocks the dealer's door, Juno says "The dealer.")
- F3 + F6 -> **C5 The fixer is hunting the Bureau woman, and that is me.** (optional; the fixer in the store then says he knows it was her)

Required: C1, C3, C4 (broker, cook, cable seller, scrapper). Optional: C5. The dealer's door is locked until C4.

## Car transition (scripted scene, owner approved the approach)
Chapter 1 ends on Hale's question. Chapter 2 opens in the car:
- Hale (comms): "Juno. Where were you tonight between 23:10 and 23:57?"
- Juno (thought): "(That was me in that room. I don't remember a minute of it.)"
- Juno, to Hale: "Still working it. I'll bring you something real."
- Hale: "Come in. Now. Bring the chip."
- Juno: "Not yet. If I walk into the Bureau with a dead broker and a hole in my memory, I won't walk out. I need to know what Dex was carrying first."
- Hale: "Juno--" (she cuts the call)
- Juno (thought): "(Brokers all end up in one place. The Echo Exchange. Somebody there knows what he was selling.)" Cut to the square.

## Car scene: built
Hale's question -> car_reply -> car_decide -> Dead Hour ends (signs and music return) -> black -> "CHAPTER 2 / THE ECHO EXCHANGE" card -> Juno on the square's west side. The old end card ("CASE 01 CONTINUES", tap, reload) is gone; chapter 2 is always on.

## Built so far
- 12 vendors with dialogue (story.js VENDOR_TALK; names: Vesper, Mari, Madame Lux, Tobbo, Gutter, Pim; brush-offs Oyo, Ruth, Slate, Jinx, Bolt, Petra), placeholder sprites borrowed from the street walkers/vendor (CAST `sheet`), talk range from behind the counter.
- Six clues and four conclusions in ENTRIES/BOARD; the board shows only chapter 2's clues after `chapter1_done`; conclusion cards can be placed as clues (tier two); C4 sets `dealer_open`; the dealer door says it is locked until then.
- Built (first pass, placeholder sprites): the dealer's shop interior (Locker 9, dealer NPC: show him the receipt), Dex's hidden echo teaser, the fixer's offer (refuse / think about it, both lead to the auditors), the three auditors on the square, an end-of-chapter card. Chapter 3 (Bureau HQ and Hale) is not built; the deal outcome is only stored as flag refused_deal.

## Layout
Booths are deliberately uneven (widths, angles, three styles: awning, kiosk, cart; no grid). See EXCHANGE in `src/world/areas.js`.

## Open questions
- Does the fixer know she is the woman? (He says so in the store if she made C5; otherwise he implies it.)
- Vendor names, voices and sprite list; dealer name.
- Does Juno take the deal, refuse, or is it interrupted by the auditors?
