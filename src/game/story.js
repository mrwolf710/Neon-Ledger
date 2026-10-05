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
};

// Case file entries. kind decides the tab: people | facts | echoes. source = where Juno learned it.
export const ENTRIES = {
  mamaTeo: { kind: 'people', title: 'Mama Teo', text: 'Runs the Sable Noodle House. Sees everyone who comes and goes.', source: 'Lowmarket Street' },
  teo_back_room: { kind: 'echoes', title: "Mama Teo's echo: the back room", text: "Six seconds from Mama Teo's implant, the night Dex died. Two voices, one of them cut off.", source: "Mama Teo's implant" },
  two_voices: { kind: 'facts', title: 'Two voices in the echo', text: "Mama Teo's echo holds two distinct voices. Only Dex is accounted for.", source: "Echo: Mama Teo's back room, 02.0" },
  echo_seam: { kind: 'facts', title: 'The echo has a seam', text: 'The replay stutters at 03.5. Someone edited this memory.', source: "Echo: Mama Teo's back room, 03.5" },
  someone_had_key: { kind: 'facts', title: 'Someone else had a key', text: 'The back door was opened from outside without a knock, and two voices were in the room. A second person let themselves in with a key.', source: 'Deduction board' },
  door_unlocked: { kind: 'facts', title: 'The back door was unlocked from outside', text: 'Mama Teo locked the back door herself at close, then heard it click open again later. No knock.', source: 'Mama Teo' },
};

// Which conversation each talkable thing starts. Missing ids fall back to FALLBACK.
export const TALK = { mamaTeo: 'teo', vending: 'vending', miso: 'miso' };
export const FALLBACK = 'nobody';

// Conversation: { start: nodeId | [{ if, node }...], nodes: { id: Node } }.
// Node: { speaker, text, next?, choices?, effects?, present?, presentWrong?, end? }.
// Choice: { text, next?, if?, effects?, end? }. Condition: { flag?, notFlag?, fact?, notFact? } (all must hold).
// Effects: { addFact: id } { addPerson: id } { addEcho: id } { setFlag: name } { setTime: [h, m] }.
// Mama Teo's two questions; each hides itself once asked (flag set by the choice).
const TEO_QUESTIONS = [
  { text: 'Did you lock the back door?', next: 'door', if: { notFlag: 'teo_asked_door' }, effects: [{ setFlag: 'teo_asked_door' }] },
  { text: 'Did anyone follow him in?', next: 'follow', if: { notFlag: 'teo_asked_follow' }, effects: [{ setFlag: 'teo_asked_follow' }] },
];

export const CONVERSATIONS = {
  // Mama Teo. The chain: she locked the back door at close and later heard it unlock with no knock (fact door_unlocked).
  // Together with the echo's two voices that proves a second person let themselves in with a key (board).
  teo: {
    start: [{ if: { flag: 'teo_cracked' }, node: 'after' }, { if: { flag: 'teo_met' }, node: 'again' }, { node: 'hello' }],
    nodes: {
      hello: { speaker: 'mamaTeo', text: "You're the auditor. Sit, eat, and keep your hands off my counter.",
        effects: [{ addPerson: 'mamaTeo' }, { setFlag: 'teo_met' }],
        choices: [{ text: "I'm here about Dex Morrow.", next: 'knows' }] },
      knows: { speaker: 'mamaTeo', text: "Dex. Everyone on Lowmarket knew Dex. Two years in my corner booth, selling other people's memories, and never once skipped paying for his bowl.", next: 'ask' },
      ask: { speaker: 'mamaTeo', text: 'Dex came in twice tonight. The second time he never took his hand off his temple.',
        choices: [...TEO_QUESTIONS, { text: "That's all.", end: true }] },
      door: { speaker: 'mamaTeo', text: 'I locked the back door myself at close. Later I heard it click open again. No knock. Nobody who knocks lets themselves in.',
        effects: [{ addFact: 'door_unlocked' }], next: 'more' },
      follow: { speaker: 'mamaTeo', text: 'Only the cat. Nobody else came through the front, and I would have seen.', next: 'more' },
      more: { speaker: 'mamaTeo', text: 'Anything else, or are you going to eat?',
        choices: [...TEO_QUESTIONS, { text: "That's all.", end: true }] },
      again: { speaker: 'mamaTeo', text: 'Back again? What is it this time?',
        present: { door_unlocked: 'cracked' }, presentWrong: 'wrong',
        choices: [...TEO_QUESTIONS, { text: 'Never mind.', end: true }] },
      cracked: { speaker: 'mamaTeo', text: 'Opened from outside, with no knock... then whoever it was had a key. Mine has not left my belt.',
        effects: [{ setFlag: 'teo_cracked' }], end: true },
      wrong: { speaker: 'mamaTeo', text: "That means nothing to me. Eat something.", end: true },
      after: { speaker: 'mamaTeo', text: "I've told you what I know. Find out who else has a key to that door.", end: true },
    },
  },
  vending: { start: 'a', nodes: { a: { speaker: 'juno', text: 'Out of order. Naturally.', end: true } } },
  miso: { start: 'a', nodes: { a: { speaker: 'miso', text: 'Mrrp.', end: true } } },
  nobody: { start: 'a', nodes: { a: { speaker: 'juno', text: 'Nothing to say yet.', end: true } } },
};

// Echo hotspots: where F starts an echo. at: [x, z] or { spot, dx, dz } relative to a named batch spot.
export const HOTSPOTS = [
  { id: 'teo_back_room', echo: 'teo_back_room', at: { spot: 'stall', dx: 2.4, dz: 0.2 }, radius: 2.4 },
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
      { sprite: 'dex', keys: [
        { t: 0, x: 4.6, z: -3.5, facing: -Math.PI / 2, anim: 'walk' }, { t: 2, x: 1.3, z: -3.5, facing: -Math.PI / 2, anim: 'walk' },
        { t: 2.2, x: 1.3, z: -3.5, facing: -Math.PI / 2, anim: 'idle' }, { t: 3.5, x: 1.3, z: -3.5, facing: -Math.PI / 2, anim: 'idle' },
        { t: 3.51, x: 2.2, z: -3.5, facing: Math.PI / 2, anim: 'idle' }, { t: 6, x: 2.2, z: -3.5, facing: Math.PI / 2, anim: 'idle' },
      ] },
      { sprite: 'vendor', show: [1.4, 6], keys: [
        { t: 1.4, x: -1.2, z: -3.5, facing: Math.PI / 2, anim: 'walk' }, { t: 2.6, x: 0.5, z: -3.5, facing: Math.PI / 2, anim: 'walk' },
        { t: 2.8, x: 0.5, z: -3.5, facing: Math.PI / 2, anim: 'idle' }, { t: 3.49, x: 0.5, z: -3.5, facing: Math.PI / 2, anim: 'idle' },
        { t: 3.5, x: 3.1, z: -3.5, facing: Math.PI / 2, anim: 'idle' }, { t: 6, x: 3.1, z: -3.5, facing: Math.PI / 2, anim: 'idle' },
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
    { id: 'someone_had_key', needs: ['door_unlocked', 'two_voices'], result: 'someone_had_key',
      line: 'Unlocked from outside, no knock, and two voices inside. Someone walked in with their own key.',
      effects: [{ addFact: 'someone_had_key' }, { setFlag: 'key_deduced' }] },
  ],
};
