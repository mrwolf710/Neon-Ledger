import { DISTRICT } from '../world/district.js';
import { drawText } from '../gen/pixelfont.js';

export const HUD = {
  bannerMs: 4000,        // how long the location banner stays
  toastMs: 3000,
  mapPx: 112,            // minimap canvas size (square)
  mapRange: 26,          // world units across the minimap
  mapRefreshMs: 66,
  colors: { street: '#232440', road: '#1a1a30', solid: '#0b0b16', bg: '#07070f', player: '#ffffff', npc: '#ff6fb5',
    objective: '#ff3b3b', north: '#1fd6e8' },
};

// Rows of the controls panel: [keys, label]. See the design doc's Controls table.
const CONTROLS = [
  ['WASD', 'Move'], ['Shift', 'Run'], ['Space', 'Talk / Examine'], ['F', 'Echo-scan'], ['Q / E', 'Rotate'],
  ['Z / X', 'Zoom'], ['Tab', 'Case file'], ['B', 'Board'], ['H', 'Hide this'],
];

const el = (tag, cls, parent, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
};
// Panel frame: class + the two extra corner diamonds.
export function frame(node) {
  node.classList.add('panel');
  el('span', 'dia tr', node); el('span', 'dia bl', node);
  return node;
}

// Dialogue box UI: full-width bottom panel with a nameplate + gem, the text, and a choice box on the right.
function dialogueBox(root) {
  const box = el('div', 'dialogue', root);
  const plate = frame(el('div', 'plate', box));
  const gem = el('span', 'gem', plate), nameEl = el('span', 'nameplate', plate);
  const choicesEl = frame(el('div', 'choices', box));
  const textBox = frame(el('div', 'dtext', box));
  const body = el('div', 'body', textBox), hint = el('div', 'hint', textBox, '▼');
  let clickFn = () => {};
  textBox.addEventListener('pointerdown', (e) => { e.preventDefault(); clickFn(); });
  return {
    show(name, color) {
      box.classList.add('on'); nameEl.textContent = name; gem.style.background = color; gem.style.boxShadow = `0 0 0.5rem ${color}`;
    },
    hide() { box.classList.remove('on'); },
    setText(s, done) { body.textContent = s; hint.style.visibility = done ? 'visible' : 'hidden'; },
    // labels: [] hides the box. onPick(i) for mouse / tap.
    setChoices(labels, sel, onPick) {
      choicesEl.classList.toggle('on', labels.length > 0);
      choicesEl.querySelectorAll('.choice').forEach((n) => n.remove());
      labels.forEach((t, i) => {
        const c = el('div', `choice${i === sel ? ' sel' : ''}`, choicesEl, t);
        c.addEventListener('pointerdown', (e) => { e.preventDefault(); onPick(i); });
      });
    },
    onTextClick(fn) { clickFn = fn; },
  };
}

