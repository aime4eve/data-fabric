/**
 * Domain Reader Service
 * 读取 domains_agg.csv 并构建候选域名处理队列
 *
 * Phase 1 输入模块
 */

const fs = require('fs');
const path = require('path');

// 必需字段列表
const REQUIRED_FIELDS = ['run_id', 'domain_key', 'domain'];

// 约定证据页路径（最多 8 页）
const EVIDENCE_PATHS = [
  '/',
  '/products',
  '/product',
  '/solutions',
  '/downloads',
  '/download',
  '/contact',
  '/about'
];

/**
 * 验证 domains_agg.csv 文件
 * @param {string} filePath - CSV 文件路径
 * @returns {{ valid: boolean, error: string|null, fields: string[] }}
 */
function validateDomainsFile(filePath) {
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      error: `File not found: ${filePath}`,
      fields: []
    };
  }

  // 读取文件内容
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length === 0) {
    return {
      valid: false,
      error: 'File is empty',
      fields: []
    };
  }

  // 解析表头
  const headerLine = lines[0];
  const fields = parseCSVLine(headerLine);

  // 检查必需字段
  const missingFields = REQUIRED_FIELDS.filter(f => !fields.includes(f));
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
      fields
    };
  }

  return {
    valid: true,
    error: null,
    fields
  };
}

/**
 * 解析 CSV 行（处理引号包裹的字段）
 * @param {string} line - CSV 行
 * @returns {string[]} 字段数组
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义引号
        current += '"';
        i++;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * 读取 domains_agg.csv 文件
 * @param {string} filePath - CSV 文件路径
 * @returns {Object[]} 域名记录数组
 */
function readDomainsAgg(filePath) {
  // 先验证文件
  const validation = validateDomainsFile(filePath);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length <= 1) {
    return []; // 只有表头，无数据
  }

  const fields = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // 跳过空行

    const values = parseCSVLine(line);
    const record = {};

    fields.forEach((field, index) => {
      const value = values[index] || '';
      // 类型转换
      if (field === 'min_rank' || field === 'hit_count' || field === 'score') {
        record[field] = parseInt(value, 10) || 0;
      } else {
        record[field] = value;
      }
    });

    records.push(record);
  }

  return records;
}

/**
 * 构建域名处理队列
 * @param {Object[]} domains - 域名记录数组
 * @param {string} runId - 当前运行 ID
 * @param {Object} options - 选项
 * @param {number} [options.maxDomains] - 最大域名数量限制
 * @returns {Object[]} 处理队列
 */
function buildDomainQueue(domains, runId, options = {}) {
  // 按 min_rank 排序（升序，排名靠前的优先）
  const sorted = [...domains].sort((a, b) => {
    const rankA = a.min_rank || 999;
    const rankB = b.min_rank || 999;
    return rankA - rankB;
  });

  // 应用 maxDomains 限制
  const limited = options.maxDomains
    ? sorted.slice(0, options.maxDomains)
    : sorted;

  // 构建队列项
  return limited.map(domain => ({
    run_id: runId,
    domain_key: domain.domain_key,
    domain: domain.domain,
    base_url: `https://${domain.domain}`,
    min_rank: domain.min_rank || 999,
    hit_count: domain.hit_count || 0,
    queries: domain.queries || '',
    phase0_score: domain.score || 0,
    phase0_reason: domain.reason || '',
    paths: [...EVIDENCE_PATHS],
    evidence_pages: [],  // 抓取后填充
    extracted_data: null, // 抽取后填充
    error_reason: ''      // 错误时填充
  }));
}

module.exports = {
  validateDomainsFile,
  readDomainsAgg,
  buildDomainQueue,
  EVIDENCE_PATHS,
  REQUIRED_FIELDS
};
