/**
 * URL Normalizer Service
 * Cleans, groups, and selects representative URLs from dynamic patterns
 *
 * Part of smart-path-discovery feature
 */

/**
 * Tracking parameters to remove from URLs
 */
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'session', 'sessid', 'sid', 'ref', 'referrer', 'source', 'fbclid', 'gclid',
  'msclkid', 'mc_eid', '_ga', 'gclsrc', 'gad_source'
]);

/**
 * Pagination parameter names
 */
const PAGINATION_PARAMS = new Set(['page', 'p', 'pg', 'pagenum', 'pageno', 'offset', 'start']);

/**
 * ID parameter names
 */
const ID_PARAMS = new Set(['id', 'item_id', 'product_id', 'pid', 'sku', 'code']);

/**
 * Remove tracking parameters from URL
 * @param {string} url - URL to clean
 * @returns {string} Cleaned URL
 */
function removeTrackingParams(url) {
  try {
    const parsed = new URL(url);
    const newParams = new URLSearchParams();

    for (const [key, value] of parsed.searchParams) {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        newParams.append(key, value);
      }
    }

    // Rebuild URL
    let cleaned = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    const searchString = newParams.toString();
    if (searchString) {
      cleaned += `?${searchString}`;
    }

    return cleaned;
  } catch {
    return url;
  }
}

/**
 * Generate a pattern signature for a URL
 * @param {string} url - URL to analyze
 * @returns {Object} Pattern info { basePath, pattern, type, params }
 */
function generatePattern(url) {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    // Check for query parameters
    const params = {};
    const dynamicParams = {};

    for (const [key, value] of parsed.searchParams) {
      params[key] = value;

      // Check for pagination
      if (PAGINATION_PARAMS.has(key.toLowerCase())) {
        dynamicParams[key] = { type: 'pagination', value };
      }
      // Check for ID
      else if (ID_PARAMS.has(key.toLowerCase())) {
        dynamicParams[key] = { type: 'id', value };
      }
    }

    // Check for RESTful patterns in path
    let pathType = 'static';
    const pathPattern = [];
    const numericSegments = [];

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];

      // Check if it's a numeric ID
      if (/^\d+$/.test(part)) {
        pathPattern.push('{id}');
        pathType = 'restful_numeric';
        numericSegments.push(i);
      }
      // Check if it looks like a slug (lowercase with hyphens, not common keywords)
      else if (/^[a-z][a-z0-9-]*[a-z0-9]$/.test(part) &&
               !['products', 'product', 'catalog', 'category', 'page', 'item',
                 'about', 'contact', 'home', 'news', 'blog', 'services',
                 'solutions', 'download', 'downloads', 'company'].includes(part)) {
        // Potential semantic slug
        if (pathType === 'static') {
          pathType = 'restful_semantic';
        }
        pathPattern.push('{slug}');
      } else {
        pathPattern.push(part);
      }
    }

    // Determine final type based on params and path
    let finalType = pathType;
    const dynamicParamTypes = Object.values(dynamicParams).map(p => p.type);

    if (dynamicParamTypes.includes('pagination')) {
      finalType = 'pagination';
    } else if (dynamicParamTypes.includes('id')) {
      finalType = 'id_param';
    }

    // Generate pattern string
    let patternStr = parsed.pathname;
    if (Object.keys(dynamicParams).length > 0) {
      const newParams = new URLSearchParams();
      for (const [key, value] of parsed.searchParams) {
        if (dynamicParams[key]) {
          newParams.append(key, '*');
        } else {
          newParams.append(key, value);
        }
      }
      patternStr += `?${newParams.toString()}`;
    }

    return {
      basePath: parsed.pathname,
      pattern: patternStr,
      type: finalType,
      params,
      dynamicParams,
      pathPattern: pathPattern.join('/'),
      numericSegments
    };
  } catch {
    return {
      basePath: url,
      pattern: url,
      type: 'unknown',
      params: {},
      dynamicParams: {}
    };
  }
}

/**
 * Group URLs by their dynamic pattern
 * @param {string[]} urls - URLs to group
 * @returns {Map<string, { pattern: string, type: string, urls: string[] }>}
 */
function groupUrlsByPattern(urls) {
  const groups = new Map();

  for (const url of urls) {
    const cleaned = removeTrackingParams(url);
    const patternInfo = generatePattern(cleaned);

    // Create group key based on pattern
    let groupKey;
    if (patternInfo.type === 'static') {
      // Static URLs are their own group
      groupKey = cleaned;
    } else if (patternInfo.type === 'pagination') {
      // Group pagination by base path
      groupKey = `pagination:${patternInfo.basePath}`;
    } else if (patternInfo.type === 'id_param') {
      // Group ID params by base path
      groupKey = `id_param:${patternInfo.basePath}`;
    } else if (patternInfo.type === 'restful_numeric') {
      // Group RESTful numeric IDs by path pattern
      groupKey = `restful_numeric:/${patternInfo.pathPattern}`;
    } else if (patternInfo.type === 'restful_semantic') {
      // Semantic slugs are grouped by pattern
      groupKey = `restful_semantic:/${patternInfo.pathPattern}`;
    } else {
      groupKey = cleaned;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        pattern: patternInfo.pattern,
        type: patternInfo.type,
        urls: []
      });
    }

    groups.get(groupKey).urls.push(cleaned);
  }

  return groups;
}

