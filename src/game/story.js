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
};

// Case file entries. kind decides the tab: people | facts | echoes. source = where Juno learned it.
export const ENTRIES = {
  mamaTeo: { kind: 'people', title: 'Mama Teo', text: 'Runs the Sable Noodle House. Sees everyone who comes and goes.', source: 'Lowmarket Street' },
  lock_twice: { kind: 'facts', title: 'The back lock turned twice', text: 'After closing, Mama Teo heard the back-room lock turn twice: once to open, once to lock.', source: 'Mama Teo' },
};

// Which conversation each talkable thing starts. Missing ids fall back to FALLBACK.
export const TALK = { mamaTeo: 'teo', vending: 'vending', miso: 'miso' };
export const FALLBACK = 'nobody';

// Conversation: { start: nodeId | [{ if, node }...], nodes: { id: Node } }.
// Node: { speaker, text, next?, choices?, effects?, present?, presentWrong?, end? }.
// Choice: { text, next?, if?, effects?, end? }. Condition: { flag?, notFlag?, fact?, notFact? } (all must hold).
// Effects: { addFact: id } { addPerson: id } { addEcho: id } { setFlag: name } { setTime: [h, m] }.
export const CONVERSATIONS = {
  // The Stage 6 test: four lines, one choice, one fact; talk again to present it.
  teo: {
    start: [{ if: { flag: 'teo_met' }, node: 'again' }, { node: 'hello' }],
    nodes: {
      hello: { speaker: 'mamaTeo', text: "You're the auditor. Sit, eat, and keep your hands off my counter.",
        effects: [{ addPerson: 'mamaTeo' }, { setFlag: 'teo_met' }], next: 'ask' },
      ask: { speaker: 'mamaTeo', text: 'Dex came in twice tonight. The second time he never took his hand off his temple.',
        choices: [
          { text: 'Which door did he use?', next: 'door' },
          { text: 'Did anyone follow him?', next: 'follow' },
        ] },
      door: { speaker: 'mamaTeo', text: 'The back, after close. I heard the lock turn twice.', effects: [{ addFact: 'lock_twice' }], end: true },
      follow: { speaker: 'mamaTeo', text: 'Only the cat. Miso follows everyone.', end: true },
      again: { speaker: 'mamaTeo', text: 'Back again? Ask, or show me something.',
        present: { lock_twice: 'cracked' }, presentWrong: 'wrong',
        choices: [{ text: 'Never mind.', end: true }] },
      cracked: { speaker: 'mamaTeo', text: 'Twice... then somebody had a key. Dex never owned one.', effects: [{ setFlag: 'teo_cracked' }], end: true },
      wrong: { speaker: 'mamaTeo', text: "That means nothing to me. Eat something.", end: true },
    },
  },
  vending: { start: 'a', nodes: { a: { speaker: 'juno', text: 'Out of order. Naturally.', end: true } } },
  miso: { start: 'a', nodes: { a: { speaker: 'miso', text: 'Mrrp.', end: true } } },
  nobody: { start: 'a', nodes: { a: { speaker: 'juno', text: 'Nothing to say yet.', end: true } } },
};
