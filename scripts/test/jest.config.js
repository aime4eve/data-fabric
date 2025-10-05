/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.{js,ts,tsx}',
    '<rootDir>/tests/unit/**/*.spec.{js,ts,tsx}'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module name mapping for path aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../src/$1',
    '^@components/(.*)$': '<rootDir>/../../src/components/$1',
    '^@pages/(.*)$': '<rootDir>/../../src/pages/$1',
    '^@hooks/(.*)$': '<rootDir>/../../src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/../../src/utils/$1',
    '^@api/(.*)$': '<rootDir>/../../api/$1',
    '^@shared/(.*)$': '<rootDir>/../../shared/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js'
  },
  
  // Coverage configuration
  collectCoverage: false, // Enable via CLI flag
  collectCoverageFrom: [
    '../../src/**/*.{ts,tsx}',
    '!../../src/**/*.d.ts',
    '!../../src/main.tsx',
    '!../../src/vite-env.d.ts',
    '!../../src/**/*.stories.{ts,tsx}',
    '!../../src/**/*.test.{ts,tsx}',
    '!../../src/**/*.spec.{ts,tsx}'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover',
    'json'
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Knowledge Base Unit Test Report',
        outputPath: './reports/unit-test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        theme: 'lightTheme'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit-unit-results.xml',
        suiteName: 'Knowledge Base Unit Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › '
      }
    ]
  ],
  
  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }
  },
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/integration/'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@testing-library)/)'
  ],
  
  // Max workers for parallel execution
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Notify mode
  notify: false,
  
  // Bail on first test failure in CI
  bail: process.env.CI ? 1 : 0
};