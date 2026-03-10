/**
 * 域名聚合模块
 * 按 domain_key 聚合 SERP 结果
 */

/**
 * 创建域名记录
 * @param {Object} serpResult - SERP 结果
 * @returns {Object} 域名记录
 */
function createDomainRecord(serpResult) {
  return {
    run_id: serpResult.run_id,
    domain_key: serpResult.domain_key,
    domain: serpResult.domain,
    min_rank: serpResult.rank,
    hit_count: 1,
    queries: serpResult.query,
    titles: [serpResult.title],
    snippets: [serpResult.snippet]
  };
}

/**
 * 聚合域名结果
 * @param {Object[]} serpResults - SERP 结果数组
 * @returns {Object[]} 聚合后的域名数组
 */
function aggregateDomains(serpResults) {
  const domainMap = new Map();

  for (const result of serpResults) {
    const key = result.domain_key;

    if (!key) continue;

    if (domainMap.has(key)) {
      const existing = domainMap.get(key);

      // 更新 min_rank
      if (result.rank < existing.min_rank) {
        existing.min_rank = result.rank;
      }

      // 增加 hit_count
      existing.hit_count += 1;

      // 添加 query（去重）
      const queries = existing.queries.split('|');
      if (!queries.includes(result.query)) {
        existing.queries += '|' + result.query;
      }

      // 收集 title 和 snippet 用于评分
      if (result.title) existing.titles.push(result.title);
      if (result.snippet) existing.snippets.push(result.snippet);
    } else {
      domainMap.set(key, createDomainRecord(result));
    }
  }

  // 转换为数组并清理临时字段
  return Array.from(domainMap.values()).map(record => {
    const { titles, snippets, ...rest } = record;
    return {
      ...rest,
      _titles: titles,
      _snippets: snippets
    };
  });
}

module.exports = {
  aggregateDomains,
  createDomainRecord
};
