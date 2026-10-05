// One action layer: game code reads actions, never raw devices.
// Axes: moveX (-1 left, +1 right), moveY (-1 back, +1 forward), zoom (-1 in, +1 out, held keys),
// zoomSteps (wheel notches this frame, + = out), orbitDX/DY and panDX/DY (mouse drag pixels this frame:
// left-drag orbits; right-, middle- or Shift+left-drag pans).
// Buttons (held/pressed): run, interact, echo, rotateL, rotateR, tiltUp, tiltDown, caseFile, board, map, pause, debug.
// Call update() at frame start and endFrame() after game logic.

export const KEY_BINDINGS = {
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'interact',
  KeyF: 'echo',
  KeyQ: 'rotateL', KeyE: 'rotateR',
  KeyZ: 'zoomIn', KeyX: 'zoomOut',
  KeyR: 'tiltUp', KeyV: 'tiltDown', KeyC: 'resetView',
  Tab: 'caseFile',
  KeyB: 'board',
  KeyN: 'map',
  Escape: 'pause',
  Backquote: 'debug',
};

const held = new Set();
const pressed = new Set();
let wheel = 0;

const press = (a) => { if (!held.has(a)) pressed.add(a); held.add(a); };
const release = (a) => held.delete(a);
const axis = (neg, pos) => (held.has(pos) ? 1 : 0) - (held.has(neg) ? 1 : 0);

// --- Keyboard ---
window.addEventListener('keydown', (e) => {
  const a = KEY_BINDINGS[e.code];
  if (!a) return;
  e.preventDefault(); // stop Tab focus changes and Space scrolling
  press(a);
});
window.addEventListener('keyup', (e) => {
  const a = KEY_BINDINGS[e.code];
  if (a) release(a);
});
window.addEventListener('blur', () => held.clear());

// --- Mouse ---
window.addEventListener('wheel', (e) => { if (e.target.id === 'game') wheel += Math.sign(e.deltaY); }, { passive: true });
const drag = { mode: null, x: 0, y: 0, orbitX: 0, orbitY: 0, panX: 0, panY: 0 };
window.addEventListener('pointerdown', (e) => {
  if (e.target.id !== 'game') return; // ignore clicks on the debug panel
  drag.mode = e.button === 0 && !e.shiftKey ? 'orbit' : 'pan';
  drag.x = e.clientX; drag.y = e.clientY;
  e.target.setPointerCapture(e.pointerId);
});
window.addEventListener('pointermove', (e) => {
  if (!drag.mode) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY;
  if (drag.mode === 'orbit') { drag.orbitX += dx; drag.orbitY += dy; } else { drag.panX += dx; drag.panY += dy; }
});
window.addEventListener('pointerup', () => { drag.mode = null; });
window.addEventListener('contextmenu', (e) => { if (e.target.id === 'game') e.preventDefault(); });
function pollMouse() {
  // TODO Stage 5A: click-to-interact, hover.
}

// --- Gamepad ---
function pollGamepad() {
  // TODO Stage 5A: navigator.getGamepads(), left stick -> moveX/moveY, buttons -> press()/release().
}

// --- Touch ---
function pollTouch() {
  // TODO Stage 5B: virtual stick and buttons -> moveX/moveY, press()/release().
}

export const input = {
  moveX: 0,
  moveY: 0,
  zoom: 0,
  zoomSteps: 0,
  orbitDX: 0, orbitDY: 0, panDX: 0, panDY: 0,
  held: (a) => held.has(a),
  pressed: (a) => pressed.has(a),
  update() {
    pollMouse();
    pollGamepad();
    pollTouch();
    this.moveX = axis('left', 'right');
    this.moveY = axis('down', 'up');
    this.zoom = axis('zoomIn', 'zoomOut');
    this.zoomSteps = wheel;
    this.orbitDX = drag.orbitX; this.orbitDY = drag.orbitY; this.panDX = drag.panX; this.panDY = drag.panY;
  },
  endFrame() {
    pressed.clear();
    wheel = 0;
    drag.orbitX = drag.orbitY = drag.panX = drag.panY = 0;
  },
};
