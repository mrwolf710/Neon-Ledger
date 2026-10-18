# Chapter 4: Lowmarket at dawn (agreed outline, not built)

Decided with the owner:
- **Goal:** get Teo and Kit to safety. Hale will hunt Juno and anyone who helped her. Juno warns them.
- **Hale's pressure:** felt but unseen. Auditors posted on the street, a call Juno ignores, Teo nervous about visitors. No on-screen chase and no Hale yet (her appearance in the finale stays a surprise).
- **Gameplay:** a sneak-past section. Hale's auditors patrol Lowmarket Street in a loop (reuse the Bureau patrol code, beats.js updatePatrols); Juno reaches the Sable and the hostel by the back alley, using the existing sneak move (G / sneak input). No new UI.
- **Teo and Kit:** Teo refuses to leave the Sable (it is her life) but sends Kit away with his gear. Sets up the finale: Teo holds the street, Kit comes back with the override damper (his rare gear shelf already exists in the hostel).
- **Ending:** a call from the fixer leads Juno to the pachinko parlor (chapter 5, one intermediary scene), then the fixer's tower.

Still open: the exact patrol route and sight rules (does being seen fail the sneak, or just cost a conversation?), the fixer's name and corporation, what the dawn visit's one clue is (the story bible mentions a Line 9 platform clue tying Juno's lost hours to Hale), the lines for Teo and Kit, the parlor intermediary.

**Built (end of chapter 3):** as Juno slips out, her phone rings (beats.bureauSlip) and Hale calls, warm and calm: she has sent auditors to look in on Mama Teo and the nervous boy at the hostel, for their safety (story hale_threat, red alarm UI). Juno resolves to warn them and get them out of Lowmarket. Chapter 4 starts from that.

**Built (second pass, owner's flow):** dawn on Lowmarket (orange outdoors only). The Sable door is blocked until Juno has talked to Kit at the hostel (kit_ch4: asks about his gear, the override damper, then asks him to meet her in the Sable back room; flag kit_warned). Optional: the street vendor agrees to watch for auditors (vendor_ch4, flag vendor_watch). Kit and Teo then wait in the back room (spots kitmeet, teomeet); stepping in plays ch4_meeting (not safe, Teo and Kit refuse to leave) and a phone call from a stranger (ch4_call; flags teo_meet, arcade_call). The pachinko arcade (area arcade, street door at x -6, placeholder sprite walkerD) opens; arcade_stranger points Juno to the Meridian Tower, 41st floor (placeholder name), then the chapter 5 card. The sneak-past patrols are not built.
