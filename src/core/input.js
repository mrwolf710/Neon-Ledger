// One action layer: game code reads actions, never raw devices.
// Axes: moveX (-1 left, +1 right), moveY (-1 back, +1 forward), zoom (-1 in, +1 out, held keys / right stick),
// zoomSteps (wheel notches this frame, + = out), orbitDX/DY (mouse drag pixels this frame, either button),
// lookX (-1..1 right stick, turns the camera). run: Shift held or stick at full tilt.
// click: { x, y } screen pixels of a left click this frame (a press that didn't turn into a drag), else null.
// lastDevice: keyboard | mouse | gamepad | touch; padType: xbox | playstation (for prompt glyphs).
// Touch: floating stick on the left half (touchStick, for drawing), tap = click, one-finger drag on the right
// half orbits, two-finger swipe rotates, pinch zooms (zoomFactor this frame, > 1 = out).
// pressAction(a) / releaseAction(a): on-screen buttons feed actions through here.
// Buttons (held/pressed): interact, back, echo, rotateL, rotateR, tiltUp, tiltDown, resetView, caseFile, board,
// map, pause, debug, menuUp/Down/Left/Right. Call update() at frame start and endFrame() after game logic.

export const INPUT = {
  deadZone: 0.2,
  runTilt: 0.9,      // stick magnitude that counts as running
  dragStart: 6,      // pixels before a press becomes a drag (otherwise it's a click)
  tapMs: 400,        // longest touch that still counts as a tap
  stickRadius: 60,   // pixels for full stick deflection
  stickRun: 0.7,     // stick deflection that runs
  swipeRotate: 1,    // two-finger swipe: orbit pixels per finger pixel
};

export const KEY_BINDINGS = {
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run', KeyG: 'sneak',
  Space: 'interact', Enter: 'interact', Backspace: 'back',
  KeyF: 'echo',
  KeyQ: 'rotateL', KeyE: 'rotateR',
  KeyZ: 'zoomIn', KeyX: 'zoomOut',
  KeyR: 'tiltUp', KeyV: 'tiltDown', KeyC: 'resetView',
  Tab: 'caseFile',
  KeyB: 'board',
  KeyN: 'map', KeyH: 'hideControls', KeyM: 'music',
  Escape: 'pause',
  Backquote: 'debug',
};

// Standard gamepad mapping (Xbox names; PlayStation is the same layout).
export const PAD_BINDINGS = {
  0: 'interact', 1: 'back', 2: 'echo', 3: 'caseFile', 4: 'rotateL', 5: 'rotateR',
  7: 'solve', 8: 'board', 9: 'pause', 12: 'menuUp', 13: 'menuDown', 14: 'menuLeft', 15: 'menuRight',
};

const held = new Set();
const pressed = new Set();
let wheel = 0, click = null;

const press = (a) => { if (!held.has(a)) pressed.add(a); held.add(a); };
const release = (a) => held.delete(a);
const axis = (neg, pos) => (held.has(pos) ? 1 : 0) - (held.has(neg) ? 1 : 0);
const dead = (v) => (Math.abs(v) < INPUT.deadZone ? 0 : (v - Math.sign(v) * INPUT.deadZone) / (1 - INPUT.deadZone));

// --- Keyboard ---
window.addEventListener('keydown', (e) => {
  const a = KEY_BINDINGS[e.code];
  if (!a) return;
  e.preventDefault(); // stop Tab focus changes and Space scrolling
  input.lastDevice = 'keyboard';
  press(a);
});
window.addEventListener('keyup', (e) => {
  const a = KEY_BINDINGS[e.code];
  if (a) release(a);
});
window.addEventListener('blur', () => held.clear());

// --- Mouse: a press that stays within dragStart pixels is a click; beyond that it orbits ---
window.addEventListener('wheel', (e) => {
  if (e.target.id !== 'game') return;
  wheel += Math.sign(e.deltaY);
  input.lastDevice = 'mouse';
}, { passive: true });
const drag = { down: false, button: 0, sx: 0, sy: 0, x: 0, y: 0, dragging: false, dx: 0, dy: 0 };
window.addEventListener('pointerdown', (e) => {
  if (e.target.id !== 'game') return; // ignore clicks on the debug panel
  if (e.pointerType === 'touch') { touchDown(e); return; }
  Object.assign(drag, { down: true, button: e.button, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, dragging: false });
  if (e.pointerType !== 'touch') input.lastDevice = 'mouse';
  e.target.setPointerCapture(e.pointerId);
});
window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') { touchMove(e); return; }
  if (!drag.down) return;
  if (!drag.dragging && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > INPUT.dragStart) drag.dragging = true;
  if (drag.dragging) { drag.dx += e.clientX - drag.x; drag.dy += e.clientY - drag.y; }
  drag.x = e.clientX; drag.y = e.clientY;
});
window.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'touch') { touchUp(e); return; }
  if (drag.down && !drag.dragging && drag.button === 0) click = { x: e.clientX, y: e.clientY };
  drag.down = false;
});
window.addEventListener('contextmenu', (e) => { if (e.target.id === 'game') e.preventDefault(); });

