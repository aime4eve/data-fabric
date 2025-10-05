import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for Playwright E2E tests
 * 
 * This setup runs once before all tests and handles:
 * - Database initialization
 * - Test user creation
 * - Authentication state preparation
 * - Environment validation
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');

  // Ensure required directories exist
  const dirs = [
    'test-results',
    'playwright-report',
    'screenshots',
    'videos',
    'traces'
  ];

  for (const dir of dirs) {
    const dirPath = path.join(__dirname, '../../', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // Environment validation
  const requiredEnvVars = [
    'BASE_URL',
    'API_BASE_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    console.log('Using default values for missing variables');
  }

  // Set default values if not provided
  process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

  console.log(`📍 Frontend URL: ${process.env.BASE_URL}`);
  console.log(`📍 Backend URL: ${process.env.API_BASE_URL}`);

  // Wait for services to be ready
  await waitForService(process.env.BASE_URL, 'Frontend');
  await waitForService(process.env.API_BASE_URL, 'Backend API');

  // Initialize test database and create test users
  await initializeTestData();

  // Create authentication states for different user types
  await createAuthStates();

  console.log('✅ Global setup completed successfully');
}

/**
 * Wait for a service to be ready
 */
async function waitForService(url: string, serviceName: string, maxAttempts = 30) {
  console.log(`⏳ Waiting for ${serviceName} at ${url}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        console.log(`✅ ${serviceName} is ready`);
        return;
      }
    } catch (error: unknown) {
      // Service not ready yet
    }

    if (attempt === maxAttempts) {
      throw new Error(`❌ ${serviceName} is not ready after ${maxAttempts} attempts`);
    }

    console.log(`⏳ Attempt ${attempt}/${maxAttempts} - ${serviceName} not ready, retrying in 2s...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * Initialize test data in the database
 */
async function initializeTestData() {
  console.log('📊 Initializing test data...');

  try {
    // Create test users via API
    const testUsers = [
      {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      },
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin'
      },
      {
        username: 'editor',
        email: 'editor@example.com',
        password: 'editor123',
        role: 'editor'
      }
    ];

    for (const user of testUsers) {
      try {
        const response = await fetch(`${process.env.API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(user)
        });

        if (response.ok) {
          console.log(`✅ Created test user: ${user.username}`);
        } else if (response.status === 409) {
          console.log(`ℹ️  Test user already exists: ${user.username}`);
        } else {
          console.warn(`⚠️  Failed to create user ${user.username}: ${response.statusText}`);
        }
      } catch (error: unknown) {
        console.warn(`⚠️  Error creating user ${user.username}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Create test documents
    await createTestDocuments();

    console.log('✅ Test data initialization completed');
  } catch (error: unknown) {
    console.error('❌ Failed to initialize test data:', error);
    throw error;
  }
}

/**
 * Create test documents
 */
async function createTestDocuments() {
  console.log('📄 Creating test documents...');

  // First, login as admin to get auth token
  const loginResponse = await fetch(`${process.env.API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });

  if (!loginResponse.ok) {
    console.warn('⚠️  Could not login as admin to create test documents');
    return;
  }

  const { token } = await loginResponse.json();

  const testDocuments = [
    {
      title: 'Getting Started Guide',
      content: 'This is a comprehensive guide to get started with the knowledge base system.',
      tags: ['guide', 'tutorial', 'beginner'],
      category: 'documentation'
    },
    {
      title: 'API Documentation',
      content: 'Complete API documentation for developers.',
      tags: ['api', 'development', 'reference'],
      category: 'technical'
    },
    {
      title: 'User Manual',
      content: 'Detailed user manual for end users.',
      tags: ['manual', 'user', 'help'],
      category: 'documentation'
    },
    {
      title: 'Troubleshooting Guide',
      content: 'Common issues and their solutions.',
      tags: ['troubleshooting', 'help', 'support'],
      category: 'support'
    }
  ];

  for (const doc of testDocuments) {
    try {
      const response = await fetch(`${process.env.API_BASE_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(doc)
      });

      if (response.ok) {
        console.log(`✅ Created test document: ${doc.title}`);
      } else {
        console.warn(`⚠️  Failed to create document ${doc.title}: ${response.statusText}`);
      }
    } catch (error: unknown) {
      console.warn(`⚠️  Error creating document ${doc.title}:`, error instanceof Error ? error.message : String(error));
    }
  }
}

/**
 * Create authentication states for different user types
 */
async function createAuthStates() {
  console.log('🔐 Creating authentication states...');

  const browser = await chromium.launch();
  const authDir = path.join(__dirname, '../../auth-states');

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const users = [
    { username: 'testuser', password: 'password123', role: 'user' },
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'editor', password: 'editor123', role: 'editor' }
  ];

  for (const user of users) {
    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate to login page
      await page.goto(`${process.env.BASE_URL}/login`);

      // Fill login form
      await page.fill('[data-testid="username-input"]', user.username);
      await page.fill('[data-testid="password-input"]', user.password);
      await page.click('[data-testid="login-button"]');

      // Wait for successful login (redirect to dashboard)
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Save authentication state
      await context.storageState({ 
        path: path.join(authDir, `${user.role}-auth.json`) 
      });

      await context.close();
      console.log(`✅ Created auth state for ${user.role}`);
    } catch (error: unknown) {
      console.warn(`⚠️  Failed to create auth state for ${user.username}:`, error instanceof Error ? error.message : String(error));
    }
  }

  await browser.close();
  console.log('✅ Authentication states created');
}

export default globalSetup;