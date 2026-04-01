import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard, MOCK_POST, OTHER_USER_POST } from './helpers/mocks';

const MY_POST = { ...MOCK_POST, _id: 'post-mine', author: { _id: 'user-001', name: 'Alex Pitcher', avatar: 'AP' } };
const OTHER_POST = { ...OTHER_USER_POST, _id: 'post-other', author: { _id: 'other-user', name: 'Sam Coach', avatar: 'SC' } };

async function goToLockerRoom(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button:has-text("Community Feed")', { timeout: 8000 });
  await page.click('button:has-text("Community Feed")');
  await expect(page.locator('h2:has-text("Locker Room")')).toBeVisible({ timeout: 6000 });
}

test.describe('LockerRoomView', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboard(page);

    await page.route('**/api/posts**', (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === 'POST' && url.includes('/like')) {
        return route.fulfill({ json: { likes: ['user-001'] } });
      }
      if (method === 'POST' && url.includes('/comment')) {
        return route.fulfill({
          json: {
            comment: {
              _id: 'comment-001',
              text: 'Great session!',
              author: { _id: 'user-001', name: 'Alex Pitcher', avatar: 'AP' },
              createdAt: new Date().toISOString(),
            },
          },
        });
      }
      if (method === 'DELETE') {
        return route.fulfill({ json: { message: 'Deleted' } });
      }
      // GET feed
      return route.fulfill({
        json: { posts: [MY_POST, OTHER_POST], total: 2, page: 1, pages: 1 },
      });
    });
  });

  // ── Navigation ──────────────────────────────────────────────────────────────

  test('dashboard shows "Community Feed" entry button', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button:has-text("Community Feed")', { timeout: 8000 });
    await expect(page.locator('button:has-text("Community Feed")')).toBeVisible();
  });

  test('clicking Community Feed navigates to LockerRoomView', async ({ page }) => {
    await goToLockerRoom(page);
    await expect(page.locator('h2:has-text("Locker Room")')).toBeVisible();
  });

  test('back button returns to the dashboard', async ({ page }) => {
    await goToLockerRoom(page);
    await page.locator('xpath=//h2[text()="Locker Room"]/../button').click();
    await expect(page.locator('h2:has-text("Community Feed")')).not.toBeVisible({ timeout: 6000 });
    await expect(page.locator('button:has-text("Community Feed")')).toBeVisible({ timeout: 6000 });
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  test('shows "Locker Room" heading', async ({ page }) => {
    await goToLockerRoom(page);
    await expect(page.locator('h2:has-text("Locker Room")')).toBeVisible();
  });

  test('shows filter chips: All, Sessions, Thoughts, Articles', async ({ page }) => {
    await goToLockerRoom(page);
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Sessions")')).toBeVisible();
    await expect(page.locator('button:has-text("Thoughts")')).toBeVisible();
    await expect(page.locator('button:has-text("Articles")')).toBeVisible();
  });

  test('shows quick-post bar with placeholder text', async ({ page }) => {
    await goToLockerRoom(page);
    await expect(page.locator('text=Share thoughts or a session update')).toBeVisible();
  });

  test('shows post cards from the feed', async ({ page }) => {
    await goToLockerRoom(page);
    await expect(page.locator(`text=${MY_POST.content}`)).toBeVisible({ timeout: 8000 });
    await expect(page.locator(`text=${OTHER_POST.content}`)).toBeVisible({ timeout: 8000 });
  });

  test('shows author name on each post card', async ({ page }) => {
    await goToLockerRoom(page);
    await expect(page.locator(`text=${MY_POST.author.name}`).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator(`text=${OTHER_POST.author.name}`).first()).toBeVisible({ timeout: 8000 });
  });

  test('shows like and comment buttons on each post', async ({ page }) => {
    await goToLockerRoom(page);
    await page.waitForSelector(`text=${MY_POST.content}`, { timeout: 8000 });
    // Each post card has a Heart button and a MessageCircle button
    const likeButtons = page.locator('button').filter({ has: page.locator('svg.lucide-heart') });
    await expect(likeButtons.first()).toBeVisible();
    const commentButtons = page.locator('button').filter({ has: page.locator('svg.lucide-message-circle') });
    await expect(commentButtons.first()).toBeVisible();
  });

  test('shows ⋮ menu button on each post', async ({ page }) => {
    await goToLockerRoom(page);
    await page.waitForSelector(`text=${MY_POST.content}`, { timeout: 8000 });
    const menuButtons = page.locator('button').filter({ has: page.locator('svg.lucide-more-vertical') });
    await expect(menuButtons.first()).toBeVisible();
  });

  // ── Like ────────────────────────────────────────────────────────────────────

  test('like button calls POST /api/posts/:id/like', async ({ page }) => {
    const likeRequest = page.waitForRequest(
      (req) => req.url().includes(`/api/posts/${MY_POST._id}/like`) && req.method() === 'POST'
    );

    await goToLockerRoom(page);
    await page.waitForSelector(`text=${MY_POST.content}`, { timeout: 8000 });

    const likeButtons = page.locator('button').filter({ has: page.locator('svg.lucide-heart') });
    await likeButtons.first().click();

    const req = await likeRequest;
    expect(req.url()).toContain(`/api/posts/${MY_POST._id}/like`);
  });

  test('like button updates count optimistically', async ({ page }) => {
    await goToLockerRoom(page);
    await page.waitForSelector(`text=${MY_POST.content}`, { timeout: 8000 });

    const likeButtons = page.locator('button').filter({ has: page.locator('svg.lucide-heart') });
    const firstLikeBtn = likeButtons.first();
    // Initial like count is 0 (MY_POST.likes = [])
    await expect(firstLikeBtn.locator('span')).toHaveText('0');
    await firstLikeBtn.click();
    await expect(firstLikeBtn.locator('span')).toHaveText('1');
  });

  // ── Comments ────────────────────────────────────────────────────────────────

  test('clicking comment button opens the comment panel', async ({ page }) => {
    await goToLockerRoom(page);
    await page.waitForSelector(`text=${MY_POST.content}`, { timeout: 8000 });

    const commentButtons = page.locator('button').filter({ has: page.locator('svg.lucide-message-circle') });
    await commentButtons.first().click();

    await expect(page.locator('input[placeholder="Add a comment…"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('submitting a comment calls POST /api/posts/:id/comment', async ({ page }) => {
    const commentRequest = page.waitForRequest(
      (req) => req.url().includes(`/api/posts/${MY_POST._id}/comment`) && req.method() === 'POST'
    );

    await goToLockerRoom(page);
    await page.waitForSelector(`text=${MY_POST.content}`, { timeout: 8000 });

    const commentButtons = page.locator('button').filter({ has: page.locator('svg.lucide-message-circle') });
    await commentButtons.first().click();

    const input = page.locator('input[placeholder="Add a comment…"]').first();
    await input.fill('Great session!');
    await input.press('Enter');

    const req = await commentRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.text).toBe('Great session!');
  });

  test('submitted comment appears in the panel', async ({ page }) => {
    await goToLockerRoom(page);
    await page.waitForSelector(`text=${MY_POST.content}`, { timeout: 8000 });

    const commentButtons = page.locator('button').filter({ has: page.locator('svg.lucide-message-circle') });
    await commentButtons.first().click();

    const input = page.locator('input[placeholder="Add a comment…"]').first();
    await input.fill('Great session!');
    await input.press('Enter');

    await expect(page.locator('text=Great session!').first()).toBeVisible({ timeout: 6000 });
  });

  // ── ⋮ menu ──────────────────────────────────────────────────────────────────

  test('⋮ menu on own post shows "Delete post"', async ({ page }) => {
    await goToLockerRoom(page);
    await page.waitForSelector(`text=${MY_POST.content}`, { timeout: 8000 });

    // First menu button corresponds to the first post (MY_POST, owned by user-001)
    const menuButtons = page.locator('button').filter({ has: page.locator('svg.lucide-more-vertical') });
    await menuButtons.first().click();

    await expect(page.locator('button:has-text("Delete post")')).toBeVisible({ timeout: 5000 });
  });

  test('⋮ menu always shows "Report post"', async ({ page }) => {
    await goToLockerRoom(page);
    await page.waitForSelector(`text=${MY_POST.content}`, { timeout: 8000 });

    const menuButtons = page.locator('button').filter({ has: page.locator('svg.lucide-more-vertical') });
    await menuButtons.first().click();

    await expect(page.locator('button:has-text("Report post")')).toBeVisible({ timeout: 5000 });
  });

  test('deleting own post calls DELETE /api/posts/:id', async ({ page }) => {
    const deleteRequest = page.waitForRequest(
      (req) => req.url().includes(`/api/posts/${MY_POST._id}`) && req.method() === 'DELETE'
    );

    await goToLockerRoom(page);
    await page.waitForSelector(`text=${MY_POST.content}`, { timeout: 8000 });

    const menuButtons = page.locator('button').filter({ has: page.locator('svg.lucide-more-vertical') });
    await menuButtons.first().click();
    await page.click('button:has-text("Delete post")');

    await deleteRequest;
    await expect(page.locator(`text=${MY_POST.content}`)).not.toBeVisible({ timeout: 6000 });
  });

  // ── Filter chips ─────────────────────────────────────────────────────────────

  test('"All" filter is active by default', async ({ page }) => {
    await goToLockerRoom(page);
    await expect(page.locator('button:has-text("All")')).toHaveClass(/bg-blue-600/);
  });

  test('clicking a filter chip switches active style', async ({ page }) => {
    await goToLockerRoom(page);
    await page.click('button:has-text("Thoughts")');
    await expect(page.locator('button:has-text("Thoughts")')).toHaveClass(/bg-blue-600/);
    await expect(page.locator('button:has-text("All")')).not.toHaveClass(/bg-blue-600/);
  });

  test('switching filter refetches the feed', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/posts')) requests.push(req.url());
    });

    await goToLockerRoom(page);
    await page.waitForSelector(`text=${MY_POST.content}`, { timeout: 8000 });

    const before = requests.length;
    await page.click('button:has-text("Sessions")');
    await page.waitForTimeout(500);
    expect(requests.length).toBeGreaterThan(before);
  });

  // ── Create post dialog ───────────────────────────────────────────────────────

  test('+ button opens Create Post dialog', async ({ page }) => {
    await goToLockerRoom(page);
    // The PlusCircle button in the header
    await page.locator('button').filter({ has: page.locator('svg.lucide-plus-circle') }).first().click();
    await expect(page.locator('[role="dialog"]').or(page.locator('text=Create Post')).first()).toBeVisible({ timeout: 5000 });
  });

  test('quick-post bar also opens Create Post dialog', async ({ page }) => {
    await goToLockerRoom(page);
    await page.click('text=Share thoughts or a session update');
    await expect(page.locator('[role="dialog"]').or(page.locator('text=Create Post')).first()).toBeVisible({ timeout: 5000 });
  });
});
