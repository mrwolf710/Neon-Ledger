import { drawText, measure } from '../gen/pixelfont.js';

// "Tap to start" title screen. The first tap/click/key dismisses it; title.started resolves then
// (Stage 8 unlocks Web Audio on that gesture, which iOS requires).
export const TITLE = {
  scale: 8,                 // screen pixels per title pixel
  color: '#ff6fb5', sub: '#1fd6e8', bg: 'rgba(7,7,15,.6)',
  blinkMs: 600,
};

export function createTitle() {
  const T = TITLE;
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0;z-index:15;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:28px;background:${T.bg};cursor:pointer;touch-action:none`;
  const word = (text, color, scale) => {
    const cv = Object.assign(document.createElement('canvas'), { width: measure(text), height: 5 });
    drawText(cv.getContext('2d'), text, 0, 0, color);
    cv.style.cssText = `width:${cv.width * scale}px;height:${cv.height * scale}px;image-rendering:pixelated`;
    return cv;
  };
  const touch = matchMedia('(pointer: coarse)').matches;
  const sub = word(touch ? 'TAP TO START' : 'CLICK OR PRESS ANY KEY', T.sub, Math.max(2, T.scale / 3));
  el.append(word('NEON LEDGER', T.color, T.scale), sub);
  document.body.appendChild(el);
  const blink = setInterval(() => { sub.style.visibility = sub.style.visibility === 'hidden' ? 'visible' : 'hidden'; }, T.blinkMs);

  const state = { done: false };
  state.started = new Promise((resolve) => {
    const go = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (state.done) return;
      state.done = true;
      clearInterval(blink);
      el.remove();
      window.removeEventListener('keydown', go, true);
      resolve();
    };
    el.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go, true); // capture: the key doesn't also reach the game
  });
  return state;
}
