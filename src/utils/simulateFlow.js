export const PRESSURE_MIN = 30;
export const PRESSURE_MAX = 120;
export const HISTORY_MAX  = 10;
// Number of consecutive below-threshold ticks required before a node is flagged.
// Prevents false positives from transient pressure dips.
export const CONSECUTIVE_TICKS_THRESHOLD = 3;

// Darcy-Weisbach constants — fixed for a single-velocity simplified model.
// Adjust FLOW_VELOCITY or FRICTION_FACTOR to re-calibrate drop magnitudes.
const WATER_DENSITY   = 998;         // kg/m³ at ~20 °C
const FLOW_VELOCITY   = 0.5;         // m/s, assumed uniform across all pipes
const FRICTION_FACTOR = 0.02;        // Darcy friction factor, typical turbulent flow
const PA_TO_PSI       = 0.000145038; // conversion factor

function darcyWeisbachDrop(edge) {
  const L = edge.lengthMeters;
  const D = edge.diameterMm / 1000; // mm → m
  return FRICTION_FACTOR * (L / D) * (WATER_DENSITY * FLOW_VELOCITY ** 2 / 2) * PA_TO_PSI;
}

// Takes a topology { nodes, edges, consecutiveTicks } and returns an updated nodes map.
// Pressure at each node is computed by BFS propagation from source nodes.
// When multiple paths reach a node, the highest pressure wins (most favourable feed).
// A node is only flagged after its pressure has been below PRESSURE_MIN for
// consecutiveTicks ticks in a row; the counter resets on any tick above the threshold.
export default function simulateFlow({ nodes, edges, consecutiveTicks = CONSECUTIVE_TICKS_THRESHOLD }) {
  // Build outgoing-edge map so BFS can walk the graph efficiently.
  const outEdges = Object.fromEntries(Object.keys(nodes).map(k => [k, []]));
  for (const edge of edges) {
    if (outEdges[edge.from]) outEdges[edge.from].push(edge);
  }

  // BFS from every source node; propagate pressure downstream.
  const computedPressure = {};
  const queue = [];
  for (const [id, node] of Object.entries(nodes)) {
    if (node.type === 'source') {
      computedPressure[id] = node.pressure;
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const fromId = queue.shift();
    const upstream = computedPressure[fromId];
    for (const edge of outEdges[fromId]) {
      const downstream = Math.max(upstream - darcyWeisbachDrop(edge), 0);
      // Accept this path only if it gives better pressure than any prior path.
      if (computedPressure[edge.to] === undefined || downstream > computedPressure[edge.to]) {
        computedPressure[edge.to] = downstream;
        queue.push(edge.to);
      }
    }
  }

  // Detect reversed flow: edges where the computed pressure gradient opposes
  // the declared from→to direction.
  const reversedNodes = new Set();
  for (const edge of edges) {
    const fromP = computedPressure[edge.from] ?? 0;
    const toP   = computedPressure[edge.to]   ?? 0;
    if (toP > fromP) {
      reversedNodes.add(edge.from);
      reversedNodes.add(edge.to);
    }
  }

  // Build the updated node map.
  const updated = {};
  const now = Date.now();
  for (const [id, node] of Object.entries(nodes)) {
    // Nodes unreachable from any source keep their stored pressure.
    const raw      = computedPressure[id] ?? node.pressure;
    const pressure = Math.min(Math.max(Math.round(raw * 10) / 10, 0), PRESSURE_MAX);

    const isPressureLow       = pressure < PRESSURE_MIN;
    const prevCounter         = node.consecutiveLowTicks ?? 0;
    const consecutiveLowTicks = isPressureLow ? prevCounter + 1 : 0;
    const isFlagged           = consecutiveLowTicks >= consecutiveTicks;

    const history = node.history ?? [node.pressure];

    updated[id] = {
      ...node,
      pressure,
      flowDirection:      reversedNodes.has(id) ? 'reversed' : 'normal',
      consecutiveLowTicks,
      flagged:   isFlagged,
      flaggedAt: isFlagged ? (node.flaggedAt ?? now) : null,
      history:   [...history.slice(-(HISTORY_MAX - 1)), pressure],
    };
  }

  return updated;
}
