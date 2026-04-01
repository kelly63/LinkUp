import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard, MOCK_OPEN_SESSIONS } from './helpers/mocks';

const MOCK_AVAILABLE_SESSION = {
  _id: 'avail-001',
  title: 'Baseball – Catcher needed',
  sport: 'Baseball',
  partnerRole: 'Catcher',
  posterRole: 'Pitcher',
  skillLevelRequired: 'NCAA D1',
  location: 'Dodger Stadium Fields',
  date: 'Apr 10, 2026',
  time: '10:00 AM',
  duration: '2 hours',
  status: 'open',
  sessionType: 'need',
  postedBy: { _id: 'user-002', name: 'Sam Coach', avatar: 'SC' },
  partner: null,
};

async function goToPostTab(page: Parameters<typeof test.beforeEach>[0]['page'] extends (pg: infer P) => any ? P : never) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('button:has-text("View All")').waitFor({ timeout: 8000 });
  await page.locator('button').filter({ has: page.locator('span:has-text("LinkUp")') }).click();
  await page.waitForSelector('h2:has-text("Sessions")', { timeout: 8000 });
}

test.describe('Post creation (PostView)', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  test('shows Sessions heading and mode toggle buttons', async ({ page }) => {
    await goToPostTab(page);
    await expect(page.locator('h2:has-text("Sessions")')).toBeVisible();
    await expect(page.locator('button:has-text("Post a Need")')).toBeVisible();
    await expect(page.locator('button:has-text("Find Sessions")')).toBeVisible();
  });

  test('"Post a Need" mode is active by default', async ({ page }) => {
    await goToPostTab(page);
    await expect(page.locator('button:has-text("POST SESSION")')).toBeVisible();
  });

  test('switching to "Find Sessions" shows search bar', async ({ page }) => {
    await page.route('**/api/sessions/available**', (route) =>
      route.fulfill({ json: { sessions: [], total: 0, page: 1, pages: 1 } })
    );
    await goToPostTab(page);
    await page.click('button:has-text("Find Sessions")');
    await expect(page.locator('input[placeholder="Search sessions..."]')).toBeVisible({ timeout: 5000 });
  });

  // ── Post a Need – validation ────────────────────────────────────────────────

  test('shows toast error when no partner role selected', async ({ page }) => {
    await goToPostTab(page);
    // Mark date as flexible to pass the date validation
    await page.locator('text=Flexible on date').click();
    await page.click('button:has-text("POST SESSION")');
    await expect(
      page.locator('text=Please select at least one partner role.')
    ).toBeVisible({ timeout: 5000 });
  });

  test('shows toast error when no date and not flexible', async ({ page }) => {
    await goToPostTab(page);
    // Select a partner role to pass that check
    await page.locator('button:has-text("Catcher")').first().click();
    await page.click('button:has-text("POST SESSION")');
    await expect(
      page.locator('text=Please add a date or mark as flexible.')
    ).toBeVisible({ timeout: 5000 });
  });

  // ── Post a Need – successful submission ────────────────────────────────────

  test('successful post calls POST /api/sessions', async ({ page }) => {
    const createRequest = page.waitForRequest(
      (req) => req.url().includes('/api/sessions') && req.method() === 'POST'
    );

    await page.route('**/api/sessions', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          json: { session: { ...MOCK_OPEN_SESSIONS[0], _id: 'new-session-001' } },
        });
      }
      return route.continue();
    });

    await goToPostTab(page);

    // Select partner role
    await page.locator('button:has-text("Catcher")').first().click();
    // Mark date as flexible
    await page.locator('text=Flexible on date').click();
    // Submit
    await page.click('button:has-text("POST SESSION")');

    const req = await createRequest;
    expect(req.method()).toBe('POST');
  });

  test('POST /api/sessions body includes sport, partnerRole, and sessionType', async ({ page }) => {
    const createRequest = page.waitForRequest(
      (req) => req.url().includes('/api/sessions') && req.method() === 'POST'
    );

    await page.route('**/api/sessions', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          json: { session: { ...MOCK_OPEN_SESSIONS[0], _id: 'new-session-001' } },
        });
      }
      return route.continue();
    });

    await goToPostTab(page);

    await page.locator('button:has-text("Catcher")').first().click();
    await page.locator('text=Flexible on date').click();
    await page.click('button:has-text("POST SESSION")');

    const req = await createRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.sport).toBe('Baseball');
    expect(body.partnerRole).toContain('Catcher');
    expect(body.sessionType).toBe('need');
    expect(body.status).toBe('open');
  });

  test('successful post navigates back to dashboard', async ({ page }) => {
    await page.route('**/api/sessions', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          json: { session: { ...MOCK_OPEN_SESSIONS[0], _id: 'new-session-001' } },
        });
      }
      return route.continue();
    });

    await goToPostTab(page);
    await page.locator('button:has-text("Catcher")').first().click();
    await page.locator('text=Flexible on date').click();
    await page.click('button:has-text("POST SESSION")');

    // After success the app navigates back to dashboard — "View All" reappears
    await expect(page.locator('button:has-text("View All")')).toBeVisible({ timeout: 8000 });
  });

  // ── Find Sessions ──────────────────────────────────────────────────────────

  test('"Find Sessions" fetches GET /api/sessions/available and shows cards', async ({ page }) => {
    await page.route('**/api/sessions/available**', (route) =>
      route.fulfill({
        json: { sessions: [MOCK_AVAILABLE_SESSION], total: 1, page: 1, pages: 1 },
      })
    );

    await goToPostTab(page);
    await page.click('button:has-text("Find Sessions")');

    await expect(
      page.locator('text=Baseball – Catcher needed')
    ).toBeVisible({ timeout: 8000 });
  });

  test('"Find Sessions" shows empty state when no sessions', async ({ page }) => {
    await page.route('**/api/sessions/available**', (route) =>
      route.fulfill({ json: { sessions: [], total: 0, page: 1, pages: 1 } })
    );

    await goToPostTab(page);
    await page.click('button:has-text("Find Sessions")');

    await expect(page.locator('text=0 sessions available')).toBeVisible({ timeout: 8000 });
  });
});
