/**
 * 查询生成模块
 * 将关键词转换为 Google 搜索查询
 */

// 供应商意图词
const SUPPLIER_INTENTS = ['supplier', 'manufacturer', 'factory', 'vendor', 'wholesaler'];

/**
 * 展开同义词
 * @param {string[]} keywords - 关键词数组
 * @param {Object} synonymMap - 同义词映射 { keyword: [synonyms] }
 * @returns {string[]} 展开后的关键词数组
 */
function expandSynonyms(keywords, synonymMap = {}) {
  const expanded = new Set();

  for (const keyword of keywords) {
    expanded.add(keyword);

    // 添加同义词
    const synonyms = synonymMap[keyword.toLowerCase()];
    if (synonyms) {
      synonyms.forEach(s => expanded.add(s));
    }
  }

  return Array.from(expanded);
}

/**
 * 去重查询
 * @param {string[]} queries - 查询数组
 * @returns {string[]} 去重后的查询数组
 */
function deduplicateQueries(queries) {
  const seen = new Set();

  return queries.filter(q => {
    // 规范化：小写、去除多余空格
    const normalized = q.toLowerCase().replace(/\s+/g, ' ').trim();

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

/**
 * 生成查询词
 * @param {string[]} keywords - 关键词数组
 * @param {Object} options - 配置选项
 * @param {number} options.maxQueries - 最大查询数量
 * @returns {string[]} 查询词数组
 */
function applyQueryExclusions(query, excludedSites = []) {
  if (!query) return '';
  if (!excludedSites || excludedSites.length === 0) return query;
  const suffix = excludedSites
    .filter(Boolean)
    .map(site => `-site:${String(site).trim()}`)
    .join(' ');
  return `${query} ${suffix}`.trim();
}

function generateQueries(keywords, options = {}) {
  const { maxQueries = 20, excludedSites = [] } = options;
  const queries = [];

  // 过滤并规范化关键词
  const normalizedKeywords = keywords
    .map(k => k.trim())
    .filter(k => k.length > 2);

  if (normalizedKeywords.length === 0) {
    return [];
  }

  // 1. 核心产品查询（关键词组合）
  const coreKeywords = normalizedKeywords.slice(0, 4);

  // 组合核心关键词
  if (coreKeywords.length >= 2) {
    // 取前两个最重要的关键词组合
    queries.push(coreKeywords.slice(0, 2).join(' '));
  }

  // 2. 产品 + 供应商意图查询
  const mainProduct = coreKeywords[0];
  for (const intent of SUPPLIER_INTENTS.slice(0, 2)) {
    queries.push(`${mainProduct} ${intent}`);
  }

  // 3. 技术关键词组合
  const techKeywords = coreKeywords.filter(k =>
    /lorawan|wireless|smart|remote|automation/i.test(k)
  );

  if (techKeywords.length > 0 && mainProduct) {
    queries.push(`${mainProduct} ${techKeywords[0]}`);
  }

  // 4. 应用场景组合
  const appKeywords = normalizedKeywords.filter(k =>
    /irrigation|agriculture|agricultural|farming|industrial/i.test(k)
  );

  if (appKeywords.length > 0 && mainProduct) {
    queries.push(`${mainProduct} ${appKeywords[0]}`);
  }

  // 5. 单独的产品词 + 供应商
  for (const keyword of coreKeywords.slice(0, 3)) {
    queries.push(`${keyword} supplier`);
  }

  // 6. 完整组合（如果关键词较少）
  if (coreKeywords.length <= 3) {
    queries.push(coreKeywords.join(' '));
  }

  // 去重并限制数量
  const uniqueQueries = deduplicateQueries(queries);

  return uniqueQueries
    .slice(0, maxQueries)
    .map(query => applyQueryExclusions(query, excludedSites));
}

module.exports = {
  generateQueries,
  deduplicateQueries,
  expandSynonyms,
  applyQueryExclusions,
  SUPPLIER_INTENTS
};
