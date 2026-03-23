import { describe, it, expect } from 'vitest';
import simulateFlow from './simulateFlow.js';

// variation is Math.floor(Math.random() * 6 - 3) → one of: -3,-2,-1,0,1,2
// Deterministic boundary pressures:
//   always flagged  : pressure ≤ 27  (max outcome: 27+2=29 < 30)
//   never flagged   : pressure ≥ 33  (min outcome: 33-3=30, not < 30)
//   always clamped  : pressure = 0   (never goes negative)
//                     pressure = 120  (never exceeds 120)

const node = (overrides = {}) => ({
  pressure: 50,
  flowDirection: 'normal',
  flagged: false,
  flaggedAt: null,
  ...overrides,
});

describe('simulateFlow', () => {
  it('never produces pressure below 0', () => {
    let state = { a: node({ pressure: 0 }) };
    for (let i = 0; i < 200; i++) {
      state = simulateFlow(state);
      expect(state.a.pressure).toBeGreaterThanOrEqual(0);
    }
  });

  it('never produces pressure above 120', () => {
    let state = { a: node({ pressure: 120 }) };
    for (let i = 0; i < 200; i++) {
      state = simulateFlow(state);
      expect(state.a.pressure).toBeLessThanOrEqual(120);
    }
  });

  it('flags node and sets flaggedAt when pressure is always below 30', () => {
    const result = simulateFlow({ a: node({ pressure: 27 }) });
    expect(result.a.flagged).toBe(true);
    expect(result.a.flaggedAt).toBeTypeOf('number');
  });

  it('does not flag node when pressure never drops below 30', () => {
    const result = simulateFlow({ a: node({ pressure: 33 }) });
    expect(result.a.flagged).toBe(false);
    expect(result.a.flaggedAt).toBeNull();
  });

  it('preserves original flaggedAt when node stays flagged across ticks', () => {
    const original = Date.now() - 10_000;
    const result = simulateFlow({
      a: node({ pressure: 20, flagged: true, flaggedAt: original }),
    });
    expect(result.a.flagged).toBe(true);
    expect(result.a.flaggedAt).toBe(original);
  });

  it('clears flaggedAt when pressure recovers above 30', () => {
    const result = simulateFlow({
      a: node({ pressure: 35, flagged: true, flaggedAt: 12345 }),
    });
    expect(result.a.flagged).toBe(false);
    expect(result.a.flaggedAt).toBeNull();
  });

  it('preserves unrelated fields through the update', () => {
    const coords = [38.04, -84.5];
    const result = simulateFlow({
      a: node({ pressure: 50, flowDirection: 'reversed', coords }),
    });
    expect(result.a.flowDirection).toBe('reversed');
    expect(result.a.coords).toEqual(coords);
  });

  it('processes multiple nodes independently', () => {
    const state = {
      low:  node({ pressure: 20 }),
      high: node({ pressure: 50 }),
    };
    const result = simulateFlow(state);
    expect(result.low.flagged).toBe(true);
    expect(result.high.flagged).toBe(false);
  });
});
