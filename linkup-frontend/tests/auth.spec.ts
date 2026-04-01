import { test, expect } from '@playwright/test';
import { blockWebSocket, mockDashboard } from './helpers/mocks';

const MOCK_USER = {
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
const MOCK_TOKEN = 'test-token-abc123';

// ── Login ──────────────────────────────────────────────────────────────────────

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await blockWebSocket(page);
    // Start unauthenticated — no seedAuth
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('shows login form when unauthenticated', async ({ page }) => {
    await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows error when submitting with empty fields', async ({ page }) => {
    await page.waitForSelector('h2:has-text("Welcome Back")', { timeout: 8000 });
    await page.click('button:has-text("Sign In")');
    await expect(
      page.locator('text=Please enter your email and password')
    ).toBeVisible({ timeout: 5000 });
  });

  test('shows API error for invalid credentials', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 401,
        json: { message: 'Invalid email or password' },
      })
    );

    await page.waitForSelector('h2:has-text("Welcome Back")', { timeout: 8000 });
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button:has-text("Sign In")');

    await expect(
      page.locator('text=Invalid email or password')
    ).toBeVisible({ timeout: 5000 });
  });

  test('successful login calls POST /api/auth/login and loads dashboard', async ({ page }) => {
    const loginRequest = page.waitForRequest(
      (req) => req.url().includes('/api/auth/login') && req.method() === 'POST'
    );

    await page.route('**/api/auth/login', (route) =>
      route.fulfill({ json: { token: MOCK_TOKEN, user: MOCK_USER } })
    );
    await mockDashboard(page);

    await page.waitForSelector('h2:has-text("Welcome Back")', { timeout: 8000 });
    await page.fill('input[type="email"]', 'alex@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    const req = await loginRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.email).toBe('alex@test.com');
    expect(body.password).toBe('password123');

    // After login the dashboard should load
    await expect(page.locator('button:has-text("View All")')).toBeVisible({ timeout: 8000 });
  });

  test('Create Account button shows sign-up step 1', async ({ page }) => {
    await page.waitForSelector('h2:has-text("Welcome Back")', { timeout: 8000 });
    await page.click('button:has-text("Create Account")');
    await expect(page.locator('h2:has-text("Create Account")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3:has-text("I am a...")')).toBeVisible();
  });

  test('Google sign-in shows placeholder message', async ({ page }) => {
    await page.waitForSelector('h2:has-text("Welcome Back")', { timeout: 8000 });
    await page.click('button:has-text("Sign in with Google")');
    await expect(
      page.locator('text=Google sign-in coming soon')
    ).toBeVisible({ timeout: 5000 });
  });
});

// ── Sign-up ────────────────────────────────────────────────────────────────────

