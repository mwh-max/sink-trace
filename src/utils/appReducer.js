import simulateFlow from './simulateFlow.js';
import { createRng, SESSION_SEED } from './prng.js';
import { NODES_KEY } from './storageKeys.js';

export const MAX_LOG_ENTRIES = 20;
export const SIMULATE = 'simulate';

// Module-level RNG: initialised once per session from a stored or random seed.
// Advances its internal state on every call, so consecutive ticks differ.
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

// Only write to storage when node data actually changed, avoiding a 1.5 KB
// JSON serialization + write on every tick when nothing has changed.
let _lastSerialized = null;

export function reducer(state, action) {
  if (action.type === SIMULATE) {
    const { updated, newEntries } = runSimulationStep(state.nodes);
    const serialized = JSON.stringify(updated);
    if (serialized !== _lastSerialized) {
      try {
        localStorage.setItem(NODES_KEY, serialized);
        _lastSerialized = serialized;
      } catch { /* storage quota exceeded or unavailable */ }
    }
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
