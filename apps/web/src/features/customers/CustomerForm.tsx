import { COUNTRIES, COUNTRY_CODES, PLAN_IDS, PLANS, isCountryCode, isPlanId, type Customer } from '@saas/shared';
import { Button } from '../../components/Button';
import { Field, inputClassName } from '../../components/Field';
import { formatBasisPoints, formatNumber } from '../../lib/format';
import { useCustomerForm } from './useCustomerForm';
import styles from './CustomerForm.module.css';

export function CustomerForm({ onCreated }: { onCreated: (customer: Customer) => void }) {
  const form = useCustomerForm(onCreated);
  const { values, setField, markTouched, errorFor } = form;
  const plan = PLANS[values.plan];

  return (
    <form className={styles.form} onSubmit={form.submit} noValidate>
      <Field label="Nombre de la empresa" error={errorFor('companyName')}>
        {(control) => (
          <input
            {...control}
            className={inputClassName}
            value={values.companyName}
            onChange={(event) => setField('companyName', event.target.value)}
            onBlur={() => markTouched('companyName')}
            autoComplete="organization"
          />
        )}
      </Field>

      <div className={styles.row}>
        <Field label="País" hint={`IVA aplicado: ${formatBasisPoints(COUNTRIES[values.countryCode].taxRateBp)}`}>
          {(control) => (
            <select
              {...control}
              className={inputClassName}
              value={values.countryCode}
              onChange={(event) => isCountryCode(event.target.value) && setField('countryCode', event.target.value)}
            >
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>
                  {COUNTRIES[code].name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Identificador fiscal" hint={form.taxIdHint} error={errorFor('taxId')} success={form.taxIdSuccess}>
          {(control) => (
            <input
              {...control}
              className={`${inputClassName} ${styles.mono}`}
              value={values.taxId}
              onChange={(event) => setField('taxId', event.target.value)}
              onBlur={() => markTouched('taxId')}
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </Field>
      </div>

      <div className={styles.row}>
        <Field label="Email de contacto" error={errorFor('email')}>
          {(control) => (
            <input
              {...control}
              type="email"
              className={inputClassName}
              value={values.email}
              onChange={(event) => setField('email', event.target.value)}
              onBlur={() => markTouched('email')}
              autoComplete="email"
            />
          )}
        </Field>

        <Field
          label="Plan"
          hint={`Incluye ${formatNumber(plan.includedStorageGb)} GB y ${formatNumber(plan.includedApiCalls)} llamadas API/mes.`}
        >
          {(control) => (
            <select
              {...control}
              className={inputClassName}
              value={values.plan}
              onChange={(event) => isPlanId(event.target.value) && setField('plan', event.target.value)}
            >
              {PLAN_IDS.map((id) => (
                <option key={id} value={id}>
                  {PLANS[id].name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {form.generalError && (
        <p className={styles.generalError} role="alert">
          {form.generalError}
        </p>
      )}

      <div className={styles.actions}>
        <Button type="submit" loading={form.isSubmitting}>
          Registrar cliente
        </Button>
      </div>
    </form>
  );
}
