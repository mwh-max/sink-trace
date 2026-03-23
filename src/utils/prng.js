// Mulberry32 — fast, seedable pseudo-random number generator.
// Returns a function that behaves like Math.random() but is deterministic
// given the same seed, enabling reproducible simulation replays.
export function createRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function loadSeed() {
  try {
    const stored = localStorage.getItem('sinktrace-seed');
    return stored ? parseInt(stored, 10) : Date.now();
  } catch {
    return Date.now();
  }
}
