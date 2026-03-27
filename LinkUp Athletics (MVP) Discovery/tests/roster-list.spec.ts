import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket } from './helpers/mocks';

// ── constants pulled from the hardcoded mock data in RosterListView ───────────

const ATHLETE_1 = { name: 'Sarah Johnson', avatar: 'SJ', sport: 'Baseball', position: 'Pitcher (RHP)', level: 'NCAA D1', school: 'UCLA', distance: '2.3 mi', rating: 4.9, sessionsCompleted: 34, addedDate: 'Jan 15, 2026' };
const ATHLETE_2 = { name: 'Alex Chen',     avatar: 'AC', sport: 'Basketball', position: 'Point Guard',   level: 'NCAA D1', school: 'USC',   distance: '4.1 mi', rating: 4.8, sessionsCompleted: 28, addedDate: 'Jan 10, 2026' };
const ATHLETE_3 = { name: 'Emma Williams', avatar: 'EW', sport: 'Soccer',     position: 'Forward',        level: 'NCAA D1', school: 'Stanford', distance: '8.7 mi', rating: 4.9, sessionsCompleted: 42, addedDate: 'Jan 5, 2026' };
const COACH_1   = { name: 'Coach Mike Thompson', avatar: 'MT', sport: 'Baseball', position: 'Pitching Coach', level: 'NCAA D1', specializations: 'Pitching, Catching', distance: '3.5 mi', rating: 4.8, sessionsCompleted: 127, addedDate: 'Dec 28, 2025' };

const ALL_MEMBERS = [ATHLETE_1, ATHLETE_2, ATHLETE_3, COACH_1];

// ── helpers ───────────────────────────────────────────────────────────────────

async function mockDashboard(page: Page) {
  await page.route('**/api/sessions/my**', (route) =>
    route.fulfill({ json: { sessions: [] } })
  );
  await page.route('**/api/connections/pending**', (route) =>
    route.fulfill({ json: { requests: [] } })
  );
  await page.route('**/api/ratings/received**', (route) =>
    route.fulfill({ json: { ratings: [] } })
  );
}

/** Navigate from the app shell to RosterListView via Profile tab → My Roster */
async function openRosterList(page: Page) {
  await page.locator('button:has-text("Profile")').last().click();
  await page.waitForSelector('button:has-text("My Roster")', { timeout: 8000 });
  await page.click('button:has-text("My Roster")');
  await page.waitForSelector('h2:has-text("My Roster")', { timeout: 8000 });
}

// ── navigation ────────────────────────────────────────────────────────────────

test.describe('RosterListView — navigation', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('"My Roster" button is visible on the Profile tab', async ({ page }) => {
    await page.locator('button:has-text("Profile")').last().click();
    await expect(page.locator('button:has-text("My Roster")')).toBeVisible({ timeout: 8000 });
  });

  test('"My Roster" opens the roster list view', async ({ page }) => {
    await openRosterList(page);
    await expect(page.locator('h2:has-text("My Roster")')).toBeVisible();
  });

  test('back arrow returns to the Profile tab', async ({ page }) => {
    await openRosterList(page);
    await page.locator('.bg-white.border-b button').first().click();
    await expect(page.locator('h2:has-text("My Roster")')).not.toBeVisible({ timeout: 8000 });
  });
});

// ── header banner ─────────────────────────────────────────────────────────────

test.describe('RosterListView — header banner', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openRosterList(page);
  });

  test('shows total connection count in the banner', async ({ page }) => {
    await expect(page.locator('text=4 Connections')).toBeVisible();
  });

  test('shows the subtitle in the banner', async ({ page }) => {
    await expect(page.locator('text=Your practice partners & coaches')).toBeVisible();
  });
});

// ── card content ──────────────────────────────────────────────────────────────

