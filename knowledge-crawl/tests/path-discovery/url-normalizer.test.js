/**
 * Tests for url-normalizer.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  removeTrackingParams,
  generatePattern,
  groupUrlsByPattern,
  selectRepresentatives,
  processUrls,
  getDynamicUrlWeight,
  calculateKeywordScore
} = require('../../src/services/path-discovery/url-normalizer');

describe('url-normalizer', () => {
  describe('removeTrackingParams', () => {
    it('should remove UTM parameters', () => {
      const url = 'https://example.com/products?utm_source=google&utm_campaign=spring';
      const result = removeTrackingParams(url);
      assert.strictEqual(result, 'https://example.com/products');
    });

    it('should remove session parameters', () => {
      const url = 'https://example.com/contact?session=abc123&ref=email';
      const result = removeTrackingParams(url);
      assert.strictEqual(result, 'https://example.com/contact');
    });

    it('should preserve content parameters', () => {
      const url = 'https://example.com/products?id=123&page=2';
      const result = removeTrackingParams(url);
      assert.strictEqual(result, 'https://example.com/products?id=123&page=2');
    });

    it('should remove fbclid and gclid', () => {
      const url = 'https://example.com/page?fbclid=abc&gclid=def';
      const result = removeTrackingParams(url);
      assert.strictEqual(result, 'https://example.com/page');
    });
  });

  describe('generatePattern', () => {
    it('should identify pagination URLs', () => {
      const result = generatePattern('https://example.com/products?page=2');
      assert.strictEqual(result.type, 'pagination');
    });

    it('should identify ID parameter URLs', () => {
      const result = generatePattern('https://example.com/product.php?id=123');
      assert.strictEqual(result.type, 'id_param');
    });

    it('should identify RESTful numeric IDs', () => {
      const result = generatePattern('https://example.com/product/456');
      assert.strictEqual(result.type, 'restful_numeric');
    });

    it('should identify RESTful semantic paths', () => {
      const result = generatePattern('https://example.com/products/solenoid-valve');
      assert.strictEqual(result.type, 'restful_semantic');
    });

    it('should identify static URLs', () => {
      const result = generatePattern('https://example.com/contact');
      assert.strictEqual(result.type, 'static');
    });
  });

  describe('groupUrlsByPattern', () => {
    it('should group pagination URLs correctly', () => {
      const urls = [
        'https://example.com/products?page=1',
        'https://example.com/products?page=2',
        'https://example.com/products?page=3'
      ];

      const groups = groupUrlsByPattern(urls);

      // Should be grouped together
      const paginationGroup = Array.from(groups.values()).find(g => g.type === 'pagination');
      assert.ok(paginationGroup);
      assert.strictEqual(paginationGroup.urls.length, 3);
    });

    it('should group ID parameter URLs correctly', () => {
      const urls = [
        'https://example.com/product.php?id=1',
        'https://example.com/product.php?id=2',
        'https://example.com/product.php?id=500'
      ];

      const groups = groupUrlsByPattern(urls);

      const idGroup = Array.from(groups.values()).find(g => g.type === 'id_param');
      assert.ok(idGroup);
      assert.strictEqual(idGroup.urls.length, 3);
    });

    it('should separate static and dynamic URLs', () => {
      const urls = [
        'https://example.com/contact',
        'https://example.com/about',
        'https://example.com/products?page=1',
        'https://example.com/products?page=2'
      ];

      const groups = groupUrlsByPattern(urls);

      // Static URLs should each be their own group
      const staticGroups = Array.from(groups.values()).filter(g => g.type === 'static');
      assert.strictEqual(staticGroups.length, 2);

      // Pagination URLs should be one group
      const paginationGroup = Array.from(groups.values()).find(g => g.type === 'pagination');
      assert.ok(paginationGroup);
      assert.strictEqual(paginationGroup.urls.length, 2);
    });

    it('should group RESTful numeric IDs', () => {
      const urls = [
        'https://example.com/product/123',
        'https://example.com/product/456',
        'https://example.com/product/789'
      ];

      const groups = groupUrlsByPattern(urls);

      const numericGroup = Array.from(groups.values()).find(g => g.type === 'restful_numeric');
      assert.ok(numericGroup);
      assert.strictEqual(numericGroup.urls.length, 3);
    });
  });

  describe('selectRepresentatives', () => {
    it('should select first and middle page from pagination group', () => {
      const group = {
        type: 'pagination',
        pattern: '/products?page=*',
        urls: [
          'https://example.com/products?page=1',
          'https://example.com/products?page=2',
          'https://example.com/products?page=3',
          'https://example.com/products?page=4',
          'https://example.com/products?page=5'
        ]
      };

      const selected = selectRepresentatives(group, 2);

      assert.strictEqual(selected.length, 2);
      assert.ok(selected.includes('https://example.com/products?page=1'));
      // Middle page should be included
      assert.ok(selected.some(u => u.includes('page=3')));
    });

    it('should select only one from ID parameter group', () => {
      const group = {
        type: 'id_param',
        pattern: '/product.php?id=*',
        urls: [
          'https://example.com/product.php?id=1',
          'https://example.com/product.php?id=2',
          'https://example.com/product.php?id=500'
        ]
      };

      const selected = selectRepresentatives(group, 2);

      assert.strictEqual(selected.length, 1);
    });

    it('should keep all static URLs if under limit', () => {
      const group = {
        type: 'static',
        pattern: '/contact',
        urls: ['https://example.com/contact']
      };

      const selected = selectRepresentatives(group, 2);

      assert.strictEqual(selected.length, 1);
      assert.strictEqual(selected[0], 'https://example.com/contact');
    });

    it('should select by keyword relevance for semantic paths', () => {
      const group = {
        type: 'restful_semantic',
        pattern: '/products/{slug}',
        urls: [
          'https://example.com/products/solenoid-valve',
          'https://example.com/products/water-pump',
          'https://example.com/products/controller-lorawan'
        ]
      };

      const keywords = ['lorawan', 'solenoid'];
      const selected = selectRepresentatives(group, 2, keywords);

      assert.strictEqual(selected.length, 2);
      // Should include the LoRaWAN product
      assert.ok(selected.some(u => u.includes('lorawan')));
    });

    it('should select only one from RESTful numeric group', () => {
      const group = {
        type: 'restful_numeric',
        pattern: '/product/{id}',
        urls: [
          'https://example.com/product/123',
          'https://example.com/product/456',
          'https://example.com/product/789'
        ]
      };

      const selected = selectRepresentatives(group, 2);

      assert.strictEqual(selected.length, 1);
    });
  });

  describe('processUrls', () => {
    it('should clean, group, and select representatives', () => {
      const urls = [
        'https://example.com/contact',
        'https://example.com/about',
        'https://example.com/products?page=1&utm_source=google',
        'https://example.com/products?page=2&utm_source=google',
        'https://example.com/products?page=3&utm_source=google',
        'https://example.com/product.php?id=1',
        'https://example.com/product.php?id=2'
      ];

      const result = processUrls(urls, { maxPerGroup: 2 });

      // Should include static URLs
      assert.ok(result.some(u => u.includes('/contact')));
      assert.ok(result.some(u => u.includes('/about')));

      // Should have limited pagination (2 max)
      const paginationUrls = result.filter(u => u.includes('page='));
      assert.ok(paginationUrls.length <= 2);

      // Should have at most 2 ID URLs (maxPerGroup)
      const idUrls = result.filter(u => u.includes('id='));
      assert.ok(idUrls.length <= 2);
    });

    it('should deduplicate results', () => {
      const urls = [
        'https://example.com/contact',
        'https://example.com/contact',
        'https://example.com/about'
      ];

      const result = processUrls(urls);

      assert.strictEqual(result.length, 2);
    });
  });

  describe('getDynamicUrlWeight', () => {
    it('should return 1.0 for static URLs', () => {
      const weight = getDynamicUrlWeight('https://example.com/contact');
      assert.strictEqual(weight, 1.0);
    });

    it('should return 0.8 for RESTful semantic URLs', () => {
      const weight = getDynamicUrlWeight('https://example.com/products/solenoid-valve');
      assert.strictEqual(weight, 0.8);
    });

    it('should return 0.4 for non-first pagination pages', () => {
      const weight = getDynamicUrlWeight('https://example.com/products?page=5');
      assert.strictEqual(weight, 0.4);
    });

    it('should return 0.8 for first pagination page', () => {
      const weight = getDynamicUrlWeight('https://example.com/products?page=1');
      assert.strictEqual(weight, 0.8);
    });

    it('should return 0.5 for ID parameter URLs', () => {
      const weight = getDynamicUrlWeight('https://example.com/product.php?id=123');
      assert.strictEqual(weight, 0.5);
    });

    it('should return 0.5 for RESTful numeric IDs', () => {
      const weight = getDynamicUrlWeight('https://example.com/product/123');
      assert.strictEqual(weight, 0.5);
    });
  });

  describe('calculateKeywordScore', () => {
    it('should return high score for exact match', () => {
      const score = calculateKeywordScore(
        'https://example.com/products/solenoid-valve-controller',
        ['solenoid valve', 'LoRaWAN']
      );
      assert.ok(score > 0);
    });

    it('should return partial score for partial match', () => {
      const score = calculateKeywordScore(
        'https://example.com/products/water-valve',
        ['solenoid valve']
      );
      // "valve" is a partial match
      assert.ok(score > 0);
    });

    it('should return 0 for no match', () => {
      const score = calculateKeywordScore(
        'https://example.com/about/company-history',
        ['solenoid valve']
      );
      assert.strictEqual(score, 0);
    });

    it('should handle empty keywords', () => {
      const score = calculateKeywordScore('https://example.com/products', []);
      assert.strictEqual(score, 0);
    });
  });
});
