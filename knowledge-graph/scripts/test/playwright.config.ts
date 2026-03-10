import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Playwright Configuration for Knowledge Base Management System
 * 
 * This configuration supports:
 * - Multi-browser testing (Chromium, Firefox, WebKit)
 * - Automatic screenshot and trace collection on failures
 * - HTML and JUnit reporting
 * - Retry mechanism for flaky tests
 * - Parallel test execution
 * - CI/CD optimization
 */

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Global test timeout (30 seconds)
  timeout: 30 * 1000,
  
  // Expect timeout for assertions (5 seconds)
  expect: {
    timeout: 5 * 1000,
  },

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 1,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    // HTML reporter for local development
    ['html', { 
      outputFolder: 'playwright-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    // JUnit reporter for CI/CD integration
    ['junit', { outputFile: 'test-results/junit-results.xml' }],
    // Line reporter for console output
    ['line'],
    // JSON reporter for programmatic access
    ['json', { outputFile: 'test-results/test-results.json' }]
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),

  // Output directory for test artifacts
  outputDir: 'test-results/',

  // Shared settings for all tests
  use: {
    // Base URL for the application
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on first retry
    video: 'retain-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Action timeout
    actionTimeout: 10 * 1000,
    
    // Navigation timeout
    navigationTimeout: 30 * 1000,
    
    // Locale and timezone
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
  },

  // Configure projects for major browsers
  projects: [
    // Desktop Chromium
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable Chrome DevTools Protocol for advanced debugging
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // Desktop Safari (WebKit)
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile Chrome
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    // Mobile Safari
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Microsoft Edge
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
    },

    // API testing project
    {
      name: 'api',
      testDir: './tests/e2e/api',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:5000',
      },
    },
  ],

  // Web server configuration for local development
  webServer: [
    // Frontend server
    {
      command: 'npm run dev',
      cwd: path.resolve(__dirname, '../../'),
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        NODE_ENV: 'test'
      }
    },
    // Backend server
    {
      command: 'python -m flask run --host=0.0.0.0 --port=5000',
      cwd: path.resolve(__dirname, '../../api'),
      port: 5000,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        FLASK_ENV: 'testing',
        DATABASE_URL: 'sqlite:///test.db'
      }
    }
  ],

  // Test metadata
  metadata: {
    'test-suite': 'Knowledge Base E2E Tests',
    'version': '1.0.0',
    'environment': process.env.NODE_ENV || 'test',
    'browser-versions': 'Latest stable versions'
  }
});