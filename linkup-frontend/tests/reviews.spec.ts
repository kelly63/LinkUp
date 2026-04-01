import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket } from './helpers/mocks';

// ─── fixtures ───────────────────────────────────────────────────────────────

const MOCK_RATING = {
  _id: 'rating-101',
  overallRating: 5,
  rater: { _id: 'rater-001', name: 'Test Rater', avatar: 'TR' },
  sport: 'Baseball',
  createdAt: new Date().toISOString(),
};

// ─── helpers ────────────────────────────────────────────────────────────────

async function navigateToReviews(page: Page) {
  await seedAuth(page);
  await blockWebSocket(page);
  await page.route('**/api/sessions/my**', (route) =>
    route.fulfill({ json: { sessions: [] } })
  );
  await page.route('**/api/connections/pending**', (route) =>
    route.fulfill({ json: { requests: [] } })
  );
  await page.route('**/api/ratings/received**', (route) =>
    route.fulfill({ json: { ratings: [MOCK_RATING] } })
  );
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Wait for a rating_received activity item to appear then click it
  await page.waitForSelector('text=Rating Received', { timeout: 8000 });
  await page.click('text=Rating Received');
  await expect(
    page.locator('h2:has-text("Session Reviews")')
  ).toBeVisible({ timeout: 6000 });
}

// ─── tests ──────────────────────────────────────────────────────────────────

