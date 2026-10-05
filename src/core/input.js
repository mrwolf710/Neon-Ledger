// One action layer: game code reads actions, never raw devices.
// Axes: moveX (-1 left, +1 right), moveY (-1 back, +1 forward), zoom (-1 in, +1 out, held keys),
// zoomSteps (wheel notches this frame, + = out).
// Buttons (held/pressed): run, interact, echo, rotateL, rotateR, tiltUp, tiltDown, caseFile, board, map, pause, debug.
// Call update() at frame start and endFrame() after game logic.

export const KEY_BINDINGS = {
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'interact',
  KeyF: 'echo',
  KeyQ: 'rotateL', KeyE: 'rotateR',
  KeyZ: 'zoomIn', KeyX: 'zoomOut',
  KeyR: 'tiltUp', KeyV: 'tiltDown',
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
window.addEventListener('wheel', (e) => { wheel += Math.sign(e.deltaY); }, { passive: true });
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
  },
  endFrame() {
    pressed.clear();
    wheel = 0;
  },
};
