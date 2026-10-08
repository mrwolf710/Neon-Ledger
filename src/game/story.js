import EDITS from './dialogue-edits.json' with { type: 'json' }; // made in /editor.html (dev server): text changes and new conversations, laid over the text below

// Story content as plain data: speakers, people, facts, echoes and conversations. Stage 9 writes content here only.
// The dialogue format is documented in NOTES.md.

export const SPEAKERS = {
  juno: { name: 'Juno', color: '#1fd6e8' },
  mamaTeo: { name: 'Mama Teo', color: '#e0217d' },
  kit: { name: 'Worker', color: '#f2a93b' },
  dex: { name: 'Dex', color: '#8a8a90' },
  vendor: { name: 'Vendor', color: '#2a6b72' },
  miso: { name: 'Miso', color: '#d9771c' },
  vending: { name: 'Vending machine', color: '#9ff4ff' },
  unknown: { name: 'Unknown voice', color: '#e0217d' },
  hale: { name: 'Hale (comms)', color: '#f2a93b' },
  preacher: { name: 'Holo-preacher', color: '#9ff4ff' },
};

// Case file entries. kind decides the tab: people | facts | echoes. source = where Juno learned it.
export const ENTRIES = {
  mamaTeo: { kind: 'people', title: 'Mama Teo', text: 'Runs the Sable Noodle House. Sees everyone who comes and goes.', source: 'Lowmarket Street' },
  teo_back_room: { kind: 'echoes', title: "Mama Teo's echo: the back room", text: "Six seconds from Mama Teo's implant, the night Dex died. Two voices, one of them cut off.", source: "Mama Teo's implant" },
  two_voices: { kind: 'facts', title: 'Two voices in the echo', text: "Mama Teo's echo holds two distinct voices. Only Dex is accounted for.", source: "Echo: Mama Teo's back room, 02.0" },
  echo_seam: { kind: 'facts', title: 'The echo has a seam', text: 'The replay stutters at 03.5. Someone edited this memory.', source: "Echo: Mama Teo's back room, 03.5" },
  dex_body: { kind: 'facts', title: 'Dex slumped at the table', text: 'No wounds and no struggle. Whatever killed him was quiet.', source: 'The back room' },
  burned_port: { kind: 'facts', title: "Dex's implant port is burned out", text: 'The port is scorched, but the skin around it is clean. A burnout from inside would have marked it.', source: 'The back room' },
  two_cups: { kind: 'facts', title: 'Two cups on the table', text: 'Both used, one still warm. Dex had company.', source: 'The back room' },
  door_log: { kind: 'facts', title: 'Back door log: 1 entry, 0 exits', text: 'The terminal logged one person in tonight and nobody out.', source: 'The back room terminal' },
  smashed_lamp: { kind: 'facts', title: 'The corner lamp was smashed', text: 'Glass swept toward the door. Someone wanted the room dark.', source: 'The back room' },
  grey_glove: { kind: 'facts', title: 'A grey Bureau glove', text: 'Left in the alley behind the Sable. Standard Bureau issue, grey.', source: 'The alley' },
  master_keys: { kind: 'facts', title: 'City master keys', text: 'Every door on Lowmarket opens to a city master key held by crews, inspectors and the Bureau. It is written into the leases.', source: 'Mama Teo' },
  someone_had_key: { kind: 'facts', title: 'The visitor had a city key', text: 'A second person met Dex in the back room. They got in without knocking, with a city master key.', source: 'Deduction board' },
  dex_backup: { kind: 'echoes', title: "Dex's backup echo", text: 'The copy Dex hid in his jacket. Nine seconds, his own eyes, a visitor in his back room.', source: "Dex's backup chip" },
  kit: { kind: 'people', title: 'Kit Lacroix', text: "A courier who lives in the capsule hostel. Nervous, talks too much. Says she was Dex's last client.", source: 'Capsule hostel' },
  alley_echo: { kind: 'echoes', title: 'The alley: the back door', text: 'A residue echo in the alley. Someone in a grey glove lets themselves out of the Sable and shuts the door behind them.', source: 'The alley' },
  kit_echo: { kind: 'echoes', title: "Kit's echo: the alley", text: "Eight seconds from Kit's implant, in the alley behind the Sable.", source: "Kit's implant" },
  gloved_hand: { kind: 'facts', title: 'A grey-gloved hand on the back door', text: "In the alley echo a hand in a grey Bureau glove pulls the Sable's back door shut. Same kind of glove as the one on the ground.", source: 'Echo: the alley, 02.0' },
  kit_claim: { kind: 'facts', title: 'Kit says she left at 23:00', text: 'Kit swears she met Dex, got her delivery slip signed and went straight home to the hostel at eleven.', source: 'Kit' },
  kit_outside: { kind: 'facts', title: 'Kit was in the alley at 23:40', text: "Kit's own echo puts her behind the Sable forty minutes after she says she left.", source: "Echo: Kit's alley, 02.5" },
  someone_else: { kind: 'facts', title: 'Someone else was in the room', text: 'Two cups, two voices. Dex was not alone.', source: 'Deduction board' },
  override_used: { kind: 'facts', title: 'The killer used an auditor override', text: 'A burned port with clean skin, a Bureau glove on the door. Only an auditor override burns an implant from outside.', source: 'Deduction board' },
  kit_saw_them: { kind: 'facts', title: 'Kit saw them leave', text: 'Kit was in the alley when the gloved visitor came out of the back door.', source: 'Deduction board' },
  bureau_coat: { kind: 'facts', title: 'The visitor wore a Bureau coat', text: "Kit, pressed: long grey coat, Bureau collar. She never saw the face.", source: 'Kit' },
  door_unlocked: { kind: 'facts', title: 'The back door was unlocked from outside', text: "Mama Teo locked Dex in the back room. Later she heard the back door, the only other way in, click open. No knock.", source: 'Mama Teo' },
};