// HUD: banner, clock, minimap, toasts, controls panel. Everything is fed through setters / update().
// collision: from createCollision (needs .grid for the minimap).
export function createHud(collision) {
  const H = HUD;
  const root = el('div', '', document.body); root.id = 'hud';

  const banner = el('div', 'banner', root);
  banner.innerHTML = `<svg class="compass" viewBox="0 0 24 24" fill="none" stroke="#1fd6e8" stroke-width="1.5">
    <circle cx="12" cy="12" r="10"/><path d="M12 3l3 9-3 9-3-9z" fill="#e0217d" stroke="none"/><path d="M12 3l3 9H9z" fill="#fff" stroke="none"/></svg>`;
  const names = el('div', '', banner);
  const bannerName = el('div', 'name', names), bannerDistrict = el('div', 'district', names);
  frame(banner);

  const right = el('div', 'right', root);
  const clock = frame(el('div', 'clock', right));
  const row = el('div', 'row', clock);
  const time = el('div', 'time', row);
  el('div', 'moon', row);
  const phase = el('div', 'phase', clock);
  const bar = el('div', 'bar', clock), fill = el('i', '', bar), knob = el('b', '', bar);

  const mapBox = frame(el('div', 'minimap', right));
  const canvas = el('canvas', '', mapBox);
  canvas.width = canvas.height = H.mapPx;
  const ctx = canvas.getContext('2d');

  const toasts = el('div', 'toasts', root);

  const controls = frame(el('div', 'controls', root));
  for (const [k, label] of CONTROLS) {
    const r = el('div', 'row', controls);
    el('span', 'keycap', r, k);
    el('span', '', r, label);
  }

  let objective = null, mapT = 0, bannerTimer = 0, currentLoc = '';

  function drawMap(view) {
    const { grid } = collision, S = H.mapPx, k = S / H.mapRange, c = H.colors;
    const cos = Math.cos(view.yaw), sin = Math.sin(view.yaw);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, S, S);
    // World -> map: rotate so the camera's "up the screen" is up the map, centred on the player.
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.transform(k * cos, k * sin, -k * sin, k * cos, 0, 0);
    ctx.translate(-view.player.x, -view.player.z);
    const D = DISTRICT, hx = D.length / 2, hz = D.roadWidth / 2 + D.sidewalkWidth;
    ctx.fillStyle = c.street; ctx.fillRect(-hx, -hz, D.length, hz * 2);
    ctx.fillStyle = c.road; ctx.fillRect(-hx, -D.roadWidth / 2, D.length, D.roadWidth);
    ctx.fillStyle = c.solid;
    const e = 0.03; // overlap so rotated cells leave no seams
    for (let j = 0; j < grid.nz; j++) {
      for (let i = 0; i < grid.nx; i++) {
        if (grid.solid[j * grid.nx + i]) ctx.fillRect(i * grid.cell - grid.halfX - e, j * grid.cell - grid.halfZ - e, grid.cell + e * 2, grid.cell + e * 2);
      }
    }
    ctx.restore();

    const toMap = (wx, wz) => { // world point -> map pixels
      const dx = wx - view.player.x, dz = wz - view.player.z;
      return [S / 2 + k * (dx * cos - dz * sin), S / 2 + k * (dx * sin + dz * cos)];
    };
    for (const p of view.people ?? []) {
      const [mx, my] = toMap(p.x, p.z);
      if (mx < 2 || my < 2 || mx > S - 3 || my > S - 3) continue;
      ctx.fillStyle = p.color ?? c.npc; ctx.fillRect(Math.round(mx) - 1, Math.round(my) - 1, 3, 3);
    }
    if (objective) { // red mark, pinned to the edge when out of range
      let [mx, my] = toMap(objective.x, objective.z);
      const m = 7, pulse = 1 + Math.sin(performance.now() / 250) * 0.25;
      const out = mx < m || my < m || mx > S - m || my > S - m;
      mx = Math.min(S - m, Math.max(m, mx)); my = Math.min(S - m, Math.max(m, my));
      ctx.fillStyle = c.objective;
      ctx.beginPath(); ctx.moveTo(mx, my - 4 * pulse); ctx.lineTo(mx + 3 * pulse, my); ctx.lineTo(mx, my + 4 * pulse); ctx.lineTo(mx - 3 * pulse, my); ctx.fill();
      if (out) { ctx.strokeStyle = c.objective; ctx.strokeRect(mx - 5, my - 5, 10, 10); } // pinned to the rim
    }
    // Player arrow, pointing the way Juno faces.
    const f = view.player.facing, wdx = Math.sin(f), wdz = Math.cos(f);
    const ax = wdx * cos - wdz * sin, ay = wdx * sin + wdz * cos, px = -ay, py = ax; // arrow dir + perpendicular
    ctx.fillStyle = c.player;
    ctx.beginPath();
    ctx.moveTo(S / 2 + ax * 6, S / 2 + ay * 6); ctx.lineTo(S / 2 - ax * 4 + px * 4, S / 2 - ay * 4 + py * 4);
    ctx.lineTo(S / 2 - ax * 2, S / 2 - ay * 2); ctx.lineTo(S / 2 - ax * 4 - px * 4, S / 2 - ay * 4 - py * 4); ctx.fill();
    // North marker (world -z) on the rim.
    const nx = S / 2 + sin * (S / 2 - 7), ny = S / 2 - cos * (S / 2 - 7);
    drawText(ctx, 'N', Math.round(nx) - 1, Math.round(ny) - 2, c.north);
  }

  return {
    dialogue: dialogueBox(root),
    show() { root.classList.add('on'); },
    // Slides the banner in for bannerMs.
    setLocation(name, district) {
      if (name === currentLoc) return;
      currentLoc = name;
      bannerName.textContent = name; bannerDistrict.textContent = district;
      banner.classList.add('in');
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => banner.classList.remove('in'), H.bannerMs);
    },
    setClock(text, phaseLabel, progress) {
      time.textContent = text; phase.textContent = phaseLabel;
      fill.style.width = knob.style.left = `${progress * 100}%`;
    },
    // pos {x, z} or null.
    setObjective(pos) { objective = pos; },
    toast(text) {
      const t = frame(el('div', 'toast', toasts, text));
      setTimeout(() => t.classList.add('out'), H.toastMs - 400);
      setTimeout(() => t.remove(), H.toastMs);
    },
    toggleControls() { controls.classList.toggle('off'); },
    setControls(on) { controls.classList.toggle('off', !on); },
    // view: { player: {x, z, facing}, yaw, people: [{x, z, color?}] }
    update(dt, view) {
      mapT -= dt * 1000;
      if (mapT <= 0) { mapT = H.mapRefreshMs; drawMap(view); }
    },
  };
}
