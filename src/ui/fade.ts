import { drawText, measure } from '../gen/pixelfont.ts';
import { rng } from '../core/rng.ts';
import { spaceText } from '../gen/spacefont.ts';
import { CRT_FRAME } from './crtframe.ts';

// Full-screen black fade (area changes) and a pixel-font title card (cold open, end card).
export const LINES = { count: 70, color: '#9fe8ff', alpha: 0.55, minLen: 90, maxLen: 380, minSpeed: 1400, maxSpeed: 2600, width: 2 }; // the driving streaks: lengths and speeds in screen px (per second)
export const FADE = { seconds: 0.35, cardY: 50, cardGap: 5 }; // cardY: % from the top where a split title's row is centred (where Juno stands in the cold open); cardGap: vh between its words

export interface CardLine { text: string; color?: string; scale?: number; parts?: string[]; corner?: string | boolean }
export interface Fade {
  out(): Promise<void>;
  in(): Promise<void>;
  black: boolean;
  cardScale(r: number): void;
  cardZoom(u: number): void;
  log(hold?: number): Promise<void>;
  hideCard(s?: number): Promise<void>;
  card(lines: CardLine[], hold?: number, bottom?: number): Promise<void>;
  speedLines(seconds: number, dirX: number, dirY: number): Promise<void>;
}

