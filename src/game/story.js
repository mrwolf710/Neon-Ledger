import EDITS from './dialogue-edits.json' with { type: 'json' }; // made in /editor.html (dev server): text changes and new conversations, laid over the text below

// Story content as plain data: speakers, people, facts, echoes and conversations. Stage 9 writes content here only.
// The dialogue format is documented in NOTES.md.

export const SPEAKERS = {
  juno: { name: 'Juno', color: '#1fd6e8' },
  mamaTeo: { name: 'Mama Teo', color: '#e0217d' },
  kit: { name: 'Worker', alias: { flag: 'kit_named', name: 'Kit' }, color: '#f2a93b' }, // the hostel worker is just "Worker" until the board names him (flag kit_named)
  dex: { name: 'Dex', color: '#8a8a90' },
  vendor: { name: 'Vendor', color: '#2a6b72' },
  miso: { name: 'Miso', color: '#d9771c' },
  vending: { name: 'Vending machine', color: '#9ff4ff' },
  unknown: { name: 'Unknown voice', color: '#e0217d' },
  hale: { name: 'Hale (comms)', alias: { flag: 'bureau_arrived', name: 'Hale' }, color: '#f2a93b' }, // in person from chapter 3
  preacher: { name: 'Holo-preacher', color: '#9ff4ff' },
  // Chapter 2: the Echo Exchange vendors (docs/chapter-2.md)
  vesper: { name: 'Vesper', color: '#ff5a3c' }, mari: { name: 'Mari', color: '#ff8a1f' }, lux: { name: 'Madame Lux', color: '#ffd23a' },
  tobbo: { name: 'Tobbo', color: '#ff7a2a' }, gutter: { name: 'Gutter', color: '#e8a030' }, pim: { name: 'Pim', color: '#ff6a4a' },
  oyo: { name: 'Oyo', color: '#ffb347' }, ruth: { name: 'Ruth', color: '#ff9a3c' }, slate: { name: 'Slate', color: '#ff4a2c' },
  jinx: { name: 'Jinx', color: '#ffc83a' }, bolt: { name: 'Bolt', color: '#ff8030' }, petra: { name: 'Petra', color: '#ff5a50' },
  // The implant dealer's shop and the chapter 2 ending (names are placeholders until the owner picks them).
  dealer: { name: 'Dealer', color: '#ff5a3c' }, fixer: { name: 'Fixer', color: '#ffb347' }, aud1: { name: 'Auditor', color: '#c8d0e8' }, aud2: { name: 'Auditor', color: '#c8d0e8' },
};

// Case file entries. kind decides the tab: people | facts | echoes. source = where Juno learned it.
export const ENTRIES = {
  mamaTeo: { kind: 'people', title: 'Mama Teo', text: 'Runs the Sable Noodle House. Sees everyone who comes and goes.', source: 'Lowmarket Street' },
  teo_back_room: { kind: 'echoes', title: "Mama Teo's echo: the back room", text: "Six seconds from Mama Teo's implant, the night Dex died. Two voices, one of them cut off.", source: "Mama Teo's implant" },
  two_voices: { kind: 'facts', title: "Two voices in the echo", text: "Mama Teo's echo holds two voices. Only Dex is accounted for. The other never came through the front door.", source: "Echo: Mama Teo's back room, 02.0" },
  burned_port: { kind: 'facts', title: "Dex's port was burned from outside", text: "The skin around the burn is clean, so it was not a burnout from inside. Something overrode the implant's lock first. Only the Bureau's auditor code does that.", source: 'The back room' },
  someone_had_key: { kind: 'facts', title: "The visitor had a city key", text: "The second voice got in through the back door, unannounced, with a city master key.", source: 'Deduction board' },
  dex_backup: { kind: 'echoes', title: "Dex's backup echo", text: 'The copy Dex hid in his jacket. Nine seconds, his own eyes, a visitor in his back room.', source: "Dex's backup chip" },
  dex_secret: { kind: 'echoes', title: "Dex's hidden echo", text: 'From Locker 9: a woman in a grey coat reaches for the implant of a dying man. The memory is cut off. The woman is me.', source: "Dex's locker" },
  kit: { kind: 'people', title: 'Kit Lacroix', text: 'The capsule hostel worker. Nervous, talks too much, and sells what he knows for credits.', source: 'Capsule hostel' },
  alley_echo: { kind: 'echoes', title: 'The alley: the back door', text: 'A residue echo in the alley. Someone in a grey glove lets themselves out of the Sable and shuts the door behind them.', source: 'The alley' },
  kit_echo: { kind: 'echoes', title: "The worker's echo: the alley", text: "Eight seconds from the hostel worker's implant, in the alley behind the Sable.", source: "The worker's implant" },
  gloved_hand: { kind: 'facts', title: "A grey Bureau glove on the back door", text: "In the alley echo a hand in a grey Bureau glove pulls the back door shut, and a voice says: 'locks never stop an auditor.'", source: 'Echo: the alley, 02.0' },
  kit_outside: { kind: 'facts', title: 'The hostel worker was in the alley at 23:40', text: "The worker's own echo puts him behind the Sable, right where the gloved visitor left. The implant ID on the echo is scrambled; someone who knows the street might know him.", source: "Echo: the worker's alley, 02.0" },
  override_used: { kind: 'facts', title: "The killer was a Bureau auditor", text: "An auditor override burned the port, and an auditor's glove closed the door.", source: 'Deduction board' },
  kit_name: { kind: 'facts', title: "The worker is Kit Lacroix", text: "Mama Teo knows him: Kit Lacroix, night worker at the Capsule hostel. He sneaks smokes right behind her kitchen, by the Sable's back door.", source: 'Mama Teo' },
  kit_alley: { kind: 'facts', title: 'Kit Lacroix was behind the Sable at 23:40', text: "His own echo puts him at the back door, and Teo names him. He is the worker.", source: 'Deduction board' },
  kit_saw_them: { kind: 'facts', title: "Kit saw the auditor leave", text: "Kit Lacroix stood at the back door when the Bureau auditor came out.", source: 'Deduction board' },
  door_unlocked: { kind: 'facts', title: "The back door was unlocked from outside", text: "Mama Teo locked Dex in. Later the back door, the only other way in, clicked open with no knock. City master keys open every door on Lowmarket.", source: 'Mama Teo' },
  // Chapter 2 clues (ch2: shown on the board after chapter 1) and conclusions
  echo_refused: { ch2: true, kind: 'facts', title: "Dex's echo was \"too hot\" for the broker", text: 'Vesper refused it three days ago. Dex laughed and took it back.', source: 'Vesper, echo broker' },
  locker_receipt: { ch2: true, kind: 'facts', title: 'Receipt: \"Locker 9, paid through the month\"', text: "Stamped with the implant dealer's mark. Dex left it at Mari's hot-sauce stall.", source: 'Mari, hot-sauce cook' },
  suit_gossip: { ch2: true, kind: 'facts', title: 'A man in a dark suit is buying gossip', text: "He pays clean credit for anything about Dex's visitors tonight. \"Especially Bureau.\"", source: 'Madame Lux, fortune-teller' },
  suit_argument: { ch2: true, kind: 'facts', title: 'Dex told the suit: \"You are too late\"', text: '\"It is somewhere you cannot buy it.\" Then the suit paid Tobbo to go away.', source: 'Tobbo, cable seller' },
  locker_rental: { ch2: true, kind: 'facts', title: 'The implant dealer rents out lockers', text: "Spare implants kept in the shop with data loaded. Only the renter, on the dealer's own reader, opens one.", source: 'Gutter, parts scrapper' },
  bureau_woman: { ch2: true, kind: 'facts', title: 'A Bureau woman entered the Sable at 23:10', text: 'Grey coat, Bureau badge. She left near midnight, almost an hour later.', source: 'Pim, umbrella seller' },
  echo_hidden: { ch2: true, kind: 'facts', title: 'Dex hid the echo before he died', text: 'The broker says he still had it. He told the suit it was out of reach.', source: 'Deduction board' },
  locker_rented: { ch2: true, kind: 'facts', title: "Dex rented a locker at the implant dealer's", text: 'Locker 9: a spare implant stored in the shop.', source: 'Deduction board' },
  echo_at_dealer: { ch2: true, kind: 'facts', title: "The echo is in a locker at the dealer's shop", text: "Hidden where only the dealer's reader can open it.", source: 'Deduction board' },
  fixer_hunting: { ch2: true, kind: 'facts', title: 'The fixer is hunting the Bureau woman', text: 'He is buying news of a Bureau visitor, and one was at the Sable. That is me.', source: 'Deduction board' },
};

