import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers/auth';
import { blockWebSocket } from './helpers/mocks';

// ── fixtures ──────────────────────────────────────────────────────────────────

const ATHLETE_1 = {
  _id: 'athlete-001',
  name: 'Jordan Rivera',
  role: 'athlete',
  sport: 'Baseball',
  position: 'Pitcher (RHP)',
  skillLevel: 'NCAA D1',
  location: 'Los Angeles, CA',
  avatar: 'JR',
  averageRating: 4.7,
  ratingCount: 14,
};

const ATHLETE_2 = {
  _id: 'athlete-002',
  name: 'Sam Chen',
  role: 'athlete',
  sport: 'Basketball',
  position: 'Point Guard',
  skillLevel: 'NCAA D2',
  location: 'Santa Monica, CA',
  avatar: 'SC',
  averageRating: 4.2,
  ratingCount: 8,
};

const COACH_1 = {
  _id: 'coach-001',
  name: 'Coach Martinez',
  role: 'coach',
  sport: 'Baseball',
  position: 'Pitching Coach',
  skillLevel: 'Pro',
  location: 'Burbank, CA',
  avatar: 'CM',
  averageRating: 4.9,
  ratingCount: 31,
};

// ── mock helpers ──────────────────────────────────────────────────────────────

/** Stub all routes needed for the dashboard to render and show "Search Athletes" button */
async function mockDashboardEmpty(page: Page) {
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

/** Default users search: returns all three fixtures */
async function mockUsersSearch(page: Page, users = [ATHLETE_1, ATHLETE_2, COACH_1]) {
  await page.route('**/api/users**', (route) =>
    route.fulfill({ json: { users, total: users.length, page: 1, pages: 1 } })
  );
}

/** Navigate from the dashboard to the Athlete Search view */
async function openAthleteSearch(page: Page) {
  await page.waitForSelector('button:has-text("Search Athletes")', { timeout: 8000 });
  await page.click('button:has-text("Search Athletes")');
  await page.waitForSelector('h2:has-text("Search Athletes")', { timeout: 8000 });
}

// ── navigation ────────────────────────────────────────────────────────────────

test.describe('AthleteSearchView — navigation', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardEmpty(page);
    await mockUsersSearch(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('"Search Athletes" button is visible on dashboard', async ({ page }) => {
    await expect(page.locator('button:has-text("Search Athletes")')).toBeVisible({ timeout: 8000 });
  });

  test('"Search Athletes" button opens athlete search view', async ({ page }) => {
    await openAthleteSearch(page);
    await expect(page.locator('h2:has-text("Search Athletes")')).toBeVisible();
  });

  test('back arrow returns to dashboard', async ({ page }) => {
    await openAthleteSearch(page);
    await page.locator('.bg-white.border-b button').first().click();
    await expect(page.locator('h2:has-text("Search Athletes")')).not.toBeVisible({ timeout: 8000 });
  });
});

// ── initial results ───────────────────────────────────────────────────────────

test.describe('AthleteSearchView — initial results', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardEmpty(page);
    await mockUsersSearch(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openAthleteSearch(page);
  });

  test('shows result count on load', async ({ page }) => {
    await expect(page.locator('text=3 athletes found')).toBeVisible({ timeout: 6000 });
  });

  test('athlete names are rendered in cards', async ({ page }) => {
    await page.waitForSelector(`text=${ATHLETE_1.name}`, { timeout: 6000 });
    await expect(page.locator(`text=${ATHLETE_2.name}`)).toBeVisible();
    await expect(page.locator(`text=${COACH_1.name}`)).toBeVisible();
  });

  test('athlete position is shown on card', async ({ page }) => {
    await page.waitForSelector(`text=${ATHLETE_1.name}`, { timeout: 6000 });
    await expect(page.locator(`text=${ATHLETE_1.position}`).first()).toBeVisible();
  });

  test('sport badge is shown on card', async ({ page }) => {
    await page.waitForSelector(`text=${ATHLETE_1.name}`, { timeout: 6000 });
    await expect(page.locator(`span:has-text("${ATHLETE_1.sport}")`).first()).toBeVisible();
  });

  test('skill level badge is shown on card', async ({ page }) => {
    await page.waitForSelector(`text=${ATHLETE_1.name}`, { timeout: 6000 });
    await expect(page.locator(`text=${ATHLETE_1.skillLevel}`).first()).toBeVisible();
  });

  test('location is shown on card', async ({ page }) => {
    await page.waitForSelector(`text=${ATHLETE_1.name}`, { timeout: 6000 });
    await expect(page.locator(`text=${ATHLETE_1.location}`).first()).toBeVisible();
  });

  test('star rating is shown for athletes with a rating', async ({ page }) => {
    await page.waitForSelector(`text=${ATHLETE_1.averageRating.toFixed(1)}`, { timeout: 6000 });
  });

  test('ratings count is shown on card', async ({ page }) => {
    await page.waitForSelector(`text=${ATHLETE_1.ratingCount} ratings`, { timeout: 6000 });
  });

  test('each card has a Contact button', async ({ page }) => {
    await page.waitForSelector(`text=${ATHLETE_1.name}`, { timeout: 6000 });
    const contactBtns = page.locator('button:has-text("Contact")');
    await expect(contactBtns).toHaveCount(3);
  });

  test('each card has a Profile button', async ({ page }) => {
    await page.waitForSelector(`text=${ATHLETE_1.name}`, { timeout: 6000 });
    // Athlete cards use rounded-2xl; BottomTabBar Profile tab does not
    const profileBtns = page.locator('div.rounded-2xl button:has-text("Profile")');
    await expect(profileBtns).toHaveCount(3);
  });
});

