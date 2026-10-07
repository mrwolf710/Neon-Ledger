// Validate the effective story after editor overlays, then exercise the 9B route.
import assert from 'node:assert/strict';
import { ENTRIES, CONVERSATIONS, BOARD, ECHOES, EXAMINABLES, HOTSPOTS, SPEAKERS, conversationFor } from '../src/game/story.js';
import { createBoardLogic } from '../src/game/board.js';
import { createDialogue } from '../src/game/dialogue.js';
import { createBeats } from '../src/game/beats.js';
for (const [id, c] of Object.entries(CONVERSATIONS)) {
  for (const start of Array.isArray(c.start) ? c.start.map(s => s.node) : [c.start]) assert.ok(c.nodes[start], `${id}: start`);
  for (const [nid,n] of Object.entries(c.nodes)) {
    assert.ok(SPEAKERS[n.speaker], `${id}.${nid}: speaker`);
    for (const dest of [n.next, ...Object.values(n.present ?? {}), n.presentWrong, ...(n.choices ?? []).map(o => o.next)].filter(Boolean)) assert.ok(c.nodes[dest], `${id}.${nid}: ${dest}`);
    for (const effect of [...(n.effects ?? []), ...(n.choices ?? []).flatMap(o => o.effects ?? [])]) {
      const entry = effect.addFact ?? effect.addPerson ?? effect.addEcho;
      if (entry) assert.ok(ENTRIES[entry], `${id}.${nid}: entry ${entry}`);
    }
  }
}
for (const h of HOTSPOTS) assert.ok(ECHOES[h.echo], h.id);
for (const e of EXAMINABLES) assert.ok(CONVERSATIONS[e.conv], e.id);
for (const e of Object.values(ECHOES)) {
  assert.ok(ENTRIES[e.entry]);
  for (const tag of e.tags) assert.ok(ENTRIES[tag.fact]);
}
assert.equal(ECHOES.teo_back_room.tracks[1].sprite, 'unknownEcho');
assert.equal(conversationFor('kit', 1, {has: () => true, talked: () => true}), 'kit', 'editor must not bypass evidence presentation');
assert.equal(conversationFor('kit', 4), 'kit');

globalThis.document = {body:{classList:{add(){},remove(){}}}};
const known=new Set(), flags=new Set();
const cf={has:id=>known.has(id),hasFlag:id=>flags.has(id),facts:()=>[...known].map(id=>({id})),
 apply(effects=[]){for(const e of effects){if(e.addFact||e.addPerson)known.add(e.addFact??e.addPerson);if(e.setFlag)flags.add(e.setFlag);}},
 isOpen:false,open(o){this.isOpen=true;this.pick=o.onPick;}};
let choices=[];
const hud={dialogue:{show(){},hide(){},setText(){},setChoices(c){choices=c;},onTextClick(){}}};
const d=createDialogue({hud,caseFile:cf,clock:{setTime(){}}});
const tick=(...keys)=>d.update(10,{pressed:k=>keys.includes(k)});
const next=()=>{tick();tick('interact');};
const finish=()=>{for(let i=0;i<20&&d.active;i++)next();assert.ok(!d.active,'conversation terminates');};
d.start('ex_backup');finish();assert.ok(!known.has('backup_chip'),'backup gated behind Kit');
d.start('ex_terminal');finish();assert.ok(known.has('override_trace'));
known.add('two_cups');known.add('two_voices');known.add('door_unlocked');
const l=createBoardLogic(BOARD,id=>known.has(id));
const solve=(a,b)=>{const r=l.link(a,b);if(r.kind==='solved')cf.apply(r.conclusion.effects);return r.kind;};
assert.equal(solve('master_keys','override_trace'),'wrong','city keys alone do not prove override');
assert.equal(solve('two_cups','two_voices'),'solved');
assert.equal(solve('someone_else','door_unlocked'),'partial');
assert.equal(solve('door_unlocked','override_trace'),'solved');
d.start('kit');for(let i=0;i<4;i++)next();tick();
assert.ok(known.has('kit_claim'));assert.ok(!flags.has('kit_pressed'));
known.add('kit_at_2340');known.add('grey_glove');
assert.deepEqual(choices,['That’s all for now.','Present evidence…']);
tick('down');tick('interact');assert.ok(cf.isOpen);cf.isOpen=false;cf.pick('kit_at_2340');finish();
assert.ok(known.has('bureau_coat')&&flags.has('backup_location'));
assert.equal(solve('auditor_override','grey_glove'),'partial');
assert.equal(solve('grey_glove','bureau_coat'),'solved');
assert.ok(known.has('bureau_involved'));
d.start('ex_backup');finish();assert.ok(known.has('backup_chip'));
d.start('kit');finish();assert.ok(flags.has('kit_pressed'),'repeat visit preserves progress');
console.log('story 9B ok: effective dialogue, contradiction, deductions, isolated backup');

// Objectives must advance on tagged facts and reach the car handoff, including out-of-order exploration.
for (const f of ['visited_street','visited_sable','seen_backroom','ex_body','ex_port','ex_cups','ex_terminal','ex_lamp']) flags.add(f);
known.add('echo_seam'); known.add('master_keys');
let objective='';
const beats=createBeats({world:{current:{id:'car'},spot:()=>({x:600,z:0}),routeExit:()=>null},caseFile:cf,
 hud:{setObjectiveText:t=>objective=t,setObjective(){},toast(){}},player:{position:{x:600,z:0}}});
beats.update(0);assert.equal(objective,'Return to the car with Dex’s backup');
known.delete('kit_at_2340');beats.update(0);assert.match(objective,/Scan the alley/);
known.add('kit_at_2340');known.delete('echo_seam');beats.update(0);assert.match(objective,/Scan the room/);
console.log('9B objectives ok');
