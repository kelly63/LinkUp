import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard } from './helpers/mocks';

const ATHLETE = {
  _id: 'athlete-002',
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

test.describe('Practice request', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);

    // AthleteSearchView: search users
    await page.route('**/api/users**', (route) => {
      route.fulfill({ json: { users: [ATHLETE], total: 1, page: 1, pages: 1 } });
    });

    // UserProfileView: individual user + connection status + ratings
    await page.route(`**/api/users/${ATHLETE._id}**`, (route) => {
      route.fulfill({ json: { user: ATHLETE } });
    });
    await page.route(`**/api/connections/status/${ATHLETE._id}**`, (route) => {
      route.fulfill({ json: { status: 'none', connectionId: null } });
    });
    await page.route(`**/api/ratings/user/${ATHLETE._id}**`, (route) => {
      route.fulfill({ json: { ratings: [] } });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('navigates from dashboard to athlete profile', async ({ page }) => {
    await page.click('button:has-text("Search Athletes")');
    await expect(page.locator(`text=${ATHLETE.name}`)).toBeVisible({ timeout: 8000 });

    // "Profile" button on the athlete card calls onViewProfile
    await page.click('button:has-text("Profile")');
    await expect(page.locator('text=Request Practice Session')).toBeVisible({ timeout: 8000 });
  });

  test('clicking Request Practice Session calls POST /api/connections/request', async ({ page }) => {
    // Set up request interceptor
    const requestPromise = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/connections/request/${ATHLETE._id}`) &&
        req.method() === 'POST'
    );

    await page.route(`**/api/connections/request/${ATHLETE._id}**`, (route) => {
      route.fulfill({ json: { message: 'Request sent' } });
    });

    await page.click('button:has-text("Search Athletes")');
    await page.waitForSelector(`text=${ATHLETE.name}`, { timeout: 8000 });
    await page.click('button:has-text("Profile")');
    await page.waitForSelector('text=Request Practice Session', { timeout: 8000 });
    await page.click('text=Request Practice Session');

    // Verify the API was called
    const req = await requestPromise;
    expect(req.url()).toContain(`/api/connections/request/${ATHLETE._id}`);
  });

  test('button changes to Request Sent after submitting', async ({ page }) => {
    await page.route(`**/api/connections/request/${ATHLETE._id}**`, (route) => {
      route.fulfill({ json: { message: 'Request sent' } });
    });

    await page.click('button:has-text("Search Athletes")');
    await page.waitForSelector(`text=${ATHLETE.name}`, { timeout: 8000 });
    await page.click('button:has-text("Profile")');
    await page.waitForSelector('text=Request Practice Session', { timeout: 8000 });
    await page.click('text=Request Practice Session');

    await expect(page.locator('text=Request Sent')).toBeVisible({ timeout: 8000 });
  });

  // ── Profile content ─────────────────────────────────────────────────────────

  test('athlete profile shows the user name in the hero', async ({ page }) => {
    await page.click('button:has-text("Search Athletes")');
    await page.waitForSelector(`text=${ATHLETE.name}`, { timeout: 8000 });
    await page.click('button:has-text("Profile")');
    await expect(page.locator('h1:has-text("Jordan Outfield")')).toBeVisible({ timeout: 8000 });
  });

  test('athlete profile shows sport and position', async ({ page }) => {
    await page.click('button:has-text("Search Athletes")');
    await page.waitForSelector(`text=${ATHLETE.name}`, { timeout: 8000 });
    await page.click('button:has-text("Profile")');
    await page.waitForSelector('h1:has-text("Jordan Outfield")', { timeout: 8000 });
    await expect(page.locator(`text=${ATHLETE.sport}`).first()).toBeVisible();
    await expect(page.locator(`text=${ATHLETE.position}`).first()).toBeVisible();
  });

  test('athlete profile shows skill level badge', async ({ page }) => {
    await page.click('button:has-text("Search Athletes")');
    await page.waitForSelector(`text=${ATHLETE.name}`, { timeout: 8000 });
    await page.click('button:has-text("Profile")');
    await page.waitForSelector('h1:has-text("Jordan Outfield")', { timeout: 8000 });
    await expect(page.locator(`text=${ATHLETE.skillLevel}`).first()).toBeVisible();
  });

  test('athlete profile shows average rating in stats grid', async ({ page }) => {
    await page.click('button:has-text("Search Athletes")');
    await page.waitForSelector(`text=${ATHLETE.name}`, { timeout: 8000 });
    await page.click('button:has-text("Profile")');
    await page.waitForSelector('h1:has-text("Jordan Outfield")', { timeout: 8000 });
    await expect(page.locator(`text=${ATHLETE.averageRating.toFixed(1)}`)).toBeVisible();
  });

  test('athlete profile shows "Message" button', async ({ page }) => {
    await page.click('button:has-text("Search Athletes")');
    await page.waitForSelector(`text=${ATHLETE.name}`, { timeout: 8000 });
    await page.click('button:has-text("Profile")');
    await expect(page.locator('button:has-text("Message")')).toBeVisible({ timeout: 8000 });
  });

  test('athlete profile shows "Rate" button', async ({ page }) => {
    await page.click('button:has-text("Search Athletes")');
    await page.waitForSelector(`text=${ATHLETE.name}`, { timeout: 8000 });
    await page.click('button:has-text("Profile")');
    await expect(page.locator('button:has-text("Rate")')).toBeVisible({ timeout: 8000 });
  });

  test('athlete profile shows bio text', async ({ page }) => {
    await page.click('button:has-text("Search Athletes")');
    await page.waitForSelector(`text=${ATHLETE.name}`, { timeout: 8000 });
    await page.click('button:has-text("Profile")');
    await expect(page.locator(`text=${ATHLETE.bio}`)).toBeVisible({ timeout: 8000 });
  });

  test('back button returns from athlete profile', async ({ page }) => {
    await page.click('button:has-text("Search Athletes")');
    await page.waitForSelector(`text=${ATHLETE.name}`, { timeout: 8000 });
    await page.click('button:has-text("Profile")');
    await page.waitForSelector('h1:has-text("Jordan Outfield")', { timeout: 8000 });
    await page.locator('xpath=//h2[text()="Profile"]/../button').click();
    // Returns to main view; athlete profile hero no longer visible
    await expect(page.locator('h1:has-text("Jordan Outfield")')).not.toBeVisible({ timeout: 6000 });
  });
});
