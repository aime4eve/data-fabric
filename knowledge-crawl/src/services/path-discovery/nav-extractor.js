/**
 * Navigation Extractor Service
 * Extracts navigation links from homepage when sitemap is unavailable
 *
 * Part of smart-path-discovery feature
 */

const { classifyUrl } = require('./path-filter');

/**
 * Default options for navigation extraction
 */
const DEFAULT_OPTIONS = {
  maxLinks: 15,
  timeout: 10000
};

/**
 * High-value keywords for navigation scoring
 */
const HIGH_VALUE_KEYWORDS = [
  'product', 'products', 'catalog', 'shop', 'store',
  'contact', 'about', 'company', 'who-we-are',
  'solution', 'solutions', 'service', 'services',
  'download', 'downloads', 'resource', 'resources'
];

/**
 * File extensions to exclude
 */
const EXCLUDED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.tar', '.gz',
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
  '.mp3', '.mp4', '.avi', '.mov'
];

/**
 * Check if a link is a valid internal navigation link
 * @param {string} href - Link href
 * @param {string} domain - Domain to check against
 * @returns {boolean} True if valid internal link
 */
function isValidInternalLink(href, domain) {
  if (!href || typeof href !== 'string') {
    return false;
  }

  // Skip anchor links
  if (href.startsWith('#')) {
    return false;
  }

  // Skip mailto and tel links
  if (href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }

  // Skip javascript links
  if (href.startsWith('javascript:')) {
    return false;
  }

  // Skip file downloads
  const lowerHref = href.toLowerCase();
  for (const ext of EXCLUDED_EXTENSIONS) {
    if (lowerHref.endsWith(ext)) {
      return false;
    }
  }

  // Check if it's an external link
  try {
    // Relative links are internal
    if (href.startsWith('/') || href.startsWith('./') || !href.includes('://')) {
      return true;
    }

    // Check domain for absolute URLs
    const parsed = new URL(href);
    const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    return parsed.hostname === normalizedDomain ||
           parsed.hostname.endsWith(`.${normalizedDomain}`);
  } catch {
    return false;
  }
}

/**
 * Calculate navigation-specific relevance score
 * @param {Object} link - Link object with href and text
 * @param {string[]} keywords - Search keywords
 * @returns {number} Score (0-1)
 */
function calculateNavRelevance(link, keywords = []) {
  let score = 0;

  const hrefLower = (link.href || '').toLowerCase();
  const textLower = (link.text || '').toLowerCase();

  // Score based on high-value keywords in URL
  for (const keyword of HIGH_VALUE_KEYWORDS) {
    if (hrefLower.includes(keyword)) {
      score += 0.15;
    }
    if (textLower.includes(keyword)) {
      score += 0.1;
    }
  }

  // Score based on search keywords
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    if (hrefLower.includes(keywordLower)) {
      score += 0.2;
    }
    if (textLower.includes(keywordLower)) {
      score += 0.15;
    }
  }

  // Bonus for short, clean URLs (likely important pages)
  if (hrefLower.split('/').filter(Boolean).length <= 2) {
    score += 0.1;
  }

  return Math.min(score, 1);
}

/**
 * Normalize href to absolute URL
 * @param {string} href - Link href
 * @param {string} baseUrl - Base URL for resolution
 * @returns {string} Normalized URL
 */
function normalizeHref(href, baseUrl) {
  try {
    const base = new URL(baseUrl);
    const resolved = new URL(href, base);
    return resolved.href;
  } catch {
    return href;
  }
}

/**
 * Extract navigation links from a page using Playwright
 * @param {import('playwright').Page} page - Playwright page object
 * @param {string} domain - Domain being processed
 * @param {Object} options - Options { maxLinks, keywords }
 * @returns {Promise<{ success: boolean, urls: string[], error?: string }>}
 */
