import { test, expect } from './fixtures';
import { mockDisputesApi } from './helpers/api-mocks';

// Visual regression tests. Snapshots are committed under e2e/__snapshots__.
// Update with: npm run test:e2e:update-snapshots
//
// Animations are disabled at the config level (expect.toHaveScreenshot), and
// we wait for network idle to reduce flake from fonts/images loading late.
//
// We pin visuals to chromium so we only maintain a single set of baseline
// images — the cross-browser projects still run every other spec.
test.describe('Visual regression', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Visual snapshots are only maintained for chromium',
  );

  test('landing page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot('landing.png', { fullPage: true });
  });

  test('auth page', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot('auth.png', { fullPage: true });
  });

  test('escrow dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/escrow', { waitUntil: 'networkidle' });
    // Escrow renders static fixtures: wait for settled content (past the
    // framer-motion entrance) so the screenshot is deterministic.
    await expect(page.getByRole('heading', { name: 'Escrow Agreements' })).toBeVisible();
    await expect(page.getByText('Website Redesign').first()).toBeVisible();
    await expect(page).toHaveScreenshot('escrow-dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
  });

  test('disputes list', async ({ authenticatedPage: page }) => {
    // The list page fetches /api/v1/disputes directly: mock fixture data so
    // the screenshot is backend-independent and stable across runs.
    await mockDisputesApi(page);
    await page.goto('/dashboard/disputes', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Dispute Resolution/i })).toBeVisible();
    await expect(page.getByText(/service not delivered/i).first()).toBeVisible();
    await expect(page).toHaveScreenshot('disputes-list.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
  });
});
