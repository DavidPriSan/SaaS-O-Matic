import {
  createCustomerSchema,
  validateFiscalId,
  type CountryCode,
  type CreateCustomerInput,
  type Customer,
} from '@saas/shared';
import { useMemo, useState, type FormEvent } from 'react';
import { describeError } from '../../api/errors';
import { ApiError } from '../../api/http';
import { useCreateCustomer } from './hooks';
import { TAX_ID_TYPE_LABELS, taxIdHint, taxIdMessage } from './labels';

export type FormValues = CreateCustomerInput;
type FieldName = keyof FormValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_NAMES: readonly FieldName[] = ['companyName', 'taxId', 'email', 'countryCode', 'plan'];
const INITIAL_VALUES: FormValues = { companyName: '', taxId: '', email: '', countryCode: 'ES', plan: 'basic' };

const FIELD_MESSAGES: Record<Exclude<FieldName, 'taxId'>, string> = {
  companyName: 'El nombre debe tener entre 2 y 120 caracteres.',
  email: 'Introduce un email válido.',
  countryCode: 'Selecciona un país.',
  plan: 'Selecciona un plan.',
};

const isFieldName = (value: unknown): value is FieldName => FIELD_NAMES.some((name) => name === value);

function messageFor(field: FieldName, code: string, countryCode: CountryCode): string {
  return field === 'taxId' ? taxIdMessage(code, countryCode) : FIELD_MESSAGES[field];
}

/** Same shared schema as the API: the form can never accept what the server would reject. */
function clientErrors(values: FormValues): FieldErrors {
  const result = createCustomerSchema.safeParse(values);
  if (result.success) return {};
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (isFieldName(field) && !errors[field]) errors[field] = messageFor(field, issue.message, values.countryCode);
  }
  return errors;
}

function serverErrors(error: unknown, countryCode: CountryCode): FieldErrors {
  if (!(error instanceof ApiError)) return {};
  if (error.code === 'CONFLICT') return { taxId: taxIdMessage('DUPLICATE', countryCode) };
  const errors: FieldErrors = {};
  for (const detail of error.details) {
    if (isFieldName(detail.path)) errors[detail.path] = messageFor(detail.path, detail.message, countryCode);
  }
  return errors;
}

export function useCustomerForm(onCreated: (customer: Customer) => void) {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [apiFieldErrors, setApiFieldErrors] = useState<FieldErrors>({});
  const mutation = useCreateCustomer();

  const errors = useMemo(() => clientErrors(values), [values]);
  const taxIdCheck = useMemo(
    () => validateFiscalId(values.taxId, values.countryCode),
    [values.taxId, values.countryCode],
  );

  function setField<K extends FieldName>(field: K, value: FormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }));
    // A server error is stale once the user edits the field (or the country that conditions the tax ID).
    setApiFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === 'countryCode') delete next.taxId;
      return next;
    });
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || mutation.isPending) return;
    mutation.mutate(values, {
      onSuccess: onCreated,
      onError: (error) => setApiFieldErrors(serverErrors(error, values.countryCode)),
    });
  }

  // Derived from the error itself, not from the field-error state: once the user edits the field and its
  // inline message clears, a field-level error must not resurface as a misleading generic banner.
  const errorMapsToFields =
    mutation.isError && Object.keys(serverErrors(mutation.error, values.countryCode)).length > 0;

  return {
    values,
    setField,
    markTouched: (field: FieldName) => setTouched((current) => ({ ...current, [field]: true })),
    errorFor: (field: FieldName) => apiFieldErrors[field] ?? (touched[field] || submitted ? errors[field] : undefined),
    taxIdHint: taxIdHint(values.countryCode),
    taxIdSuccess: taxIdCheck.valid ? `${TAX_ID_TYPE_LABELS[taxIdCheck.type]} válido` : undefined,
    submit,
    isSubmitting: mutation.isPending,
    generalError: mutation.isError && !errorMapsToFields ? describeError(mutation.error) : undefined,
  };
}
