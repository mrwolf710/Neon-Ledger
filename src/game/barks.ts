import * as THREE from 'three';

export const BARKS = {
  range: 4.5,        // units: an NPC notices Juno inside this, looks at her, and may speak
  turnRate: 6,       // look-at turn speed (1/s)
  perNpcCooldown: 40, // seconds before the same person speaks again
  gap: 4,            // seconds between any two barks
  chance: 0.75,      // odds that a person speaks when Juno walks up
  show: 3.2,         // seconds a line stays up
  head: 2.3,         // world units above the feet
};

// Short lines said when Juno walks up. Each entry: { lines, flag?, notFlag? } (first matching entry wins); ambient walkers use `walker`.
// Flags are case-file flags (visited_<area>, miso_joined, kit_named, seen_backroom, ex_<id>...).
const LINES = {
  vendor: [
    { flag: 'miso_joined', lines: ['That cat likes you. Cats know.', 'Feed him, he stays.'] },
    { lines: ['Hot skewers. Rain keeps them warm.', 'Eat. Lowmarket is cold tonight.', 'You look lost, detective.'] },
  ],
  mamaTeo: [
    { flag: 'seen_backroom', lines: ['Wipe your feet.', 'I told you what I know.'] },
    { lines: ['Sit. Eat. Ask later.', 'Soup is hot, you are not.'] },
  ],
  kit: [
    { flag: 'kit_named', lines: ['Kit. You know my name now.', "I'm just trying to sleep."] },
    { lines: ['Rooms are full.', 'Quiet hours, please.'] },
  ],
  preacher: [{ lines: ['The Ledger sees all debts.', 'Repent in credits.', 'Neon is a kind of prayer.'] }],
  walker: [
    { flag: 'miso_joined', lines: ['Nice cat.', 'Is that cat yours?'] },
    { lines: ['Nice night for a drowning.', "Watch it, it's slick.", 'Another corpo found dead, I heard.', 'Mind the pole.', 'Line 9 is late again.'] },
  ],
};

// Look-at and barks. Nearby people turn to face Juno (then back to where they stood) and sometimes say a line in a bubble above their head.
export function createBarks({ cast, caseFile, player, camera }) {
  const el = Object.assign(document.createElement('div'), { className: 'bark' });
  document.body.appendChild(el);
  const base = new Map(), last = new Map(), was = new Set(), v = new THREE.Vector3();
  let clock = 0, gap = 0, speaker = null, left = 0, area = null;
  const rnd = (a) => a[Math.floor(Math.random() * a.length)]; // cosmetic only: does not touch the seeded city
  const pick = (id, ambient) => (LINES[ambient ? 'walker' : id] ?? []).find((e) => (!e.flag || caseFile.hasFlag(e.flag)) && (!e.notFlag || !caseFile.hasFlag(e.notFlag)));
  const turn = (a, to, k) => a + Math.atan2(Math.sin(to - a), Math.cos(to - a)) * Math.min(1, k);

  return {
    // active: false while a menu, dialogue or cutscene has the screen (the bubble is hidden).
    update(dt, areaId, active) {
      clock += dt; gap -= dt;
      if (areaId !== area) { area = areaId; was.clear(); speaker = null; }
      const p = player.position;
      for (const b of cast.list) {
        if (b.id === 'juno' || !b.root.visible || b.area !== areaId) continue;
        const d = Math.hypot(p.x - b.position.x, p.z - b.position.z), near = d < BARKS.range;
        if (!b.ambient && b.id !== 'miso' && b.id !== 'dex' && !b.follow && b.anim !== 'slump' && b.anim !== 'walk') { // look at Juno, return when she leaves
          if (!base.has(b)) base.set(b, b.facing);
          b.facing = turn(b.facing, near ? Math.atan2(p.x - b.position.x, p.z - b.position.z) : base.get(b), dt * BARKS.turnRate);
        }
        if (!near) { was.delete(b); continue; }
        if (was.has(b)) continue;
        was.add(b); // Juno just walked up
        const e = active && gap <= 0 && !speaker && pick(b.id, b.ambient);
        if (e && clock - (last.get(b.id) ?? -1e9) > BARKS.perNpcCooldown && Math.random() < BARKS.chance) {
          speaker = b; left = BARKS.show; gap = BARKS.gap; last.set(b.id, clock);
          el.textContent = rnd(e.lines);
        }
      }
      if (speaker) {
        left -= dt;
        if (left <= 0 || !active || !speaker.root.visible) speaker = null;
      }
      el.classList.toggle('on', !!speaker && active);
      if (speaker) {
        v.copy(speaker.position).setY(speaker.position.y + BARKS.head).project(camera);
        el.style.left = `${(v.x + 1) / 2 * innerWidth}px`; el.style.top = `${(1 - v.y) / 2 * innerHeight}px`;
      }
    },
  };
}
