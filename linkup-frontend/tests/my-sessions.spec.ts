import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket } from './helpers/mocks';

// ── fixtures ──────────────────────────────────────────────────────────────────

const PARTNER = {
  _id: 'partner-001',
  name: 'Coach Rivera',
  avatar: 'CR',
  role: 'coach',
  position: 'Pitching Coach',
};

const OPEN_SESSION = {
  _id: 'session-open-1',
  sport: 'Baseball',
  title: 'Morning Pitching Drill',
  posterRole: 'Pitcher',
  date: 'Apr 10, 2026',
  time: '9:00 AM',
  location: 'Riverside Park',
  duration: '1 hour',
  status: 'open',
  partner: null,
  likes: [],
  comments: [],
};

const CONFIRMED_SESSION = {
  _id: 'session-confirmed-1',
  sport: 'Basketball',
  title: 'Evening Shootaround',
  posterRole: 'Point Guard',
  date: 'Apr 12, 2026',
  time: '6:00 PM',
  location: 'Venice Beach Courts',
  duration: '90 min',
  status: 'confirmed',
  partner: PARTNER,
  likes: [],
  comments: [],
};

const COMPLETED_SESSION = {
  _id: 'session-completed-1',
  sport: 'Baseball',
  title: 'Spring Training',
  posterRole: 'Pitcher',
  date: 'Mar 01, 2026',
  time: '10:00 AM',
  location: 'Lincoln Park Fields',
  duration: '2 hours',
  status: 'completed',
  partner: PARTNER,
  likes: [],
  comments: [],
};

const CANCELLED_SESSION = {
  _id: 'session-cancelled-1',
  sport: 'Soccer',
  title: 'Scrimmage',
  posterRole: 'Forward',
  date: 'Feb 20, 2026',
  time: '4:00 PM',
  location: 'Griffith Park',
  duration: '1 hour',
  status: 'cancelled',
  partner: null,
  likes: [],
  comments: [],
};

// 11 upcoming sessions → triggers "Load more" (PAGE_SIZE = 10)
const ELEVEN_UPCOMING = Array.from({ length: 11 }, (_, i) => ({
  _id: `bulk-session-${i}`,
  sport: 'Baseball',
  title: `Bulk Session ${i + 1}`,
  posterRole: 'Pitcher',
  date: `Apr ${(i + 10).toString().padStart(2, '0')}, 2026`,
  time: '8:00 AM',
  location: 'Test Park',
  duration: '1 hour',
  status: i % 2 === 0 ? 'open' : 'confirmed',
  partner: null,
  likes: [],
  comments: [],
}));

// ── mock helpers ──────────────────────────────────────────────────────────────

/** Three upcoming sessions so the "View All" button appears on the dashboard */
const DASHBOARD_UPCOMING = [OPEN_SESSION, CONFIRMED_SESSION, {
  ...OPEN_SESSION, _id: 'session-open-2', title: 'Afternoon Bullpen', date: 'Apr 11, 2026',
}];

async function mockSessionsRoutes(
  page: Page,
  upcoming: object[] = DASHBOARD_UPCOMING,
  past: object[] = [],
) {
  await page.route('**/api/sessions/my**', (route) => {
    const url = route.request().url();
    if (url.includes('completed') || url.includes('cancelled')) {
      return route.fulfill({ json: { sessions: past } });
    }
    return route.fulfill({ json: { sessions: upcoming } });
  });
  await page.route('**/api/connections/pending**', (route) =>
    route.fulfill({ json: { requests: [] } })
  );
  await page.route('**/api/ratings/received**', (route) =>
    route.fulfill({ json: { ratings: [] } })
  );
}

/** Navigate from the dashboard to MySessionsView via "View All" */
async function openMySessions(page: Page) {
  await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
  await page.click('button:has-text("View All")');
  await page.waitForSelector('h2:has-text("My Sessions")', { timeout: 8000 });
}

// ── tests ─────────────────────────────────────────────────────────────────────

