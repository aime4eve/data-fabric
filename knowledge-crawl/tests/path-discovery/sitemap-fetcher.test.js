/**
 * Tests for sitemap-fetcher.js
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  parseSitemapXml,
  buildSitemapUrls,
  fetchAndParseSitemap,
  fetchSitemap,
  normalizeUrl
} = require('../../src/services/path-discovery/sitemap-fetcher');

describe('sitemap-fetcher', () => {
  describe('parseSitemapXml', () => {
    it('should parse standard urlset XML', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <priority>1.0</priority>
    <lastmod>2024-01-01</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>https://example.com/products</loc>
    <priority>0.8</priority>
  </url>
</urlset>`;

      const result = parseSitemapXml(xml);

      assert.strictEqual(result.type, 'urlset');
      assert.strictEqual(result.urls.length, 2);
      assert.strictEqual(result.urls[0].loc, 'https://example.com/');
      assert.strictEqual(result.urls[0].priority, 1.0);
      assert.strictEqual(result.urls[0].lastmod, '2024-01-01');
      assert.strictEqual(result.urls[0].changefreq, 'daily');
      assert.strictEqual(result.urls[1].loc, 'https://example.com/products');
      assert.strictEqual(result.urls[1].priority, 0.8);
    });

    it('should parse sitemap index XML', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
  </sitemap>
</sitemapindex>`;

      const result = parseSitemapXml(xml);

      assert.strictEqual(result.type, 'sitemapindex');
      assert.strictEqual(result.sitemaps.length, 2);
      assert.strictEqual(result.sitemaps[0], 'https://example.com/sitemap-products.xml');
      assert.strictEqual(result.sitemaps[1], 'https://example.com/sitemap-pages.xml');
    });

    it('should parse text sitemap', () => {
      const text = `https://example.com/
https://example.com/products
https://example.com/contact
https://example.com/about`;

      const result = parseSitemapXml(text);

      assert.strictEqual(result.type, 'text');
      assert.strictEqual(result.urls.length, 4);
      assert.strictEqual(result.urls[0].loc, 'https://example.com/');
      assert.strictEqual(result.urls[0].priority, 0.5);
    });

    it('should handle empty content', () => {
      const result = parseSitemapXml('');
      assert.strictEqual(result.type, null);
      assert.strictEqual(result.urls.length, 0);
    });

    it('should handle malformed XML with regex fallback', () => {
      const malformedXml = `<urlset>
  <url>
    <loc>https://example.com/page1</loc>
  </url>
  <url>
    <loc>https://example.com/page2</loc>
  </url>
</urlset>`;

      const result = parseSitemapXml(malformedXml);

      assert.strictEqual(result.type, 'urlset');
      assert.strictEqual(result.urls.length, 2);
    });

    it('should handle single URL in urlset', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`;

      const result = parseSitemapXml(xml);

      assert.strictEqual(result.type, 'urlset');
      assert.strictEqual(result.urls.length, 1);
    });
  });

  describe('buildSitemapUrls', () => {
    it('should include URLs from robots.txt', () => {
      const domain = 'example.com';
      const sitemapsFromRobots = ['https://example.com/custom-sitemap.xml'];

      const urls = buildSitemapUrls(domain, sitemapsFromRobots);

      assert.ok(urls.includes('https://example.com/custom-sitemap.xml'));
    });

    it('should add default sitemap paths', () => {
      const domain = 'example.com';

      const urls = buildSitemapUrls(domain);

      assert.ok(urls.includes('https://example.com/sitemap.xml'));
      assert.ok(urls.includes('https://example.com/sitemap_index.xml'));
    });

    it('should deduplicate URLs', () => {
      const domain = 'example.com';
      const sitemapsFromRobots = ['https://example.com/sitemap.xml'];

      const urls = buildSitemapUrls(domain, sitemapsFromRobots);

      const sitemapXmlCount = urls.filter(u => u === 'https://example.com/sitemap.xml').length;
      assert.strictEqual(sitemapXmlCount, 1);
    });

    it('should handle domain with protocol', () => {
      const domain = 'https://example.com';

      const urls = buildSitemapUrls(domain);

      assert.ok(urls.some(u => u.includes('example.com')));
    });

    it('should handle domain with path', () => {
      const domain = 'example.com/some/path';

      const urls = buildSitemapUrls(domain);

      assert.ok(urls.some(u => u === 'https://example.com/sitemap.xml'));
    });
  });

  describe('fetchAndParseSitemap', () => {
    it('should fetch and parse valid sitemap', async () => {
      const mockFetch = async (url) => ({
        ok: true,
        status: 200,
        text: async () => `<?xml version="1.0"?>
<urlset>
  <url><loc>https://example.com/</loc><priority>1.0</priority></url>
</urlset>`
      });

      const result = await fetchAndParseSitemap('https://example.com/sitemap.xml', { fetch: mockFetch });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.type, 'urlset');
      assert.strictEqual(result.urls.length, 1);
    });

    it('should handle HTTP errors gracefully', async () => {
      const mockFetch = async (url) => ({
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      });

      const result = await fetchAndParseSitemap('https://example.com/sitemap.xml', { fetch: mockFetch });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'HTTP 404');
    });

    it('should handle network errors', async () => {
      const mockFetch = async (url) => {
        throw new Error('Network error');
      };

      const result = await fetchAndParseSitemap('https://example.com/sitemap.xml', { fetch: mockFetch });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Network error');
    });
  });

  describe('fetchSitemap', () => {
    it('should return success with URLs from valid sitemap', async () => {
      const mockFetch = async (url) => ({
        ok: true,
        status: 200,
        text: async () => `<?xml version="1.0"?>
<urlset>
  <url><loc>https://example.com/</loc><priority>1.0</priority></url>
  <url><loc>https://example.com/products</loc><priority>0.8</priority></url>
</urlset>`
      });

      const result = await fetchSitemap('example.com', { fetch: mockFetch });

      assert.strictEqual(result.success, true);
      assert.ok(result.urls.length >= 1);
      assert.ok(result.source);
    });

    it('should try multiple sitemap URLs', async () => {
      let callCount = 0;
      const mockFetch = async (url) => {
        callCount++;
        if (url.includes('sitemap.xml') && callCount === 1) {
          return { ok: false, status: 404, text: async () => '' };
        }
        return {
          ok: true,
          status: 200,
          text: async () => `<?xml version="1.0"?>
<urlset>
  <url><loc>https://example.com/</loc></url>
</urlset>`
        };
      };

      const result = await fetchSitemap('example.com', { fetch: mockFetch });

      assert.strictEqual(result.success, true);
    });

    it('should respect maxUrls limit', async () => {
      const urls = Array(100).fill(0).map((_, i) =>
        `<url><loc>https://example.com/page${i}</loc></url>`
      ).join('\n');

      const mockFetch = async (url) => ({
        ok: true,
        status: 200,
        text: async () => `<?xml version="1.0"?><urlset>${urls}</urlset>`
      });

      const result = await fetchSitemap('example.com', { fetch: mockFetch, maxUrls: 10 });

      assert.ok(result.urls.length <= 10);
    });

    it('should use sitemaps from robots.txt', async () => {
      const mockFetch = async (url) => ({
        ok: true,
        status: 200,
        text: async () => `<?xml version="1.0"?>
<urlset>
  <url><loc>https://example.com/custom</loc></url>
</urlset>`
      });

      const result = await fetchSitemap('example.com', {
        fetch: mockFetch,
        sitemapsFromRobots: ['https://example.com/custom-sitemap.xml']
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.source, 'https://example.com/custom-sitemap.xml');
    });
  });

  describe('normalizeUrl', () => {
    it('should remove UTM parameters', () => {
      const url = 'https://example.com/products?utm_source=google&utm_campaign=spring';
      const result = normalizeUrl(url);
      assert.strictEqual(result, 'https://example.com/products');
    });

    it('should remove session parameters', () => {
      const url = 'https://example.com/contact?session=abc123&ref=email';
      const result = normalizeUrl(url);
      assert.strictEqual(result, 'https://example.com/contact');
    });

    it('should preserve content parameters', () => {
      const url = 'https://example.com/products?id=123&page=2';
      const result = normalizeUrl(url);
      assert.strictEqual(result, 'https://example.com/products?id=123&page=2');
    });

    it('should remove trailing slash (except root)', () => {
      const url1 = 'https://example.com/products/';
      const url2 = 'https://example.com/';

      assert.strictEqual(normalizeUrl(url1), 'https://example.com/products');
      assert.strictEqual(normalizeUrl(url2), 'https://example.com/');
    });

    it('should handle invalid URLs gracefully', () => {
      const url = 'not-a-valid-url';
      const result = normalizeUrl(url);
      assert.strictEqual(result, 'not-a-valid-url');
    });
  });
});
