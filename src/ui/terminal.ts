// Computer screens: an e-mail reader (Juno snooping on a desk computer) and a door keypad.
// Both take the whole screen, work with keyboard, mouse, touch and gamepad, and resolve a promise when they close.
export const TERMINAL = {
  z: 21,
  ink: '#04141a', glow: '#1fd6e8', dim: '#4a8a94', alarm: '#ff3b4c', ok: '#5cf0a0', hilite: '#f2a93b',
  codeLength: 4,
  deniedSeconds: 0.9,   // the keypad flashes red this long on a wrong code
};

const CSS = `#term{position:fixed;inset:0;z-index:${TERMINAL.z};display:none;align-items:center;justify-content:center;background:rgba(2,6,10,.82);font-family:var(--body,monospace);color:${TERMINAL.glow};touch-action:manipulation}
#term.on{display:flex}
#term .scr{box-sizing:border-box;width:min(46rem,94vw);max-height:calc(100% - 1rem);display:flex;flex-direction:column;padding:.8rem 1rem;background:${TERMINAL.ink};border:2px solid ${TERMINAL.glow};box-shadow:0 0 1.4rem rgba(31,214,232,.55),inset 0 0 2.4rem rgba(31,214,232,.12);
  background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px)}
#term .bar{display:flex;justify-content:space-between;gap:1rem;font:700 1rem var(--display,monospace);letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid ${TERMINAL.dim};padding-bottom:.4rem;margin-bottom:.5rem}
#term .bar b{cursor:pointer;color:${TERMINAL.hilite};padding:0 .3rem}
#term .mailbox{display:flex;gap:.8rem;min-height:0;flex:1}
#term .list{flex:0 0 38%;overflow-y:auto;display:flex;flex-direction:column;gap:.2rem}
#term .row{padding:.35rem .5rem;border:1px solid transparent;cursor:pointer;font-size:.95rem;line-height:1.2}
#term .row small{display:block;color:${TERMINAL.dim}}
#term .row.sel{border-color:${TERMINAL.hilite};background:rgba(242,169,59,.14);color:#fff}
#term .body{flex:1;overflow-y:auto;font-size:1rem;line-height:1.4;white-space:pre-wrap;padding-left:.6rem;border-left:1px solid ${TERMINAL.dim};color:#cfeff4}
#term .body em{font-style:normal;color:${TERMINAL.hilite};font-weight:700;letter-spacing:.1em}
#term .hint{margin-top:.5rem;font-size:.8rem;color:${TERMINAL.dim};text-align:center}
#term .pad{display:grid;grid-template-columns:repeat(3,4.2rem);gap:.5rem;justify-content:center;margin:.4rem 0}
#term .pad button{height:3.4rem;font:700 1.4rem var(--display,monospace);background:#08242c;color:${TERMINAL.glow};border:1px solid ${TERMINAL.glow};cursor:pointer;touch-action:manipulation}
#term .pad button.sel{border-color:${TERMINAL.hilite};background:rgba(242,169,59,.2);color:#fff}
#term .readout{text-align:center;font:700 2.2rem var(--display,monospace);letter-spacing:.5em;min-height:3rem;padding-left:.5em}
#term .readout.bad{color:${TERMINAL.alarm}} #term .readout.good{color:${TERMINAL.ok}}
@media (max-height:460px){#term .scr{padding:.4rem .8rem}#term .pad button{height:2.4rem;font-size:1.1rem}#term .readout{font-size:1.5rem;min-height:2rem}}`;

