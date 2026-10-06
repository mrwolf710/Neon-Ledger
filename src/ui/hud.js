import { drawText } from '../gen/pixelfont.js';
import { getSheets } from '../gen/sprites.js';

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
  ['WASD', 'Move'], ['Shift', 'Run'], ['G', 'Sneak'], ['Space', 'Talk / Examine'], ['F', 'Echo-scan'], ['Q / E', 'Rotate'],
  ['Z / X', 'Zoom'], ['Tab', 'Case file'], ['B', 'Board'], ['H', 'Close help'],
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

// Speaker portrait: the head-and-shoulders crop of the speaker's front-facing idle frame (nearest-neighbour), or a letter plate for voices with no sprite.
const PORTRAIT = { px: 64, headFrac: 0.5, holo: ['preacher'], holoTint: 'rgba(60,230,255,0.6)', scanAlpha: 0.4 }; // px = canvas size, headFrac = share of a human frame (from the top) that counts as head + shoulders
function drawPortrait(cv, id, name, color) {
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
  const sh = getSheets()[id];
  if (!sh) { g.fillStyle = color; g.font = `bold ${cv.height * 0.6}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name[0], cv.width / 2, cv.height / 2 + 2); return; }
  const eight = sh.dirs === 8, row = eight ? sh.animRows.idle.south : sh.rows.down, W = sh.frameW, H = sh.frameH;
  const ch = sh.frameH > 20 ? Math.round(H * PORTRAIT.headFrac) : H; // cats are shown whole
  const px = sh.canvas.getContext('2d').getImageData(0, row * H, W, ch).data;
  let x0 = W, x1 = -1, y0 = ch, y1 = -1;
  for (let y = 0; y < ch; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.floor(Math.min(cv.width / w, cv.height / h)) || 1;
  g.drawImage(sh.canvas, x0, row * H + y0, w, h, Math.floor((cv.width - w * k) / 2), cv.height - h * k, w * k, h * k);
  if (PORTRAIT.holo.includes(id)) { // hologram: cyan wash + scanlines, like the in-world ghost
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = PORTRAIT.holoTint; g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = `rgba(0,0,0,${PORTRAIT.scanAlpha})`;
    for (let y = 0; y < cv.height; y += 4) g.fillRect(0, y, cv.width, 2);
    g.globalCompositeOperation = 'source-over';
  }
}

// Dialogue box UI: full-width bottom panel with a nameplate + gem, the text, and a choice box on the right.
function dialogueBox(root) {
  const box = el('div', 'dialogue', root);
  const plate = frame(el('div', 'plate', box));
  const gem = el('span', 'gem', plate), nameEl = el('span', 'nameplate', plate);
  const choicesEl = frame(el('div', 'choices', box));
  const textBox = frame(el('div', 'dtext', box));
  const portrait = el('canvas', 'portrait', textBox); portrait.width = portrait.height = PORTRAIT.px;
  const body = el('div', 'body', textBox), hint = el('div', 'hint', textBox, '▼');
  let clickFn = () => {};
  textBox.addEventListener('pointerdown', (e) => { e.preventDefault(); clickFn(); });
  return {
    show(name, color, id) {
      drawPortrait(portrait, id, name, color); portrait.style.borderColor = color; portrait.classList.toggle('holo', PORTRAIT.holo.includes(id));
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
export function createHud(initialCollision) {
  let collision = initialCollision;
  const H = HUD;
  const root = el('div', '', document.body); root.id = 'hud';

  const banner = el('div', 'banner', root);
  banner.innerHTML = `<svg class="compass" viewBox="0 0 24 24" fill="none" stroke="#1fd6e8" stroke-width="1.5">
    <circle cx="12" cy="12" r="10"/><path d="M12 3l3 9-3 9-3-9z" fill="#e0217d" stroke="none"/><path d="M12 3l3 9H9z" fill="#fff" stroke="none"/></svg>`;
  const names = el('div', '', banner);
  const bannerName = el('div', 'name', names), bannerDistrict = el('div', 'district', names);
  frame(banner);

  const objectiveEl = frame(el('div', 'objective', root));
  const objectiveTxt = el('span', '', objectiveEl);
  objectiveEl.style.display = 'none';

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
  const hint = el('div', 'row hint', controls); // collapsed by default: just "H Help"; H opens the full list
  el('span', 'keycap', hint, 'H'); el('span', '', hint, 'Help');
  for (const [k, label] of CONTROLS) {
    const r = el('div', 'row full', controls);
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
    const w = grid.nx * grid.cell, h = grid.nz * grid.cell;
    ctx.fillStyle = c.street; ctx.fillRect(grid.x0, grid.z0, w, h);
    if (grid.road) { ctx.fillStyle = c.road; ctx.fillRect(grid.x0, grid.road[0], w, grid.road[1] - grid.road[0]); }
    ctx.fillStyle = c.solid;
    const e = 0.03; // overlap so rotated cells leave no seams
    for (let j = 0; j < grid.nz; j++) {
      for (let i = 0; i < grid.nx; i++) {
        if (grid.solid[j * grid.nx + i]) ctx.fillRect(grid.x0 + i * grid.cell - e, grid.z0 + j * grid.cell - e, grid.cell + e * 2, grid.cell + e * 2);
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
    setCollision(c) { collision = c; mapT = 0; }, // minimap follows the current area
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
    setObjectiveText(text) { objectiveTxt.textContent = text ?? ''; objectiveEl.style.display = text ? '' : 'none'; },
    // pos {x, z} or null.
    setObjective(pos) { objective = pos; },
    toast(text) {
      const t = frame(el('div', 'toast', toasts, text));
      setTimeout(() => t.classList.add('out'), H.toastMs - 400);
      setTimeout(() => t.remove(), H.toastMs);
    },
    toggleControls() { controls.classList.toggle('open'); },
    setControls(on) { controls.classList.toggle('off', !on); },
    // view: { player: {x, z, facing}, yaw, people: [{x, z, color?}] }
    update(dt, view) {
      mapT -= dt * 1000;
      if (mapT <= 0) { mapT = H.mapRefreshMs; drawMap(view); }
    },
  };
}
