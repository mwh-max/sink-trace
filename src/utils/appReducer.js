import simulateFlow from './simulateFlow.js';

export const MAX_LOG_ENTRIES = 20;

function runSimulationStep(prevNodes) {
  const updated = simulateFlow(prevNodes);
  const newEntries = Object.entries(updated)
    .filter(([key, node]) => node.flagged && !prevNodes[key].flagged)
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
