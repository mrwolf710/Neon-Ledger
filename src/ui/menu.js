import { frame } from './hud.js';
import { TIERS, settings, QUALITY_KEY } from '../core/settings.js';

export const MENU = { step: 0.1, z: 20 }; // step = volume change per press

// Pause menu (Esc / pad Start / touch pause): sound, video, restart, quit. Keyboard, pad (menu*), mouse and touch.
// Saves opens a list of save slots in the browser (core/saves.js): new, load, overwrite, rename, delete. Quality, Restart and Quit reload the page and go back to the title.
export function createMenu({ synth, saves, snapshot = () => null, onLoad = () => {} }) {
  const root = document.createElement('div');
  root.id = 'menu';
  root.style.zIndex = MENU.z;
  const box = frame(document.createElement('div'));
  box.classList.add('menubox');
  root.appendChild(box);
  box.appendChild(Object.assign(document.createElement('div'), { className: 'nameplate menutitle', textContent: 'Paused' }));
  document.body.appendChild(root);

  const pct = (v) => `${Math.round(v * 100)}%`;
  const tiers = Object.keys(TIERS);
  const reload = () => { try { localStorage.setItem(QUALITY_KEY, quality); } catch { /* private mode */ } location.href = location.pathname; };
  const canFull = document.fullscreenEnabled;
  const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
  let lastKey = '', lastSel = -1, pending = null, sel = 0, open = false, quality = settings.tier, view = 'main', rows = [], items = [];
  const sure = (key, fn) => () => { if (pending === key) fn(); else pending = key; };

  const mainRows = () => [
    { label: 'Resume', act: () => api.close() },
    { head: 'Sound' },
    { label: 'Music volume', val: () => pct(synth.volumes.music), adj: (d) => synth.setVolume('music', synth.volumes.music + d * MENU.step) },
    { label: 'Effects volume', val: () => pct(synth.volumes.sfx), adj: (d) => synth.setVolume('sfx', synth.volumes.sfx + d * MENU.step) },
    { label: 'Music', val: () => (synth.musicOn ? 'On' : 'Off'), adj: () => synth.setMusicOn(!synth.musicOn), act: () => synth.setMusicOn(!synth.musicOn) },
    { head: 'Video' },
    { label: 'Quality', val: () => TIERS[quality].name + (quality !== settings.tier ? ' (on restart)' : ''),
      adj: (d) => { quality = tiers[(tiers.indexOf(quality) + d + tiers.length) % tiers.length]; } },
    ...(canFull ? [{ label: 'Fullscreen', val: () => (document.fullscreenElement ? 'On' : 'Off'), adj: toggleFull, act: toggleFull }] : []),
    { head: 'Game' },
    { label: 'Saves…', act: () => setView('saves') },
    { label: () => (pending === 'restart' ? 'Restart: press again to confirm' : 'Restart'), act: sure('restart', reload) },
    { label: () => (pending === 'quit' ? 'Quit: press again to confirm' : 'Quit to title'), act: sure('quit', () => { window.close(); reload(); }) },
  ];
  const when = (t) => new Date(t).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const saveRows = () => [
    { label: '◄ Back', act: () => setView('main') },
    { head: 'Saves' },
    { label: 'New save', act: () => { const d = snapshot(); if (d && saves.add(d)) setView('saves', 1); } },
    ...saves.list.map((s) => {
      let k = 0;
      const acts = [['Load', () => { api.close(); onLoad(s.data); }], ['Overwrite', () => { const d = snapshot(); if (d) saves.overwrite(s.id, d); }],
        ['Rename', () => { const n = prompt('Name this save', s.name); if (n) saves.rename(s.id, n); }], ['Delete', () => saves.remove(s.id)]];
      return { label: () => `${s.name} · ${when(s.t)}`, val: () => (pending === 'save' ? 'Sure? Again' : acts[k][0]), adj: (d) => { k = (k + d + acts.length) % acts.length; },
        act: () => {
          const [name, fn] = acts[k], run = () => { const at = sel; fn(); if (name !== 'Load') setView('saves', at); };
          if (name === 'Rename') run(); else if (pending === 'save') run(); else pending = 'save';
        } };
    }),
  ];
  function setView(v, keep = 0) { view = v; rows = v === 'saves' ? saveRows() : mainRows(); items = rows.filter((r) => !r.head); sel = Math.max(0, Math.min(keep, items.length - 1)); pending = null; lastKey = ''; lastSel = -1; }

  // render() runs every frame while the menu is open; it only rebuilds the rows when something changed, otherwise a finger or mouse
  // press would land on a row that was replaced before the release (no click) and scrolling would jump back.
  function render() {
    const key = `${view}|${sel}|${rows.map((r) => r.head ?? `${typeof r.label === 'function' ? r.label() : r.label}${r.val ? r.val() : ''}`).join('|')}`;
    if (key === lastKey) return;
    lastKey = key;
    box.querySelectorAll('.menurow, .menuhead').forEach((n) => n.remove());
    rows.forEach((r) => {
      if (r.head) { box.appendChild(Object.assign(document.createElement('div'), { className: 'menuhead', textContent: r.head })); return; }
      const i = items.indexOf(r), d = document.createElement('div');
      d.className = `menurow${i === sel ? ' sel' : ''}`;
      d.appendChild(Object.assign(document.createElement('span'), { textContent: typeof r.label === 'function' ? r.label() : r.label }));
      if (r.val) {
        const v = document.createElement('span'); v.className = 'menuval';
        const arrow = (t, dir) => {
          const b = Object.assign(document.createElement('b'), { textContent: t });
          b.addEventListener('click', (e) => { e.stopPropagation(); sel = i; pending = null; r.adj(dir); render(); });
          return b;
        };
        v.append(arrow('◄', -1), Object.assign(document.createElement('i'), { textContent: r.val() }), arrow('►', 1));
        d.appendChild(v);
      }
      d.addEventListener('click', () => { if (sel !== i) pending = null; // click, not pointerdown: dragging to scroll the list on a phone must not press a row
         sel = i; r.act?.(); render(); });
      box.appendChild(d);
    });
    if (sel !== lastSel) box.querySelector('.menurow.sel')?.scrollIntoView({ block: 'nearest' }); // pad / keys: keep the chosen row visible
    lastSel = sel;
  }

  const api = {
    get isOpen() { return open; },
    open() { open = true; quality = settings.tier; setView('main'); root.classList.add('on'); render(); },
    close() { open = false; pending = null; root.classList.remove('on'); },
    // Call each frame while open.
    update(input) {
      if (!open) return;
      if (input.pressed('pause')) { api.close(); return; }
      const r = items[sel], was = sel;
      if (input.pressed('menuDown')) sel = (sel + 1) % items.length;
      if (input.pressed('menuUp')) sel = (sel + items.length - 1) % items.length;
      if (sel !== was) pending = null;
      if (r.adj && input.pressed('menuLeft')) { pending = null; r.adj(-1); }
      if (r.adj && input.pressed('menuRight')) { pending = null; r.adj(1); }
      if (r.act && input.pressed('interact')) r.act();
      render();
    },
  };
  return api;
}