// Which conversation each talkable thing starts. Missing ids fall back to FALLBACK.
export const TALK = { dealer: 'dealer_talk', mamaTeo: 'teo', vending: 'vending', miso: 'miso', vendor: 'vendor', preacher: 'preacher', kit: 'kit',
  vesper: 'vend_vesper', mari: 'vend_mari', lux: 'vend_lux', tobbo: 'vend_tobbo', gutter: 'vend_gutter', pim: 'vend_pim', oyo: 'vend_oyo', ruth: 'vend_ruth', slate: 'vend_slate', jinx: 'vend_jinx', bolt: 'vend_bolt', petra: 'vend_petra' };
export const FALLBACK = 'nobody';
export const ALARM_CONVS = new Set(['hale_end', 'car_reply']); // Hale's forced call at the end of chapter 1: the dialogue and portrait boxes turn red
// What a speaker is called right now: an alias replaces the name once its flag is set.
export const speakerName = (id, flag) => { const s = SPEAKERS[id]; return !s ? id : s.alias && flag?.(s.alias.flag) ? s.alias.name : s.name; };
// Rules from the editor: [{ conv, npc, when: 'all' | '1'..'4' (4 = the 4th visit on), fact?: a fact Juno must know, talked?: a person she must already have talked to }].
// Ones with conditions are tried first; the first that fits wins, else the visit lists below, else the game's own TALK.
export const RULES = EDITS._rules ?? [];
// Which conversation plays on each visit, from the editor (older format): VISITS[personId] = [1st, 2nd, 3rd, 4th and later]; '' = the normal one (TALK).
export const VISITS = EDITS._visits ?? {};
// Flags set by the end of conversations made in the editor (matched by id; the last line of the conversation gets them).
const TEO_POINTS = 'Mama_Teo_Points_to_Capsule_Hotel';
const DONE_EFFECTS = { Capsule_after_Teo: [{ setFlag: 'kit_paid' }], Mama_Teo_Points_to_Capsule_Hotel: [{ setFlag: 'teo_pointed' }, { setFlag: 'teo_cracked' }] };
export function conversationFor(personId, visit, ctx = {}) {
  if (personId === 'mamaTeo' && ctx.has?.('kit_outside') && !ctx.has('kit_name')) return 'teo_worker'; // the worker's echo is in the case file: Teo names him
  if (personId === 'kit' && !ctx.flag?.('key_deduced')) return 'kit_hey'; // he is out on the street until the Sable clues are put together: he only says hello
  if (personId === 'kit' && ctx.flag?.('kit_paid')) return ctx.flag('kit_deduced') ? 'kit' : 'kit_wait'; // once paid: a short line until the board names him, then the interview
  const fits = (r) => r.npc === personId && (r.when === 'all' || (r.when === '4' ? visit >= 4 : +r.when === visit))
    && (!r.fact || ctx.has?.(r.fact)) && (!r.talked || ctx.talked?.(r.talked));
  const rules = RULES.filter((r) => !(r.conv === TEO_POINTS && ctx.flag?.('teo_pointed'))); // Teo points to the hostel once, not on every visit
  const hit = rules.filter((r) => r.fact || r.talked).find(fits) ?? rules.filter((r) => !r.fact && !r.talked).find(fits);
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
  { id: 'capsule', area: 'hostel', spot: 'capsule3f', verb: 'Search', conv: 'ex_capsule' },
  { id: 'glove', area: 'alley', spot: 'glove', verb: 'Examine', conv: 'ex_glove' },
];

