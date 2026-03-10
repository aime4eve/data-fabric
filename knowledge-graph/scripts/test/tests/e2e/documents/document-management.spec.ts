import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Document Management E2E Tests
 * 
 * Tests document CRUD operations, file uploads/downloads,
 * search functionality, and user permissions.
 */

test.describe('Document Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to documents page
    await page.goto('/documents');
    
    // Wait for page to load
    await expect(page.locator('[data-testid="documents-page"]')).toBeVisible();
  });

  test('should display documents list', async ({ page }) => {
    // Check if documents grid is visible
    await expect(page.locator('[data-testid="documents-grid"]')).toBeVisible();
    
    // Check if at least one document card exists or empty state is shown
    const documentCards = page.locator('[data-testid="document-card"]');
    const emptyState = page.locator('[data-testid="empty-documents"]');
    
    const hasDocuments = await documentCards.count() > 0;
    const hasEmptyState = await emptyState.isVisible();
    
    expect(hasDocuments || hasEmptyState).toBeTruthy();
  });

  test('should create a new document', async ({ page }) => {
    // Click create document button
    await page.click('[data-testid="create-document-btn"]');
    
    // Fill document form
    await page.fill('[data-testid="title-input"]', 'Test Document');
    await page.fill('[data-testid="content-input"]', 'This is a test document content.');
    
    // Select category
    await page.click('[data-testid="category-select"]');
    await page.click('[data-testid="category-option-general"]');
    
    // Add tags
    await page.fill('[data-testid="tags-input"]', 'test, automation');
    
    // Save document
    await page.click('[data-testid="save-document-btn"]');
    
    // Verify document was created
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="document-title"]')).toContainText('Test Document');
  });

  test('should edit an existing document', async ({ page }) => {
    // Find first document and click edit
    const firstDocument = page.locator('[data-testid="document-card"]').first();
    await firstDocument.hover();
    await page.click('[data-testid="edit-document-btn"]');
    
    // Update title
    await page.fill('[data-testid="title-input"]', 'Updated Test Document');
    
    // Update content
    await page.fill('[data-testid="content-input"]', 'This document has been updated.');
    
    // Save changes
    await page.click('[data-testid="save-document-btn"]');
    
    // Verify changes were saved
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="document-title"]')).toContainText('Updated Test Document');
  });

  test('should delete a document', async ({ page }) => {
    // Find first document and click delete
    const firstDocument = page.locator('[data-testid="document-card"]').first();
    await firstDocument.hover();
    await page.click('[data-testid="delete-document-btn"]');
    
    // Confirm deletion in modal
    await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
    await page.click('[data-testid="confirm-delete-btn"]');
    
    // Verify document was deleted
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('删除成功');
  });

  test('should search documents', async ({ page }) => {
    // Enter search query
    await page.fill('[data-testid="search-input"]', 'test');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for search results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Verify search results contain the query
    const searchResults = page.locator('[data-testid="search-result-item"]');
    await expect(searchResults.first()).toBeVisible();
    
    // Verify search highlighting
    await expect(page.locator('[data-testid="search-highlight"]')).toBeVisible();
    
    // Clear search
    await page.click('[data-testid="clear-search-btn"]');
    
    // Should show all documents again
    await expect(page.locator('[data-testid="documents-grid"]')).toBeVisible();
  });

  test('should filter documents by category', async ({ page }) => {
    // Open filter dropdown
    await page.click('[data-testid="filter-dropdown"]');
    
    // Select a category filter
    await page.click('[data-testid="filter-technical"]');
    
    // Wait for filtered results
    await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
    
    // Verify that only technical documents are shown
    const documentCards = page.locator('[data-testid="document-card"]');
    const count = await documentCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = documentCards.nth(i);
      await expect(card.locator('[data-testid="document-category"]')).toContainText('technical');
    }
    
    // Clear filter
    await page.click('[data-testid="clear-filters-btn"]');
  });

  test('should upload a file successfully', async ({ page }) => {
    // Click create document button
    await page.click('[data-testid="create-document-btn"]');
    
    // Click file upload button
    await page.click('[data-testid="file-upload-btn"]');
    
    // Create a test file
    const testFilePath = path.join(__dirname, '../../../fixtures/test-document.txt');
    
    // Upload file
    await page.setInputFiles('[data-testid="file-input"]', testFilePath);
    
    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    
    // Verify file information is populated
    await expect(page.locator('[data-testid="title-input"]')).toHaveValue('test-document');
    
    // Save document
    await page.click('[data-testid="save-document-btn"]');
    
    // Verify document was created with file
    await expect(page.locator('[data-testid="document-file"]')).toBeVisible();
  });

  test('should download a document file', async ({ page }) => {
    // Find a document with a file attachment
    const documentWithFile = page.locator('[data-testid="document-card"]').filter({
      has: page.locator('[data-testid="file-icon"]')
    }).first();
    
    await documentWithFile.click();
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-file-btn"]');
    
    // Wait for download to complete
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toBeTruthy();
    
    // Save download to verify
    await download.saveAs(path.join(__dirname, '../../../test-results/downloaded-file'));
  });

  test('should handle document permissions', async ({ page }) => {
    // Test with different user roles
    const userRole = process.env.TEST_USER_ROLE || 'viewer';
    
    // Find first document
    const firstDocument = page.locator('[data-testid="document-card"]').first();
    await firstDocument.click();
    
    // Check permissions based on role
    const editButton = page.locator('[data-testid="edit-document-btn"]');
    
    if (userRole === 'admin' || userRole === 'editor') {
      // Should be able to edit and delete
      await expect(editButton).toBeVisible();
      await expect(page.locator('[data-testid="delete-document-btn"]')).toBeVisible();
    } else {
      // Should not be able to edit
      await expect(editButton).not.toBeVisible();
      await expect(page.locator('[data-testid="delete-document-btn"]')).not.toBeVisible();
    }
    
    // Should always be able to view
    await expect(page.locator('[data-testid="document-content"]')).toBeVisible();
  });

  test('should sort documents correctly', async ({ page }) => {
    // Click sort dropdown
    await page.click('[data-testid="sort-dropdown"]');
    
    // Sort by date (newest first)
    await page.click('[data-testid="sort-date-desc"]');
    
    // Wait for sorting to apply
    await page.waitForTimeout(1000);
    
    // Get document dates and verify they are in descending order
    const documentDates = await page.locator('[data-testid="document-date"]').allTextContents();
    
    for (let i = 0; i < documentDates.length - 1; i++) {
      const currentDate = new Date(documentDates[i]);
      const nextDate = new Date(documentDates[i + 1]);
      expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
    }
    
    // Sort by title (A-Z)
    await page.click('[data-testid="sort-dropdown"]');
    await page.click('[data-testid="sort-title-asc"]');
    
    await page.waitForTimeout(1000);
    
    // Get document titles and verify they are in ascending order
    const documentTitles = await page.locator('[data-testid="document-title"]').allTextContents();
    
    for (let i = 0; i < documentTitles.length - 1; i++) {
      expect(documentTitles[i].localeCompare(documentTitles[i + 1])).toBeLessThanOrEqual(0);
    }
  });

  test('should handle bulk operations', async ({ page }) => {
    // Select multiple documents
    await page.click('[data-testid="select-all-checkbox"]');
    
    // Verify bulk actions are available
    await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
    
    // Test bulk delete
    await page.click('[data-testid="bulk-delete-btn"]');
    
    // Confirm bulk deletion
    await expect(page.locator('[data-testid="bulk-delete-confirmation"]')).toBeVisible();
    await page.click('[data-testid="confirm-bulk-delete-btn"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should show document preview on hover', async ({ page }) => {
    // Hover over first document
    const firstDocument = page.locator('[data-testid="document-card"]').first();
    await firstDocument.hover();
    
    // Check if preview popup appears
    await expect(page.locator('[data-testid="document-preview"]')).toBeVisible();
    
    // Verify preview content
    await expect(page.locator('[data-testid="preview-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-content"]')).toBeVisible();
    
    // Move mouse away to hide preview
    await page.mouse.move(0, 0);
    
    // Preview should disappear
    await expect(page.locator('[data-testid="document-preview"]')).not.toBeVisible();
  });
});