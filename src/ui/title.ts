import { drawText, measure } from '../gen/pixelfont.ts';
import { spaceText } from '../gen/spacefont.ts';
import { TIERS, settings, QUALITY_KEY } from '../core/settings.ts';
import type { TierName } from '../core/settings.ts';
import type { createSaves } from '../core/saves.ts';
import type { BusName, Synth } from '../audio/synth.ts';

// Title screen with the main menu: New Game, Continue Game, Load Save Game, Options, Quit. Keyboard, mouse, touch and gamepad.
// Choosing New / Continue / a save starts the game: title.started resolves then and onStart runs inside that gesture
// (Web Audio needs it, iOS especially). title.save = the save data to load, or null for a new game.
export const TITLE = {
  scale: 8,                 // screen pixels per title pixel
  color: '#ffffff', sub: '#1fd6e8', dim: '#4a4a62', bg: 'rgba(7,7,15,.6)',
  itemScale: 4,             // pixel size of menu rows
  gap: 14,                  // px between rows
  touchBottom: 12,          // % of the screen height kept clear at the bottom on phones (browser bars, thumbs)
  listMaxVh: 38,            // the save list scrolls past this height
  padStick: 0.6,            // stick tilt that counts as a press
};

interface Row { label: string | (() => string); off?: boolean; act?: () => void; adj?: (d: number) => void }
export interface Title { done: boolean; save: unknown; started: Promise<void> }