// ── search input ──────────────────────────────────────────────────────────────

test.describe('AthleteSearchView — search input', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardEmpty(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openAthleteSearch(page);
  });

  test('search input has correct placeholder', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search by name"]')).toBeVisible();
  });

  test('typing a query triggers a filtered search and updates results', async ({ page }) => {
    // Override the route to return only one result for a specific query
    await page.route('**/api/users**', (route) => {
      const url = route.request().url();
      if (url.includes('search=jordan')) {
        return route.fulfill({ json: { users: [ATHLETE_1], total: 1, page: 1, pages: 1 } });
      }
      return route.fulfill({ json: { users: [ATHLETE_1, ATHLETE_2, COACH_1], total: 3, page: 1, pages: 1 } });
    });

    await page.fill('input[placeholder*="Search by name"]', 'jordan');
    // Debounce is 300 ms — wait for results to update
    await expect(page.locator('text=1 athlete found')).toBeVisible({ timeout: 3000 });
    await expect(page.locator(`text=${ATHLETE_1.name}`)).toBeVisible();
    await expect(page.locator(`text=${ATHLETE_2.name}`)).not.toBeVisible();
  });

  test('empty results show no-athletes message', async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({ json: { users: [], total: 0, page: 1, pages: 1 } })
    );

    await page.fill('input[placeholder*="Search by name"]', 'xyznonexistent');
    await expect(page.locator('text=No athletes found matching your criteria')).toBeVisible({ timeout: 3000 });
  });

  test('result count shows singular "athlete" for one result', async ({ page }) => {
    await page.route('**/api/users**', (route) =>
      route.fulfill({ json: { users: [ATHLETE_1], total: 1, page: 1, pages: 1 } })
    );

    await page.fill('input[placeholder*="Search by name"]', 'jordan');
    await expect(page.locator('text=1 athlete found')).toBeVisible({ timeout: 3000 });
  });
});

// ── sport filter ──────────────────────────────────────────────────────────────

test.describe('AthleteSearchView — sport filter', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardEmpty(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openAthleteSearch(page);
  });

  test('sport dropdown defaults to "All Sports"', async ({ page }) => {
    await expect(page.locator('select')).toHaveValue('All Sports');
  });

  test('sport dropdown contains expected sports', async ({ page }) => {
    const options = await page.locator('select option').allTextContents();
    expect(options).toContain('Baseball');
    expect(options).toContain('Basketball');
    expect(options).toContain('Soccer');
  });

  test('selecting a sport triggers a filtered API call', async ({ page }) => {
    let capturedUrl = '';
    await page.route('**/api/users**', (route) => {
      capturedUrl = route.request().url();
      return route.fulfill({ json: { users: [ATHLETE_1], total: 1, page: 1, pages: 1 } });
    });

    await page.selectOption('select', 'Baseball');
    await expect(page.locator('text=1 athlete found')).toBeVisible({ timeout: 3000 });
    expect(capturedUrl).toContain('sport=Baseball');
  });

  test('results update when sport filter changes', async ({ page }) => {
    await page.route('**/api/users**', (route) => {
      const url = route.request().url();
      if (url.includes('sport=Basketball')) {
        return route.fulfill({ json: { users: [ATHLETE_2], total: 1, page: 1, pages: 1 } });
      }
      return route.fulfill({ json: { users: [ATHLETE_1, ATHLETE_2, COACH_1], total: 3, page: 1, pages: 1 } });
    });

    await page.selectOption('select', 'Basketball');
    await expect(page.locator(`text=${ATHLETE_2.name}`)).toBeVisible({ timeout: 3000 });
    await expect(page.locator(`text=${ATHLETE_1.name}`)).not.toBeVisible();
  });
});

// ── level filter ──────────────────────────────────────────────────────────────

