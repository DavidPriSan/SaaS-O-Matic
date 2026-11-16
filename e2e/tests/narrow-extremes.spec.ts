import { expect, test } from '@playwright/test';
import { expectContentInsideCard, expectNoHorizontalOverflow } from './layout';
import { mockExchangeRates } from './rates';

// Worst case for width: the narrowest common phone, the longest amounts the API accepts, the widest currency.
test('largest amounts in MXN fit a 320 px phone', async ({ page }) => {
  await mockExchangeRates(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/customers/1');
  await page.getByLabel('Divisa').selectOption('MXN');

  const simulator = page.getByRole('region', { name: 'Simulador de factura' });
  await simulator.getByRole('spinbutton', { name: 'Usuarios activos' }).fill('10000');
  await simulator.getByRole('spinbutton', { name: 'Almacenamiento' }).fill('1000000');
  await simulator.getByRole('spinbutton', { name: 'Llamadas API / mes' }).fill('1000000000');
  await expect(simulator.getByTestId('projected-total')).toContainText('MXN');

  await expectNoHorizontalOverflow(page, 'customer detail at 320 px');
  await expectContentInsideCard(page, 'Simulador de factura');
  await expectContentInsideCard(page, /Historial de simulaciones/);
});
