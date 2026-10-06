// The cold open plays inside the owner's CRT monitor PNG (public/sprites/crt/frame.png, 256x256).
// The game canvas is scaled down with CSS to fill the monitor's glass; set(k) goes from k = 1 (inside the monitor) to k = 0
// (monitor zoomed away, canvas back to full screen). Both move together so the glass always matches the picture.
export const CRT_FRAME = {
  size: 256,                       // PNG size in px
  glass: { cx: 127.5, cy: 137, w: 122, h: 79 }, // the transparent screen: centre and width in PNG px (measured with scripts/pngbox.mjs)
  body: { h: 159 },                // opaque monitor height in PNG px
  screenFrac: 0.96,                // monitor height as a share of the window height at k = 1
  glow: 'drop-shadow(0 0 3vh rgba(57,255,20,0.65)) drop-shadow(0 0 10vh rgba(40,255,40,0.5))', // on a copy behind the canvas, so it never tints the picture
};

export function createCrtFrame(canvas) {
  const C = CRT_FRAME;
  const make = (z, filter) => {
    const im = new Image();
    im.src = `${import.meta.env.BASE_URL}sprites/crt/frame.png`;
    im.style.cssText = `position:fixed;left:50%;top:50%;width:${C.size}px;height:${C.size}px;margin:${-C.size / 2}px 0 0 ${-C.size / 2}px;
      image-rendering:pixelated;pointer-events:none;z-index:${z};display:none;filter:${filter}`;
    document.body.appendChild(im);
    return im;
  };
  const img = make(3, 'none'), glow = make(0, C.glow);
  canvas.style.position = 'relative'; canvas.style.zIndex = 1; // the glow copy sits under the canvas
  let k = 0, ratio = 1; // ratio: how much bigger the monitor is than at k = 1 (the title card scales by the same amount)
  function apply() {
    if (k <= 0) { img.style.display = glow.style.display = 'none'; canvas.style.transform = canvas.style.clipPath = ''; return; }
    const vw = window.innerWidth, vh = window.innerHeight;
    const B = (C.screenFrac * vh) / C.body.h;      // monitor px per PNG px at k = 1
    const R = Math.max(vw / C.glass.w, vh / C.glass.h); // at k = 0 the glass is at least as big as the window
    const S = B * (R / B) ** (1 - k);
    ratio = S / B;               // geometric: a steady zoom
    const s = Math.min(1, Math.max(C.glass.w * S / vw, C.glass.h * S / vh)); // the picture always covers the glass (no bars), and is never larger than the window
    canvas.style.transform = `scale(${s})`;
    // the picture can be wider than the glass: clip it to the glass (in the canvas's own pixels) so it never sticks out of the monitor
    const ix = Math.max(0, (vw - C.glass.w * S / s) / 2), iy = Math.max(0, (vh - C.glass.h * S / s) / 2);
    canvas.style.clipPath = `inset(${iy}px ${ix}px ${iy}px ${ix}px round ${0.06 * vh / s}px)`;
    img.style.display = glow.style.display = 'block';
    img.style.transform = glow.style.transform = `scale(${S}) translate(${C.size / 2 - C.glass.cx}px, ${C.size / 2 - C.glass.cy}px)`; // glass centre on the window centre
  }
  window.addEventListener('resize', apply);
  return { set(v) { k = v; apply(); }, get ratio() { return ratio; } };
}
