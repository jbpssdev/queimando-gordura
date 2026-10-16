import { expect, test } from '@playwright/test';

for (const width of [375, 1440]) {
  test(`fundação funcional em ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/verificacao-ambiente');
    await expect(page).toHaveTitle('Queimando Gordura 1.0');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Uma base sólida.');
    const button = page.getByRole('button', { name: 'Verificar API' });
    await expect(button).toBeVisible();
    expect(await button.getAttribute('class')).toContain('bg-primary');
    expect(await button.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
      'rgba(0, 0, 0, 0)',
    );
    await expect(page.locator('[hlmCard]')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveText('API em funcionamento.');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await button.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration)),
    ).toBeLessThanOrEqual(0.001);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/foundation-${width}.png`, fullPage: true });
  });
}
