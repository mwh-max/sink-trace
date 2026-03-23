export const PRESSURE_MIN = 30;
export const PRESSURE_MAX = 120;
export const HISTORY_MAX  = 10;

// rng defaults to Math.random; pass a seeded createRng() for reproducibility.
export default function simulateFlow(nodes, rng = Math.random) {
  const updated = {};

  for (const [key, node] of Object.entries(nodes)) {
    const variation   = Math.floor(rng() * 6 - 3);
    const newPressure = Math.min(Math.max(node.pressure + variation, 0), PRESSURE_MAX);
    const isFlagged   = newPressure < PRESSURE_MIN;
    const history     = node.history ?? [node.pressure];

    updated[key] = {
      ...node,
      pressure:  newPressure,
      flagged:   isFlagged,
      flaggedAt: isFlagged ? (node.flaggedAt ?? Date.now()) : null,
      history:   [...history.slice(-(HISTORY_MAX - 1)), newPressure],
    };
  }

  return updated;
}