/**
 * Select representative URLs from a group
 * @param {Object} group - Group object with pattern, type, urls
 * @param {number} maxSelect - Maximum URLs to select
 * @param {string[]} keywords - Optional keywords for relevance scoring
 * @returns {string[]} Selected representative URLs
 */
function selectRepresentatives(group, maxSelect = 2, keywords = []) {
  const { type, urls } = group;

  if (urls.length <= maxSelect) {
    return urls;
  }

  switch (type) {
    case 'static':
      // Keep all static URLs (shouldn't happen as they're their own group)
      return urls.slice(0, maxSelect);

    case 'pagination': {
      // Select first page and one middle page
      const selected = [];
      const sortedUrls = sortPaginationUrls(urls);

      // Always include first page
      if (sortedUrls.length > 0) {
        selected.push(sortedUrls[0]);
      }

      // Include a middle page if available
      if (sortedUrls.length > 1 && selected.length < maxSelect) {
        const midIndex = Math.floor(sortedUrls.length / 2);
        selected.push(sortedUrls[midIndex]);
      }

      return selected;
    }

    case 'id_param':
    case 'restful_numeric':
      // Select only one representative for ID-based URLs
      return [urls[0]];

    case 'restful_semantic':
      // Select by keyword relevance
      if (keywords.length > 0) {
        const scored = urls.map(url => ({
          url,
          score: calculateKeywordScore(url, keywords)
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, maxSelect).map(s => s.url);
      }
      return urls.slice(0, maxSelect);

    default:
      return urls.slice(0, maxSelect);
  }
}

/**
 * Sort pagination URLs by page number
 * @param {string[]} urls - Pagination URLs
 * @returns {string[]} Sorted URLs
 */
function sortPaginationUrls(urls) {
  return urls.map(url => {
    const parsed = new URL(url);
    let pageNum = 1;

    for (const [key, value] of parsed.searchParams) {
      if (PAGINATION_PARAMS.has(key.toLowerCase())) {
        pageNum = parseInt(value, 10) || 1;
        break;
      }
    }

    return { url, pageNum };
  })
    .sort((a, b) => a.pageNum - b.pageNum)
    .map(item => item.url);
}

/**
 * Calculate keyword relevance score for a URL
 * @param {string} url - URL to score
 * @param {string[]} keywords - Keywords to match
 * @returns {number} Score (0-1)
 */
function calculateKeywordScore(url, keywords) {
  if (!keywords || keywords.length === 0) return 0;

  const urlLower = url.toLowerCase();
  let totalScore = 0;

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();

    // Exact match
    if (urlLower.includes(keywordLower)) {
      totalScore += 1;
      continue;
    }

    // Split multi-word keywords and check for partial matches
    const words = keywordLower.split(/[\s-]+/);
    let partialScore = 0;

    for (const word of words) {
      if (word.length >= 3 && urlLower.includes(word)) {
        partialScore += 0.5;
      }
    }

    // Add partial score if at least one word matched
    if (partialScore > 0) {
      totalScore += Math.min(partialScore, 0.75);
    }
  }

  return Math.min(totalScore / keywords.length, 1);
}

/**
 * Process URLs: clean, group, and select representatives
 * @param {string[]} urls - URLs to process
 * @param {Object} options - Options { maxPerGroup, keywords }
 * @returns {string[]} Processed URLs
 */
function processUrls(urls, options = {}) {
  const { maxPerGroup = 2, keywords = [] } = options;
  const groups = groupUrlsByPattern(urls);
  const result = [];

  for (const [, group] of groups) {
    const representatives = selectRepresentatives(group, maxPerGroup, keywords);
    result.push(...representatives);
  }

  // Deduplicate
  return [...new Set(result)];
}

/**
 * Get dynamic URL weight penalty
 * @param {string} url - URL to check
 * @returns {number} Weight multiplier (0-1)
 */
function getDynamicUrlWeight(url) {
  const patternInfo = generatePattern(url);

  switch (patternInfo.type) {
    case 'static':
      return 1.0;
    case 'restful_semantic':
      return 0.8;
    case 'id_param':
      return 0.5;
    case 'pagination':
      // Check if it's first page
      const parsed = new URL(url);
      for (const [key, value] of parsed.searchParams) {
        if (PAGINATION_PARAMS.has(key.toLowerCase())) {
          const pageNum = parseInt(value, 10) || 1;
          return pageNum === 1 ? 0.8 : 0.4;
        }
      }
      return 0.4;
    case 'restful_numeric':
      return 0.5;
    default:
      return 0.7;
  }
}

module.exports = {
  removeTrackingParams,
  generatePattern,
  groupUrlsByPattern,
  selectRepresentatives,
  processUrls,
  getDynamicUrlWeight,
  calculateKeywordScore,
  TRACKING_PARAMS,
  PAGINATION_PARAMS,
  ID_PARAMS
};
