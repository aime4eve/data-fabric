/**
 * CSV 写入模块
 * 输出 SERP 结果和域名聚合结果
 */

const fs = require('fs');
const path = require('path');

// SERP 结果 CSV 表头
const SERP_HEADERS = [
  'run_id', 'captured_at', 'query', 'rank', 'title', 'snippet',
  'url', 'normalized_url', 'domain', 'domain_key', 'error_reason'
];

// 域名聚合 CSV 表头
const DOMAINS_HEADERS = [
  'run_id', 'domain_key', 'domain', 'min_rank', 'hit_count',
  'queries', 'score', 'reason'
];

/**
 * 转义 CSV 字段值
 * @param {any} value - 要转义的值
 * @returns {string} 转义后的值
 */
function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // 如果包含逗号、引号或换行符，需要用引号包裹
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // 引号需要转义为两个引号
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * 将对象数组转换为 CSV 行
 * @param {Object[]} data - 数据数组
 * @param {string[]} headers - 表头字段
 * @returns {string[]} CSV 行数组
 */
function toCSVRows(data, headers) {
  return data.map(item => {
    return headers.map(header => {
      return escapeCSV(item[header]);
    }).join(',');
  });
}

/**
 * 写入 SERP 结果到 CSV
 * @param {Object[]} results - SERP 结果数组
 * @param {string} filePath - 输出文件路径
 */
function writeSerpResults(results, filePath) {
  const headerLine = SERP_HEADERS.join(',');
  const dataLines = toCSVRows(results, SERP_HEADERS);

  const content = [headerLine, ...dataLines].join('\n');

  // 确保目录存在
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 写入域名聚合结果到 CSV
 * @param {Object[]} domains - 域名聚合数组
 * @param {string} filePath - 输出文件路径
 */
function writeDomainsAgg(domains, filePath) {
  const headerLine = DOMAINS_HEADERS.join(',');
  const dataLines = toCSVRows(domains, DOMAINS_HEADERS);

  const content = [headerLine, ...dataLines].join('\n');

  // 确保目录存在
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

module.exports = {
  writeSerpResults,
  writeDomainsAgg,
  escapeCSV,
  SERP_HEADERS,
  DOMAINS_HEADERS
};
