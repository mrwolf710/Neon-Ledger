import { frame } from './hud.js';

// A one-off help window. open() pauses the game (main treats isOpen as modal); Space / Enter / Esc / click / tap closes it.
export const TUTORIALS = {
  board: {
    title: 'Using your clues',
    lines: [
      'You have gathered enough clues to start connecting them. Every fact you find is saved in your Case File (Tab).',
      'Open the Investigation Board (B, or the BRD icon) to see your facts as cards.',
      'Link two cards: drag one onto another, or select two with Space (arrow keys / D-pad move the cursor, tap works on touch).',
      'When two or three clues really fit together, the string locks and Juno draws a conclusion, which becomes a new cyan card. A wrong link costs nothing, and every few misses Juno hints at a clue she still needs.',
      'Conclusions point to who to question next. You can also present a clue to someone in conversation (Present evidence).',
    ],
  },
};

TUTORIALS.camera = {
  title: 'Look around',
  lines: [
    'Buildings can hide people and clues. Spin the camera to see around them.',
    'Q / E rotate the view, or click and drag the mouse. On touch, drag on the right half of the screen or swipe with two fingers. Z / X zoom, R / V tilt, and C resets the view.',
  ],
};

TUTORIALS.echo = {
  title: 'Reading an echo',
  lines: [
    'An echo is a memory left in a place. You are watching it play back, and the world is paused around it.',
    'Play and pause with Space. Scrub back and forth with A / D or the stick, step with the D-pad, or drag the bar at the bottom.',
    'Watch for a moment that matters. While the playhead is inside a highlighted window, press Space to tag it and it is added to your Case File as a clue.',
    'A red tick on the bar marks a seam, a spot where the memory does not quite fit. Cross it and you will see the picture stutter.',
    'Press F, Backspace or Esc to leave the echo. You can come back to it any time.',
  ],
};

export function createTutorial(input) {
  const root = document.createElement('div');
  root.className = 'tutorial';
  const box = frame(document.createElement('div'));
  box.className += ' tut-box';
  root.append(box);
  document.body.appendChild(root);
  let open = false, openedAt = 0;
  const api = {
    get isOpen() { return open; },
    open(id) {
      const t = TUTORIALS[id];
      box.replaceChildren(Object.assign(document.createElement('h2'), { textContent: t.title }),
        ...t.lines.map((l) => Object.assign(document.createElement('p'), { textContent: l })),
        Object.assign(document.createElement('div'), { className: 'tut-hint', textContent: 'Press Space or click to continue' }));
      root.classList.add('on'); open = true; openedAt = performance.now();
    },
    close() { root.classList.remove('on'); open = false; },
    update() { if (open && performance.now() - openedAt > 400 && (input.pressed('interact') || input.pressed('back') || input.pressed('pause') || input.click)) api.close(); },
  };
  root.addEventListener('pointerdown', () => { if (open && performance.now() - openedAt > 400) api.close(); });
  return api;
}