test.describe('Sign-up', () => {
  test.beforeEach(async ({ page }) => {
    await blockWebSocket(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Navigate from login to sign-up step 1
    await page.waitForSelector('button:has-text("Create Account")', { timeout: 8000 });
    await page.click('button:has-text("Create Account")');
    await page.waitForSelector('h2:has-text("Create Account")', { timeout: 8000 });
  });

  test('step 1 shows role selection', async ({ page }) => {
    await expect(page.locator('h3:has-text("I am a...")')).toBeVisible();
    await expect(page.locator('h4:has-text("Athlete")')).toBeVisible();
  });

  test('back button on step 1 returns to login', async ({ page }) => {
    // The back arrow button on step 1 calls onBackToLogin
    await page.click('button:has(svg)'); // ArrowLeft icon button
    await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible({ timeout: 5000 });
  });

  test('clicking Athlete advances to step 2 (Basic Information)', async ({ page }) => {
    await page.click('h4:has-text("Athlete")');
    await expect(page.locator('h2:has-text("Basic Information")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder="Enter your full name"]')).toBeVisible();
  });

  test('step 2 Continue advances to step 3 (User Agreement)', async ({ page }) => {
    await page.click('h4:has-text("Athlete")');
    await page.waitForSelector('h2:has-text("Basic Information")', { timeout: 5000 });

    // Fill required fields and proceed
    await page.fill('input[placeholder="Enter your full name"]', 'Alex Pitcher');
    await page.fill('input[placeholder="your.email@example.com"]', 'alex@test.com');
    await page.fill('input[placeholder="(555) 123-4567"]', '5551234567');
    await page.fill('input[placeholder="City, State"]', 'Los Angeles, CA');
    await page.fill('input[placeholder="Create a strong password"]', 'Password123!');
    await page.fill('input[placeholder="Re-enter your password"]', 'Password123!');

    await page.click('button:has-text("Continue")');
    await expect(page.locator('h2:has-text("User Agreement")')).toBeVisible({ timeout: 5000 });
  });

  test('step 3 Continue is disabled until checkboxes and signature are filled', async ({ page }) => {
    await page.click('h4:has-text("Athlete")');
    await page.waitForSelector('h2:has-text("Basic Information")', { timeout: 5000 });
    await page.click('button:has-text("Continue")');
    await page.waitForSelector('h2:has-text("User Agreement")', { timeout: 5000 });

    // Continue should be disabled initially
    await expect(page.locator('button:has-text("Continue")')).toBeDisabled();

    // Check first checkbox
    await page.locator('input[type="checkbox"]').first().check();
    await expect(page.locator('button:has-text("Continue")')).toBeDisabled();

    // Check second checkbox
    await page.locator('input[type="checkbox"]').nth(1).check();
    await expect(page.locator('button:has-text("Continue")')).toBeDisabled();

    // Fill signature → button should enable
    await page.fill('input[placeholder="Type your full name"]', 'Alex Pitcher');
    await expect(page.locator('button:has-text("Continue")')).toBeEnabled({ timeout: 3000 });
  });

  test('full registration flow calls POST /api/auth/register and loads dashboard', async ({ page }) => {
    const registerRequest = page.waitForRequest(
      (req) => req.url().includes('/api/auth/register') && req.method() === 'POST'
    );

    await page.route('**/api/auth/register', (route) =>
      route.fulfill({ json: { token: MOCK_TOKEN, user: MOCK_USER } })
    );
    await mockDashboard(page);

    // Step 1: choose Athlete
    await page.click('h4:has-text("Athlete")');
    await page.waitForSelector('h2:has-text("Basic Information")', { timeout: 5000 });

    // Step 2: basic info
    await page.fill('input[placeholder="Enter your full name"]', 'Alex Pitcher');
    await page.fill('input[placeholder="your.email@example.com"]', 'alex@test.com');
    await page.fill('input[placeholder="(555) 123-4567"]', '5551234567');
    await page.fill('input[placeholder="City, State"]', 'Los Angeles, CA');
    await page.fill('input[placeholder="Create a strong password"]', 'Password123!');
    await page.fill('input[placeholder="Re-enter your password"]', 'Password123!');
    await page.click('button:has-text("Continue")');

    // Step 3: user agreement
    await page.waitForSelector('h2:has-text("User Agreement")', { timeout: 5000 });
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('input[type="checkbox"]').nth(1).check();
    await page.fill('input[placeholder="Type your full name"]', 'Alex Pitcher');
    await page.click('button:has-text("Continue")');

    // Step 4: athletic profile
    await page.waitForSelector('h2:has-text("Athletic Profile")', { timeout: 5000 });
    await page.selectOption('select', { label: 'Baseball' });
    await page.locator('select').nth(1).selectOption({ label: 'NCAA D1' });
    await page.click('button:has-text("Continue")');

    // Step 5: privacy settings → complete setup
    await page.waitForSelector('h2:has-text("Privacy Settings")', { timeout: 5000 });
    await page.click('button:has-text("Complete Setup")');

    const req = await registerRequest;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.email).toBe('alex@test.com');
    expect(body.role).toBe('athlete');
    expect(body.sport).toBe('Baseball');

    // Dashboard should load after successful registration
    await expect(page.locator('button:has-text("View All")')).toBeVisible({ timeout: 8000 });
  });
});
