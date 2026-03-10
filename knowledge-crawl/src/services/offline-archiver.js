/**
 * 离线归档服务模块
 * 负责将厂商网页保存为离线 HTML 文件
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const { formatBeijingTime } = require('../utils/time');
const { generateDomainKey } = require('../utils/url-normalizer');

/**
 * 读取 URL 清单（支持 TXT/CSV）
 * @param {string} filePath - 文件路径
 * @returns {string[]} URL 数组
 */
function readUrlList(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`URL 清单文件不存在: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    // CSV 格式：查找 url 或 home_url 列
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true
    });

    return records
      .map(record => record.url || record.home_url || record.URL)
      .filter(Boolean)
      .map(url => url.trim());
  } else {
    // TXT 格式：每行一个 URL
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .filter(line => line.startsWith('http://') || line.startsWith('https://'));
  }
}

/**
 * 加载下载历史
 * @param {string} archiveDir - 归档目录
 * @returns {Object[]} 历史记录数组
 */
function loadDownloadHistory(archiveDir) {
  const historyPath = path.join(archiveDir, 'download_history.csv');

  if (!fs.existsSync(historyPath)) {
    return [];
  }

  const content = fs.readFileSync(historyPath, 'utf-8');

  try {
    return csv.parse(content, {
      columns: true,
      skip_empty_lines: true
    });
  } catch (error) {
    console.log(`  警告: 无法解析下载历史文件: ${error.message}`);
    return [];
  }
}

/**
 * 过滤已下载的 URL
 * @param {string[]} urls - URL 数组
 * @param {Object[]} history - 历史记录数组
 * @returns {string[]} 未下载的 URL 数组
 */
function filterNewUrls(urls, history) {
  const downloadedUrls = new Set(
    history
      .filter(record => record.status === 'SUCCESS')
      .map(record => record.original_url)
  );

  return urls.filter(url => !downloadedUrls.has(url));
}

/**
 * 滚动页面触发懒加载
 * @param {import('playwright').Page} page - Playwright 页面对象
 */
async function scrollPage(page) {
  await page.evaluate(async () => {
    // 滚动到底部
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });

    // 滚动回顶部
    window.scrollTo(0, 0);
  });

  // 等待图片加载
  await page.waitForTimeout(2000);
}

/**
 * 使用 SingleFile 保存页面
 * @param {import('playwright').Page} page - Playwright 页面对象
 * @returns {Promise<string>} HTML 内容
 */
async function saveWithSingleFile(page) {
  // 使用 SingleFile 的 CDP 方式
  const client = await page.context().newCDPSession(page);

  // 捕获页面快照为 MHTML（更可靠）
  const { data } = await client.send('Page.captureSnapshot', {
    format: 'mhtml'
  });

  await client.detach();

  return data;
}

/**
 * 追加下载记录到历史文件
 * @param {string} archiveDir - 归档目录
 * @param {Object} record - 下载记录
 */
function appendHistory(archiveDir, record) {
  const historyPath = path.join(archiveDir, 'download_history.csv');

  // 确保目录存在
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  // 如果文件不存在，创建并写入表头
  if (!fs.existsSync(historyPath)) {
    const header = 'original_url,local_path,status,download_time,file_size_kb,error_message\n';
    fs.writeFileSync(historyPath, header, 'utf-8');
  }

  // 追加记录
  const escapeCsv = (str) => {
    if (!str) return '';
    const escaped = String(str).replace(/"/g, '""');
    return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
      ? `"${escaped}"`
      : escaped;
  };

  const line = [
    escapeCsv(record.original_url),
    escapeCsv(record.local_path),
    record.status,
    record.download_time,
    record.file_size_kb || 0,
    escapeCsv(record.error_message || '')
  ].join(',') + '\n';

  fs.appendFileSync(historyPath, line, 'utf-8');
}

/**
 * 休眠函数
 * @param {number} ms - 毫秒数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的下载
 * @param {import('playwright').Page} page - Playwright 页面对象
 * @param {string} url - 目标 URL
 * @param {Object} options - 选项
 * @returns {Promise<Object>} 下载结果
 */
async function downloadWithRetry(page, url, options = {}) {
  const maxRetries = 3;
  const baseDelay = 1000;
  const timeout = options.timeout || 30000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 导航到页面
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout
      });

      // 等待页面加载
      await page.waitForTimeout(1000);

      // 滚动触发懒加载
      await scrollPage(page);

      // 使用 SingleFile 保存
      const content = await saveWithSingleFile(page);

      // 计算文件大小
      const fileSizeKb = Math.ceil(Buffer.byteLength(content, 'utf-8') / 1024);

      // 检查文件大小限制
      const maxSize = options.maxSize || 10240;
      if (fileSizeKb > maxSize) {
        throw new Error(`文件过大: ${fileSizeKb}KB > ${maxSize}KB`);
      }

      return {
        success: true,
        data: content,
        fileSizeKb
      };
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`  重试 ${attempt}/${maxRetries}，等待 ${delay}ms...`);
        await sleep(delay);
      } else {
        return {
          success: false,
          error: error.message
        };
      }
    }
  }

  return {
    success: false,
    error: '未知错误'
  };
}

/**
 * 批量下载
 * @param {string[]} urls - URL 数组
 * @param {Object} options - 选项
 * @param {import('playwright').Browser} options.browser - Playwright 浏览器实例
 * @param {string} options.archiveDir - 归档目录
 * @param {number} options.timeout - 超时时间
 * @param {number} options.maxSize - 最大文件大小
 * @returns {Promise<Object>} 下载统计
 */
async function downloadAll(urls, options = {}) {
  const { browser, archiveDir, timeout, maxSize } = options;

  // 确保归档目录存在
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  // 创建页面
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });

  const stats = {
    total: urls.length,
    success: 0,
    failed: 0,
    skipped: 0
  };

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`  [${i + 1}/${urls.length}] 下载: ${url}`);

    const domainKey = generateDomainKey(url);
    const localPath = `${domainKey}.mhtml`;

    const result = await downloadWithRetry(page, url, { timeout, maxSize });

    if (result.success) {
      // 保存文件
      const filePath = path.join(archiveDir, localPath);
      fs.writeFileSync(filePath, result.data, 'utf-8');

      // 记录成功
      appendHistory(archiveDir, {
        original_url: url,
        local_path: localPath,
        status: 'SUCCESS',
        download_time: formatBeijingTime(new Date()),
        file_size_kb: result.fileSizeKb,
        error_message: ''
      });

      stats.success++;
      console.log(`    ✓ 成功 (${result.fileSizeKb}KB)`);
    } else {
      // 记录失败
      appendHistory(archiveDir, {
        original_url: url,
        local_path: localPath,
        status: 'FAILED',
        download_time: formatBeijingTime(new Date()),
        file_size_kb: 0,
        error_message: result.error
      });

      stats.failed++;
      console.log(`    ✗ 失败: ${result.error}`);
    }

    // 随机等待，避免被封
    const waitTime = 1000 + Math.random() * 2000;
    await sleep(waitTime);
  }

  await page.close();

  return stats;
}

module.exports = {
  readUrlList,
  loadDownloadHistory,
  filterNewUrls,
  scrollPage,
  saveWithSingleFile,
  appendHistory,
  downloadWithRetry,
  downloadAll
};
