/**
 * Integration tests for path-discovery module
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  discoverPaths,
  fetchSitemap,
  filterUrls,
  deduplicateUrls
} = require('../../src/services/path-discovery');

describe('path-discovery integration', () => {
  describe('discoverPaths', () => {
    it('should discover paths from sitemap', async () => {
      // Mock fetch for sitemap
      const originalFetch = global.fetch;
      global.fetch = async (url) => {
        if (url.includes('sitemap')) {
          return {
            ok: true,
            status: 200,
            text: async () => `<?xml version="1.0"?>
<urlset>
  <url><loc>https://example.com/</loc><priority>1.0</priority></url>
  <url><loc>https://example.com/products</loc><priority>0.8</priority></url>
  <url><loc>https://example.com/contact</loc><priority>0.7</priority></url>
</urlset>`
          };
        }
        return { ok: false, status: 404 };
      };

      const result = await discoverPaths('example.com', {
        maxPaths: 10,
        keywords: ['solenoid']
      });

      global.fetch = originalFetch;

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.source, 'sitemap');
      assert.ok(result.paths.length > 0);
    });

    it('should return failure when both sitemap and navigation fail', async () => {
      // Mock fetch to fail
      const originalFetch = global.fetch;
      global.fetch = async () => ({ ok: false, status: 404 });

      const result = await discoverPaths('example.com', {
        maxPaths: 10,
        skipOnFailure: true
      });

      global.fetch = originalFetch;

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should limit paths to maxPaths', async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        const urls = Array(50).fill(0).map((_, i) =>
          `<url><loc>https://example.com/page${i}</loc><priority>0.5</priority></url>`
        ).join('\n');

        return {
          ok: true,
          status: 200,
          text: async () => `<?xml version="1.0"?><urlset>${urls}</urlset>`
        };
      };

      const result = await discoverPaths('example.com', {
        maxPaths: 5
      });

      global.fetch = originalFetch;

      assert.strictEqual(result.success, true);
      assert.ok(result.paths.length <= 5);
    });

    it('should prioritize paths by keyword relevance', async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => ({
        ok: true,
        status: 200,
        text: async () => `<?xml version="1.0"?>
<urlset>
  <url><loc>https://example.com/</loc><priority>1.0</priority></url>
  <url><loc>https://example.com/products/solenoid-valve</loc><priority>0.8</priority></url>
  <url><loc>https://example.com/products/random-item</loc><priority>0.8</priority></url>
  <url><loc>https://example.com/contact</loc><priority>0.7</priority></url>
</urlset>`
      });

      const result = await discoverPaths('example.com', {
        maxPaths: 3,
        keywords: ['solenoid valve']
      });

      global.fetch = originalFetch;

      assert.strictEqual(result.success, true);
      // Should include the solenoid valve page
      assert.ok(result.paths.some(p => p.includes('solenoid')));
    });
  });

  describe('fetchSitemap integration', () => {
    it('should handle sitemap index with child sitemaps', async () => {
      let callCount = 0;
      const originalFetch = global.fetch;

      global.fetch = async (url) => {
        callCount++;
        if (url.includes('sitemap.xml') && callCount === 1) {
          return {
            ok: true,
            status: 200,
            text: async () => `<?xml version="1.0"?>
<sitemapindex>
  <sitemap><loc>https://example.com/sitemap-products.xml</loc></sitemap>
</sitemapindex>`
          };
        }
        if (url.includes('sitemap-products.xml')) {
          return {
            ok: true,
            status: 200,
            text: async () => `<?xml version="1.0"?>
<urlset>
  <url><loc>https://example.com/products/item1</loc><priority>0.8</priority></url>
</urlset>`
          };
        }
        return { ok: false, status: 404 };
      };

      const result = await fetchSitemap('example.com');

      global.fetch = originalFetch;

      assert.strictEqual(result.success, true);
      assert.ok(result.urls.length > 0);
    });

    it('should try fallback sitemap URLs', async () => {
      let triedUrls = [];
      const originalFetch = global.fetch;

      global.fetch = async (url) => {
        triedUrls.push(url);
        if (url.includes('sitemap_index.xml')) {
          return {
            ok: true,
            status: 200,
            text: async () => `<?xml version="1.0"?>
<urlset>
  <url><loc>https://example.com/page</loc></url>
</urlset>`
          };
        }
        return { ok: false, status: 404 };
      };

      const result = await fetchSitemap('example.com');

      global.fetch = originalFetch;

      assert.strictEqual(result.success, true);
      assert.ok(triedUrls.some(u => u.includes('sitemap')));
    });
  });

  describe('filterUrls integration', () => {
    it('should ensure minimum quotas for key pages', () => {
      const urls = [
        { loc: 'https://example.com/product/1', priority: 0.5 },
        { loc: 'https://example.com/product/2', priority: 0.5 },
        { loc: 'https://example.com/product/3', priority: 0.5 }
      ];

      const result = filterUrls(urls, [], { maxTotal: 15 });

      // Should include available pages even if missing HOME/CONTACT/ABOUT
      assert.ok(result.length > 0);
    });

    it('should combine keyword relevance with page type', () => {
      const urls = [
        { loc: 'https://example.com/', priority: 1.0 },
        { loc: 'https://example.com/products/solenoid-valve', priority: 0.8 },
        { loc: 'https://example.com/contact', priority: 0.7 },
        { loc: 'https://example.com/about', priority: 0.6 }
      ];

      const result = filterUrls(urls, ['solenoid'], { maxTotal: 15 });

      // All should be included
      assert.strictEqual(result.length, 4);

      // Home should be first (highest type weight)
      assert.strictEqual(result[0].type, 'HOME');
    });
  });

  describe('deduplicateUrls integration', () => {
    it('should handle mixed URL formats', () => {
      const urls = [
        { loc: 'https://example.com/products' },
        { loc: 'https://example.com/products/' },
        { loc: 'https://EXAMPLE.com/products' },
        { loc: 'https://example.com/about' }
      ];

      const result = deduplicateUrls(urls);

      // Should deduplicate case-insensitively and trailing slash
      assert.ok(result.length <= 3);
    });
  });

  describe('End-to-end scenarios', () => {
    it('should handle typical manufacturer website sitemap', async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => ({
        ok: true,
        status: 200,
        text: async () => `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://manufacturer.com/</loc><priority>1.0</priority></url>
  <url><loc>https://manufacturer.com/products</loc><priority>0.9</priority></url>
  <url><loc>https://manufacturer.com/products/valve-controller</loc><priority>0.8</priority></url>
  <url><loc>https://manufacturer.com/products/sensor-unit</loc><priority>0.8</priority></url>
  <url><loc>https://manufacturer.com/solutions</loc><priority>0.7</priority></url>
  <url><loc>https://manufacturer.com/about</loc><priority>0.6</priority></url>
  <url><loc>https://manufacturer.com/contact</loc><priority>0.6</priority></url>
  <url><loc>https://manufacturer.com/downloads</loc><priority>0.5</priority></url>
</urlset>`
      });

      const result = await discoverPaths('manufacturer.com', {
        maxPaths: 10,
        keywords: ['valve', 'controller']
      });

      global.fetch = originalFetch;

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.source, 'sitemap');

      // Should include key pages
      const paths = result.paths;
      assert.ok(paths.some(p => p.includes('/products')));
      assert.ok(paths.some(p => p.includes('/contact') || p.includes('/about')));
    });

    it('should handle website with many product pages', async () => {
      const urls = [
        '<url><loc>https://shop.com/</loc><priority>1.0</priority></url>',
        '<url><loc>https://shop.com/contact</loc><priority>0.7</priority></url>'
      ];

      // Add many product pages
      for (let i = 1; i <= 50; i++) {
        urls.push(`<url><loc>https://shop.com/products/item${i}</loc><priority>0.5</priority></url>`);
      }

      const originalFetch = global.fetch;
      global.fetch = async () => ({
        ok: true,
        status: 200,
        text: async () => `<?xml version="1.0"?><urlset>${urls.join('')}</urlset>`
      });

      const result = await discoverPaths('shop.com', {
        maxPaths: 10
      });

      global.fetch = originalFetch;

      assert.strictEqual(result.success, true);
      assert.ok(result.paths.length <= 10);

      // Should include home and contact
      assert.ok(result.paths.some(p => p.endsWith('.com/') || p.endsWith('.com')));
    });
  });
});
