// node scripts/drive.mjs [steps...] — loads the BUILT game (dist/) in headless Edge over the DevTools protocol, dismisses the title,
// then runs steps, printing console errors and saving screenshots to the OS temp folder.
// Use QS="?start=sable&hooks" to jump to an area and get window.__nl for eval: steps. Steps: shot:<name>  wait:<ms>  hold:<KeyCode>:<ms>  key:<KeyCode>  click:<x>:<y>  eval:<js>
// Example: node scripts/drive.mjs wait:3000 shot:start hold:KeyD:2500 shot:walking
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const EDGE = process.env.EDGE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 5199, DEBUG = 9333;
const dist = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(dist, url === '/' ? 'index.html' : url);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' }); res.end(d); } });
}).listen(PORT);

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nl-edge-'));
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist', '--window-size=1280,800', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanup = () => { try { edge.kill(); } catch { /* gone */ } server.close(); setTimeout(() => process.exit(0), 300); };

let wsUrl = null;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await sleep(500);
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${DEBUG}/json`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* not up yet */ }
}
if (!wsUrl) { console.error('Edge did not start'); cleanup(); }
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(), errors = [];
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(`EXCEPTION ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) errors.push(`console.${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(`log: ${msg.params.entry.text} ${msg.params.entry.url ?? ''}`);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const KEYS = { KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, KeyQ: 81, KeyE: 69, KeyF: 70, Space: 32, KeyB: 66, Tab: 9, ShiftLeft: 16, KeyM: 77, Escape: 27 };
const keyEv = (type, code) => send('Input.dispatchKeyEvent', { type, code, key: code.replace('Key', '').toLowerCase(), windowsVirtualKeyCode: KEYS[code] ?? 0 });
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const f = path.join(os.tmpdir(), `nl-${name}.png`);
  fs.writeFileSync(f, Buffer.from(r.result.data, 'base64'));
  console.log('screenshot', f);
};

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/${process.env.QS ?? ''}` });
// Wait until the game has built the world and shown the title (three canvases: the game plus the two title words), then click it.
for (let i = 0; i < 300; i++) {
  await sleep(500);
  const n = (await send('Runtime.evaluate', { expression: 'document.querySelectorAll("canvas").length', returnByValue: true })).result?.result?.value ?? 0;
  if (n >= 3) break;
}
await sleep(800);
await keyEv('keyDown', 'Space'); await sleep(80); await keyEv('keyUp', 'Space'); // dismisses the title
await sleep(2000);

for (const step of process.argv.slice(2)) {
  const [cmd, a, b] = step.split(':');
  if (cmd === 'wait') await sleep(+a);
  else if (cmd === 'shot') await shot(a);
  else if (cmd === 'hold') { const ks = a.split('+'); for (const k of ks) await keyEv('keyDown', k); await sleep(+b); for (const k of ks) await keyEv('keyUp', k); }
  else if (cmd === 'key') { await keyEv('keyDown', a); await sleep(80); await keyEv('keyUp', a); }
  else if (cmd === 'click') { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: +a, y: +b, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: +a, y: +b, button: 'left', clickCount: 1 }); }
  else if (cmd === 'eval') console.log('eval ->', JSON.stringify((await send('Runtime.evaluate', { expression: step.slice(5), returnByValue: true })).result?.result?.value));
}
console.log(errors.length ? `ERRORS (${errors.length}):\n${[...new Set(errors)].join('\n')}` : 'no console errors');
cleanup();
