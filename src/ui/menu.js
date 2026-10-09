import { frame } from './hud.js';
import { TIERS, settings, QUALITY_KEY } from '../core/settings.js';

export const MENU = { step: 0.1, z: 20 }; // step = volume change per press

// Pause menu (Esc / pad Start / touch pause): sound, video, restart, quit. Keyboard, pad (menu*), mouse and touch.
// Save / Load use one slot in the browser (main.js). Quality, Restart and Quit reload the page and go back to the title.
export function createMenu({ synth, onSave = () => false, onLoad = () => {}, hasSave = () => false }) {
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
  let saved = 0, pending = null, sel = 0, open = false, quality = settings.tier;
  const sure = (key, fn) => () => { if (pending === key) fn(); else pending = key; };

  const rows = [
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
    { label: () => (performance.now() - saved < 2500 ? 'Game saved' : 'Save game'), act: () => { if (onSave()) saved = performance.now(); } },
    { label: () => (!hasSave() ? 'Load game (no save yet)' : pending === 'load' ? 'Load: press again to confirm' : 'Load game'), act: () => { if (hasSave()) sure('load', () => { api.close(); onLoad(); })(); } },
    { label: () => (pending === 'restart' ? 'Restart: press again to confirm' : 'Restart'), act: sure('restart', reload) },
    { label: () => (pending === 'quit' ? 'Quit: press again to confirm' : 'Quit to title'), act: sure('quit', () => { window.close(); reload(); }) },
  ];
  const items = rows.filter((r) => !r.head);

  function render() {
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
    box.querySelector('.menurow.sel')?.scrollIntoView({ block: 'nearest' }); // pad / keys: keep the chosen row visible
  }

  const api = {
    get isOpen() { return open; },
    open() { open = true; sel = 0; pending = null; quality = settings.tier; root.classList.add('on'); render(); },
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
