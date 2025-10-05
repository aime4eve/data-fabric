import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication - Login Functionality
 * 
 * This test suite covers:
 * - Successful login with valid credentials
 * - Failed login with invalid credentials
 * - Login form validation
 * - Remember me functionality
 * - Password visibility toggle
 * - Redirect after login
 * - Logout functionality
 */

test.describe('Login Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login');
    
    // Wait for page to load
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should display login form correctly', async ({ page }) => {
    // Check if all form elements are present
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="remember-me-checkbox"]')).toBeVisible();
    
    // Check form title
    await expect(page.locator('h1')).toContainText('登录');
    
    // Check initial state
    await expect(page.locator('[data-testid="login-button"]')).toBeEnabled();
    await expect(page.locator('[data-testid="username-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="password-input"]')).toHaveValue('');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Submit form
    await page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Check if user is logged in (look for user menu or logout button)
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/login-success.png' });
  });

  test('should show error message with invalid credentials', async ({ page }) => {
    // Fill login form with invalid credentials
    await page.fill('[data-testid="username-input"]', 'wronguser');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    // Submit form
    await page.click('[data-testid="login-button"]');
    
    // Wait for error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('用户名或密码错误');
    
    // Should remain on login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/login-failure.png' });
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('[data-testid="login-button"]');
    
    // Check for validation errors
    await expect(page.locator('[data-testid="username-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="username-error"]')).toContainText('请输入用户名');
    
    // Fill username but leave password empty
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toContainText('请输入密码');
  });

  test('should toggle password visibility', async ({ page }) => {
    // Fill password field
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Check initial state (password should be hidden)
    await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('type', 'password');
    
    // Click toggle button
    await page.click('[data-testid="password-toggle"]');
    
    // Password should now be visible
    await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('type', 'text');
    
    // Click toggle button again
    await page.click('[data-testid="password-toggle"]');
    
    // Password should be hidden again
    await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('type', 'password');
  });

  test('should handle remember me functionality', async ({ page }) => {
    // Fill login form
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Check remember me checkbox
    await page.check('[data-testid="remember-me-checkbox"]');
    await expect(page.locator('[data-testid="remember-me-checkbox"]')).toBeChecked();
    
    // Submit form
    await page.click('[data-testid="login-button"]');
    
    // Wait for redirect
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Check if remember me token is stored (check localStorage or cookies)
    const rememberToken = await page.evaluate(() => localStorage.getItem('rememberToken'));
    expect(rememberToken).toBeTruthy();
  });

  test('should login with Enter key', async ({ page }) => {
    // Fill login form
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Press Enter in password field
    await page.press('[data-testid="password-input"]', 'Enter');
    
    // Wait for redirect
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show loading state during login', async ({ page }) => {
    // Fill login form
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Click login button
    await page.click('[data-testid="login-button"]');
    
    // Check loading state (button should be disabled and show loading text)
    await expect(page.locator('[data-testid="login-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="login-button"]')).toContainText('登录中...');
  });

  test('should redirect to intended page after login', async ({ page }) => {
    // Try to access protected page without login
    await page.goto('/documents/create');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Login
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Should be redirected to originally intended page
    await expect(page).toHaveURL(/.*\/documents\/create/);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/auth/login', route => {
      route.abort('failed');
    });
    
    // Fill and submit form
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Should show network error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('网络错误');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Click user menu
    await page.click('[data-testid="user-menu"]');
    
    // Click logout
    await page.click('[data-testid="logout-button"]');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Check that user data is cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });

  test('should handle session expiration', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Simulate expired token by intercepting API calls
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Token expired' })
      });
    });
    
    // Try to access a protected resource
    await page.click('[data-testid="documents-link"]');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Should show session expired message
    await expect(page.locator('[data-testid="info-message"]')).toContainText('会话已过期');
  });
});