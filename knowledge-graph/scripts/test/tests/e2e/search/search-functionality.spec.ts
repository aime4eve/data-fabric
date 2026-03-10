import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests for Search Functionality
 * 
 * This test suite covers:
 * - Basic text search
 * - Advanced search with filters
 * - Search suggestions and autocomplete
 * - Search history
 * - Search result navigation
 * - Search performance
 */

test.describe('Search Functionality', () => {
  // Use authenticated state for all tests
  test.use({ storageState: path.join(__dirname, '../../../auth-states/user-auth.json') });

  test.beforeEach(async ({ page }) => {
    // Navigate to main page with search functionality
    await page.goto('/');
    await expect(page.locator('[data-testid="search-bar"]')).toBeVisible();
  });

  test('should perform basic text search successfully', async ({ page }) => {
    // Enter search query
    await page.fill('[data-testid="search-input"]', 'API documentation');
    
    // Submit search
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for search results page
    await expect(page).toHaveURL(/.*\/search\?q=API%20documentation/);
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Verify search results contain the query term
    const searchResults = page.locator('[data-testid="search-result-item"]');
    await expect(searchResults.first()).toBeVisible();
    
    // Check if search term is highlighted in results
    await expect(page.locator('[data-testid="search-highlight"]')).toBeVisible();
    
    // Verify search statistics
    const resultCount = await page.locator('[data-testid="result-count"]').textContent();
    expect(resultCount).toMatch(/找到 \d+ 个结果/);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/search-results.png' });
  });

  test('should show search suggestions while typing', async ({ page }) => {
    // Start typing in search input
    await page.fill('[data-testid="search-input"]', 'API');
    
    // Wait for suggestions to appear
    await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
    
    // Verify suggestions contain relevant terms
    const suggestions = page.locator('[data-testid="suggestion-item"]');
    await expect(suggestions.first()).toBeVisible();
    
    // Click on a suggestion
    await suggestions.first().click();
    
    // Should navigate to search results
    await expect(page).toHaveURL(/.*\/search/);
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('should handle autocomplete functionality', async ({ page }) => {
    // Type partial query
    await page.fill('[data-testid="search-input"]', 'docu');
    
    // Wait for autocomplete dropdown
    await expect(page.locator('[data-testid="autocomplete-dropdown"]')).toBeVisible();
    
    // Use keyboard navigation
    await page.press('[data-testid="search-input"]', 'ArrowDown');
    await page.press('[data-testid="search-input"]', 'ArrowDown');
    
    // Select with Enter
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Should perform search with selected term
    await expect(page).toHaveURL(/.*\/search/);
  });

  test('should perform advanced search with filters', async ({ page }) => {
    // Click advanced search button
    await page.click('[data-testid="advanced-search-btn"]');
    
    // Wait for advanced search modal
    await expect(page.locator('[data-testid="advanced-search-modal"]')).toBeVisible();
    
    // Fill advanced search form
    await page.fill('[data-testid="title-search"]', 'User Manual');
    await page.fill('[data-testid="content-search"]', 'tutorial');
    await page.selectOption('[data-testid="category-filter"]', 'documentation');
    await page.fill('[data-testid="tags-filter"]', 'help,guide');
    
    // Set date range
    await page.fill('[data-testid="date-from"]', '2023-01-01');
    await page.fill('[data-testid="date-to"]', '2023-12-31');
    
    // Select author
    await page.selectOption('[data-testid="author-filter"]', 'admin');
    
    // Submit advanced search
    await page.click('[data-testid="advanced-search-submit"]');
    
    // Wait for filtered results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Verify applied filters are shown
    await expect(page.locator('[data-testid="active-filters"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-category"]')).toContainText('documentation');
    
    // Verify results match filters
    const results = page.locator('[data-testid="search-result-item"]');
    const count = await results.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const result = results.nth(i);
      await expect(result.locator('[data-testid="result-category"]')).toContainText('documentation');
    }
  });

  test('should handle search with no results', async ({ page }) => {
    // Search for something that doesn't exist
    await page.fill('[data-testid="search-input"]', 'xyznonexistentquery123');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for no results page
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-results-message"]')).toContainText('未找到相关结果');
    
    // Check if search suggestions are provided
    await expect(page.locator('[data-testid="search-suggestions-help"]')).toBeVisible();
    
    // Verify search tips are shown
    await expect(page.locator('[data-testid="search-tips"]')).toBeVisible();
  });

  test('should manage search history', async ({ page }) => {
    // Perform several searches
    const searchQueries = ['API documentation', 'User guide', 'Tutorial'];
    
    for (const query of searchQueries) {
      await page.fill('[data-testid="search-input"]', query);
      await page.press('[data-testid="search-input"]', 'Enter');
      await page.waitForURL(/.*\/search/);
      await page.goBack();
    }
    
    // Click on search input to show history
    await page.click('[data-testid="search-input"]');
    
    // Wait for search history dropdown
    await expect(page.locator('[data-testid="search-history"]')).toBeVisible();
    
    // Verify recent searches are shown
    for (const query of searchQueries) {
      await expect(page.locator('[data-testid="history-item"]').filter({ hasText: query })).toBeVisible();
    }
    
    // Click on a history item
    await page.locator('[data-testid="history-item"]').first().click();
    
    // Should perform search with historical query
    await expect(page).toHaveURL(/.*\/search/);
  });

  test('should clear search history', async ({ page }) => {
    // Perform a search to create history
    await page.fill('[data-testid="search-input"]', 'test search');
    await page.press('[data-testid="search-input"]', 'Enter');
    await page.goBack();
    
    // Open search history
    await page.click('[data-testid="search-input"]');
    await expect(page.locator('[data-testid="search-history"]')).toBeVisible();
    
    // Clear history
    await page.click('[data-testid="clear-history-btn"]');
    
    // Confirm clearing
    await page.click('[data-testid="confirm-clear-history"]');
    
    // History should be empty
    await expect(page.locator('[data-testid="empty-history"]')).toBeVisible();
  });

  test('should sort search results', async ({ page }) => {
    // Perform search
    await page.fill('[data-testid="search-input"]', 'documentation');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Change sort order
    await page.selectOption('[data-testid="sort-select"]', 'date-desc');
    
    // Wait for results to update
    await page.waitForTimeout(1000);
    
    // Verify results are sorted by date (newest first)
    const resultDates = await page.locator('[data-testid="result-date"]').allTextContents();
    
    for (let i = 0; i < resultDates.length - 1; i++) {
      const currentDate = new Date(resultDates[i]);
      const nextDate = new Date(resultDates[i + 1]);
      expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
    }
    
    // Sort by relevance
    await page.selectOption('[data-testid="sort-select"]', 'relevance');
    await page.waitForTimeout(1000);
    
    // Verify relevance scores are in descending order
    const relevanceScores = await page.locator('[data-testid="relevance-score"]').allTextContents();
    
    for (let i = 0; i < relevanceScores.length - 1; i++) {
      const currentScore = parseFloat(relevanceScores[i]);
      const nextScore = parseFloat(relevanceScores[i + 1]);
      expect(currentScore).toBeGreaterThanOrEqual(nextScore);
    }
  });

  test('should filter search results', async ({ page }) => {
    // Perform search
    await page.fill('[data-testid="search-input"]', 'guide');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Apply category filter
    await page.click('[data-testid="filter-category-documentation"]');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
    
    // Verify all results are from documentation category
    const results = page.locator('[data-testid="search-result-item"]');
    const count = await results.count();
    
    for (let i = 0; i < count; i++) {
      const result = results.nth(i);
      await expect(result.locator('[data-testid="result-category"]')).toContainText('documentation');
    }
    
    // Apply date filter
    await page.click('[data-testid="filter-date-last-month"]');
    await page.waitForTimeout(1000);
    
    // Verify active filters are shown
    await expect(page.locator('[data-testid="active-filter-category"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-filter-date"]')).toBeVisible();
    
    // Clear filters
    await page.click('[data-testid="clear-all-filters"]');
    
    // Should show all results again
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="active-filters"]')).not.toBeVisible();
  });

  test('should navigate search result pages', async ({ page }) => {
    // Perform search that returns many results
    await page.fill('[data-testid="search-input"]', 'the');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Check if pagination is present
    const pagination = page.locator('[data-testid="search-pagination"]');
    
    if (await pagination.isVisible()) {
      // Get current page
      const currentPage = await page.locator('[data-testid="current-page"]').textContent();
      expect(currentPage).toBe('1');
      
      // Go to next page
      await page.click('[data-testid="next-page"]');
      
      // Wait for page to load
      await page.waitForTimeout(1000);
      
      // Verify page changed
      const newPage = await page.locator('[data-testid="current-page"]').textContent();
      expect(newPage).toBe('2');
      
      // Verify URL contains page parameter
      await expect(page).toHaveURL(/.*page=2/);
    }
  });

  test('should handle search result clicks', async ({ page }) => {
    // Perform search
    await page.fill('[data-testid="search-input"]', 'API');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Click on first result
    const firstResult = page.locator('[data-testid="search-result-item"]').first();
    const resultTitle = await firstResult.locator('[data-testid="result-title"]').textContent();
    
    await firstResult.click();
    
    // Should navigate to document page
    await expect(page).toHaveURL(/.*\/documents\/\d+/);
    
    // Verify we're on the correct document
    await expect(page.locator('[data-testid="document-title"]')).toContainText(resultTitle || '');
    
    // Go back to search results
    await page.goBack();
    
    // Should return to search results page
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('should handle search performance', async ({ page }) => {
    // Start timing
    const startTime = Date.now();
    
    // Perform search
    await page.fill('[data-testid="search-input"]', 'documentation guide tutorial');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Calculate search time
    const endTime = Date.now();
    const searchTime = endTime - startTime;
    
    // Search should complete within reasonable time (5 seconds)
    expect(searchTime).toBeLessThan(5000);
    
    // Check if search time is displayed
    const searchTimeDisplay = page.locator('[data-testid="search-time"]');
    if (await searchTimeDisplay.isVisible()) {
      const displayedTime = await searchTimeDisplay.textContent();
      expect(displayedTime).toMatch(/\d+(\.\d+)?\s*(ms|秒)/);
    }
  });

  test('should handle special characters in search', async ({ page }) => {
    // Test search with special characters
    const specialQueries = [
      'API & REST',
      'C++ programming',
      'user@example.com',
      '"exact phrase"',
      'wildcard*search'
    ];
    
    for (const query of specialQueries) {
      await page.fill('[data-testid="search-input"]', query);
      await page.press('[data-testid="search-input"]', 'Enter');
      
      // Should handle search without errors
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      // Go back for next search
      await page.goBack();
    }
  });

  test('should handle search with keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+K to focus search
    await page.press('body', 'Control+k');
    
    // Search input should be focused
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
    
    // Type search query
    await page.keyboard.type('keyboard shortcut test');
    
    // Press Enter to search
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Should navigate to search results
    await expect(page).toHaveURL(/.*\/search/);
    
    // Test Escape to clear search
    await page.press('body', 'Escape');
    
    // Should clear search input or close suggestions
    const searchInput = page.locator('[data-testid="search-input"]');
    const inputValue = await searchInput.inputValue();
    expect(inputValue).toBe('');
  });
});