import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow } from './layout';
import { mockExchangeRates } from './rates';

test.beforeEach(async ({ page }) => {
  await mockExchangeRates(page);
});

test('search → detail → simulate → save → change currency, without horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  await expectNoHorizontalOverflow(page, 'search page');

  await page.getByRole('searchbox').fill('acme');
  await page.getByRole('link', { name: /Acme Ibérica/ }).click();
  await expect(page).toHaveURL(/\/customers\/\d+$/);

  const simulator = page.getByRole('region', { name: 'Simulador de factura' });
  await simulator.getByRole('spinbutton', { name: 'Usuarios activos' }).fill('15');
  await simulator.getByRole('spinbutton', { name: 'Almacenamiento' }).fill('0');
  await simulator.getByRole('spinbutton', { name: 'Llamadas API / mes' }).fill('0');
  // The statement's example: 10 × 10 € + 5 × 8 € = 140 € + 21 % VAT.
  await expect(simulator.getByTestId('projected-total')).toHaveText(/169,40\s€/);
  await expectNoHorizontalOverflow(page, 'customer detail');

  await simulator.getByRole('button', { name: 'Guardar simulación' }).click();
  await expect(simulator.getByRole('status')).toContainText('Simulación guardada');
  const history = page.getByRole('region', { name: /Historial de simulaciones/ });
  await expect(history.getByRole('listitem').first()).toContainText(/169,40\s€/);
  await expectNoHorizontalOverflow(page, 'customer detail with history');

  await page.getByLabel('Divisa').selectOption('USD');
  await expect(simulator.getByTestId('projected-total')).toHaveText(/186,34\sUS\$/);
  await expect(simulator.getByTestId('eur-equivalent')).toContainText('169,40');
  await expectNoHorizontalOverflow(page, 'customer detail in USD');
});

test('new customer form fits the viewport', async ({ page }) => {
  await page.goto('/customers/new');
  await expect(page.getByRole('heading', { name: 'Nuevo cliente' })).toBeVisible();
  await expectNoHorizontalOverflow(page, 'new customer page');
});
