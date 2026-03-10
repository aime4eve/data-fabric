/**
 * Tests for robots-checker.js
 * robots.txt 合规检查与路径调度
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const {
  parseRobotsTxt,
  isPathAllowed,
  checkPathsAgainstRobots,
  filterAllowedPaths
} = require('../src/services/robots-checker');

describe('robots-checker', () => {
  describe('parseRobotsTxt', () => {
    test('should parse basic robots.txt', () => {
      const content = `User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /public/`;

      const result = parseRobotsTxt(content);

      assert.ok(result.rules);
      assert.ok(result.rules['*']);
      assert.strictEqual(result.rules['*'].disallow.length, 2);
      assert.strictEqual(result.rules['*'].allow.length, 1);
    });

    test('should handle multiple user-agents', () => {
      const content = `User-agent: Googlebot
Disallow: /secret/

User-agent: *
Disallow: /admin/`;

      const result = parseRobotsTxt(content);

      assert.ok(result.rules['googlebot']);
      assert.ok(result.rules['*']);
      assert.strictEqual(result.rules['googlebot'].disallow[0], '/secret/');
    });

    test('should handle empty robots.txt', () => {
      const result = parseRobotsTxt('');

      assert.ok(result.rules);
      assert.deepStrictEqual(result.rules, {});
    });

    test('should handle comments', () => {
      const content = `# This is a comment
User-agent: *
# Another comment
Disallow: /admin/  # inline comment`;

      const result = parseRobotsTxt(content);

      assert.strictEqual(result.rules['*'].disallow[0], '/admin/');
    });

    test('should handle case-insensitive user-agent', () => {
      const content = `User-agent: MyBot
Disallow: /bot-only/`;

      const result = parseRobotsTxt(content);

      assert.ok(result.rules['mybot']);
    });
  });

  describe('isPathAllowed', () => {
    test('should allow path when no rules', () => {
      const robotsInfo = { rules: {} };
      const result = isPathAllowed(robotsInfo, '/products', 'MyBot');

      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.reason, 'No matching disallow rule');
    });

    test('should allow path when not disallowed', () => {
      const robotsInfo = {
        rules: {
          '*': { disallow: ['/admin/', '/private/'], allow: [] }
        }
      };
      const result = isPathAllowed(robotsInfo, '/products', 'MyBot');

      assert.strictEqual(result.allowed, true);
    });

    test('should disallow path when matched', () => {
      const robotsInfo = {
        rules: {
          '*': { disallow: ['/admin/', '/private/'], allow: [] }
        }
      };
      const result = isPathAllowed(robotsInfo, '/admin/settings', 'MyBot');

      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('Disallowed by'));
    });

    test('should allow specific path over general disallow', () => {
      const robotsInfo = {
        rules: {
          '*': {
            disallow: ['/'],
            allow: ['/public/', '/contact']
          }
        }
      };

      const result = isPathAllowed(robotsInfo, '/contact', 'MyBot');
      assert.strictEqual(result.allowed, true);
    });

    test('should handle wildcard patterns', () => {
      const robotsInfo = {
        rules: {
          '*': { disallow: ['/admin/*'], allow: [] }
        }
      };

      const result = isPathAllowed(robotsInfo, '/admin/users', 'MyBot');
      assert.strictEqual(result.allowed, false);
    });

    test('should prefer specific user-agent over wildcard', () => {
      const robotsInfo = {
        rules: {
          '*': { disallow: ['/'], allow: [] },
          'mybot': { disallow: [], allow: ['/'] }
        }
      };

      const result = isPathAllowed(robotsInfo, '/products', 'MyBot');
      assert.strictEqual(result.allowed, true);
    });
  });

  describe('checkPathsAgainstRobots', () => {
    test('should check all evidence paths', () => {
      const robotsInfo = {
        rules: {
          '*': { disallow: ['/admin/', '/private/'], allow: [] }
        }
      };
      const paths = ['/', '/products', '/contact', '/about'];

      const results = checkPathsAgainstRobots(robotsInfo, paths, 'MyBot');

      assert.strictEqual(results.length, 4);
      assert.strictEqual(results[0].allowed, true); // /
      assert.strictEqual(results[1].allowed, true); // /products
    });

    test('should identify disallowed paths', () => {
      const robotsInfo = {
        rules: {
          '*': { disallow: ['/'], allow: ['/public/'] }
        }
      };
      const paths = ['/', '/products', '/contact'];

      const results = checkPathsAgainstRobots(robotsInfo, paths, 'MyBot');

      const disallowed = results.filter(r => !r.allowed);
      assert.ok(disallowed.length > 0);
    });
  });

  describe('filterAllowedPaths', () => {
    test('should return only allowed paths', () => {
      const robotsInfo = {
        rules: {
          '*': { disallow: ['/admin/', '/private/'], allow: [] }
        }
      };
      const paths = ['/', '/products', '/admin/', '/contact'];

      const { allowed, skipped } = filterAllowedPaths(robotsInfo, paths, 'MyBot');

      assert.ok(allowed.includes('/'));
      assert.ok(allowed.includes('/products'));
      assert.ok(allowed.includes('/contact'));
      assert.ok(!allowed.includes('/admin/'));
      assert.ok(skipped.some(s => s.path === '/admin/'));
    });

    test('should return all paths when no robots.txt', () => {
      const robotsInfo = { rules: {} };
      const paths = ['/', '/products', '/contact'];

      const { allowed, skipped } = filterAllowedPaths(robotsInfo, paths, 'MyBot');

      assert.strictEqual(allowed.length, 3);
      assert.strictEqual(skipped.length, 0);
    });

    test('should include reason for filtering', () => {
      const robotsInfo = {
        rules: {
          '*': { disallow: ['/'], allow: [] }
        }
      };
      const paths = ['/', '/products'];

      const { allowed, skipped } = filterAllowedPaths(robotsInfo, paths, 'MyBot');

      assert.strictEqual(allowed.length, 0);
      assert.strictEqual(skipped.length, 2);
      assert.ok(skipped[0].reason.includes('Disallowed'));
    });
  });
});