// One-line examine conversation: Juno speaks, adds the fact and sets the flag ex_<id>; examining again gives a shorter line.
const examine = (id, fact, text, again) => ({
  start: [{ if: { flag: `ex_${id}` }, node: 'again' }, { node: 'a' }],
  nodes: {
    a: { speaker: 'juno', text, effects: [...(fact ? [{ addFact: fact }] : []), { setFlag: `ex_${id}` }], end: true },
    again: { speaker: 'juno', text: again, end: true },
  },
});

// Chapter 2 vendor talk. lines: [speaker, text, fact?]; the clue (addFact) comes on the line that carries it; the flag vend_<id> makes later visits play `again`.
const vendorTalk = (id, lines, again) => {
  const nodes = {};
  lines.forEach(([sp, text, fact], i) => {
    const last = i === lines.length - 1, effects = [...(fact ? [{ addFact: fact }] : []), ...(last ? [{ setFlag: `vend_${id}` }] : [])];
    nodes[`n${i}`] = { speaker: sp, text, ...(effects.length ? { effects } : {}), ...(last ? { end: true } : { next: `n${i + 1}` }) };
  });
  nodes.again = { speaker: id, text: again, end: true };
  return { start: [{ if: { flag: `vend_${id}` }, node: 'again' }, { node: 'n0' }], nodes };
};
const VENDOR_TALK = {
  vesper: { again: 'I said no, and I meant it. Move along.', lines: [
    ['juno', "I'm looking into Dex Morrow. Broker, like you."], ['vesper', 'Dex. Dead, I hear. He came by three days ago with an echo he swore would make us both rich.'],
    ['vesper', 'One look at the tag and I said no. Too hot. He just laughed and took it back.', 'echo_refused'], ['juno', 'Too hot how?'], ['vesper', "The kind that gets people deleted. That's all you get, auditor."]] },
  mari: { again: 'Take the receipt if you want it. Take a sauce too.', lines: [
    ['juno', 'You know a man called Dex?'], ['mari', 'Dex ate here every night. Extra pepper, never tipped.'],
    ['mari', "He left a receipt stuck to my counter. Lucky paper. 'Locker 9, paid through the month.' Stamped with the implant dealer's mark.", 'locker_receipt'],
    ['juno', 'Locker 9.'], ['mari', "Don't ask me what locker. I sell hot sauce."]] },
  lux: { again: "The suit's been and gone. Ask the cards if you like.", lines: [
    ['juno', 'Anything about a broker called Dex?'], ['lux', "The cards don't say, but customers do. A man in a dark suit is paying well for gossip tonight. Who visited Dex, who came, who left."],
    ['lux', "He said 'especially Bureau.' He paid in clean credit. Nobody here has clean credit.", 'suit_gossip'], ['juno', '(Clean credit. Corporate money.)']] },
  tobbo: { again: "That's all I heard. Cables are three for ten.", lines: [
    ['juno', 'Did you see Dex tonight?'], ['tobbo', 'Earlier, right here by the cables. Shouting at a man in a dark suit.'],
    ['tobbo', "Dex says, 'You're too late. It's somewhere you can't buy it.' Then the suit pays me to go away. I took the cash and went.", 'suit_argument']] },
  gutter: { again: "I've told you what I know. I fix ports, not secrets.", lines: [
    ['juno', 'If someone wanted to hide data, where would they put it?'], ['gutter', "Not in their head, that's for sure. The implant dealer here rents lockers. Spare implants kept in the shop, with data loaded."],
    ['gutter', "Only the renter can pull one, and only on the dealer's own reader. Don't ask me about the dealer. Don't touch the lockers.", 'locker_rental']] },
  pim: { again: 'Please. I only said what I saw.', lines: [
    ['juno', 'Were you near the Sable tonight?'], ['pim', 'I sell umbrellas on rainy nights, miss. I go where it rains. That is everywhere.'],
    ['pim', 'I saw a woman with a Bureau badge go in around ten past eleven. Out again close to midnight. Nearly an hour.', 'bureau_woman'],
    ['pim', "Grey coat, badge. She looked lost. I didn't say anything to anyone."], ['juno', '(Ten past eleven. Almost midnight. Forty-seven minutes.)']] },
  oyo: { again: 'Still not buying? Then move along.', lines: [['oyo', "If you're not buying, move along."], ['oyo', "And don't touch the broth. Rain gets in everything down here."]] },
  ruth: { again: 'Look all you like. Buying or leaving.', lines: [['ruth', 'Rings, chains, no questions. Buying?'], ['ruth', 'Everything on this table was on someone\'s hand once. Nobody asks whose.']] },
  slate: { again: 'I said nothing. Go away.', lines: [['slate', "An auditor? I print nothing. I've never printed anything. Move along."], ['slate', "Echoes fade in seventy-two hours down here, unless somebody pays to keep them. You didn't hear that."]] },
  jinx: { again: 'Still here? Buy or walk.', lines: [['jinx', "Two for five, no refunds. No? Then you're blocking my light."], ['jinx', 'Stims keep you awake. Awake keeps you remembering. Some folks pay to forget.']] },
  bolt: { again: 'Not today, auditor.', lines: [['bolt', "Mine's in pieces, yours would be too. Not buying? Walk."], ['bolt', 'Drones record everything now. Half the bits in here are evidence nobody claimed.']] },
  petra: { again: 'Please, I only sell flowers.', lines: [['petra', "Don't arrest me, they're plastic! Buy one or please keep moving."], ['petra', 'The real ones died with the old market. Now it is plastic and echoes.']] },
};

