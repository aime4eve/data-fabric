/**
 * Evidence Fetcher Service
 * 门户证据页抓取与文本清洗
 *
 * Phase 1 抓取模块
 */

// ==================== 常量定义 ====================

/** 证据文本最大长度（字符数） */
const MAX_EVIDENCE_TEXT_LENGTH = 10000;

/** 默认页面加载超时时间（毫秒） */
const DEFAULT_PAGE_TIMEOUT = 30000;

/** 导航前随机延迟范围（毫秒） */
const NAV_PRE_DELAY_MIN = 500;
const NAV_PRE_DELAY_MAX = 1500;

/** 页面加载后随机延迟范围（毫秒） */
const NAV_POST_DELAY_MIN = 1000;
const NAV_POST_DELAY_MAX = 2000;

/** 请求间随机延迟范围（毫秒，避免过快请求） */
const REQUEST_DELAY_MIN = 2000;
const REQUEST_DELAY_MAX = 4000;

/** HTTP 错误状态码阈值 */
const HTTP_ERROR_STATUS_THRESHOLD = 400;

// ==================== 模块依赖 ====================

const fs = require('fs');
const path = require('path');

/**
 * 从 HTML 中提取纯文本
 * @param {string} html - HTML 内容
 * @returns {string} 纯文本内容
 */
function extractPageText(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // 移除 script 和 style 标签及其内容
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');

  // 移除所有 HTML 标签
  text = text.replace(/<[^>]+>/g, ' ');

  // 解码 HTML 实体
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));

  // 规范化空白
  text = text
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * 创建证据记录
 * @param {Object} options - 选项
 * @param {string} options.domain - 域名
 * @param {string} options.path - 路径
 * @param {string} options.url - 完整 URL
 * @param {string} options.text - 提取的文本
 * @param {number} [options.statusCode] - HTTP 状态码
 * @param {Error} [options.error] - 错误对象
 * @returns {Object} 证据记录
 */
function createEvidenceRecord({ domain, path, url, text, statusCode, error }) {
  const record = {
    domain,
    path,
    url,
    captured_at: new Date().toISOString(),
    text: '',
    status: 'success',
    error_reason: ''
  };

  if (error) {
    record.status = 'error';
    record.error_reason = error.message || String(error);
    return record;
  }

  if (statusCode && statusCode >= HTTP_ERROR_STATUS_THRESHOLD) {
    record.status = 'error';
    record.error_reason = `HTTP ${statusCode}`;
    return record;
  }

  record.text = text || '';
  return record;
}

/**
 * 随机延迟
 * @param {number} minMs - 最小毫秒
 * @param {number} maxMs - 最大毫秒
 */
function randomDelay(minMs, maxMs) {
  const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

function sanitizePathForFilename(pagePath) {
  if (!pagePath || pagePath === '/') return 'home';
  return pagePath.replace(/^\//, '').replace(/[\/\\?%*:|"<>]/g, '_') || 'page';
}

async function captureEvidenceScreenshot(page, options = {}) {
  if (!page || !options.screenshotDir || !options.runId || !options.domain) {
    return '';
  }
  const runDir = path.join(options.screenshotDir, options.runId);
  if (!fs.existsSync(runDir)) {
    fs.mkdirSync(runDir, { recursive: true });
  }
  const safePath = sanitizePathForFilename(options.pagePath);
  const filePath = path.join(runDir, `${options.domain}_${safePath}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

/**
 * 抓取单个证据页
 * @param {Object} page - Playwright page 对象
 * @param {string} domain - 域名
 * @param {string} path - 路径（相对路径或完整 URL）
 * @param {Object} options - 选项
 * @param {number} [options.timeout=30000] - 超时时间（毫秒）
 * @returns {Promise<Object>} 证据记录
 */
async function fetchEvidencePage(page, domain, path, options = {}) {
  const timeout = options.timeout || DEFAULT_PAGE_TIMEOUT;

  // 智能处理 path：支持完整 URL 或相对路径
  let url;
  let actualPath;
  if (path && path.startsWith('http')) {
    // path 已经是完整 URL（来自 path-discovery 模块）
    url = path;
    try {
      const parsed = new URL(path);
      actualPath = parsed.pathname + parsed.search;
    } catch {
      actualPath = path;
    }
  } else {
    // path 是相对路径
    url = `https://${domain}${path}`;
    actualPath = path;
  }

  try {
    // 导航前随机暂停
    await randomDelay(NAV_PRE_DELAY_MIN, NAV_PRE_DELAY_MAX);

    // 导航到页面
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    });

    // 页面加载后暂停
    await randomDelay(NAV_POST_DELAY_MIN, NAV_POST_DELAY_MAX);

    // 获取页面内容
    const html = await page.content();
    const text = extractPageText(html);

    // 截取前 MAX_EVIDENCE_TEXT_LENGTH 字符作为证据文本
    const truncatedText = text.slice(0, MAX_EVIDENCE_TEXT_LENGTH);

    const screenshotPath = await captureEvidenceScreenshot(page, {
      screenshotDir: options.screenshotDir,
      runId: options.runId,
      domain,
      pagePath: actualPath
    });

    const record = createEvidenceRecord({
      domain,
      path: actualPath,
      url,
      text: truncatedText,
      statusCode: response ? response.status() : 200
    });
    record.screenshot_path = screenshotPath;
    return record;
  } catch (error) {
    return createEvidenceRecord({
      domain,
      path: actualPath,
      url,
      text: '',
      error
    });
  }
}

/**
 * 从完整 URL 或路径中提取路径部分
 * @param {string} pathOrUrl - 路径或完整 URL
 * @returns {string} 路径部分
 */
function extractPathFromUrl(pathOrUrl) {
  if (!pathOrUrl) return pathOrUrl;
  if (pathOrUrl.startsWith('http')) {
    try {
      const parsed = new URL(pathOrUrl);
      return parsed.pathname + parsed.search;
    } catch {
      return pathOrUrl;
    }
  }
  return pathOrUrl;
}

/**
 * 抓取所有证据页
 * @param {Object} page - Playwright page 对象
 * @param {string[]} paths - 路径列表（支持相对路径或完整 URL）
 * @param {string} domain - 域名
 * @param {Object} robotsInfo - robots.txt 信息
 * @param {Object} options - 选项
 * @returns {Promise<Object[]>} 证据记录数组
 */
async function fetchAllEvidencePages(page, paths, domain, robotsInfo, options = {}) {
  if (!page || !paths || paths.length === 0) {
    return [];
  }

  const results = [];

  for (const path of paths) {
    // 提取路径部分用于 robots 检查
    const pathForRobotsCheck = extractPathFromUrl(path);

    // 检查 robots.txt 合规性
    const { isPathAllowed } = require('./robots-checker');
    const check = isPathAllowed(robotsInfo, pathForRobotsCheck, 'MyBot');

    if (!check.allowed) {
      // 记录跳过原因
      const url = path.startsWith('http') ? path : `https://${domain}${path}`;
      results.push(createEvidenceRecord({
        domain,
        path: pathForRobotsCheck,
        url,
        text: '',
        error: new Error(`Robots.txt disallowed: ${check.reason}`)
      }));
      continue;
    }

    // 抓取页面
    const record = await fetchEvidencePage(page, domain, path, options);
    results.push(record);

    // 每次请求后暂停，避免过快
    await randomDelay(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX);
  }

  return results;
}

module.exports = {
  extractPageText,
  createEvidenceRecord,
  fetchEvidencePage,
  fetchAllEvidencePages,
  randomDelay,
  captureEvidenceScreenshot,
  extractPathFromUrl
};