// Which conversation each talkable thing starts. Missing ids fall back to FALLBACK.
export const TALK = { mamaTeo: 'teo', vending: 'vending', miso: 'miso', vendor: 'vendor', preacher: 'preacher', kit: 'kit' };
export const FALLBACK = 'nobody';
// Rules from the editor: [{ conv, npc, when: 'all' | '1'..'4' (4 = the 4th visit on), fact?: a fact Juno must know, talked?: a person she must already have talked to }].
// Ones with conditions are tried first; the first that fits wins, else the visit lists below, else the game's own TALK.
export const RULES = EDITS._rules ?? [];
// Which conversation plays on each visit, from the editor (older format): VISITS[personId] = [1st, 2nd, 3rd, 4th and later]; '' = the normal one (TALK).
export const VISITS = EDITS._visits ?? {};
export function conversationFor(personId, visit, ctx = {}) {
  const fits = (r) => r.npc === personId && (r.when === 'all' || (r.when === '4' ? visit >= 4 : +r.when === visit))
    && (!r.fact || ctx.has?.(r.fact)) && (!r.talked || ctx.talked?.(r.talked));
  const hit = RULES.filter((r) => r.fact || r.talked).find(fits) ?? RULES.filter((r) => !r.fact && !r.talked).find(fits);
  if (hit) return hit.conv;
  const list = VISITS[personId];
  return (list && list[Math.min(visit, list.length) - 1]) || TALK[personId] || FALLBACK;
}

// Conversation: { start: nodeId | [{ if, node }...], nodes: { id: Node } }.
// Node: { speaker, text, next?, choices?, effects?, present?, presentWrong?, end? }.
// Choice: { text, next?, if?, effects?, end? }. Condition: { flag?, notFlag?, fact?, notFact? } (all must hold).
// Effects: { addFact: id } { addPerson: id } { addEcho: id } { setFlag: name } { setTime: [h, m] }.
// Mama Teo's two questions; each hides itself once asked (flag set by the choice).
const TEO_QUESTIONS = [
  { text: 'Did you hear anything after that?', next: 'door', if: { notFlag: 'teo_asked_door' }, effects: [{ setFlag: 'teo_asked_door' }] },
  { text: 'Did you see his client arrive?', next: 'follow', if: { notFlag: 'teo_asked_follow' }, effects: [{ setFlag: 'teo_asked_follow' }] },
];

