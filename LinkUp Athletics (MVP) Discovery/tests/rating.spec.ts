import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard, mockRatingsSubmit } from './helpers/mocks';

test.describe('Rating submission', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    await mockRatingsSubmit(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('reaches the Rate button via My Sessions → Past tab', async ({ page }) => {
    // Dashboard loads with 3 open sessions → "View All" button appears
    await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
    await page.click('button:has-text("View All")');

    // Now in MySessionsView — switch to "Past" tab
    await page.click('button:has-text("Past")');

    // Completed session card with "Rate" button should be visible
    await expect(page.locator('button:has-text("Rate")')).toBeVisible();
  });

  test('clicking Rate opens the rating form', async ({ page }) => {
    await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
    await page.click('button:has-text("View All")');
    await page.click('button:has-text("Past")');
    await page.click('button:has-text("Rate")');

    // RatingView should show the partner's name in the heading
    await expect(page.locator('h3:has-text("Coach Rivera")').first()).toBeVisible();
  });

  test('submitting a rating calls POST /api/ratings', async ({ page }) => {
    // Capture the ratings API request
    const ratingRequest = page.waitForRequest(
      (req) => req.url().includes('/api/ratings') && req.method() === 'POST'
    );

    await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
    await page.click('button:has-text("View All")');
    await page.click('button:has-text("Past")');
    await page.click('button:has-text("Rate")');

    // Select 5 overall stars — click the 5th star button in the "Overall" section
    // Stars are rendered as buttons in groups; click 5th star in the first (overall) group
    const starButtons = page.locator('button').filter({ has: page.locator('svg') });
    // The overall stars are the first 5 star-shaped buttons in the form
    await starButtons.nth(4).click(); // 5th star (0-indexed)

    // Submit
    await page.click('button:has-text("Submit Rating")');

    const req = await ratingRequest;
    const body = JSON.parse(req.postData() || '{}');

    expect(body.rateeId).toBe('coach-001');
    expect(body.overallRating).toBeGreaterThan(0);
  });

  test('success modal appears after submission', async ({ page }) => {
    await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
    await page.click('button:has-text("View All")');
    await page.click('button:has-text("Past")');
    await page.click('button:has-text("Rate")');

    const starButtons = page.locator('button').filter({ has: page.locator('svg') });
    await starButtons.nth(4).click();

    await page.click('button:has-text("Submit Rating")');

    // Success modal with "Done" button
    await expect(page.locator('button:has-text("Done")')).toBeVisible({ timeout: 8000 });
  });

  test('Submit Rating button is disabled when no stars selected', async ({ page }) => {
    await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
    await page.click('button:has-text("View All")');
    await page.click('button:has-text("Past")');
    await page.click('button:has-text("Rate")');

    await expect(page.locator('button:has-text("Submit Rating")')).toBeDisabled();
  });
});
