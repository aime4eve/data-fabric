/**
 * URL 归一化测试
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  normalizeUrl,
  extractDomain,
  generateDomainKey,
  removeTrackingParams
} = require('../src/utils/url-normalizer');

describe('URL Normalizer', () => {
  test('removeTrackingParams should remove utm_* parameters', () => {
    const url = 'https://example.com/page?utm_source=google&utm_medium=cpc&id=123';
    const cleaned = removeTrackingParams(url);
    assert.strictEqual(cleaned, 'https://example.com/page?id=123');
  });

  test('removeTrackingParams should remove fbclid parameter', () => {
    const url = 'https://example.com/page?fbclid=abc123&id=456';
    const cleaned = removeTrackingParams(url);
    assert.strictEqual(cleaned, 'https://example.com/page?id=456');
  });

  test('normalizeUrl should remove trailing slash', () => {
    const url = 'https://example.com/page/';
    const normalized = normalizeUrl(url);
    assert.strictEqual(normalized, 'https://example.com/page');
  });

  test('normalizeUrl should remove tracking parameters', () => {
    const url = 'https://example.com/page?utm_source=google';
    const normalized = normalizeUrl(url);
    assert.strictEqual(normalized, 'https://example.com/page');
  });

  test('normalizeUrl should handle http to https upgrade', () => {
    const url = 'http://example.com/page';
    const normalized = normalizeUrl(url);
    assert.strictEqual(normalized, 'https://example.com/page');
  });

  test('normalizeUrl should return null for invalid URLs', () => {
    const normalized = normalizeUrl('not a valid url');
    assert.strictEqual(normalized, null);
  });

  test('extractDomain should extract domain from URL', () => {
    const url = 'https://www.example.com/page';
    const domain = extractDomain(url);
    assert.strictEqual(domain, 'www.example.com');
  });

  test('extractDomain should return null for invalid URLs', () => {
    const domain = extractDomain('invalid url');
    assert.strictEqual(domain, null);
  });

  test('generateDomainKey should remove www prefix', () => {
    const url = 'https://www.example.com/page';
    const key = generateDomainKey(url);
    assert.strictEqual(key, 'example.com');
  });

  test('generateDomainKey should produce consistent keys for same domain', () => {
    const urls = [
      'https://www.example.com/',
      'https://www.example.com/page1',
      'https://www.example.com/page2?param=value'
    ];
    const keys = urls.map(generateDomainKey);
    assert.ok(keys.every(k => k === 'example.com'));
  });

  test('generateDomainKey should return null for invalid URLs', () => {
    const key = generateDomainKey('invalid url');
    assert.strictEqual(key, null);
  });
});
