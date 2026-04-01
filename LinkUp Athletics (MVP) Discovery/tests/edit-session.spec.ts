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

  // ── Form rendering ──────────────────────────────────────────────────────────

  test('edit form shows "Edit Session" heading', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('h2:has-text("Edit Session")', { timeout: 8000 });
    await expect(page.locator('h2:has-text("Edit Session")')).toBeVisible();
  });

  test('edit form shows sport name in the header subtitle', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    // Header shows "{sport} Practice" — OPEN_SESSION.sport is "Baseball"
    await expect(page.locator('text=Baseball Practice')).toBeVisible({ timeout: 8000 });
  });

  test('edit form shows Date, Time, Duration, Location, and Notes fields', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 8000 });
    await expect(page.locator('label:has-text("Date")').first()).toBeVisible();
    await expect(page.locator('label:has-text("Time")').first()).toBeVisible();
    await expect(page.locator('label:has-text("Duration")').first()).toBeVisible();
    await expect(page.locator('label:has-text("Location")').first()).toBeVisible();
    await expect(page.locator('label:has-text("Session Notes")')).toBeVisible();
  });

  test('date field is pre-filled from the session', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 8000 });
    // OPEN_SESSION.date is 'Apr 01, 2026'
    const dateInput = page.locator('input').first();
    await expect(dateInput).toHaveValue(OPEN_SESSION.date);
  });

  test('time field is pre-filled from the session', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 8000 });
    // OPEN_SESSION.time is '9:00 AM'
    const timeInput = page.locator('input').nth(1);
    await expect(timeInput).toHaveValue(OPEN_SESSION.time);
  });

  test('location field is pre-filled from the session', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 8000 });
    await expect(page.locator('input[placeholder="Enter location"]')).toHaveValue(OPEN_SESSION.location);
  });

  test('duration select defaults to "2 hours"', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 8000 });
    await expect(page.locator('select')).toHaveValue('2 hours');
  });

  test('duration select includes all five options', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 8000 });
    const select = page.locator('select');
    await expect(select.locator('option:has-text("1 hour")')).toBeAttached();
    await expect(select.locator('option:has-text("1.5 hours")')).toBeAttached();
    await expect(select.locator('option:has-text("2 hours")')).toBeAttached();
    await expect(select.locator('option:has-text("2.5 hours")')).toBeAttached();
    await expect(select.locator('option:has-text("3 hours")')).toBeAttached();
  });

  test('editing time sends updated time in the request body', async ({ page }) => {
    const updateRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/sessions/${OPEN_SESSION._id}`) && req.method() === 'PUT'
    );

    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 8000 });

    const timeInput = page.locator('input').nth(1);
    await timeInput.fill('2:00 PM');
    await page.click('button:has-text("Save Changes")');

    const req = await updateRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.time).toBe('2:00 PM');
  });

  test('editing duration sends updated duration in the request body', async ({ page }) => {
    const updateRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/sessions/${OPEN_SESSION._id}`) && req.method() === 'PUT'
    );

    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 8000 });

    await page.locator('select').selectOption('1.5 hours');
    await page.click('button:has-text("Save Changes")');

    const req = await updateRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.duration).toBe('1.5 hours');
  });

  test('editing notes sends updated notes in the request body', async ({ page }) => {
    const updateRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/sessions/${OPEN_SESSION._id}`) && req.method() === 'PUT'
    );

    await navigateToSessionDetails(page);
    await page.click('button:has-text("Edit Session")');
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 8000 });

    await page.locator('textarea').fill('Updated notes for this session.');
    await page.click('button:has-text("Save Changes")');

    const req = await updateRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.notes).toBe('Updated notes for this session.');
  });
});
