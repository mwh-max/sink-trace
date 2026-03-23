const PRESSURE_MIN = 30;
const PRESSURE_MAX = 120;

export default function simulateFlow(nodes) {
  const updated = {};

  for (const [key, node] of Object.entries(nodes)) {
    const variation = Math.floor(Math.random() * 6 - 3);
    const newPressure = Math.min(Math.max(node.pressure + variation, 0), PRESSURE_MAX);
    const isFlagged = newPressure < PRESSURE_MIN;

    updated[key] = {
      ...node,
      pressure: newPressure,
      flagged: isFlagged,
      flaggedAt: isFlagged ? (node.flaggedAt ?? Date.now()) : null,
    };
  }

  return updated;
}
