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

export function createBeats({ world, cast, caseFile, dialogue, hud, interactions, fade, sfx, player, clock, echo, deadHour = () => {}, setExposure = () => {}, setVhs = () => {}, setCrt = () => {} }) {
  const timers = [], tweens = [];
  const visits = {}; // how many times Juno has talked to each person (picks the conversation, see story.js VISITS)
  const flag = (n) => caseFile.hasFlag(n);
  let locked = false, focus = null, lastStep = '', ending = false, finale = false;
  const beatTimes = [0, 0, 0, 0, 0, 0, 0]; // seconds spent per beat (debug panel)
  const STEP_BEAT = { down: 1, sable: 2, back: 3, examine: 3, echo: 4, teo: 5, deduce: 5, teo2: 5, kit: 5, capsule: 5, alley: 5, kitecho: 5, board2: 6, kit2: 6, kitbreak: 6, press: 6, chip: 7 };
  // Debug 'skip to beat N': the flags and case file entries a player would hold when beat N starts (cumulative), then jump there.
  const SKIP = {
    2: { flags: ['visited_street'], to: 'street' },
    3: { flags: ['visited_sable'], to: 'sable' },
    4: { flags: ['seen_backroom', 'ex_body', 'ex_port', 'ex_cups', 'ex_terminal', 'ex_lamp'], add: ['dex_body', 'burned_port', 'two_cups', 'door_log', 'smashed_lamp'], to: 'sable' },
    5: { add: ['teo_back_room', 'two_voices', 'echo_seam'], to: 'sable' },
    6: { flags: ['teo_met', 'teo_cracked', 'teo_pointed', 'key_deduced', 'teo_asked_door', 'ex_glove', 'kit_paid', 'ex_capsule'], add: ['mamaTeo', 'door_unlocked', 'master_keys', 'someone_had_key', 'grey_glove', 'alley_echo', 'gloved_hand', 'dex_chip', 'kit_echo', 'kit_outside'], to: 'car' },
    7: { flags: ['kit_deduced', 'kit_named', 'kit_met', 'kit_broken', 'kit_coat'], add: ['kit', 'kit_claim', 'someone_else', 'override_used', 'kit_saw_them', 'bureau_coat'], to: 'car' },
  };

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
    const card = fade.card([{ text: 'CASE 01  LOWMARKET', color: '#1fd6e8', scale: 2, corner: 'glass' }], BEATS.cardHold);
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

  // ---- Beat 7: the cliffhanger ----
  async function cliffhanger() {
    locked = true;
    await dialogue.start('chip_open');
    await new Promise((res) => echo.start('dex_backup', res));   // Dex's backup, from his eyes
    await wait(0.9);
    await fade.log();                                            // the red 47-minute gap
    await dialogue.start('log_open');
    deadHour(); ending = true;                                   // signs die, music cuts to one low tone
    await wait(2.5);
    await dialogue.start('self_doubt');                          // Juno to herself
    await wait(1.2);
    sfx.comms?.();                                               // Hale calls
    await wait(0.9);
    await dialogue.start('hale_end');
    await wait(1.2);
    await fade.out();
    finale = true;                                               // the end card: fast, hard music
    fade.card([{ text: 'NEON ECHOES', color: '#ffffff', scale: 6 }, { text: 'CASE 01 CONTINUES', color: '#1fd6e8', scale: 3 }, { text: 'TAP OR PRESS ANY BUTTON', color: '#8a8aa8', scale: 2 }], 3600); // stays up
    await wait(2.5);                                             // a moment, so a stray tap does not skip it
    await new Promise((res) => {                                 // any tap, key or pad button
      let raf = 0;
      const done = () => { window.removeEventListener('pointerdown', done, true); window.removeEventListener('keydown', done, true); cancelAnimationFrame(raf); res(); };
      const poll = () => { if ([...(navigator.getGamepads?.() ?? [])].some((p) => p?.buttons.some((b) => b.pressed))) return done(); raf = requestAnimationFrame(poll); };
      window.addEventListener('pointerdown', done, true); window.addEventListener('keydown', done, true); poll();
    });
    location.reload();                                           // back to the title screen
  }

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
    const seat = world.spot('car', 'seat');
    interactions.add({ id: 'chip', area: 'car', position: new THREE.Vector3(seat.x, 0, seat.z), height: 1.0, verb: "Slot Dex's chip",
      onInteract: () => { if (locked) return; if (flag('kit_coat') && flag('ex_capsule')) cliffhanger(); else dialogue.start('chip_early'); } });
    for (const b of cast.list) {
      if (b.id === 'juno' || b.id === 'dex') continue;       // Dex is examined, not spoken to
      interactions.add({
        id: b.id, get area() { return b.area; }, position: b.position, height: b.id === 'miso' ? 0.8 : 2, verb: b.id === 'miso' ? 'Pet' : 'Talk',
        onInteract: () => {
          if (b.anim !== 'walk' && b.anim !== 'slump' && !b.follow) b.facing = Math.atan2(player.position.x - b.position.x, player.position.z - b.position.z);
          dialogue.start(conversationFor(b.id, visits[b.id] = (visits[b.id] ?? 0) + 1, { has: (f) => caseFile.has(f), talked: (p) => (visits[p] ?? 0) > 0, flag })).then(() => afterTalk(b));
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
    { id: 'echo', text: 'Scan the room for an echo (F)', area: 'sable', pos: () => spotXZ('sable', 'echo'), done: () => caseFile.has('teo_back_room') },
    { id: 'teo', text: 'Question Mama Teo', area: 'sable', pos: () => spotXZ('sable', 'teo'), done: () => flag('teo_asked_door') },
    // The board comes before the next lead: link the back-door clues, then tell Teo what they mean, and only then go to the hostel.
    { id: 'deduce', text: 'Open the deduction board (B) and link the clues about the back door', get area() { return world.current.id; }, done: () => flag('key_deduced') },
    { id: 'teo2', text: 'Tell Mama Teo what you worked out', area: 'sable', pos: () => spotXZ('sable', 'teo'), done: () => flag('teo_pointed') },
    { id: 'kit', text: 'Ask around the capsule hostel about Dex', area: 'hostel', pos: () => spotXZ('hostel', 'kit'), done: () => flag('kit_paid') },
    { id: 'capsule', text: "Search Dex's capsule (3F)", area: 'hostel', pos: () => spotXZ('hostel', 'capsule3f'), done: () => flag('ex_capsule') },
    { id: 'alley', text: 'Scan the alley behind the Sable (F)', area: 'alley', pos: () => spotXZ('alley', 'echo'), done: () => caseFile.has('alley_echo') },
    { id: 'kitecho', text: "Scan the alley again for the worker's echo (F)", area: 'alley', pos: () => spotXZ('alley', 'echo'), done: () => caseFile.has('kit_echo') },
    { id: 'board2', text: 'Link the evidence on the board (B): who was in the alley?', get area() { return world.current.id; }, done: () => flag('kit_deduced') },
    { id: 'kit2', text: 'Go back to the capsule hostel and talk to the worker', area: 'hostel', pos: () => spotXZ('hostel', 'kit'), done: () => flag('kit_met') },
    { id: 'kitbreak', text: 'Present the alley echo to Kit', area: 'hostel', pos: () => spotXZ('hostel', 'kit'), done: () => flag('kit_broken') },
    { id: 'press', text: 'Press Kit about what he saw', area: 'hostel', pos: () => spotXZ('hostel', 'kit'), done: () => flag('kit_coat') },
    { id: 'chip', text: "Slot Dex's backup chip in your car", area: 'car', pos: () => spotXZ('car', 'seat'), done: () => ending },
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
    get ending() { return ending; },
    get finale() { return finale; },
    get beatNo() { return STEP_BEAT[STEPS.find((s) => !s.done())?.id] ?? 7; },
    beatTimes,
    cliffhanger, // also for the ?hooks test driver
    skipTo(n) {
      caseFile.setFlag('visited_street'); fade.black = false; hud.show();
      for (let k = 2; k <= n; k++) { SKIP[k].flags?.forEach((f) => caseFile.setFlag(f)); SKIP[k].add?.forEach((id) => caseFile.add(id)); }
      const e = world.exits.find((x) => x.to === SKIP[n].to);
      world.jump(SKIP[n].to, e ? e.spawn : null);
    },
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
      if (!locked) beatTimes[api.beatNo - 1] += dt;
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
