import { z } from 'zod';
import { pageQuerySchema, pageResponseSchema } from './pagination';
import { COUNTRY_CODES } from '../catalog/countries';
import { FISCAL_ID_TYPES } from '../fiscal-id/types';
import { validateFiscalId } from '../fiscal-id/validateFiscalId';
import { PLAN_IDS } from '../pricing/plans';

/** POST /customers body (spec 03). Output has the normalized taxId and its detected type. */
export const createCustomerSchema = z
  .strictObject({
    // No control characters: SQLite length() stops at NUL, so they would bypass min/max and hit the DB CHECK.
    companyName: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .regex(/^\P{Cc}*$/u),
    taxId: z.string().max(32),
    // Normalize first, then validate the format (in Zod 4 a format check runs before chained trims).
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    countryCode: z.enum(COUNTRY_CODES),
    plan: z.enum(PLAN_IDS),
  })
  .transform((data, ctx) => {
    const fiscalId = validateFiscalId(data.taxId, data.countryCode);
    if (!fiscalId.valid) {
      ctx.addIssue({ code: 'custom', path: ['taxId'], message: fiscalId.reason });
      return z.NEVER;
    }
    return { ...data, taxId: fiscalId.normalized, taxIdType: fiscalId.type };
  });

export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type NewCustomer = z.output<typeof createCustomerSchema>;

export const customerSchema = z.object({
  id: z.number().int().positive(),
  companyName: z.string(),
  taxId: z.string(),
  taxIdType: z.enum(FISCAL_ID_TYPES),
  email: z.string(),
  countryCode: z.enum(COUNTRY_CODES),
  plan: z.enum(PLAN_IDS),
  createdAt: z.string(),
});

export type Customer = z.infer<typeof customerSchema>;

export const customerListResponseSchema = pageResponseSchema(customerSchema);

export const SEARCH_QUERY_MAX_LENGTH = 100;

/** GET /customers query string. */
export const searchCustomersQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
});

export type SearchCustomersQuery = z.infer<typeof searchCustomersQuerySchema>;