export const CONVERSATIONS = {
  // Beat 1: Hale on comms as Juno steps off the train.
  hale_open: { start: 'a', nodes: {
    a: { speaker: 'hale', text: "Vale. Lowmarket, the Sable Noodle House. A broker's dead and his implant is fried.", next: 'a2' },
    a2: { speaker: 'hale', text: "Looks like a burnout. Just sign off on what you find and go home. Don't make this into more than it is. I don't need a repeat of last time, Juno.", next: 'b' },
    b: { speaker: 'juno', text: 'Copy that. Sorry, I think I lost another hour on that train.', next: 'c' },
    c: { speaker: 'hale', text: 'Everybody loses an hour on Line 9, Vale. Get it done.', end: true },
  } },
  ex_body: examine('body', null, 'Dex Morrow. Mid-level echo broker. No wounds, no struggle. Whatever did this was quiet.', 'Dex Morrow. Still no marks on him.'),
  ex_port: examine('port', 'burned_port', "The port at his temple is burned black, but the skin around it is clean. A burnout from the inside would have scorched that too.", 'The port. Burned from the outside, I would bet.'),
  ex_cups: examine('cups', null, 'Two cups on the table. Both used, and one is still warm. Dex had company.', 'Two cups. Two people.'),
  ex_terminal: examine('terminal', null, "The back door terminal. One entry logged tonight. Zero exits. Whoever came in never left, or the log is lying.", 'One in, none out. That log is wrong or somebody is still here.'),
  ex_lamp: examine('lamp', null, 'The corner lamp is smashed, glass swept toward the door. Someone wanted the room dark.', 'Smashed on purpose. Dark room, quiet exit.'),
  ex_glove: examine('glove', null, "A grey glove. Bureau issue. I have a pair just like it.", 'Bureau grey. Same as mine.'),
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
        next: 'more' },
      follow: { speaker: 'mamaTeo', text: "Someone came in but I didn't see them. And no one else came through the front tonight except for you and the cat.", next: 'more' },
      more: { speaker: 'mamaTeo', text: 'Anything else, or are you going to eat?',
        choices: [...TEO_QUESTIONS, { text: "That's all.", end: true }] },
      again: { speaker: 'mamaTeo', text: 'Back again? What is it this time?',
        present: { door_unlocked: 'shrug', someone_had_key: 'cracked' }, presentWrong: 'wrong',
        choices: [...TEO_QUESTIONS, { text: 'Never mind.', end: true }] },
      shrug: { speaker: 'mamaTeo', text: "Yes, I told you that. City business, most likely.", end: true },
      cracked: { speaker: 'mamaTeo', text: "A city key, then. Crews, an inspector, the Bureau... but none of them work at midnight, and none of them sit down with a client. Find out who signed out a key tonight.",
        effects: [{ setFlag: 'teo_cracked' }], end: true },
      wrong: { speaker: 'mamaTeo', text: "That means nothing to me. Eat something.", end: true },
      after: { speaker: 'mamaTeo', text: "I've told you what I know. Find out who signed out a key tonight.", end: true },
    },
  },
  // Kit (the hostel worker). Out on the street until the key deduction (flag key_deduced) he only says hello (kit_hey). Before the board names him he only says capsule 3F is open (kit_wait). After the deduction (flag kit_named) Juno calls him Kit,
  // he claims he left capsule 3F at 23:00 ; present kit_outside (his echo) to break the story, then kit_saw_them for the coat.
  kit_wait: { start: 'a', nodes: { a: { speaker: 'kit', text: 'Capsule 3F is open, like I said. Come back when you know something worth another 30 credits.', end: true } } },
  kit_hey: { start: 'a', nodes: { a: { speaker: 'kit', text: "Hey, what's up?", end: true } } },
  // Mama Teo names the worker from the alley echo (the only way Juno learns his name; sets kit_named so he is called Kit from here on).
  teo_worker: { start: [{ if: { flag: 'teo_pointed' }, node: 'a2' }, { node: 'a' }], nodes: {
    a2: { speaker: 'juno', text: 'The worker at the capsule hostel was out in the alley behind your place at 23:40. Who is he?', next: 'b2' },
    b2: { speaker: 'mamaTeo', text: "Kit. Kit Lacroix, the boy at the desk you've already been sent to. He thinks I don't see him smoking behind my kitchen.", effects: [{ addFact: 'kit_name' }, { setFlag: 'kit_named' }, { setFlag: 'teo_pointed' }, { setFlag: 'teo_cracked' }], end: true },
    a: { speaker: 'juno', text: 'The worker at the capsule hostel was out in the alley behind your place at 23:40. Who is he?', next: 'b' },
    b: { speaker: 'mamaTeo', text: "Kit. Kit Lacroix. Nights at the Capsule hostel since spring. He thinks I don't see him smoking behind my kitchen.", next: 'c' },
    c: { speaker: 'mamaTeo', text: 'Talks too much, that boy. Go see him. He is easy to find, he never leaves the front desk.', effects: [{ addFact: 'kit_name' }, { setFlag: 'kit_named' }, { setFlag: 'teo_pointed' }, { setFlag: 'teo_cracked' }], end: true },
  } },
  kit: {
    start: [{ if: { flag: 'kit_coat' }, node: 'done' }, { if: { flag: 'kit_broken' }, node: 'after' }, { if: { flag: 'kit_met' }, node: 'again' }, { node: 'hello' }],
    nodes: {
      hello: { speaker: 'juno', text: "Kit Lacroix. Mama Teo says you were the one out behind her kitchen.", effects: [{ addPerson: 'kit' }, { setFlag: 'kit_met' }], next: 'hello2' },
      hello2: { speaker: 'kit', text: 'Keep your voice down! I do not know what echo you mean. I was up in capsule 3F with a leaking pipe, done by eleven, then straight to my bunk.',
        next: 'hello3' },
      hello3: { speaker: 'juno', text: 'Eleven. Sure.', end: true },
      again: { speaker: 'kit', text: 'Still here, still innocent. What now?',
        present: { kit_outside: 'broken', kit_saw_them: 'coat' }, presentWrong: 'wrong',
        choices: [{ text: 'Nothing yet.', end: true }] },
      wrong: { speaker: 'kit', text: "I do not know what that is. Can I go back to pretending to sleep?", end: true },
      broken: { speaker: 'kit', text: '...Okay. Okay! I was out back. Twenty to midnight, a smoke I am not supposed to have. Do not tell the manager.', effects: [{ setFlag: 'kit_broken' }], next: 'broken2' },
      broken2: { speaker: 'kit', text: 'I was behind the Sable. I did not see anything. Do not look at me like that.', end: true },
      after: { speaker: 'kit', text: "I told you I was out back. What else do you want from me?",
        present: { kit_saw_them: 'coat' }, presentWrong: 'wrong', choices: [{ text: 'Nothing yet.', end: true }] },
      coat: { speaker: 'kit', text: "Fine. Somebody came out of that door. Long grey coat, Bureau collar, gloves. Head down, in no hurry. Like they owned the street.", effects: [{ setFlag: 'kit_coat' }, { setFlag: 'kit_broken' }], next: 'coat2' },
      coat2: { speaker: 'kit', text: "No face. I swear. The hood, the rain, the lamps going out... that's all I have.", next: 'coat3' },
      coat3: { speaker: 'juno', text: "(Dex's chip. I need to check it for more, and I can do that in my car.)", end: true },
      done: { speaker: 'kit', text: 'A Bureau coat. That is all I know. Go away, auditor.', end: true },
    },
  },
  // Dex's capsule (capsule 3F, hostel): Kit unlocks it for 30 credits (flag kit_paid, set by the editor conversation Capsule_after_Teo, see DONE_EFFECTS).
  ex_capsule: { start: [{ if: { flag: 'ex_capsule' }, node: 'again' }, { if: { notFlag: 'kit_paid' }, node: 'locked' }, { node: 'a' }], nodes: {
    a: { speaker: 'juno', text: 'Capsule 3F. A thin pillow, a dead plant, and a data chip taped under the bunk. Dex hid his backup well.', effects: [{ setFlag: 'ex_capsule' }], end: true },
    again: { speaker: 'juno', text: 'Nothing else in here. Dex travelled light.', end: true },
    locked: { speaker: 'juno', text: "Dex's capsule. The hatch is locked. Somebody here has the key.", end: true },
  } },
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
    a: { speaker: 'juno', text: "Dex's backup chip, from under his bunk in capsule 3F. The one echo he was afraid of.", next: 'b' },
    b: { speaker: 'juno', text: 'Fine. Let us see what scared him.', end: true },
  } },
  chip_early: { start: 'a', nodes: { a: { speaker: 'juno', text: 'Not yet. I need to find Dex backup and know who is lying to me first.', end: true } } },
  log_open: { start: 'a', nodes: {
    a: { speaker: 'juno', text: 'Forty-seven minutes. That is not overwork.', end: true },
  } },
  // Juno, alone with it, before Hale calls.
  self_doubt: { start: 'a', nodes: {
    a: { speaker: 'juno', text: '(That was me. My coat. My gloves. I was in that room with Dex.)', next: 'b' },
    b: { speaker: 'juno', text: "(That's impossible. I would remember it. I would...)", end: true },
  } },
  hale_end: { start: 'a', nodes: {
    a: { speaker: 'hale', text: 'Juno.', next: 'b' },
    b: { speaker: 'hale', text: 'Where were you tonight between 23:10 and 23:57?', end: true },
  } },
  // After Hale's question (chapter 1 -> 2): Juno will not go in yet, and picks where to look next. See docs/chapter-2.md.
  car_reply: { start: 'a', nodes: {
    a: { speaker: 'juno', text: "Still working it, Hale. I'll bring you something real.", next: 'b' },
    b: { speaker: 'hale', text: 'Come in. Now. And bring the chip.', next: 'c' },
    c: { speaker: 'juno', text: "Not yet. If I walk into the Bureau with a dead broker and a hole in my memory, I won't walk out. I need to know what Dex was carrying first.", end: true },
  } },
  car_decide: { start: 'a', nodes: {
    a: { speaker: 'juno', text: '(Brokers all end up in one place. The Echo Exchange. Somebody there knows what he was selling. Time for a little drive.)', end: true },
  } },
  // ---- Chapter 2: the Echo Exchange (docs/chapter-2.md). Each clue vendor gives their clue on the first talk, in any order; later talks give a short repeat line. ----
  // The implant dealer: show him the receipt for Locker 9, then Juno can open it (beats.dealerScene).
  dealer_talk: { start: [{ if: { flag: 'locker_ok' }, node: 'again' }, { node: 'a' }], nodes: {
    a: { speaker: 'dealer', text: "Spare implants, secondhand ports, secrets kept safe. You're not a buyer. That coat says Bureau.", next: 'b' },
    b: { speaker: 'juno', text: 'Dex Morrow rented a locker here. Locker 9.', next: 'c' },
    c: { speaker: 'dealer', text: "Lockers are private. The renter and my reader, nobody else. Unless you can prove it's yours to open.", present: { locker_receipt: 'ok' }, presentWrong: 'wrong', choices: [{ text: 'Never mind.', end: true }] },
    wrong: { speaker: 'dealer', text: "That's not my stamp on anything.", next: 'c' },
    ok: { speaker: 'dealer', text: "That's my stamp. Paid through the month, and the renter's dead, so the month is nobody's problem. The reader's by the locker wall. I didn't see you.", effects: [{ setFlag: 'locker_ok' }], end: true },
    again: { speaker: 'dealer', text: "Reader's by the locker wall. Whatever you do in there, I'm looking the other way.", end: true },
  } },
  // The other lockers in the implant shop: just a line each.
  ...Object.fromEntries([[7, "(Locker 7. Somebody else's secrets, kept safe. Not mine to open.)"], [8, "(Locker 8. A tag on it in a language I don't know. None of my business.)"], [10, "(Locker 10. Empty, or paid up and forgotten. Either way, it isn't Dex's.)"], [11, "(Locker 11. Sealed and humming. I'll leave it that way.)"]].map(([n, text]) => [`locker_${n}`, { start: 'a', nodes: { a: { speaker: 'juno', text, end: true } } }])),
  locker_shut: { start: 'a', nodes: { a: { speaker: 'juno', text: "(Locker 9. Sealed. The reader won't open it for me, not until the dealer says so.)", end: true } } },
  locker_open: { start: 'a', nodes: {
    a: { speaker: 'juno', text: "(Locker 9. A spare implant in a foam cradle, Dex's tag on it, still warm.)", next: 'b' },
    b: { speaker: 'juno', text: '(Into the reader.)', end: true },
  } },
  // The fixer steps in once Dex's echo has played. Takes the faster route if Juno worked out he was hunting her (flag fixer_knows).
  fixer_deal: { start: [{ if: { flag: 'fixer_knows' }, node: 'sk' }, { node: 's' }], nodes: {
    s: { speaker: 'juno', text: 'Who—? You!', next: 's2' },                                  // Juno comes out of Dex's memory and he is right there
    s2: { speaker: 'juno', text: "(The man in the dark suit. I never heard the door. How long has he been standing behind me?)", next: 'a' },
    sk: { speaker: 'juno', text: 'You! The suit. I never heard you come in.', next: 'sk2' },
    sk2: { speaker: 'juno', text: "(He's the one hunting me, and I walked right into a locker room with my back to the door.)", next: 'a2' },
    a: { speaker: 'fixer', text: "Don't be alarmed, Ms. Vale. If I wanted you hurt, the door would already be shut.", next: 'b' },
    a2: { speaker: 'fixer', text: "You worked out I was looking for you. Good, it saves time. Yes, I know it was you at the Sable, 23:10.", next: 'b' },
    b: { speaker: 'juno', text: '(A dark suit. The man buying gossip about every visitor Dex had tonight.)', next: 'd' },
    d: { speaker: 'fixer', text: 'That echo proves what the Bureau does to its own auditors after an off-book job. I want it. In return your forty-seven minutes never happened, and the case closes on a burglar.', next: 'e' },
    e: { speaker: 'juno', text: 'And Dex?', next: 'f' },
    f: { speaker: 'fixer', text: "Dex sold his memory to the wrong people. Don't make his mistake. Well?", choices: [
      { text: "It's not for sale.", next: 'no', effects: [{ setFlag: 'refused_deal' }] }, { text: "I'll think about it.", next: 'maybe' }] },
    no: { speaker: 'juno', text: "It's the only true thing I have. It stays with me.", next: 'g' },
    maybe: { speaker: 'juno', text: 'Give me a minute.', next: 'g' },
    g: { speaker: 'fixer', text: "You don't have one. Three Bureau auditors are waiting outside. Hand it over, and I can make them go away.", next: 'h' },
    h: { speaker: 'fixer', text: "I'll be nearby, Ms. Vale. Walk out that door and you will see I was not lying. Then you will know who your friends are.", end: true },
  } },
  // After the fixer has gone: Juno to herself, then she makes up her mind about Hale.
  after_fixer: { start: 'a', nodes: {
    a: { speaker: 'juno', text: '(Calm, polite, and he knew exactly where I would be. He has been a step ahead of me all night.)', next: 'b' },
    b: { speaker: 'juno', text: "(He wants this echo as badly as the Bureau does. Which means I can't trust either of them.)", next: 'c' },
    c: { speaker: 'juno', text: "Enough running. Hale, I'm ready to talk.", end: true },
  } },
  auditors: { start: 'a', nodes: {
    a: { speaker: 'aud1', text: 'Juno Vale. Bureau Audit Division. You are coming with us.', next: 'b' },
    b: { speaker: 'juno', text: 'On whose authority?', next: 'c' },
    c: { speaker: 'aud1', text: "Director Hale's. She said you'd ask.", next: 'd' },
    d: { speaker: 'aud2', text: 'The echo. And your badge. Now.', next: 'e' },
    e: { speaker: 'juno', text: '(Three auditors in front, a suit behind me, and a hole in my memory where the truth should be.)', next: 'f' },
    f: { speaker: 'aud1', text: 'Quietly, Vale. Please.', next: 'g' },
    g: { speaker: 'juno', text: "This is what she wanted. Fine. Let's go.", end: true },   // Juno has the last word
  } },
  dealer_locked: { start: 'a', nodes: { a: { speaker: 'juno', text: "(Shuttered. Whatever is in there, I don't know enough to knock yet.)", end: true } } },
  dealer_next: { start: 'a', nodes: { a: { speaker: 'juno', text: "(The dealer's shop. Dex's echo is in there. Whoever else wants it is closing in.)", end: true } } },
  ...Object.fromEntries(Object.entries(VENDOR_TALK).map(([id, v]) => [`vend_${id}`, vendorTalk(id, v.lines, v.again)])),
  // Chapter 3: Juno is walked into Hale's office. PLACEHOLDER lines; the real scene is the owner's to write (docs/chapter-3.md).
  hale_office: { start: 'a', nodes: {
    a: { speaker: 'hale', text: 'Sit down, Juno.', next: 'b' },
    b: { speaker: 'hale', text: 'Auditors. Wait outside.', end: true },
  } },
  hale_talk: { start: 'a', nodes: { a: { speaker: 'hale', text: 'Not now, Juno. Wait for me here.', end: true } } },
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