export function createTerminal({ sfx } = {}) {
  const root = document.createElement('div');
  root.id = 'term';
  document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  root.addEventListener('pointerdown', (e) => e.stopPropagation()); // taps on the screen are not clicks on the world

  let mode = null, done = null, sel = 0, mails = [], entry = '', denied = 0, code = '', keys = [], shut = false;
  const el = (tag, cls, parent, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; parent?.appendChild(n); return n; };

  function close(result) {
    if (!mode) return;
    mode = null; shut = true; root.classList.remove('on'); root.replaceChildren();
    const f = done; done = null; f?.(result);
  }

  // ---------- e-mail ----------
  function drawMail() {
    root.replaceChildren();
    const scr = el('div', 'scr', root), bar = el('div', 'bar', scr);
    el('span', '', bar, `${mails.owner} · inbox`);
    const x = el('b', '', bar, 'CLOSE'); x.addEventListener('click', () => close(true));
    const box = el('div', 'mailbox', scr), list = el('div', 'list', box), body = el('div', 'body', box);
    mails.items.forEach((m, i) => {
      const r = el('div', `row${i === sel ? ' sel' : ''}`, list, m.subject); el('small', '', r, m.from);
      r.addEventListener('click', () => { sel = i; drawMail(); });
    });
    const m = mails.items[sel];
    body.textContent = '';
    for (const part of m.body.split(/\{\{|\}\}/)) { // text between {{ }} is highlighted (the door code)
      if (body.childNodes.length % 2 === 0) body.append(part); else el('em', '', body, part);
    }
    body.firstChild || body.append(' ');
    el('div', 'hint', scr, 'Up / Down: choose mail · Back / Esc: close');
    root.querySelector('.row.sel')?.scrollIntoView({ block: 'nearest' });
  }

  // ---------- keypad ----------
  const LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'];
  function drawPad() {
    root.replaceChildren();
    const scr = el('div', 'scr', root), bar = el('div', 'bar', scr);
    el('span', '', bar, keys.title);
    const x = el('b', '', bar, 'CLOSE'); x.addEventListener('click', () => close(false));
    el('div', `readout${denied > 0 ? ' bad' : ''}`, scr, denied > 0 ? 'DENIED' : entry.padEnd(TERMINAL.codeLength, '·').split('').join(' '));
    const pad = el('div', 'pad', scr);
    LABELS.forEach((l, i) => { const b = el('button', i === sel ? 'sel' : '', pad, l); b.type = 'button'; b.addEventListener('click', () => { sel = i; press(l); }); });
    el('div', 'hint', scr, 'Type the code · Enter: confirm · Back / Esc: leave');
  }
  function press(l) {
    if (denied > 0) return;
    if (l === 'DEL') entry = entry.slice(0, -1);
    else if (l === 'OK') submit();
    else if (entry.length < TERMINAL.codeLength) { entry += l; if (entry.length === TERMINAL.codeLength) submit(); }
    sfx?.ui?.('move');
    if (mode === 'pad') drawPad();
  }
  function submit() {
    if (entry === code) { sfx?.ui?.('confirm'); close(true); return; }
    denied = TERMINAL.deniedSeconds; entry = ''; sfx?.ui?.('back');
    drawPad();
  }

  const onKey = (e) => {
    if (!mode) return;
    const k = e.key;
    if (mode === 'pad' && /^[0-9]$/.test(k)) { e.preventDefault(); e.stopPropagation(); press(k); }
    else if (mode === 'pad' && k === 'Backspace') { e.preventDefault(); e.stopPropagation(); press('DEL'); }
  };
  window.addEventListener('keydown', onKey, true);

  const api = {
    get isOpen() { return !!mode || shut; }, // stays true for the frame it closed, so the press that closed it is not also read as "use"
    // items: [{ from, subject, body }]; {{text}} in a body is highlighted. Resolves true when closed.
    mail(owner, items) {
      mails = { owner, items }; mode = 'mail'; sel = 0; root.classList.add('on'); drawMail();
      return new Promise((res) => { done = res; });
    },
    // Resolves true when the right code is typed, false if she backs out.
    keypad(title, correct) {
      keys = { title }; code = correct; entry = ''; denied = 0; mode = 'pad'; sel = 4; root.classList.add('on'); drawPad();
      return new Promise((res) => { done = res; });
    },
    update(dt, input) {
      if (!mode) { shut = false; return; }
      const up = input.pressed('up') || input.pressed('menuUp'), down = input.pressed('down') || input.pressed('menuDown');
      const left = input.pressed('left') || input.pressed('menuLeft'), right = input.pressed('right') || input.pressed('menuRight');
      const kb = input.lastDevice === 'keyboard';
      if (input.pressed('pause') || (input.pressed('back') && (mode === 'mail' || !kb))) { close(mode === 'mail'); return; } // on the keypad, Backspace deletes (a keyboard leaves with Esc)
      if (mode === 'mail') {
        const n = mails.items.length;
        if (up || down) { sel = (sel + (down ? 1 : n - 1)) % n; drawMail(); }
      } else {
        if (denied > 0) { denied -= dt; if (denied <= 0) { denied = 0; drawPad(); } return; }
        const r = Math.floor(sel / 3), c = sel % 3;
        if (up) sel = ((r + 3) % 4) * 3 + c; else if (down) sel = ((r + 1) % 4) * 3 + c;
        else if (left) sel = r * 3 + (c + 2) % 3; else if (right) sel = r * 3 + (c + 1) % 3;
        if (up || down || left || right) drawPad();
        else if (input.pressed('interact')) { if (kb) submit(); else press(LABELS[sel]); } // Enter / Space confirm the typed code; a pad presses the lit key
      }
    },
  };
  return api;
}
