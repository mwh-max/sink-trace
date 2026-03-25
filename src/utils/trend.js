import { COLOR_SAFE, COLOR_CRITICAL } from './colors.js';

// Classifies recent pressure direction based on the last 3 readings.
// Requires at least 3 data points; returns 'stable' otherwise.
// 'falling' when the newest reading is below both prior readings (net decline
//   including partial drops, e.g. [50, 50, 49]).
// 'rising'  when the newest reading is above both prior readings.
// 'stable'  for flat or mixed patterns (e.g. [40, 50, 45]).
export function getTrend(history) {
  if (!history || history.length < 3) return 'stable';
  const [a, b, c] = history.slice(-3);
  if (c < a && c < b) return 'falling';
  if (c > a && c > b) return 'rising';
  return 'stable';
}

export const TREND_LABEL = {
  falling: '▼ Falling',
  rising:  '▲ Rising',
  stable:  '→ Stable',
};

export const TREND_COLOR = {
  falling: COLOR_CRITICAL,
  rising:  COLOR_SAFE,
  stable:  '#7f8c8d',
};