test.describe('AthleteSearchView — level filter', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardEmpty(page);
    await mockUsersSearch(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openAthleteSearch(page);
    // Wait for initial load
    await page.waitForSelector(`text=${ATHLETE_1.name}`, { timeout: 6000 });
  });

  test('"Levels" button is visible in the filter bar', async ({ page }) => {
    await expect(page.locator('button:has-text("Levels")')).toBeVisible();
  });

  test('clicking Levels button expands the level panel', async ({ page }) => {
    await page.click('button:has-text("Levels")');
    await expect(page.locator('text=Select skill levels')).toBeVisible();
  });

  test('level panel shows all five level options', async ({ page }) => {
    await page.click('button:has-text("Levels")');
    for (const level of ['NCAA D1', 'NCAA D2', 'NCAA D3', 'College - Other', 'Pro']) {
      await expect(page.locator(`button:has-text("${level}")`).last()).toBeVisible();
    }
  });

  test('selecting a level shows count on the button', async ({ page }) => {
    await page.click('button:has-text("Levels")');
    await page.locator('button:has-text("NCAA D1")').last().click();
    await expect(page.locator('button:has-text("Levels (1)")')).toBeVisible();
  });

  test('selecting a second level increments the count', async ({ page }) => {
    await page.click('button:has-text("Levels")');
    await page.locator('button:has-text("NCAA D1")').last().click();
    await page.locator('button:has-text("NCAA D2")').last().click();
    await expect(page.locator('button:has-text("Levels (2)")')).toBeVisible();
  });

  test('deselecting a level decrements the count', async ({ page }) => {
    await page.click('button:has-text("Levels")');
    await page.locator('button:has-text("NCAA D1")').last().click();
    await page.locator('button:has-text("NCAA D1")').last().click();
    await expect(page.locator('button:has-text("Levels")')).toBeVisible();
    await expect(page.locator('button:has-text("Levels (1)")')).not.toBeVisible();
  });

  test('"Clear all" button appears when a level is selected', async ({ page }) => {
    await page.click('button:has-text("Levels")');
    await page.locator('button:has-text("NCAA D1")').last().click();
    await expect(page.locator('button:has-text("Clear all")')).toBeVisible();
  });

  test('"Clear all" resets selected levels', async ({ page }) => {
    await page.click('button:has-text("Levels")');
    await page.locator('button:has-text("NCAA D1")').last().click();
    await page.locator('button:has-text("NCAA D2")').last().click();
    await page.click('button:has-text("Clear all")');
    await expect(page.locator('button:has-text("Levels (2)")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Clear all")')).not.toBeVisible();
  });

  test('selected level triggers an API call with skillLevel param', async ({ page }) => {
    let capturedUrl = '';
    await page.route('**/api/users**', (route) => {
      capturedUrl = route.request().url();
      return route.fulfill({ json: { users: [ATHLETE_1], total: 1, page: 1, pages: 1 } });
    });

    await page.click('button:has-text("Levels")');
    await page.locator('button:has-text("NCAA D1")').last().click();
    await expect(page.locator('text=1 athlete found')).toBeVisible({ timeout: 3000 });
    // URLSearchParams encodes spaces as '+', so just check key presence and value fragment
    expect(capturedUrl).toContain('skillLevel=');
    expect(capturedUrl).toContain('NCAA');
  });
});

// ── Contact and Profile buttons ───────────────────────────────────────────────

test.describe('AthleteSearchView — card actions', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardEmpty(page);
    await mockUsersSearch(page, [ATHLETE_1]);
    // User profile route for when "Profile" is clicked
    await page.route(`**/api/users/${ATHLETE_1._id}**`, (route) =>
      route.fulfill({ json: { user: ATHLETE_1 } })
    );
    await page.route(`**/api/connections/status/${ATHLETE_1._id}**`, (route) =>
      route.fulfill({ json: { status: 'none' } })
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openAthleteSearch(page);
    await page.waitForSelector(`text=${ATHLETE_1.name}`, { timeout: 6000 });
  });

  test('"Contact" button activates the Chat tab in the bottom nav', async ({ page }) => {
    await page.click('button:has-text("Contact")');
    // onOpenChat calls onTabChange('chat') — the Chat nav button gains text-blue-900
    await expect(page.locator('button:has-text("Chat")')).toHaveClass(/text-blue-900/, { timeout: 4000 });
  });

  test('"Profile" button navigates to user profile view', async ({ page }) => {
    await page.click('button:has-text("Profile")');
    await expect(page.locator('h2:has-text("Profile")')).toBeVisible({ timeout: 8000 });
    await expect(page.locator(`text=${ATHLETE_1.name}`).first()).toBeVisible();
  });
});

// ── QR scanner modal ──────────────────────────────────────────────────────────

