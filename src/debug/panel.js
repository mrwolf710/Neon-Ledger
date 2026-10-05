// Debug overlay: FPS, draw calls, triangles, seed, plus dropdowns and sliders that main.js adds.
// Call update() after rendering. Sliders write straight into the tunables object they are given.
export const PANEL = {
  refreshMs: 500,
  style: 'position:fixed;top:8px;left:8px;padding:6px 8px;font:12px/1.4 monospace;color:#7fffb0;' +
    'background:rgba(0,0,0,.7);z-index:10;display:none;max-height:calc(100vh - 16px);overflow:auto',
  rowStyle: 'display:flex;gap:6px;align-items:center;justify-content:space-between',
  spriteScale: 3,
  spriteStyle: 'position:fixed;top:8px;right:8px;max-height:calc(100vh - 16px);overflow:auto;padding:8px;' +
    'background:#2a2a3a;font:12px monospace;color:#ddd;z-index:11',
};

export function createDebugPanel(renderer, seed) {
  const el = document.createElement('div');
  el.style.cssText = PANEL.style;
  const stats = document.createElement('pre');
  stats.style.margin = '0 0 4px';
  el.appendChild(stats);
  document.body.appendChild(el);
  const syncs = [];
  let frames = 0, elapsed = 0;

  function row(label, input) {
    const r = document.createElement('label');
    r.style.cssText = PANEL.rowStyle;
    r.append(label, input);
    el.appendChild(r);
    input.addEventListener('keydown', (e) => e.stopPropagation()); // keep game keys out of form controls
    return input;
  }

  return {
    toggle() { el.style.display = el.style.display === 'none' ? 'block' : 'none'; },
    // options: { value: label }
    select(label, options, value, onChange) {
      const s = document.createElement('select');
      for (const [v, text] of Object.entries(options)) s.add(new Option(text, v, false, v === value));
      s.addEventListener('change', () => onChange(s.value));
      row(label, s);
    },
    // obj[key] is a number, or an array when index is given.
    slider(label, obj, key, min, max, step, onChange = () => {}, index) {
      const i = document.createElement('input');
      Object.assign(i, { type: 'range', min, max, step });
      const get = () => (index === undefined ? obj[key] : obj[key][index]);
      i.addEventListener('input', () => {
        if (index === undefined) obj[key] = +i.value; else obj[key][index] = +i.value;
        onChange();
      });
      row(label, i);
      syncs.push(() => { if (document.activeElement !== i) i.value = get(); });
      i.value = get();
    },
    button(label, onClick) {
      const b = document.createElement('button');
      b.textContent = label;
      b.addEventListener('click', onClick);
      el.appendChild(b);
    },
    update(dt) {
      frames++;
      elapsed += dt;
      if (elapsed * 1000 < PANEL.refreshMs) return;
      const { calls, triangles } = renderer.info.render;
      stats.textContent = `FPS   ${Math.round(frames / elapsed)}\ncalls ${calls}\ntris  ${triangles}\nseed  ${seed}`;
      if (el.style.display !== 'none') syncs.forEach((f) => f());
      frames = 0;
      elapsed = 0;
    },
  };
}

// ?sprites in the URL: shows every sprite sheet, scaled up, over the game (Stage 4 check).
export function showSprites(sheets, scale = PANEL.spriteScale) {
  const box = document.createElement('div');
  box.style.cssText = PANEL.spriteStyle;
  for (const [id, s] of Object.entries(sheets)) {
    const c = s.canvas;
    c.style.cssText = `width:${c.width * scale}px;height:${c.height * scale}px;image-rendering:pixelated;display:block`;
    const label = document.createElement('div');
    label.textContent = id;
    box.append(label, c);
  }
  document.body.appendChild(box);
}
