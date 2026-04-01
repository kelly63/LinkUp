import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket } from './helpers/mocks';

const REQUESTER = {
  _id: 'athlete-requester',
  name: 'Jordan Outfield',
  avatar: 'JO',
  role: 'athlete',
  sport: 'Baseball',
  position: 'Outfield',
  skillLevel: 'NCAA D2',
  averageRating: 4.2,
  ratingCount: 8,
  bio: 'Looking for pitching practice partners.',
  location: 'Los Angeles, CA',
};

const PENDING_CONNECTION = {
  _id: 'conn-001',
  connectionId: 'conn-001',
  status: 'pending',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  user: REQUESTER,
};

/** Mock dashboard with one incoming pending connection request */
async function mockDashboardWithPending(page: Parameters<typeof test.beforeEach>[0]['page'] extends (pg: infer P) => any ? P : never) {
  await page.route('**/api/sessions/my**', (route) =>
    route.fulfill({ json: { sessions: [] } })
  );
  await page.route('**/api/connections/pending**', (route) =>
    route.fulfill({ json: { requests: [PENDING_CONNECTION] } })
  );
  await page.route('**/api/ratings/received**', (route) =>
    route.fulfill({ json: { ratings: [] } })
  );

  // UserProfileView needs user profile + connection status
  await page.route(`**/api/users/${REQUESTER._id}**`, (route) =>
    route.fulfill({ json: { user: REQUESTER } })
  );
  await page.route(`**/api/connections/status/${REQUESTER._id}**`, (route) =>
    route.fulfill({ json: { status: 'pending', connectionId: PENDING_CONNECTION._id } })
  );
  await page.route(`**/api/ratings/user/${REQUESTER._id}**`, (route) =>
    route.fulfill({ json: { ratings: [] } })
  );
}

/** Mock dashboard with NO pending requests */
async function mockDashboardNoPending(page: Parameters<typeof test.beforeEach>[0]['page'] extends (pg: infer P) => any ? P : never) {
  await page.route('**/api/sessions/my**', (route) =>
    route.fulfill({ json: { sessions: [] } })
  );
  await page.route('**/api/connections/pending**', (route) =>
    route.fulfill({ json: { requests: [] } })
  );
  await page.route('**/api/ratings/received**', (route) =>
    route.fulfill({ json: { ratings: [] } })
  );
}

test.describe('Connections flow — pending request', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardWithPending(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('pending roster request appears in Recent Activity', async ({ page }) => {
    await expect(page.locator('text=Roster Request')).toBeVisible({ timeout: 8000 });
    await expect(page.locator(`text=${REQUESTER.name} wants to join your roster`)).toBeVisible();
  });

  test('roster request card shows "View Profile & Respond" button', async ({ page }) => {
    await page.waitForSelector('text=Roster Request', { timeout: 8000 });
    await expect(page.locator('button:has-text("View Profile & Respond")')).toBeVisible();
  });

  test('"View Profile & Respond" navigates to user profile with roster request banner', async ({ page }) => {
    await page.waitForSelector('button:has-text("View Profile & Respond")', { timeout: 8000 });
    await page.click('button:has-text("View Profile & Respond")');

    await expect(page.locator(`text=${REQUESTER.name}`).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Roster Request')).toBeVisible({ timeout: 8000 });
  });

  test('roster request profile shows Accept and Decline buttons', async ({ page }) => {
    await page.waitForSelector('button:has-text("View Profile & Respond")', { timeout: 8000 });
    await page.click('button:has-text("View Profile & Respond")');

    await page.waitForSelector('text=Roster Request', { timeout: 8000 });
    await expect(page.locator('button:has-text("Accept")')).toBeVisible();
    await expect(page.locator('button:has-text("Decline")')).toBeVisible();
  });

  test('roster request profile does NOT show Request Practice Session button', async ({ page }) => {
    await page.waitForSelector('button:has-text("View Profile & Respond")', { timeout: 8000 });
    await page.click('button:has-text("View Profile & Respond")');

    await page.waitForSelector('text=Roster Request', { timeout: 8000 });
    await expect(page.locator('button:has-text("Request Practice Session")')).not.toBeVisible();
  });

  test('requester sport and position are shown on roster request profile', async ({ page }) => {
    await page.waitForSelector('button:has-text("View Profile & Respond")', { timeout: 8000 });
    await page.click('button:has-text("View Profile & Respond")');

    await page.waitForSelector(`text=${REQUESTER.name}`, { timeout: 8000 });
    await expect(page.locator(`text=${REQUESTER.sport}`).first()).toBeVisible();
    await expect(page.locator(`text=${REQUESTER.position}`).first()).toBeVisible();
  });

  test('clicking Accept navigates back to dashboard', async ({ page }) => {
    await page.waitForSelector('button:has-text("View Profile & Respond")', { timeout: 8000 });
    await page.click('button:has-text("View Profile & Respond")');

    await page.waitForSelector('button:has-text("Accept")', { timeout: 8000 });
    await page.click('button:has-text("Accept")');

    // Back on dashboard — roster request section gone, profile "h2" gone
    await expect(page.locator('h2:has-text("Profile")')).not.toBeVisible({ timeout: 8000 });
  });

  test('clicking Decline navigates back to dashboard', async ({ page }) => {
    await page.waitForSelector('button:has-text("View Profile & Respond")', { timeout: 8000 });
    await page.click('button:has-text("View Profile & Respond")');

    await page.waitForSelector('button:has-text("Decline")', { timeout: 8000 });
    await page.click('button:has-text("Decline")');

    await expect(page.locator('h2:has-text("Profile")')).not.toBeVisible({ timeout: 8000 });
  });

  test('back arrow on user profile returns to dashboard', async ({ page }) => {
    await page.waitForSelector('button:has-text("View Profile & Respond")', { timeout: 8000 });
    await page.click('button:has-text("View Profile & Respond")');

    // Wait for UserProfileView header
    await page.waitForSelector('h2:has-text("Profile")', { timeout: 8000 });

    // First button in the top header bar is the ArrowLeft back button
    await page.locator('.bg-white.border-b button').first().click();

    await expect(page.locator('h2:has-text("Profile")')).not.toBeVisible({ timeout: 8000 });
  });
});

test.describe('Connections flow — no pending requests', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardNoPending(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('no Roster Request activity shown when pending list is empty', async ({ page }) => {
    // Wait for dashboard content to render (Upcoming Sessions heading is always present)
    await page.waitForSelector('text=Upcoming Sessions', { timeout: 8000 });
    await expect(page.locator('text=Roster Request')).not.toBeVisible();
  });

  test('"View Profile & Respond" button not shown when no requests', async ({ page }) => {
    await page.waitForSelector('text=Upcoming Sessions', { timeout: 8000 });
    await expect(page.locator('button:has-text("View Profile & Respond")')).not.toBeVisible();
  });
});
