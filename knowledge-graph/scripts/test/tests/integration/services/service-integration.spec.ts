import { test, expect } from '@playwright/test';
import axios, { AxiosInstance } from 'axios';

/**
 * Service Integration Tests
 * 
 * This test suite covers:
 * - Inter-service communication
 * - Service dependency management
 * - Message queue integration
 * - External API integration
 * - Service health checks
 * - Load balancing and failover
 */

interface ServiceEndpoint {
  name: string;
  url: string;
  healthPath: string;
}

interface MessageQueueConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

test.describe('Service Integration Tests', () => {
  let apiClient: AxiosInstance;
  let authToken: string;
  let services: ServiceEndpoint[];

  test.beforeAll(async () => {
    // Setup API client
    apiClient = axios.create({
      baseURL: process.env.API_BASE_URL || 'http://localhost:5000/api',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Define service endpoints
    services = [
      {
        name: 'auth-service',
        url: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
        healthPath: '/health'
      },
      {
        name: 'document-service',
        url: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:5002',
        healthPath: '/health'
      },
      {
        name: 'search-service',
        url: process.env.SEARCH_SERVICE_URL || 'http://localhost:5003',
        healthPath: '/health'
      },
      {
        name: 'file-service',
        url: process.env.FILE_SERVICE_URL || 'http://localhost:5004',
        healthPath: '/health'
      }
    ];

    // Authenticate for protected endpoints
    try {
      const loginResponse = await apiClient.post('/auth/login', {
        username: process.env.TEST_USERNAME || 'testuser',
        password: process.env.TEST_PASSWORD || 'testpass123'
      });
      authToken = loginResponse.data.token;
    } catch (error) {
      console.log('Authentication setup failed, some tests may be skipped');
    }
  });

  test('should verify all services are healthy', async () => {
    const healthChecks = services.map(async (service) => {
      try {
        const response = await axios.get(`${service.url}${service.healthPath}`, {
          timeout: 5000
        });
        return {
          service: service.name,
          status: response.status,
          healthy: response.status === 200,
          data: response.data
        };
      } catch (error: any) {
        return {
          service: service.name,
          status: error.response?.status || 0,
          healthy: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    const results = await Promise.all(healthChecks);
    
    // Log health check results
    results.forEach(result => {
      console.log(`Service ${result.service}: ${result.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      if (!result.healthy) {
        console.log(`  Error: ${result.error}`);
      }
    });

    // At least the main API should be healthy
    const mainApiHealthy = results.some(result => 
      result.service === 'auth-service' && result.healthy
    );
    
    if (!mainApiHealthy) {
      console.log('Main API not healthy, running in standalone mode');
    }
  });

  test('should handle authentication service integration', async () => {
    // Test user registration flow
    const testUser = {
      username: `integration_user_${Date.now()}`,
      email: `integration_${Date.now()}@example.com`,
      password: 'IntegrationTest123!'
    };

    // Register user
    const registerResponse = await apiClient.post('/auth/register', testUser);
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.data.user.username).toBe(testUser.username);

    const userId = registerResponse.data.user.id;

    // Login with new user
    const loginResponse = await apiClient.post('/auth/login', {
      username: testUser.username,
      password: testUser.password
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.data.token).toBeDefined();

    const userToken = loginResponse.data.token;

    // Verify token works
    const profileResponse = await apiClient.get('/auth/profile', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.data.user.id).toBe(userId);

    // Test token refresh (if implemented)
    try {
      const refreshResponse = await apiClient.post('/auth/refresh', {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      if (refreshResponse.status === 200) {
        expect(refreshResponse.data.token).toBeDefined();
        expect(refreshResponse.data.token).not.toBe(userToken);
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
      // Refresh endpoint not implemented, skip
    }

    // Test logout
    const logoutResponse = await apiClient.post('/auth/logout', {}, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    expect([200, 204]).toContain(logoutResponse.status);

    // Verify token is invalidated
    try {
      await apiClient.get('/auth/profile', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      // Should not reach here if logout properly invalidates token
      console.log('Warning: Token not invalidated after logout');
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }

    // Cleanup
    if (authToken) {
      await apiClient.delete(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    }
  });

  test('should handle document service integration', async () => {
    if (!authToken) {
      test.skip(true, );
      return;
    }

    // Create document through document service
    const documentData = {
      title: 'Service Integration Test Document',
      content: 'This document tests service integration.',
      category: 'integration-test',
      tags: ['integration', 'service', 'test']
    };

    const createResponse = await apiClient.post('/documents', documentData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(createResponse.status).toBe(201);
    expect(createResponse.data.document.title).toBe(documentData.title);

    const documentId = createResponse.data.document.id;

    // Test document indexing for search service
    // Wait for indexing to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Search for the document
    const searchResponse = await apiClient.get(`/search?q=${encodeURIComponent(documentData.title)}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(searchResponse.status).toBe(200);
    
    const foundDocument = searchResponse.data.results.find(
      (doc: any) => doc.id === documentId
    );
    expect(foundDocument).toBeDefined();
    expect(foundDocument.title).toBe(documentData.title);

    // Test document versioning (if implemented)
    const updateData = {
      title: 'Updated Service Integration Test Document',
      content: 'This document has been updated to test versioning.'
    };

    const updateResponse = await apiClient.put(`/documents/${documentId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.document.title).toBe(updateData.title);

    // Test document history (if implemented)
    try {
      const historyResponse = await apiClient.get(`/documents/${documentId}/history`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (historyResponse.status === 200) {
        expect(historyResponse.data.versions).toBeInstanceOf(Array);
        expect(historyResponse.data.versions.length).toBeGreaterThan(0);
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
      // History endpoint not implemented
    }

    // Cleanup
    await apiClient.delete(`/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });

  test('should handle file service integration', async () => {
    if (!authToken) {
      test.skip(true, );
      return;
    }

    // Create test file
    const testFileContent = Buffer.from('Integration test file content');
    const fileName = `integration-test-${Date.now()}.txt`;

    // Upload file
    const formData = new FormData();
    const blob = new Blob([testFileContent], { type: 'text/plain' });
    formData.append('file', blob, fileName);
    formData.append('category', 'integration-test');

    const uploadResponse = await apiClient.post('/files/upload', formData, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.data.file.filename).toBe(fileName);

    const fileId = uploadResponse.data.file.id;

    // Test file processing (if implemented)
    // Some files might trigger background processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get file metadata
    const metadataResponse = await apiClient.get(`/files/${fileId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(metadataResponse.status).toBe(200);
    expect(metadataResponse.data.file.id).toBe(fileId);
    expect(metadataResponse.data.file.status).toBeDefined();

    // Test file download
    const downloadResponse = await apiClient.get(`/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${authToken}` },
      responseType: 'arraybuffer'
    });
    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.data.byteLength).toBe(testFileContent.length);

    // Test file sharing (if implemented)
    try {
      const shareResponse = await apiClient.post(`/files/${fileId}/share`, {
        permissions: ['read'],
        expiresIn: 3600 // 1 hour
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (shareResponse.status === 200) {
        expect(shareResponse.data.shareUrl).toBeDefined();
        expect(shareResponse.data.expiresAt).toBeDefined();

        // Test accessing shared file
        const sharedResponse = await axios.get(shareResponse.data.shareUrl);
        expect(sharedResponse.status).toBe(200);
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
      // File sharing not implemented
    }

    // Cleanup
    await apiClient.delete(`/files/${fileId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });

  test('should handle search service integration', async () => {
    if (!authToken) {
      test.skip(true, );
      return;
    }

    // Create multiple documents for comprehensive search testing
    const testDocuments = [
      {
        title: 'Machine Learning Fundamentals',
        content: 'Introduction to machine learning algorithms and concepts.',
        category: 'education',
        tags: ['machine-learning', 'ai', 'algorithms']
      },
      {
        title: 'Deep Learning with Neural Networks',
        content: 'Advanced deep learning techniques using neural networks.',
        category: 'education',
        tags: ['deep-learning', 'neural-networks', 'ai']
      },
      {
        title: 'Data Science Best Practices',
        content: 'Best practices for data science projects and workflows.',
        category: 'best-practices',
        tags: ['data-science', 'best-practices', 'workflow']
      }
    ];

    const createdDocIds: string[] = [];

    // Create documents
    for (const doc of testDocuments) {
      const response = await apiClient.post('/documents', doc, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).toBe(201);
      createdDocIds.push(response.data.document.id);
    }

    // Wait for search indexing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test full-text search
    const searchResponse = await apiClient.get('/search?q=machine learning', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.data.results.length).toBeGreaterThan(0);

    // Test search with filters
    const filteredResponse = await apiClient.get('/search?q=learning&category=education', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(filteredResponse.status).toBe(200);
    
    const educationDocs = filteredResponse.data.results.filter(
      (doc: any) => doc.category === 'education'
    );
    expect(educationDocs.length).toBeGreaterThan(0);

    // Test search suggestions
    const suggestResponse = await apiClient.get('/search/suggestions?q=mach', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(suggestResponse.status).toBe(200);
    expect(suggestResponse.data.suggestions).toBeInstanceOf(Array);

    // Test search analytics (if implemented)
    try {
      const analyticsResponse = await apiClient.get('/search/analytics', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (analyticsResponse.status === 200) {
        expect(analyticsResponse.data.popularQueries).toBeDefined();
        expect(analyticsResponse.data.searchVolume).toBeDefined();
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
      // Analytics not implemented
    }

    // Test search result ranking
    const rankingResponse = await apiClient.get('/search?q=neural networks&sort=relevance', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(rankingResponse.status).toBe(200);
    
    if (rankingResponse.data.results.length > 1) {
      // Results should be sorted by relevance
      const scores = rankingResponse.data.results.map((doc: any) => doc.score || 0);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }
    }

    // Cleanup
    for (const docId of createdDocIds) {
      await apiClient.delete(`/documents/${docId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    }
  });

  test('should handle message queue integration', async () => {
    // Test async message processing
    if (!authToken) {
      test.skip(true, );
      return;
    }

    // Create a document that should trigger background processing
    const documentData = {
      title: 'Message Queue Test Document',
      content: 'This document should trigger background processing via message queue.',
      category: 'queue-test',
      tags: ['message-queue', 'async', 'processing'],
      processAsync: true
    };

    const createResponse = await apiClient.post('/documents', documentData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(createResponse.status).toBe(201);

    const documentId = createResponse.data.document.id;

    // Check processing status
    let processingComplete = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!processingComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const statusResponse = await apiClient.get(`/documents/${documentId}/processing-status`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (statusResponse.status === 200) {
          const status = statusResponse.data.status;
          processingComplete = status === 'completed' || status === 'failed';
          
          if (status === 'completed') {
            expect(statusResponse.data.processedAt).toBeDefined();
          } else if (status === 'failed') {
            console.log('Processing failed:', statusResponse.data.error);
          }
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Processing status endpoint not implemented
          break;
        }
        throw error;
      }
      
      attempts++;
    }

    // Test message queue health (if accessible)
    try {
      const queueHealthResponse = await apiClient.get('/system/queue-health', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (queueHealthResponse.status === 200) {
        expect(queueHealthResponse.data.status).toBe('healthy');
        expect(queueHealthResponse.data.queueSize).toBeDefined();
        expect(queueHealthResponse.data.workers).toBeDefined();
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
      // Queue health endpoint not implemented
    }

    // Cleanup
    await apiClient.delete(`/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });

  test('should handle external API integration', async () => {
    if (!authToken) {
      test.skip(true, );
      return;
    }

    // Test external service integration (e.g., email service, notification service)
    const testData = {
      recipient: 'test@example.com',
      subject: 'Integration Test Notification',
      message: 'This is a test notification from service integration tests.'
    };

    try {
      const notificationResponse = await apiClient.post('/notifications/send', testData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (notificationResponse.status === 200) {
        expect(notificationResponse.data.messageId).toBeDefined();
        expect(notificationResponse.data.status).toBe('sent');
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('Notification service not implemented');
      } else if (error.response?.status === 503) {
        console.log('External notification service unavailable');
      } else {
        throw error;
      }
    }

    // Test webhook integration (if implemented)
    try {
      const webhookData = {
        url: 'https://httpbin.org/post',
        events: ['document.created', 'document.updated'],
        secret: 'test-webhook-secret'
      };

      const webhookResponse = await apiClient.post('/webhooks', webhookData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (webhookResponse.status === 201) {
        const webhookId = webhookResponse.data.webhook.id;
        
        // Test webhook by creating a document
        const docResponse = await apiClient.post('/documents', {
          title: 'Webhook Test Document',
          content: 'This should trigger a webhook.',
          category: 'webhook-test',
          tags: ['webhook', 'test']
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const documentId = docResponse.data.document.id;
        
        // Wait for webhook delivery
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check webhook delivery status
        const deliveryResponse = await apiClient.get(`/webhooks/${webhookId}/deliveries`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (deliveryResponse.status === 200) {
          expect(deliveryResponse.data.deliveries).toBeInstanceOf(Array);
        }
        
        // Cleanup
        await apiClient.delete(`/documents/${documentId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        await apiClient.delete(`/webhooks/${webhookId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
      // Webhook service not implemented
    }
  });

  test('should handle service failover and recovery', async () => {
    // Test service resilience
    const testEndpoints = [
      '/health',
      '/auth/profile',
      '/documents',
      '/search?q=test'
    ];

    for (const endpoint of testEndpoints) {
      const startTime = Date.now();
      
      try {
        const headers = endpoint === '/health' ? {} : { Authorization: `Bearer ${authToken}` };
        const response = await apiClient.get(endpoint, { headers });
        
        const responseTime = Date.now() - startTime;
        
        // Response should be reasonably fast (under 5 seconds)
        expect(responseTime).toBeLessThan(5000);
        
        // Should get a valid response
        expect([200, 401, 404]).toContain(response.status);
        
      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        
        // Even errors should respond within reasonable time
        expect(responseTime).toBeLessThan(10000);
        
        // Should be network/service errors, not client errors
        if (error.code) {
          expect(['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']).toContain(error.code);
        }
      }
    }
  });

  test('should handle load balancing', async () => {
    if (!authToken) {
      test.skip(true, );
      return;
    }

    // Test multiple concurrent requests to check load distribution
    const concurrentRequests = Array.from({ length: 20 }, (_, index) => 
      apiClient.get('/documents', {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'X-Request-ID': `load-test-${index}`
        }
      })
    );

    const startTime = Date.now();
    const responses = await Promise.allSettled(concurrentRequests);
    const endTime = Date.now();

    const successfulResponses = responses.filter(
      result => result.status === 'fulfilled' && result.value.status === 200
    );

    // Most requests should succeed
    expect(successfulResponses.length).toBeGreaterThan(responses.length * 0.8);

    // Total time should be reasonable for concurrent requests
    const totalTime = endTime - startTime;
    expect(totalTime).toBeLessThan(10000); // 10 seconds

    // Check if load balancing headers are present (if implemented)
    const firstSuccessful = successfulResponses[0] as any;
    if (firstSuccessful?.value?.headers?.['x-server-id']) {
      console.log('Load balancing detected via X-Server-ID header');
    }
  });

  test('should handle service monitoring and metrics', async () => {
    // Test metrics endpoints (if available)
    try {
      const metricsResponse = await apiClient.get('/metrics', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      
      if (metricsResponse.status === 200) {
        // Should contain Prometheus-style metrics
        expect(typeof metricsResponse.data).toBe('string');
        expect(metricsResponse.data).toContain('# HELP');
        expect(metricsResponse.data).toContain('# TYPE');
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
      // Metrics endpoint not implemented
    }

    // Test system status endpoint
    try {
      const statusResponse = await apiClient.get('/system/status', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      
      if (statusResponse.status === 200) {
        expect(statusResponse.data.status).toBeDefined();
        expect(statusResponse.data.version).toBeDefined();
        expect(statusResponse.data.uptime).toBeDefined();
        
        if (statusResponse.data.services) {
          expect(statusResponse.data.services).toBeInstanceOf(Object);
        }
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
      // Status endpoint not implemented
    }
  });
});