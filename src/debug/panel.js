// Debug overlay: FPS, draw calls, triangles, seed. Call update() after renderer.render().
export const PANEL = {
  refreshMs: 500,
  style: 'position:fixed;top:8px;left:8px;padding:6px 8px;font:12px/1.4 monospace;color:#7fffb0;' +
    'background:rgba(0,0,0,.7);white-space:pre;pointer-events:none;z-index:10;display:none',
};

export function createDebugPanel(renderer, seed) {
  const el = document.createElement('div');
  el.style.cssText = PANEL.style;
  document.body.appendChild(el);
  let frames = 0, elapsed = 0;

  return {
    toggle() { el.style.display = el.style.display === 'none' ? 'block' : 'none'; },
    update(dt) {
      frames++;
      elapsed += dt;
      if (elapsed * 1000 < PANEL.refreshMs) return;
      const { calls, triangles } = renderer.info.render;
      el.textContent = `FPS   ${Math.round(frames / elapsed)}\ncalls ${calls}\ntris  ${triangles}\nseed  ${seed}`;
      frames = 0;
      elapsed = 0;
    },
  };
}
