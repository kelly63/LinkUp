import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard, mockRatingsSubmit } from './helpers/mocks';

// ─── navigation helper ───────────────────────────────────────────────────────

/** Navigate to RatingView via My Sessions → Past tab → Rate button */
async function openRatingForm(page: Page) {
  await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
  await page.click('button:has-text("View All")');
  await page.click('button:has-text("Past")');
  await page.click('button:has-text("Rate")');
  await expect(page.locator('h2:has-text("Rate Your Session")')).toBeVisible({ timeout: 6000 });
}

/** Click the nth overall star (1-5) in the large star row */
async function clickOverallStar(page: Page, star: number) {
  // Overall stars are the first group of 5 large star buttons (w-10 h-10)
  const overallStars = page.locator('button').filter({ has: page.locator('svg.w-10') });
  await overallStars.nth(star - 1).click();
}

/** Click the nth star in a named category row (Skill Level / Punctuality / Communication / Attitude) */
async function clickCategoryStar(page: Page, label: string, star: number) {
  // Go from the label span up to its flex-justify-between ancestor row, then find star buttons
  const row = page.locator(
    `xpath=//span[normalize-space(text())="${label}"]/ancestor::div[contains(@class,"justify-between")][1]`
  );
  await row.locator('button').nth(star - 1).click();
}

/** Locate the "Would you train again?" section's Yes or No button */
function wouldTrainButton(page: Page, label: 'Yes' | 'No') {
  return page
    .locator('div.rounded-2xl')
    .filter({ has: page.locator('h3:has-text("Would you train")') })
    .locator(`button:has-text("${label}")`);
}

// ─── tests ───────────────────────────────────────────────────────────────────

