import EDITS from './dialogue-edits.json' with { type: 'json' }; // made in /editor.html (dev server): text changes and new conversations, laid over the text below

// Story content as plain data: speakers, people, facts, echoes and conversations. Stage 9 writes content here only.
// The dialogue format is documented in NOTES.md.

export const SPEAKERS = {
  juno: { name: 'Juno', color: '#1fd6e8' },
  mamaTeo: { name: 'Mama Teo', color: '#e0217d' },
  kit: { name: 'Kit', color: '#f2a93b' },
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
  two_cups: { kind: 'facts', title: 'Two cups on the table', text: 'Both used. Dex had company.', source: 'The back room' },
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
  ex_cups: examine('cups', 'two_cups', 'Two cups on the table. Both used. Dex had company.', 'Two cups. Two people.'),
  ex_terminal: examine('terminal', 'door_log', "The back door terminal. One entry logged tonight. Zero exits. Whoever came in never left, or the log is lying.", 'One in, none out. That log is wrong or somebody is still here.'),
  ex_lamp: examine('lamp', 'smashed_lamp', 'The corner lamp is smashed, glass swept toward the door. Someone wanted the room dark.', 'Smashed on purpose. Dark room, quiet exit.'),
  ex_glove: examine('glove', 'grey_glove', "A grey glove. Bureau service issue; auditors, inspectors and field crews all wear these.", 'Bureau issue. It tells me an organization, not a name.'),
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

// Stage 9B: editor overrides are still applied below.
Object.assign(ENTRIES, {
  "kit": {
    "kind": "people",
    "title": "Kit Lacroix",
    "text": "Courier and Dex’s last client. The maintenance job was a cover for buying an echo of her erased past.",
    "source": "Capsule hostel"
  },
  "someone_else": {
    "kind": "facts",
    "title": "Someone else was in the room",
    "text": "Two cups and two voices establish that Dex met a second person. The edited echo does not identify them.",
    "source": "Deduction board"
  },
  "override_trace": {
    "kind": "facts",
    "title": "Auditor-class override at 23:18",
    "text": "The terminal’s hardware access journal records AUDITOR / FORCED UNLOCK at 23:18. The credential identity is redacted. This is separate from the editable entry counter.",
    "source": "Back room terminal"
  },
  "auditor_override": {
    "kind": "facts",
    "title": "The visitor used an auditor override",
    "text": "The door opened from outside without a knock, and its hardware journal records auditor-class access. A generic city key alone would not prove this.",
    "source": "Deduction board"
  },
  "kit_claim": {
    "kind": "facts",
    "title": "Kit says she left at 23:00",
    "text": "Kit claims she left the Sable at 23:00 and went straight back to the hostel.",
    "source": "Kit"
  },
  "kit_at_2340": {
    "kind": "facts",
    "title": "Kit outside the Sable at 23:40",
    "text": "Mama Teo’s alley memory places Kit by the back door at 23:40, before Juno’s 00:35 arrival.",
    "source": "Alley echo"
  },
  "bureau_coat": {
    "kind": "facts",
    "title": "Kit saw a Bureau coat",
    "text": "Pressed with the 23:40 echo, Kit admits seeing a figure leave in a Bureau coat. She could not see their face.",
    "source": "Kit, confronted with the alley echo"
  },
  "bureau_involved": {
    "kind": "facts",
    "title": "Bureau involvement",
    "text": "Auditor-class access, a Bureau glove and Kit’s account of a Bureau coat point to Bureau involvement. They do not identify an individual.",
    "source": "Deduction board"
  },
  "backup_chip": {
    "kind": "facts",
    "title": "Dex’s isolated backup",
    "text": "Kit hid Dex’s read-only optical chip beneath the hostel reception shelf. It was removed before the meeting and has no connection to his implant, so the implant burn and memory edits could not erase it.",
    "source": "Capsule hostel"
  },
  "alley_memory": {
    "kind": "echoes",
    "title": "Mama Teo’s alley memory — 23:40",
    "text": "A timestamped fragment: Kit at the back door, an unidentified figure departing, a grey glove at the latch. Faces are lost in the rain.",
    "source": "Mama Teo’s implant"
  }
});
Object.assign(CONVERSATIONS, {
  "kit": {
    "start": [
      {
        "if": {
          "flag": "kit_pressed"
        },
        "node": "after"
      },
      {
        "if": {
          "flag": "kit_met"
        },
        "node": "again"
      },
      {
        "node": "hello"
      }
    ],
    "nodes": {
      "hello": {
        "speaker": "kit",
        "text": "Plumbing. That’s all I’m here for. Unless you have thirty credits for a very expensive leak.",
        "next": "cover"
      },
      "cover": {
        "speaker": "juno",
        "text": "You’re holding a courier bag. Let’s start with your name.",
        "next": "name"
      },
      "name": {
        "speaker": "kit",
        "text": "Kit Lacroix. Fine. I carry things for Dex. Tonight I was the client. He had a memory from before my wipe. The uniform was so nobody asked why I came.",
        "effects": [
          {
            "addPerson": "kit"
          },
          {
            "setFlag": "kit_met"
          }
        ],
        "next": "claim"
      },
      "claim": {
        "speaker": "kit",
        "text": "I left the Sable at 23:00. Straight back here. Whatever happened after that, I wasn’t there.",
        "effects": [
          {
            "addFact": "kit_claim"
          }
        ],
        "next": "again"
      },
      "again": {
        "speaker": "kit",
        "text": "I told you when I left. What else?",
        "present": {
          "kit_at_2340": "caught"
        },
        "presentWrong": "wrong",
        "choices": [
          {
            "text": "That’s all for now.",
            "end": true
          }
        ]
      },
      "caught": {
        "speaker": "juno",
        "text": "Teo’s implant clock says 23:40. You’re outside the back door. You didn’t go straight home.",
        "next": "coat"
      },
      "coat": {
        "speaker": "kit",
        "text": "I went back. I wanted that memory. Someone came out in a Bureau coat. Grey glove on the latch. I stayed behind the bins. I never saw a face.",
        "effects": [
          {
            "addFact": "bureau_coat"
          },
          {
            "setFlag": "kit_pressed"
          }
        ],
        "next": "copy"
      },
      "copy": {
        "speaker": "kit",
        "text": "Dex gave me a backup before the meeting. Read-only optical chip, already out of his implant. I hid it under that shelf. Whatever they did to his head, they couldn’t reach it.",
        "effects": [
          {
            "setFlag": "backup_location"
          }
        ],
        "end": true
      },
      "wrong": {
        "speaker": "kit",
        "text": "That doesn’t put me at the Sable. Do you have something that does?",
        "end": true
      },
      "after": {
        "speaker": "kit",
        "text": "The chip is under the reception shelf. Please don’t lose the only piece of my life he managed to save.",
        "end": true
      }
    }
  },
  "ex_backup": {
    "start": [
      {
        "if": {
          "flag": "ex_backup"
        },
        "node": "again"
      },
      {
        "if": {
          "flag": "backup_location"
        },
        "node": "take"
      },
      {
        "node": "wait"
      }
    ],
    "nodes": {
      "wait": {
        "speaker": "juno",
        "text": "A reception shelf. Nothing obvious.",
        "end": true
      },
      "take": {
        "speaker": "juno",
        "text": "A read-only optical chip, taped underneath. Physically separate from Dex’s implant. I’ll use the reader in my car.",
        "effects": [
          {
            "addFact": "backup_chip"
          },
          {
            "setFlag": "ex_backup"
          }
        ],
        "end": true
      },
      "again": {
        "speaker": "juno",
        "text": "I have the chip. The car has a reader.",
        "end": true
      }
    }
  }
});
TALK.kit = 'kit';
EXAMINABLES.push({ id: 'backup', area: 'hostel', spot: 'backup', verb: 'Examine', conv: 'ex_backup' });
CONVERSATIONS.ex_terminal.nodes.a.next = 'trace';
delete CONVERSATIONS.ex_terminal.nodes.a.end;
CONVERSATIONS.ex_terminal.nodes.trace = { speaker: 'juno', text: 'The entry counter was edited. The hardware journal is separate: 23:18, AUDITOR, FORCED UNLOCK. Credential identity redacted. That is more than a city master key.', effects: [{ addFact: 'override_trace' }], end: true };
CONVERSATIONS.ex_terminal.nodes.again.effects = [{ addFact: 'override_trace' }];

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
  { id: 'alley_memory', area: 'alley', echo: 'alley_memory', at: { spot: 'echo' }, radius: 2.6 },
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
      { sprite: 'unknownEcho', show: [1.4, 6], keys: [
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

ECHOES.alley_memory = {
  "title": "Alley, 23:40 — Mama Teo’s view",
  "owner": "mamaTeo",
  "entry": "alley_memory",
  "duration": 8,
  "tracks": [
    {
      "sprite": "kit",
      "keys": [
        {
          "t": 0,
          "x": 301,
          "z": 2,
          "facing": 3.141592653589793,
          "anim": "idle"
        },
        {
          "t": 8,
          "x": 301,
          "z": 2,
          "facing": 3.141592653589793,
          "anim": "idle"
        }
      ]
    },
    {
      "sprite": "unknownEcho",
      "show": [
        1,
        6
      ],
      "keys": [
        {
          "t": 1,
          "x": 300,
          "z": -2,
          "anim": "walk"
        },
        {
          "t": 6,
          "x": 300,
          "z": 4,
          "anim": "walk"
        }
      ]
    }
  ],
  "voices": [
    {
      "t0": 0,
      "t1": 3,
      "speaker": "mamaTeo",
      "text": "23:40. That courier’s still here."
    },
    {
      "t0": 3,
      "t1": 7,
      "speaker": "mamaTeo",
      "text": "Grey glove on the latch. Can’t see a face through this rain."
    }
  ],
  "seams": [],
  "tags": [
    {
      "t": 2,
      "window": 1,
      "fact": "kit_at_2340",
      "label": "Kit at 23:40"
    },
    {
      "t": 4.5,
      "window": 1,
      "fact": "grey_glove",
      "label": "Bureau glove at the latch"
    }
  ]
};
BOARD.conclusions.push(...[
  {
    "id": "someone_else",
    "needs": [
      "two_cups",
      "two_voices"
    ],
    "result": "someone_else",
    "line": "Two cups, two voices. Dex was not alone. The missing face is still missing.",
    "effects": [
      {
        "addFact": "someone_else"
      },
      {
        "setFlag": "visitor_deduced"
      }
    ]
  },
  {
    "id": "auditor_override",
    "needs": [
      "someone_else",
      "door_unlocked",
      "override_trace"
    ],
    "result": "auditor_override",
    "line": "A visitor entered from outside. The hardware journal identifies auditor-class override access, not an ordinary city key.",
    "effects": [
      {
        "addFact": "auditor_override"
      },
      {
        "setFlag": "override_deduced"
      }
    ]
  },
  {
    "id": "bureau_involved",
    "needs": [
      "auditor_override",
      "grey_glove",
      "bureau_coat"
    ],
    "result": "bureau_involved",
    "line": "Auditor access. Bureau equipment. A witness who saw the coat. The Bureau is involved; I still cannot name the person.",
    "effects": [
      {
        "addFact": "bureau_involved"
      },
      {
        "setFlag": "bureau_deduced"
      }
    ]
  }
]);
