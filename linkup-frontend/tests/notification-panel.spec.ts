import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket } from './helpers/mocks';

// ── fixtures ──────────────────────────────────────────────────────────────────

const NOTIF_ROSTER_REQUEST = {
  _id: 'notif-001',
  type: 'roster_request' as const,
  data: { requesterName: 'Jordan Rivera' },
  read: false,
  createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5m ago
};

const NOTIF_ROSTER_ACCEPTED = {
  _id: 'notif-002',
  type: 'roster_accepted' as const,
  data: { accepterName: 'Sam Chen' },
  read: false,
  createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
};

const NOTIF_SESSION_ACCEPTED = {
  _id: 'notif-003',
  type: 'session_accepted' as const,
  data: { sessionTitle: 'Morning Drills' },
  read: true,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
};

const NOTIF_MESSAGE_NEW = {
  _id: 'notif-004',
  type: 'message_new' as const,
  data: { senderName: 'Coach Rivera' },
  read: false,
  createdAt: new Date(Date.now() - 30 * 1000).toISOString(), // 30s ago
};

// ── mock helpers ──────────────────────────────────────────────────────────────

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

async function mockNotifications(page: Page, notifications: object[] = []) {
  // GET /api/notifications — exact path, no trailing segment
  await page.route('**/api/notifications', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { notifications } });
    }
    return route.fulfill({ json: { message: 'ok' } });
  });
  // PATCH /api/notifications/read-all and /api/notifications/:id/read
  await page.route('**/api/notifications/**', (route) =>
    route.fulfill({ json: { message: 'ok' } })
  );
}

/** Open the notification panel via the bell button */
async function openPanel(page: Page) {
  await page.locator('button[aria-expanded]').click();
  // Wait for the panel's own header span — use exact text to avoid matching "No notifications yet"
  await expect(page.locator('span.font-semibold').filter({ hasText: 'Notifications' })).toBeVisible({ timeout: 6000 });
}

/** The X close button inside the panel (last button inside the z-40 panel div) */
const panelCloseBtn = (page: Page) =>
  page.locator('div.z-40 button').last();

// ── open / close ──────────────────────────────────────────────────────────────

test.describe('NotificationPanel — open/close', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    await mockNotifications(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('bell button is visible in the header', async ({ page }) => {
    await expect(page.locator('button[aria-expanded]')).toBeVisible();
  });

  test('clicking the bell opens the notification panel', async ({ page }) => {
    await openPanel(page);
    await expect(page.locator('span.font-semibold').filter({ hasText: 'Notifications' })).toBeVisible();
  });

  test('X button inside the panel closes it', async ({ page }) => {
    await openPanel(page);
    await panelCloseBtn(page).click();
    await expect(page.locator('text=No notifications yet')).not.toBeVisible({ timeout: 4000 });
  });

  test('clicking the backdrop closes the panel', async ({ page }) => {
    await openPanel(page);
    // Click the semi-transparent backdrop div directly
    await page.locator('div.z-30').click();
    await expect(page.locator('text=No notifications yet')).not.toBeVisible({ timeout: 4000 });
  });

  test('clicking the bell again toggles the panel closed', async ({ page }) => {
    await openPanel(page);
    // The backdrop covers the bell; dispatch directly on the element to bypass hit-testing
    await page.locator('button[aria-expanded]').dispatchEvent('click');
    await expect(page.locator('text=No notifications yet')).not.toBeVisible({ timeout: 4000 });
  });

  test('bell button has aria-expanded=false when panel is closed', async ({ page }) => {
    await expect(page.locator('button[aria-expanded="false"]')).toBeVisible();
  });

  test('bell button has aria-expanded=true when panel is open', async ({ page }) => {
    await openPanel(page);
    await expect(page.locator('button[aria-expanded="true"]')).toBeVisible();
  });
});

// ── empty state ───────────────────────────────────────────────────────────────

test.describe('NotificationPanel — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    await mockNotifications(page, []);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openPanel(page);
  });

  test('shows "No notifications yet" when list is empty', async ({ page }) => {
    await expect(page.locator('text=No notifications yet')).toBeVisible({ timeout: 6000 });
  });

  test('"Mark all read" button is not shown when there are no notifications', async ({ page }) => {
    await page.waitForSelector('text=No notifications yet', { timeout: 6000 });
    await expect(page.locator('button:has-text("Mark all read")')).not.toBeVisible();
  });
});

// ── notification body text ────────────────────────────────────────────────────

