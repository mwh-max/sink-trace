console.log("✅ simulateFlow module is loading");

const PRESSURE_MIN = 30;

export default function simulateFlow(nodes) {
  const updated = {};

  for (const [key, node] of Object.entries(nodes)) {
    const variation = Math.floor(Math.random() * 6 - 3);
    const newPressure = node.pressure + variation;
    const isFlagged = newPressure < PRESSURE_MIN;

    updated[key] = {
      ...node,
      pressure: newPressure,
      flagged: isFlagged,
      flaggedAt: isFlagged ? Date.now() : null
    };
  }

  return updated;
}