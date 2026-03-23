import { z } from 'zod';
import { PRESSURE_MAX } from './simulateFlow.js';

export const NodeSchema = z.object({
  pressure:      z.number().min(0).max(PRESSURE_MAX),
  flowDirection: z.enum(['normal', 'reversed']),
  coords:        z.tuple([z.number(), z.number()]),
  // Runtime-only fields added by simulateFlow — optional on load
  history:   z.array(z.number()).optional(),
  flagged:   z.boolean().optional().default(false),
  flaggedAt: z.number().nullable().optional().default(null),
});

export const NodesSchema = z.record(z.string(), NodeSchema);

// Validates raw node data; throws a ZodError with a descriptive message on failure.
export function validateNodes(raw) {
  return NodesSchema.parse(raw);
}
