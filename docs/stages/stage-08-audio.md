# Stage 8 — Procedural audio

At the end of this stage the game has rain, footsteps, neon hum, UI sounds, voice blips and a reactive music score, all synthesized live. Estimated: 1 session.

## Paste into a new chat

```
Neon Ledger, Stage 8 of 9. three.js HD-2D cyberpunk; all sound must be synthesized with the Web Audio API, no sample files. Rules: one file per reply, changed functions only, short explanations. NOTES.md below.

Build:
1. src/audio/synth.js: AudioContext created and resumed on the "Tap to start" screen (required on iOS). Master compressor, music and SFX buses with volume settings, a generated reverb impulse (decaying noise), helpers for oscillator voices, filtered noise and envelopes.
2. src/audio/sfx.js:
   - rain loop (filtered noise + random droplet clicks), louder near awnings
   - footsteps by surface: wet asphalt, tile, metal grate (short shaped noise bursts), synced to the walk animation
   - neon hum (50 Hz buzz + harmonics) and crackle on flicker, spatialized with PannerNodes
   - train rumble with doppler pitch shift
   - UI: text blip, confirm, back, link correct, link wrong, case file updated
   - voice blips: per-speaker pitch and waveform, triggered by the dialogue per-character event
3. src/audio/music.js: a small step sequencer playing slow synthwave/lo-fi layers (pad, arpeggio, bass, soft drums). Moods: street (72 BPM, warm), scene (pad + drone), echo (detuned reversed pad + heartbeat), board (ticking pulse that adds a note per correct link), silent (for the cliffhanger). setMood(name, fadeSeconds).
4. M toggles music. Settings menu gets music and SFX volume sliders.
5. Put every tunable number (frequencies, cutoffs, volumes, tempos) in a TUNING object at the top of each file.

Update NOTES.md at the end.

[paste NOTES.md here]
```

## Done when

- [ ] Rain, footsteps and neon hum play and pan as Juno moves
- [ ] Dialogue text makes per-speaker blips
- [ ] Music changes mood smoothly between street, scene, echo and board
- [ ] Audio starts after "Tap to start" on iPhone, with no errors
- [ ] NOTES.md updated, changes committed and pushed

## Keep it cheap

Tune sounds yourself by editing the numbers in the TUNING object at the top of each file. Ask Claude only to add a sound, not to adjust one.
