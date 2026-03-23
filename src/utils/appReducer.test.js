import { describe, it, expect } from 'vitest';
import { reducer, MAX_LOG_ENTRIES } from './appReducer.js';

// pressure=20 → all outcomes (17–22) are < 30, so always flagged
// pressure=50 → all outcomes (47–52) are ≥ 30, so never flagged

const node = (overrides = {}) => ({
  pressure: 50,
  flowDirection: 'normal',
  flagged: false,
  flaggedAt: null,
  ...overrides,
});

const baseState = (nodeOverrides = {}, logEntries = []) => ({
  nodes: { a: node(nodeOverrides) },
  logEntries,
});

describe('reducer – simulate action', () => {
  it('adds a log entry when a node becomes newly flagged', () => {
    const state = baseState({ pressure: 20 });
    const next = reducer(state, { type: 'simulate' });
    expect(next.logEntries).toHaveLength(1);
    expect(next.logEntries[0].id).toBe('a');
    expect(next.logEntries[0]).toHaveProperty('pressure');
    expect(next.logEntries[0]).toHaveProperty('flaggedAt');
  });

  it('does not add a duplicate entry when node stays flagged', () => {
    const existingEntry = { id: 'a', pressure: 20, flaggedAt: Date.now() - 5000 };
    const state = {
      nodes: { a: node({ pressure: 20, flagged: true, flaggedAt: existingEntry.flaggedAt }) },
      logEntries: [existingEntry],
    };
    const next = reducer(state, { type: 'simulate' });
    // node was already flagged → no new entry added
    expect(next.logEntries).toHaveLength(1);
  });

  it('does not add a log entry when pressure stays above threshold', () => {
    const state = baseState({ pressure: 50 });
    const next = reducer(state, { type: 'simulate' });
    expect(next.logEntries).toHaveLength(0);
  });

  it('prepends new entries so the latest appears first', () => {
    const oldEntry = { id: 'old', pressure: 20, flaggedAt: Date.now() - 10_000 };
    const state = {
      nodes: { a: node({ pressure: 20 }) },
      logEntries: [oldEntry],
    };
    const next = reducer(state, { type: 'simulate' });
    expect(next.logEntries[0].id).toBe('a');
    expect(next.logEntries[1]).toBe(oldEntry);
  });

  it('caps log entries at MAX_LOG_ENTRIES', () => {
    const fullLog = Array.from({ length: MAX_LOG_ENTRIES }, (_, i) => ({
      id: `old${i}`,
      pressure: 20,
      flaggedAt: Date.now() - i * 1000,
    }));
    const state = {
      nodes: { a: node({ pressure: 20 }) },
      logEntries: fullLog,
    };
    const next = reducer(state, { type: 'simulate' });
    expect(next.logEntries.length).toBeLessThanOrEqual(MAX_LOG_ENTRIES);
  });

  it('returns the same state reference for unknown actions', () => {
    const state = baseState();
    const next = reducer(state, { type: 'unknown' });
    expect(next).toBe(state);
  });

  it('always produces updated nodes even with no new log entries', () => {
    const state = baseState({ pressure: 50 });
    const next = reducer(state, { type: 'simulate' });
    // nodes object is always a new result from simulateFlow
    expect(next.nodes).not.toBe(state.nodes);
  });
});
