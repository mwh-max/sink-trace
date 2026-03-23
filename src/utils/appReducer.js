import simulateFlow from './simulateFlow.js';
import { createRng, loadSeed } from './prng.js';

export const MAX_LOG_ENTRIES = 20;
const STORAGE_KEY = 'sinktrace-nodes';

// Module-level RNG: initialised once per session from a stored or random seed.
// Advances its internal state on every call, so consecutive ticks differ.
export const SESSION_SEED = loadSeed();
let _rng = createRng(SESSION_SEED);

// Testing escape hatch — lets tests inject a seeded RNG for determinism.
export function _setRngForTesting(rng) {
  _rng = rng;
}

function runSimulationStep(prevNodes) {
  const updated = simulateFlow(prevNodes, _rng);
  const newEntries = Object.entries(updated)
    .filter(([key, node]) => node.flagged && !prevNodes[key]?.flagged)
    .map(([key, node]) => ({
      id: key,
      pressure: node.pressure,
      flaggedAt: node.flaggedAt,
    }));
  return { updated, newEntries };
}

export function reducer(state, action) {
  if (action.type === 'simulate') {
    const { updated, newEntries } = runSimulationStep(state.nodes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { /* storage quota exceeded or unavailable */ }
    return {
      nodes: updated,
      logEntries:
        newEntries.length > 0
          ? [...newEntries, ...state.logEntries].slice(0, MAX_LOG_ENTRIES)
          : state.logEntries,
    };
  }
  return state;
}
