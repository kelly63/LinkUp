import { test, expect } from '@playwright/test';
import { seedAuth, MOCK_USER } from './helpers/auth';
import { blockWebSocket, mockDashboard, MOCK_PARTNER } from './helpers/mocks';

const MOCK_CONV = {
  _id: 'conv-001',
  partner: {
    _id: MOCK_PARTNER._id,
    name: MOCK_PARTNER.name,
    avatar: MOCK_PARTNER.avatar,
    role: MOCK_PARTNER.role,
    sport: MOCK_PARTNER.sport,
    position: MOCK_PARTNER.position,
    skillLevel: MOCK_PARTNER.skillLevel,
    isOnline: false,
    lastSeen: new Date().toISOString(),
  },
  lastMessage: {
    text: 'See you at practice!',
    createdAt: new Date().toISOString(),
    sender: MOCK_PARTNER._id,
  },
  unread: 2,
};

async function mockChatEndpoints(
  page: Parameters<typeof test.beforeEach>[0]['page'] extends (pg: infer P) => any ? P : never,
  { conversations = [MOCK_CONV], rosterConnections = [{ user: MOCK_PARTNER }], messages = [] as any[] } = {}
) {
  await page.route('**/api/messages', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { conversations } });
    }
    return route.continue();
  });
  await page.route('**/api/connections', (route) => {
    if (route.request().method() === 'GET' && !route.request().url().includes('pending') && !route.request().url().includes('status')) {
      return route.fulfill({ json: { connections: rosterConnections } });
    }
    return route.continue();
  });
  await page.route(`**/api/messages/${MOCK_PARTNER._id}`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { messages } });
    }
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({
        json: {
          message: {
            _id: 'msg-new-001',
            sender: MOCK_USER._id,
            recipient: MOCK_PARTNER._id,
            text: body.text,
            read: false,
            createdAt: new Date().toISOString(),
          },
        },
      });
    }
    return route.continue();
  });
}

async function goToChat(page: Parameters<typeof test.beforeEach>[0]['page'] extends (pg: infer P) => any ? P : never) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('button:has-text("View All")').waitFor({ timeout: 8000 });
  await page.locator('button').filter({ has: page.locator('span:has-text("Chat")') }).click();
  await page.waitForSelector('h2:has-text("Inbox")', { timeout: 8000 });
}