test.describe('RatingView', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    await mockRatingsSubmit(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  // ── navigation ─────────────────────────────────────────────────────────────

  test.describe('navigation', () => {
    test('reaches the Rate button via My Sessions → Past tab', async ({ page }) => {
      await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
      await page.click('button:has-text("View All")');
      await page.click('button:has-text("Past")');
      await expect(page.locator('button:has-text("Rate")')).toBeVisible();
    });

    test('clicking Rate opens RatingView', async ({ page }) => {
      await openRatingForm(page);
    });

    test('also reachable from ReviewsView "Rate This Session" button', async ({ page }) => {
      // Need a rating_received activity to navigate to ReviewsView
      await page.route('**/api/ratings/received**', (route) =>
        route.fulfill({
          json: {
            ratings: [
              {
                _id: 'r1',
                overallRating: 5,
                rater: { name: 'Tester' },
                createdAt: new Date().toISOString(),
              },
            ],
          },
        })
      );
      await page.waitForSelector('text=Rating Received', { timeout: 8000 });
      await page.click('text=Rating Received');
      await expect(page.locator('h2:has-text("Session Reviews")')).toBeVisible({ timeout: 6000 });
      await page.click('button:has-text("Rate This Session")');
      await expect(page.locator('h2:has-text("Rate Your Session")')).toBeVisible({ timeout: 6000 });
    });

    test('Cancel button returns to the previous view', async ({ page }) => {
      await openRatingForm(page);
      await page.click('button:has-text("Cancel")');
      await expect(page.locator('h2:has-text("Rate Your Session")')).not.toBeVisible({ timeout: 4000 });
    });

    test('back arrow in header returns to the previous view', async ({ page }) => {
      await openRatingForm(page);
      await page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') }).click();
      await expect(page.locator('h2:has-text("Rate Your Session")')).not.toBeVisible({ timeout: 4000 });
    });
  });

  // ── header ─────────────────────────────────────────────────────────────────

  test.describe('header', () => {
    test('shows "Rate Your Session" heading', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('h2:has-text("Rate Your Session")')).toBeVisible();
    });

    test('shows partner name in the partner card', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('h3:has-text("Coach Rivera")').first()).toBeVisible();
    });

    test('shows partner position and sport', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('text=Coach • Baseball')).toBeVisible();
    });

    test('shows "Coach" type badge', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('text=Coach').first()).toBeVisible();
    });

    test('shows session date in the header card', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator(`text=${new Date().toLocaleDateString()}`).or(
        page.locator('text=Mar 10, 2026')
      ).first()).toBeVisible();
    });

    test('shows session duration in the header card', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('text=2 hours')).toBeVisible();
    });
  });

  // ── overall rating section ─────────────────────────────────────────────────

  test.describe('overall rating', () => {
    test('shows "Overall Experience" section heading', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('h3:has-text("Overall Experience")')).toBeVisible();
    });

    test('shows "Tap to rate" label before any star is selected', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('text=Tap to rate')).toBeVisible();
    });

    test('selecting 1 star shows "Poor" label', async ({ page }) => {
      await openRatingForm(page);
      await clickOverallStar(page, 1);
      await expect(page.locator('text=Poor')).toBeVisible();
    });

    test('selecting 3 stars shows "Good" label', async ({ page }) => {
      await openRatingForm(page);
      await clickOverallStar(page, 3);
      await expect(page.locator('text=Good')).toBeVisible();
    });

    test('selecting 5 stars shows "Excellent" label', async ({ page }) => {
      await openRatingForm(page);
      await clickOverallStar(page, 5);
      await expect(page.locator('text=Excellent')).toBeVisible();
    });

    test('selecting 4 stars shows "Very Good" label', async ({ page }) => {
      await openRatingForm(page);
      await clickOverallStar(page, 4);
      await expect(page.locator('text=Very Good')).toBeVisible();
    });
  });

  // ── category ratings ───────────────────────────────────────────────────────

  test.describe('category ratings', () => {
    test('shows "Rate Specific Areas" section heading', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('h3:has-text("Rate Specific Areas")')).toBeVisible();
    });

    test('shows all four category labels', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('text=Skill Level').first()).toBeVisible();
      await expect(page.locator('text=Punctuality').first()).toBeVisible();
      await expect(page.locator('text=Communication').first()).toBeVisible();
      await expect(page.locator('text=Attitude').first()).toBeVisible();
    });

    test('can select Skill Level stars independently', async ({ page }) => {
      await openRatingForm(page);
      await clickCategoryStar(page, 'Skill Level', 4);
      // Overall should still say "Tap to rate" (unchanged)
      await expect(page.locator('text=Tap to rate')).toBeVisible();
    });

    test('can select Punctuality stars', async ({ page }) => {
      await openRatingForm(page);
      await clickCategoryStar(page, 'Punctuality', 5);
      await expect(page.locator('text=Tap to rate')).toBeVisible();
    });
  });

  // ── would train again ──────────────────────────────────────────────────────

  test.describe('"Would Train Again" toggle', () => {
    test('defaults to "Yes" selected (emerald active style)', async ({ page }) => {
      await openRatingForm(page);
      await expect(wouldTrainButton(page, 'Yes')).toHaveClass(/border-emerald-500/);
    });

    test('clicking "No" switches the selection', async ({ page }) => {
      await openRatingForm(page);
      await wouldTrainButton(page, 'No').click();
      await expect(wouldTrainButton(page, 'No')).toHaveClass(/border-red-500/);
    });

    test('clicking "Yes" after "No" switches back', async ({ page }) => {
      await openRatingForm(page);
      await wouldTrainButton(page, 'No').click();
      await wouldTrainButton(page, 'Yes').click();
      await expect(wouldTrainButton(page, 'Yes')).toHaveClass(/border-emerald-500/);
    });
  });

  // ── feedback textarea ──────────────────────────────────────────────────────

  test.describe('feedback textarea', () => {
    test('shows "Additional Feedback" section heading', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('h3:has-text("Additional Feedback")')).toBeVisible();
    });

    test('textarea accepts typed input', async ({ page }) => {
      await openRatingForm(page);
      await page.fill('textarea', 'Great session overall!');
      await expect(page.locator('textarea')).toHaveValue('Great session overall!');
    });

    test('character counter updates as user types', async ({ page }) => {
      await openRatingForm(page);
      await page.fill('textarea', 'Hello');
      await expect(page.locator('text=5/500')).toBeVisible();
    });

    test('shows 0/500 counter initially', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('text=0/500')).toBeVisible();
    });
  });

  // ── submit button state ────────────────────────────────────────────────────

  test.describe('Submit Rating button', () => {
    test('is disabled when no overall star is selected', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('button:has-text("Submit Rating")')).toBeDisabled();
    });

    test('becomes enabled after selecting at least one overall star', async ({ page }) => {
      await openRatingForm(page);
      await clickOverallStar(page, 3);
      await expect(page.locator('button:has-text("Submit Rating")')).toBeEnabled();
    });
  });

  // ── submission flow ────────────────────────────────────────────────────────

  test.describe('submission', () => {
    test('submitting calls POST /api/ratings with correct payload', async ({ page }) => {
      const ratingRequest = page.waitForRequest(
        (req) => req.url().includes('/api/ratings') && req.method() === 'POST'
      );

      await openRatingForm(page);
      await clickOverallStar(page, 5);
      await page.click('button:has-text("Submit Rating")');

      const req = await ratingRequest;
      const body = JSON.parse(req.postData() || '{}');
      expect(body.rateeId).toBe('coach-001');
      expect(body.overallRating).toBe(5);
    });

    test('category ratings are included in the submitted payload', async ({ page }) => {
      const ratingRequest = page.waitForRequest(
        (req) => req.url().includes('/api/ratings') && req.method() === 'POST'
      );

      await openRatingForm(page);
      await clickOverallStar(page, 4);
      await clickCategoryStar(page, 'Punctuality', 5);
      await page.click('button:has-text("Submit Rating")');

      const req = await ratingRequest;
      const body = JSON.parse(req.postData() || '{}');
      expect(body.categories?.punctuality).toBe(5);
    });

    test('written feedback is included in the submitted payload', async ({ page }) => {
      const ratingRequest = page.waitForRequest(
        (req) => req.url().includes('/api/ratings') && req.method() === 'POST'
      );

      await openRatingForm(page);
      await clickOverallStar(page, 5);
      await page.fill('textarea', 'Outstanding partner!');
      await page.click('button:has-text("Submit Rating")');

      const req = await ratingRequest;
      const body = JSON.parse(req.postData() || '{}');
      expect(body.feedback).toBe('Outstanding partner!');
    });

    test('wouldTrainAgain defaults to true in the payload', async ({ page }) => {
      const ratingRequest = page.waitForRequest(
        (req) => req.url().includes('/api/ratings') && req.method() === 'POST'
      );

      await openRatingForm(page);
      await clickOverallStar(page, 4);
      await page.click('button:has-text("Submit Rating")');

      const req = await ratingRequest;
      const body = JSON.parse(req.postData() || '{}');
      expect(body.wouldTrainAgain).toBe(true);
    });

    test('wouldTrainAgain is false when "No" is selected', async ({ page }) => {
      const ratingRequest = page.waitForRequest(
        (req) => req.url().includes('/api/ratings') && req.method() === 'POST'
      );

      await openRatingForm(page);
      await clickOverallStar(page, 3);
      await wouldTrainButton(page, 'No').click();
      await page.click('button:has-text("Submit Rating")');

      const req = await ratingRequest;
      const body = JSON.parse(req.postData() || '{}');
      expect(body.wouldTrainAgain).toBe(false);
    });

    test('success modal appears after submission', async ({ page }) => {
      await openRatingForm(page);
      await clickOverallStar(page, 5);
      await page.click('button:has-text("Submit Rating")');
      await expect(page.locator('h3:has-text("Rating Submitted!")')).toBeVisible({ timeout: 8000 });
    });

    test('success modal shows "Done" button', async ({ page }) => {
      await openRatingForm(page);
      await clickOverallStar(page, 5);
      await page.click('button:has-text("Submit Rating")');
      await expect(page.locator('button:has-text("Done")')).toBeVisible({ timeout: 8000 });
    });

    test('"Done" closes the success modal and navigates back', async ({ page }) => {
      await openRatingForm(page);
      await clickOverallStar(page, 5);
      await page.click('button:has-text("Submit Rating")');
      await page.locator('button:has-text("Done")').click();
      await expect(page.locator('h2:has-text("Rate Your Session")')).not.toBeVisible({ timeout: 4000 });
    });
  });

  // ── privacy notice ─────────────────────────────────────────────────────────

  test.describe('privacy notice', () => {
    test('shows a Privacy Note about admin review', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('text=Privacy Note')).toBeVisible();
    });

    test('privacy notice mentions the partner name', async ({ page }) => {
      await openRatingForm(page);
      await expect(page.locator('text=Coach Rivera').last()).toBeVisible();
    });
  });
});
