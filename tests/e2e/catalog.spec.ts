import {expect, test} from '@playwright/test';

for (const locale of ['en', 'ar'] as const) {
  test(`${locale}: catalog search, filters, and product details`, async ({page}) => {
    await page.goto(`/${locale}/products`);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('main h1')).toBeVisible();
    await page.locator('.catalog-search input[name="q"]').fill('PUBG');
    await page.locator('.catalog-search button[type="submit"]').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/products\\?q=PUBG`));
    await expect(page.locator('.catalog-card').first()).toBeVisible();
    await page.locator('.catalog-card').first().click();
    await expect(page.locator('.product-detail h1')).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(2);
  });
}

test('catalog has no horizontal overflow at 320px', async ({page}) => {
  await page.setViewportSize({width: 320, height: 800});
  await page.goto('/en/products');
  const sizes = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
});
