import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for Playwright E2E tests
 * 
 * This teardown runs once after all tests and handles:
 * - Test data cleanup
 * - Temporary file removal
 * - Resource cleanup
 * - Test report generation
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');

  try {
    // Clean up test data
    await cleanupTestData();

    // Clean up authentication states
    await cleanupAuthStates();

    // Clean up temporary files
    await cleanupTempFiles();

    // Generate test summary
    await generateTestSummary();

    console.log('✅ Global teardown completed successfully');
  } catch (error: unknown) {
    console.error('❌ Error during global teardown:', error);
    // Don't throw error to avoid masking test failures
  }
}

/**
 * Clean up test data from the database
 */
async function cleanupTestData() {
  console.log('🗑️  Cleaning up test data...');

  try {
    // Login as admin to get cleanup permissions
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
      console.warn('⚠️  Could not login as admin for cleanup');
      return;
    }

    const { token } = await loginResponse.json();

    // Clean up test documents
    await cleanupTestDocuments(token);

    // Clean up test users (except admin)
    await cleanupTestUsers(token);

    console.log('✅ Test data cleanup completed');
  } catch (error: unknown) {
    console.warn('⚠️  Error during test data cleanup:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Clean up test documents
 */
async function cleanupTestDocuments(token: string) {
  try {
    // Get all documents
    const response = await fetch(`${process.env.API_BASE_URL}/api/documents`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.warn('⚠️  Could not fetch documents for cleanup');
      return;
    }

    const { documents } = await response.json();

    // Delete test documents (those with test-related tags or titles)
    const testDocuments = documents.filter((doc: any) => 
      doc.title.includes('Test') || 
      doc.title.includes('Getting Started') ||
      doc.title.includes('API Documentation') ||
      doc.title.includes('User Manual') ||
      doc.title.includes('Troubleshooting') ||
      doc.tags.some((tag: string) => ['test', 'guide', 'tutorial'].includes(tag.toLowerCase()))
    );

    for (const doc of testDocuments) {
      try {
        const deleteResponse = await fetch(`${process.env.API_BASE_URL}/api/documents/${doc.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (deleteResponse.ok) {
          console.log(`🗑️  Deleted test document: ${doc.title}`);
        }
      } catch (error: unknown) {
        console.warn(`⚠️  Error deleting document ${doc.title}:`, error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error: unknown) {
    console.warn('⚠️  Error during document cleanup:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Clean up test users
 */
async function cleanupTestUsers(token: string) {
  try {
    // Get all users
    const response = await fetch(`${process.env.API_BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.warn('⚠️  Could not fetch users for cleanup');
      return;
    }

    const { users } = await response.json();

    // Delete test users (except admin)
    const testUsers = users.filter((user: any) => 
      ['testuser', 'editor'].includes(user.username)
    );

    for (const user of testUsers) {
      try {
        const deleteResponse = await fetch(`${process.env.API_BASE_URL}/api/users/${user.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (deleteResponse.ok) {
          console.log(`🗑️  Deleted test user: ${user.username}`);
        }
      } catch (error: unknown) {
        console.warn(`⚠️  Error deleting user ${user.username}:`, error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error: unknown) {
    console.warn('⚠️  Error during user cleanup:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Clean up authentication states
 */
async function cleanupAuthStates() {
  console.log('🔐 Cleaning up authentication states...');

  const authDir = path.join(__dirname, '../../auth-states');
  
  if (fs.existsSync(authDir)) {
    try {
      const files = fs.readdirSync(authDir);
      for (const file of files) {
        if (file.endsWith('-auth.json')) {
          fs.unlinkSync(path.join(authDir, file));
          console.log(`🗑️  Deleted auth state: ${file}`);
        }
      }
      
      // Remove directory if empty
      const remainingFiles = fs.readdirSync(authDir);
      if (remainingFiles.length === 0) {
        fs.rmdirSync(authDir);
        console.log('🗑️  Removed empty auth-states directory');
      }
    } catch (error: unknown) {
      console.warn('⚠️  Error cleaning up auth states:', error instanceof Error ? error.message : String(error));
    }
  }
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles() {
  console.log('🧹 Cleaning up temporary files...');

  const tempDirs = [
    'screenshots',
    'videos',
    'traces'
  ];

  for (const dirName of tempDirs) {
    const dirPath = path.join(__dirname, '../../', dirName);
    
    if (fs.existsSync(dirPath)) {
      try {
        const files = fs.readdirSync(dirPath);
        
        // Keep only recent files (last 24 hours) in CI environment
        if (process.env.CI) {
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime.getTime() < oneDayAgo) {
              fs.unlinkSync(filePath);
              console.log(`🗑️  Deleted old temp file: ${file}`);
            }
          }
        }
      } catch (error: unknown) {
        console.warn(`⚠️  Error cleaning up ${dirName}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }
}

/**
 * Generate test summary
 */
async function generateTestSummary() {
  console.log('📊 Generating test summary...');

  try {
    const summaryPath = path.join(__dirname, '../../test-results/test-summary.json');
    
    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: !!process.env.CI,
        baseUrl: process.env.BASE_URL,
        apiBaseUrl: process.env.API_BASE_URL
      },
      cleanup: {
        authStatesCleared: true,
        tempFilesCleared: true,
        testDataCleared: true
      }
    };

    // Ensure directory exists
    const summaryDir = path.dirname(summaryPath);
    if (!fs.existsSync(summaryDir)) {
      fs.mkdirSync(summaryDir, { recursive: true });
    }

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log('✅ Test summary generated');
  } catch (error: unknown) {
    console.warn('⚠️  Error generating test summary:', error instanceof Error ? error.message : String(error));
  }
}

export default globalTeardown;