test.describe('MySessionsView — navigation', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockSessionsRoutes(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('"View All" appears on dashboard when there are more than 2 upcoming sessions', async ({ page }) => {
    await expect(page.locator('button:has-text("View All")')).toBeVisible({ timeout: 8000 });
  });

  test('"View All" opens My Sessions view', async ({ page }) => {
    await openMySessions(page);
    await expect(page.locator('h2:has-text("My Sessions")')).toBeVisible();
  });

  test('back button returns to dashboard', async ({ page }) => {
    await openMySessions(page);
    // Back button is the preceding sibling of the "My Sessions" h2 in the header flex row
    await page.locator('xpath=//h2[text()="My Sessions"]/preceding-sibling::button').click();
    await expect(page.locator('h2:has-text("My Sessions")')).not.toBeVisible({ timeout: 8000 });
  });
});

test.describe('MySessionsView — filter tabs', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockSessionsRoutes(page, DASHBOARD_UPCOMING, [COMPLETED_SESSION, CANCELLED_SESSION]);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openMySessions(page);
  });

  test('"upcoming" tab is selected by default', async ({ page }) => {
    // The active tab has bg-white text-blue-900; check it exists
    const upcoming = page.locator('button:has-text("upcoming")');
    await expect(upcoming).toBeVisible();
    await expect(upcoming).toHaveClass(/bg-white/);
  });

  test('"past" tab is visible alongside upcoming', async ({ page }) => {
    await expect(page.locator('button:has-text("past")')).toBeVisible();
  });

  test('switching to Past tab shows completed and cancelled sessions', async ({ page }) => {
    await page.click('button:has-text("past")');
    await expect(page.locator(`text=${COMPLETED_SESSION.title}`)).toBeVisible({ timeout: 6000 });
    await expect(page.locator(`text=${CANCELLED_SESSION.title}`)).toBeVisible({ timeout: 6000 });
  });

  test('switching to Past tab hides upcoming sessions', async ({ page }) => {
    await page.click('button:has-text("past")');
    await page.waitForSelector(`text=${COMPLETED_SESSION.title}`, { timeout: 6000 });
    await expect(page.locator(`text=${OPEN_SESSION.title}`)).not.toBeVisible();
  });

  test('switching back to Upcoming shows upcoming sessions again', async ({ page }) => {
    await page.click('button:has-text("past")');
    await page.waitForSelector(`text=${COMPLETED_SESSION.title}`, { timeout: 6000 });
    await page.click('button:has-text("upcoming")');
    await expect(page.locator(`text=${OPEN_SESSION.title}`)).toBeVisible({ timeout: 6000 });
  });
});

