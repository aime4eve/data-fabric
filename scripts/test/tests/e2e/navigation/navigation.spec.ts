import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests for Navigation and UI Components
 * 
 * This test suite covers:
 * - Main navigation menu
 * - Breadcrumb navigation
 * - Page routing and URL handling
 * - Mobile responsive navigation
 * - User menu and dropdown
 * - Footer links
 */

test.describe('Navigation Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await expect(page.locator('[data-testid="main-layout"]')).toBeVisible();
  });

  test('should display main navigation correctly', async ({ page }) => {
    // Check if main navigation is visible
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    
    // Check navigation items
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-documents"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-search"]')).toBeVisible();
    
    // Check logo/brand
    await expect(page.locator('[data-testid="brand-logo"]')).toBeVisible();
    
    // Check user menu area
    await expect(page.locator('[data-testid="user-menu-area"]')).toBeVisible();
  });

  test('should navigate to different pages correctly', async ({ page }) => {
    // Navigate to Documents page
    await page.click('[data-testid="nav-documents"]');
    await expect(page).toHaveURL(/.*\/documents/);
    await expect(page.locator('h1')).toContainText('文档管理');
    
    // Navigate to Search page
    await page.click('[data-testid="nav-search"]');
    await expect(page).toHaveURL(/.*\/search/);
    await expect(page.locator('[data-testid="search-page"]')).toBeVisible();
    
    // Navigate back to Home
    await page.click('[data-testid="nav-home"]');
    await expect(page).toHaveURL(/.*\/$/);
    await expect(page.locator('[data-testid="home-page"]')).toBeVisible();
  });

  test('should handle breadcrumb navigation', async ({ page }) => {
    // Navigate to a nested page (e.g., document details)
    await page.goto('/documents');
    
    // Click on a document to go to details page
    const firstDocument = page.locator('[data-testid="document-card"]').first();
    if (await firstDocument.isVisible()) {
      await firstDocument.click();
      
      // Check breadcrumb
      await expect(page.locator('[data-testid="breadcrumb"]')).toBeVisible();
      await expect(page.locator('[data-testid="breadcrumb-home"]')).toBeVisible();
      await expect(page.locator('[data-testid="breadcrumb-documents"]')).toBeVisible();
      await expect(page.locator('[data-testid="breadcrumb-current"]')).toBeVisible();
      
      // Click on breadcrumb to navigate back
      await page.click('[data-testid="breadcrumb-documents"]');
      await expect(page).toHaveURL(/.*\/documents$/);
    }
  });

  test('should handle mobile navigation menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if mobile menu button is visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Desktop navigation should be hidden
    await expect(page.locator('[data-testid="desktop-navigation"]')).not.toBeVisible();
    
    // Click mobile menu button
    await page.click('[data-testid="mobile-menu-button"]');
    
    // Mobile menu should open
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Check mobile navigation items
    await expect(page.locator('[data-testid="mobile-nav-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-documents"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-search"]')).toBeVisible();
    
    // Navigate using mobile menu
    await page.click('[data-testid="mobile-nav-documents"]');
    await expect(page).toHaveURL(/.*\/documents/);
    
    // Mobile menu should close after navigation
    await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();
  });

  test('should handle user menu when logged in', async ({ page }) => {
    // Use authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      }));
    });
    
    await page.reload();
    
    // Check if user menu is visible
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Click user menu
    await page.click('[data-testid="user-menu"]');
    
    // Check dropdown items
    await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="profile-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="settings-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
    
    // Test profile navigation
    await page.click('[data-testid="profile-link"]');
    await expect(page).toHaveURL(/.*\/profile/);
  });

  test('should handle user menu when not logged in', async ({ page }) => {
    // Ensure no authentication
    await page.addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
    
    await page.reload();
    
    // Check if login/register buttons are visible
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-button"]')).toBeVisible();
    
    // User menu should not be visible
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
    
    // Click login button
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should handle active navigation states', async ({ page }) => {
    // Navigate to Documents page
    await page.click('[data-testid="nav-documents"]');
    
    // Documents nav item should be active
    await expect(page.locator('[data-testid="nav-documents"]')).toHaveClass(/active/);
    
    // Other nav items should not be active
    await expect(page.locator('[data-testid="nav-home"]')).not.toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-search"]')).not.toHaveClass(/active/);
    
    // Navigate to Search page
    await page.click('[data-testid="nav-search"]');
    
    // Search nav item should be active
    await expect(page.locator('[data-testid="nav-search"]')).toHaveClass(/active/);
    
    // Documents nav item should no longer be active
    await expect(page.locator('[data-testid="nav-documents"]')).not.toHaveClass(/active/);
  });

  test('should handle footer navigation', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Check if footer is visible
    await expect(page.locator('[data-testid="footer"]')).toBeVisible();
    
    // Check footer links
    await expect(page.locator('[data-testid="footer-about"]')).toBeVisible();
    await expect(page.locator('[data-testid="footer-help"]')).toBeVisible();
    await expect(page.locator('[data-testid="footer-contact"]')).toBeVisible();
    await expect(page.locator('[data-testid="footer-privacy"]')).toBeVisible();
    
    // Test footer link navigation
    await page.click('[data-testid="footer-about"]');
    await expect(page).toHaveURL(/.*\/about/);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test Tab navigation through main nav items
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="nav-home"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="nav-documents"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="nav-search"]')).toBeFocused();
    
    // Test Enter key navigation
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/.*\/search/);
  });

  test('should handle URL routing correctly', async ({ page }) => {
    // Test direct URL navigation
    await page.goto('/documents');
    await expect(page.locator('[data-testid="documents-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-documents"]')).toHaveClass(/active/);
    
    // Test nested URL
    await page.goto('/documents/create');
    await expect(page.locator('[data-testid="create-document-page"]')).toBeVisible();
    
    // Test invalid URL (404 page)
    await page.goto('/nonexistent-page');
    await expect(page.locator('[data-testid="404-page"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('页面未找到');
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate through several pages
    await page.click('[data-testid="nav-documents"]');
    await expect(page).toHaveURL(/.*\/documents/);
    
    await page.click('[data-testid="nav-search"]');
    await expect(page).toHaveURL(/.*\/search/);
    
    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL(/.*\/documents/);
    await expect(page.locator('[data-testid="nav-documents"]')).toHaveClass(/active/);
    
    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL(/.*\/search/);
    await expect(page.locator('[data-testid="nav-search"]')).toHaveClass(/active/);
  });

  test('should handle navigation with query parameters', async ({ page }) => {
    // Navigate to search with query
    await page.goto('/search?q=test&category=documentation');
    
    // Check if query parameters are preserved
    await expect(page).toHaveURL(/.*q=test.*category=documentation/);
    
    // Navigate to another page and back
    await page.click('[data-testid="nav-home"]');
    await page.goBack();
    
    // Query parameters should be preserved
    await expect(page).toHaveURL(/.*q=test.*category=documentation/);
  });

  test('should handle navigation loading states', async ({ page }) => {
    // Simulate slow navigation
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 1000);
    });
    
    // Click navigation item
    await page.click('[data-testid="nav-documents"]');
    
    // Should show loading indicator
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    
    // Wait for page to load
    await expect(page.locator('[data-testid="documents-page"]')).toBeVisible();
    
    // Loading indicator should disappear
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
  });

  test('should handle navigation accessibility', async ({ page }) => {
    // Check ARIA labels
    await expect(page.locator('[data-testid="main-navigation"]')).toHaveAttribute('role', 'navigation');
    await expect(page.locator('[data-testid="main-navigation"]')).toHaveAttribute('aria-label', '主导航');
    
    // Check skip link
    await expect(page.locator('[data-testid="skip-to-content"]')).toBeVisible();
    
    // Test skip link functionality
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="skip-to-content"]')).toBeFocused();
    
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="main-content"]')).toBeFocused();
    
    // Check navigation landmarks
    await expect(page.locator('nav[role="navigation"]')).toBeVisible();
    await expect(page.locator('main[role="main"]')).toBeVisible();
  });

  test('should handle responsive design breakpoints', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 320, height: 568 },  // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1024, height: 768 }, // Desktop small
      { width: 1920, height: 1080 } // Desktop large
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // Navigation should be visible and functional
      if (viewport.width < 768) {
        // Mobile: hamburger menu
        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      } else {
        // Desktop: full navigation
        await expect(page.locator('[data-testid="desktop-navigation"]')).toBeVisible();
      }
      
      // Logo should always be visible
      await expect(page.locator('[data-testid="brand-logo"]')).toBeVisible();
    }
  });
});