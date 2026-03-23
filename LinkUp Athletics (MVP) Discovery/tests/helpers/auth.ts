import { Page } from '@playwright/test';

export const MOCK_TOKEN = 'test-token-abc123';

export const MOCK_USER = {
  _id: 'user-001',
  name: 'Alex Pitcher',
  email: 'alex@test.com',
  role: 'athlete',
  sport: 'Baseball',
  position: 'Pitcher',
  skillLevel: 'NCAA D1',
  avatar: 'AP',
  averageRating: 4.5,
  ratingCount: 12,
  bio: 'Test athlete bio',
};

export async function seedAuth(page: Page) {
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('linkup_auth', JSON.stringify({ token, user }));
  }, { token: MOCK_TOKEN, user: MOCK_USER });
}