test.describe('Chat tab', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);
  });

  // ── Inbox rendering ────────────────────────────────────────────────────────

  test('shows Inbox heading and search bar', async ({ page }) => {
    await mockChatEndpoints(page);
    await goToChat(page);
    await expect(page.locator('h2:has-text("Inbox")')).toBeVisible();
    await expect(page.locator('input[placeholder="Search conversations..."]')).toBeVisible();
  });

  test('renders conversation rows from GET /api/messages', async ({ page }) => {
    await mockChatEndpoints(page);
    await goToChat(page);
    await expect(page.locator(`text=${MOCK_PARTNER.name}`)).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=See you at practice!')).toBeVisible();
  });

  test('shows unread badge on conversations with unread messages', async ({ page }) => {
    await mockChatEndpoints(page);
    await goToChat(page);
    // MOCK_CONV has unread: 2 — target the badge span specifically
    await expect(page.locator('span.bg-blue-600:has-text("2")')).toBeVisible({ timeout: 8000 });
  });

  test('shows empty state when there are no conversations', async ({ page }) => {
    await mockChatEndpoints(page, { conversations: [] });
    await goToChat(page);
    await expect(page.locator('text=No conversations')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Start a new chat with athletes on your roster')).toBeVisible();
  });

  test('search filters conversation list by partner name', async ({ page }) => {
    const secondConv = {
      ...MOCK_CONV,
      _id: 'conv-002',
      partner: { ...MOCK_CONV.partner, _id: 'user-002', name: 'Jordan Outfield' },
    };
    await mockChatEndpoints(page, { conversations: [MOCK_CONV, secondConv] });
    await goToChat(page);

    await page.waitForSelector(`text=${MOCK_PARTNER.name}`, { timeout: 8000 });
    await page.fill('input[placeholder="Search conversations..."]', 'Jordan');

    await expect(page.locator('text=Jordan Outfield')).toBeVisible();
    await expect(page.locator(`text=${MOCK_PARTNER.name}`)).not.toBeVisible();
  });

  // ── Open a conversation ────────────────────────────────────────────────────

  test('clicking a conversation opens ChatScreen with partner name', async ({ page }) => {
    await mockChatEndpoints(page);
    await goToChat(page);
    await page.waitForSelector(`text=${MOCK_PARTNER.name}`, { timeout: 8000 });
    await page.locator(`text=${MOCK_PARTNER.name}`).first().click();
    await expect(page.locator(`h3:has-text("${MOCK_PARTNER.name}")`)).toBeVisible({ timeout: 8000 });
    await expect(page.locator('input[placeholder="Type a message..."]')).toBeVisible();
  });

  test('back button in ChatScreen returns to inbox', async ({ page }) => {
    await mockChatEndpoints(page);
    await goToChat(page);
    await page.waitForSelector(`text=${MOCK_PARTNER.name}`, { timeout: 8000 });
    await page.locator(`text=${MOCK_PARTNER.name}`).first().click();
    await page.waitForSelector('input[placeholder="Type a message..."]', { timeout: 8000 });
    // ArrowLeft: h3 → parent (div.flex-1) → grandparent (flex row) → first button sibling
    await page.locator(`xpath=//h3[text()="${MOCK_PARTNER.name}"]/parent::div/parent::div/button[1]`).click();
    await expect(page.locator('h2:has-text("Inbox")')).toBeVisible({ timeout: 8000 });
  });

  // ── Send a message ─────────────────────────────────────────────────────────

  test('sending a message calls POST /api/messages/:partnerId (REST fallback)', async ({ page }) => {
    const sendRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/messages/${MOCK_PARTNER._id}`) && req.method() === 'POST'
    );

    await mockChatEndpoints(page);
    await goToChat(page);
    await page.waitForSelector(`text=${MOCK_PARTNER.name}`, { timeout: 8000 });
    await page.locator(`text=${MOCK_PARTNER.name}`).first().click();
    await page.waitForSelector('input[placeholder="Type a message..."]', { timeout: 8000 });

    await page.fill('input[placeholder="Type a message..."]', 'Hello there!');
    await page.keyboard.press('Enter');

    const req = await sendRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.text).toBe('Hello there!');
  });

  test('sent message appears in chat after REST fallback confirms it', async ({ page }) => {
    await mockChatEndpoints(page);
    await goToChat(page);
    await page.waitForSelector(`text=${MOCK_PARTNER.name}`, { timeout: 8000 });
    await page.locator(`text=${MOCK_PARTNER.name}`).first().click();
    await page.waitForSelector('input[placeholder="Type a message..."]', { timeout: 8000 });

    await page.fill('input[placeholder="Type a message..."]', 'Hello there!');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Hello there!')).toBeVisible({ timeout: 5000 });
  });

  // ── Roster modal ───────────────────────────────────────────────────────────

  test('pencil button opens roster modal', async ({ page }) => {
    await mockChatEndpoints(page);
    await goToChat(page);
    await page.waitForSelector('h2:has-text("Inbox")', { timeout: 8000 });
    // Pencil (Edit) button is the sibling button of the h2 "Inbox" inside the same parent div
    await page.locator('xpath=//h2[contains(text(),"Inbox")]/../button').click();
    await expect(page.locator('h3:has-text("My Roster")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${MOCK_PARTNER.name}`).first()).toBeVisible();
  });

  test('clicking roster athlete opens ChatScreen for that athlete', async ({ page }) => {
    await mockChatEndpoints(page);
    await goToChat(page);
    await page.locator('xpath=//h2[contains(text(),"Inbox")]/../button').click();
    await page.waitForSelector('h3:has-text("My Roster")', { timeout: 5000 });
    // Click the roster athlete card button (not the conversation row h4)
    await page.locator('button').filter({ has: page.locator(`h4:has-text("${MOCK_PARTNER.name}")`) }).click();
    await expect(page.locator(`h3:has-text("${MOCK_PARTNER.name}")`)).toBeVisible({ timeout: 8000 });
  });

  // ── Delete conversation ────────────────────────────────────────────────────

  test('hovering over a conversation reveals delete button; clicking shows confirmation modal', async ({ page }) => {
    await mockChatEndpoints(page);
    await goToChat(page);
    await page.waitForSelector(`text=${MOCK_PARTNER.name}`, { timeout: 8000 });

    // Hover to reveal the trash icon
    await page.locator(`text=${MOCK_PARTNER.name}`).first().hover();
    await page.locator('[class*="opacity-0"][class*="group-hover"]').first().click({ force: true });

    await expect(page.locator('text=Delete Conversation?')).toBeVisible({ timeout: 5000 });
  });
});
