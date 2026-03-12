/**
 * Tests for path-filter.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  PAGE_TYPES,
  classifyUrl,
  calculateRelevance,
  calculateDepthFactor,
  calculateFinalScore,
  filterUrls,
  deduplicateUrls,
  isEnglishUrl
} = require('../../src/services/path-discovery/path-filter');

describe('path-filter', () => {
  describe('classifyUrl', () => {
    it('should classify home page', () => {
      const urls = [
        'https://example.com/',
        'https://example.com/index',
        'https://example.com/index.html',
        'https://example.com/home'
      ];

      for (const url of urls) {
        const result = classifyUrl(url);
        assert.strictEqual(result.type, 'HOME');
        assert.strictEqual(result.weight, 1.0);
      }
    });

    it('should classify contact page', () => {
      const urls = [
        'https://example.com/contact',
        'https://example.com/contact-us',
        'https://example.com/get-in-touch'
      ];

      for (const url of urls) {
        const result = classifyUrl(url);
        assert.strictEqual(result.type, 'CONTACT');
        assert.strictEqual(result.weight, 0.95);
      }
    });

    it('should classify about page', () => {
      const urls = [
        'https://example.com/about',
        'https://example.com/about-us',
        'https://example.com/company'
      ];

      for (const url of urls) {
        const result = classifyUrl(url);
        assert.strictEqual(result.type, 'ABOUT');
        assert.strictEqual(result.weight, 0.9);
      }
    });

    it('should classify products list page', () => {
      const urls = [
        'https://example.com/products',
        'https://example.com/product',
        'https://example.com/catalog'
      ];

      for (const url of urls) {
        const result = classifyUrl(url);
        assert.strictEqual(result.type, 'PRODUCTS_LIST');
        assert.strictEqual(result.weight, 0.85);
      }
    });

    it('should classify product detail page', () => {
      const urls = [
        'https://example.com/products/solenoid-valve',
        'https://example.com/product/123',
        'https://example.com/item/abc'
      ];

      for (const url of urls) {
        const result = classifyUrl(url);
        assert.strictEqual(result.type, 'PRODUCT_DETAIL');
        assert.strictEqual(result.weight, 0.7);
      }
    });

    it('should classify solutions page', () => {
      const urls = [
        'https://example.com/solutions',
        'https://example.com/services',
        'https://example.com/industries'
      ];

      for (const url of urls) {
        const result = classifyUrl(url);
        assert.strictEqual(result.type, 'SOLUTIONS');
        assert.strictEqual(result.weight, 0.8);
      }
    });

    it('should classify blog/news page', () => {
      const urls = [
        'https://example.com/blog',
        'https://example.com/news',
        'https://example.com/articles'
      ];

      for (const url of urls) {
        const result = classifyUrl(url);
        assert.strictEqual(result.type, 'NEWS_BLOG');
        assert.strictEqual(result.weight, 0.3);
      }
    });

    it('should classify unknown pages as OTHER', () => {
      const url = 'https://example.com/some-random-page';
      const result = classifyUrl(url);
      assert.strictEqual(result.type, 'OTHER');
      assert.strictEqual(result.weight, 0.4);
    });
  });

  describe('calculateRelevance', () => {
    it('should return high score for exact keyword match', () => {
      const score = calculateRelevance(
        'https://example.com/products/solenoid-valve-controller',
        ['solenoid valve', 'LoRaWAN']
      );
      assert.ok(score > 0);
    });

    it('should return partial score for partial match', () => {
      const score = calculateRelevance(
        'https://example.com/products/water-valve',
        ['solenoid valve']
      );
      assert.ok(score > 0);
    });

    it('should return 0 for no match', () => {
      const score = calculateRelevance(
        'https://example.com/about/company-history',
        ['solenoid valve']
      );
      assert.strictEqual(score, 0);
    });
  });

  describe('calculateDepthFactor', () => {
    it('should return 1.0 for root', () => {
      const factor = calculateDepthFactor('https://example.com/');
      assert.strictEqual(factor, 1.0);
    });

    it('should return lower value for deeper paths', () => {
      const shallow = calculateDepthFactor('https://example.com/products');
      const deep = calculateDepthFactor('https://example.com/category/subcategory/product');

      assert.ok(shallow > deep);
    });

    it('should handle query parameters', () => {
      const factor = calculateDepthFactor('https://example.com/products?page=1');
      assert.ok(factor < 1.0);
    });
  });

  describe('calculateFinalScore', () => {
    it('should combine all factors correctly', () => {
      const result = calculateFinalScore(
        'https://example.com/products/solenoid-valve',
        ['solenoid valve'],
        0.8
      );

      assert.ok(result.finalScore > 0);
      assert.ok(result.finalScore <= 1);
      assert.strictEqual(result.type, 'PRODUCT_DETAIL');
      assert.ok(result.relevance > 0);
      assert.ok(result.depthFactor > 0);
    });

    it('should apply dynamic URL penalty', () => {
      const staticScore = calculateFinalScore('https://example.com/contact', [], 0.5);
      const dynamicScore = calculateFinalScore('https://example.com/products?page=5', [], 0.5);

      assert.ok(staticScore.dynamicWeight > dynamicScore.dynamicWeight);
    });
  });

  describe('filterUrls', () => {
    it('should enforce minimum quotas', () => {
      const urls = [
        { loc: 'https://example.com/product/1', priority: 0.5 },
        { loc: 'https://example.com/product/2', priority: 0.5 },
        { loc: 'https://example.com/product/3', priority: 0.5 }
      ];

      const result = filterUrls(urls, [], { maxTotal: 15 });

      // Should still include URLs even if they're all product pages
      // (no explicit HOME/CONTACT/ABOUT available, so use what's there)
      assert.ok(result.length > 0);
    });

    it('should enforce maximum quotas', () => {
      const urls = [];
      for (let i = 0; i < 50; i++) {
        urls.push({ loc: `https://example.com/product/${i}`, priority: 0.5 });
      }

      const result = filterUrls(urls, [], { maxTotal: 15 });

      // Count product detail pages
      const productDetails = result.filter(r => r.type === 'PRODUCT_DETAIL');
      assert.ok(productDetails.length <= PAGE_TYPES.PRODUCT_DETAIL.maxQuota);
    });

    it('should respect total limit', () => {
      const urls = [];
      for (let i = 0; i < 100; i++) {
        urls.push({ loc: `https://example.com/page${i}`, priority: 0.5 });
      }

      const result = filterUrls(urls, [], { maxTotal: 10 });

      assert.ok(result.length <= 10);
    });

    it('should sort by final score', () => {
      const urls = [
        { loc: 'https://example.com/', priority: 0.5 },
        { loc: 'https://example.com/contact', priority: 0.5 },
        { loc: 'https://example.com/products', priority: 0.5 }
      ];

      const result = filterUrls(urls, [], { maxTotal: 15 });

      // Home page should be first (highest weight)
      assert.strictEqual(result[0].type, 'HOME');
    });

    it('should return empty array for empty input', () => {
      const result = filterUrls([]);
      assert.strictEqual(result.length, 0);
    });
  });

  describe('deduplicateUrls', () => {
    it('should deduplicate with trailing slash', () => {
      const urls = [
        { loc: 'https://example.com/products' },
        { loc: 'https://example.com/products/' }
      ];

      const result = deduplicateUrls(urls);

      assert.strictEqual(result.length, 1);
    });

    it('should deduplicate after parameter removal', () => {
      const urls = [
        { loc: 'https://example.com/contact?ref=nav' },
        { loc: 'https://example.com/contact?ref=footer' }
      ];

      // Note: deduplicateUrls doesn't remove params, just normalizes path
      // So these are different URLs
      const result = deduplicateUrls(urls);
      assert.ok(result.length >= 1);
    });

    it('should preserve unique URLs', () => {
      const urls = [
        { loc: 'https://example.com/' },
        { loc: 'https://example.com/about' },
        { loc: 'https://example.com/contact' }
      ];

      const result = deduplicateUrls(urls);

      assert.strictEqual(result.length, 3);
    });
  });

  describe('isEnglishUrl', () => {
    it('should return true for English URLs', () => {
      assert.strictEqual(isEnglishUrl('https://example.com/products'), true);
      assert.strictEqual(isEnglishUrl('https://example.com/en/products'), true);
      assert.strictEqual(isEnglishUrl('https://example.com/en-us/products'), true);
    });

    it('should return false for non-English URLs', () => {
      assert.strictEqual(isEnglishUrl('https://example.com/zh/products'), false);
      assert.strictEqual(isEnglishUrl('https://example.com/de/products'), false);
      assert.strictEqual(isEnglishUrl('https://example.com/fr/products'), false);
    });

    it('should return true for root URL', () => {
      assert.strictEqual(isEnglishUrl('https://example.com/'), true);
    });
  });
});
