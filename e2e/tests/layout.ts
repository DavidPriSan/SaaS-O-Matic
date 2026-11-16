import { expect, type Page } from '@playwright/test';

/**
 * Spec 05: no horizontal scroll at any width. On failure, names the elements that stick out so the
 * report says what to fix, not just that something is too wide.
 */
export async function expectNoHorizontalOverflow(page: Page, where: string): Promise<void> {
  const result = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((element) => element.getBoundingClientRect().right > viewport + 0.5)
      .map((element) => {
        const name = element.className || element.tagName.toLowerCase();
        return `${name} (right=${Math.round(element.getBoundingClientRect().right)})`;
      });
    return { scrollWidth: document.documentElement.scrollWidth, viewport, offenders: offenders.slice(0, 8) };
  });
  expect(
    result.scrollWidth,
    `${where}: page is ${result.scrollWidth}px wide in a ${result.viewport}px viewport. ` +
      `Overflowing: ${result.offenders.join(', ')}`,
  ).toBeLessThanOrEqual(result.viewport);
}

/** Nothing inside a card may cross its padding: the page can fit while a card's content still sticks out. */
export async function expectContentInsideCard(page: Page, regionName: string | RegExp): Promise<void> {
  const region = page.getByRole('region', { name: regionName });
  const offenders = await region.evaluate((card) => {
    const style = getComputedStyle(card);
    const limit =
      card.getBoundingClientRect().right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth);
    return [...card.querySelectorAll<HTMLElement>('*')]
      .filter((element) => element.getBoundingClientRect().right > limit + 0.5)
      .map(
        (element) =>
          `${element.tagName.toLowerCase()}.${String(element.className)} «${(element.textContent ?? '').slice(0, 24)}» right=${Math.round(element.getBoundingClientRect().right)}/${Math.round(limit)} w=${Math.round(element.getBoundingClientRect().width)}`,
      )
      .slice(0, 6);
  });
  expect(offenders, `${String(regionName)}: content crosses the card padding`).toEqual([]);
}
