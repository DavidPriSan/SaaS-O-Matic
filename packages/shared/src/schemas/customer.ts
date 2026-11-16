import { z } from 'zod';
import { COUNTRY_CODES } from '../catalog/countries';
import { FISCAL_ID_TYPES } from '../fiscal-id/types';
import { validateFiscalId } from '../fiscal-id/validateFiscalId';
import { PLAN_IDS } from '../pricing/plans';

/** POST /customers body (spec 03). Output has the normalized taxId and its detected type. */
export const createCustomerSchema = z
  .object({
    companyName: z.string().trim().min(2).max(120),
    taxId: z.string().max(32),
    email: z.string().trim().toLowerCase().email().max(254),
    countryCode: z.enum(COUNTRY_CODES),
    plan: z.enum(PLAN_IDS),
  })
  .strict()
  .transform((data, ctx) => {
    const fiscalId = validateFiscalId(data.taxId, data.countryCode);
    if (!fiscalId.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['taxId'], message: fiscalId.reason });
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

/** GET /customers query string. */
export const searchCustomersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchCustomersQuery = z.infer<typeof searchCustomersQuerySchema>;
