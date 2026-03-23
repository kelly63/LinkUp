import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, MOCK_OPEN_SESSIONS, MOCK_PARTNER } from './helpers/mocks';

// Reusable dashboard mock with configurable data
async function mockDashboardData(
  page: Parameters<typeof test.beforeEach>[0]['page'] extends (pg: infer P) => any ? P : never,
  {
    sessions = [] as any[],
    pendingRequests = [] as any[],
    ratings = [] as any[],
  } = {}
) {
  await page.route('**/api/sessions/my**', (route) =>
    route.fulfill({ json: { sessions } })
  );
  await page.route('**/api/connections/pending**', (route) =>
    route.fulfill({ json: { requests: pendingRequests } })
  );
  await page.route('**/api/ratings/received**', (route) =>
    route.fulfill({ json: { ratings } })
  );
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  test('shows personalised welcome greeting', async ({ page }) => {
    await mockDashboardData(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // user.name is "Alex Pitcher" → first name shown in greeting
    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('h2:has-text("Alex")')).toBeVisible();
  });

  test('shows loading spinner while fetching data', async ({ page }) => {
    // Delay the sessions response to keep spinner visible
    await page.route('**/api/sessions/my**', async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      route.fulfill({ json: { sessions: [] } });
    });
    await page.route('**/api/connections/pending**', (route) =>
      route.fulfill({ json: { requests: [] } })
    );
    await page.route('**/api/ratings/received**', (route) =>
      route.fulfill({ json: { ratings: [] } })
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Spinner should be visible before data arrives
    await expect(page.locator('.animate-spin').first()).toBeVisible({ timeout: 5000 });
  });

  test('shows empty state when there are no upcoming sessions', async ({ page }) => {
    await mockDashboardData(page, { sessions: [] });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator('text=No upcoming sessions.')
    ).toBeVisible({ timeout: 8000 });
  });

  test('empty state has a link to navigate to the post tab', async ({ page }) => {
    await mockDashboardData(page, { sessions: [] });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('text=No upcoming sessions.', { timeout: 8000 });
    await page.click('text=Post or find a session →');

    // After navigating to the post tab the "Post or find a session" text disappears
    // and a new view loads — verify dashboard empty state is gone
    await expect(page.locator('text=No upcoming sessions.')).not.toBeVisible({ timeout: 5000 });
  });

  test('shows session cards for upcoming sessions', async ({ page }) => {
    await mockDashboardData(page, { sessions: MOCK_OPEN_SESSIONS });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Dashboard limits display to 2 cards
    await expect(page.locator('button:has-text("View Details")')).toHaveCount(2, { timeout: 8000 });
    await expect(page.locator('text=Baseball').first()).toBeVisible();
    await expect(page.locator('text=Riverside Park').first()).toBeVisible();
  });

  test('shows "View All" button when sessions exceed display limit', async ({ page }) => {
    // MOCK_OPEN_SESSIONS has 3 items, dashboard limit is 2 → View All appears
    await mockDashboardData(page, { sessions: MOCK_OPEN_SESSIONS });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('button:has-text("View All")')).toBeVisible({ timeout: 8000 });
  });

  test('does NOT show "View All" when sessions are within display limit', async ({ page }) => {
    await mockDashboardData(page, { sessions: [MOCK_OPEN_SESSIONS[0]] });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('button:has-text("View Details")', { timeout: 8000 });
    await expect(page.locator('button:has-text("View All")')).not.toBeVisible();
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  test('"Search Athletes" button navigates to athlete search view', async ({ page }) => {
    await mockDashboardData(page);
    await page.route('**/api/users**', (route) =>
      route.fulfill({ json: { users: [], total: 0, page: 1, pages: 0 } })
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button:has-text("Search Athletes")', { timeout: 8000 });
    await page.click('button:has-text("Search Athletes")');

    // AthleteSearchView renders a search input
    await expect(page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first()).toBeVisible({ timeout: 8000 });
  });

  test('"View Details" on a session card navigates to session details', async ({ page }) => {
    await mockDashboardData(page, { sessions: MOCK_OPEN_SESSIONS });
    await page.route(`**/api/sessions/${MOCK_OPEN_SESSIONS[0]._id}**`, (route) =>
      route.fulfill({ json: { session: MOCK_OPEN_SESSIONS[0] } })
    );
    await page.route(`**/api/sessions/${MOCK_OPEN_SESSIONS[0]._id}/accept**`, (route) =>
      route.fulfill({ json: { session: MOCK_OPEN_SESSIONS[0] } })
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button:has-text("View Details")', { timeout: 8000 });
    await page.click('button:has-text("View Details")');

    // SessionDetailsView shows "Edit Session" button
    await expect(page.locator('button:has-text("Edit Session")')).toBeVisible({ timeout: 8000 });
  });

  // ── Recent Activity ────────────────────────────────────────────────────────

  test('shows "Rating Received" activity when ratings exist', async ({ page }) => {
    const mockRating = {
      _id: 'rating-001',
      overallRating: 5,
      sport: 'Baseball',
      createdAt: new Date().toISOString(),
      rater: { _id: 'coach-001', name: 'Coach Rivera', avatar: 'CR' },
    };

    await mockDashboardData(page, { ratings: [mockRating] });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('text=Rating Received')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=5 stars from Coach Rivera')).toBeVisible();
  });

  test('clicking a "Rating Received" activity navigates to reviews', async ({ page }) => {
    const mockRating = {
      _id: 'rating-001',
      overallRating: 4,
      sport: 'Baseball',
      createdAt: new Date().toISOString(),
      rater: { _id: 'coach-001', name: 'Coach Rivera', avatar: 'CR' },
    };

    await mockDashboardData(page, { ratings: [mockRating] });
    await page.route('**/api/ratings/received**', (route) =>
      route.fulfill({ json: { ratings: [mockRating] } })
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Rating Received', { timeout: 8000 });
    await page.locator('text=Rating Received').first().click();

    // ReviewsView shows a "Reviews" heading
    await expect(page.locator('h2:has-text("Reviews"), h3:has-text("Reviews")')).toBeVisible({ timeout: 8000 });
  });

  test('shows "Roster Request" activity and respond button for pending connections', async ({ page }) => {
    const mockRequest = {
      _id: 'conn-001',
      connectionId: 'conn-001',
      createdAt: new Date().toISOString(),
      user: MOCK_PARTNER,
    };

    await mockDashboardData(page, { pendingRequests: [mockRequest] });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('text=Roster Request')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Coach Rivera wants to join your roster')).toBeVisible();
    await expect(page.locator('button:has-text("View Profile & Respond")')).toBeVisible();
  });
});
