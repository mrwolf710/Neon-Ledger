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
  door_unlocked: { kind: 'facts', title: 'The back door was unlocked from outside', text: "Mama Teo locked Dex in the back room. Later she heard the back door, the only other way in, click open. No knock.", source: 'Mama Teo' },
};

// Which conversation each talkable thing starts. Missing ids fall back to FALLBACK.
export const TALK = { mamaTeo: 'teo', vending: 'vending', miso: 'miso', vendor: 'vendor', preacher: 'preacher' };
export const FALLBACK = 'nobody';
// Which conversation plays on each visit, from the editor: VISITS[personId] = [1st, 2nd, 3rd, 4th and later]; '' = the normal one (TALK).
export const VISITS = EDITS._visits ?? {};
export function conversationFor(personId, visit) {
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
  vending: { start: 'a', nodes: { a: { speaker: 'juno', text: 'Out of order. Naturally.', end: true } } },
  miso: { start: [{ if: { flag: 'miso_joined' }, node: 'again' }, { node: 'a' }], nodes: {
    a: { speaker: 'juno', text: 'Hey, stray. Hungry?', next: 'b' },
    b: { speaker: 'miso', text: 'Mrrp.', next: 'c' },
    c: { speaker: 'juno', text: 'You look like you have nowhere to be.',
      choices: [{ text: 'Come with me.', next: 'd', effects: [{ setFlag: 'miso_joined' }] }, { text: 'Stay dry, stray.', end: true }] },
    d: { speaker: 'juno', text: 'Fine. Follow if you want. No promises about noodles.', end: true },
    again: { speaker: 'miso', text: 'Mrrp.', end: true },
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
  ],
};
