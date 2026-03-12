/**
 * Tests for nav-extractor.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isValidInternalLink,
  calculateNavRelevance,
  extractNavLinksFromHtml,
  normalizeHref
} = require('../../src/services/path-discovery/nav-extractor');

describe('nav-extractor', () => {
  describe('isValidInternalLink', () => {
    it('should accept relative links', () => {
      assert.strictEqual(isValidInternalLink('/products', 'example.com'), true);
      assert.strictEqual(isValidInternalLink('./about', 'example.com'), true);
      assert.strictEqual(isValidInternalLink('contact', 'example.com'), true);
    });

    it('should exclude external links', () => {
      assert.strictEqual(isValidInternalLink('https://facebook.com/company', 'example.com'), false);
      assert.strictEqual(isValidInternalLink('http://external.com/page', 'example.com'), false);
    });

    it('should exclude anchor links', () => {
      assert.strictEqual(isValidInternalLink('#section', 'example.com'), false);
      assert.strictEqual(isValidInternalLink('#top', 'example.com'), false);
    });

    it('should exclude file downloads', () => {
      assert.strictEqual(isValidInternalLink('/brochure.pdf', 'example.com'), false);
      assert.strictEqual(isValidInternalLink('/document.docx', 'example.com'), false);
      assert.strictEqual(isValidInternalLink('/image.png', 'example.com'), false);
    });

    it('should exclude mailto and tel links', () => {
      assert.strictEqual(isValidInternalLink('mailto:info@example.com', 'example.com'), false);
      assert.strictEqual(isValidInternalLink('tel:+1234567890', 'example.com'), false);
    });

    it('should exclude javascript links', () => {
      assert.strictEqual(isValidInternalLink('javascript:void(0)', 'example.com'), false);
    });

    it('should accept subdomain links of same domain', () => {
      assert.strictEqual(isValidInternalLink('https://blog.example.com/post', 'example.com'), true);
      assert.strictEqual(isValidInternalLink('https://shop.example.com', 'example.com'), true);
    });
  });

  describe('calculateNavRelevance', () => {
    it('should score high-value keyword in URL', () => {
      const score = calculateNavRelevance(
        { href: '/products/smart-valve', text: 'Smart Valve' },
        []
      );
      assert.ok(score > 0);
    });

    it('should score high-value keyword in link text', () => {
      const score = calculateNavRelevance(
        { href: '/page', text: 'Contact Sales Team' },
        []
      );
      assert.ok(score > 0);
    });

    it('should score search keyword match', () => {
      const score = calculateNavRelevance(
        { href: '/products/lorawan-controller', text: 'LoRaWAN Controller' },
        ['lorawan', 'solenoid']
      );
      assert.ok(score > 0);
    });

    it('should return low score for no matches', () => {
      const score = calculateNavRelevance(
        { href: '/xyz-abc', text: 'XYZ ABC' },
        ['solenoid']
      );
      // No keyword matches, but may have high-value keyword bonus
      assert.ok(score < 0.5);
    });
  });

  describe('normalizeHref', () => {
    it('should normalize relative URLs', () => {
      const result = normalizeHref('/products', 'https://example.com');
      assert.strictEqual(result, 'https://example.com/products');
    });

    it('should handle already absolute URLs', () => {
      const result = normalizeHref('https://example.com/about', 'https://example.com');
      assert.strictEqual(result, 'https://example.com/about');
    });

    it('should handle relative URLs without leading slash', () => {
      // Relative URLs should be resolved against base URL
      const result = normalizeHref('page.html', 'https://example.com');
      assert.ok(result.includes('example.com'));
    });
  });

  describe('extractNavLinksFromHtml', () => {
    it('should extract links from nav element', () => {
      const html = `
        <html>
          <body>
            <nav>
              <a href="/products">Products</a>
              <a href="/contact">Contact</a>
              <a href="/about">About</a>
            </nav>
          </body>
        </html>
      `;

      const result = extractNavLinksFromHtml(html, 'example.com');

      assert.strictEqual(result.success, true);
      assert.ok(result.urls.length >= 2);
      assert.ok(result.urls.some(u => u.loc.includes('/products')));
    });

    it('should extract links from header element', () => {
      const html = `
        <html>
          <body>
            <header>
              <a href="/products">Products</a>
              <a href="/contact">Contact</a>
            </header>
          </body>
        </html>
      `;

      const result = extractNavLinksFromHtml(html, 'example.com');

      assert.strictEqual(result.success, true);
      assert.ok(result.urls.length >= 1);
    });

    it('should extract links from footer', () => {
      const html = `
        <html>
          <body>
            <footer>
              <a href="/about">About Us</a>
              <a href="/privacy">Privacy Policy</a>
            </footer>
          </body>
        </html>
      `;

      const result = extractNavLinksFromHtml(html, 'example.com');

      assert.strictEqual(result.success, true);
    });

    it('should filter external links', () => {
      const html = `
        <html>
          <body>
            <nav>
              <a href="/products">Products</a>
              <a href="https://facebook.com/company">Facebook</a>
              <a href="/contact">Contact</a>
            </nav>
          </body>
        </html>
      `;

      const result = extractNavLinksFromHtml(html, 'example.com');

      assert.strictEqual(result.success, true);
      assert.ok(!result.urls.some(u => u.loc.includes('facebook.com')));
    });

    it('should filter file downloads', () => {
      const html = `
        <html>
          <body>
            <nav>
              <a href="/products">Products</a>
              <a href="/brochure.pdf">Download Brochure</a>
            </nav>
          </body>
        </html>
      `;

      const result = extractNavLinksFromHtml(html, 'example.com');

      assert.strictEqual(result.success, true);
      assert.ok(!result.urls.some(u => u.loc.endsWith('.pdf')));
    });

    it('should respect maxLinks limit', () => {
      const links = Array(50).fill(0).map((_, i) =>
        `<a href="/page${i}">Page ${i}</a>`
      ).join('\n');

      const html = `<html><body><nav>${links}</nav></body></html>`;

      const result = extractNavLinksFromHtml(html, 'example.com', { maxLinks: 10 });

      assert.ok(result.urls.length <= 10);
    });

    it('should return failure when no valid links found', () => {
      const html = `
        <html>
          <body>
            <nav>
              <a href="https://facebook.com">Facebook</a>
              <a href="mailto:info@example.com">Email</a>
            </nav>
          </body>
        </html>
      `;

      const result = extractNavLinksFromHtml(html, 'example.com');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.urls.length, 0);
    });

    it('should handle empty HTML', () => {
      const result = extractNavLinksFromHtml('', 'example.com');

      assert.strictEqual(result.success, false);
    });
  });
});
