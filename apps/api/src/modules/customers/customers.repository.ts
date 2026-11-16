import { customerSchema, normalizeFiscalId, type Customer, type NewCustomer } from '@saas/shared';
import type { Db } from '../../db/connection';
import { normalizeSearchText } from '../../db/search';
import { ConflictError } from '../../errors';

interface CustomerRow {
  id: number;
  company_name: string;
  tax_id: string;
  tax_id_type: string;
  email: string;
  country_code: string;
  plan: string;
  created_at: string;
}

interface SearchParams {
  q?: string | undefined;
  limit: number;
}

/** Rows are parsed with the shared schema: no unchecked casts from DB strings to domain unions. */
function toCustomer(row: CustomerRow): Customer {
  return customerSchema.parse({
    id: row.id,
    companyName: row.company_name,
    taxId: row.tax_id,
    taxIdType: row.tax_id_type,
    email: row.email,
    countryCode: row.country_code,
    plan: row.plan,
    createdAt: row.created_at,
  });
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'SQLITE_CONSTRAINT_UNIQUE';
}

export function createCustomersRepository(db: Db) {
  const insertStmt = db.prepare<NewCustomer, CustomerRow>(`
    INSERT INTO customers (company_name, tax_id, tax_id_type, email, country_code, plan)
    VALUES (@companyName, @taxId, @taxIdType, @email, @countryCode, @plan)
    RETURNING *`);

  const findByIdStmt = db.prepare<[number], CustomerRow>('SELECT * FROM customers WHERE id = ?');

  // Name: case/accent-insensitive "contains". Tax ID: prefix on the normalized value. Always parameterized.
  const searchStmt = db.prepare<{ namePattern: string | null; taxIdPattern: string | null; limit: number }, CustomerRow>(`
    SELECT * FROM customers
    WHERE @namePattern IS NULL
       OR search_normalize(company_name) LIKE @namePattern ESCAPE '\\'
       OR tax_id LIKE @taxIdPattern ESCAPE '\\'
    ORDER BY created_at DESC, id DESC
    LIMIT @limit`);

  return {
    insert(customer: NewCustomer): Customer {
      try {
        const row = insertStmt.get(customer);
        if (!row) throw new Error('INSERT … RETURNING produced no row');
        return toCustomer(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictError('A customer with this tax ID already exists in this country', [
            { path: 'taxId', message: 'DUPLICATE' },
          ]);
        }
        throw error;
      }
    },

    findById(id: number): Customer | undefined {
      const row = findByIdStmt.get(id);
      return row ? toCustomer(row) : undefined;
    },

    search({ q, limit }: SearchParams): Customer[] {
      const term = q?.trim() ?? '';
      const normalizedTaxId = normalizeFiscalId(term);
      return searchStmt
        .all({
          namePattern: term === '' ? null : `%${escapeLike(normalizeSearchText(term))}%`,
          taxIdPattern: normalizedTaxId === '' ? null : `${escapeLike(normalizedTaxId)}%`,
          limit,
        })
        .map(toCustomer);
    },
  };
}

export type CustomersRepository = ReturnType<typeof createCustomersRepository>;