for (const [id, eff] of Object.entries(DONE_EFFECTS)) {
  const nodes = Object.values(CONVERSATIONS[id]?.nodes ?? {}), last = nodes[nodes.length - 1];
  if (last) last.effects = [...(last.effects ?? []), ...eff];
}
// Conversations rebuilt in the editor's Story flow tab replace the game's own (last, so they win over the text edits above).
for (const [id, g] of Object.entries(EDITS._graph ?? {})) CONVERSATIONS[id] = { start: g.start, nodes: g.nodes };

// Echo hotspots: where F starts an echo. at: [x, z] or { spot, dx, dz } relative to a named batch spot.
export const HOTSPOTS = [
  { id: 'teo_back_room', area: 'sable', echo: 'teo_back_room', at: { spot: 'echo' }, radius: 2.6 },
  { id: 'alley_echo', area: 'alley', echo: 'alley_echo', at: { spot: 'echo', dx: 0, dz: 0 }, radius: 2.4 },
  { id: 'dex_backup', area: 'car', echo: 'dex_backup', at: { spot: 'seat' }, radius: 1, hidden: true }, // beat 7, played by beats.js (no marker, no F)
  { id: 'dex_secret', area: 'dealer', echo: 'dex_secret', at: { spot: 'locker' }, radius: 1, hidden: true }, // chapter 2: played by beats.dealerScene (no marker, no F)
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
      { redacted: true, sprite: 'figure', show: [1.4, 6], keys: [
        { t: 1.4, x: 157.8, z: -1.2, facing: -Math.PI / 2, anim: 'walk' }, { t: 2.6, x: 156.0, z: -1.2, facing: -Math.PI / 2, anim: 'walk' },
        { t: 2.8, x: 156.0, z: -1.2, facing: -Math.PI / 2, anim: 'idle' }, { t: 3.49, x: 156.0, z: -1.2, facing: -Math.PI / 2, anim: 'idle' },
        { t: 3.5, x: 157.2, z: -2.0, facing: Math.PI, anim: 'idle' }, { t: 6, x: 157.2, z: -2.0, facing: Math.PI, anim: 'idle' },
      ] },
    ],
    voices: [
      { t0: 0.1, t1: 1.2, speaker: 'juno', text: "(Mama Teo's memory: Dex, alive, alone in his back room.)" },
      { t0: 1.3, t1: 2.7, speaker: 'dex', text: "...you weren't supposed to know I kept a copy." },
      { t0: 2.8, t1: 4.4, speaker: 'unknown', text: 'Then tell me where it is.' },
      { t0: 4.5, t1: 6, speaker: 'juno', text: '(Someone walked in on him. Their face is scrubbed out. Two voices: tag them.)' },
    ],
    seams: [3.5],
    tags: [{ t: 2.0, window: 0.9, fact: 'two_voices', label: 'Two voices' }],
  },
  // The alley (origin x 300): the Sable's back door is at z -7.96. A figure steps out and pulls it shut; the hand wears a grey glove.
  alley_echo: {
    title: 'The back door', owner: 'unknown', entry: 'alley_echo', duration: 6,
    tracks: [
      { redacted: true, sprite: 'figure', keys: [
        { t: 0, x: 300, z: -7.0, facing: Math.PI, anim: 'idle' }, { t: 2.4, x: 300, z: -7.0, facing: Math.PI, anim: 'idle' },
        { t: 2.5, x: 300, z: -6.4, facing: 0, anim: 'walk' }, { t: 6, x: 300.4, z: 1.5, facing: 0, anim: 'walk' },
      ] },
    ],
    voices: [{ t0: 0.6, t1: 2.2, speaker: 'unknown', text: '...locks never stop an auditor.' }],
    seams: [],
    tags: [{ t: 2.0, window: 0.8, fact: 'gloved_hand', label: 'Grey glove on the door' }],
  },
  // Beat 7: Dex's hidden backup, from his eyes in the Sable's back room (origin x 150, beats.js jumps there to play it). A hooded stranger sits across the table from him, then leans into the light: it is Juno.
  dex_backup: {
    title: "Dex's backup", owner: 'dex', entry: 'dex_backup', duration: 9,
    tracks: [
      { sprite: 'dexStanding', keys: [{ t: 0, x: 153.2, z: 0.4, facing: Math.PI / 2, anim: 'idle' }, { t: 1.6, x: 153.2, z: 0.4, facing: 1.18, anim: 'idle' }, { t: 3.0, x: 153.2, z: 0.4, facing: Math.PI / 2, anim: 'idle' }, { t: 9, x: 153.2, z: 0.4, facing: Math.PI / 2, anim: 'idle' }] }, // turns to follow the visitor as she walks in, then faces her seat
      { redacted: true, sprite: 'figure', show: [1.6, 4.6], keys: [
        { t: 1.6, x: 156.6, z: 1.8, facing: Math.PI, anim: 'walk' }, { t: 3.0, x: 156.0, z: 0.4, facing: -Math.PI / 2, anim: 'walk' }, { t: 3.2, x: 156.0, z: 0.4, facing: -Math.PI / 2, anim: 'idle' }, { t: 4.6, x: 156.0, z: 0.4, facing: -Math.PI / 2, anim: 'idle' },
      ] },
      { sprite: 'juno', show: [4.6, 9], keys: [{ t: 4.6, x: 156.0, z: 0.4, facing: -Math.PI / 2, anim: 'idle' }, { t: 9, x: 156.0, z: 0.4, facing: -Math.PI / 2, anim: 'idle' }] },
    ],
    voices: [
      { t0: 2.4, t1: 4.4, speaker: 'dex', text: 'You came yourself. Of course you did.' },
      { t0: 5.0, t1: 6.8, speaker: 'juno', text: 'Where is the other copy, Dex?' },
      { t0: 7.2, t1: 8.8, speaker: 'dex', text: "...you won't remember this, will you." },
    ],
    seams: [], tags: [],
    cues: [{ t: 4.6, name: 'stinger' }], // the hooded figure leans into the light and is Juno
  },
  // Chapter 2: Dex's hidden echo from Locker 9 (dealer shop, origin x 900). A teaser only: a dying man in a chair, a grey-coated woman steps in and reaches for his implant, then it cuts out.
  dex_secret: {
    title: "Dex's hidden echo", owner: 'dex', entry: 'dex_secret', duration: 7,
    tracks: [
      { sprite: 'dex', keys: [{ t: 0, x: 901.4, z: -0.6, facing: Math.PI, anim: 'idle' }, { t: 7, x: 901.4, z: -0.6, facing: Math.PI, anim: 'idle' }] },
      { sprite: 'juno', show: [1.4, 5.2], keys: [{ t: 1.4, x: 903.6, z: 1.2, facing: -2.2, anim: 'walk' }, { t: 3.4, x: 902.2, z: 0.2, facing: -2.2, anim: 'walk' }, { t: 3.6, x: 902.2, z: 0.2, facing: -2.2, anim: 'idle' }, { t: 5.2, x: 902.2, z: 0.2, facing: -2.2, anim: 'idle' }] },
    ],
    voices: [
      { t0: 0.6, t1: 2.2, speaker: 'dex', text: 'Not... you.' },
      { t0: 2.3, t1: 3.7, speaker: 'juno', text: '(Dex, dying. A woman in a grey coat is reaching for his implant.)' },
      { t0: 3.8, t1: 5.0, speaker: 'dex', text: "Don't. I recorded it. All of it." },
      { t0: 5.3, t1: 7, speaker: 'juno', text: '(The memory cuts off. The woman in grey... is me.)' },
    ],
    seams: [5.2], tags: [],
    cues: [{ t: 5.2, name: 'stinger' }],
  },
  // Kit, out behind the Sable at 23:40, watches the gloved visitor leave.
  kit_echo: {
    title: "The worker's view", owner: 'kit', entry: 'kit_echo', duration: 8,
    tracks: [
      { sprite: 'kit', keys: [
        { t: 0, x: 299.2, z: -1.5, facing: Math.PI, anim: 'idle' }, { t: 8, x: 299.2, z: -1.5, facing: Math.PI, anim: 'idle' },
      ] },
      { redacted: true, sprite: 'figure', show: [3.6, 8], keys: [
        { t: 3.6, x: 300, z: -7.0, facing: 0, anim: 'walk' }, { t: 8, x: 300.6, z: 3.0, facing: 0, anim: 'walk' },
      ] },
    ],
    voices: [{ t0: 1.0, t1: 3.2, speaker: 'kit', text: "23:40. Not my business. Keep walking." }],
    seams: [],
    tags: [{ t: 2.0, window: 1.4, fact: 'kit_outside', label: 'The worker in the alley, 23:40' }],
  },
};

