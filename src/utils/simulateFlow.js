import { PRESSURE_MIN, PRESSURE_MAX, HISTORY_MAX, CONSECUTIVE_TICKS_THRESHOLD } from './constants.js';

// Re-export so existing consumers (tests, App.jsx) can keep their imports.
export { PRESSURE_MIN, PRESSURE_MAX, HISTORY_MAX, CONSECUTIVE_TICKS_THRESHOLD };

// Darcy-Weisbach constants — fixed for a single-velocity simplified model.
// Adjust FLOW_VELOCITY or FRICTION_FACTOR to re-calibrate drop magnitudes.
const WATER_DENSITY   = 998;         // kg/m³ at ~20 °C
const FLOW_VELOCITY   = 0.5;         // m/s, assumed uniform across all pipes
const FRICTION_FACTOR = 0.02;        // Darcy friction factor baseline (C = 100)
const PA_TO_PSI       = 0.000145038; // conversion factor
// Reference Hazen-Williams C used to derive per-edge friction factors.
// Edges with a higher resistanceCoeff (smoother/newer pipe) get a
// proportionally lower friction factor; absent resistanceCoeff defaults to
// REFERENCE_C so the formula reduces to the bare FRICTION_FACTOR.
const REFERENCE_C     = 100;

// Returns the Darcy-Weisbach pressure drop across an edge, in psi.
// Uses the edge's resistanceCoeff (Hazen-Williams C) to scale the friction
// factor: f = FRICTION_FACTOR × (REFERENCE_C / C). Higher C → less friction.
function darcyWeisbachDrop(edge) {
  const L = edge.lengthMeters;
  const D = edge.diameterMm / 1000; // mm → m
  const f = FRICTION_FACTOR * (REFERENCE_C / (edge.resistanceCoeff ?? REFERENCE_C));
  return f * (L / D) * (WATER_DENSITY * FLOW_VELOCITY ** 2 / 2) * PA_TO_PSI;
}

// Takes a topology { nodes, edges, consecutiveTicks } and returns an updated nodes map.
// Pressure at each node is computed by BFS propagation from source nodes.
// When multiple paths reach a node, the highest pressure wins (most favourable feed).
// Pump/booster nodes carry a boostPressure field that is added to their outgoing
// effective pressure; the boost is also reflected in their displayed pressure.
// A node is only flagged after its pressure has been below threshold for
// consecutiveTicks ticks in a row; the counter resets on any tick above threshold.
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

  // Cap iterations to prevent infinite loops in cyclic topologies (ring mains).
  const iterationCap = (Object.keys(nodes).length + 1) * (edges.length + 1);
  let iterations = 0;

  while (queue.length > 0 && iterations++ < iterationCap) {
    const fromId = queue.shift();
    // Apply pump/booster boost when propagating outwards from this node.
    const boost      = nodes[fromId]?.boostPressure ?? 0;
    const upstream   = Math.min(computedPressure[fromId] + boost, PRESSURE_MAX);
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
    // Pump/booster nodes: add boost to displayed pressure as well.
    const boost    = node.boostPressure ?? 0;
    const pressure = Math.min(Math.max(Math.round((raw + boost) * 10) / 10, 0), PRESSURE_MAX);

    const threshold           = node.pressureMin ?? PRESSURE_MIN;
    const isPressureLow       = pressure < threshold;
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