test.describe('AthleteSearchView — QR scanner', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardEmpty(page);
    await mockUsersSearch(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openAthleteSearch(page);
    await page.waitForSelector(`text=${ATHLETE_1.name}`, { timeout: 6000 });
  });

  test('"Scan QR" button is visible in the header', async ({ page }) => {
    await expect(page.locator('button:has-text("Scan QR")')).toBeVisible();
  });

  test('"Scan QR" opens the scanner modal', async ({ page }) => {
    await page.click('button:has-text("Scan QR")');
    await expect(page.locator('text=Scan QR Code')).toBeVisible();
    await expect(page.locator('button:has-text("Start Scanning")')).toBeVisible();
  });

  test('X button closes the scanner modal', async ({ page }) => {
    await page.click('button:has-text("Scan QR")');
    await page.waitForSelector('text=Scan QR Code');
    await page.locator('text=Scan QR Code').locator('..').locator('button').last().click();
    await expect(page.locator('text=Scan QR Code')).not.toBeVisible({ timeout: 4000 });
  });

  test('clicking the backdrop closes the scanner modal', async ({ page }) => {
    await page.click('button:has-text("Scan QR")');
    await page.waitForSelector('text=Scan QR Code');
    // Click on the dark overlay outside the modal card
    await page.mouse.click(10, 10);
    await expect(page.locator('text=Scan QR Code')).not.toBeVisible({ timeout: 4000 });
  });

  test('"Start Scanning" transitions to scanning state', async ({ page }) => {
    await page.click('button:has-text("Scan QR")');
    await page.click('button:has-text("Start Scanning")');
    await expect(page.locator('text=Scanning...')).toBeVisible({ timeout: 4000 });
  });

  test('scanning completes and shows success state with scanned user info', async ({ page }) => {
    await page.click('button:has-text("Scan QR")');
    await page.click('button:has-text("Start Scanning")');
    // Simulated scan takes 2 s
    await expect(page.locator('text=QR Code Scanned!')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Alex Rodriguez')).toBeVisible();
    await expect(page.locator('button:has-text("View Profile")')).toBeVisible();
  });

  test('"Cancel" in success state closes the modal', async ({ page }) => {
    await page.click('button:has-text("Scan QR")');
    await page.click('button:has-text("Start Scanning")');
    await page.waitForSelector('button:has-text("Cancel")', { timeout: 5000 });
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('text=Scan QR Code')).not.toBeVisible({ timeout: 4000 });
  });
});

// ── location accordion ────────────────────────────────────────────────────────

test.describe('AthleteSearchView — location filter', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardEmpty(page);
    await mockUsersSearch(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openAthleteSearch(page);
    await page.waitForSelector(`text=${ATHLETE_1.name}`, { timeout: 6000 });
  });

  test('location accordion shows current location and radius', async ({ page }) => {
    await expect(page.locator('text=Los Angeles, CA • 25 mi radius')).toBeVisible();
  });

  test('clicking location accordion expands the location panel', async ({ page }) => {
    await page.click('text=Los Angeles, CA • 25 mi radius');
    await expect(page.locator('text=Search Radius')).toBeVisible();
  });

  test('radius options are shown when location panel is open', async ({ page }) => {
    await page.click('text=Los Angeles, CA • 25 mi radius');
    for (const r of ['5 mi', '10 mi', '25 mi', '50 mi', '100 mi']) {
      await expect(page.getByRole('button', { name: r, exact: true })).toBeVisible();
    }
  });

  test('selecting a radius updates the displayed radius', async ({ page }) => {
    await page.click('text=Los Angeles, CA • 25 mi radius');
    await page.click('button:has-text("50 mi")');
    await expect(page.locator('text=Los Angeles, CA • 50 mi radius')).toBeVisible();
  });

  test('"Apply Location" collapses the location panel', async ({ page }) => {
    await page.click('text=Los Angeles, CA • 25 mi radius');
    await page.waitForSelector('text=Search Radius');
    await page.click('button:has-text("Apply Location")');
    await expect(page.locator('text=Search Radius')).not.toBeVisible({ timeout: 4000 });
  });
});

// ── empty state ───────────────────────────────────────────────────────────────

test.describe('AthleteSearchView — empty state', () => {
  test('shows no-results message when API returns empty list', async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardEmpty(page);
    await mockUsersSearch(page, []);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openAthleteSearch(page);

    await expect(page.locator('text=No athletes found matching your criteria')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('text=Try adjusting your filters')).toBeVisible();
  });

  test('shows 0 count when results are empty', async ({ page }) => {
    await seedAuth(page);
    await blockWebSocket(page);
    await mockDashboardEmpty(page);
    await mockUsersSearch(page, []);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openAthleteSearch(page);

    await expect(page.locator('text=0 athletes found')).toBeVisible({ timeout: 6000 });
  });
});