// Things Juno can examine. spot: a named spot in that area (areas.js). conv: a conversation below (built by examine()).
// Beat 3 counts the five in the Sable.
export const EXAMINABLES = [
  { id: 'body', area: 'sable', spot: 'body', verb: 'Examine', conv: 'ex_body' },
  { id: 'port', area: 'sable', spot: 'port', verb: 'Examine', conv: 'ex_port' },
  { id: 'cups', area: 'sable', spot: 'cups', verb: 'Examine', conv: 'ex_cups' },
  { id: 'terminal', area: 'sable', spot: 'terminal', verb: 'Read', conv: 'ex_terminal' },
  { id: 'lamp', area: 'sable', spot: 'lamp', verb: 'Examine', conv: 'ex_lamp' },
  { id: 'glove', area: 'alley', spot: 'glove', verb: 'Pick up', conv: 'ex_glove' },
];

// One-line examine conversation: Juno speaks, adds the fact and sets the flag ex_<id>; examining again gives a shorter line.
const examine = (id, fact, text, again) => ({
  start: [{ if: { flag: `ex_${id}` }, node: 'again' }, { node: 'a' }],
  nodes: {
    a: { speaker: 'juno', text, effects: [{ addFact: fact }, { setFlag: `ex_${id}` }], end: true },
    again: { speaker: 'juno', text: again, end: true },
  },
});

