import { test, expect } from './fixtures';

test.describe('Dashboard access control', () => {
  test(
    'unauthenticated users are redirected from /dashboard to /auth',
    async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/auth$/);
      await expect(
        page.getByRole('heading', { name: /Welcome to AgenticPay/i }),
      ).toBeVisible();
    },
  );
});

test.describe('Authenticated dashboard', () => {
  test(
    'renders the dashboard shell and main navigation',
    async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');

      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      const sidebar = page.getByRole('navigation', { name: /Main navigation/i });
      await expect(sidebar).toBeVisible();

      for (const link of ['Dashboard', 'Projects', 'Invoices', 'Payments']) {
        await expect(sidebar.getByRole('link', { name: link })).toBeVisible();
      }
    },
  );

  test(
    'highlights the active route in the sidebar',
    async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');

      const sidebar = page.getByRole('navigation', { name: /Main navigation/i });
      await expect(
        sidebar.getByRole('link', { name: 'Dashboard' }),
      ).toHaveAttribute('aria-current', 'page');
    },
  );

  test(
    'navigates to the Projects page',
    async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');

      await page
        .getByRole('navigation', { name: /Main navigation/i })
        .getByRole('link', { name: 'Projects' })
        .click();

      await expect(page).toHaveURL(/\/dashboard\/projects$/);
      // No wallet is connected in E2E, so the wallet-gated Projects page
      // shows its connect prompt instead of project content.
      await expect(
        page.getByRole('heading', { name: /Please connect your wallet/i }),
      ).toBeVisible();
    },
  );
});
