import simulateFlow, { CONSECUTIVE_TICKS_THRESHOLD } from './simulateFlow.js';
import pipeEdges from '../data/pipeEdges.json';
import { NODES_KEY } from './storageKeys.js';

export const MAX_LOG_ENTRIES = 20;
export const SIMULATE = 'simulate';

// Testing escape hatch — lets tests inject a minimal edge set for isolation.
let _edges = pipeEdges;
export function _setEdgesForTesting(edges) {
  _edges = edges;
}

function runSimulationStep(prevNodes, consecutiveTicks) {
  const updated = simulateFlow({ nodes: prevNodes, edges: _edges, consecutiveTicks });
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
    const { updated, newEntries } = runSimulationStep(
      state.nodes,
      action.consecutiveTicks ?? CONSECUTIVE_TICKS_THRESHOLD
    );
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
