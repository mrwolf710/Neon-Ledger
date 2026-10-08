import fs from 'node:fs';
import path from 'node:path';

// es2022 so main.js can await the loading of Juno's art at startup (Safari 15+ and every current browser).
// Dev only: /editor.html posts dialogue changes to /__dialogue-edits, merged into src/game/dialogue-edits.json (story.js lays them over its own text).
const EDITS = path.resolve('src/game/dialogue-edits.json');
const SCENES = path.resolve('src/world/scene-edits.json');
const dialogueEditor = {
  name: 'dialogue-editor',
  configureServer(server) {
    server.middlewares.use('/__scene-edits', (req, res) => { // { area: { key: value | null (reset) } }
      if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        try {
          const patch = JSON.parse(body), all = JSON.parse(fs.readFileSync(SCENES, 'utf8'));
          for (const [area, keys] of Object.entries(patch)) for (const [k, v] of Object.entries(keys)) { if (v === null) delete (all[area] ??= {})[k]; else (all[area] ??= {})[k] = v; }
          fs.writeFileSync(SCENES, JSON.stringify(all, null, 2) + '\n');
          res.end('ok');
        } catch (e) { res.statusCode = 400; res.end(String(e)); }
      });
    });
    server.middlewares.use('/__dialogue-edits', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        try {
          const patch = JSON.parse(body), edits = JSON.parse(fs.readFileSync(EDITS, 'utf8'));
          for (const [conv, nodes] of Object.entries(patch)) {
            if (conv === '_rules') { // [{ conv, npc, when: 'all' | '1'..'4', fact?, talked? }]: who says which conversation, on which visit, under which conditions
              edits._rules = nodes.filter((r) => r && typeof r.conv === 'string' && typeof r.npc === 'string');
              continue;
            }
            if (conv === '_talk') { // { npcId: convId | null (back to the game's own) }: the conversation played every time
              edits._talk ??= {};
              for (const [npc, c] of Object.entries(nodes)) { if (c) edits._talk[npc] = c; else delete edits._talk[npc]; }
              continue;
            }
            if (conv === '_visits') { // { npcId: [convId | '' x 4] }: which conversation plays on the 1st, 2nd, 3rd, 4th+ visit
              edits._visits ??= {};
              for (const [npc, list] of Object.entries(nodes)) { if (list.some(Boolean)) edits._visits[npc] = list; else delete edits._visits[npc]; }
              continue;
            }
            if (conv === '_titles') { // display names for conversations: { id: name | null }
              edits._titles ??= {};
              for (const [id, t] of Object.entries(nodes)) { if (t) edits._titles[id] = String(t); else delete edits._titles[id]; }
              continue;
            }
            if (conv === '_insert') { // lines added inside an existing conversation: [{ conv, after, id, speaker, text }]
              (edits._insert ??= []).push(...nodes);
              continue;
            }
            if (conv === '_remove') { // [{ conv, id }]: drop an added line and its edits
              for (const r of nodes) { edits._insert = (edits._insert ?? []).filter((x) => !(x.conv === r.conv && x.id === r.id)); if (edits[r.conv]) delete edits[r.conv][r.id]; }
              continue;
            }
            if (conv === '_graph') { // whole conversations drawn in the flowchart tab: { id: { start, nodes } }
              edits._graph ??= {};
              for (const [id, g] of Object.entries(nodes)) { if (g === null) delete edits._graph[id]; else edits._graph[id] = g; }
              continue;
            }
            if (conv === '_layout') { // card positions in the flowchart: { id: { node: [x, y] } }
              edits._layout ??= {};
              for (const [id, p] of Object.entries(nodes)) edits._layout[id] = p;
              continue;
            }
            if (conv === '_new') { // new conversations: { id: { with, active, lines: [{ speaker, text }] } | null (delete) }
              edits._new ??= {};
              for (const [id, def] of Object.entries(nodes)) { if (def === null) delete edits._new[id]; else edits._new[id] = def; }
              continue;
            }
            for (const [node, f] of Object.entries(nodes)) {
              const n = ((edits[conv] ??= {})[node] ??= {});
              if (typeof f.text === 'string') n.text = f.text;
              if (typeof f.speaker === 'string') n.speaker = f.speaker;
              for (const [i, t] of Object.entries(f.choices ?? {})) if (typeof t === 'string') (n.choices ??= {})[i] = t;
            }
          }
          fs.writeFileSync(EDITS, JSON.stringify(edits, null, 2) + '\n');
          res.end('ok');
        } catch (e) { res.statusCode = 400; res.end(String(e)); }
      });
    });
  },
};
export default { build: { target: 'es2022' }, plugins: [dialogueEditor] };
