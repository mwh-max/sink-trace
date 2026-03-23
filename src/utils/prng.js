import { SEED_KEY } from './storageKeys.js';

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
    const stored = localStorage.getItem(SEED_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  } catch {
    return Date.now();
  }
}

// Initialised once per session; import this wherever the seed value is needed.
export const SESSION_SEED = loadSeed();
