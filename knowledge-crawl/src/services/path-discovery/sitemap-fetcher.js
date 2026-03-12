/**
 * Sitemap Fetcher Service
 * Fetches and parses sitemap.xml for path discovery
 *
 * Part of smart-path-discovery feature
 */

const { XMLParser } = require('fast-xml-parser');

/**
 * Default options for sitemap fetching
 */
const DEFAULT_OPTIONS = {
  timeout: 15000,
  maxDepth: 2,
  maxUrls: 5000
};

/**
 * Tracking parameters to remove from URLs
 */
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'session', 'sessid', 'sid', 'ref', 'referrer', 'source', 'fbclid', 'gclid'
];

/**
 * Parse sitemap XML content
 * @param {string} content - XML content
 * @returns {Object} Parsed result { type: 'urlset'|'sitemapindex'|'text', urls: [], sitemaps: [] }
 */
function parseSitemapXml(content) {
  const result = {
    type: null,
    urls: [],
    sitemaps: []
  };

  if (!content || !content.trim()) {
    return result;
  }

  // Check if it's a text sitemap (one URL per line)
  const trimmed = content.trim();
  if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<urlset') && !trimmed.startsWith('<sitemapindex')) {
    const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l);
    const urls = lines.filter(l => l.startsWith('http'));
    if (urls.length > 0 && urls.length === lines.length) {
      result.type = 'text';
      result.urls = urls.map(url => ({
        loc: url,
        priority: 0.5,
        source: 'sitemap'
      }));
      return result;
    }
  }

  // Parse XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: false,
    trimValues: true
  });

  try {
    const parsed = parser.parse(content);

    // Handle sitemap index
    if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
      result.type = 'sitemapindex';
      const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
        ? parsed.sitemapindex.sitemap
        : [parsed.sitemapindex.sitemap];

      result.sitemaps = sitemaps
        .map(s => s.loc || s['@_loc'] || s)
        .filter(loc => typeof loc === 'string');

      return result;
    }

    // Handle urlset
    if (parsed.urlset && parsed.urlset.url) {
      result.type = 'urlset';
      const urls = Array.isArray(parsed.urlset.url)
        ? parsed.urlset.url
        : [parsed.urlset.url];

      result.urls = urls.map(url => ({
        loc: url.loc || url['@_loc'] || url,
        priority: parseFloat(url.priority || url['@_priority'] || 0.5),
        lastmod: url.lastmod || url['@_lastmod'] || null,
        changefreq: url.changefreq || url['@_changefreq'] || null,
        source: 'sitemap'
      })).filter(u => typeof u.loc === 'string');

      return result;
    }

    return result;
  } catch (error) {
    // Regex fallback for malformed XML
    const locMatches = content.match(/<loc>([^<]+)<\/loc>/gi);
    if (locMatches) {
      result.type = 'urlset';
      result.urls = locMatches.map(match => {
        const loc = match.replace(/<\/?loc>/gi, '').trim();
        return {
          loc,
          priority: 0.5,
          source: 'sitemap'
        };
      });
    }
    return result;
  }
}

/**
 * Build sitemap URLs from domain and robots.txt sitemap declarations
 * @param {string} domain - Domain (e.g., 'example.com')
 * @param {string[]} sitemapsFromRobots - Sitemap URLs from robots.txt
 * @returns {string[]} List of sitemap URLs to try
 */
function buildSitemapUrls(domain, sitemapsFromRobots = []) {
  const urls = [];
  const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  // Priority 1: URLs from robots.txt
  if (sitemapsFromRobots && sitemapsFromRobots.length > 0) {
    urls.push(...sitemapsFromRobots);
  }

  // Priority 2: Default paths as fallback
  const defaultPaths = [
    `https://${normalizedDomain}/sitemap.xml`,
    `https://${normalizedDomain}/sitemap_index.xml`
  ];

  for (const defaultUrl of defaultPaths) {
    if (!urls.includes(defaultUrl)) {
      urls.push(defaultUrl);
    }
  }

  return urls;
}

