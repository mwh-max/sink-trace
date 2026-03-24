// Domain constants shared across the simulation and validation layers.
// Both simulateFlow.js and schema.js import from here so neither depends
// on the other.
export const PRESSURE_MIN            = 30;
export const PRESSURE_MAX            = 120;
export const HISTORY_MAX             = 10;
export const CONSECUTIVE_TICKS_THRESHOLD = 3;