// Deduction board: each conclusion needs a pair (or trio) of fact ids linked together on the board.
//  { id, needs: [factId, ...], result: ENTRIES fact id shown as the conclusion card, line: Juno's line when it locks in, effects }.
//  Optional requires: [factId] = facts Juno must also hold before the pair is offered. A pair locks on one link; a trio needs links that connect all three. Wrong links snap back with a line from wrongLines;
//  every 3rd wrong link that touches a conclusion's facts makes Juno hint at one it still needs ({fact} = its title).
export const BOARD = {
  wrongLines: ["That doesn't connect.", 'No. Those two have nothing to do with each other.', 'Close, maybe. But no.', "Not like that."],
  partialLine: 'That fits. There has to be more to it.',
  hintLine: 'I keep coming back to “{fact}”.',
  conclusions: [
    { id: 'someone_had_key', needs: ['door_unlocked', 'two_voices'], result: 'someone_had_key',
      line: "(Locked in, then the back door clicks open with no knock. City master keys, and a second voice in the echo. Someone with city access sat down with Dex.)",
      effects: [{ addFact: 'someone_had_key' }, { setFlag: 'key_deduced' }] },
    { id: 'override_used', needs: ['burned_port', 'gloved_hand'], result: 'override_used',
      line: "(A port burned from outside takes an auditor's code, and a voice at that door says locks never stop an auditor. Bureau grey on the glove. It was one of us.)",
      effects: [{ addFact: 'override_used' }] },
    { id: 'kit_alley', needs: ['kit_outside', 'kit_name'], result: 'kit_alley',
      line: '(The echo has the worker behind the Sable at 23:40, and Teo says that worker is Kit Lacroix. Kit was right there.)',
      effects: [{ addFact: 'kit_alley' }] },
    { id: 'kit_saw_them', needs: ['override_used', 'kit_alley'], requires: ['override_used', 'kit_alley'], result: 'kit_saw_them',
      line: '(An auditor used an override on Dex and left by the back door, and Kit was standing at that door. Kit saw them leave.)',
      effects: [{ addFact: 'kit_saw_them' }, { setFlag: 'kit_deduced' }, { setFlag: 'kit_named' }] },
    { id: 'echo_hidden', needs: ['echo_refused', 'suit_argument'], result: 'echo_hidden',
      line: "(He still had it, and he told the suit it was somewhere he couldn't buy. Dex hid the echo before he died.)", effects: [{ addFact: 'echo_hidden' }] },
    { id: 'locker_rented', needs: ['locker_receipt', 'locker_rental'], result: 'locker_rented',
      line: '(A receipt for Locker 9, and the dealer rents lockers: spare implants kept in the shop. Dex rented one.)', effects: [{ addFact: 'locker_rented' }] },
    { id: 'echo_at_dealer', needs: ['echo_hidden', 'locker_rented'], requires: ['echo_hidden', 'locker_rented'], result: 'echo_at_dealer',
      line: "(Hidden, and the only hiding place I know of is a dealer's locker. The echo is in that shop. The dealer.)", effects: [{ addFact: 'echo_at_dealer' }, { setFlag: 'dealer_open' }] },
    { id: 'fixer_hunting', needs: ['suit_gossip', 'bureau_woman'], result: 'fixer_hunting',
      line: "(He wants a Bureau visitor, and a Bureau woman was at the Sable. He's hunting me.)", effects: [{ addFact: 'fixer_hunting' }, { setFlag: 'fixer_knows' }] },
  ],
};