test.describe('NotificationPanel — notification body text', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    await mockNotifications(page, [
      NOTIF_ROSTER_REQUEST,
      NOTIF_ROSTER_ACCEPTED,
      NOTIF_SESSION_ACCEPTED,
      NOTIF_MESSAGE_NEW,
    ]);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openPanel(page);
    await page.waitForSelector('text=Jordan Rivera', { timeout: 6000 });
  });

  test('roster_request shows requester name and "wants to connect"', async ({ page }) => {
    await expect(page.locator('text=Jordan Rivera wants to connect with you')).toBeVisible();
  });

  test('roster_accepted shows accepter name and "accepted your connection request"', async ({ page }) => {
    await expect(page.locator('text=Sam Chen accepted your connection request')).toBeVisible();
  });

  test('session_accepted shows the session title', async ({ page }) => {
    await expect(page.locator('text="Morning Drills" has a new partner')).toBeVisible();
  });

  test('message_new shows sender name', async ({ page }) => {
    await expect(page.locator('text=Message from Coach Rivera')).toBeVisible();
  });

  test('shows "5m ago" for the 5-minute-old notification', async ({ page }) => {
    await expect(page.locator('text=5m ago')).toBeVisible();
  });

  test('all four notifications are rendered', async ({ page }) => {
    await expect(page.locator('text=Jordan Rivera')).toBeVisible();
    await expect(page.locator('text=Sam Chen')).toBeVisible();
    await expect(page.locator('text=Morning Drills')).toBeVisible();
    await expect(page.locator('text=Coach Rivera')).toBeVisible();
  });
});

// ── unread state ──────────────────────────────────────────────────────────────

test.describe('NotificationPanel — unread state', () => {
  // 3 unread (001, 002, 004) + 1 read (003)
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    await mockNotifications(page, [
      NOTIF_ROSTER_REQUEST,
      NOTIF_ROSTER_ACCEPTED,
      NOTIF_SESSION_ACCEPTED,
      NOTIF_MESSAGE_NEW,
    ]);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openPanel(page);
    await page.waitForSelector('text=Jordan Rivera', { timeout: 6000 });
  });

  test('shows the unread count badge ("3") in the panel header', async ({ page }) => {
    // The badge is a span inside the panel header with the count
    await expect(page.locator('div.z-40 span.bg-red-500')).toBeVisible();
    await expect(page.locator('div.z-40 span.bg-red-500')).toHaveText('3');
  });

  test('"Mark all read" button is visible when unread > 0', async ({ page }) => {
    await expect(page.locator('button:has-text("Mark all read")')).toBeVisible();
  });

  test('unread items have a blue dot indicator', async ({ page }) => {
    const dots = page.locator('div.z-40 div.w-2.h-2.rounded-full.bg-blue-500');
    await expect(dots).toHaveCount(3);
  });

  test('the read item does not have a blue dot', async ({ page }) => {
    // Only 3 unread dots, not 4
    const dots = page.locator('div.z-40 div.w-2.h-2.rounded-full.bg-blue-500');
    await expect(dots).toHaveCount(3);
  });
});

// ── mark all read ─────────────────────────────────────────────────────────────

test.describe('NotificationPanel — mark all read', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    await mockNotifications(page, [NOTIF_ROSTER_REQUEST, NOTIF_ROSTER_ACCEPTED]);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openPanel(page);
    await page.waitForSelector('button:has-text("Mark all read")', { timeout: 6000 });
  });

  test('"Mark all read" removes all unread dots', async ({ page }) => {
    await page.click('button:has-text("Mark all read")');
    await expect(page.locator('div.z-40 div.w-2.h-2.rounded-full.bg-blue-500')).toHaveCount(0, { timeout: 4000 });
  });

  test('"Mark all read" calls PATCH /api/notifications/read-all', async ({ page }) => {
    let called = false;
    await page.route('**/api/notifications/read-all**', (route) => {
      called = true;
      return route.fulfill({ json: { message: 'ok' } });
    });
    await page.click('button:has-text("Mark all read")');
    await page.waitForTimeout(300);
    expect(called).toBe(true);
  });

  test('"Mark all read" hides itself after clicking', async ({ page }) => {
    await page.click('button:has-text("Mark all read")');
    await expect(page.locator('button:has-text("Mark all read")')).not.toBeVisible({ timeout: 4000 });
  });

  test('"Mark all read" removes the red unread count badge', async ({ page }) => {
    await page.click('button:has-text("Mark all read")');
    await expect(page.locator('div.z-40 span.bg-red-500')).not.toBeVisible({ timeout: 4000 });
  });
});

// ── mark single read ──────────────────────────────────────────────────────────

test.describe('NotificationPanel — mark single read', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
    await mockNotifications(page, [NOTIF_ROSTER_REQUEST, NOTIF_MESSAGE_NEW]);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openPanel(page);
    await page.waitForSelector('text=Jordan Rivera', { timeout: 6000 });
  });

  test('clicking an unread notification calls PATCH /api/notifications/:id/read', async ({ page }) => {
    let called = false;
    await page.route(`**/api/notifications/${NOTIF_ROSTER_REQUEST._id}/read**`, (route) => {
      called = true;
      return route.fulfill({ json: { message: 'ok' } });
    });
    await page.locator('text=Jordan Rivera wants to connect with you').click();
    await page.waitForTimeout(300);
    expect(called).toBe(true);
  });

  test('clicking an unread notification removes its blue dot', async ({ page }) => {
    await expect(page.locator('div.z-40 div.w-2.h-2.rounded-full.bg-blue-500')).toHaveCount(2);
    await page.locator('text=Jordan Rivera wants to connect with you').click();
    await expect(page.locator('div.z-40 div.w-2.h-2.rounded-full.bg-blue-500')).toHaveCount(1, { timeout: 4000 });
  });
});
