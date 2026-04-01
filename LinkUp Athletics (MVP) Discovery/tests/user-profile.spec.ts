import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard } from './helpers/mocks';

const PROFILE_USER = {
  _id: 'athlete-007',
  name: 'Taylor Kim',
  avatar: 'TK',
  role: 'athlete',
  sport: 'Baseball',
  position: 'Catcher',
  skillLevel: 'NCAA D2',
  averageRating: 4.3,
  ratingCount: 6,
  bio: 'Hard working catcher looking for pitching partners.',
  location: 'Chicago, IL',
};

async function goToUserProfile(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button:has-text("Search Athletes")', { timeout: 8000 });
  await page.click('button:has-text("Search Athletes")');
  await page.waitForSelector(`text=${PROFILE_USER.name}`, { timeout: 8000 });
  await page.click('button:has-text("Profile")');
  await expect(page.locator('h1:has-text("Taylor Kim")')).toBeVisible({ timeout: 8000 });
}

test.describe('UserProfileView', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);

    await page.route('**/api/users**', (route) => {
      route.fulfill({ json: { users: [PROFILE_USER], total: 1, page: 1, pages: 1 } });
    });
    await page.route(`**/api/users/${PROFILE_USER._id}**`, (route) => {
      route.fulfill({ json: { user: PROFILE_USER } });
    });
    await page.route(`**/api/connections/status/${PROFILE_USER._id}**`, (route) => {
      route.fulfill({ json: { status: 'none', connectionId: null } });
    });
  });

  // ── Header ──────────────────────────────────────────────────────────────────

  test('renders "Profile" header title', async ({ page }) => {
    await goToUserProfile(page);
    await expect(page.locator('h2:has-text("Profile")')).toBeVisible();
  });

  // ── Hero section ────────────────────────────────────────────────────────────

  test('shows user name in hero', async ({ page }) => {
    await goToUserProfile(page);
    await expect(page.locator('h1:has-text("Taylor Kim")')).toBeVisible();
  });

  test('shows sport and position below the name', async ({ page }) => {
    await goToUserProfile(page);
    await expect(page.locator(`text=${PROFILE_USER.sport}`).first()).toBeVisible();
    await expect(page.locator(`text=${PROFILE_USER.position}`).first()).toBeVisible();
  });

  test('shows skill level badge in hero', async ({ page }) => {
    await goToUserProfile(page);
    await expect(page.locator(`text=${PROFILE_USER.skillLevel}`).first()).toBeVisible();
  });

  test('shows location in hero', async ({ page }) => {
    await goToUserProfile(page);
    await expect(page.locator(`text=${PROFILE_USER.location}`)).toBeVisible();
  });

  // ── Stats grid ──────────────────────────────────────────────────────────────

  test('shows stats grid with Sport, Position, Level, Rating labels', async ({ page }) => {
    await goToUserProfile(page);
    await expect(page.locator('text=Sport').first()).toBeVisible();
    await expect(page.locator('text=Position').first()).toBeVisible();
    await expect(page.locator('text=Level').first()).toBeVisible();
    await expect(page.locator('text=Rating').first()).toBeVisible();
  });

  test('shows average rating value in stats grid', async ({ page }) => {
    await goToUserProfile(page);
    await expect(page.locator(`text=${PROFILE_USER.averageRating.toFixed(1)}`)).toBeVisible();
  });

  // ── Action buttons (status = none) ─────────────────────────────────────────

  test('shows "Request Practice Session" button when not yet connected', async ({ page }) => {
    await goToUserProfile(page);
    await expect(page.locator('button:has-text("Request Practice Session")')).toBeVisible();
  });

  test('clicking Request Practice Session calls POST /api/connections/request/:id', async ({ page }) => {
    const requestPromise = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/connections/request/${PROFILE_USER._id}`) &&
        req.method() === 'POST'
    );
    await page.route(`**/api/connections/request/${PROFILE_USER._id}**`, (route) =>
      route.fulfill({ json: { message: 'Request sent' } })
    );

    await goToUserProfile(page);
    await page.click('button:has-text("Request Practice Session")');

    const req = await requestPromise;
    expect(req.url()).toContain(`/api/connections/request/${PROFILE_USER._id}`);
  });

  test('shows "Request Sent" state after sending practice request', async ({ page }) => {
    await page.route(`**/api/connections/request/${PROFILE_USER._id}**`, (route) =>
      route.fulfill({ json: { message: 'Request sent' } })
    );

    await goToUserProfile(page);
    await page.click('button:has-text("Request Practice Session")');
    await expect(page.locator('text=Request Sent')).toBeVisible({ timeout: 6000 });
  });

  test('shows "Connected" state when connection status is accepted', async ({ page }) => {
    // Override the connection status to 'accepted'
    await page.route(`**/api/connections/status/${PROFILE_USER._id}**`, (route) =>
      route.fulfill({ json: { status: 'accepted', connectionId: 'conn-001' } })
    );

    await goToUserProfile(page);
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 6000 });
  });

  test('shows "Message" button', async ({ page }) => {
    await goToUserProfile(page);
    await expect(page.locator('button:has-text("Message")')).toBeVisible();
  });

  test('shows "Rate" button', async ({ page }) => {
    await goToUserProfile(page);
    await expect(page.locator('button:has-text("Rate")')).toBeVisible();
  });

  test('"Rate" button opens the rating modal', async ({ page }) => {
    await goToUserProfile(page);
    await page.click('button:has-text("Rate")');
    // RatingModal shows a Cancel button when open
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible({ timeout: 5000 });
  });

  // ── Bio ─────────────────────────────────────────────────────────────────────

  test('shows bio text when provided', async ({ page }) => {
    await goToUserProfile(page);
    await expect(page.locator(`text=${PROFILE_USER.bio}`)).toBeVisible();
  });

  // ── Back button ─────────────────────────────────────────────────────────────

  test('back button navigates away from the profile view', async ({ page }) => {
    await goToUserProfile(page);
    await page.locator('xpath=//h2[text()="Profile"]/../button').click();
    // onBack resets currentView → returns to main dashboard tab
    await expect(page.locator('h1:has-text("Taylor Kim")')).not.toBeVisible({ timeout: 6000 });
  });
});
