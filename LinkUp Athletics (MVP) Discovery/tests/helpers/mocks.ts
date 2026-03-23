import { Page } from '@playwright/test';

export const MOCK_PARTNER = {
  _id: 'coach-001',
  name: 'Coach Rivera',
  avatar: 'CR',
  sport: 'Baseball',
  position: 'Coach',
  role: 'coach',
  skillLevel: 'Pro',
};

export const MOCK_COMPLETED_SESSION = {
  _id: 'session-001',
  sport: 'Baseball',
  role: 'Pitcher',
  date: 'Mar 10, 2026',
  time: '10:00 AM',
  location: 'Lincoln Park Fields',
  duration: '2 hours',
  status: 'completed',
  partner: MOCK_PARTNER,
  likes: [],
  comments: [],
};

export const MOCK_OPEN_SESSIONS = Array.from({ length: 3 }, (_, i) => ({
  _id: `open-session-${i}`,
  sport: 'Baseball',
  role: 'Pitcher',
  date: 'Apr 01, 2026',
  time: '9:00 AM',
  location: 'Riverside Park',
  duration: '1 hour',
  status: 'confirmed',
  partner: MOCK_PARTNER,
  likes: [],
  comments: [],
}));

export const MOCK_POST = {
  _id: 'post-001',
  type: 'thought',
  content: 'Great practice session today!',
  sport: 'Baseball',
  author: { _id: 'user-001', name: 'Alex Pitcher', avatar: 'AP' },
  likes: [],
  comments: [],
  createdAt: new Date().toISOString(),
};

export const OTHER_USER_POST = {
  _id: 'post-002',
  type: 'thought',
  content: 'Looking for a sparring partner.',
  sport: 'Baseball',
  author: { _id: 'other-user', name: 'Sam Coach', avatar: 'SC' },
  likes: [],
  comments: [],
  createdAt: new Date().toISOString(),
};

/** Block WebSocket and service worker so the app doesn't hang */
export async function blockWebSocket(page: Page) {
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route('**/sw.js', (route) => route.abort());
  await page.route('**/api/notifications/**', (route) =>
    route.fulfill({ json: { notifications: [] } })
  );
}

/** Mock all dashboard data endpoints */
export async function mockDashboard(page: Page, openSessions = MOCK_OPEN_SESSIONS) {
  await page.route('**/api/sessions/my**', (route) => {
    const url = route.request().url();
    if (url.includes('completed') || url.includes('cancelled')) {
      return route.fulfill({ json: { sessions: [MOCK_COMPLETED_SESSION] } });
    }
    return route.fulfill({ json: { sessions: openSessions } });
  });
  await page.route('**/api/connections/pending**', (route) =>
    route.fulfill({ json: { requests: [] } })
  );
  await page.route('**/api/ratings/received**', (route) =>
    route.fulfill({ json: { ratings: [] } })
  );
}

/** Mock the ratings submit endpoint and return a request interceptor */
export async function mockRatingsSubmit(page: Page) {
  await page.route('**/api/ratings', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        json: {
          rating: {
            _id: 'rating-001',
            overallRating: 5,
            rateeId: 'coach-001',
          },
        },
      });
    }
    return route.fulfill({ json: { ratings: [] } });
  });
}
