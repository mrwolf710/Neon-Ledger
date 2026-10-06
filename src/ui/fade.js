import { drawText, measure } from '../gen/pixelfont.js';

// Full-screen black fade (area changes) and a pixel-font title card (cold open, end card).
export const FADE = { seconds: 0.35 };

export function createFade() {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:14;transition:opacity ${FADE.seconds}s ease`;
  document.body.appendChild(el);
  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const card = document.createElement('div');
  card.style.cssText = `position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.4rem;
    pointer-events:none;z-index:13;opacity:0;transition:opacity 1.2s ease`;
  document.body.appendChild(card);
  const line = (text, color, scale) => {
    const cv = Object.assign(document.createElement('canvas'), { width: measure(text), height: 5 });
    drawText(cv.getContext('2d'), text, 0, 0, color);
    cv.style.cssText = `width:${cv.width * scale}px;height:${cv.height * scale}px;image-rendering:pixelated;max-width:92vw;height:auto`;
    return cv;
  };
  return {
    async out() { el.style.opacity = '1'; await wait(FADE.seconds); },
    async in() { el.style.opacity = '0'; await wait(FADE.seconds); },
    set black(on) { el.style.transition = 'none'; el.style.opacity = on ? '1' : '0'; void el.offsetWidth; el.style.transition = `opacity ${FADE.seconds}s ease`; },
    // lines: [{ text, color, scale }]. Fades in, holds, fades out; resolves when gone.
    async card(lines, hold = 3) {
      card.replaceChildren(...lines.map((l) => line(l.text, l.color ?? '#ffffff', l.scale ?? 6)));
      card.style.opacity = '1';
      await wait(1.2 + hold);
      card.style.opacity = '0';
      await wait(1.2);
    },
  };
}
