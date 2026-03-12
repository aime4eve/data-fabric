/**
 * Path Filter Service
 * Classifies, scores, and filters URLs based on page type and relevance
 *
 * Part of smart-path-discovery feature
 */

const { getDynamicUrlWeight, calculateKeywordScore } = require('./url-normalizer');

/**
 * Page type definitions with patterns, weights, and quotas
 */
const PAGE_TYPES = {
  HOME: {
    patterns: [/^\/$/, /^\/index(\.html?)?$/, /^\/home\/?$/],
    weight: 1.0,
    minQuota: 1,
    maxQuota: 1
  },
  CONTACT: {
    patterns: [/\/contact(-us)?\/?$/, /\/get-in-touch\/?$/, /\/reach-us\/?$/],
    weight: 0.95,
    minQuota: 1,
    maxQuota: 2
  },
  ABOUT: {
    patterns: [/\/about(-us)?\/?$/, /\/company\/?$/, /\/who-we-are\/?$/, /\/our-story\/?$/],
    weight: 0.9,
    minQuota: 1,
    maxQuota: 2
  },
  PRODUCTS_LIST: {
    patterns: [/\/products?\/?$/, /\/catalog\/?$/, /\/shop\/?$/, /\/store\/?$/],
    weight: 0.85,
    minQuota: 1,
    maxQuota: 2
  },
  PRODUCT_DETAIL: {
    patterns: [/\/products?\/[^/]+$/, /\/item\/[^/]+$/, /\/p\/[^/]+$/],
    weight: 0.7,
    minQuota: 0,
    maxQuota: 5
  },
  SOLUTIONS: {
    patterns: [/\/solutions?\/?$/, /\/services\/?$/, /\/industries\/?$/, /\/applications\/?$/],
    weight: 0.8,
    minQuota: 0,
    maxQuota: 2
  },
  DOWNLOADS: {
    patterns: [/\/downloads?\/?$/, /\/resources\/?$/, /\/documents\/?$/],
    weight: 0.6,
    minQuota: 0,
    maxQuota: 2
  },
  NEWS_BLOG: {
    patterns: [/\/(news|blog|articles)\/?$/, /\/(news|blog)\/[^/]+$/],
    weight: 0.3,
    minQuota: 0,
    maxQuota: 2
  },
  OTHER: {
    patterns: [],
    weight: 0.4,
    minQuota: 0,
    maxQuota: 5
  }
};

/**
 * Scoring weights for final score calculation
 */
const SCORING_WEIGHTS = {
  typeWeight: 0.35,
  relevanceWeight: 0.30,
  sitemapPriorityWeight: 0.20,
  depthWeight: 0.15
};

/**
 * Default options for filtering
 */
const DEFAULT_FILTER_OPTIONS = {
  maxTotal: 15,
  preferEnglish: true
};

/**
 * Classify a URL into a page type
 * @param {string} url - URL to classify
 * @returns {{ type: string, weight: number }} Page type and weight
 */
function classifyUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    for (const [type, config] of Object.entries(PAGE_TYPES)) {
      if (type === 'OTHER') continue;

      for (const pattern of config.patterns) {
        if (pattern.test(path)) {
          return { type, weight: config.weight };
        }
      }
    }

    return { type: 'OTHER', weight: PAGE_TYPES.OTHER.weight };
  } catch {
    return { type: 'OTHER', weight: PAGE_TYPES.OTHER.weight };
  }
}

/**
 * Calculate relevance score based on keyword matching
 * @param {string} url - URL to score
 * @param {string[]} keywords - Keywords to match
 * @returns {number} Score (0-1)
 */
function calculateRelevance(url, keywords = []) {
  return calculateKeywordScore(url, keywords);
}

/**
 * Calculate depth factor (penalty for deep URLs)
 * @param {string} url - URL to analyze
 * @returns {number} Depth factor (0-1, lower = deeper)
 */
function calculateDepthFactor(url) {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const depth = pathParts.length;

    // Depth 0 (root) = 1.0, Depth 1 = 0.9, Depth 2 = 0.67, etc.
    // Formula: 1 / (1 + depth * 0.5)
    return 1 / (1 + depth * 0.5);
  } catch {
    return 0.5;
  }
}

/**
 * Check if URL is in English (preferred language)
 * @param {string} url - URL to check
 * @returns {boolean} True if English or neutral
 */
function isEnglishUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    // Common non-English path prefixes
    const nonEnglishPatterns = [
      /^\/(zh|cn|zh-cn|zh-tw|de|fr|es|pt|ru|ja|ko|ar|it|nl|pl)\//i
    ];

    for (const pattern of nonEnglishPatterns) {
      if (pattern.test(path)) {
        return false;
      }
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * Calculate final score combining all factors
 * @param {string} url - URL to score
 * @param {string[]} keywords - Keywords for relevance
 * @param {number} sitemapPriority - Priority from sitemap (0-1)
 * @returns {Object} Score breakdown { finalScore, typeWeight, relevance, depth, dynamic }
 */
function calculateFinalScore(url, keywords = [], sitemapPriority = 0.5) {
  const { type, weight: typeWeight } = classifyUrl(url);
  const relevance = calculateRelevance(url, keywords);
  const depthFactor = calculateDepthFactor(url);
  const dynamicWeight = getDynamicUrlWeight(url);

  const finalScore =
    SCORING_WEIGHTS.typeWeight * typeWeight +
    SCORING_WEIGHTS.relevanceWeight * relevance +
    SCORING_WEIGHTS.sitemapPriorityWeight * sitemapPriority +
    SCORING_WEIGHTS.depthWeight * depthFactor;

  // Apply dynamic URL penalty
  const adjustedScore = finalScore * dynamicWeight;

  // Apply English preference
  const englishBonus = isEnglishUrl(url) ? 1.0 : 0.9;
  const finalAdjustedScore = adjustedScore * englishBonus;

  return {
    finalScore: finalAdjustedScore,
    typeWeight,
    relevance,
    depthFactor,
    dynamicWeight,
    englishBonus,
    type
  };
}

/**
 * Filter and select URLs based on scoring and quotas
 * @param {Array<{ loc: string, priority?: number }>} urls - URLs with optional sitemap priority
 * @param {string[]} keywords - Keywords for relevance scoring
 * @param {Object} options - Filter options
 * @returns {Array<{ url: string, score: number, type: string }>}
 */
function filterUrls(urls, keywords = [], options = {}) {
  const opts = { ...DEFAULT_FILTER_OPTIONS, ...options };
  const { maxTotal } = opts;

  if (!urls || urls.length === 0) {
    return [];
  }

  // Score all URLs
  const scoredUrls = urls.map(urlEntry => {
    const url = typeof urlEntry === 'string' ? urlEntry : urlEntry.loc;
    const sitemapPriority = typeof urlEntry === 'object' ? (urlEntry.priority || 0.5) : 0.5;

    const scoreInfo = calculateFinalScore(url, keywords, sitemapPriority);

    return {
      url,
      ...scoreInfo,
      sitemapPriority
    };
  });

  // Group by page type
  const byType = {};
  for (const scored of scoredUrls) {
    if (!byType[scored.type]) {
      byType[scored.type] = [];
    }
    byType[scored.type].push(scored);
  }

  // Sort each type by score
  for (const type of Object.keys(byType)) {
    byType[type].sort((a, b) => b.finalScore - a.finalScore);
  }

  // Apply quotas
  const result = [];
  const quotaUsed = {};

  // First pass: ensure minimum quotas
  for (const [type, config] of Object.entries(PAGE_TYPES)) {
    if (config.minQuota > 0 && byType[type] && byType[type].length > 0) {
      const selected = byType[type].slice(0, config.minQuota);
      for (const item of selected) {
        result.push({
          url: item.url,
          score: item.finalScore,
          type: item.type
        });
        quotaUsed[type] = (quotaUsed[type] || 0) + 1;
      }
    }
  }

  // Second pass: fill remaining slots up to max quotas
  const allSorted = [...scoredUrls].sort((a, b) => b.finalScore - a.finalScore);

  for (const item of allSorted) {
    if (result.length >= maxTotal) break;

    // Skip if already added
    if (result.some(r => r.url === item.url)) continue;

    const config = PAGE_TYPES[item.type];
    const currentQuota = quotaUsed[item.type] || 0;

    if (currentQuota < config.maxQuota) {
      result.push({
        url: item.url,
        score: item.finalScore,
        type: item.type
      });
      quotaUsed[item.type] = currentQuota + 1;
    }
  }

  // Sort final result by score
  result.sort((a, b) => b.score - a.score);

  return result.slice(0, maxTotal);
}

/**
 * Deduplicate URLs by normalized path
 * @param {Array<{ url: string }>} urls - URLs to deduplicate
 * @returns {Array<{ url: string }>}
 */
function deduplicateUrls(urls) {
  const seen = new Set();
  const result = [];

  for (const urlEntry of urls) {
    const url = typeof urlEntry === 'string' ? urlEntry : urlEntry.loc;

    try {
      const parsed = new URL(url);
      // Normalize: remove trailing slash, lowercase
      let normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`.toLowerCase();
      if (normalized.endsWith('/') && parsed.pathname !== '/') {
        normalized = normalized.slice(0, -1);
      }

      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(urlEntry);
      }
    } catch {
      // Keep invalid URLs as-is
      if (!seen.has(url)) {
        seen.add(url);
        result.push(urlEntry);
      }
    }
  }

  return result;
}

module.exports = {
  PAGE_TYPES,
  SCORING_WEIGHTS,
  DEFAULT_FILTER_OPTIONS,
  classifyUrl,
  calculateRelevance,
  calculateDepthFactor,
  calculateFinalScore,
  filterUrls,
  deduplicateUrls,
  isEnglishUrl
};
