/**
 * Tests for evidence-fetcher.js
 * 门户证据页抓取与文本清洗
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  extractPageText,
  createEvidenceRecord,
  fetchEvidencePage,
  fetchAllEvidencePages,
  captureEvidenceScreenshot,
  extractPathFromUrl
} = require('../src/services/evidence-fetcher');

describe('evidence-fetcher', () => {
  describe('extractPageText', () => {
    test('should extract text from simple HTML', () => {
      const html = `
        <html>
          <body>
            <h1>Welcome to Our Company</h1>
            <p>We manufacture solenoid valves.</p>
          </body>
        </html>
      `;

      const result = extractPageText(html);

      assert.ok(result.includes('Welcome to Our Company'));
      assert.ok(result.includes('solenoid valves'));
    });

    test('should remove script and style tags', () => {
      const html = `
        <html>
          <head>
            <script>console.log('test');</script>
            <style>.foo { color: red; }</style>
          </head>
          <body>
            <p>Main content</p>
          </body>
        </html>
      `;

      const result = extractPageText(html);

      assert.ok(!result.includes('console.log'));
      assert.ok(!result.includes('color: red'));
      assert.ok(result.includes('Main content'));
    });

    test('should normalize whitespace', () => {
      const html = `
        <html>
          <body>
            <p>Line 1</p>
            <p>Line   2</p>
            <p>Line    3</p>
          </body>
        </html>
      `;

      const result = extractPageText(html);

      assert.ok(!result.includes('   '));
    });

    test('should return empty string for invalid HTML', () => {
      const result = extractPageText(null);
      assert.strictEqual(result, '');
    });
  });

  describe('createEvidenceRecord', () => {
    test('should create successful record', () => {
      const record = createEvidenceRecord({
        domain: 'example.com',
        path: '/contact',
        url: 'https://example.com/contact',
        text: 'Contact us at info@example.com',
        statusCode: 200
      });

      assert.strictEqual(record.domain, 'example.com');
      assert.strictEqual(record.path, '/contact');
      assert.strictEqual(record.url, 'https://example.com/contact');
      assert.strictEqual(record.status, 'success');
      assert.ok(record.text.includes('info@example.com'));
    });

    test('should create error record for 404', () => {
      const record = createEvidenceRecord({
        domain: 'example.com',
        path: '/notfound',
        url: 'https://example.com/notfound',
        text: '',
        statusCode: 404
      });

      assert.strictEqual(record.status, 'error');
      assert.ok(record.error_reason.includes('404'));
    });

    test('should create error record for timeout', () => {
      const record = createEvidenceRecord({
        domain: 'example.com',
        path: '/slow',
        url: 'https://example.com/slow',
        text: '',
        error: new Error('Timeout exceeded')
      });

      assert.strictEqual(record.status, 'error');
      assert.ok(record.error_reason.includes('Timeout'));
    });
  });

  describe('fetchEvidencePage', () => {
    // 注意：这个测试需要 mock 或跳过实际网络请求
    test('should return correct structure', async () => {
      // 这里只测试函数存在和基本结构
      // 实际网络测试在集成测试中进行
      assert.ok(typeof fetchEvidencePage === 'function');
    });

    test('captureEvidenceScreenshot should generate screenshot file path', async () => {
      const screenshotDir = path.join(__dirname, 'fixtures', 'screenshots-test');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      const mockPage = {
        async screenshot(options) {
          fs.writeFileSync(options.path, '');
        }
      };
      const screenshotPath = await captureEvidenceScreenshot(mockPage, {
        screenshotDir,
        runId: '20260305-100000',
        domain: 'example.com',
        pagePath: '/contact'
      });
      assert.ok(screenshotPath.includes('20260305-100000'));
      assert.ok(screenshotPath.includes('example.com'));
      assert.ok(fs.existsSync(screenshotPath));
      fs.rmSync(screenshotDir, { recursive: true, force: true });
    });
  });

  describe('fetchAllEvidencePages', () => {
    test('should process all allowed paths', async () => {
      // 测试函数存在和基本结构
      assert.ok(typeof fetchAllEvidencePages === 'function');
    });

    test('should handle empty paths array', async () => {
      const results = await fetchAllEvidencePages(null, [], 'example.com', {});
      assert.deepStrictEqual(results, []);
    });

    test('should handle null page object', async () => {
      const results = await fetchAllEvidencePages(null, ['/', '/contact'], 'example.com', {});
      // 应该返回错误记录或空数组
      assert.ok(Array.isArray(results));
    });
  });

  describe('extractPathFromUrl', () => {
    test('should extract path from full URL', () => {
      const result = extractPathFromUrl('https://www.matix.cloud/hardware');
      assert.strictEqual(result, '/hardware');
    });

    test('should extract path with query string from full URL', () => {
      const result = extractPathFromUrl('https://example.com/products?id=123');
      assert.strictEqual(result, '/products?id=123');
    });

    test('should return relative path unchanged', () => {
      const result = extractPathFromUrl('/contact');
      assert.strictEqual(result, '/contact');
    });

    test('should return relative path with query unchanged', () => {
      const result = extractPathFromUrl('/products?page=2');
      assert.strictEqual(result, '/products?page=2');
    });

    test('should handle root path URL', () => {
      const result = extractPathFromUrl('https://example.com/');
      assert.strictEqual(result, '/');
    });

    test('should handle null input', () => {
      const result = extractPathFromUrl(null);
      assert.strictEqual(result, null);
    });

    test('should handle invalid URL gracefully', () => {
      // 无效 URL 应该返回原值
      const result = extractPathFromUrl('not-a-valid-url');
      assert.strictEqual(result, 'not-a-valid-url');
    });
  });
});
