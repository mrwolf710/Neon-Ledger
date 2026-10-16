// Issue box: F9 (keyboard), "!" (touch icon) or both stick clicks (gamepad) opens a small box at the bottom right. (F9 is handled here directly; touch and pad arrive as the 'issue' action.)
// Type what is wrong, press Enter or OK. On the dev server the issue is appended to issues.json in the project folder (vite.config.js plugin),
// where Claude reads it first thing in a session. Anywhere else (itch.io, the preview server) it is kept in this browser (localStorage nl.issues).
// Only built when enabled: `npm run dev`, or ?issues in the address.
export const ISSUES = {
  key: 'nl.issues',          // localStorage: issues the server could not take
  maxChars: 600,
  toastSeconds: 2.4,
};

export const issuesEnabled = () => import.meta.env.DEV || new URLSearchParams(location.search).has('issues');

// context(): () => { ...whatever helps reproduce it } is called when the box opens, so it describes the moment you noticed the problem.
export function createIssues({ input, context, toast }) {
  const root = document.createElement('div');
  root.id = 'issue-box';
  root.innerHTML = `<label for="issue-text">Describe the issue:</label>
    <textarea id="issue-text" rows="3" maxlength="${ISSUES.maxChars}" placeholder="What happened? What did you expect?" autocomplete="off" autocapitalize="sentences"></textarea>
    <div class="row"><span class="hint"></span><button type="button" class="cancel">Cancel</button><button type="button" class="ok">OK</button></div>`;
  document.body.appendChild(root);
  const text = root.querySelector('textarea'), hint = root.querySelector('.hint');
  let isOpen = false, snapshot = {}, pending = 0;

  const style = document.createElement('style');
  style.textContent = `#issue-box{position:fixed;right:max(1rem,env(safe-area-inset-right));bottom:max(1rem,env(safe-area-inset-bottom));z-index:30;width:min(24rem,calc(100vw - 2rem));display:none;
    box-sizing:border-box;padding:.8rem;background:rgba(5,2,20,.94);border:2px solid var(--magenta,#e0217d);box-shadow:0 0 1rem rgba(224,33,125,.6);font:600 1rem var(--display,sans-serif);color:#fff;letter-spacing:.06em}
    #issue-box.on{display:block}
    #issue-box label{display:block;margin-bottom:.4rem;color:var(--cyan,#1fd6e8);text-transform:uppercase}
    #issue-box textarea{width:100%;box-sizing:border-box;resize:none;padding:.5rem;background:#0b0820;color:#fff;border:1px solid var(--cyan,#1fd6e8);font:500 1rem var(--body,sans-serif);outline:none}
    #issue-box textarea:focus{border-color:var(--magenta,#e0217d)}
    #issue-box .row{display:flex;gap:.5rem;align-items:center;margin-top:.5rem}
    #issue-box .hint{flex:1;font-size:.8rem;color:var(--dim,#8a8a90);letter-spacing:.02em;text-transform:none}
    #issue-box button{min-width:4.2rem;min-height:2.4rem;padding:.3rem .9rem;font:700 1rem var(--display,sans-serif);letter-spacing:.08em;text-transform:uppercase;background:#0b0820;color:#fff;border:1px solid var(--cyan,#1fd6e8);cursor:pointer;touch-action:manipulation}
    #issue-box button.ok{background:var(--magenta,#e0217d);border-color:var(--magenta,#e0217d)}`;
  document.head.appendChild(style);

  function remember(entry) { // the server was not there: keep it in this browser
    try { const all = JSON.parse(localStorage.getItem(ISSUES.key) ?? '[]'); all.push(entry); localStorage.setItem(ISSUES.key, JSON.stringify(all)); return all.length; } catch { return 0; }
  }
  async function send(entry) {
    try {
      const r = await fetch('/__issues', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) });
      if (!r.ok) throw new Error(String(r.status));
      const { id } = await r.json();
      toast?.(`Issue #${id} saved`);
    } catch {
      const n = remember({ ...entry, at: new Date().toISOString() });
      toast?.(n ? `Saved in this browser only (${n}); no dev server` : 'Could not save the issue');
    }
  }

  const api = {
    get isOpen() { return isOpen; },
    open() {
      if (isOpen) return;
      isOpen = true; snapshot = context?.() ?? {}; text.value = ''; root.classList.add('on');
      hint.textContent = input.lastDevice === 'gamepad' ? 'No text on a pad: OK saves the spot' : 'Enter = OK · Shift+Enter = new line · Esc = cancel';
      text.focus(); requestAnimationFrame(() => text.focus()); // at once, so the first letters you type land in the box and never reach the game (F9 itself types nothing)
    },
    close() { isOpen = false; root.classList.remove('on'); text.blur(); },
    submit() {
      const t = text.value.trim();
      if (!t && input.lastDevice !== 'gamepad') { text.focus(); return; } // nothing typed: keep the box open (a pad has no keyboard, so it saves the spot alone)
      send({ text: t || '(no text: saved from a gamepad)', context: { ...snapshot, device: input.lastDevice } });
      api.close();
    },
    toggle() { if (isOpen) api.close(); else api.open(); },
    // Call each frame after input.update(): F9 / the touch "!" / both stick clicks.
    update() {
      if (input.pressed('issue')) api.toggle();
      else if (isOpen && input.lastDevice === 'gamepad') {
        if (input.pressed('interact')) api.submit();     // A / cross saves
        else if (input.pressed('back') || input.pressed('pause')) api.close(); // B / Start cancels
      }
    },
  };
  // F9 acts at once on the key press, not on the next game frame, so the letters typed right after it can never reach the game.
  window.addEventListener('keydown', (e) => { if (e.code === 'F9' && !e.repeat && !e.target?.matches?.('textarea')) { e.preventDefault(); api.toggle(); } });
  root.querySelector('.ok').addEventListener('click', api.submit);
  root.querySelector('.cancel').addEventListener('click', api.close);
  text.addEventListener('keydown', (e) => {
    e.stopPropagation(); // the game must not see typing
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); api.submit(); }
    else if (e.key === 'Escape' || e.code === 'F9') { e.preventDefault(); api.close(); }
  });
  root.addEventListener('pointerdown', (e) => e.stopPropagation()); // clicks inside the box are not clicks on the world
  return api;
}