test.describe('ReviewsView', () => {
  // ── navigation ────────────────────────────────────────────────────────────

  test.describe('navigation', () => {
    test('navigates here via a rating_received dashboard activity', async ({ page }) => {
      await navigateToReviews(page);
      // already verified in the helper – just confirming the journey works
    });

    test('also reachable via "View All" when activity list exceeds 3', async ({ page }) => {
      await seedAuth(page);
      await blockWebSocket(page);
      // 2 pending + 2 ratings = 4 activities > DISPLAYED_ACTIVITY_COUNT(3)
      const pending = Array.from({ length: 2 }, (_, i) => ({
        _id: `req-${i}`,
        connectionId: `conn-${i}`,
        user: { _id: `u-${i}`, name: `User ${i}`, sport: 'Baseball', skillLevel: 'NCAA D1' },
        createdAt: new Date().toISOString(),
      }));
      const ratings = Array.from({ length: 2 }, (_, i) => ({
        _id: `rating-${i}`,
        overallRating: 5,
        rater: { name: `Rater ${i}` },
        createdAt: new Date().toISOString(),
      }));
      await page.route('**/api/sessions/my**', (route) =>
        route.fulfill({ json: { sessions: [] } })
      );
      await page.route('**/api/connections/pending**', (route) =>
        route.fulfill({ json: { requests: pending } })
      );
      await page.route('**/api/ratings/received**', (route) =>
        route.fulfill({ json: { ratings } })
      );
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=View All', { timeout: 8000 });
      await page.click('text=View All');
      await expect(
        page.locator('h2:has-text("Session Reviews")')
      ).toBeVisible({ timeout: 6000 });
    });

    test('back button returns to the previous view', async ({ page }) => {
      await navigateToReviews(page);
      // Back button is a sibling of the div containing the h2 heading
      await page
        .locator('xpath=//h2[text()="Session Reviews"]/../../button')
        .click();
      await expect(
        page.locator('h2:has-text("Session Reviews")')
      ).not.toBeVisible({ timeout: 4000 });
    });
  });

  // ── header ────────────────────────────────────────────────────────────────

  test.describe('header', () => {
    test('shows "Session Reviews" heading', async ({ page }) => {
      await navigateToReviews(page);
      await expect(page.locator('h2:has-text("Session Reviews")')).toBeVisible();
    });

    test('shows "Your completed sessions" subtitle', async ({ page }) => {
      await navigateToReviews(page);
      await expect(page.locator('text=Your completed sessions')).toBeVisible();
    });
  });

  // ── all four cards rendered ───────────────────────────────────────────────

  test.describe('all four session cards are present', () => {
    for (const name of [
      'Sarah Johnson',
      'Alex Chen',
      'Marcus Thompson',
      'Coach Williams',
    ]) {
      test(`shows ${name}'s card`, async ({ page }) => {
        await navigateToReviews(page);
        await expect(page.locator(`h3:has-text("${name}")`)).toBeVisible();
      });
    }

    test('renders exactly 4 partner name headings', async ({ page }) => {
      await navigateToReviews(page);
      await expect(page.locator('h3.font-medium')).toHaveCount(4);
    });
  });

  // ── unrated card (Sarah Johnson) ─────────────────────────────────────────

  test.describe('unrated card — Sarah Johnson', () => {
    test('shows "Not rated yet" placeholder', async ({ page }) => {
      await navigateToReviews(page);
      await expect(page.locator('text=Not rated yet')).toBeVisible();
    });

    test('shows "Rate This Session" button', async ({ page }) => {
      await navigateToReviews(page);
      await expect(
        page.locator('button:has-text("Rate This Session")')
      ).toBeVisible();
    });

    test('"Rate This Session" navigates to RatingView', async ({ page }) => {
      await navigateToReviews(page);
      await page.click('button:has-text("Rate This Session")');
      // RatingView renders "Rate Your Session" heading and partner-name prompt
      await expect(
        page.locator('text=How was your session with Sarah Johnson?')
      ).toBeVisible({ timeout: 4000 });
    });

    test('shows partner name prompt in the "Rate This Session" flow', async ({ page }) => {
      await navigateToReviews(page);
      await page.click('button:has-text("Rate This Session")');
      await expect(
        page.locator('h2:has-text("Rate Your Session")')
      ).toBeVisible({ timeout: 4000 });
    });
  });

  // ── rated card content ────────────────────────────────────────────────────

  test.describe('rated card content', () => {
    test('shows "Your Rating" label on rated cards', async ({ page }) => {
      await navigateToReviews(page);
      await expect(page.locator('text=Your Rating').first()).toBeVisible();
    });

    test('shows "Would train again" badge on rated cards', async ({ page }) => {
      await navigateToReviews(page);
      await expect(
        page.locator('text=Would train again').first()
      ).toBeVisible();
    });

    test('shows category rating labels', async ({ page }) => {
      await navigateToReviews(page);
      await expect(page.locator('text=Skill Level').first()).toBeVisible();
      await expect(page.locator('text=Punctuality').first()).toBeVisible();
      await expect(page.locator('text=Communication').first()).toBeVisible();
      await expect(page.locator('text=Attitude').first()).toBeVisible();
    });

    test('Alex Chen card — shows 5-star feedback text', async ({ page }) => {
      await navigateToReviews(page);
      await expect(
        page.locator('text=Great session! Alex was punctual')
      ).toBeVisible();
    });

    test('Marcus Thompson card — shows 4-star feedback text', async ({ page }) => {
      await navigateToReviews(page);
      await expect(
        page.locator('text=Solid practice session. Marcus')
      ).toBeVisible();
    });

    test('Coach Williams card — shows coaching feedback text', async ({ page }) => {
      await navigateToReviews(page);
      await expect(page.locator('text=Excellent coaching!')).toBeVisible();
    });

    test('shows "Completed" date on rated cards', async ({ page }) => {
      await navigateToReviews(page);
      await expect(page.locator('text=Completed').first()).toBeVisible();
    });
  });

  // ── session meta ─────────────────────────────────────────────────────────

  test.describe('session details on each card', () => {
    test('shows session date for Sarah Johnson (Jan 26, 2026)', async ({ page }) => {
      await navigateToReviews(page);
      await expect(page.locator('text=Jan 26, 2026')).toBeVisible();
    });

    test('shows session location for Sarah Johnson (UCLA Practice Field)', async ({
      page,
    }) => {
      await navigateToReviews(page);
      await expect(page.locator('text=UCLA Practice Field').first()).toBeVisible();
    });

    test('shows session duration and type for Sarah Johnson', async ({ page }) => {
      await navigateToReviews(page);
      await expect(page.locator('text=2 hours').first()).toBeVisible();
      await expect(page.locator('text=Pitching Session')).toBeVisible();
    });
  });
});
