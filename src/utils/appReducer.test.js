import { beforeEach, describe, it, expect } from 'vitest';
import { reducer, MAX_LOG_ENTRIES, SIMULATE, _setEdgesForTesting } from './appReducer.js';

// Standard test edge: 1500 m, 100 mm → ΔP ≈ 5.43 psi.
// source=34 psi → downstream ≈ 28.6 psi (flagged, < 30).
// source=50 psi → downstream ≈ 44.6 psi (safe).
const TEST_EDGE = { id: 'e1', from: 'src', to: 'a', lengthMeters: 1500, diameterMm: 100 };

const sourceNode = (pressure = 34, overrides = {}) => ({
  type: 'source', pressure,
  flowDirection: 'normal', flagged: false, flaggedAt: null, history: [pressure],
  ...overrides,
});

const node = (overrides = {}) => ({
  pressure: 50,
  flowDirection: 'normal',
  flagged: false,
  flaggedAt: null,
  history: [50],
  ...overrides,
});

// Minimal topology: one source (src) connected to one test node (a).
const baseState = (srcPressure = 34, aOverrides = {}, logEntries = []) => ({
  nodes: { src: sourceNode(srcPressure), a: node(aOverrides) },
  logEntries,
});

beforeEach(() => {
  _setEdgesForTesting([TEST_EDGE]);
});

describe('reducer – simulate action', () => {
  it('adds a log entry when a node becomes newly flagged', () => {
    // src=34 → a ≈ 28.6 psi → flagged
    const state = baseState(34);
    const next = reducer(state, { type: SIMULATE });
    expect(next.logEntries).toHaveLength(1);
    expect(next.logEntries[0].id).toBe('a');
    expect(next.logEntries[0]).toHaveProperty('pressure');
    expect(next.logEntries[0]).toHaveProperty('flaggedAt');
  });

  it('does not add a duplicate entry when node stays flagged', () => {
    const ts = Date.now() - 5000;
    const state = {
      nodes: {
        src: sourceNode(34),
        a:   node({ flagged: true, flaggedAt: ts }),
      },
      logEntries: [{ id: 'a', pressure: 28, flaggedAt: ts }],
    };
    const next = reducer(state, { type: SIMULATE });
    expect(next.logEntries).toHaveLength(1);
  });

  it('does not add a log entry when pressure stays safe', () => {
    // src=50 → a ≈ 44.6 psi → safe
    const state = baseState(50);
    const next = reducer(state, { type: SIMULATE });
    expect(next.logEntries).toHaveLength(0);
  });

  it('prepends new entries so the latest appears first', () => {
    const oldEntry = { id: 'old', pressure: 20, flaggedAt: Date.now() - 10_000 };
    const state = { nodes: { src: sourceNode(34), a: node() }, logEntries: [oldEntry] };
    const next = reducer(state, { type: SIMULATE });
    expect(next.logEntries[0].id).toBe('a');
    expect(next.logEntries[1]).toBe(oldEntry);
  });

  it('caps log entries at MAX_LOG_ENTRIES', () => {
    const fullLog = Array.from({ length: MAX_LOG_ENTRIES }, (_, i) => ({
      id: `old${i}`, pressure: 20, flaggedAt: Date.now() - i * 1000,
    }));
    const state = { nodes: { src: sourceNode(34), a: node() }, logEntries: fullLog };
    const next = reducer(state, { type: SIMULATE });
    expect(next.logEntries.length).toBeLessThanOrEqual(MAX_LOG_ENTRIES);
  });

  it('returns the same state reference for unknown actions', () => {
    const state = baseState();
    expect(reducer(state, { type: 'unknown' })).toBe(state);
  });

  it('always produces updated nodes', () => {
    const state = baseState(50);
    const next = reducer(state, { type: SIMULATE });
    expect(next.nodes).not.toBe(state.nodes);
  });

  it('advances history on each tick', () => {
    const state = baseState(50, { history: [50] });
    const next = reducer(state, { type: SIMULATE });
    expect(next.nodes.a.history.length).toBeGreaterThan(1);
    expect(next.nodes.a.history.at(-1)).toBe(next.nodes.a.pressure);
  });
});
