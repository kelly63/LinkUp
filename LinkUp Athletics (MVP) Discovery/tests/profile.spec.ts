import { test, expect } from '@playwright/test';
import { seedAuth, MOCK_USER } from './helpers/auth';
import { blockWebSocket, mockDashboard } from './helpers/mocks';

async function goToProfile(page: Parameters<typeof test.beforeEach>[0]['page'] extends (pg: infer P) => any ? P : never) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Wait for dashboard to finish loading (mockDashboard always returns 3 sessions → "View All" shown)
  await page.locator('button:has-text("View All")').waitFor({ timeout: 8000 });
  // Click the Profile tab in the bottom nav bar
  await page.locator('button').filter({ has: page.locator('span:has-text("Profile")') }).click();
  await page.waitForSelector('h3:has-text("Alex Pitcher")', { timeout: 8000 });
}

test.describe('Profile tab', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  test('shows user name from auth context', async ({ page }) => {
    await goToProfile(page);
    await expect(page.locator('h3:has-text("Alex Pitcher")')).toBeVisible();
  });

  test('shows athlete profile section with sport and skill level', async ({ page }) => {
    await goToProfile(page);
    // "Athlete Profile" card
    await expect(page.locator('h4:has-text("Athlete Profile")')).toBeVisible();
    // Sport and level seeded from MOCK_USER
    await expect(page.locator('text=Baseball').first()).toBeVisible();
    await expect(page.locator('text=NCAA D1').first()).toBeVisible();
  });

  test('shows performance stats (sessions and rating)', async ({ page }) => {
    await goToProfile(page);
    // ratingCount = 12, averageRating = 4.5 from MOCK_USER
    await expect(page.locator(`text=${MOCK_USER.ratingCount}`).first()).toBeVisible();
    await expect(page.locator(`text=${MOCK_USER.averageRating.toFixed(1)}`).first()).toBeVisible();
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  test('clicking rating stat navigates to Received Ratings', async ({ page }) => {
    await goToProfile(page);
    // The rating stat tile is a clickable div
    await page.locator('text=User Rating').click();
    await expect(page.locator('h2:has-text("My Ratings")')).toBeVisible({ timeout: 8000 });
  });

  test('"My Roster" button navigates to roster view', async ({ page }) => {
    await goToProfile(page);
    await page.click('button:has-text("My Roster")');
    await expect(page.locator('h2:has-text("My Roster")')).toBeVisible({ timeout: 8000 });
  });

  // ── Edit athlete profile ───────────────────────────────────────────────────

  test('Edit athlete profile calls PUT /api/users/profile', async ({ page }) => {
    const updateRequest = page.waitForRequest(
      (req) => req.url().includes('/api/users/profile') && req.method() === 'PUT'
    );

    await page.route('**/api/users/profile', (route) => {
      if (route.request().method() === 'PUT') {
        return route.fulfill({
          json: { user: { ...MOCK_USER, sport: 'Soccer', skillLevel: 'Pro' } },
        });
      }
      return route.continue();
    });

    await goToProfile(page);

    // Open the athlete profile edit modal
    await page.click('button:has-text("Edit")');
    await page.waitForSelector('select', { timeout: 5000 });

    // Change sport to Soccer
    await page.locator('select').first().selectOption('Soccer');

    // Save
    await page.click('button:has-text("Save")');

    const req = await updateRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.sport).toBe('Soccer');
    expect(req.method()).toBe('PUT');
  });

  // ── Edit bio ───────────────────────────────────────────────────────────────

  test('Edit bio/about me calls PUT /api/users/profile with bio', async ({ page }) => {
    const updateRequest = page.waitForRequest(
      (req) => req.url().includes('/api/users/profile') && req.method() === 'PUT'
    );

    await page.route('**/api/users/profile', (route) => {
      if (route.request().method() === 'PUT') {
        return route.fulfill({
          json: { user: { ...MOCK_USER, bio: 'Updated bio text' } },
        });
      }
      return route.continue();
    });

    await goToProfile(page);

    // Scroll down to reach the About Me section which has its own Edit button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // There are two Edit buttons (athlete profile + about me); click the second one
    await page.locator('button:has-text("Edit")').nth(1).click();
    await page.waitForSelector('textarea', { timeout: 5000 });

    await page.locator('textarea').fill('Updated bio text');
    await page.click('button:has-text("Save")');

    const req = await updateRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.bio).toBe('Updated bio text');
  });

  // ── QR code ────────────────────────────────────────────────────────────────

  test('"View Full Size" opens the QR code modal', async ({ page }) => {
    await goToProfile(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.click('button:has-text("View Full Size")');
    // QR code modal contains the user's name
    await expect(page.locator('text=Alex Pitcher').nth(1)).toBeVisible({ timeout: 5000 });
  });

  // ── Logout ─────────────────────────────────────────────────────────────────

  test('Log Out button returns to login screen', async ({ page }) => {
    await goToProfile(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.click('h4:has-text("Log Out")');
    // After logout the auth gate shows the login form
    await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible({ timeout: 8000 });
  });
});
