import { drawText, measure } from '../gen/pixelfont.js';

// Full-screen black fade (area changes) and a pixel-font title card (cold open, end card).
export const FADE = { seconds: 0.35, cardY: 50, cardGap: 5 }; // cardY: % from the top where a split title's row is centred (where Juno stands in the cold open); cardGap: vh between its words

export function createFade() {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:14;transition:opacity ${FADE.seconds}s ease`;
  document.body.appendChild(el);
  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const card = document.createElement('div');
  card.style.cssText = `position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.4rem;
    pointer-events:none;z-index:13;opacity:0;transition:opacity 1.2s ease`;
  document.body.appendChild(card);
  let zooming = false;
  const line = (text, color, scale) => {
    const cv = Object.assign(document.createElement('canvas'), { width: measure(text), height: 5 });
    drawText(cv.getContext('2d'), text, 0, 0, color);
    cv.style.cssText = `width:${cv.width * scale}px;height:${cv.height * scale}px;image-rendering:pixelated;max-width:44vw;height:auto`;
    return cv;
  };
  return {
    async out() { el.style.opacity = '1'; await wait(FADE.seconds); },
    async in() { el.style.opacity = '0'; await wait(FADE.seconds); },
    set black(on) { el.style.transition = 'none'; el.style.opacity = on ? '1' : '0'; void el.offsetWidth; el.style.transition = `opacity ${FADE.seconds}s ease`; },
    cardScale(r) { if (zooming) card.style.transform = `scale(${r})`; }, // same scale as the CRT monitor, so the words move with it
    // The title card fades while the CRT zooms: u = 0..1 (call each frame; u = 1 clears it).
    cardZoom(u) {
      if (u >= 1) { zooming = false; card.style.transition = ''; card.style.opacity = '0'; card.style.transform = ''; return; }
      zooming = true; card.style.transition = 'none';
      const f = Math.min(1, Math.max(0, (u - 0.1) / 0.8));
      card.style.opacity = String(1 - f * f * (3 - 2 * f));
    },
    // lines: [{ text, color, scale }]. Fades in, holds, fades out; resolves when gone.
    async card(lines, hold = 3) {
      // A line with parts: [a, b] is a row of two words with a clear gap in the middle, centred on cardY (Juno shows through it); other lines stack below.
      const [first, ...rest] = lines;
      const els = [];
      if (first.parts) {
        const row = document.createElement('div');
        row.style.cssText = `position:fixed;left:50%;top:${FADE.cardY}%;transform:translate(-50%,-50%);display:flex;gap:${FADE.cardGap}vh;align-items:center`;
        row.append(...first.parts.map((t) => line(t, first.color ?? '#ffffff', first.scale ?? 6)));
        const below = document.createElement('div');
        below.style.cssText = `position:fixed;left:0;right:0;top:calc(${FADE.cardY}% + 6vh);display:flex;flex-direction:column;align-items:center;gap:1.4rem`;
        below.append(...rest.map((l) => line(l.text, l.color ?? '#ffffff', l.scale ?? 6)));
        els.push(row, below);
      } else els.push(...lines.map((l) => line(l.text, l.color ?? '#ffffff', l.scale ?? 6)));
      card.replaceChildren(...els);
      card.style.opacity = '1';
      await wait(1.2 + hold);
      if (zooming) return; // the zoom is already carrying it away
      card.style.opacity = '0';
      await wait(1.2);
    },
  };
}
