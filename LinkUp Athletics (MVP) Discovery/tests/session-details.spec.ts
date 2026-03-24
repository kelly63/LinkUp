import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard, MOCK_OPEN_SESSIONS, MOCK_PARTNER } from './helpers/mocks';

// ── fixtures ──────────────────────────────────────────────────────────────────

/** Confirmed session posted by the logged-in user (user-001) */
const MY_CONFIRMED_SESSION = {
  ...MOCK_OPEN_SESSIONS[0],
  _id: 'confirmed-session-mine',
  status: 'confirmed',
  notes: 'Focus on pitching mechanics',
  equipment: ['Glove', 'Cleats'],
  skillLevelRequired: 'NCAA D1',
  postedBy: { _id: 'user-001', name: 'Alex Pitcher', position: 'Pitcher' },
};

/** Open session posted by another user → "Confirm Session" button should appear */
const OPEN_SESSION_OTHER = {
  _id: 'open-session-other',
  sport: 'Baseball',
  role: 'Pitcher',
  date: 'Apr 01, 2026',
  time: '9:00 AM',
  location: 'Riverside Park',
  duration: '1 hour',
  status: 'open',
  postedBy: { _id: 'other-user-001', name: 'Jordan Coach', position: 'Coach' },
  partner: null,
  likes: [],
  comments: [],
};

/** Completed session → action buttons should not be shown */
const COMPLETED_SESSION = {
  ...MOCK_OPEN_SESSIONS[0],
  _id: 'completed-session-x',
  status: 'completed',
};

/** Cancelled session → action buttons should not be shown */
const CANCELLED_SESSION = {
  ...MOCK_OPEN_SESSIONS[0],
  _id: 'cancelled-session-x',
  status: 'cancelled',
};

// "View All" button only appears when upcomingSessions.length > 2, so always
// pass 3 sessions, with the one under test as the first entry.
const withFill = (first: object) => [first, MOCK_OPEN_SESSIONS[1], MOCK_OPEN_SESSIONS[2]];

// ── helper ────────────────────────────────────────────────────────────────────

async function navigateToSessionDetails(page: Page) {
  await page.waitForSelector('button:has-text("View All")', { timeout: 8000 });
  await page.click('button:has-text("View All")');
  await page.waitForSelector('button:has-text("View Details")', { timeout: 8000 });
  await page.click('button:has-text("View Details")');
  await page.waitForSelector('text=Session Details', { timeout: 8000 });
}

// ── Session info rendering ────────────────────────────────────────────────────

test.describe('SessionDetailsView – info rendering', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page, withFill(MY_CONFIRMED_SESSION));
    await page.route(`**/api/sessions/${MY_CONFIRMED_SESSION._id}/complete**`, (route) =>
      route.fulfill({ json: { session: { ...MY_CONFIRMED_SESSION, status: 'completed' } } })
    );
    await page.route(`**/api/sessions/${MY_CONFIRMED_SESSION._id}**`, (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ json: { message: 'cancelled' } });
      }
      return route.fulfill({ json: { session: MY_CONFIRMED_SESSION } });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('shows session date and location', async ({ page }) => {
    await navigateToSessionDetails(page);
    await expect(page.locator('text=Apr 01, 2026')).toBeVisible();
    await expect(page.locator('text=Riverside Park')).toBeVisible();
  });

  test('shows session duration', async ({ page }) => {
    await navigateToSessionDetails(page);
    await expect(page.locator('text=1 hour')).toBeVisible();
  });

  test('shows skill level required', async ({ page }) => {
    await navigateToSessionDetails(page);
    await expect(page.locator('text=NCAA D1')).toBeVisible();
  });

  test('shows Confirmed Session status badge', async ({ page }) => {
    await navigateToSessionDetails(page);
    await expect(page.locator('text=Confirmed Session')).toBeVisible();
  });

  test('shows partner name and position', async ({ page }) => {
    await navigateToSessionDetails(page);
    await expect(page.getByRole('heading', { name: MOCK_PARTNER.name })).toBeVisible();
    await expect(page.getByText(MOCK_PARTNER.position, { exact: true }).first()).toBeVisible();
  });

  test('shows session notes when present', async ({ page }) => {
    await navigateToSessionDetails(page);
    await expect(page.locator('text=Focus on pitching mechanics')).toBeVisible();
  });

  test('shows equipment list when present', async ({ page }) => {
    await navigateToSessionDetails(page);
    await expect(page.locator('text=Glove')).toBeVisible();
    await expect(page.locator('text=Cleats')).toBeVisible();
  });

  test('back button dismisses session details', async ({ page }) => {
    await navigateToSessionDetails(page);
    // The back button is the only button in the blue gradient header
    await page.locator('.from-blue-900 button').first().click();
    await expect(page.locator('text=Session Details')).not.toBeVisible({ timeout: 5000 });
  });
});

// ── Confirm Session action ────────────────────────────────────────────────────

