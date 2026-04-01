import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard } from './helpers/mocks';

// ─── helper ─────────────────────────────────────────────────────────────────

async function navigateToReceivedRatings(page: Page) {
  await seedAuth(page);
  await blockWebSocket(page);
  await mockDashboard(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Upcoming Sessions', { timeout: 8000 });
  // Profile tab is always last in BottomTabBar
  await page.locator('button:has-text("Profile")').last().click();
  // Click the "User Rating" stat box — navigates to ReceivedRatingsView
  await page.locator('text=User Rating').click();
  await expect(
    page.locator('h2:has-text("My Ratings")')
  ).toBeVisible({ timeout: 6000 });
}

// ─── tests ──────────────────────────────────────────────────────────────────

test.describe('ReceivedRatingsView', () => {
  // ── navigation ────────────────────────────────────────────────────────────

  test.describe('navigation', () => {
    test('navigates here via Profile tab → User Rating stat box', async ({
      page,
    }) => {
      await navigateToReceivedRatings(page);
      // confirmed by the helper
    });

    test('back button returns to the Profile view', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await page
        .locator('xpath=//h2[text()="My Ratings"]/../../button')
        .click();
      await expect(
        page.locator('h2:has-text("My Ratings")')
      ).not.toBeVisible({ timeout: 4000 });
    });
  });

  // ── header ────────────────────────────────────────────────────────────────

  test.describe('header', () => {
    test('shows "My Ratings" heading', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await expect(page.locator('h2:has-text("My Ratings")')).toBeVisible();
    });

    test('shows "Ratings received from others" subtitle', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await expect(
        page.locator('text=Ratings received from others')
      ).toBeVisible();
    });

    test('shows "Overall Rating" label in summary banner', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await expect(page.locator('text=Overall Rating')).toBeVisible();
    });

    test('shows computed average "4.8" (5 approved ratings: 5+5+5+5+4)', async ({
      page,
    }) => {
      await navigateToReceivedRatings(page);
      await expect(page.locator('text=4.8')).toBeVisible();
    });

    test('shows "Approved Reviews" label in summary banner', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await expect(page.locator('text=Approved Reviews')).toBeVisible();
    });
  });

  // ── filter tabs ───────────────────────────────────────────────────────────

  test.describe('filter tabs', () => {
    test('default active tab is Approved (has bg-blue-600 class)', async ({
      page,
    }) => {
      await navigateToReceivedRatings(page);
      await expect(
        page.locator('button:has-text("Approved")')
      ).toHaveClass(/bg-blue-600/);
    });

    test('Approved tab shows 5 reviewer cards', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await expect(page.locator('h3.font-medium')).toHaveCount(5);
    });

    test('switching to Pending tab shows 2 reviewer cards', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await page.click('button:has-text("Pending")');
      await expect(page.locator('h3.font-medium')).toHaveCount(2);
    });

    test('switching to All tab shows 7 reviewer cards', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await page.click('button:has-text("All")');
      await expect(page.locator('h3.font-medium')).toHaveCount(7);
    });

    test('Pending tab button has amber active style when selected', async ({
      page,
    }) => {
      await navigateToReceivedRatings(page);
      await page.click('button:has-text("Pending")');
      await expect(
        page.locator('button:has-text("Pending")')
      ).toHaveClass(/bg-amber-600/);
    });

    test('All tab button has slate active style when selected', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await page.click('button:has-text("All")');
      await expect(
        page.locator('button:has-text("All")')
      ).toHaveClass(/bg-slate-700/);
    });
  });

  // ── approved cards content ────────────────────────────────────────────────

  test.describe('approved cards', () => {
    const APPROVED_NAMES = [
      'Alex Thompson',
      'Steve Johnson',
      'Alex Chen',
      'Coach Martinez',
      'Jordan Williams',
    ];

    for (const name of APPROVED_NAMES) {
      test(`shows ${name}'s card on Approved tab`, async ({ page }) => {
        await navigateToReceivedRatings(page);
        await expect(page.locator(`h3:has-text("${name}")`)).toBeVisible();
      });
    }

    test('shows "Would train again" badge', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await expect(
        page.locator('text=Would train again').first()
      ).toBeVisible();
    });

    test('shows feedback text from Alex Thompson', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await expect(
        page.locator('text=Excellent practice partner!')
      ).toBeVisible();
    });

    test('shows feedback text from Steve Johnson', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await expect(
        page.locator("text=Great session! Mike is a skilled catcher")
      ).toBeVisible();
    });

    test('shows category rating labels (Skill Level, Punctuality etc.)', async ({
      page,
    }) => {
      await navigateToReceivedRatings(page);
      await expect(page.locator('text=Skill Level').first()).toBeVisible();
      await expect(page.locator('text=Punctuality').first()).toBeVisible();
      await expect(page.locator('text=Communication').first()).toBeVisible();
      await expect(page.locator('text=Attitude').first()).toBeVisible();
    });

    test('shows "Rating from" label with reviewer first name', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await expect(page.locator('text=Rating from Alex').first()).toBeVisible();
    });

    test('shows sport badge (Football) on Alex Thompson card', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await expect(page.locator('span:has-text("Football")')).toBeVisible();
    });

    test('shows "Received" date stamp', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await expect(page.locator('text=Received').first()).toBeVisible();
    });
  });

  // ── pending cards content ─────────────────────────────────────────────────

  test.describe('pending cards', () => {
    test('shows Taylor Rodriguez on the Pending tab', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await page.click('button:has-text("Pending")');
      await expect(page.locator('h3:has-text("Taylor Rodriguez")')).toBeVisible();
    });

    test('shows Sarah Martinez on the Pending tab', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await page.click('button:has-text("Pending")');
      await expect(page.locator('h3:has-text("Sarah Martinez")')).toBeVisible();
    });

    test('pending cards show "Pending Admin Approval" badge', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await page.click('button:has-text("Pending")');
      await expect(
        page.locator('text=Pending Admin Approval').first()
      ).toBeVisible();
    });

    test('pending badge describes moderation status', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await page.click('button:has-text("Pending")');
      await expect(page.locator('text=awaiting moderation').first()).toBeVisible();
    });

    test('pending cards still show the rating content', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await page.click('button:has-text("Pending")');
      // Taylor Rodriguez's feedback
      await expect(
        page.locator('text=Mike is an outstanding training partner')
      ).toBeVisible();
    });
  });

  // ── all-tab sanity ────────────────────────────────────────────────────────

  test.describe('All tab', () => {
    test('shows both approved and pending reviewers', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await page.click('button:has-text("All")');
      // Spot-check one from each status
      await expect(page.locator('h3:has-text("Alex Thompson")')).toBeVisible();
      await expect(page.locator('h3:has-text("Taylor Rodriguez")')).toBeVisible();
    });

    test('pending badge also shown on All tab', async ({ page }) => {
      await navigateToReceivedRatings(page);
      await page.click('button:has-text("All")');
      await expect(
        page.locator('text=Pending Admin Approval').first()
      ).toBeVisible();
    });
  });
});
