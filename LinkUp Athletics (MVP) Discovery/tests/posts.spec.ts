import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard } from './helpers/mocks';

const AVAILABLE_SESSION = {
  _id: 'avail-001',
  title: 'Baseball Practice',
  sport: 'Baseball',
  partnerRole: 'Catcher',
  date: 'Apr 15, 2026',
  time: '9:00 AM',
  location: 'Lincoln Park Fields',
  duration: '2 hours',
  skillLevelRequired: 'NCAA D1',
  status: 'open',
  postedBy: {
    _id: 'user-999',
    name: 'Marcus Webb',
    avatar: 'MW',
    sport: 'Baseball',
    position: 'Pitcher',
    skillLevel: 'NCAA D1',
  },
};

async function goToPostTab(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
  await page.locator('button').filter({ has: page.locator('span:has-text("LinkUp")') }).click();
  await page.waitForSelector('text=Post a Need', { timeout: 6000 });
}

test.describe('PostView', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);

    await page.route('**/api/sessions/available**', (route) => {
      route.fulfill({
        json: {
          sessions: [AVAILABLE_SESSION],
          total: 1,
          page: 1,
          pages: 1,
        },
      });
    });

    await page.route('**/api/sessions', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          json: { session: { _id: 'new-session-001', ...AVAILABLE_SESSION } },
        });
      }
      return route.continue();
    });
  });

  // ── Navigation & header ──────────────────────────────────────────────────────

  test('navigating to LinkUp tab renders the view', async ({ page }) => {
    await goToPostTab(page);
    await expect(page.locator('h2:has-text("Sessions")')).toBeVisible();
  });

  test('shows "Post a Need" and "Find Sessions" mode toggle buttons', async ({ page }) => {
    await goToPostTab(page);
    await expect(page.locator('button:has-text("Post a Need")')).toBeVisible();
    await expect(page.locator('button:has-text("Find Sessions")')).toBeVisible();
  });

  // ── Post a Need (default mode) ───────────────────────────────────────────────

  test('default mode is "Post a Need"', async ({ page }) => {
    await goToPostTab(page);
    await expect(page.locator('text=Sport for Session')).toBeVisible();
  });

  test('shows "Sport for Session" label and dropdown', async ({ page }) => {
    await goToPostTab(page);
    await expect(page.locator('label:has-text("Sport for Session")')).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('shows "Partner Role Needed" section', async ({ page }) => {
    await goToPostTab(page);
    await expect(page.locator('text=Partner Role Needed')).toBeVisible();
  });

  test('shows baseball partner role buttons by default', async ({ page }) => {
    await goToPostTab(page);
    await expect(page.locator('button:has-text("Catcher")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Pitcher (RHP)")').first()).toBeVisible();
  });

  test('can select a partner role', async ({ page }) => {
    await goToPostTab(page);
    const catcherBtn = page.locator('button:has-text("Catcher")').first();
    await catcherBtn.click();
    // Selected buttons get dark background styling
    await expect(catcherBtn).toHaveClass(/bg-blue-900/);
  });

  test('shows "POST SESSION" submit button', async ({ page }) => {
    await goToPostTab(page);
    await expect(page.locator('button:has-text("POST SESSION")')).toBeVisible();
  });

  test('POST SESSION calls POST /api/sessions with correct data', async ({ page }) => {
    const createRequest = page.waitForRequest(
      (req) => req.url().includes('/api/sessions') && req.method() === 'POST'
    );

    await goToPostTab(page);

    // Select a partner role (required)
    await page.locator('button:has-text("Catcher")').first().click();
    // Mark date as flexible (required if no dates added)
    await page.locator('label').filter({ hasText: 'Flexible' }).first().click();
    // Submit
    await page.click('button:has-text("POST SESSION")');

    const req = await createRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.sport).toBe('Baseball');
    expect(req.method()).toBe('POST');
  });

  test('shows "Partner Skill Level" section', async ({ page }) => {
    await goToPostTab(page);
    await expect(page.locator('text=Partner Skill Level')).toBeVisible();
  });

  test('shows Session Notes textarea', async ({ page }) => {
    await goToPostTab(page);
    await expect(page.locator('textarea')).toBeVisible();
  });

  // ── Find Sessions mode ───────────────────────────────────────────────────────

  test('switching to Find Sessions calls GET /api/sessions/available', async ({ page }) => {
    const findRequest = page.waitForRequest(
      (req) => req.url().includes('/api/sessions/available') && req.method() === 'GET'
    );

    await goToPostTab(page);
    await page.click('button:has-text("Find Sessions")');

    await findRequest; // assert the request was made
  });

  test('Find Sessions shows session cards after loading', async ({ page }) => {
    await goToPostTab(page);
    await page.click('button:has-text("Find Sessions")');
    await expect(page.locator('h4:has-text("Baseball Practice")')).toBeVisible({ timeout: 8000 });
  });

  test('Find Sessions shows "Seeking" label on session card', async ({ page }) => {
    await goToPostTab(page);
    await page.click('button:has-text("Find Sessions")');
    await expect(page.locator('text=Catcher').first()).toBeVisible({ timeout: 8000 });
  });

  test('Find Sessions shows "VIEW & ACCEPT" button on each card', async ({ page }) => {
    await goToPostTab(page);
    await page.click('button:has-text("Find Sessions")');
    await expect(page.locator('button:has-text("VIEW & ACCEPT")')).toBeVisible({ timeout: 8000 });
  });

  test('Find Sessions shows search input field', async ({ page }) => {
    await goToPostTab(page);
    await page.click('button:has-text("Find Sessions")');
    await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('clicking VIEW & ACCEPT opens AvailableSessionView', async ({ page }) => {
    await goToPostTab(page);
    await page.click('button:has-text("Find Sessions")');
    await page.waitForSelector('button:has-text("VIEW & ACCEPT")', { timeout: 8000 });
    await page.click('button:has-text("VIEW & ACCEPT")');
    // AvailableSessionView shows a "Seeking: ..." badge
    await expect(page.locator('text=Seeking:')).toBeVisible({ timeout: 6000 });
  });

  test('back button on AvailableSessionView returns to Find Sessions list', async ({ page }) => {
    await goToPostTab(page);
    await page.click('button:has-text("Find Sessions")');
    await page.waitForSelector('button:has-text("VIEW & ACCEPT")', { timeout: 8000 });
    await page.click('button:has-text("VIEW & ACCEPT")');
    await page.waitForSelector('text=Seeking:', { timeout: 6000 });
    // AvailableSessionView back button has backdrop-blur-sm class
    await page.locator('button.backdrop-blur-sm').click();
    await expect(page.locator('button:has-text("VIEW & ACCEPT")')).toBeVisible({ timeout: 6000 });
  });
});
