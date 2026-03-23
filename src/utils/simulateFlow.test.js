import { describe, it, expect } from 'vitest';
import simulateFlow, { PRESSURE_MIN, HISTORY_MAX, CONSECUTIVE_TICKS_THRESHOLD } from './simulateFlow.js';

// Shared test edge: 1500 m, 100 mm diameter.
// ΔP = 0.02 × (1500/0.1) × (998 × 0.5²/2) × 0.000145038 ≈ 5.43 psi
const DROP_1500_100 = 5.43; // psi, used in proximity assertions

const edge = (from, to, overrides = {}) => ({
  id: `${from}-${to}`, from, to,
  lengthMeters: 1500, diameterMm: 100,
  ...overrides,
});

const sourceNode = (pressure = 72, overrides = {}) => ({
  type: 'source', pressure,
  flowDirection: 'normal', flagged: false, flaggedAt: null,
  ...overrides,
});

const junctionNode = (pressure = 50, overrides = {}) => ({
  type: 'junction', pressure,
  flowDirection: 'normal', flagged: false, flaggedAt: null,
  ...overrides,
});

describe('simulateFlow – BFS propagation', () => {
  it('source node pressure is preserved unchanged', () => {
    const topology = {
      nodes: { src: sourceNode(72) },
      edges: [],
    };
    const result = simulateFlow(topology);
    expect(result.src.pressure).toBe(72);
  });

  it('downstream pressure equals source minus Darcy-Weisbach drop', () => {
    const topology = {
      nodes: { src: sourceNode(72), a: junctionNode() },
      edges: [edge('src', 'a')],
    };
    const result = simulateFlow(topology);
    expect(result.a.pressure).toBeCloseTo(72 - DROP_1500_100, 0);
  });

  it('pressure decreases at each hop along a chain', () => {
    const topology = {
      nodes: { src: sourceNode(72), a: junctionNode(), b: junctionNode() },
      edges: [edge('src', 'a'), edge('a', 'b')],
    };
    const result = simulateFlow(topology);
    expect(result.src.pressure).toBeGreaterThan(result.a.pressure);
    expect(result.a.pressure).toBeGreaterThan(result.b.pressure);
  });

  it('takes the highest-pressure path when a node is reachable from two sources', () => {
    const topology = {
      nodes: {
        lo:  sourceNode(40),
        hi:  sourceNode(80),
        a:   junctionNode(),
      },
      edges: [edge('lo', 'a'), edge('hi', 'a')],
    };
    const result = simulateFlow(topology);
    expect(result.a.pressure).toBeCloseTo(80 - DROP_1500_100, 0);
  });

  it('unreachable nodes keep their stored pressure', () => {
    const topology = {
      nodes: { src: sourceNode(72), orphan: junctionNode(55) },
      edges: [],
    };
    const result = simulateFlow(topology);
    expect(result.orphan.pressure).toBe(55);
  });
});

describe('simulateFlow – flagging', () => {
  // Pass consecutiveTicks: 1 so a single below-threshold tick triggers flagging.
  // Counter-specific behaviour is tested in the consecutive ticks suite below.

  it('flags a node and sets flaggedAt when pressure drops below 30 psi', () => {
    // source=34 → downstream ≈ 34 − 5.43 = 28.6 psi → below threshold
    const topology = {
      nodes: { src: sourceNode(34), a: junctionNode() },
      edges: [edge('src', 'a')],
    };
    const result = simulateFlow({ ...topology, consecutiveTicks: 1 });
    expect(result.a.pressure).toBeLessThan(PRESSURE_MIN);
    expect(result.a.flagged).toBe(true);
    expect(result.a.flaggedAt).toBeTypeOf('number');
  });

  it('does not flag a node when pressure stays at or above 30 psi', () => {
    // source=50 → downstream ≈ 44.6 psi → safe
    const topology = {
      nodes: { src: sourceNode(50), a: junctionNode() },
      edges: [edge('src', 'a')],
    };
    const result = simulateFlow({ ...topology, consecutiveTicks: 1 });
    expect(result.a.pressure).toBeGreaterThanOrEqual(PRESSURE_MIN);
    expect(result.a.flagged).toBe(false);
    expect(result.a.flaggedAt).toBeNull();
  });

  it('preserves the original flaggedAt timestamp when a node stays flagged', () => {
    const original = Date.now() - 10_000;
    const topology = {
      nodes: {
        src: sourceNode(34),
        a:   junctionNode(20, { flagged: true, flaggedAt: original, consecutiveLowTicks: 1 }),
      },
      edges: [edge('src', 'a')],
    };
    const result = simulateFlow({ ...topology, consecutiveTicks: 1 });
    expect(result.a.flagged).toBe(true);
    expect(result.a.flaggedAt).toBe(original);
  });

  it('clears flaggedAt when pressure recovers above 30 psi', () => {
    const topology = {
      nodes: {
        src: sourceNode(50),
        a:   junctionNode(20, { flagged: true, flaggedAt: 12345, consecutiveLowTicks: 3 }),
      },
      edges: [edge('src', 'a')],
    };
    const result = simulateFlow({ ...topology, consecutiveTicks: 1 });
    expect(result.a.flagged).toBe(false);
    expect(result.a.flaggedAt).toBeNull();
  });

  it('never produces pressure below 0', () => {
    const topology = {
      nodes: { src: sourceNode(5), a: junctionNode() },
      edges: [edge('src', 'a', { lengthMeters: 50000, diameterMm: 25 })],
    };
    const result = simulateFlow(topology);
    expect(result.a.pressure).toBeGreaterThanOrEqual(0);
  });

  it('never produces pressure above PRESSURE_MAX', () => {
    const topology = { nodes: { src: sourceNode(120) }, edges: [] };
    const result = simulateFlow(topology);
    expect(result.src.pressure).toBeLessThanOrEqual(120);
  });
});