export function createTitle(onStart: (() => void) | undefined, { saves, synth }: { saves: ReturnType<typeof createSaves>; synth: Synth }): Title {
  const T = TITLE, touch = matchMedia('(pointer: coarse)').matches;
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0;z-index:15;display:flex;flex-direction:column;align-items:flex-start;
    justify-content:flex-end;gap:28px;padding:0 4vw ${touch ? T.touchBottom : 5}vh;background:${T.bg};touch-action:manipulation`;
  const word = (text: string, color: string, scale: number) => {
    const cv = Object.assign(document.createElement('canvas'), { width: measure(text), height: 5 });
    drawText(cv.getContext('2d')!, text, 0, 0, color);
    cv.style.cssText = `width:${cv.width * scale}px;height:${cv.height * scale}px;image-rendering:pixelated;display:block`;
    return cv;
  };
  const list = document.createElement('div');
  list.style.cssText = `display:flex;flex-direction:column;gap:${T.gap}px;max-height:${T.listMaxVh}vh;overflow-y:auto;padding:6px 10px 6px 0;scrollbar-width:none`;
  const note = document.createElement('div');
  el.append(spaceText('NEON ECHOES', T.color, T.scale), list, note);
  document.body.appendChild(el);

  const state = { done: false, save: null } as Title;
  let view = 'main', sel = 0, rows: Row[] = [];
  const pct10 = (v: number) => String(Math.round(v * 10));
  const when = (t: number) => new Date(t).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const full = document.fullscreenEnabled;
  const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
  const tiers = Object.keys(TIERS) as TierName[];
  const setQuality = (d: number) => { // the video quality is read at startup, so changing it reloads the page (back on this menu)
    const q = tiers[(tiers.indexOf(settings.tier) + d + tiers.length) % tiers.length];
    try { localStorage.setItem(QUALITY_KEY, q); } catch { /* private mode */ }
    location.href = location.pathname;
  };
  const vol = (bus: BusName) => (d: number) => synth.setVolume(bus, Math.round((synth.volumes[bus] + d * 0.1) * 10) / 10);

  let finish = () => {};
  const start = (data: unknown) => { state.save = data; finish(); };
  const go = (v: string) => { view = v; sel = 0; build(); };

  const mainRows = (): Row[] => {
    const latest = saves.latest(), has = saves.list.length > 0;
    return [
      { label: 'NEW GAME', act: () => start(null) },
      { label: 'CONTINUE GAME', off: !latest, act: () => start(latest!.data) },
      { label: 'LOAD SAVE GAME', off: !has, act: () => go('load') },
      { label: 'OPTIONS', act: () => go('options') },
      { label: 'QUIT', act: () => { window.close(); note.replaceChildren(word('YOU CAN CLOSE THIS TAB NOW', T.sub, 3)); } },
    ];
  };
  const loadRows = (): Row[] => [
    { label: 'BACK', act: () => go('main') },
    ...saves.list.map((s) => ({ label: `${s.name} ${when(s.t)}`, act: () => start(s.data) })),
  ];
  const optionRows = (): Row[] => [
    { label: 'BACK', act: () => go('main') },
    { label: () => `MUSIC VOLUME ${pct10(synth.volumes.music)}`, adj: vol('music') },
    { label: () => `EFFECTS VOLUME ${pct10(synth.volumes.sfx)}`, adj: vol('sfx') },
    { label: () => `MUSIC ${synth.musicOn ? 'ON' : 'OFF'}`, adj: () => synth.setMusicOn(!synth.musicOn) },
    { label: () => `QUALITY ${TIERS[settings.tier].name.toUpperCase()}`, adj: setQuality },
    ...(full ? [{ label: () => `FULLSCREEN ${document.fullscreenElement ? 'ON' : 'OFF'}`, adj: toggleFull }] : []),
  ];

  function build() {
    rows = view === 'load' ? loadRows() : view === 'options' ? optionRows() : mainRows();
    if (rows[sel]?.off) sel = rows.findIndex((r) => !r.off);
    note.replaceChildren();
    render();
  }
  function render() {
    list.replaceChildren(...rows.map((r, i) => {
      const text = typeof r.label === 'function' ? r.label() : r.label;
      const c = r.off ? T.dim : i === sel ? T.sub : T.color;
      const d = document.createElement('div');
      d.style.cssText = `display:flex;align-items:center;gap:${T.itemScale * 3}px;${r.off ? '' : 'cursor:pointer;'}${touch ? 'padding:10px 0;' : ''}`;
      const mark = word('▶', i === sel && !r.off ? T.sub : 'rgba(0,0,0,0)', T.itemScale);
      d.append(mark, word(text, c, T.itemScale));
      if (!r.off) {
        d.addEventListener('pointerenter', () => { if (sel !== i) { sel = i; render(); } });
        d.addEventListener('click', () => { sel = i; activate(); });
      }
      return d;
    }));
    list.children[sel]?.scrollIntoView({ block: 'nearest' });
  }
  function activate(dir = 1) {
    const r = rows[sel]; if (!r || r.off) return;
    if (r.act) r.act(); else r.adj?.(dir);
    if (!state.done) render();
  }
  function move(d: number) {
    let i = sel;
    do { i = (i + d + rows.length) % rows.length; } while (rows[i].off && i !== sel);
    sel = i; render();
  }
  const press = (k: string) => {
    if (k === 'up') move(-1); else if (k === 'down') move(1);
    else if (k === 'left' || k === 'right') { rows[sel]?.adj?.(k === 'left' ? -1 : 1); render(); }
    else if (k === 'ok') activate();
    else if (k === 'back' && view !== 'main') go('main');
  };

  state.started = new Promise<void>((resolve) => {
    let padPoll = 0;
    finish = () => {
      if (state.done) return;
      state.done = true;
      onStart?.();
      cancelAnimationFrame(padPoll);
      el.remove();
      window.removeEventListener('keydown', onKey, true);
      resolve();
    };
    const KEYS: Record<string, string> = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
      Enter: 'ok', ' ': 'ok', Escape: 'back', Backspace: 'back' };
    function onKey(e: KeyboardEvent) {
      const k = KEYS[e.key]; if (!k) return;
      e.preventDefault(); e.stopPropagation();
      synth.start?.(); // a key press is a gesture: wakes audio so the option volumes can be heard
      press(k);
    }
    window.addEventListener('keydown', onKey, true); // capture: the key doesn't also reach the game
    // Gamepad: D-pad or left stick move, A / Cross picks, B / Circle goes back.
    const held = new Set<string>(), PAD: Record<number, string> = { 12: 'up', 13: 'down', 14: 'left', 15: 'right', 0: 'ok', 1: 'back' };
    const edge = (key: string, on: boolean, k: string) => { if (on && !held.has(key)) { held.add(key); press(k); } else if (!on) held.delete(key); };
    const poll = () => {
      for (const p of navigator.getGamepads?.() ?? []) {
        if (!p) continue;
        for (const [i, k] of Object.entries(PAD)) edge(`${p.index}:${i}`, !!p.buttons[Number(i)]?.pressed, k);
        const [ax = 0, ay = 0] = p.axes;
        edge(`${p.index}:l`, ax < -T.padStick, 'left'); edge(`${p.index}:r`, ax > T.padStick, 'right');
        edge(`${p.index}:u`, ay < -T.padStick, 'up'); edge(`${p.index}:d`, ay > T.padStick, 'down');
      }
      if (!state.done) padPoll = requestAnimationFrame(poll);
    };
    padPoll = requestAnimationFrame(poll);
    sel = saves.latest() ? 1 : 0; // Continue is the default when there is a save
    build();
  });
  return state;
}