test.describe('MySessionsView — session cards', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockSessionsRoutes(page, DASHBOARD_UPCOMING, [COMPLETED_SESSION, CANCELLED_SESSION]);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openMySessions(page);
  });

  test('session title is displayed on card', async ({ page }) => {
    await expect(page.locator(`text=${OPEN_SESSION.title}`)).toBeVisible();
  });

  test('session date is displayed on card', async ({ page }) => {
    await expect(page.locator(`text=${OPEN_SESSION.date}`).first()).toBeVisible();
  });

  test('session location is displayed on card', async ({ page }) => {
    await expect(page.locator(`text=${OPEN_SESSION.location}`).first()).toBeVisible();
  });

  test('session duration is displayed on card', async ({ page }) => {
    await expect(page.locator(`text=${OPEN_SESSION.duration}`).first()).toBeVisible();
  });

  test('Open status badge is shown for open sessions', async ({ page }) => {
    await expect(page.locator('text=Open').first()).toBeVisible();
  });

  test('Confirmed status badge is shown for confirmed sessions', async ({ page }) => {
    await expect(page.locator('text=Confirmed').first()).toBeVisible();
  });

  test('Completed status badge is shown on past tab', async ({ page }) => {
    await page.click('button:has-text("past")');
    await expect(page.locator('text=Completed').first()).toBeVisible({ timeout: 6000 });
  });

  test('Cancelled status badge is shown on past tab', async ({ page }) => {
    await page.click('button:has-text("past")');
    await expect(page.locator('text=Cancelled').first()).toBeVisible({ timeout: 6000 });
  });

  test('"View Details" button is present on each session card', async ({ page }) => {
    const viewDetailsButtons = page.locator('button:has-text("View Details")');
    await expect(viewDetailsButtons.first()).toBeVisible();
  });

  test('"View Details" navigates to session details', async ({ page }) => {
    await page.click('button:has-text("View Details")');
    await expect(page.locator('text=Session Details')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('MySessionsView — Rate button', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockSessionsRoutes(page, DASHBOARD_UPCOMING, [COMPLETED_SESSION]);
    // UserProfileView / rating-related routes
    await page.route(`**/api/users/${PARTNER._id}**`, (route) =>
      route.fulfill({ json: { user: { ...PARTNER, role: 'coach', sport: 'Baseball' } } })
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openMySessions(page);
  });

  test('Rate button is NOT shown for open or confirmed sessions', async ({ page }) => {
    await expect(page.locator('button:has-text("Rate")')).not.toBeVisible();
  });

  test('Rate button IS shown for completed sessions on past tab', async ({ page }) => {
    await page.click('button:has-text("past")');
    await page.waitForSelector('text=Completed', { timeout: 6000 });
    await expect(page.locator('button:has-text("Rate")')).toBeVisible();
  });

  test('Rate button navigates to rating view', async ({ page }) => {
    await page.click('button:has-text("past")');
    await page.waitForSelector('button:has-text("Rate")', { timeout: 6000 });
    await page.click('button:has-text("Rate")');
    // RatingView renders a star-based rating UI
    await expect(page.locator('text=Rate Your Session').or(page.locator('text=Rate Session')).or(page.locator('text=Overall Rating'))).toBeVisible({ timeout: 8000 });
  });
});

test.describe('MySessionsView — empty states', () => {
  test('shows "No upcoming sessions" when upcoming list is empty', async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);

    // Dashboard call returns 3 sessions (to show "View All"),
    // but the fresh my-sessions fetch returns 0
    let callCount = 0;
    await page.route('**/api/sessions/my**', (route) => {
      callCount++;
      if (callCount <= 1) {
        // First call: dashboard — return 3 so "View All" appears
        return route.fulfill({ json: { sessions: DASHBOARD_UPCOMING } });
      }
      // Subsequent calls (from MySessionsView): return empty
      return route.fulfill({ json: { sessions: [] } });
    });
    await page.route('**/api/connections/pending**', (route) =>
      route.fulfill({ json: { requests: [] } })
    );
    await page.route('**/api/ratings/received**', (route) =>
      route.fulfill({ json: { ratings: [] } })
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openMySessions(page);

    await expect(page.locator('text=No upcoming sessions')).toBeVisible({ timeout: 6000 });
  });

  test('shows "No past sessions" when past list is empty', async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockSessionsRoutes(page, DASHBOARD_UPCOMING, []);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openMySessions(page);

    await page.click('button:has-text("past")');
    await expect(page.locator('text=No past sessions')).toBeVisible({ timeout: 6000 });
  });
});

test.describe('MySessionsView — pagination', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);

    // Dashboard: first call returns 3 sessions; MySessionsView calls return 11
    let callCount = 0;
    await page.route('**/api/sessions/my**', (route) => {
      callCount++;
      if (callCount <= 1) {
        return route.fulfill({ json: { sessions: DASHBOARD_UPCOMING } });
      }
      return route.fulfill({ json: { sessions: ELEVEN_UPCOMING } });
    });
    await page.route('**/api/connections/pending**', (route) =>
      route.fulfill({ json: { requests: [] } })
    );
    await page.route('**/api/ratings/received**', (route) =>
      route.fulfill({ json: { ratings: [] } })
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openMySessions(page);
  });

  test('"Load more" button appears when there are more than 10 sessions', async ({ page }) => {
    await expect(page.locator('button:has-text("Load more")')).toBeVisible({ timeout: 6000 });
  });

  test('first page shows 10 session cards', async ({ page }) => {
    await page.waitForSelector('button:has-text("Load more")', { timeout: 6000 });
    const cards = page.locator('button:has-text("View Details")');
    await expect(cards).toHaveCount(10);
  });

  test('"Load more" loads the 11th session', async ({ page }) => {
    await page.waitForSelector('button:has-text("Load more")', { timeout: 6000 });
    await page.click('button:has-text("Load more")');

    // After loading more, all 11 cards should be visible
    await expect(page.locator('button:has-text("View Details")')).toHaveCount(11, { timeout: 6000 });
  });

  test('"Load more" disappears after all sessions are loaded', async ({ page }) => {
    await page.waitForSelector('button:has-text("Load more")', { timeout: 6000 });
    await page.click('button:has-text("Load more")');
    await expect(page.locator('button:has-text("Load more")')).not.toBeVisible({ timeout: 6000 });
  });
});
