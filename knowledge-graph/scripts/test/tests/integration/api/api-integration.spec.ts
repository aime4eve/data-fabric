import { test, expect } from '@playwright/test';
import axios, { AxiosInstance } from 'axios';

/**
 * API Integration Tests
 * 
 * This test suite covers:
 * - API endpoint integration
 * - Authentication flow integration
 * - Data persistence across requests
 * - Error handling and recovery
 * - API rate limiting
 * - Cross-service communication
 */

interface TestUser {
  id?: string;
  username: string;
  email: string;
  password: string;
  role?: string;
}

interface TestDocument {
  id?: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author_id?: string;
}

test.describe('API Integration Tests', () => {
  let apiClient: AxiosInstance;
  let authToken: string;
  let testUser: TestUser;
  let testDocument: TestDocument;

  test.beforeAll(async () => {
    // Setup API client
    apiClient = axios.create({
      baseURL: process.env.API_BASE_URL || 'http://localhost:5000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Setup test data
    testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };

    testDocument = {
      title: `Test Document ${Date.now()}`,
      content: 'This is a test document for integration testing.',
      category: 'testing',
      tags: ['integration', 'test', 'api']
    };
  });

  test.afterAll(async () => {
    // Cleanup: Delete test user and documents
    if (authToken) {
      try {
        await apiClient.delete(`/users/${testUser.id}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (error) {
        console.log('Cleanup error:', error);
      }
    }
  });

  test('should handle complete user registration and authentication flow', async () => {
    // Step 1: Register new user
    const registerResponse = await apiClient.post('/auth/register', testUser);
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.data).toHaveProperty('user');
    expect(registerResponse.data.user.username).toBe(testUser.username);
    expect(registerResponse.data.user.email).toBe(testUser.email);
    
    testUser.id = registerResponse.data.user.id;

    // Step 2: Login with registered user
    const loginResponse = await apiClient.post('/auth/login', {
      username: testUser.username,
      password: testUser.password
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.data).toHaveProperty('token');
    expect(loginResponse.data).toHaveProperty('user');
    
    authToken = loginResponse.data.token;

    // Step 3: Verify token works for protected endpoints
    const profileResponse = await apiClient.get('/auth/profile', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.data.user.id).toBe(testUser.id);

    // Step 4: Update user profile
    const updateData = { email: `updated_${Date.now()}@example.com` };
    const updateResponse = await apiClient.put(`/users/${testUser.id}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.user.email).toBe(updateData.email);
  });

  test('should handle document CRUD operations with authentication', async () => {
    // Ensure we have auth token
    expect(authToken).toBeDefined();

    // Step 1: Create document
    testDocument.author_id = testUser.id;
    const createResponse = await apiClient.post('/documents', testDocument, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(createResponse.status).toBe(201);
    expect(createResponse.data.document.title).toBe(testDocument.title);
    expect(createResponse.data.document.author_id).toBe(testUser.id);
    
    testDocument.id = createResponse.data.document.id;

    // Step 2: Read document
    const readResponse = await apiClient.get(`/documents/${testDocument.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(readResponse.status).toBe(200);
    expect(readResponse.data.document.id).toBe(testDocument.id);
    expect(readResponse.data.document.content).toBe(testDocument.content);

    // Step 3: Update document
    const updateData = {
      title: `Updated ${testDocument.title}`,
      content: 'Updated content for integration testing.'
    };
    const updateResponse = await apiClient.put(`/documents/${testDocument.id}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.document.title).toBe(updateData.title);
    expect(updateResponse.data.document.content).toBe(updateData.content);

    // Step 4: List documents (should include our document)
    const listResponse = await apiClient.get('/documents', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(listResponse.status).toBe(200);
    expect(listResponse.data.documents).toBeInstanceOf(Array);
    
    const ourDocument = listResponse.data.documents.find(
      (doc: any) => doc.id === testDocument.id
    );
    expect(ourDocument).toBeDefined();
    expect(ourDocument.title).toBe(updateData.title);

    // Step 5: Delete document
    const deleteResponse = await apiClient.delete(`/documents/${testDocument.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(deleteResponse.status).toBe(204);

    // Step 6: Verify document is deleted
    try {
      await apiClient.get(`/documents/${testDocument.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response.status).toBe(404);
    }
  });

  test('should handle search functionality integration', async () => {
    // Create multiple test documents for search
    const searchDocuments = [
      {
        title: 'JavaScript Programming Guide',
        content: 'Learn JavaScript programming with examples and best practices.',
        category: 'programming',
        tags: ['javascript', 'programming', 'guide']
      },
      {
        title: 'Python Data Science Tutorial',
        content: 'Data science with Python using pandas and numpy libraries.',
        category: 'data-science',
        tags: ['python', 'data-science', 'tutorial']
      },
      {
        title: 'React Component Development',
        content: 'Building reusable React components with TypeScript.',
        category: 'frontend',
        tags: ['react', 'typescript', 'components']
      }
    ];

    const createdDocIds: string[] = [];

    // Create documents
    for (const doc of searchDocuments) {
      const response = await apiClient.post('/documents', {
        ...doc,
        author_id: testUser.id
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).toBe(201);
      createdDocIds.push(response.data.document.id);
    }

    // Wait for search indexing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test basic search
    const searchResponse = await apiClient.get('/search?q=programming', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.data.results).toBeInstanceOf(Array);
    expect(searchResponse.data.results.length).toBeGreaterThan(0);

    // Test category filtering
    const categoryResponse = await apiClient.get('/search?category=programming', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(categoryResponse.status).toBe(200);
    const programmingDocs = categoryResponse.data.results.filter(
      (doc: any) => doc.category === 'programming'
    );
    expect(programmingDocs.length).toBeGreaterThan(0);

    // Test tag-based search
    const tagResponse = await apiClient.get('/search?tags=javascript', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(tagResponse.status).toBe(200);
    const jsDoc = tagResponse.data.results.find(
      (doc: any) => doc.tags.includes('javascript')
    );
    expect(jsDoc).toBeDefined();

    // Test advanced search with multiple filters
    const advancedResponse = await apiClient.get(
      '/search?q=React&category=frontend&tags=typescript',
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    expect(advancedResponse.status).toBe(200);
    expect(advancedResponse.data.results.length).toBeGreaterThan(0);

    // Test search suggestions
    const suggestResponse = await apiClient.get('/search/suggestions?q=prog', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(suggestResponse.status).toBe(200);
    expect(suggestResponse.data.suggestions).toBeInstanceOf(Array);

    // Cleanup created documents
    for (const docId of createdDocIds) {
      await apiClient.delete(`/documents/${docId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    }
  });

  test('should handle file upload and management integration', async () => {
    // Create a test file buffer
    const testFileContent = Buffer.from('This is a test file content for integration testing.');
    const fileName = `test-file-${Date.now()}.txt`;

    // Step 1: Upload file
    const formData = new FormData();
    const blob = new Blob([testFileContent], { type: 'text/plain' });
    formData.append('file', blob, fileName);
    formData.append('category', 'test-files');

    const uploadResponse = await apiClient.post('/files/upload', formData, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.data.file.filename).toBe(fileName);
    expect(uploadResponse.data.file.size).toBe(testFileContent.length);

    const fileId = uploadResponse.data.file.id;

    // Step 2: Get file metadata
    const metadataResponse = await apiClient.get(`/files/${fileId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(metadataResponse.status).toBe(200);
    expect(metadataResponse.data.file.id).toBe(fileId);
    expect(metadataResponse.data.file.filename).toBe(fileName);

    // Step 3: Download file
    const downloadResponse = await apiClient.get(`/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${authToken}` },
      responseType: 'arraybuffer'
    });
    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.data.byteLength).toBe(testFileContent.length);

    // Step 4: List files
    const listResponse = await apiClient.get('/files', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(listResponse.status).toBe(200);
    const ourFile = listResponse.data.files.find((file: { id: string }) => file.id === fileId);
    expect(ourFile).toBeDefined();

    // Step 5: Delete file
    const deleteResponse = await apiClient.delete(`/files/${fileId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(deleteResponse.status).toBe(204);

    // Step 6: Verify file is deleted
    try {
      await apiClient.get(`/files/${fileId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.response.status).toBe(404);
    }
  });

  test('should handle error scenarios and recovery', async () => {
    // Test invalid authentication
    try {
      await apiClient.get('/auth/profile', {
        headers: { Authorization: 'Bearer invalid-token' }
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data).toHaveProperty('error');
    }

    // Test accessing non-existent resource
    try {
      await apiClient.get('/documents/non-existent-id', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.response.status).toBe(404);
    }

    // Test validation errors
    try {
      await apiClient.post('/documents', {
        // Missing required fields
        title: '',
        content: ''
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('errors');
    }

    // Test unauthorized access (trying to access another user's document)
    // This would require creating another user and document, simplified for now
    try {
      await apiClient.put('/documents/unauthorized-doc-id', {
        title: 'Unauthorized Update'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect([403, 404]).toContain(error.response.status);
    }
  });

  test('should handle concurrent requests properly', async () => {
    // Create multiple documents concurrently
    const concurrentRequests = Array.from({ length: 5 }, (_, index) => 
      apiClient.post('/documents', {
        title: `Concurrent Document ${index + 1}`,
        content: `Content for concurrent document ${index + 1}`,
        category: 'concurrent-test',
        tags: ['concurrent', 'test'],
        author_id: testUser.id
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    );

    const responses = await Promise.all(concurrentRequests);
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(201);
      expect(response.data.document).toBeDefined();
    });

    // Get all created document IDs
    const docIds = responses.map(response => response.data.document.id);

    // Verify all documents were created
    const listResponse = await apiClient.get('/documents?category=concurrent-test', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(listResponse.status).toBe(200);
    expect(listResponse.data.documents.length).toBeGreaterThanOrEqual(5);

    // Cleanup: Delete all created documents concurrently
    const deleteRequests = docIds.map(id => 
      apiClient.delete(`/documents/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    );

    const deleteResponses = await Promise.all(deleteRequests);
    deleteResponses.forEach(response => {
      expect(response.status).toBe(204);
    });
  });

  test('should handle API rate limiting', async () => {
    // Make rapid requests to test rate limiting
    const rapidRequests = Array.from({ length: 20 }, () => 
      apiClient.get('/documents', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    );

    try {
      await Promise.all(rapidRequests);
      // If no rate limiting is implemented, all requests should succeed
      console.log('No rate limiting detected');
    } catch (error: any) {
      // If rate limiting is implemented, some requests should fail with 429
      if (error.response && error.response.status === 429) {
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.headers).toHaveProperty('retry-after');
      }
    }
  });

  test('should handle pagination correctly', async () => {
    // Create multiple documents for pagination testing
    const paginationDocs = Array.from({ length: 15 }, (_, index) => ({
      title: `Pagination Test Document ${index + 1}`,
      content: `Content for pagination test document ${index + 1}`,
      category: 'pagination-test',
      tags: ['pagination', 'test'],
      author_id: testUser.id
    }));

    // Create documents
    const createPromises = paginationDocs.map(doc => 
      apiClient.post('/documents', doc, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    );
    const createResponses = await Promise.all(createPromises);
    const docIds = createResponses.map(response => response.data.document.id);

    // Test first page
    const page1Response = await apiClient.get('/documents?category=pagination-test&page=1&limit=5', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(page1Response.status).toBe(200);
    expect(page1Response.data.documents.length).toBe(5);
    expect(page1Response.data.pagination.page).toBe(1);
    expect(page1Response.data.pagination.total).toBeGreaterThanOrEqual(15);

    // Test second page
    const page2Response = await apiClient.get('/documents?category=pagination-test&page=2&limit=5', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(page2Response.status).toBe(200);
    expect(page2Response.data.documents.length).toBe(5);
    expect(page2Response.data.pagination.page).toBe(2);

    // Verify different documents on different pages
    const page1Ids = page1Response.data.documents.map((doc: any) => doc.id);
    const page2Ids = page2Response.data.documents.map((doc: any) => doc.id);
    const intersection = page1Ids.filter((id: string) => page2Ids.includes(id));
    expect(intersection.length).toBe(0); // No overlap

    // Cleanup
    const deletePromises = docIds.map(id => 
      apiClient.delete(`/documents/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    );
    await Promise.all(deletePromises);
  });

  test('should handle data consistency across operations', async () => {
    // Create a document
    const docResponse = await apiClient.post('/documents', {
      title: 'Consistency Test Document',
      content: 'Original content',
      category: 'consistency-test',
      tags: ['consistency', 'test'],
      author_id: testUser.id
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const docId = docResponse.data.document.id;

    // Update document multiple times
    const updates = [
      { title: 'Updated Title 1', content: 'Updated content 1' },
      { title: 'Updated Title 2', content: 'Updated content 2' },
      { title: 'Final Title', content: 'Final content' }
    ];

    for (const update of updates) {
      const updateResponse = await apiClient.put(`/documents/${docId}`, update, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.document.title).toBe(update.title);
      expect(updateResponse.data.document.content).toBe(update.content);
    }

    // Verify final state
    const finalResponse = await apiClient.get(`/documents/${docId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(finalResponse.status).toBe(200);
    expect(finalResponse.data.document.title).toBe('Final Title');
    expect(finalResponse.data.document.content).toBe('Final content');

    // Cleanup
    await apiClient.delete(`/documents/${docId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });
});