export function createFade(): Fade {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:14;transition:opacity ${FADE.seconds}s ease`;
  document.body.appendChild(el);
  const wait = (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000));
  const card = document.createElement('div');
  card.style.cssText = `position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.4rem;
    pointer-events:none;z-index:15;opacity:0;transition:opacity 1.2s ease`;
  document.body.appendChild(card);
  let zooming = false;
  const line = (text: string, color: string, scale: number) => {
    if (!text.startsWith('TAP OR PRESS')) { const sp = spaceText(text, color, scale); sp.style.maxWidth = '92vw'; sp.style.height = 'auto'; return sp; } // titles in the space-age lettering; the small hint stays pixel font
    const cv = Object.assign(document.createElement('canvas'), { width: measure(text), height: 5 });
    drawText(cv.getContext('2d')!, text, 0, 0, color);
    cv.style.cssText = `width:${cv.width * scale}px;height:${cv.height * scale}px;image-rendering:pixelated;max-width:44vw;height:auto`;
    return cv;
  };
  // Streaks racing past the windows while Juno drives (over the world, under the black fade); resolves after `seconds`.
  const speedLines = (seconds: number, dirX: number, dirY: number) => new Promise<void>((done) => {
    const L = LINES, r = rng.fork('speedlines'), cv = document.createElement('canvas'), n = Math.hypot(dirX, dirY) || 1, ux = dirX / n, uy = dirY / n; // (ux, uy): the way the streaks flow on screen (opposite to the car's heading)
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    cv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:13;transition:opacity 0.35s ease';
    document.body.appendChild(cv);
    const g = cv.getContext('2d')!, cx = cv.width / 2, cy = cv.height / 2, R = Math.hypot(cx, cy) + L.maxLen;
    const spawn = (back: number) => { const p = r.range(-R, R); return { x: cx - ux * back - uy * p, y: cy - uy * back + ux * p }; }; // a point on the line across the screen, `back` px upstream of the centre
    const lines = Array.from({ length: L.count }, () => ({ ...spawn(r.range(-R, R)), len: r.range(L.minLen, L.maxLen), v: r.range(L.minSpeed, L.maxSpeed), a: r.range(0.3, 1) }));
    let last = performance.now(), left = seconds;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; left -= dt;
      g.clearRect(0, 0, cv.width, cv.height); g.lineWidth = L.width; g.strokeStyle = L.color;
      for (const l of lines) {
        l.x += ux * l.v * dt; l.y += uy * l.v * dt;
        if ((l.x - cx) * ux + (l.y - cy) * uy > R) Object.assign(l, spawn(R));
        g.globalAlpha = L.alpha * l.a; g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(l.x - ux * l.len, l.y - uy * l.len); g.stroke();
      }
      if (left > 0) requestAnimationFrame(tick);
      else { cv.style.opacity = '0'; setTimeout(() => cv.remove(), 400); done(); }
    };
    requestAnimationFrame(tick);
  });
  return {
    speedLines,
    async out() { el.style.opacity = '1'; await wait(FADE.seconds); },
    async in() { el.style.opacity = '0'; await wait(FADE.seconds); },
    set black(on: boolean) { el.style.transition = 'none'; el.style.opacity = on ? '1' : '0'; void el.offsetWidth; el.style.transition = `opacity ${FADE.seconds}s ease`; },
    cardScale(r: number) { if (zooming) card.style.transform = `scale(${r})`; }, // same scale as the CRT monitor, so the words move with it
    // The title card fades while the CRT zooms: u = 0..1 (call each frame; u = 1 clears it).
    cardZoom(u: number) {
      if (u >= 1) { zooming = false; card.style.transition = ''; card.style.opacity = '0'; card.style.transform = ''; return; }
      zooming = true; card.style.transition = 'none';
      const f = Math.min(1, Math.max(0, (u - 0.1) / 0.8));
      card.style.opacity = String(1 - f * f * (3 - 2 * f));
    },
    // Beat 7: Juno's implant log, 22:40-02:10 as a bar with a red 47-minute hole (23:10-23:57) that opens up.
    async log(hold = 5) {
      const gap = document.createElement('div');
      gap.style.cssText = `position:absolute;top:0;bottom:0;left:${(30 / 210) * 100}%;width:0;background:#ff2a3a;box-shadow:0 0 12px #ff2a3a;transition:width 1.6s ease .8s`;
      const bar = document.createElement('div');
      bar.style.cssText = 'position:relative;width:100%;height:18px;background:#10303a';
      bar.append(gap);
      const ends = document.createElement('div');
      ends.style.cssText = 'display:flex;justify-content:space-between;width:100%';
      ends.append(line('22:40', '#9ff4ff', 3), line('02:10', '#9ff4ff', 3));
      const p = document.createElement('div');
      p.style.cssText = 'position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);width:min(80vw,640px);z-index:13;opacity:0;transition:opacity .8s ease;pointer-events:none;'
        + 'display:flex;flex-direction:column;gap:1.2rem;align-items:center;background:rgba(2,6,10,.88);padding:1.6rem;border:1px solid #1fd6e8';
      p.append(line('IMPLANT LOG - JUNO VALE', '#1fd6e8', 4), bar, ends, line('23:10 - 23:57  NO RECORD  47 MIN', '#ff2a3a', 4));
      document.body.append(p);
      void p.offsetWidth;
      p.style.opacity = '1'; gap.style.width = `${(47 / 210) * 100}%`;
      await wait(hold);
      p.style.opacity = '0';
      await wait(0.9);
      p.remove();
    },
    async hideCard(s = 0.4) { card.style.transition = `opacity ${s}s ease`; card.style.opacity = '0'; await wait(s); card.style.transition = ''; },
    // lines: [{ text, color, scale }]. Fades in, holds, fades out; resolves when gone.
    async card(lines: CardLine[], hold = 3, bottom = 0) {
      // bottom > 0: park the card at the bottom of the screen (px above the edge) so it never covers the action (trailer)
      card.style.justifyContent = bottom ? 'flex-end' : 'center'; card.style.paddingBottom = bottom ? `${bottom}px` : '0';
      // A line with parts: [a, b] is a row of two words with a clear gap in the middle, centred on cardY (Juno shows through it); other lines stack below.
      const [first, ...rest] = lines;
      const els: HTMLElement[] = [];
      if (first.parts) {
        const row = document.createElement('div');
        row.style.cssText = `display:flex;gap:${FADE.cardGap}vh;align-items:center`;
        row.append(...first.parts.map((t) => line(t, first.color ?? '#ffffff', first.scale ?? 6)));
        const below = document.createElement('div');
        below.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:1.4rem';
        below.append(...rest.map((l) => line(l.text, l.color ?? '#ffffff', l.scale ?? 6)));
        const box = document.createElement('div'); // bottom-left corner: the words, then the subtitle underneath
        box.style.cssText = 'position:fixed;left:4vw;bottom:5vh;display:flex;flex-direction:column;align-items:flex-start;gap:1.6rem';
        box.append(row, below);
        els.push(box);
      } else if (first.corner === 'glass') { // inside the CRT glass, bottom-left (the card scales with the monitor, so it stays there)
        const B = (CRT_FRAME.screenFrac * window.innerHeight) / CRT_FRAME.body.h, gw = CRT_FRAME.glass.w * B, gh = CRT_FRAME.glass.h * B, pad = 0.05 * gh;
        const box = document.createElement('div');
        box.style.cssText = `position:fixed;left:calc(50% - ${gw / 2 - pad}px);bottom:calc(50% - ${gh / 2 - pad}px);display:flex;flex-direction:column;align-items:flex-start;gap:0.6rem`;
        box.append(...lines.map((l) => line(l.text, l.color ?? '#ffffff', l.scale ?? 6)));
        els.push(box);
      } else if (first.corner) { // plain lines stacked in the bottom-left corner
        const box = document.createElement('div');
        box.style.cssText = 'position:fixed;left:4vw;bottom:5vh;display:flex;flex-direction:column;align-items:flex-start;gap:1.6rem';
        box.append(...lines.map((l) => line(l.text, l.color ?? '#ffffff', l.scale ?? 6)));
        els.push(box);
      } else els.push(...lines.map((l) => line(l.text, l.color ?? '#ffffff', l.scale ?? 6)));
      card.replaceChildren(...els);
      card.style.opacity = '1';
      if (hold === Infinity) return; // stays up until hideCard()
      await wait(1.2 + hold);
      if (zooming) return; // the zoom is already carrying it away
      card.style.opacity = '0';
      await wait(1.2);
    },
  };
}
