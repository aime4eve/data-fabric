/**
 * Google SERP 采集测试
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  detectCaptcha,
  createSearchUrl,
  generateMockResults
} = require('../src/services/serp-collector');

describe('SERP Collector', () => {
  test('createSearchUrl should create Google search URL with query', () => {
    const query = 'solenoid valve controller';
    const url = createSearchUrl(query);

    assert.ok(url.includes('google.com/search'));
    assert.ok(url.includes(encodeURIComponent(query)));
  });

  test('detectCaptcha should detect captcha page', () => {
    const html = `
      <html>
        <body>
          <div class="g-recaptcha"></div>
          <h1>Verify you are human</h1>
        </body>
      </html>
    `;

    assert.strictEqual(detectCaptcha(html), true);
  });

  test('detectCaptcha should detect unusual traffic message', () => {
    const html = `
      <html>
        <body>
          <h1>Our systems have detected unusual traffic</h1>
        </body>
      </html>
    `;

    assert.strictEqual(detectCaptcha(html), true);
  });

  test('detectCaptcha should return false for normal page', () => {
    const html = `
      <html>
        <body>
          <div id="search">
            <div class="g">Search result 1</div>
          </div>
        </body>
      </html>
    `;

    assert.strictEqual(detectCaptcha(html), false);
  });

  test('generateMockResults should generate valid mock data', () => {
    const results = generateMockResults('test query', '20260303-142530');

    assert.ok(results.length > 0);
    assert.strictEqual(results[0].run_id, '20260303-142530');
    assert.strictEqual(results[0].query, 'test query');
    assert.ok(results[0].url);
    assert.ok(results[0].title);
    assert.ok(results[0].captured_at);
  });

  test('generateMockResults should generate results with rank 1 to 10', () => {
    const results = generateMockResults('test', 'run-001');

    assert.strictEqual(results[0].rank, 1);
    assert.strictEqual(results[results.length - 1].rank, results.length);
  });
});
