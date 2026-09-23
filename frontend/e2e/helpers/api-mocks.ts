import type { Page } from '@playwright/test';
import { MOCK_ARBITRATORS, MOCK_DISPUTES, MOCK_ONBOARDING, buildMockPayment } from './test-data';

/** Intercept onboarding API routes with stable fixture data */
export async function mockOnboardingApi(page: Page): Promise<void> {
  await page.route('**/api/v1/onboarding/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'GET' && url.includes('/merchant/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ONBOARDING }),
      });
    }

    if (method === 'PATCH' && url.includes('/task')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...MOCK_ONBOARDING,
            progress: 66,
            tasks: MOCK_ONBOARDING.tasks.map((t, i) =>
              i === 0 ? { ...t, status: 'completed' } : t
            ),
          },
        }),
      });
    }

    if (method === 'POST' && url.includes('/documents')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { uploaded: true } }),
      });
    }

    return route.continue();
  });
}

/** Mock sandbox payment API (create → fund → confirm pipeline) */
export async function mockSandboxPaymentsApi(page: Page): Promise<void> {
  const payments = new Map<string, ReturnType<typeof buildMockPayment>['payment']>();

  await page.route('**/api/v1/sandbox/payments/**', async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === 'POST' && url.endsWith('/process')) {
      const body = route.request().postDataJSON() as { projectId?: string; amount?: number };
      const txnId = `txn_${Date.now()}`;
      const payment = {
        ...buildMockPayment(txnId).payment,
        projectId: body?.projectId ?? 'proj_e2e',
        amount: body?.amount ?? 100,
        status: 'funded' as const,
      };
      payments.set(txnId, payment);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, payment }),
      });
    }

    if (method === 'GET') {
      const match = url.match(/payments\/([^/]+)$/);
      const id = match?.[1];
      const payment = id ? payments.get(id) : undefined;
      if (payment) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            payment: { ...payment, status: 'confirmed' },
          }),
        });
      }
    }

    return route.continue();
  });
}

/** Mock disputes API (list + arbitrators + detail) for backend-independent tests */
export async function mockDisputesApi(page: Page): Promise<void> {
  const disputes = new Map(MOCK_DISPUTES.map((d) => [d.id, { ...d }]));

  await page.route('**/api/v1/disputes**', async (route) => {
    const method = route.request().method();
    const pathname = new URL(route.request().url()).pathname;

    if (method === 'GET' && pathname.endsWith('/disputes/arbitrators')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ARBITRATORS),
      });
    }

    if (method === 'GET' && /^\/api\/v1\/disputes\/?$/.test(pathname)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ disputes: [...disputes.values()] }),
      });
    }

    if (method === 'POST' && /^\/api\/v1\/disputes\/?$/.test(pathname)) {
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
      const id = `dsp_e2e_${Date.now()}`;
      const dispute = {
        ...MOCK_DISPUTES[0],
        ...body,
        id,
        status: 'awaiting_response',
        evidence: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      disputes.set(id, dispute);
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ dispute }),
      });
    }

    if (method === 'GET') {
      const match = pathname.match(/\/api\/v1\/disputes\/([\w-]+)$/);
      const dispute = match ? disputes.get(match[1]) : undefined;
      if (dispute) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ dispute }),
        });
      }
    }

    return route.continue();
  });
}

/** Clear test-specific localStorage keys after each test */
export async function cleanupTestState(page: Page): Promise<void> {
  await page.evaluate(() => {
    const keys = ['agenticpay-auth', 'agenticpay-onboarding-draft'];
    keys.forEach((k) => localStorage.removeItem(k));
  });
}
