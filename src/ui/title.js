import { drawText, measure } from '../gen/pixelfont.js';

// "Tap to start" title screen. The first tap/click/key dismisses it; title.started resolves then
// (Stage 8 unlocks Web Audio on that gesture, which iOS requires).
export const TITLE = {
  scale: 8,                 // screen pixels per title pixel
  color: '#ffffff', sub: '#1fd6e8', bg: 'rgba(7,7,15,.6)',
  blinkMs: 600,
  touchBottom: 22,          // % of the screen height kept clear at the bottom on phones (browser bars, thumbs)
};

// onStart runs synchronously inside the first tap / key press: browsers only let audio start from there.
export function createTitle(onStart, saved = false) {
  const T = TITLE, touch = matchMedia('(pointer: coarse)').matches;
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0;z-index:15;display:flex;flex-direction:column;align-items:flex-start;
    justify-content:flex-end;gap:28px;padding:0 4vw ${touch ? TITLE.touchBottom : 5}vh;background:${T.bg};cursor:pointer;touch-action:none`;
  const word = (text, color, scale) => {
    const cv = Object.assign(document.createElement('canvas'), { width: measure(text), height: 5 });
    drawText(cv.getContext('2d'), text, 0, 0, color);
    cv.style.cssText = `width:${cv.width * scale}px;height:${cv.height * scale}px;image-rendering:pixelated`;
    return cv;
  };
  const sub = word(touch ? 'TAP TO START' : 'CLICK OR PRESS ANY KEY OR BUTTON', T.sub, Math.max(2, T.scale / 3));
  el.append(word('NEON ECHOES', T.color, T.scale), sub);
  if (saved) { const c = word(touch ? 'TAP HERE TO CONTINUE' : 'PRESS C (PAD: Y) TO CONTINUE YOUR SAVED GAME', T.color, Math.max(2, T.scale / (touch ? 3 : 4))); c.dataset.cont = '';
    if (touch) c.style.cssText += ';padding:18px 24px;margin:-18px -24px;border:1px solid rgba(255,255,255,.5)'; // a big, boxed tap target
    el.append(c); }
  document.body.appendChild(el);
  const blink = setInterval(() => { sub.style.visibility = sub.style.visibility === 'hidden' ? 'visible' : 'hidden'; }, T.blinkMs);

  const state = { done: false, continuing: false };
  state.started = new Promise((resolve) => {
    const go = (e, padContinue = false) => {
      e?.preventDefault(); e?.stopPropagation();
      if (state.done) return;
      state.done = true;
      state.continuing = !!saved && (padContinue || e?.key === 'c' || e?.key === 'C' || e?.target?.dataset?.cont !== undefined);
      onStart?.();
      clearInterval(blink); cancelAnimationFrame(padPoll);
      el.remove();
      window.removeEventListener('keydown', go, true);
      resolve();
    };
    // Gamepad: any button starts a new game; Y / Triangle (button 3) continues a saved one. A pad press is not a browser gesture, so
    // the music starts on the next key or click if the browser held the audio back (synth.js resumes then).
    let padPoll = 0;
    const held = new Set();
    const poll = () => {
      for (const p of navigator.getGamepads?.() ?? []) {
        if (!p) continue;
        p.buttons.forEach((b, i) => {
          const k = `${p.index}:${i}`;
          if (b.pressed && !held.has(k)) { held.add(k); go(null, i === 3 && !!saved); } else if (!b.pressed) held.delete(k);
        });
      }
      if (!state.done) padPoll = requestAnimationFrame(poll);
    };
    padPoll = requestAnimationFrame(poll);
    el.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go, true); // capture: the key doesn't also reach the game
  });
  return state;
}
