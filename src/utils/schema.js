import { z } from 'zod';

export const NodeSchema = z.object({
  pressure:      z.number().min(0).max(120),
  flowDirection: z.enum(['normal', 'reversed']),
  coords:        z.tuple([z.number(), z.number()]),
  // Runtime-only fields added by simulateFlow — optional on load
  history:   z.array(z.number()).optional(),
  flagged:   z.boolean().optional().default(false),
  flaggedAt: z.number().nullable().optional().default(null),
});

export const NodesSchema = z.record(z.string(), NodeSchema);

// Validates raw node data and throws a ZodError with a clear message on failure.
// Falls back to stripping unknown keys so hand-edited JSON stays compatible.
export function validateNodes(raw) {
  return NodesSchema.parse(raw);
}
