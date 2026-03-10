/**
 * URL 归一化模块
 * 处理 URL 标准化、域名提取等
 */

const URL = require('url').URL;

// 常见的跟踪参数列表
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'ref', 'source', '_ga'
];

/**
 * 移除 URL 中的跟踪参数
 * @param {string} urlString - URL 字符串
 * @returns {string} 移除跟踪参数后的 URL
 */
function removeTrackingParams(urlString) {
  try {
    const url = new URL(urlString);
    const params = new URLSearchParams(url.search);

    TRACKING_PARAMS.forEach(param => {
      params.delete(param);
    });

    url.search = params.toString();
    return url.toString();
  } catch {
    return urlString;
  }
}

/**
 * 归一化 URL
 * @param {string} urlString - 原始 URL
 * @param {Object} options - 配置选项
 * @param {boolean} options.preserveHttp - 是否保留 http 协议
 * @param {Object} options.logger - 可选的日志对象（需有 warn 方法），用于记录解析失败警告
 * @returns {string|null} 归一化后的 URL，无效则返回 null
 */
function normalizeUrl(urlString, options = {}) {
  const { preserveHttp, logger } = options;

  try {
    let url = removeTrackingParams(urlString);
    const parsed = new URL(url);

    // 升级到 https（除非指定保留 http）
    if (!preserveHttp && parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }

    // 移除尾部斜杠（路径部分）
    if (parsed.pathname.endsWith('/') && parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    // 如果 search 为空，移除 ?
    parsed.search = parsed.search || '';

    return parsed.toString();
  } catch (error) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn(`URL 归一化失败: ${urlString}`, error.message);
    }
    return null;
  }
}

/**
 * 从 URL 提取域名
 * @param {string} urlString - URL 字符串
 * @param {Object} options - 配置选项
 * @param {Object} options.logger - 可选的日志对象（需有 warn 方法），用于记录解析失败警告
 * @returns {string|null} 域名，无效则返回 null
 */
function extractDomain(urlString, options = {}) {
  const { logger } = options;

  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch (error) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn(`URL 域名提取失败: ${urlString}`, error.message);
    }
    return null;
  }
}

/**
 * 生成稳定的域名键（用于去重）
 * @param {string} urlString - URL 字符串
 * @param {Object} options - 配置选项
 * @param {Object} options.logger - 可选的日志对象（需有 warn 方法），用于记录解析失败警告
 * @returns {string|null} 域名键，无效则返回 null
 */
function generateDomainKey(urlString, options = {}) {
  const { logger } = options;

  try {
    const domain = extractDomain(urlString);
    if (!domain) return null;

    // 移除 www. 前缀
    if (domain.startsWith('www.')) {
      return domain.slice(4);
    }

    return domain;
  } catch (error) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn(`域名键生成失败: ${urlString}`, error.message);
    }
    return null;
  }
}

module.exports = {
  normalizeUrl,
  extractDomain,
  generateDomainKey,
  removeTrackingParams
};
