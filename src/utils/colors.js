export const COLOR_SAFE = "#27ae60";
export const COLOR_WARNING = "#f39c12";
export const COLOR_CRITICAL = "#c0392b";

export function getPressureColor(psi) {
  if (psi >= 30) return COLOR_SAFE;
  if (psi >= 25) return COLOR_WARNING;
  return COLOR_CRITICAL;
}
