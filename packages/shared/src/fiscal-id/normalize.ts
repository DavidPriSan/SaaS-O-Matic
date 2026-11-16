/** Canonical form used for validation, persistence and search (spec 02 §1). */
export function normalizeFiscalId(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, '');
}