// --- Gamepad ---
const padHeld = new Set();
let padStick = { x: 0, y: 0, lookX: 0, zoom: 0 };
function pollGamepad() {
  const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p && p.connected);
  if (!pad) { padStick = { x: 0, y: 0, lookX: 0, zoom: 0 }; return; }
  let active = false;
  for (const [i, a] of Object.entries(PAD_BINDINGS)) {
    const down = !!pad.buttons[i]?.pressed;
    if (down && !padHeld.has(a)) { padHeld.add(a); press(a); active = true; }
    if (!down && padHeld.has(a)) { padHeld.delete(a); release(a); }
  }
  const ax = pad.axes;
  padStick = { x: dead(ax[0] ?? 0), y: -dead(ax[1] ?? 0), lookX: dead(ax[2] ?? 0), zoom: dead(ax[3] ?? 0) };
  if (active || padStick.x || padStick.y || padStick.lookX || padStick.zoom) {
    input.lastDevice = 'gamepad';
    input.padType = /playstation|dualsense|dualshock|054c/i.test(pad.id) ? 'playstation' : 'xbox';
  }
}

// --- Touch ---
const touches = new Map(); // pointerId -> { x, y, sx, sy, t0, role: stick | look, moved }
const touchStick = { active: false, ox: 0, oy: 0, x: 0, y: 0 };
let gesture = null, zoomFactor = 1, stickVec = { x: 0, y: 0, mag: 0 };
window.addEventListener('pointercancel', (e) => { if (e.pointerType === 'touch') touchUp(e, true); });
document.addEventListener('gesturestart', (e) => e.preventDefault()); // iOS page pinch-zoom

function touchDown(e) {
  input.lastDevice = 'touch';
  e.target.setPointerCapture(e.pointerId);
  const stickFree = ![...touches.values()].some((t) => t.role === 'stick');
  const role = e.clientX < window.innerWidth / 2 && stickFree ? 'stick' : 'look';
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), role, moved: false });
  if (role === 'stick') Object.assign(touchStick, { active: true, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY });
  gesture = null;
}
function touchMove(e) {
  const t = touches.get(e.pointerId);
  if (!t) return;
  const looks = [...touches.values()].filter((o) => o.role === 'look');
  if (t.role === 'look' && looks.length === 1 && t.moved) { drag.dx += e.clientX - t.x; drag.dy += e.clientY - t.y; }
  t.x = e.clientX; t.y = e.clientY;
  if (Math.hypot(t.x - t.sx, t.y - t.sy) > INPUT.dragStart) t.moved = true;
  if (t.role === 'stick') { touchStick.x = t.x; touchStick.y = t.y; }
}
function touchUp(e, cancelled = false) {
  const t = touches.get(e.pointerId);
  if (!t) return;
  const looks = [...touches.values()].filter((o) => o.role === 'look');
  if (!cancelled && t.role === 'look' && looks.length === 1 && !t.moved && performance.now() - t.t0 < INPUT.tapMs) click = { x: t.x, y: t.y };
  if (t.role === 'stick') touchStick.active = false;
  touches.delete(e.pointerId);
  gesture = null;
}
function pollTouch() {
  // Stick: offset from where the thumb landed.
  if (touchStick.active) {
    let x = (touchStick.x - touchStick.ox) / INPUT.stickRadius, y = -(touchStick.y - touchStick.oy) / INPUT.stickRadius;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    stickVec = m < INPUT.deadZone * 0.5 ? { x: 0, y: 0, mag: 0 } : { x, y, mag: Math.min(1, m) };
  } else stickVec = { x: 0, y: 0, mag: 0 };
  // Two look fingers: pinch zooms, midpoint swipe rotates.
  const looks = [...touches.values()].filter((o) => o.role === 'look');
  if (looks.length >= 2) {
    const [a, b] = looks, dist = Math.hypot(a.x - b.x, a.y - b.y), mid = (a.x + b.x) / 2;
    if (gesture) { zoomFactor *= gesture.dist / Math.max(1, dist); drag.dx += (mid - gesture.mid) * INPUT.swipeRotate; }
    gesture = { dist, mid };
    a.moved = b.moved = true; // a pinch is never a tap
  }
}

export const input = {
  moveX: 0,
  moveY: 0,
  run: false,
  zoom: 0,
  zoomSteps: 0,
  orbitDX: 0, orbitDY: 0, lookX: 0,
  click: null,
  zoomFactor: 1,
  touchStick,
  pressAction: press,
  releaseAction: release,
  lastDevice: 'keyboard',
  padType: 'xbox',
  held: (a) => held.has(a),
  pressed: (a) => pressed.has(a),
  update() {
    pollGamepad();
    pollTouch();
    const kx = axis('left', 'right'), ky = axis('down', 'up');
    const stick = Math.hypot(padStick.x, padStick.y);
    if (stickVec.mag > 0) { this.moveX = stickVec.x; this.moveY = stickVec.y; } else if (stick > 0) { this.moveX = padStick.x; this.moveY = padStick.y; } else {
      const n = Math.hypot(kx, ky) || 1; // keep diagonals at unit speed
      this.moveX = kx / n; this.moveY = ky / n;
    }
    this.run = held.has('run') || stick > INPUT.runTilt || stickVec.mag > INPUT.stickRun;
    this.zoomFactor = zoomFactor;
    this.zoom = axis('zoomIn', 'zoomOut') + padStick.zoom;
    this.lookX = padStick.lookX;
    this.zoomSteps = wheel;
    this.orbitDX = drag.dx; this.orbitDY = drag.dy;
    this.click = click;
  },
  endFrame() {
    pressed.clear();
    wheel = 0;
    drag.dx = drag.dy = 0;
    click = null;
    zoomFactor = 1;
  },
};
