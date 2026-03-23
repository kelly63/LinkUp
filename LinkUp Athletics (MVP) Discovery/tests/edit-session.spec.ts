import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard, MOCK_OPEN_SESSIONS } from './helpers/mocks';

const OPEN_SESSION = MOCK_OPEN_SESSIONS[0];

test.describe('Edit session', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);

    // SessionDetailsView: accept/cancel actions (not needed but stub to avoid 404s)
    await page.route(`**/api/sessions/${OPEN_SESSION._id}/accept**`, (route) =>
      route.fulfill({ json: { session: OPEN_SESSION } })
    );
    await page.route(`**/api/sessions/${OPEN_SESSION._id}`, (route) => {
      if (route.request().method() === 'PUT') {
        return route.fulfill({ json: { session: { ...OPEN_SESSION, location: 'Updated Park' } } });
      }
      return route.fulfill({ json: { session: OPEN_SESSION } });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  async function navigateToSessionDetails(page: Parameters<typeof test.beforeEach>[0]['page'] extends (pg: infer P) => any ? P : never) {
    await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
    await page.click('button:has-text("View All")');
    await page.waitForSelector('button:has-text("View Details")', { timeout: 8000 });
    await page.click('button:has-text("View Details")');
    await page.waitForSelector('button:has-text("Edit Session")', { timeout: 8000 });
  }

  test('Edit Session button opens the edit form', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await expect(page.locator('text=Edit Session')).toBeVisible();
    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
  });

  test('Save Changes calls PUT /api/sessions/:id', async ({ page }) => {
    const updateRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/sessions/${OPEN_SESSION._id}`) &&
        req.method() === 'PUT'
    );

    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 8000 });

    // Edit the location field
    const locationInput = page.locator('input[placeholder="Enter location"]');
    await locationInput.fill('Updated Park');

    await page.click('button:has-text("Save Changes")');

    const req = await updateRequest;
    expect(req.url()).toContain(`/api/sessions/${OPEN_SESSION._id}`);
    expect(req.method()).toBe('PUT');
  });

  test('Save Changes sends updated fields in request body', async ({ page }) => {
    const updateRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/sessions/${OPEN_SESSION._id}`) &&
        req.method() === 'PUT'
    );

    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 8000 });

    await page.locator('input[placeholder="Enter location"]').fill('Griffith Park Fields');
    await page.click('button:has-text("Save Changes")');

    const req = await updateRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.location).toBe('Griffith Park Fields');
  });

  test('Cancel button exits the edit form without saving', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Cancel")', { timeout: 8000 });
    await page.click('button:has-text("Cancel")');

    // Cancel calls onBack() → resets currentView → returns to dashboard
    // The edit form (Save Changes) should no longer be visible
    await expect(page.locator('button:has-text("Save Changes")')).not.toBeVisible({ timeout: 8000 });
  });
});