test.describe('SessionDetailsView – Confirm Session', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page, withFill(OPEN_SESSION_OTHER));
    await page.route(`**/api/sessions/${OPEN_SESSION_OTHER._id}/accept**`, (route) =>
      route.fulfill({ json: { session: { ...OPEN_SESSION_OTHER, status: 'confirmed' } } })
    );
    await page.route(`**/api/sessions/${OPEN_SESSION_OTHER._id}**`, (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ json: { message: 'cancelled' } });
      }
      return route.fulfill({ json: { session: OPEN_SESSION_OTHER } });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('shows Open – Awaiting Partner status badge', async ({ page }) => {
    await navigateToSessionDetails(page);
    await expect(page.locator('text=Open – Awaiting Partner')).toBeVisible();
  });

  test('shows Confirm Session button for open session not posted by me', async ({ page }) => {
    await navigateToSessionDetails(page);
    await expect(page.locator('button:has-text("Confirm Session")')).toBeVisible();
  });

  test('Confirm Session calls POST /api/sessions/:id/accept', async ({ page }) => {
    const acceptRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/sessions/${OPEN_SESSION_OTHER._id}/accept`) &&
        req.method() === 'POST'
    );
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Confirm Session")');
    const req = await acceptRequest;
    expect(req.url()).toContain(`/api/sessions/${OPEN_SESSION_OTHER._id}/accept`);
  });

  test('status badge updates to Confirmed after accepting', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Confirm Session")');
    await expect(page.locator('text=Confirmed Session')).toBeVisible({ timeout: 5000 });
  });
});

// ── Mark as Complete & Rate action ────────────────────────────────────────────

test.describe('SessionDetailsView – Mark as Complete', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page, withFill(MY_CONFIRMED_SESSION));
    await page.route(`**/api/sessions/${MY_CONFIRMED_SESSION._id}/complete**`, (route) =>
      route.fulfill({ json: { session: { ...MY_CONFIRMED_SESSION, status: 'completed' } } })
    );
    await page.route(`**/api/sessions/${MY_CONFIRMED_SESSION._id}**`, (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ json: { message: 'cancelled' } });
      }
      return route.fulfill({ json: { session: MY_CONFIRMED_SESSION } });
    });
    await page.route('**/api/ratings**', (route) =>
      route.fulfill({ json: { ratings: [] } })
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('shows Mark as Complete & Rate button for confirmed session', async ({ page }) => {
    await navigateToSessionDetails(page);
    await expect(page.locator('button:has-text("Mark as Complete & Rate")')).toBeVisible();
  });

  test('Mark as Complete calls POST /api/sessions/:id/complete', async ({ page }) => {
    const completeRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/sessions/${MY_CONFIRMED_SESSION._id}/complete`) &&
        req.method() === 'POST'
    );
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Mark as Complete & Rate")');
    const req = await completeRequest;
    expect(req.url()).toContain(`/api/sessions/${MY_CONFIRMED_SESSION._id}/complete`);
  });

  test('completing a session navigates to the rating view', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Mark as Complete & Rate")');
    await expect(page.locator('button:has-text("Submit Rating")')).toBeVisible({ timeout: 8000 });
  });
});

// ── Cancel Session action ─────────────────────────────────────────────────────

test.describe('SessionDetailsView – Cancel Session', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page, withFill(MY_CONFIRMED_SESSION));
    await page.route(`**/api/sessions/${MY_CONFIRMED_SESSION._id}/complete**`, (route) =>
      route.fulfill({ json: { session: MY_CONFIRMED_SESSION } })
    );
    await page.route(`**/api/sessions/${MY_CONFIRMED_SESSION._id}**`, (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ json: { message: 'cancelled' } });
      }
      return route.fulfill({ json: { session: MY_CONFIRMED_SESSION } });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('shows Cancel Session button', async ({ page }) => {
    await navigateToSessionDetails(page);
    await expect(page.locator('button:has-text("Cancel Session")')).toBeVisible();
  });

  test('Cancel Session calls DELETE /api/sessions/:id', async ({ page }) => {
    const cancelRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/sessions/${MY_CONFIRMED_SESSION._id}`) &&
        req.method() === 'DELETE'
    );
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Cancel Session")');
    const req = await cancelRequest;
    expect(req.method()).toBe('DELETE');
  });

  test('after cancelling, session details view is dismissed', async ({ page }) => {
    await navigateToSessionDetails(page);
    await page.click('button:has-text("Cancel Session")');
    await expect(page.locator('text=Session Details')).not.toBeVisible({ timeout: 8000 });
  });
});

// ── Completed / Cancelled sessions ───────────────────────────────────────────

test.describe('SessionDetailsView – Completed and Cancelled sessions', () => {
  test('does not show action buttons for a completed session', async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page, withFill(COMPLETED_SESSION));
    await page.route(`**/api/sessions/${COMPLETED_SESSION._id}**`, (route) =>
      route.fulfill({ json: { session: COMPLETED_SESSION } })
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await navigateToSessionDetails(page);
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel Session")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Edit Session")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Mark as Complete & Rate")')).not.toBeVisible();
  });

  test('does not show action buttons for a cancelled session', async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page, withFill(CANCELLED_SESSION));
    await page.route(`**/api/sessions/${CANCELLED_SESSION._id}**`, (route) =>
      route.fulfill({ json: { session: CANCELLED_SESSION } })
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await navigateToSessionDetails(page);
    await expect(page.locator('text=Cancelled')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel Session")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Edit Session")')).not.toBeVisible();
  });
});