test.describe('RosterListView — card content', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openRosterList(page);
  });

  test('all roster members are rendered', async ({ page }) => {
    for (const m of ALL_MEMBERS) {
      await expect(page.locator(`text=${m.name}`)).toBeVisible();
    }
  });

  test('avatar initials are shown on each card', async ({ page }) => {
    for (const m of ALL_MEMBERS) {
      await expect(page.locator(`text=${m.avatar}`).first()).toBeVisible();
    }
  });

  test('star rating is shown on each card', async ({ page }) => {
    await expect(page.locator(`text=${ATHLETE_1.rating}`).first()).toBeVisible();
    await expect(page.locator(`text=${COACH_1.rating}`).first()).toBeVisible();
  });

  test('sport and position are shown on each card', async ({ page }) => {
    await expect(page.locator(`text=${ATHLETE_1.sport}`).first()).toBeVisible();
    await expect(page.locator(`text=${ATHLETE_1.position}`).first()).toBeVisible();
  });

  test('level badge is shown on each card', async ({ page }) => {
    const levelBadges = page.locator(`text=${ATHLETE_1.level}`);
    // All four members share NCAA D1 — there should be at least one badge
    await expect(levelBadges.first()).toBeVisible();
  });

  test('school is shown for athlete cards', async ({ page }) => {
    await expect(page.locator(`text=${ATHLETE_1.school}`)).toBeVisible();
    await expect(page.locator(`text=${ATHLETE_2.school}`)).toBeVisible();
    await expect(page.locator(`text=${ATHLETE_3.school}`)).toBeVisible();
  });

  test('specializations are shown for the coach card', async ({ page }) => {
    await expect(page.locator(`text=${COACH_1.specializations}`)).toBeVisible();
  });

  test('distance is shown on each card', async ({ page }) => {
    await expect(page.locator(`text=${ATHLETE_1.distance} away`)).toBeVisible();
    await expect(page.locator(`text=${COACH_1.distance} away`)).toBeVisible();
  });

  test('sessions completed count is shown on each card', async ({ page }) => {
    await expect(page.locator(`text=${ATHLETE_1.sessionsCompleted} sessions`)).toBeVisible();
    await expect(page.locator(`text=${COACH_1.sessionsCompleted} sessions`)).toBeVisible();
  });

  test('"Added on" date is shown on each card', async ({ page }) => {
    await expect(page.locator(`text=Added on ${ATHLETE_1.addedDate}`)).toBeVisible();
    await expect(page.locator(`text=Added on ${COACH_1.addedDate}`)).toBeVisible();
  });
});

// ── card actions ──────────────────────────────────────────────────────────────

test.describe('RosterListView — card actions', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    // UserProfileView routes for when a card is clicked
    await page.route('**/api/users/1**', (route) =>
      route.fulfill({ json: { user: { _id: '1', name: ATHLETE_1.name, role: 'athlete', sport: ATHLETE_1.sport, position: ATHLETE_1.position, skillLevel: ATHLETE_1.level, averageRating: ATHLETE_1.rating, ratingCount: 5 } } })
    );
    await page.route('**/api/connections/status/1**', (route) =>
      route.fulfill({ json: { status: 'accepted' } })
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openRosterList(page);
  });

  test('each card has a Message button', async ({ page }) => {
    const msgBtns = page.locator('button:has-text("Message")');
    await expect(msgBtns).toHaveCount(4);
  });

  test('each card has a ChevronRight button', async ({ page }) => {
    // ChevronRight buttons are the secondary action on each card
    // They sit alongside Message buttons in a flex row; use their container
    const chevrons = page.locator('div.flex.items-center.gap-2 button').filter({ hasNot: page.locator('text=Message') });
    await expect(chevrons).toHaveCount(4);
  });

  test('clicking a card navigates to the user profile view', async ({ page }) => {
    await page.locator(`text=${ATHLETE_1.name}`).click();
    await expect(page.locator('h2:has-text("Profile")')).toBeVisible({ timeout: 8000 });
  });

  test('clicking the ChevronRight button navigates to the user profile view', async ({ page }) => {
    // Click the chevron next to the first card
    const firstChevron = page.locator('div.flex.items-center.gap-2 button').filter({ hasNot: page.locator('text=Message') }).first();
    await firstChevron.click();
    await expect(page.locator('h2:has-text("Profile")')).toBeVisible({ timeout: 8000 });
  });

  test('Message button activates the Chat tab in the bottom nav', async ({ page }) => {
    await page.locator('button:has-text("Message")').first().click();
    await expect(page.locator('button:has-text("Chat")')).toHaveClass(/text-blue-900/, { timeout: 4000 });
  });

  test('Message button does not navigate away from the roster list', async ({ page }) => {
    await page.locator('button:has-text("Message")').first().click();
    // RosterListView remains visible because onOpenChat doesn't clear currentView
    await expect(page.locator('h2:has-text("My Roster")')).toBeVisible({ timeout: 4000 });
  });
});