export const CONVERSATIONS = {
  // Beat 1: Hale on comms as Juno steps off the train.
  hale_open: { start: 'a', nodes: {
    a: { speaker: 'hale', text: "Vale. Lowmarket, the Sable Noodle House. A broker's dead and his implant is fried.", next: 'a2' },
    a2: { speaker: 'hale', text: "Looks like a burnout. Just sign off on what you find and go home. Don't make this into more than it is. I don't need a repeat of last time, Juno.", next: 'b' },
    b: { speaker: 'juno', text: 'Copy that. Sorry, I think I lost another hour on that train.', next: 'c' },
    c: { speaker: 'hale', text: 'Everybody loses an hour on Line 9, Vale. Get it done.', end: true },
  } },
  ex_body: examine('body', 'dex_body', 'Dex Morrow. Mid-level echo broker. No wounds, no struggle. Whatever did this was quiet.', 'Dex Morrow. Still no marks on him.'),
  ex_port: examine('port', 'burned_port', "The port at his temple is burned black, but the skin around it is clean. A burnout from the inside would have scorched that too.", 'The port. Burned from the outside, I would bet.'),
  ex_cups: examine('cups', 'two_cups', 'Two cups on the table. Both used, and one is still warm. Dex had company.', 'Two cups. Two people.'),
  ex_terminal: examine('terminal', 'door_log', "The back door terminal. One entry logged tonight. Zero exits. Whoever came in never left, or the log is lying.", 'One in, none out. That log is wrong or somebody is still here.'),
  ex_lamp: examine('lamp', 'smashed_lamp', 'The corner lamp is smashed, glass swept toward the door. Someone wanted the room dark.', 'Smashed on purpose. Dark room, quiet exit.'),
  ex_glove: examine('glove', 'grey_glove', "A grey glove. Bureau issue. I have a pair just like it.", 'Bureau grey. Same as mine.'),
  vendor: { start: 'a', nodes: {
    a: { speaker: 'vendor', text: "You smell like rain and Bureau paperwork. The Sable is up the street on the left, under the red awning. They found a broker in the back.", next: 'b' },
    b: { speaker: 'juno', text: 'Did anyone go in or out tonight?', next: 'c' },
    c: { speaker: 'vendor', text: 'Everyone and no one. Lowmarket stops looking at faces after ten.', end: true },
  } },
  preacher: { start: 'a', nodes: {
    a: { speaker: 'preacher', text: 'They copy your memories and call it a record. Listen, child: what is remembered is what is owned.', next: 'b' },
    b: { speaker: 'juno', text: 'Is that a sermon or a complaint?', next: 'c' },
    c: { speaker: 'preacher', text: 'Both. The signal is the soul, and the soul is for sale.', end: true },
  } },
  // Mama Teo. The chain: she locked the back door at close and later heard it unlock with no knock (fact door_unlocked).
  // Together with the echo's two voices that proves a second person let themselves in with a key (board).
  teo: {
    start: [{ if: { flag: 'teo_cracked' }, node: 'after' },
      { if: { flag: 'miso_joined', notFlag: 'teo_met' }, node: 'feed' },        // Miso came along: Teo feeds him before she talks to Juno
      { if: { flag: 'miso_joined', notFlag: 'teo_fed_miso' }, node: 'feedLate' },
      { if: { flag: 'teo_met' }, node: 'again' }, { node: 'hello' }],
    nodes: {
      feed: { speaker: 'mamaTeo', text: 'A stray in my shop, dripping on my floor. Hm. Come here, little one.', next: 'feed2' },
      feed2: { speaker: 'mamaTeo', text: "Fish heads from the pot. Eat. Nobody goes hungry in here, not even the ones who bring no money.", effects: [{ setFlag: 'teo_fed_miso' }], next: 'feed3' },
      feed3: { speaker: 'miso', text: 'Mrrp!', next: 'hello' },
      feedLate: { speaker: 'mamaTeo', text: "And you brought the cat. Here, little one, fish heads from the pot. Eat.", effects: [{ setFlag: 'teo_fed_miso' }], next: 'feed3late' },
      feed3late: { speaker: 'miso', text: 'Mrrp!', next: 'again' },
      hello: { speaker: 'mamaTeo', text: "You're the auditor. Sit, eat, and keep your hands off my counter.",
        effects: [{ addPerson: 'mamaTeo' }, { setFlag: 'teo_met' }],
        choices: [{ text: "I'm here about Dex Morrow.", next: 'knows' }] },
      knows: { speaker: 'mamaTeo', text: "Dex. Everyone on Lowmarket knew Dex. Two years in my corner booth, selling other people's memories, and never once skipped paying for his bowl.", next: 'ask' },
      ask: { speaker: 'mamaTeo', text: "I saw Dex twice tonight. The second time was after close. He wanted the back room, said a client was coming, and he needed the privacy. He kept a hand on his temple the whole time - looked like he was in pain. I didn't ask. His business. I just locked the door behind him, like always.",
        choices: [...TEO_QUESTIONS, { text: "That's all.", end: true }] },
      door: { speaker: 'mamaTeo', text: "A click, a while later. The back door, opening. It's the only other way into that room. No knock. So they let themselves in.",
        effects: [{ addFact: 'door_unlocked' }], next: 'master' },
      master: { speaker: 'mamaTeo', text: "Don't look at me like that. City crews and inspectors carry a master key to every door on Lowmarket. It's in the lease. Nobody argues with the city.",
        effects: [{ addFact: 'master_keys' }], next: 'more' },
      follow: { speaker: 'mamaTeo', text: "Someone came in but I didn't see them. And no one else came through the front tonight except for you and the cat.", next: 'more' },
      more: { speaker: 'mamaTeo', text: 'Anything else, or are you going to eat?',
        choices: [...TEO_QUESTIONS, { text: "That's all.", end: true }] },
      again: { speaker: 'mamaTeo', text: 'Back again? What is it this time?',
        present: { door_unlocked: 'shrug', master_keys: 'shrug', someone_had_key: 'cracked' }, presentWrong: 'wrong',
        choices: [...TEO_QUESTIONS, { text: 'Never mind.', end: true }] },
      shrug: { speaker: 'mamaTeo', text: "Yes, I told you that. City business, most likely.", end: true },
      cracked: { speaker: 'mamaTeo', text: "A city key, then. Crews, an inspector, the Bureau... but none of them work at midnight, and none of them sit down with a client. Find out who signed out a key tonight.",
        effects: [{ setFlag: 'teo_cracked' }], end: true },
      wrong: { speaker: 'mamaTeo', text: "That means nothing to me. Eat something.", end: true },
      after: { speaker: 'mamaTeo', text: "I've told you what I know. Find out who signed out a key tonight.", end: true },
    },
  },
  // Kit: claims she left at 23:00 (fact kit_claim). Present kit_outside (her echo) to break the story; present kit_saw_them to press her for the coat.
  kit: {
    start: [{ if: { flag: 'kit_coat' }, node: 'done' }, { if: { flag: 'kit_broken' }, node: 'after' }, { if: { flag: 'kit_met' }, node: 'again' }, { node: 'hello' }],
    nodes: {
      hello: { speaker: 'kit', text: "You're Bureau. Great. I already told the Sable lady everything, which is nothing, because I wasn't there. Much.",
        effects: [{ addPerson: 'kit' }, { setFlag: 'kit_met' }], choices: [{ text: 'You met Dex tonight.', next: 'claim' }] },
      claim: { speaker: 'kit', text: "Delivery slip, he signed, I left. Eleven o'clock, on the dot. Straight home, hot shower, bad noodles. Ask the hostel clock.",
        effects: [{ addFact: 'kit_claim' }], next: 'claim2' },
      claim2: { speaker: 'juno', text: "Eleven. Got it.", end: true },
      again: { speaker: 'kit', text: 'Still here, still innocent. What now?',
        present: { kit_claim: 'repeat', kit_outside: 'broken', kit_saw_them: 'coat' }, presentWrong: 'wrong',
        choices: [{ text: 'Nothing yet.', end: true }] },
      repeat: { speaker: 'kit', text: 'Eleven. I said eleven. Write it down.', end: true },
      wrong: { speaker: 'kit', text: "I don't know what that is. Can I go back to pretending to sleep?", end: true },
      broken: { speaker: 'kit', text: "...Okay. Okay! I was out back. Twenty to midnight. I went to buy something from Dex that he never sold me, and I lost my nerve.", effects: [{ setFlag: 'kit_broken' }], next: 'broken2' },
      broken2: { speaker: 'kit', text: "I was behind the Sable. I didn't see anything. Don't look at me like that.", end: true },
      after: { speaker: 'kit', text: "I told you I was out back. What else do you want from me?",
        present: { kit_saw_them: 'coat' }, presentWrong: 'wrong', choices: [{ text: 'Nothing yet.', end: true }] },
      coat: { speaker: 'kit', text: "Fine. Somebody came out of that door. Long grey coat, Bureau collar, gloves. Head down, in no hurry. Like they owned the street.", effects: [{ addFact: 'bureau_coat' }, { setFlag: 'kit_coat' }], next: 'coat2' },
      coat2: { speaker: 'kit', text: "No face. I swear. The hood, the rain, the lamps going out... that's all I have.", end: true },
      done: { speaker: 'kit', text: 'A Bureau coat. That is all I know. Go away, auditor.', end: true },
    },
  },
  vending: { start: 'a', nodes: { a: { speaker: 'juno', text: 'Out of order. Naturally.', end: true } } },
  miso: { start: [{ if: { flag: 'miso_joined' }, node: 'again' }, { node: 'a' }], nodes: {
    a: { speaker: 'juno', text: 'Hey, stray. Hungry?', next: 'b' },
    b: { speaker: 'miso', text: 'Mrrp.', next: 'c' },
    c: { speaker: 'juno', text: 'You look like you have nowhere to be.',
      choices: [{ text: 'Come with me.', next: 'd', effects: [{ setFlag: 'miso_joined' }] }, { text: 'Stay dry, stray.', end: true }] },
    d: { speaker: 'juno', text: 'Fine. Follow if you want. No promises about noodles.', end: true },
    again: { speaker: 'miso', text: 'Mrrp.', end: true },
  } },
  // Beat 7: the cliffhanger lines (beats.js plays them in order).
  chip_open: { start: 'a', nodes: {
    a: { speaker: 'juno', text: "Dex's backup chip. It was sewn into his jacket lining. The one echo he was afraid of.", next: 'b' },
    b: { speaker: 'juno', text: 'Fine. Let us see what scared him.', end: true },
  } },
  chip_early: { start: 'a', nodes: { a: { speaker: 'juno', text: 'Not yet. I need to know more before I slot that chip.', end: true } } },
  log_open: { start: 'a', nodes: {
    a: { speaker: 'juno', text: 'Forty-seven minutes. That is not overwork.', end: true },
  } },
  hale_end: { start: 'a', nodes: {
    a: { speaker: 'hale', text: 'Juno.', next: 'b' },
    b: { speaker: 'hale', text: 'Where were you tonight between 23:10 and 23:57?', end: true },
  } },
  nobody: { start: 'a', nodes: { a: { speaker: 'juno', text: 'Nothing to say yet.', end: true } } },
};

