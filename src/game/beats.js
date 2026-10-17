import * as THREE from 'three';
import { EXAMINABLES, TALK, FALLBACK, ENTRIES, BOARD, MAIL, conversationFor } from './story.js';
import { rng } from '../core/rng.js';

// The beat manager: the cold open cutscene, the objective line / minimap mark, and the things you can interact with.
// Beats 1-3 live here (Stage 9A); later beats add steps to STEPS and conversations to story.js.
export const BEATS = {
  fixerLeave: 2.0,     // seconds the fixer takes to walk out of the shop
  driveSeconds: 6.5,   // chapter 1 ending: how long the drive to the Exchange sounds (the CHAPTER 2 card is held to match)
  overrideSeconds: 2.4, // the red 'System override' banner before Hale's forced call at the end of chapter 1
  finaleSeconds: 10, finaleGuard: 1.5, // end of chapter 1: how long the fast music plays before it moves on by itself; seconds before a tap can skip it
  trainSeconds: 6.5,      // the train rolling into the platform
  uiAt: 0.9,              // fraction of the zoom after which the UI fades in (quickly, see #hud.on in styles.css)
  zoomDelay: 2,           // seconds after the title card starts before the zoom begins
  zoomSeconds: 3,         // after the title card: the CRT frame zooms away and the VHS noise fades out
  settle: 1.5,            // seconds Juno stands still before the title card, so the camera is centred on her
  boothRange: 3.0,     // vendors in the Echo Exchange stand behind a counter
  talkRange: { mamaTeo: 3.0, prisoner: 3.0 }, // bigger Talk reach for people behind a counter (default INTERACT.range 1.6)
  kitStreet: { x: 8.8, z: 3.3, facing: 0 }, // where the worker stands on the street (hostel side, near its door) until the key deduction (then he is at the hostel desk)
  patrol: { speed: 1.0, pause: 2.2 },   // chapter 3: the auditors pacing the desk aisles (local station coordinates)
  routes: { aud1: [[-12, 0.5], [4.5, 0.5]], aud2: [[4.5, 4.7], [-5, 4.7]], aud3: [[-4.5, -3.1], [5.5, -3.1]] },
  callWalk: 3.6,          // seconds the auditors take to hurry out of the station after the fake threat
  ringEvery: 4,           // seconds between rings while Juno's phone waits to be answered
  cardHold: 2.4,          // title card hold, seconds
  mislaid: 0.6,           // pause before Juno steps out
  misoFollow: { dist: 1.5, speed: 2.6 },
  reveal: { from: 3.2, seconds: 1.3, yaw: -Math.PI / 2 + 0.38, at: [156.0, 0.4] }, // Dex's backup: from echo second `from`, the camera swings round (over `seconds`) to Juno's front, ending just before the stinger at 4.6 s. yaw = her facing + a little, so Dex doesn't stand in front of her; at = where her ghost stands
  dark: { exposure: 0.06, lampsFrom: 0.3 }, // the opening starts almost black; station lamps fade up once the train is 30% of the way in
};

