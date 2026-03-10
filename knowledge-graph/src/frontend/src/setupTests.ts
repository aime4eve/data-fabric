import '@testing-library/jest-dom';

// Mock window.URL.createObjectURL for file download tests
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mocked-url'),
    revokeObjectURL: jest.fn(),
  },
  writable: true,
});

// Mock URL constructor for axios
(globalThis as any).URL = class MockURL {
  constructor(url: string, base?: string) {
    if (base) {
      this.href = url.startsWith('http') ? url : base + url;
    } else {
      this.href = url;
    }
    this.protocol = 'http:';
    this.host = 'localhost:8000';
    this.hostname = 'localhost';
    this.port = '8000';
    this.pathname = '/';
    this.search = '';
    this.hash = '';
  }
  href: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
};

// Mock document.createElement for download tests
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
};

const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName) => {
  if (tagName === 'a') {
    return mockLink as any;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock document.body methods
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

// Mock fetch for API calls
(globalThis as any).fetch = jest.fn();

// Mock console methods to avoid noise in tests
(globalThis as any).console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};