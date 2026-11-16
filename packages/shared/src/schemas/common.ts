import { z } from 'zod';

/**
 * Canonical decimal ids only. `z.coerce.number()` would also accept "0x1", "1e0", " 1" or "01" and map
 * several URLs to the same resource. Up to 15 digits keeps every value a safe integer.
 */
export const idSchema = z
  .string()
  .regex(/^[1-9]\d{0,14}$/)
  .transform(Number);

export const idParamSchema = z.object({ id: idSchema });

export type IdParam = z.infer<typeof idParamSchema>;
