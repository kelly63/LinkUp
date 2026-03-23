import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket, mockDashboard, MOCK_POST, OTHER_USER_POST } from './helpers/mocks';

/**
 * NOTE: Post actions (like, comment, delete, report) live in LockerRoomView.tsx.
 * That component is currently not mounted in the main app navigation — it needs
 * to be wired to a tab (e.g. the "Locker room" / dashboard tab) for these tests
 * to run against the real UI.
 *
 * Once LockerRoomView is mounted, remove the test.skip calls and these tests
 * will cover the wired-up API calls.
 */

test.describe('Post actions (LockerRoomView)', () => {
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
        json: { posts: [MOCK_POST, OTHER_USER_POST], total: 2, page: 1, pages: 1 },
      });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test.skip('like button calls POST /api/posts/:id/like', async ({ page }) => {
    // TODO: LockerRoomView needs to be mounted on a navigable tab first.
    // When ready, navigate to the locker room tab, find the like button, click it,
    // and assert that POST /api/posts/post-001/like was called.
    const likeRequest = page.waitForRequest(
      (req) => req.url().includes(`/api/posts/${MOCK_POST._id}/like`) && req.method() === 'POST'
    );

    // Navigate to locker room tab (adjust selector when tab is wired)
    await page.click('button:has-text("Locker room")');
    await page.waitForSelector(`text=${MOCK_POST.content}`, { timeout: 8000 });

    await page.locator(`[data-post-id="${MOCK_POST._id}"] button[aria-label="like"]`).click();
    const req = await likeRequest;
    expect(req.url()).toContain(`/api/posts/${MOCK_POST._id}/like`);
  });

  test.skip('comment submit calls POST /api/posts/:id/comment', async ({ page }) => {
    // TODO: LockerRoomView needs to be mounted on a navigable tab first.
    const commentRequest = page.waitForRequest(
      (req) => req.url().includes(`/api/posts/${MOCK_POST._id}/comment`) && req.method() === 'POST'
    );

    await page.click('button:has-text("Locker room")');
    await page.waitForSelector(`text=${MOCK_POST.content}`, { timeout: 8000 });

    // Open comment panel, type comment, submit
    await page.locator(`[data-post-id="${MOCK_POST._id}"] button[aria-label="comment"]`).click();
    await page.locator(`[data-post-id="${MOCK_POST._id}"] input[placeholder*="comment"]`).fill('Great session!');
    await page.keyboard.press('Enter');

    const req = await commentRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.text).toBe('Great session!');
  });

  test.skip('delete own post calls DELETE /api/posts/:id', async ({ page }) => {
    // TODO: LockerRoomView needs to be mounted on a navigable tab first.
    const deleteRequest = page.waitForRequest(
      (req) => req.url().includes(`/api/posts/${MOCK_POST._id}`) && req.method() === 'DELETE'
    );

    await page.click('button:has-text("Locker room")');
    await page.waitForSelector(`text=${MOCK_POST.content}`, { timeout: 8000 });

    // Open 3-dot menu on own post and click Delete
    await page.locator(`[data-post-id="${MOCK_POST._id}"] button[aria-label="more"]`).click();
    await page.locator('button:has-text("Delete")').click();

    await deleteRequest;
    await expect(page.locator(`text=${MOCK_POST.content}`)).not.toBeVisible();
  });

  test.skip('report button is shown for posts by other users', async ({ page }) => {
    // TODO: LockerRoomView needs to be mounted on a navigable tab first.
    await page.click('button:has-text("Locker room")');
    await page.waitForSelector(`text=${OTHER_USER_POST.content}`, { timeout: 8000 });

    await page.locator(`[data-post-id="${OTHER_USER_POST._id}"] button[aria-label="more"]`).click();
    await expect(page.locator('button:has-text("Report")')).toBeVisible();
    await expect(page.locator('button:has-text("Delete")')).not.toBeVisible();
  });
});
