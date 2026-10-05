// On-screen touch controls: floating stick visual, echo button bottom right, case file / board / map / pause
// top right, and a "rotate your phone" overlay in portrait. Buttons feed actions through input.pressAction.
// Shown on touch devices only. Respects safe-area insets (notch, home bar).
export const TOUCH_UI = {
  stickSize: 120,   // px, outer ring
  knobSize: 52,
  echoSize: 76,
  iconSize: 46,
  color: '#1fd6e8', bg: 'rgba(7,7,15,.55)',
};

const CSS = (U) => `
#touch-ui { position:fixed; inset:0; pointer-events:none; z-index:6; font:bold 11px monospace; color:${U.color}; }
#touch-ui .btn { position:absolute; pointer-events:auto; display:flex; align-items:center; justify-content:center;
  border:2px solid ${U.color}; background:${U.bg}; border-radius:50%; touch-action:none; letter-spacing:1px; }
#touch-ui .btn.down { background:${U.color}; color:#07070f; }
#touch-ui .echo { width:${U.echoSize}px; height:${U.echoSize}px;
  right:calc(24px + env(safe-area-inset-right)); bottom:calc(24px + env(safe-area-inset-bottom)); font-size:13px; }
#touch-ui .icons { position:absolute; top:calc(12px + env(safe-area-inset-top)); right:calc(12px + env(safe-area-inset-right));
  display:flex; gap:10px; }
#touch-ui .icons .btn { position:static; width:${U.iconSize}px; height:${U.iconSize}px; border-radius:10px; }
#touch-ui .ring, #touch-ui .knob { position:absolute; border-radius:50%; border:2px solid ${U.color}; display:none;
  transform:translate(-50%,-50%); }
#touch-ui .ring { width:${U.stickSize}px; height:${U.stickSize}px; background:${U.bg}; }
#touch-ui .knob { width:${U.knobSize}px; height:${U.knobSize}px; background:${U.color}; opacity:.7; }
#rotate-msg { position:fixed; inset:0; z-index:20; display:none; align-items:center; justify-content:center;
  background:#07070f; color:${U.color}; font:bold 16px monospace; text-align:center; padding:24px; }
@media (orientation: portrait) and (pointer: coarse) { #rotate-msg { display:flex; } }
`;

export function createTouchUI(input) {
  const U = TOUCH_UI;
  const style = document.createElement('style');
  style.textContent = CSS(U);
  document.head.appendChild(style);

  const rotate = document.createElement('div');
  rotate.id = 'rotate-msg';
  rotate.textContent = 'Turn your phone sideways to play';
  document.body.appendChild(rotate);

  const root = document.createElement('div');
  root.id = 'touch-ui';
  const ring = Object.assign(document.createElement('div'), { className: 'ring' });
  const knob = Object.assign(document.createElement('div'), { className: 'knob' });
  root.append(ring, knob);

  const button = (cls, label, action, parent = root) => {
    const b = Object.assign(document.createElement('div'), { className: `btn ${cls}`, textContent: label });
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); input.pressAction(action); });
    const up = () => { b.classList.remove('down'); input.releaseAction(action); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    parent.appendChild(b);
  };
  button('echo', 'ECHO', 'echo');
  const icons = Object.assign(document.createElement('div'), { className: 'icons' });
  root.appendChild(icons);
  button('', 'CASE', 'caseFile', icons);
  button('', 'BRD', 'board', icons);
  button('', 'MAP', 'map', icons);
  button('', '❚❚', 'pause', icons);
  document.body.appendChild(root);

  const touchDevice = matchMedia('(pointer: coarse)').matches; // touch laptops show it once touched (lastDevice)
  return {
    // Call each frame after input.update().
    update() {
      root.style.display = touchDevice || input.lastDevice === 'touch' ? 'block' : 'none';
      const s = input.touchStick;
      ring.style.display = knob.style.display = s.active ? 'block' : 'none';
      if (!s.active) return;
      const dx = s.x - s.ox, dy = s.y - s.oy, m = Math.hypot(dx, dy), max = U.stickSize / 2;
      const k = m > max ? max / m : 1;
      ring.style.left = `${s.ox}px`; ring.style.top = `${s.oy}px`;
      knob.style.left = `${s.ox + dx * k}px`; knob.style.top = `${s.oy + dy * k}px`;
    },
  };
}
