/**
 * Path Discovery Service
 * Main orchestrator for discovering paths from sitemap or navigation
 *
 * Part of smart-path-discovery feature
 *
 * Fallback chain: sitemap → navigation → skip domain
 */

const { fetchSitemap } = require('./sitemap-fetcher');
const { processUrls } = require('./url-normalizer');
const { filterUrls, deduplicateUrls } = require('./path-filter');
const { extractNavLinks } = require('./nav-extractor');

/**
 * Default options for path discovery
 */
const DEFAULT_OPTIONS = {
  maxPaths: 15,
  timeout: 15000,
  skipOnFailure: false,
  logger: null
};

/**
 * Create a logger instance
 * @param {Object|null} logger - Logger instance or null
 * @returns {Object} Logger with info, warn, error methods
 */
function createLogger(logger) {
  if (logger && typeof logger.info === 'function') {
    return logger;
  }

  return {
    info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
  };
}

/**
 * Discover paths for a domain
 * @param {string} domain - Domain to discover paths for
 * @param {Object} options - Discovery options
 * @param {string[]} options.keywords - Search keywords for relevance scoring
 * @param {string[]} options.sitemapsFromRobots - Sitemap URLs from robots.txt
 * @param {import('playwright').Page} options.page - Playwright page for navigation extraction
 * @param {number} options.maxPaths - Maximum paths to return (default: 15)
 * @param {number} options.timeout - Timeout in ms (default: 15000)
 * @param {boolean} options.skipOnFailure - Skip domain on failure (default: false)
 * @param {Object} options.logger - Logger instance
 * @returns {Promise<{ success: boolean, paths: string[], source: string, error?: string }>}
 */
async function discoverPaths(domain, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const log = createLogger(opts.logger);

  const result = {
    success: false,
    paths: [],
    source: null,
    error: null
  };

  log.info(`Discovering paths for domain: ${domain}`);

  // Step 1: Try sitemap discovery
  const sitemapResult = await trySitemapDiscovery(domain, opts, log);

  if (sitemapResult.success && sitemapResult.urls.length > 0) {
    const processedPaths = processAndFilterUrls(sitemapResult.urls, opts);

    result.success = true;
    result.paths = processedPaths;
    result.source = 'sitemap';

    log.info(`Discovered ${result.paths.length} paths from sitemap for ${domain}`);
    return result;
  }

  log.info(`Sitemap discovery failed for ${domain}, trying navigation extraction`);

  // Step 2: Try navigation extraction
  if (opts.page) {
    const navResult = await tryNavigationExtraction(domain, opts, log);

    if (navResult.success && navResult.urls.length > 0) {
      const processedPaths = processAndFilterUrls(navResult.urls, opts);

      result.success = true;
      result.paths = processedPaths;
      result.source = 'navigation';

      log.info(`Discovered ${result.paths.length} paths from navigation for ${domain}`);
      return result;
    }
  }

  // Step 3: Both methods failed
  result.error = 'Path discovery failed: no sitemap and no navigation available';
  log.warn(`Path discovery failed for ${domain}: ${result.error}`);

  if (opts.skipOnFailure) {
    return result;
  }

  // Return empty paths but don't mark as success
  return result;
}

/**
 * Try sitemap-based path discovery
 * @param {string} domain - Domain
 * @param {Object} options - Options
 * @param {Object} log - Logger
 * @returns {Promise<{ success: boolean, urls: Array }>}
 */
async function trySitemapDiscovery(domain, options, log) {
  try {
    const sitemapResult = await fetchSitemap(domain, {
      timeout: options.timeout,
      sitemapsFromRobots: options.sitemapsFromRobots
    });

    if (sitemapResult.success && sitemapResult.urls.length > 0) {
      return {
        success: true,
        urls: sitemapResult.urls.map(urlEntry => ({
          loc: urlEntry.loc,
          priority: urlEntry.priority || 0.5,
          source: 'sitemap'
        }))
      };
    }

    return {
      success: false,
      urls: [],
      error: sitemapResult.errors.map(e => e.error).join('; ')
    };
  } catch (error) {
    log.warn(`Sitemap fetch error for ${domain}: ${error.message}`);
    return {
      success: false,
      urls: [],
      error: error.message
    };
  }
}

/**
 * Try navigation-based path extraction
 * @param {string} domain - Domain
 * @param {Object} options - Options
 * @param {Object} log - Logger
 * @returns {Promise<{ success: boolean, urls: Array }>}
 */
async function tryNavigationExtraction(domain, options, log) {
  try {
    const navResult = await extractNavLinks(options.page, domain, {
      maxLinks: options.maxPaths * 2, // Get more for filtering
      keywords: options.keywords,
      timeout: options.timeout
    });

    if (navResult.success && navResult.urls.length > 0) {
      return {
        success: true,
        urls: navResult.urls
      };
    }

    return {
      success: false,
      urls: [],
      error: navResult.error
    };
  } catch (error) {
    log.warn(`Navigation extraction error for ${domain}: ${error.message}`);
    return {
      success: false,
      urls: [],
      error: error.message
    };
  }
}

/**
 * Process and filter URLs to get final path list
 * @param {Array} urls - URLs with metadata
 * @param {Object} options - Options
 * @returns {string[]} Processed paths
 */
function processAndFilterUrls(urls, options) {
  // Deduplicate
  const deduplicated = deduplicateUrls(urls);

  // Filter and score
  const filtered = filterUrls(deduplicated, options.keywords || [], {
    maxTotal: options.maxPaths
  });

  // Extract just the URLs
  return filtered.map(item => item.url);
}

/**
 * Batch discover paths for multiple domains
 * @param {string[]} domains - Domains to process
 * @param {Object} options - Options (same as discoverPaths)
 * @returns {Promise<Map<string, { success: boolean, paths: string[], source: string }>>}
 */
async function discoverPathsBatch(domains, options = {}) {
  const results = new Map();

  for (const domain of domains) {
    const result = await discoverPaths(domain, options);
    results.set(domain, result);
  }

  return results;
}

// Re-export sub-modules for direct access
module.exports = {
  discoverPaths,
  discoverPathsBatch,
  // Re-export sub-modules
  fetchSitemap,
  processUrls,
  filterUrls,
  deduplicateUrls,
  extractNavLinks,
  // Constants
  DEFAULT_OPTIONS
};
