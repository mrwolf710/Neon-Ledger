import { ENTRIES } from './story.js';
import { frame } from '../ui/hud.js';

const TABS = [['people', 'People'], ['facts', 'Facts'], ['echoes', 'Echoes']];

// Case file state (people / facts / echoes, plus story flags) and its full-screen UI.
// Tab / Y / the CASE icon toggles it. In present mode (opened by a dialogue) picking a fact calls onPick(id).
export function createCaseFile(hud, clock) {
  const known = new Map();           // id -> { ...entry, order }
  const flags = new Set();
  let isOpen = false, tab = 'facts', sel = 0, present = null;

  const root = document.createElement('div');
  root.id = 'casefile';
  document.body.appendChild(root);
  const box = frame(document.createElement('div'));
  box.className += ' cf-box';
  root.appendChild(box);
  const head = document.createElement('div'); head.className = 'cf-head'; box.appendChild(head);
  const tabsEl = document.createElement('div'); tabsEl.className = 'cf-tabs'; head.appendChild(tabsEl);
  const title = document.createElement('div'); title.className = 'cf-title nameplate'; head.appendChild(title);
  const closeBtn = Object.assign(document.createElement('button'), { className: 'cf-close', textContent: '✕' }); // the way out on touch screens
  closeBtn.addEventListener('click', () => close());
  head.appendChild(closeBtn);
  const list = document.createElement('div'); list.className = 'cf-list'; box.appendChild(list);
  const foot = document.createElement('div'); foot.className = 'cf-foot'; box.appendChild(foot);

  const entries = (kind) => [...known.values()].filter((e) => e.kind === kind).sort((a, b) => a.order - b.order);

  function render() {
    tabsEl.replaceChildren(...TABS.map(([k, label]) => {
      const b = document.createElement('button');
      b.className = `cf-tab${k === tab ? ' on' : ''}`;
      b.textContent = `${label} ${entries(k).length}`;
      b.onclick = () => { tab = k; sel = 0; render(); };
      return b;
    }));
    title.textContent = present ? 'Present which fact?' : 'Case file';
    const rows = entries(tab);
    sel = Math.min(sel, Math.max(0, rows.length - 1));
    if (!rows.length) { list.innerHTML = '<div class="cf-empty">Nothing here yet.</div>'; }
    else {
      list.replaceChildren(...rows.map((e, i) => {
        const d = document.createElement('div');
        d.className = `cf-entry${i === sel ? ' sel' : ''}`;
        d.innerHTML = '<div class="t"></div><div class="x"></div><div class="s"></div>';
        d.children[0].textContent = e.title; d.children[1].textContent = e.text; d.children[2].textContent = `From: ${e.source}`;
        d.onclick = () => { sel = i; if (present) pick(); else render(); };
        return d;
      }));
    }
    list.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
    foot.textContent = present ? 'Up / Down choose · Space present · Esc cancel' : 'A / D or Q / E tabs · Tab closes';
  }

  function close() {
    if (!isOpen) return;
    isOpen = false; root.classList.remove('on'); api.onUi?.('back');
    const cancel = present?.onCancel; present = null;
    cancel?.();
  }
  function pick() {
    const e = entries(tab)[sel];
    if (!present || tab !== 'facts' || !e) return;
    const done = present.onPick; present = null; isOpen = false; root.classList.remove('on');
    done(e.id);
  }

  const api = {
    get isOpen() { return isOpen; },
    // Knowledge.
    has: (id) => known.has(id),
    add(id) {
      if (known.has(id)) return false;
      const e = ENTRIES[id];
      if (!e) { console.warn('case file: unknown entry', id); return false; }
      known.set(id, { ...e, id, order: known.size });
      hud.toast('Case file updated');
      api.onAdd?.(id);
      if (isOpen) render();
      return true;
    },
    setFlag: (name) => flags.add(name),
    // Save games: what Juno knows (ids + order) and the story flags. restore() rebuilds both without toasts or sounds.
    dump: () => ({ known: [...known].map(([id, e]) => [id, e.order]), flags: [...flags] }),
    restore(d) {
      known.clear(); flags.clear();
      for (const [id, order] of d.known) if (ENTRIES[id]) known.set(id, { ...ENTRIES[id], id, order });
      for (const f of d.flags) flags.add(f);
      if (isOpen) render();
    },
    // Story effects: { addFact | addPerson | addEcho: id } { setFlag: name } { setTime: [h, m] }.
    apply(effects = []) {
      for (const e of effects) {
        for (const k of ['addFact', 'addPerson', 'addEcho']) if (e[k]) api.add(e[k]);
        if (e.setFlag) flags.add(e.setFlag);
        if (e.setTime && clock) clock.setTime(...e.setTime);
      }
    },
    facts: () => entries('facts'),
    hasFlag: (name) => flags.has(name),
    // Opens the case file. opts: { present: true, onPick(id), onCancel() } for the Present choice.
    open(opts = {}) {
      present = opts.present ? opts : null;
      tab = present ? 'facts' : tab; sel = 0;
      isOpen = true; root.classList.add('on'); render(); api.onUi?.('confirm');
    },
    close,
    toggle() { if (isOpen) close(); else api.open(); },
    // Call each frame while open.
    update(input) {
      if (!isOpen) return;
      const p = (a) => input.pressed(a);
      if (p('caseFile') || p('back') || p('pause')) { close(); return; }
      const ti = TABS.findIndex(([k]) => k === tab), n = TABS.length;
      if (p('rotateL') || p('left') || p('menuLeft')) { tab = TABS[(ti + n - 1) % n][0]; sel = 0; render(); }
      if (p('rotateR') || p('right') || p('menuRight')) { tab = TABS[(ti + 1) % n][0]; sel = 0; render(); }
      const m = entries(tab).length;
      if ((p('up') || p('menuUp')) && m) { sel = (sel + m - 1) % m; render(); }
      if ((p('down') || p('menuDown')) && m) { sel = (sel + 1) % m; render(); }
      if (p('interact')) pick();
    },
  };
  return api;
}