export function createBeats({ terminal, input, world, cast, caseFile, dialogue, hud, interactions, fade, sfx, player, clock, echo, deadHour = () => {}, endDeadHour = () => {}, trainSteam = () => {}, setExposure = () => {}, setVhs = () => {}, setCrt = () => {} }) {
  const timers = [], tweens = [];
  let ringing = null, answerWait = null, callHint = 0;                          // the intro phone: ring loop + the pending answer
  const callEl = document.createElement('div'); callEl.className = 'callprompt'; document.body.appendChild(callEl);
  const visits = {}; // how many times Juno has talked to each person (picks the conversation, see story.js VISITS)
  const flag = (n) => caseFile.hasFlag(n);
  let locked = false, focus = null, lastStep = '', ending = false, finale = false, chapter1Done = false;
  const beatTimes = [0, 0, 0, 0, 0, 0, 0]; // seconds spent per beat (debug panel)
  const STEP_BEAT = { down: 1, sable: 2, back: 3, examine: 3, echo: 4, teo: 5, deduce: 5, teo2: 5, kit: 5, capsule: 5, alley: 5, kitecho: 5, teo3: 5, board2: 6, kit2: 6, kitbreak: 6, press: 6, chip: 7 };
  // Debug 'skip to beat N': the flags and case file entries a player would hold when beat N starts (cumulative), then jump there.
  const SKIP = {
    2: { flags: ['visited_street'], to: 'street' },
    3: { flags: ['visited_sable'], to: 'sable' },
    4: { flags: ['seen_backroom', 'ex_body', 'ex_port', 'ex_cups', 'ex_terminal', 'ex_lamp'], add: ['burned_port'], to: 'sable' },
    5: { add: ['teo_back_room', 'two_voices'], to: 'sable' },
    6: { flags: ['teo_met', 'teo_cracked', 'teo_pointed', 'key_deduced', 'teo_asked_door', 'ex_glove', 'kit_paid', 'ex_capsule', 'kit_named'], add: ['mamaTeo', 'door_unlocked', 'someone_had_key', 'alley_echo', 'gloved_hand', 'kit_echo', 'kit_outside', 'kit_name'], to: 'car' },
    7: { flags: ['kit_deduced', 'kit_named', 'kit_met', 'kit_broken', 'kit_coat'], add: ['kit', 'kit_name', 'override_used', 'kit_alley', 'kit_saw_them'], to: 'car' },
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
    trainSteam();                                              // the train has stopped: puffs of steam from its back end
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
    player.setPose('listening');                                // she stands listening during the title card and Hale's call
    const card = fade.card([{ text: 'CASE 01  LOWMARKET', color: '#1fd6e8', scale: 2, corner: 'glass' }], BEATS.cardHold);
    await wait(BEATS.zoomDelay);                                // the zoom starts while the title words are still on screen
    let uiOn = false;
    ringing = { t: 0 }; sfx.phoneRing?.();                      // Hale is calling while the picture zooms out; it keeps ringing until Juno answers
    await tween(BEATS.zoomSeconds, (u) => { // the monitor frame zooms out to the full game and the tape noise fades; the UI only fades in as the zoom nears its end
      const k = 1 - smooth(u); fade.cardZoom(u); setCrt(k); setVhs(k);
      if (!uiOn && u >= BEATS.uiAt) { uiOn = true; hud.show(); }
    });
    await card;
    hud.show();
    // Every input answers: tap (touch), click (mouse), Space / Enter (keyboard), A / cross (gamepad). The wording follows the last device used and refreshes if she switches.
    const how = () => (input.lastDevice === 'touch' ? 'Tap to answer' : input.lastDevice === 'gamepad' ? `Press ${input.padType === 'playstation' ? '\u00d7' : 'A'} to answer` : 'Click or press SPACE to answer');
    callEl.textContent = `\ud83d\udcde Incoming call: Hale. ${how()}`; callEl.classList.add('on'); callEl.onpointerdown = () => api.answerCall();
    callHint = setInterval(() => { callEl.textContent = `\ud83d\udcde Incoming call: Hale. ${how()}`; }, 400);
    await new Promise((res) => { answerWait = res; });          // nothing else is possible until she answers
    clearInterval(callHint); callEl.onpointerdown = null; callEl.classList.remove('on'); ringing = null; sfx.phoneAnswer?.();                  // Juno picks up
    await wait(0.5);
    await dialogue.start('hale_open');                          // Hale on comms
    player.setPose(null);
    locked = false;
  }
  let cam = null;

  // Resolves on any tap, click, key or pad button (after BEATS.finaleGuard seconds), or after maxSeconds (Infinity = wait for the player).
  const anyInput = (maxSeconds) => new Promise((res) => {
    let raf = 0, tm = 0;
    const done = () => { window.removeEventListener('pointerdown', skip, true); window.removeEventListener('keydown', skip, true); cancelAnimationFrame(raf); clearTimeout(tm); res(); };
    const t0 = performance.now(), skip = () => { if (performance.now() - t0 > BEATS.finaleGuard * 1000) done(); };
    const poll = () => { if ([...(navigator.getGamepads?.() ?? [])].some((p) => p?.buttons.some((b) => b.pressed))) skip(); raf = requestAnimationFrame(poll); };
    window.addEventListener('pointerdown', skip, true); window.addEventListener('keydown', skip, true); poll();
    if (Number.isFinite(maxSeconds)) tm = setTimeout(done, maxSeconds * 1000);
  });

  // ---- Beat 7: the cliffhanger ----
  async function cliffhanger() {
    locked = true;
    await dialogue.start('chip_open');
    const juno = cast.byId.juno, home = [player.position.x, player.position.z, juno.facing], room = world.spot('sable', 'backroom');
    await world.enter('sable', [room.x, room.z, 0]);                  // the echo plays in the back room where Dex died, not in the car
    const R = BEATS.reveal, yaw0 = cam.yaw, turn = Math.atan2(Math.sin(R.yaw - yaw0), Math.cos(R.yaw - yaw0)); // shortest way round
    const played = new Promise((res) => echo.start('dex_backup', res));   // Dex's backup, from his eyes
    wait(R.from).then(async () => {
      focus = new THREE.Vector3(R.at[0], 0, R.at[1]);                 // frame the spot where Juno will appear
      await tween(R.seconds, (u) => cam.set({ yaw: yaw0 + turn * u * u * (3 - 2 * u) }));
    });
    await played;
    focus = null; cam.set({ yaw: yaw0 });                           // back to the player's view
    await world.enter('car', home);                                  // and back to the car
    await wait(0.9);
    await fade.log();                                            // the red 47-minute gap
    await dialogue.start('log_open');
    deadHour(); ending = true;                                   // signs die, music cuts to one low tone
    await wait(2.5);
    await dialogue.start('self_doubt');                          // Juno to herself
    await wait(1.2);
    // Hale forces the call through: no answering this time, a red override banner and urgent beeps, then her voice.
    callEl.textContent = '⚠ SYSTEM OVERRIDE - INCOMING COMMUNICATION'; callEl.classList.add('on', 'override');
    sfx.override?.(BEATS.overrideSeconds); await wait(BEATS.overrideSeconds);
    callEl.classList.remove('on', 'override');
    await wait(0.3);
    await dialogue.start('hale_end');
    await wait(0.4);                                             // chapter 1 ends on Hale's "Juno!": straight to black
    await fade.out();
    endDeadHour(); ending = false; finale = true;                // cut to black: the low tone ends, the fast hard music starts
    fade.card([{ text: 'NEON ECHOES', color: '#ffffff', scale: 6 }, { text: 'CASE 01 CONTINUES', color: '#1fd6e8', scale: 3 }, { text: 'TAP OR PRESS ANY BUTTON', color: '#8a8aa8', scale: 2 }], Infinity);
    await anyInput(BEATS.finaleSeconds);                         // BEATS.finaleSeconds of music, or any tap, click, key or pad button after BEATS.finaleGuard
    await fade.hideCard(0.4);                                    // quick fade to black
    finale = false;                                              // the car's own quiet music comes back; she is still in the car
    await fade.in();
    await dialogue.start('car_reply');                           // chapter 2 opens: Juno answers Hale, not coming in yet
    await dialogue.start('car_decide');                          // she decides: the Echo Exchange
    chapter1Done = true; caseFile.setFlag('chapter1_done');
    await wait(0.6);
    await fade.out();
    sfx.carDrive?.(BEATS.driveSeconds);                          // over black: she drives to the Exchange
    const sp = world.spot('exchange', 'start');
    world.jump('exchange', [sp.x, sp.z, Math.PI / 2]);           // while the screen is black
    await fade.card([{ text: 'CHAPTER 2', color: '#ff8a1f', scale: 6 }, { text: 'THE ECHO EXCHANGE', color: '#ffd23a', scale: 3 }], BEATS.driveSeconds - 3.6); // held so the drive sound plays out under it
    await fade.in();
    locked = false;
  }

  // ---- Chapter 2 ending: Locker 9, the fixer's offer, the auditors ----
  // Opens Locker 9: Dex's hidden echo plays (a teaser), the fixer steps in and offers a deal, Juno walks out into three auditors, and the chapter ends.
  async function dealerScene() {
    locked = true;
    await dialogue.start('locker_open');
    await new Promise((res) => echo.start('dex_secret', res));
    caseFile.setFlag('locker_done');
    await wait(0.6);
    const fixer = cast.byId.fixer, j = cast.byId.juno;
    fixer.away = false; cast.apply();
    fixer.facing = Math.atan2(player.position.x - fixer.position.x, player.position.z - fixer.position.z);
    j.facing = Math.atan2(fixer.position.x - player.position.x, fixer.position.z - player.position.z);
    await wait(0.8);
    await dialogue.start('fixer_deal');
    // He has said his piece: he walks out through the door and is gone, and Juno talks to herself about him and says she is ready for Hale.
    const door = world.spot('dealer', 'door');
    fixer.anim = 'walk'; fixer.facing = Math.atan2(door.x - fixer.position.x, door.z - fixer.position.z);
    const f0 = { x: fixer.position.x, z: fixer.position.z };
    await tween(BEATS.fixerLeave, (u) => { fixer.position.x = f0.x + (door.x - f0.x) * u; fixer.position.z = f0.z + (door.z - f0.z) * u; });
    fixer.anim = 'idle'; fixer.away = true; cast.apply();
    await wait(0.6);
    await dialogue.start('after_fixer');
    caseFile.setFlag('fixer_done');
    locked = false;                                              // the player walks out of the shop; the dealer-out door runs outsideScene
  }

  // Back outside the shop: the auditors are waiting. The serious music (the one from the end of chapter 1) plays from here on.
  async function outsideScene() {
    locked = true;
    await fade.out();
    finale = true;
    const out = world.exits.find((e) => e.id === 'dealer-out').spawn;
    world.jump('exchange', out);                                 // out of the shop, while the screen is black
    for (const id of ['aud1', 'aud2', 'aud3']) cast.byId[id].away = false;
    cast.apply();
    await fade.in();
    await wait(0.8);
    await dialogue.start('auditors');
    caseFile.setFlag('auditors_done');
    await bureauArrival();
  }

  // Chapter 3: auditors pace their aisles until Juno phones in a fake threat; the desk computers, the lab keypad and the fake call.
  const patrols = [];
  function startPatrol(npc, route) { npc.follow = null; patrols.push({ npc, route, i: 1, pause: 0 }); }
  function updatePatrols(dt) {
    if (flag('aud_gone') || locked || dialogue.active) { for (const p of patrols) if (p.npc.anim === 'walk') p.npc.anim = 'idle'; return; }
    const [ox, oz] = origin('bureau');
    for (const p of patrols) {
      if (p.pause > 0) { p.pause -= dt; p.npc.anim = 'idle'; continue; }
      const [tx, tz] = p.route[p.i], dx = ox + tx - p.npc.position.x, dz = oz + tz - p.npc.position.z, d = Math.hypot(dx, dz);
      if (d < 0.15) { p.i = (p.i + 1) % p.route.length; p.pause = BEATS.patrol.pause; continue; }
      const step = Math.min(d, BEATS.patrol.speed * dt);
      p.npc.position.x += dx / d * step; p.npc.position.z += dz / d * step; p.npc.facing = Math.atan2(dx, dz); p.npc.anim = 'walk';
    }
  }
  const fillers = (() => { const r = rng.fork('mail'), a = [...MAIL.filler]; for (let i = a.length - 1; i > 0; i--) { const j = r.int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  function useComputer(n) {
    if (locked) return;
    if (!flag('aud_gone')) { dialogue.start('aud_block').then(() => { if (flag('make_call') && !flag('aud_gone')) fakeCall(); }); return; }
    const ranks = [1, 2, 3, 4], have = (k) => ranks.find((r) => flag(`pc${k}_r${r}`));
    let rank = have(n);
    if (!rank) { rank = 1 + ranks.filter((k) => have(k)).length; caseFile.setFlag(`pc${n}_r${rank}`); }   // the 1st and 2nd computer she opens are filler, the 3rd always holds the code
    const mail = rank === 3 ? MAIL.code : fillers[n - 1];
    terminal.mail(mail.owner, mail.items).then(() => { if (rank === 3 && !flag('lab_code_found')) dialogue.start('code_found'); });
  }
  async function fakeCall() {
    locked = true;
    await dialogue.start('fake_call');
    const fd = world.spot('bureau', 'frontdoor'), auds = ['aud1', 'aud2', 'aud3'].map((id) => cast.byId[id]);
    patrols.length = 0;
    const from = auds.map((a) => [a.position.x, a.position.z]);
    await tween(BEATS.callWalk, (u) => auds.forEach((a, i) => {
      const x = from[i][0] + (fd.x + (i - 1) * 0.8 - from[i][0]) * u, z = from[i][1] + (fd.z - from[i][1]) * u;
      a.facing = Math.atan2(x - a.position.x, z - a.position.z) || a.facing; a.position.x = x; a.position.z = z; a.anim = 'walk';
    }));
    auds.forEach((a) => { a.away = true; a.anim = 'idle'; });
    cast.apply();
    caseFile.setFlag('aud_gone');
    locked = false;
  }
  // The lab door is a doorway in the wall that the story keeps shut: a slab mesh plus solid cells in the collision grid, until the code is typed.
  let labState = null;
  function syncLabDoor() {
    const open = flag('lab_open');
    if (open === labState) return;
    labState = open;
    const a = world.areas.bureau, g = a.collision?.grid, [ox, oz] = origin('bureau');
    a.labDoor.visible = !open; a.labLed.material.color.set(open ? 0x5cf0a0 : 0xff3b4c);
    if (!g) return;
    for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) {
      const cx = g.x0 + (i + 0.5) * g.cell, cz = g.z0 + (j + 0.5) * g.cell;
      if (cx > ox + 6.5 && cx < ox + 7.5 && cz > oz + 5.4 && cz < oz + 6.6) g.solid[j * g.nx + i] = open ? 0 : 1;
    }
  }
  async function labKeypad() {
    if (locked || flag('lab_open')) return;
    if (!flag('lab_code_found')) { dialogue.start('lab_sealed'); return; }
    if (await terminal.keypad('Memory-audit lab', MAIL.code.items[0].body.match(/\{\{(\d+)\}\}/)[1])) caseFile.setFlag('lab_open');
  }

  // Chapter 3: the three auditors walk Juno straight through the station to Hale's office. Slow, serious music (the area's own); the auditors stop at the office door.
  const origin = (id) => world.areas[id].meta.origin;
  async function bureauArrival() {
    locked = true;
    await fade.out();
    finale = false;
    const [ox, oz] = origin('bureau'), at = (x, z) => [ox + x, oz + z], juno = cast.byId.juno, auds = ['aud1', 'aud2', 'aud3'].map((id) => cast.byId[id]);
    const st = world.spot('bureau', 'start');
    world.jump('bureau', [st.x, st.z, 0]);                       // Juno at the entrance (while the screen is black)
    auds.forEach((a, i) => { a.area = 'bureau'; a.away = false; a.anim = 'idle'; a.position.set(st.x + (i - 1) * 1.1, 0, st.z + 1.0 + (i === 1 ? 0.5 : 0)); a.facing = Math.PI; a.follow = { target: juno, dist: 1.5 + i * 0.7, speed: 3.2 }; });
    cast.apply();
    cam.follow(player.position, true);
    await fade.card([{ text: 'CHAPTER 3', color: '#1fd6e8', scale: 6 }, { text: 'THE BUREAU', color: '#ffffff', scale: 3 }], 1.2);
    await fade.in();
    await wait(0.6);
    const leg = (x, z, max = 9) => { const [wx, wz] = at(x, z); return Promise.race([new Promise((res) => player.walkTo(new THREE.Vector3(wx, 0, wz), 0.4, res)), wait(max)]); }; // a leg gives up after `max` s if she snags
    await leg(0.25, -3.2);                                       // up the middle aisle
    await leg(6.2, -3.2);                                        // east along the clear aisle between the desk rows
    await leg(6.2, -5.9);                                        // to Hale's door
    await leg(9.4, -5.9);                                        // into the office
    auds.forEach((a, i) => { a.follow = null; a.anim = 'idle'; const [x, z] = at(5.2 + (i === 2 ? -1 : 0), -5.9 + (i - 1) * 1.1); a.position.set(x, 0, z); a.facing = Math.PI / 2; });
    juno.facing = Math.PI / 2;
    caseFile.setFlag('bureau_arrived');
    await wait(0.4);
    await dialogue.start('hale_office');
    auds.forEach((a, i) => { const r = BEATS.routes[a.id], [x, z] = at(...r[0]); a.position.set(x, 0, z); startPatrol(a, r); });   // told to wait outside: they go back to pacing the desks
    caseFile.setFlag('hale_met');
    locked = false;                                              // the station is hers to walk
  }

  // Chapter 3 end: the front door is locked until Juno has put the clues together (flag bureau_deduced); then she slips out and Hale will come after her.
  async function bureauSlip() {
    if (locked) return;
    if (!flag('bureau_deduced')) { dialogue.start('bureau_locked'); return; }
    locked = true;
    await dialogue.start('bureau_slip');
    caseFile.setFlag('hale_hunting');
    await fade.out();
    fade.card([{ text: 'END OF CHAPTER 3', color: '#ffffff', scale: 5 }, { text: 'CHAPTER 4: LOWMARKET AT DAWN - COMING SOON', color: '#1fd6e8', scale: 3 }, { text: 'TAP OR PRESS ANY BUTTON', color: '#8a8aa8', scale: 2 }], 3600);
    await wait(BEATS.finaleGuard);
    await anyInput(Infinity);
    location.reload();                                           // back to the title screen
  }

  // ---- Interactables: doors, clues, people ----
  function register() {
    for (const e of world.exits) {
      interactions.add({ id: e.id, area: e.area, position: new THREE.Vector3(e.at[0], 0, e.at[1]), height: 1.2, verb: e.verb,
        onInteract: () => { if (e.id === 'dealer-door' && !flag('dealer_open')) dialogue.start('dealer_locked'); else if (e.id === 'dealer-out' && flag('fixer_done') && !flag('auditors_done')) { if (!locked) outsideScene(); } else world.enter(e.to, e.spawn); } }); // the dealer's door stays shut until the locker deduction
    }
    for (const id of ['fixer', 'aud1', 'aud2', 'aud3']) cast.byId[id].away = true; // scripted people appear only in their scenes
    for (const x of EXAMINABLES) {
      const s = world.spot(x.area, x.spot);
      interactions.add({ id: `ex:${x.id}`, area: x.area, position: new THREE.Vector3(s.x, 0, s.z), height: 1.0, verb: x.verb,
        onInteract: () => dialogue.start(x.conv) });
    }
    for (const s of world.areas.street.spots.filter((p) => p.name === 'vending')) {
      interactions.add({ id: 'vending', area: 'street', position: new THREE.Vector3(s.x, 0, s.z), height: 1.8, verb: 'Use', onInteract: () => dialogue.start(TALK.vending) });
    }
    const lk = world.spot('dealer', 'locker');                // Dex's locker: the dealer must have seen the receipt first (flag locker_ok)
    interactions.add({ id: 'locker9', area: 'dealer', position: new THREE.Vector3(lk.x, 0, lk.z), height: 1.2, verb: 'Open Locker 9',
      onInteract: () => { if (locked || flag('locker_done')) return; if (flag('locker_ok')) dealerScene(); else dialogue.start('locker_shut'); } });
    for (const n of [7, 8, 10, 11]) {                         // the other lockers: not Juno's business
      const l = world.spot('dealer', `locker${n}`);
      interactions.add({ id: `locker${n}`, area: 'dealer', position: new THREE.Vector3(l.x, 0, l.z), height: 1.2, verb: `Look at Locker ${n}`, onInteract: () => { if (!locked) dialogue.start(`locker_${n}`); } });
    }
    for (let n = 1; n <= 4; n++) {                              // desk computers Juno can snoop on (chapter 3)
      const c = world.spot('bureau', `pc${n}`);
      interactions.add({ id: `pc${n}`, area: 'bureau', position: new THREE.Vector3(c.x, 0, c.z), height: 1.0, verb: 'Use the computer', onInteract: () => useComputer(n) });
    }
    const ld = world.spot('bureau', 'labdoor');
    interactions.add({ id: 'labdoor', area: 'bureau', position: new THREE.Vector3(ld.x, 0, ld.z), height: 1.2, verb: 'Use the keypad', onInteract: labKeypad });
    syncLabDoor();
    const fd = world.spot('bureau', 'frontdoor');                // the Bureau's front door: locked until the deduction, then Juno slips out
    interactions.add({ id: 'bureau_door', area: 'bureau', position: new THREE.Vector3(fd.x, 0, fd.z), height: 1.2, verb: 'Try the door', onInteract: () => bureauSlip() });
    const seat = world.spot('car', 'seat');
    interactions.add({ id: 'chip', area: 'car', position: new THREE.Vector3(seat.x, 0, seat.z), height: 1.0, verb: "Slot Dex's chip",
      onInteract: () => { if (locked) return; if (flag('kit_coat') && flag('ex_capsule')) cliffhanger(); else dialogue.start('chip_early'); } });
    for (const b of cast.list) {
      if (b.id === 'juno' || b.id === 'dex' || b.ambient) continue;       // Dex is examined, not spoken to
      interactions.add({
        id: b.id, get area() { return b.area; }, position: b.position, range: BEATS.talkRange[b.id] ?? (b.booth ? BEATS.boothRange : undefined), height: b.id === 'miso' ? 0.8 : 2, verb: b.id === 'miso' ? 'Pet' : 'Talk',
        onInteract: () => {
          if (b.anim !== 'walk' && b.anim !== 'slump' && !b.follow) b.facing = Math.atan2(player.position.x - b.position.x, player.position.z - b.position.z);
          dialogue.start(conversationFor(b.id, visits[b.id] = (visits[b.id] ?? 0) + 1, { has: (f) => caseFile.has(f), talked: (p) => (visits[p] ?? 0) > 0, flag })).then(() => afterTalk(b));
        },
      });
    }
  }
  // The worker stands on the street until the key deduction (the Sable clues put together), then he is at the hostel desk.
  let kitPlace = null;
  function placeKit() {
    const b = cast.byId.kit, at = flag('key_deduced') ? 'hostel' : 'street';
    if (!b || kitPlace === at) return;
    kitPlace = at;
    const h = at === 'hostel' ? world.spot('hostel', 'kit') : BEATS.kitStreet;
    if (!h) return;
    b.area = at; b.position.set(h.x, b.position.y, h.z); b.facing = h.facing ?? 0;
    cast.apply();
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
    { id: 'teo3', text: 'Ask Mama Teo who the worker in the alley is', area: 'sable', pos: () => spotXZ('sable', 'teo'), done: () => caseFile.has('kit_name') },
    { id: 'board2', text: 'Link the evidence on the board (B): who was in the alley?', get area() { return world.current.id; }, done: () => flag('kit_deduced') },
    { id: 'kit2', text: 'Go back to the capsule hostel and talk to the worker', area: 'hostel', pos: () => spotXZ('hostel', 'kit'), done: () => flag('kit_met') },
    { id: 'kitbreak', text: 'Present the alley echo to Kit', area: 'hostel', pos: () => spotXZ('hostel', 'kit'), done: () => flag('kit_broken') },
    { id: 'press', text: 'Press Kit about what he saw', area: 'hostel', pos: () => spotXZ('hostel', 'kit'), done: () => flag('kit_coat') },
    { id: 'chip', text: "Slot Dex's backup chip in your car", area: 'car', pos: () => spotXZ('car', 'seat'), done: () => chapter1Done },
    { id: 'exchange', text: "Ask around the Echo Exchange about Dex's echo", area: 'exchange', done: () => flag('dealer_open') },
    { id: 'dealer', text: "Go into the implant dealer's shop", area: 'exchange', pos: () => spotXZ('exchange', 'dealerDoor'), done: () => flag('visited_dealer') },
    { id: 'locker', text: "Show the dealer Dex's receipt, then open Locker 9", area: 'dealer', pos: () => spotXZ('dealer', flag('locker_ok') ? 'locker' : 'dealer'), done: () => flag('locker_done') },
    { id: 'out', text: 'Leave the shop', area: 'dealer', pos: () => spotXZ('dealer', 'door'), done: () => flag('auditors_done') },
    { id: 'hale', text: 'Face Hale in her office', area: 'bureau', pos: () => spotXZ('bureau', 'hale'), done: () => flag('hale_met') },
    { id: 'station', text: () => (flag('lab_open') ? 'Find out what the Bureau has done to you' : flag('lab_code_found') ? 'Open the memory-audit lab (the keypad, east side)' : flag('aud_gone') ? 'Search the desk computers for the lab code' : 'Get the auditors away from the desks'), area: 'bureau', done: () => flag('bureau_deduced') },
    { id: 'slip', text: 'Slip out through the front door', area: 'bureau', pos: () => spotXZ('bureau', 'frontdoor'), done: () => false },
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
    get calling() { return !!answerWait; },                       // Hale's call at the start is waiting to be answered
    answerCall() { answerWait?.(); answerWait = null; },
    get ending() { return ending; },
    get finale() { return finale; },
    get beatNo() { return STEP_BEAT[STEPS.find((s) => !s.done())?.id] ?? 7; },
    beatTimes,
    cliffhanger, bureauArrival, // also for the ?hooks test driver
    dealerScene, outsideScene, // debug panel: play the chapter 2 ending
    // Debug. n = 2-7: start of chapter 1 beat n, with every clue Juno would hold by then. 8: Chapter 2 start (all chapter 1 clues). 9: Exchange with all six vendor clues.
    // 10: Exchange with every chapter 2 deduction done (dealer door open).
    skipTo(n) {
      caseFile.setFlag('visited_street'); fade.black = false; hud.show(); ending = finale = false;
      for (let k = 2; k <= Math.min(n, 7); k++) { SKIP[k].flags?.forEach((f) => caseFile.setFlag(f)); SKIP[k].add?.forEach((id) => caseFile.add(id)); }
      if (n < 8) { const e = world.exits.find((x) => x.to === SKIP[n].to); world.jump(SKIP[n].to, e ? e.spawn : null); return; }
      chapter1Done = true; caseFile.setFlag('chapter1_done');
      if (n >= 9) {
        for (const [id, e] of Object.entries(ENTRIES)) if (e.ch2 && e.source !== 'Deduction board') caseFile.add(id);
        for (const v of Object.values(TALK)) if (v.startsWith('vend_')) caseFile.setFlag(v);
      }
      if (n >= 10) for (const c of BOARD.conclusions) if (c.needs.every((f) => ENTRIES[f]?.ch2)) caseFile.apply(c.effects);
      const sp = world.spot('exchange', 'start');
      world.jump('exchange', [sp.x, sp.z, Math.PI / 2]);
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
      placeKit();
      syncLabDoor(); updatePatrols(dt);
      if (ringing && (ringing.t += dt) >= BEATS.ringEvery) { ringing.t = 0; sfx.phoneRing?.(); }
      if (answerWait && (input.pressed('interact') || input.click)) api.answerCall();
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