async function extractNavLinks(page, domain, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result = {
    success: false,
    urls: [],
    error: null
  };

  try {
    const baseUrl = `https://${domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}`;

    // Extract links from navigation elements
    const links = await page.evaluate(() => {
      const extractedLinks = [];

      // Helper to extract links from elements
      const extractFromElements = (selector, priority) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const links = el.querySelectorAll('a[href]');
          links.forEach(a => {
            extractedLinks.push({
              href: a.getAttribute('href'),
              text: a.textContent?.trim() || '',
              priority
            });
          });
        });
      };

      // Extract from nav elements (highest priority)
      extractFromElements('nav', 1);

      // Extract from header
      extractFromElements('header', 2);

      // Extract from menu elements
      extractFromElements('[role="navigation"], [role="menu"], .menu, .nav, .navigation', 2);

      // Extract from footer (lower priority, but good for contact/about)
      extractFromElements('footer', 3);

      return extractedLinks;
    });

    // Filter and score links
    const validLinks = links.filter(link =>
      isValidInternalLink(link.href, domain)
    );

    // Remove duplicates
    const seenHrefs = new Set();
    const uniqueLinks = validLinks.filter(link => {
      const normalized = normalizeHref(link.href, baseUrl);
      if (seenHrefs.has(normalized)) {
        return false;
      }
      seenHrefs.add(normalized);
      return true;
    });

    // Score and sort links
    const scoredLinks = uniqueLinks.map(link => {
      const normalizedUrl = normalizeHref(link.href, baseUrl);
      const relevanceScore = calculateNavRelevance(link, opts.keywords);
      const { type, weight } = classifyUrl(normalizedUrl);

      // Priority bonus (nav > header > footer)
      const priorityBonus = (4 - link.priority) * 0.1;

      return {
        url: normalizedUrl,
        score: relevanceScore + weight * 0.3 + priorityBonus,
        type,
        text: link.text
      };
    });

    // Sort by score
    scoredLinks.sort((a, b) => b.score - a.score);

    // Ensure minimum coverage of key page types
    const typeCoverage = new Set();
    const selectedUrls = [];

    // First pass: select top links ensuring type diversity
    for (const link of scoredLinks) {
      if (selectedUrls.length >= opts.maxLinks) break;

      // Always include if it's a key type or high score
      const isKeyType = ['HOME', 'CONTACT', 'ABOUT', 'PRODUCTS_LIST'].includes(link.type);
      const notYetCovered = !typeCoverage.has(link.type);

      if (isKeyType || notYetCovered || link.score > 0.5) {
        selectedUrls.push({
          loc: link.url,
          priority: link.score,
          source: 'navigation',
          type: link.type
        });
        typeCoverage.add(link.type);
      }
    }

    // Second pass: fill remaining slots
    for (const link of scoredLinks) {
      if (selectedUrls.length >= opts.maxLinks) break;

      if (!selectedUrls.some(u => u.loc === link.url)) {
        selectedUrls.push({
          loc: link.url,
          priority: link.score,
          source: 'navigation',
          type: link.type
        });
      }
    }

    result.success = selectedUrls.length > 0;
    result.urls = selectedUrls;

    if (!result.success) {
      result.error = 'No valid navigation links found';
    }

    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Extract navigation links from HTML content (for testing)
 * @param {string} html - HTML content
 * @param {string} domain - Domain being processed
 * @param {Object} options - Options
 * @returns {{ success: boolean, urls: Array<{ loc: string, priority: number }>, error?: string }}
 */
function extractNavLinksFromHtml(html, domain, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result = {
    success: false,
    urls: [],
    error: null
  };

  if (!html || typeof html !== 'string') {
    result.error = 'Invalid HTML content';
    return result;
  }

  try {
    const baseUrl = `https://${domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}`;

    // Simple regex-based link extraction
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    const links = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      links.push({
        href: match[1],
        text: match[2].trim(),
        priority: 2
      });
    }

    // Check for nav/header/footer context
    const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
    const headerMatch = html.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
    const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);

    // Re-extract with context
    if (navMatch) {
      const navLinks = navMatch[1].match(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi) || [];
      navLinks.forEach(linkHtml => {
        const hrefMatch = linkHtml.match(/href=["']([^"']+)["']/);
        const textMatch = linkHtml.match(/>([^<]*)<\/a>/);
        if (hrefMatch) {
          const existing = links.find(l => l.href === hrefMatch[1]);
          if (existing) existing.priority = 1;
        }
      });
    }

    // Filter and score links
    const validLinks = links.filter(link =>
      isValidInternalLink(link.href, domain)
    );

    // Remove duplicates
    const seenHrefs = new Set();
    const uniqueLinks = validLinks.filter(link => {
      if (seenHrefs.has(link.href)) {
        return false;
      }
      seenHrefs.add(link.href);
      return true;
    });

    // Score and sort
    const scoredLinks = uniqueLinks.map(link => {
      const normalizedUrl = normalizeHref(link.href, baseUrl);
      const relevanceScore = calculateNavRelevance(link, opts.keywords);
      const { type, weight } = classifyUrl(normalizedUrl);
      const priorityBonus = (4 - link.priority) * 0.1;

      return {
        url: normalizedUrl,
        score: relevanceScore + weight * 0.3 + priorityBonus,
        type
      };
    });

    scoredLinks.sort((a, b) => b.score - a.score);

    // Select top links
    const selectedUrls = scoredLinks.slice(0, opts.maxLinks).map(link => ({
      loc: link.url,
      priority: link.score,
      source: 'navigation'
    }));

    result.success = selectedUrls.length > 0;
    result.urls = selectedUrls;

    if (!result.success) {
      result.error = 'No valid navigation links found';
    }

    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

module.exports = {
  extractNavLinks,
  extractNavLinksFromHtml,
  isValidInternalLink,
  calculateNavRelevance,
  normalizeHref,
  DEFAULT_OPTIONS,
  HIGH_VALUE_KEYWORDS,
  EXCLUDED_EXTENSIONS
};
