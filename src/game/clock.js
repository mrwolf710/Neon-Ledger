export const CLOCK = {
  start: 24 * 60 + 35,       // game minutes since midnight at first load (beat 1: 00:35)
  speed: 1,                  // game minutes per real second
  slider: [22 * 60, 29 * 60], // the night bar runs from 22:00 to 05:00 (minutes; > 1440 is after midnight)
  // Phase boundaries in minutes (after midnight counts on from 1440).
  phases: [
    { id: 'lateEvening', from: 0, label: 'Late Evening' },
    { id: 'night', from: 23 * 60, label: 'Night' },
    { id: 'deadHour', from: 25 * 60 + 30, label: 'Dead Hour' },
  ],
};

// Game clock: 1 real second = CLOCK.speed game minutes. Pausable; setTime(h, m) jumps.
export function createClock() {
  let minutes = CLOCK.start;
  const api = {
    paused: false,
    get minutes() { return minutes; },
    add(min) { minutes += min; },
    setTime(h, m = 0) { minutes = (h < 12 ? h + 24 : h) * 60 + m; }, // hours before noon are after midnight
    update(dt) { if (!api.paused) minutes += dt * CLOCK.speed; },
    get text() {
      const t = Math.floor(minutes) % 1440;
      return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    },
    get phase() { return [...CLOCK.phases].reverse().find((p) => minutes >= p.from) ?? CLOCK.phases[0]; },
    get progress() { const [a, b] = CLOCK.slider; return Math.min(1, Math.max(0, (minutes - a) / (b - a))); },
  };
  return api;
}