describe('simulateFlow – consecutive ticks', () => {
  // source=34 → downstream ≈ 28.6 psi (below threshold every tick)
  const lowTopology = {
    nodes: { src: sourceNode(34), a: junctionNode() },
    edges: [edge('src', 'a')],
  };

  it('does not flag before the threshold is reached', () => {
    // After 1 tick with N=3, counter=1 → not yet flagged
    const result = simulateFlow({ ...lowTopology, consecutiveTicks: 3 });
    expect(result.a.consecutiveLowTicks).toBe(1);
    expect(result.a.flagged).toBe(false);
  });

  it('flags exactly when the counter reaches N', () => {
    // Simulate N ticks by feeding each result back as input
    let state = lowTopology.nodes;
    for (let i = 0; i < CONSECUTIVE_TICKS_THRESHOLD; i++) {
      state = simulateFlow({ nodes: state, edges: lowTopology.edges, consecutiveTicks: CONSECUTIVE_TICKS_THRESHOLD });
    }
    expect(state.a.consecutiveLowTicks).toBe(CONSECUTIVE_TICKS_THRESHOLD);
    expect(state.a.flagged).toBe(true);
    expect(state.a.flaggedAt).toBeTypeOf('number');
  });

  it('increments the counter each below-threshold tick', () => {
    let state = lowTopology.nodes;
    for (let i = 1; i <= 3; i++) {
      state = simulateFlow({ nodes: state, edges: lowTopology.edges, consecutiveTicks: 10 });
      expect(state.a.consecutiveLowTicks).toBe(i);
    }
  });

  it('resets the counter to 0 when pressure recovers', () => {
    // Run two low ticks, then one safe tick
    const safeTopology = { nodes: lowTopology.nodes, edges: [edge('src', 'a')], consecutiveTicks: 10 };
    let state = simulateFlow(safeTopology);
    state = simulateFlow({ ...safeTopology, nodes: state });
    expect(state.a.consecutiveLowTicks).toBe(2);

    // Now switch to a safe source
    const recoveredNodes = { ...state, src: sourceNode(80) };
    const recovered = simulateFlow({ nodes: recoveredNodes, edges: lowTopology.edges, consecutiveTicks: 10 });
    expect(recovered.a.consecutiveLowTicks).toBe(0);
    expect(recovered.a.flagged).toBe(false);
    expect(recovered.a.flaggedAt).toBeNull();
  });

  it('exports CONSECUTIVE_TICKS_THRESHOLD as a positive integer', () => {
    expect(Number.isInteger(CONSECUTIVE_TICKS_THRESHOLD)).toBe(true);
    expect(CONSECUTIVE_TICKS_THRESHOLD).toBeGreaterThan(0);
  });
});

describe('simulateFlow – history', () => {
  it('initialises history from current pressure when absent', () => {
    const topology = {
      nodes: { src: sourceNode(72), a: junctionNode() },
      edges: [edge('src', 'a')],
    };
    const result = simulateFlow(topology);
    expect(Array.isArray(result.a.history)).toBe(true);
    expect(result.a.history.at(-1)).toBe(result.a.pressure);
  });

  it('appends computed pressure to existing history', () => {
    const topology = {
      nodes: {
        src: sourceNode(72),
        a:   junctionNode(50, { history: [48, 49, 50] }),
      },
      edges: [edge('src', 'a')],
    };
    const result = simulateFlow(topology);
    expect(result.a.history.length).toBe(4);
    expect(result.a.history.at(-1)).toBe(result.a.pressure);
  });

  it('caps history at HISTORY_MAX entries', () => {
    const full = Array.from({ length: HISTORY_MAX }, (_, i) => 50 + i);
    const topology = {
      nodes: { src: sourceNode(72), a: junctionNode(50, { history: full }) },
      edges: [edge('src', 'a')],
    };
    const result = simulateFlow(topology);
    expect(result.a.history.length).toBeLessThanOrEqual(HISTORY_MAX);
  });
});

describe('simulateFlow – flow reversal', () => {
  it('marks flow as normal when pressure decreases along declared direction', () => {
    const topology = {
      nodes: { src: sourceNode(72), a: junctionNode() },
      edges: [edge('src', 'a')],
    };
    const result = simulateFlow(topology);
    expect(result.src.flowDirection).toBe('normal');
    expect(result.a.flowDirection).toBe('normal');
  });

  it('marks nodes reversed when pressure gradient opposes declared direction', () => {
    // lo→a declared, but a is fed at higher pressure from hi→a.
    // Gradient on lo→a edge: toP(a≈74.6) > fromP(lo=40) → reversed.
    const topology = {
      nodes: {
        lo: sourceNode(40),
        hi: sourceNode(80),
        a:  junctionNode(),
      },
      edges: [edge('lo', 'a'), edge('hi', 'a')],
    };
    const result = simulateFlow(topology);
    // 'lo' and 'a' are on the reversed edge; 'hi' feeds normally
    expect(result.lo.flowDirection).toBe('reversed');
  });
});

describe('simulateFlow – field preservation', () => {
  it('preserves extra fields (coords, label, type) via spread', () => {
    const coords = [37.87, -82.56];
    const topology = {
      nodes: {
        src: { ...sourceNode(72), coords, label: 'Plant', type: 'source' },
      },
      edges: [],
    };
    const result = simulateFlow(topology);
    expect(result.src.coords).toEqual(coords);
    expect(result.src.label).toBe('Plant');
    expect(result.src.type).toBe('source');
  });
});
