import * as THREE from 'three';
import { EXAMINABLES, TALK, FALLBACK, conversationFor } from './story.js';

// The beat manager: the cold open cutscene, the objective line / minimap mark, and the things you can interact with.
// Beats 1-3 live here (Stage 9A); later beats add steps to STEPS and conversations to story.js.
export const BEATS = {
  trainSeconds: 6.5,      // the train rolling into the platform
  uiAt: 0.9,              // fraction of the zoom after which the UI fades in (quickly, see #hud.on in styles.css)
  zoomDelay: 2,           // seconds after the title card starts before the zoom begins
  zoomSeconds: 3,         // after the title card: the CRT frame zooms away and the VHS noise fades out
  settle: 1.5,            // seconds Juno stands still before the title card, so the camera is centred on her
  cardHold: 2.4,          // title card hold, seconds
  mislaid: 0.6,           // pause before Juno steps out
  misoFollow: { dist: 1.5, speed: 2.6 },
  dark: { exposure: 0.06, lampsFrom: 0.3 }, // the opening starts almost black; station lamps fade up once the train is 30% of the way in
};

export function createBeats({ world, cast, caseFile, dialogue, hud, interactions, fade, sfx, player, clock, setExposure = () => {}, setVhs = () => {}, setCrt = () => {} }) {
  const timers = [], tweens = [];
  const visits = {}; // how many times Juno has talked to each person (picks the conversation, see story.js VISITS)
  const flag = (n) => caseFile.hasFlag(n);
  let locked = false, focus = null, lastStep = '';

  // ---- tiny async helpers driven by update(dt) (so cutscenes pause with the game, not wall-clock) ----
  const wait = (s) => new Promise((res) => timers.push({ left: s, res }));
  const tween = (s, fn) => new Promise((res) => tweens.push({ t: 0, s, fn, res }));
  // Walk Juno somewhere; gives up after maxSeconds so a blocked path can never freeze a cutscene.
  const walkTo = async (x, z, reach = 0.2, maxSeconds = 4) => {
    await Promise.race([new Promise((res) => player.walkTo(new THREE.Vector3(x, 0, z), reach, res)), wait(maxSeconds)]);
    player.cancel();
  };

  // ---- Beat 1: the cold open ----
  async function coldOpen() {
    locked = true;
    const platform = world.areas.platform, train = platform.train, juno = cast.byId.juno;
    juno.away = true; cast.apply();
    const startX = train.position.x, stopX = platform.trainStop[0];
    focus = train.position;                                     // the camera watches the train come in
    const smooth = (x) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
    const glowTo = (g) => platform.trainGlow.forEach((m) => m.color.copy(m.userData.base).multiplyScalar(g));
    platform.lights.forEach((l) => { l.intensity = 0; });          // pitch black; the windows and door start almost dark too
    glowTo(0.04);
    setVhs(1); setCrt(1);                                                // old VHS tape look until the title card is gone
    setExposure(BEATS.dark.exposure);
    await fade.in();
    sfx.trainArrive(BEATS.trainSeconds);
    await tween(BEATS.trainSeconds, (u) => {
      train.position.x = startX + (stopX - startX) * (1 - (1 - u) ** 3);
      setExposure(BEATS.dark.exposure + (1 - BEATS.dark.exposure) * smooth(u * 1.15));
      glowTo(0.04 + 0.96 * smooth((u - 0.1) / 0.8));                // windows and door fade up with the rest
      const lamp = smooth((u - BEATS.dark.lampsFrom) / (1 - BEATS.dark.lampsFrom));
      platform.lights.forEach((l) => { l.intensity = l.base * lamp; });
    });
    setExposure(1); glowTo(1);
    platform.lights.forEach((l) => { l.intensity = l.base; });
    await wait(BEATS.mislaid);
    const door = platform.spots.find((s) => s.name === 'start');
    player.position.set(stopX, 0, door.z);                      // Juno steps out of the door
    juno.facing = 0; juno.away = false; cast.apply();
    focus = null;
    cam.follow?.(player.position, true);
    await walkTo(stopX, door.z + 1.6);
    await wait(BEATS.settle);                                   // let the camera catch up so she stands in the middle of the screen, between the title words
    player.setPose('tablet');                                   // she reads the case on her tablet during the title card and Hale's call
    const card = fade.card([{ parts: ['NEON', 'ECHOES'], color: '#39ff14', scale: 7 }, { text: 'CASE 01  LOWMARKET', color: '#1fd6e8', scale: 3 }], BEATS.cardHold);
    await wait(BEATS.zoomDelay);                                // the zoom starts while the title words are still on screen
    let uiOn = false;
    await tween(BEATS.zoomSeconds, (u) => { // the monitor frame zooms out to the full game and the tape noise fades; the UI only fades in as the zoom nears its end
      const k = 1 - smooth(u); fade.cardZoom(u); setCrt(k); setVhs(k);
      if (!uiOn && u >= BEATS.uiAt) { uiOn = true; hud.show(); }
    });
    await card;
    hud.show();
    await dialogue.start('hale_open');                          // Hale on comms
    player.setPose(null);
    locked = false;
  }
  let cam = null;

  // ---- Interactables: doors, clues, people ----
  function register() {
    for (const e of world.exits) {
      interactions.add({ id: e.id, area: e.area, position: new THREE.Vector3(e.at[0], 0, e.at[1]), height: 1.2, verb: e.verb,
        onInteract: () => world.enter(e.to, e.spawn) });
    }
    for (const x of EXAMINABLES) {
      const s = world.spot(x.area, x.spot);
      interactions.add({ id: `ex:${x.id}`, area: x.area, position: new THREE.Vector3(s.x, 0, s.z), height: 1.0, verb: x.verb,
        onInteract: () => dialogue.start(x.conv) });
    }
    for (const s of world.areas.street.spots.filter((p) => p.name === 'vending')) {
      interactions.add({ id: 'vending', area: 'street', position: new THREE.Vector3(s.x, 0, s.z), height: 1.8, verb: 'Use', onInteract: () => dialogue.start(TALK.vending) });
    }
    for (const b of cast.list) {
      if (b.id === 'juno' || b.id === 'dex') continue;       // Dex is examined, not spoken to
      interactions.add({
        id: b.id, get area() { return b.area; }, position: b.position, height: b.id === 'miso' ? 0.8 : 2, verb: b.id === 'miso' ? 'Pet' : 'Talk',
        onInteract: () => {
          if (b.anim !== 'walk' && b.anim !== 'slump' && !b.follow) b.facing = Math.atan2(player.position.x - b.position.x, player.position.z - b.position.z);
          dialogue.start(conversationFor(b.id, visits[b.id] = (visits[b.id] ?? 0) + 1, { has: (f) => caseFile.has(f), talked: (p) => (visits[p] ?? 0) > 0 })).then(() => afterTalk(b));
        },
      });
    }
  }
  function afterTalk(b) {
    if (b.id === 'miso' && flag('miso_joined') && !b.follow) {   // Beat 2: Miso joins and trails Juno
      b.follow = { target: cast.byId.juno, ...BEATS.misoFollow };
      hud.toast('Miso is following you');
    }
  }

  // ---- Objectives ----
  const spotXZ = (area, name) => { const s = world.spot(area, name); return s ? { x: s.x, z: s.z } : null; };
  const examined = () => EXAMINABLES.filter((x) => x.area === 'sable' && flag(`ex_${x.id}`)).length;
  const sableTotal = EXAMINABLES.filter((x) => x.area === 'sable').length;
  const STEPS = [
    { id: 'down', text: 'Take the stairs down to Lowmarket Street', area: 'street', done: () => flag('visited_street') },
    { id: 'sable', text: 'Find the Sable Noodle House', area: 'sable', done: () => flag('visited_sable') },
    { id: 'back', text: 'Look in the back room', area: 'sable', pos: () => spotXZ('sable', 'backroom'), done: () => flag('seen_backroom') },
    { id: 'examine', text: () => `Examine the scene (${examined()}/${sableTotal})`, area: 'sable',
      pos: () => { // the nearest clue you have not looked at yet
        const left = EXAMINABLES.filter((x) => x.area === 'sable' && !flag(`ex_${x.id}`)).map((x) => spotXZ('sable', x.spot));
        return left.sort((a, b) => Math.hypot(a.x - player.position.x, a.z - player.position.z) - Math.hypot(b.x - player.position.x, b.z - player.position.z))[0];
      }, done: () => examined() >= sableTotal },
    { id: 'echo', text: 'Scan the room for an echo (F)', area: 'sable', pos: () => spotXZ('sable', 'echo'), done: () => caseFile.has('two_voices') && caseFile.has('echo_seam') },
    { id: 'teo', text: 'Question Mama Teo', area: 'sable', pos: () => spotXZ('sable', 'teo'), done: () => caseFile.has('door_unlocked') && caseFile.has('master_keys') },
    { id: 'visitor', text: 'Link the two cups and two voices on the board (B)', area: 'car', done: () => caseFile.has('someone_else') },
    { id: 'override', text: 'Link the visitor, door testimony and auditor access trace (B)', area: 'car', done: () => caseFile.has('auditor_override') },
    { id: 'alley', text: 'Scan the alley; tag Kit at 23:40 and the glove (F)', area: 'alley', pos: () => spotXZ('alley', 'echo'), done: () => caseFile.has('kit_at_2340') && caseFile.has('grey_glove') },
    { id: 'kit', text: 'Question Kit at the hostel; present the 23:40 echo', area: 'hostel', pos: () => spotXZ('hostel', 'kit'), done: () => flag('kit_pressed') },
    { id: 'bureau', text: 'Link auditor access, the glove and the Bureau coat (B)', area: 'car', done: () => caseFile.has('bureau_involved') },
    { id: 'backup', text: 'Recover Dex’s backup beneath the hostel shelf', area: 'hostel', pos: () => spotXZ('hostel', 'backup'), done: () => caseFile.has('backup_chip') },
    { id: 'last', text: 'Return to the car with Dex’s backup', area: 'car', pos: () => spotXZ('car', 'seat'), done: () => false },
  ];
  function markFor(step) {
    const here = world.current.id;
    if (step.area === here) return step.pos?.() ?? null;
    const ex = world.routeExit(here, step.area);
    return ex ? { x: ex.at[0], z: ex.at[1] } : null;
  }

  const api = {
    get locked() { return locked; },
    visits, // talks per person (a save game keeps them)
    get focus() { return focus; },
    setCamera(c) { cam = c; },
    coldOpen,
    // Debug / ?start=<area>: skip the cold open and drop straight into an area.
    skipOpen() { caseFile.setFlag('visited_street'); fade.black = false; hud.show(); },
    register,
    // Called by main whenever the player changes area.
    onEnter(area) {
      caseFile.setFlag(`visited_${area.id}`);
      if (area.id === 'street' && !flag('toasted_street')) { caseFile.setFlag('toasted_street'); hud.toast('Lowmarket Street'); }
    },
    update(dt) {
      for (let i = timers.length - 1; i >= 0; i--) { timers[i].left -= dt; if (timers[i].left <= 0) { timers[i].res(); timers.splice(i, 1); } }
      for (let i = tweens.length - 1; i >= 0; i--) {
        const t = tweens[i]; t.t += dt;
        const u = Math.min(1, t.t / t.s);
        t.fn(u);
        if (u >= 1) { t.res(); tweens.splice(i, 1); }
      }
      // Beat 3 trigger: Juno steps into the back room.
      if (world.current.id === 'sable' && !flag('seen_backroom') && player.position.x > world.current.meta.origin[0] + 2.4) {
        caseFile.setFlag('seen_backroom');
        hud.toast('The scene');
      }
      const step = STEPS.find((s) => !s.done());
      if (!step) { hud.setObjectiveText(''); hud.setObjective(null); return; }
      if (lastStep && lastStep !== step.id && lastStep === 'examine') hud.toast('Scene examined');
      lastStep = step.id;
      if (locked) { hud.setObjectiveText(''); hud.setObjective(null); return; }
      hud.setObjectiveText(typeof step.text === 'function' ? step.text() : step.text);
      hud.setObjective(markFor(step));
    },
  };
  return api;
}
