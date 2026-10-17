// Debug menu (backtick key): a centred window with tabs, styled like the pause menu. main.js fills it: tab(name) picks the page, then heading / select / slider / button add to it.
// Call update() after rendering. Sliders write straight into the tunables object they are given. FPS and friends sit in the header.
export const PANEL = {
  refreshMs: 500,
  spriteScale: 3,
  spriteStyle: 'position:fixed;top:8px;right:8px;max-height:calc(100vh - 16px);overflow:auto;padding:8px;' +
    'background:#2a2a3a;font:12px monospace;color:#ddd;z-index:11',
  css: `
    #dbg { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(40rem, 94vw); max-height: min(44rem, 88vh); z-index: 20; display: none; flex-direction: column;
      background: rgba(5, 2, 20, 0.93); border: 1px solid #1fd6e8; box-shadow: 0 0 1.4rem rgba(31, 214, 232, 0.35); color: #dfe8ff; font: 0.9rem/1.3 var(--body, system-ui, sans-serif); user-select: none; }
    #dbg.on { display: flex; }
    #dbg .dbg-head { display: flex; align-items: center; gap: 0.8rem; padding: 0.55rem 0.8rem; border-bottom: 1px solid rgba(31, 214, 232, 0.4); }
    #dbg .dbg-title { font: 700 1.1rem var(--display, sans-serif); letter-spacing: 0.14em; color: #1fd6e8; }
    #dbg .dbg-stats { flex: 1; font: 0.72rem monospace; color: #7fffb0; white-space: pre-wrap; text-align: right; }
    #dbg .dbg-x { background: none; border: 1px solid #1fd6e8; color: #1fd6e8; width: 1.8rem; height: 1.8rem; cursor: pointer; font-size: 1rem; }
    #dbg .dbg-tabs { display: flex; flex-wrap: wrap; gap: 0.3rem; padding: 0.5rem 0.8rem 0; }
    #dbg .dbg-tab { background: none; border: 1px solid rgba(31, 214, 232, 0.35); border-bottom: none; color: #8fa0c8; padding: 0.35rem 0.9rem; cursor: pointer; font: 700 0.85rem var(--display, sans-serif); letter-spacing: 0.1em; text-transform: uppercase; }
    #dbg .dbg-tab.on { color: #fff; background: rgba(31, 214, 232, 0.18); border-color: #1fd6e8; }
    #dbg .dbg-body { overflow-y: auto; height: min(26rem, 60vh); padding: 0.4rem 0.8rem 0.9rem; border-top: 1px solid rgba(31, 214, 232, 0.4); }
    #dbg .dbg-page { display: none; }
    #dbg .dbg-page.on { display: block; }
    #dbg h4 { margin: 0.9rem 0 0.35rem; font: 700 0.8rem var(--display, sans-serif); letter-spacing: 0.16em; text-transform: uppercase; color: #ffd23a; border-bottom: 1px solid rgba(255, 210, 58, 0.3); padding-bottom: 0.2rem; }
    #dbg .dbg-row { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; padding: 0.2rem 0; }
    #dbg .dbg-row > span:first-child { flex: none; width: 9rem; }
    #dbg .dbg-row input[type=range] { flex: 1; min-width: 6rem; max-width: 18rem; accent-color: #1fd6e8; }
    #dbg .dbg-row .dbg-val { flex: none; width: 3rem; text-align: right; font: 0.75rem monospace; color: #8fa0c8; }
    #dbg select { background: #0b0a22; color: #fff; border: 1px solid #1fd6e8; padding: 0.25rem 0.4rem; max-width: 22rem; font: inherit; }
    #dbg .dbg-btns { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0.4rem; margin: 0.3rem 0; }
    #dbg .dbg-btn { background: rgba(31, 214, 232, 0.1); border: 1px solid rgba(31, 214, 232, 0.6); color: #fff; padding: 0.45rem 0.6rem; cursor: pointer; font: inherit; text-align: left; }
    #dbg .dbg-btn:hover { background: rgba(31, 214, 232, 0.28); }
  `,
};

interface PanelRenderer { info: { render: { calls: number; triangles: number } } }
interface PanelTab { btn: HTMLButtonElement; page: HTMLDivElement }
export interface DebugPanel {
  extra?: () => string;
  toggle(): void;
  tab(name: string): void;
  heading(text: string): void;
  select(label: string, options: Record<string, string>, value: string, onChange: (v: string) => void): void;
  slider(label: string, obj: Record<string, any>, key: string, min: number, max: number, step: number, onChange?: () => void, index?: number): void; // any: tunables objects hold numbers or number arrays under arbitrary keys
  button(label: string, onClick: () => void): void;
  update(dt: number): void;
}

