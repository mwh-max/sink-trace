import { describe, it, expect, beforeEach } from 'vitest';
import { appendHistory, getHistory, clearHistory } from './historyStore.js';

// Vitest runs in jsdom which provides localStorage.
beforeEach(() => localStorage.clear());

// ---------------------------------------------------------------------------
// appendHistory
// ---------------------------------------------------------------------------
describe('appendHistory', () => {
  it('stores the first reading for a node', () => {
    appendHistory('a', 55, 1000);
    expect(getHistory('a')).toEqual([{ pressure: 55, timestamp: 1000 }]);
  });

  it('accumulates multiple readings in insertion order', () => {
    appendHistory('a', 55, 1000);
    appendHistory('a', 52, 2000);
    appendHistory('a', 48, 3000);
    expect(getHistory('a')).toEqual([
      { pressure: 55, timestamp: 1000 },
      { pressure: 52, timestamp: 2000 },
      { pressure: 48, timestamp: 3000 },
    ]);
  });

  it('does not mix readings across different node IDs', () => {
    appendHistory('a', 55, 1000);
    appendHistory('b', 40, 2000);
    expect(getHistory('a')).toHaveLength(1);
    expect(getHistory('b')).toHaveLength(1);
    expect(getHistory('a')[0].pressure).toBe(55);
    expect(getHistory('b')[0].pressure).toBe(40);
  });

  it('caps stored entries at 100 by dropping the oldest', () => {
    for (let i = 0; i < 105; i++) {
      appendHistory('a', i, i);
    }
    const history = getHistory('a');
    expect(history).toHaveLength(100);
    // Oldest 5 (pressures 0-4) should be gone; newest entry should be 104.
    expect(history[0].pressure).toBe(5);
    expect(history.at(-1).pressure).toBe(104);
  });

  it('defaults timestamp to approximately Date.now()', () => {
    const before = Date.now();
    appendHistory('a', 60);
    const after = Date.now();
    const [entry] = getHistory('a');
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.timestamp).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// getHistory
// ---------------------------------------------------------------------------
describe('getHistory', () => {
  it('returns an empty array when no readings have been stored', () => {
    expect(getHistory('missing')).toEqual([]);
  });

  it('returns all readings when limit is omitted', () => {
    appendHistory('a', 55, 1000);
    appendHistory('a', 52, 2000);
    expect(getHistory('a')).toHaveLength(2);
  });

  it('returns the last N readings when limit is given', () => {
    for (let i = 0; i < 10; i++) appendHistory('a', 50 + i, i * 1000);
    const last3 = getHistory('a', 3);
    expect(last3).toHaveLength(3);
    expect(last3.map(e => e.pressure)).toEqual([57, 58, 59]);
  });

  it('returns all readings when limit exceeds the stored count', () => {
    appendHistory('a', 55, 1000);
    appendHistory('a', 52, 2000);
    const result = getHistory('a', 50);
    expect(result).toHaveLength(2);
  });

  it('returns readings in oldest-first order', () => {
    appendHistory('a', 55, 1000);
    appendHistory('a', 52, 2000);
    const [first, second] = getHistory('a');
    expect(first.timestamp).toBeLessThan(second.timestamp);
  });
});

// ---------------------------------------------------------------------------
// clearHistory
// ---------------------------------------------------------------------------
describe('clearHistory', () => {
  it('removes all readings for the given node', () => {
    appendHistory('a', 55, 1000);
    clearHistory('a');
    expect(getHistory('a')).toEqual([]);
  });

  it('does not affect readings for other nodes', () => {
    appendHistory('a', 55, 1000);
    appendHistory('b', 40, 2000);
    clearHistory('a');
    expect(getHistory('b')).toHaveLength(1);
  });

  it('is a no-op when called on a node with no stored readings', () => {
    expect(() => clearHistory('nonexistent')).not.toThrow();
    expect(getHistory('nonexistent')).toEqual([]);
  });
});
