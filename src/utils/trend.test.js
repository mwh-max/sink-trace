import { describe, it, expect } from 'vitest';
import { getTrend } from './trend.js';

describe('getTrend', () => {
  it('returns stable with fewer than 3 readings', () => {
    expect(getTrend([])).toBe('stable');
    expect(getTrend([50])).toBe('stable');
    expect(getTrend([50, 45])).toBe('stable');
    expect(getTrend(null)).toBe('stable');
  });

  it('detects a strictly falling trend from last 3 values', () => {
    expect(getTrend([60, 50, 45, 40])).toBe('falling');
    expect(getTrend([50, 45, 40])).toBe('falling');
  });

  it('detects a strictly rising trend from last 3 values', () => {
    expect(getTrend([40, 45, 50, 55])).toBe('rising');
    expect(getTrend([40, 45, 50])).toBe('rising');
  });

  it('returns stable for a flat or mixed pattern', () => {
    expect(getTrend([50, 50, 50])).toBe('stable');
    expect(getTrend([50, 40, 50])).toBe('stable');
    expect(getTrend([40, 50, 45])).toBe('stable');
  });

  it('uses only the last 3 values regardless of history length', () => {
    // First 4 values fall, but last 3 rise → should be rising
    expect(getTrend([80, 70, 60, 65, 70])).toBe('rising');
  });
});