// Conversations made in the editor: lines play in order; active ones become what the person says when Juno talks to them.
for (const [id, d] of Object.entries(EDITS._new ?? {})) {
  const nodes = {};
  d.lines.forEach((l, i) => { nodes[`n${i}`] = { speaker: l.speaker, text: l.text, ...(i < d.lines.length - 1 ? { next: `n${i + 1}` } : { end: true }) }; });
  CONVERSATIONS[id] = { start: 'n0', nodes };
  if (d.active) TALK[d.with] = id;
}
for (const [npc, c] of Object.entries(EDITS._talk ?? {})) TALK[npc] = c; // set in the editor: what a person says every time
for (const x of EDITS._insert ?? []) { // lines added after an existing box (editor): the new box takes over the old box's next / end
  const c = CONVERSATIONS[x.conv], n = c?.nodes[x.after];
  if (!n) continue;
  const added = { speaker: x.speaker, text: x.text };
  if (n.end) { added.end = true; delete n.end; } else if (n.next) added.next = n.next;
  n.next = x.id;
  const ordered = {};
  for (const [k, v] of Object.entries(c.nodes)) { ordered[k] = v; if (k === x.after) ordered[x.id] = added; }
  c.nodes = ordered;
}
for (const [conv, nodes] of Object.entries(EDITS)) {
  if (conv === '_new' || conv === '_insert') continue;
  for (const [id, f] of Object.entries(nodes)) {
    const n = CONVERSATIONS[conv]?.nodes[id];
    if (!n) continue; // the node no longer exists
    if (f.text !== undefined) n.text = f.text;
    if (f.speaker !== undefined) n.speaker = f.speaker;
    for (const [i, t] of Object.entries(f.choices ?? {})) if (n.choices?.[i]) n.choices[i] = { ...n.choices[i], text: t };
  }
}

