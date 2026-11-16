import { z } from 'zod';

export const API_ERROR_CODES = ['VALIDATION_ERROR', 'NOT_FOUND', 'CONFLICT', 'INTERNAL_ERROR'] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Single error envelope for the whole API (spec 03). */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