export function createDebugPanel(renderer: PanelRenderer, seed: number | string): DebugPanel {
  const style = document.createElement('style'); style.textContent = PANEL.css; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'dbg';
  const head = document.createElement('div'); head.className = 'dbg-head';
  const title = Object.assign(document.createElement('span'), { className: 'dbg-title', textContent: 'DEBUG' });
  const stats = Object.assign(document.createElement('div'), { className: 'dbg-stats' });
  const close = Object.assign(document.createElement('button'), { className: 'dbg-x', textContent: '×', title: 'Close (backtick)' });
  head.append(title, stats, close);
  const tabsBar = Object.assign(document.createElement('div'), { className: 'dbg-tabs' });
  const body = Object.assign(document.createElement('div'), { className: 'dbg-body' });
  el.append(head, tabsBar, body);
  document.body.appendChild(el);
  el.addEventListener('keydown', (e) => e.stopPropagation()); // keep game keys out of the menu's controls
  const syncs: (() => void)[] = [], tabs = new Map<string, PanelTab>();
  let cur: PanelTab | null = null, btns: HTMLDivElement | null = null, frames = 0, elapsed = 0;

  const show = (t: PanelTab) => { for (const x of tabs.values()) { x.btn.classList.toggle('on', x === t); x.page.classList.toggle('on', x === t); } };
  const page = () => { if (!cur) api.tab('General'); return cur!.page; }; // api.tab() sets cur
  function row<T extends HTMLElement>(label: string, control: T, extra?: HTMLElement): T {
    btns = null;
    const r = document.createElement('label'); r.className = 'dbg-row';
    const l = document.createElement('span'); l.textContent = label;
    r.append(l, control); if (extra) r.append(extra);
    page().appendChild(r);
    return control;
  }
  close.addEventListener('click', () => api.toggle());

  const api: DebugPanel = {
    toggle() { el.classList.toggle('on'); },
    // Starts (or returns to) a page; everything added after goes on it.
    tab(name) {
      const t0 = tabs.get(name);
      let t: PanelTab;
      if (t0) t = t0;
      else {
        const btn = Object.assign(document.createElement('button'), { className: 'dbg-tab', textContent: name });
        const pg = Object.assign(document.createElement('div'), { className: 'dbg-page' });
        t = { btn, page: pg }; tabs.set(name, t);
        btn.addEventListener('click', () => show(t));
        tabsBar.appendChild(btn); body.appendChild(pg);
        if (tabs.size === 1) show(t);
      }
      cur = t; btns = null;
    },
    heading(text) { btns = null; const h = document.createElement('h4'); h.textContent = text; page().appendChild(h); },
    // options: { value: label }
    select(label, options, value, onChange) {
      const s = document.createElement('select');
      for (const [v, text] of Object.entries(options)) s.add(new Option(text, v, false, v === value));
      s.addEventListener('change', () => onChange(s.value));
      row(label, s);
    },
    // obj[key] is a number, or an array when index is given.
    slider(label, obj, key, min, max, step, onChange = () => {}, index) {
      const i = document.createElement('input') as HTMLInputElement, val = Object.assign(document.createElement('span'), { className: 'dbg-val' });
      Object.assign(i, { type: 'range', min: String(min), max: String(max), step: String(step) });
      const get = () => (index === undefined ? obj[key] : obj[key][index]), fmt = () => { val.textContent = (+get()).toFixed(step < 0.1 ? 2 : 1); };
      i.addEventListener('input', () => {
        if (index === undefined) obj[key] = +i.value; else obj[key][index] = +i.value;
        fmt(); onChange();
      });
      row(label, i, val);
      syncs.push(() => { if (document.activeElement !== i) { i.value = String(get()); fmt(); } });
      i.value = String(get()); fmt();
    },
    button(label, onClick) {
      if (!btns) { btns = Object.assign(document.createElement('div'), { className: 'dbg-btns' }); page().appendChild(btns); }
      const b = Object.assign(document.createElement('button'), { className: 'dbg-btn', textContent: label });
      b.addEventListener('click', onClick);
      btns.appendChild(b);
    },
    update(dt) {
      frames++;
      elapsed += dt;
      if (elapsed * 1000 < PANEL.refreshMs) return;
      if (el.classList.contains('on')) {
        const { calls, triangles } = renderer.info.render;
        const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
        const heap = mem ? `${Math.round(mem.usedJSHeapSize / 1048576)} MB` : 'n/a';
        stats.textContent = `${Math.round(frames / elapsed)} fps  ${calls} calls  ${(triangles / 1000).toFixed(0)}k tris  heap ${heap}  seed ${seed}${this.extra ? `\n${this.extra()}` : ''}`;
        syncs.forEach((f) => f());
      }
      frames = 0;
      elapsed = 0;
    },
  };
  return api;
}

// ?sprites in the URL: shows every sprite sheet, scaled up, over the game (Stage 4 check).
export function showSprites(sheets: Record<string, { canvas: HTMLCanvasElement }>, scale = PANEL.spriteScale) {
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