// Echo hotspots: where F starts an echo. at: [x, z] or { spot, dx, dz } relative to a named batch spot.
export const HOTSPOTS = [
  { id: 'teo_back_room', area: 'sable', echo: 'teo_back_room', at: { spot: 'echo' }, radius: 2.6 },
  { id: 'alley_echo', area: 'alley', echo: 'alley_echo', at: { spot: 'echo', dx: 0, dz: 0 }, radius: 2.4 },
  { id: 'dex_backup', area: 'car', echo: 'dex_backup', at: { spot: 'seat' }, radius: 1, hidden: true }, // beat 7, played by beats.js (no marker, no F)
  { id: 'kit_echo', area: 'alley', echo: 'kit_echo', at: { spot: 'echo', dx: 0, dz: -5 }, radius: 2.0 },
];

// Echoes: { title, owner, duration (s), tracks, voices, seams, tags }.
//  tracks: [{ sprite: sheetId, show?: [t0, t1], keys: [{ t, x, z, facing?, anim?: 'idle'|'walk' }] }]
//    positions interpolate linearly between keys; facing defaults to the direction of travel; two keys at nearly the same t make a jump.
//  voices: [{ t0, t1, speaker: SPEAKERS id, text }] shown as captions. seams: [t] where the memory was edited (stutter + tear).
//  tags: [{ t, window, fact: ENTRIES id, label }] the player can tag while the playhead is within t +- window.
export const ECHOES = {
  teo_back_room: {
    title: "Mama Teo's view", owner: 'mamaTeo', entry: 'teo_back_room', duration: 6,
    tracks: [
      { sprite: 'dexStanding', keys: [
        { t: 0, x: 154.6, z: 1.0, facing: Math.PI, anim: 'idle' }, { t: 6, x: 154.6, z: 1.0, facing: Math.PI, anim: 'idle' },
      ] },
      { sprite: 'vendor', show: [1.4, 6], keys: [
        { t: 1.4, x: 157.8, z: -1.2, facing: -Math.PI / 2, anim: 'walk' }, { t: 2.6, x: 156.0, z: -1.2, facing: -Math.PI / 2, anim: 'walk' },
        { t: 2.8, x: 156.0, z: -1.2, facing: -Math.PI / 2, anim: 'idle' }, { t: 3.49, x: 156.0, z: -1.2, facing: -Math.PI / 2, anim: 'idle' },
        { t: 3.5, x: 157.2, z: -2.0, facing: Math.PI, anim: 'idle' }, { t: 6, x: 157.2, z: -2.0, facing: Math.PI, anim: 'idle' },
      ] },
    ],
    voices: [
      { t0: 1.3, t1: 2.7, speaker: 'dex', text: "...you weren't supposed to know I kept a copy." },
      { t0: 2.8, t1: 4.4, speaker: 'unknown', text: 'Then tell me where it is.' },
    ],
    seams: [3.5],
    tags: [{ t: 2.0, window: 0.9, fact: 'two_voices', label: 'Two voices' }, { t: 3.5, window: 0.6, fact: 'echo_seam', label: 'The seam' }],
  },
  // The alley (origin x 300): the Sable's back door is at z -7.96. A figure steps out and pulls it shut; the hand wears a grey glove.
  alley_echo: {
    title: 'The back door', owner: 'unknown', entry: 'alley_echo', duration: 6,
    tracks: [
      { sprite: 'vendor', keys: [
        { t: 0, x: 300, z: -7.0, facing: Math.PI, anim: 'idle' }, { t: 2.4, x: 300, z: -7.0, facing: Math.PI, anim: 'idle' },
        { t: 2.5, x: 300, z: -6.4, facing: 0, anim: 'walk' }, { t: 6, x: 300.4, z: 1.5, facing: 0, anim: 'walk' },
      ] },
    ],
    voices: [{ t0: 0.6, t1: 2.2, speaker: 'unknown', text: '...locks never stop an auditor.' }],
    seams: [],
    tags: [{ t: 2.0, window: 0.8, fact: 'gloved_hand', label: 'Grey glove on the door' }],
  },
  // Beat 7: Dex's hidden backup, from his eyes in Juno's car (origin x 600). A hooded stranger sits across from him, then leans into the light: it is Juno.
  dex_backup: {
    title: "Dex's backup", owner: 'dex', entry: 'dex_backup', duration: 9,
    tracks: [
      { sprite: 'dexStanding', keys: [{ t: 0, x: 599.4, z: 0, facing: Math.PI / 2, anim: 'idle' }, { t: 9, x: 599.4, z: 0, facing: Math.PI / 2, anim: 'idle' }] },
      { sprite: 'vendor', show: [1.6, 4.6], keys: [
        { t: 1.6, x: 600.5, z: 1.5, facing: Math.PI, anim: 'walk' }, { t: 3.0, x: 601.3, z: 0.3, facing: -Math.PI / 2, anim: 'walk' }, { t: 3.2, x: 601.3, z: 0.3, facing: -Math.PI / 2, anim: 'idle' }, { t: 4.6, x: 601.3, z: 0.3, facing: -Math.PI / 2, anim: 'idle' },
      ] },
      { sprite: 'juno', show: [4.6, 9], keys: [{ t: 4.6, x: 601.3, z: 0.3, facing: -Math.PI / 2, anim: 'idle' }, { t: 9, x: 601.3, z: 0.3, facing: -Math.PI / 2, anim: 'idle' }] },
    ],
    voices: [
      { t0: 2.4, t1: 4.4, speaker: 'dex', text: 'You came yourself. Of course you did.' },
      { t0: 5.0, t1: 6.8, speaker: 'juno', text: 'Where is the other copy, Dex?' },
      { t0: 7.2, t1: 8.8, speaker: 'dex', text: "...you won't remember this, will you." },
    ],
    seams: [], tags: [],
  },
  // Kit, out behind the Sable at 23:40, watches the gloved visitor leave.
  kit_echo: {
    title: "Kit's view", owner: 'kit', entry: 'kit_echo', duration: 8,
    tracks: [
      { sprite: 'kit', keys: [
        { t: 0, x: 299.2, z: -1.5, facing: Math.PI, anim: 'idle' }, { t: 8, x: 299.2, z: -1.5, facing: Math.PI, anim: 'idle' },
      ] },
      { sprite: 'vendor', show: [3.6, 8], keys: [
        { t: 3.6, x: 300, z: -7.0, facing: 0, anim: 'walk' }, { t: 8, x: 300.6, z: 3.0, facing: 0, anim: 'walk' },
      ] },
    ],
    voices: [{ t0: 1.0, t1: 3.2, speaker: 'kit', text: "23:40. Not my business. Keep walking, Kit." }],
    seams: [],
    tags: [{ t: 2.0, window: 1.4, fact: 'kit_outside', label: 'Kit in the alley, 23:40' }],
  },
};