/**
 * Fetch and parse a single sitemap URL
 * @param {string} url - Sitemap URL
 * @param {Object} options - Options { timeout, fetch }
 * @returns {Promise<Object>} Parsed result
 */
async function fetchAndParseSitemap(url, options = {}) {
  const { timeout = 15000, fetch: fetchFn } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const fetchImpl = fetchFn || fetch;
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeCrawler/1.0)'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        url
      };
    }

    const content = await response.text();
    const parsed = parseSitemapXml(content);

    return {
      success: true,
      ...parsed,
      url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url
    };
  }
}

/**
 * Fetch sitemap with recursive index handling
 * @param {string} domain - Domain to fetch sitemap for
 * @param {Object} options - Options { timeout, maxDepth, maxUrls, fetch, sitemapsFromRobots }
 * @returns {Promise<Object>} Result { success, urls, errors }
 */
async function fetchSitemap(domain, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result = {
    success: false,
    urls: [],
    errors: [],
    source: null
  };

  const sitemapUrls = buildSitemapUrls(domain, opts.sitemapsFromRobots || []);

  // Try each sitemap URL until one succeeds
  for (const sitemapUrl of sitemapUrls) {
    const fetchResult = await fetchAndParseSitemapRecursively(sitemapUrl, opts, 0);

    if (fetchResult.success && fetchResult.urls.length > 0) {
      result.success = true;
      result.urls = fetchResult.urls.slice(0, opts.maxUrls);
      result.source = sitemapUrl;

      if (fetchResult.errors.length > 0) {
        result.errors = fetchResult.errors;
      }

      break;
    } else if (fetchResult.errors.length > 0) {
      result.errors.push(...fetchResult.errors);
    }
  }

  // Normalize URLs
  result.urls = result.urls.map(urlEntry => ({
    ...urlEntry,
    loc: normalizeUrl(urlEntry.loc)
  }));

  return result;
}

/**
 * Recursively fetch sitemap with depth limit
 * @param {string} url - Sitemap URL
 * @param {Object} options - Options
 * @param {number} depth - Current depth
 * @returns {Promise<Object>} Result
 */
async function fetchAndParseSitemapRecursively(url, options, depth) {
  const result = {
    success: false,
    urls: [],
    errors: []
  };

  if (depth > options.maxDepth) {
    result.errors.push({
      url,
      error: `Max depth (${options.maxDepth}) exceeded`
    });
    return result;
  }

  const fetchResult = await fetchAndParseSitemap(url, options);

  if (!fetchResult.success) {
    result.errors.push({
      url,
      error: fetchResult.error
    });
    return result;
  }

  // If it's a sitemap index, recursively fetch child sitemaps
  if (fetchResult.type === 'sitemapindex' && fetchResult.sitemaps.length > 0) {
    const childResults = await Promise.all(
      fetchResult.sitemaps.map(childUrl =>
        fetchAndParseSitemapRecursively(childUrl, options, depth + 1)
      )
    );

    for (const childResult of childResults) {
      if (childResult.success) {
        result.urls.push(...childResult.urls);
      }
      result.errors.push(...childResult.errors);
    }

    result.success = result.urls.length > 0;
  } else if (fetchResult.type === 'urlset' || fetchResult.type === 'text') {
    result.success = true;
    result.urls = fetchResult.urls;
  }

  return result;
}

/**
 * Normalize URL (remove tracking params, ensure consistent format)
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);

    // Remove tracking parameters
    const newParams = new URLSearchParams();
    for (const [key, value] of parsed.searchParams) {
      if (!TRACKING_PARAMS.includes(key.toLowerCase())) {
        newParams.append(key, value);
      }
    }

    // Rebuild URL
    let normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    const searchString = newParams.toString();
    if (searchString) {
      normalized += `?${searchString}`;
    }

    // Remove trailing slash for consistency (except root)
    if (normalized.endsWith('/') && parsed.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    return url;
  }
}

module.exports = {
  fetchSitemap,
  parseSitemapXml,
  buildSitemapUrls,
  fetchAndParseSitemap,
  normalizeUrl,
  DEFAULT_OPTIONS,
  TRACKING_PARAMS
};
