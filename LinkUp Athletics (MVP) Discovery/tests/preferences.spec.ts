import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard } from './helpers/mocks';

async function goToPreferences(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
  await page.locator('button').filter({ has: page.locator('span:has-text("Profile")') }).click();
  await page.waitForSelector('h3:has-text("Alex Pitcher")', { timeout: 8000 });
  await page.click('h4:has-text("Privacy & Visibility")');
  await expect(page.locator('h2:has-text("Privacy & Visibility")')).toBeVisible({ timeout: 6000 });
}

test.describe('PreferencesView', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
  });

  // ── Navigation ──────────────────────────────────────────────────────────────

  test('renders "Privacy & Visibility" heading', async ({ page }) => {
    await goToPreferences(page);
    await expect(page.locator('h2:has-text("Privacy & Visibility")')).toBeVisible();
  });

  test('back button returns to Profile tab', async ({ page }) => {
    await goToPreferences(page);
    await page.locator('xpath=//h2[text()="Privacy & Visibility"]/../button').click();
    await expect(page.locator('h3:has-text("Alex Pitcher")')).toBeVisible({ timeout: 8000 });
  });

  // ── Profile Visibility section ──────────────────────────────────────────────

  test('shows "Profile Visibility" section heading', async ({ page }) => {
    await goToPreferences(page);
    await expect(page.locator('h3:has-text("Profile Visibility")')).toBeVisible();
  });

  test('defaults to "Filtered Visibility" mode', async ({ page }) => {
    await goToPreferences(page);
    const filteredLabel = page.locator('label').filter({ hasText: 'Filtered Visibility' });
    await expect(filteredLabel.locator('input[type="radio"]')).toBeChecked();
  });

  test('"Visible to Everyone" radio option is present', async ({ page }) => {
    await goToPreferences(page);
    await expect(page.locator('text=Visible to Everyone')).toBeVisible();
  });

  test('selecting "Visible to Everyone" hides Skill Level Filters section', async ({ page }) => {
    await goToPreferences(page);
    await page.locator('label').filter({ hasText: 'Visible to Everyone' }).click();
    await expect(page.locator('h3:has-text("Allowed Skill Levels")')).not.toBeVisible();
  });

  test('selecting "Visible to Everyone" hides Allowed Sports section', async ({ page }) => {
    await goToPreferences(page);
    await page.locator('label').filter({ hasText: 'Visible to Everyone' }).click();
    await expect(page.locator('h3:has-text("Allowed Sports")')).not.toBeVisible();
  });

  // ── Skill Level Filters ─────────────────────────────────────────────────────

  test('shows "Allowed Skill Levels" section in filtered mode', async ({ page }) => {
    await goToPreferences(page);
    await expect(page.locator('h3:has-text("Allowed Skill Levels")')).toBeVisible();
  });

  test('shows all five skill level options', async ({ page }) => {
    await goToPreferences(page);
    const levelSection = page.locator('div.bg-white').filter({ has: page.locator('h3:has-text("Allowed Skill Levels")') });
    await expect(levelSection.locator('button:has-text("NCAA D1")')).toBeVisible();
    await expect(levelSection.locator('button:has-text("NCAA D2")')).toBeVisible();
    await expect(levelSection.locator('button:has-text("NCAA D3")')).toBeVisible();
    await expect(levelSection.locator('button:has-text("College - Other")')).toBeVisible();
    await expect(levelSection.locator('button:has-text("Pro")')).toBeVisible();
  });

  test('toggling a selected level deselects it', async ({ page }) => {
    await goToPreferences(page);
    const levelSection = page.locator('div.bg-white').filter({ has: page.locator('h3:has-text("Allowed Skill Levels")') });
    const d1Btn = levelSection.locator('button:has-text("NCAA D1")');
    await expect(d1Btn).toHaveClass(/bg-purple-900/);
    await d1Btn.click();
    await expect(d1Btn).not.toHaveClass(/bg-purple-900/);
  });

  test('toggling an unselected level selects it', async ({ page }) => {
    await goToPreferences(page);
    const levelSection = page.locator('div.bg-white').filter({ has: page.locator('h3:has-text("Allowed Skill Levels")') });
    const proBtn = levelSection.locator('button:has-text("Pro")');
    await expect(proBtn).not.toHaveClass(/bg-purple-900/);
    await proBtn.click();
    await expect(proBtn).toHaveClass(/bg-purple-900/);
  });

  test('deselecting all skill levels shows warning message', async ({ page }) => {
    await goToPreferences(page);
    // Default selected: NCAA D1, D2, D3, College - Other
    await page.click('button:has-text("NCAA D1")');
    await page.click('button:has-text("NCAA D2")');
    await page.click('button:has-text("NCAA D3")');
    await page.click('button:has-text("College - Other")');
    await expect(page.locator('text=No levels selected')).toBeVisible();
  });

  // ── Sport Filters ───────────────────────────────────────────────────────────

  test('shows "Allowed Sports" section in filtered mode', async ({ page }) => {
    await goToPreferences(page);
    await expect(page.locator('h3:has-text("Allowed Sports")')).toBeVisible();
  });

  test('shows sport filter buttons', async ({ page }) => {
    await goToPreferences(page);
    await expect(page.locator('button:has-text("Soccer")')).toBeVisible();
    await expect(page.locator('button:has-text("Basketball")')).toBeVisible();
    await expect(page.locator('button:has-text("Volleyball")')).toBeVisible();
  });

  test('deselecting all sports shows warning message', async ({ page }) => {
    await goToPreferences(page);
    // Default: only Baseball is selected
    // Find the Baseball button in the Allowed Sports section (not the skill level section)
    const sportSection = page.locator('div.bg-white').filter({ has: page.locator('h3:has-text("Allowed Sports")') });
    await sportSection.locator('button:has-text("Baseball")').click();
    await expect(page.locator('text=No sports selected')).toBeVisible();
  });

  // ── Search Radius ───────────────────────────────────────────────────────────

  test('shows "Search Radius" section', async ({ page }) => {
    await goToPreferences(page);
    await expect(page.locator('h3:has-text("Search Radius")')).toBeVisible();
  });

  test('shows default radius of 25 mi', async ({ page }) => {
    await goToPreferences(page);
    await expect(page.locator('text=25').first()).toBeVisible();
    await expect(page.locator('text=mi').first()).toBeVisible();
  });

  test('shows range slider for radius', async ({ page }) => {
    await goToPreferences(page);
    await expect(page.locator('input[type="range"]')).toBeVisible();
  });

  // ── Save & Info ─────────────────────────────────────────────────────────────

  test('shows "Save Preferences" button', async ({ page }) => {
    await goToPreferences(page);
    await expect(page.locator('button:has-text("Save Preferences")')).toBeVisible();
  });

  test('shows Privacy Note info card', async ({ page }) => {
    await goToPreferences(page);
    await expect(page.locator('text=Privacy Note')).toBeVisible();
  });
});