// Deduction board: each conclusion needs a pair (or trio) of fact ids linked together on the board.
//  { id, needs: [factId, ...], result: ENTRIES fact id shown as the conclusion card, line: Juno's line when it locks in, effects }.
//  A pair locks on one link; a trio needs links that connect all three. Wrong links snap back with a line from wrongLines;
//  every 3rd wrong link that touches a conclusion's facts makes Juno hint at one it still needs ({fact} = its title).
export const BOARD = {
  wrongLines: ["That doesn't connect.", 'No. Those two have nothing to do with each other.', 'Close, maybe. But no.', "Not like that."],
  partialLine: 'That fits. There has to be more to it.',
  hintLine: 'I keep coming back to “{fact}”.',
  conclusions: [
    { id: 'someone_had_key', needs: ['door_unlocked', 'master_keys', 'two_voices'], result: 'someone_had_key',
      line: 'Unlocked from outside, no knock, a city key that opens any door on the street, and two voices in the room. Someone with city access met Dex in there.',
      effects: [{ addFact: 'someone_had_key' }, { setFlag: 'key_deduced' }] },
    { id: 'someone_else', needs: ['two_cups', 'two_voices'], result: 'someone_else',
      line: 'Two cups and two voices. Someone else was in the room with Dex.', effects: [{ addFact: 'someone_else' }] },
    { id: 'override_used', needs: ['burned_port', 'gloved_hand'], result: 'override_used',
      line: 'A port burned from outside and a Bureau glove on the door. The killer used an auditor override.', effects: [{ addFact: 'override_used' }] },
    { id: 'kit_saw_them', needs: ['kit_outside', 'gloved_hand'], result: 'kit_saw_them',
      line: 'Kit was in the alley when the gloved hand came out. She saw them leave, and she has been lying about it.', effects: [{ addFact: 'kit_saw_them' }, { setFlag: 'kit_deduced' }] },
  ],
};
