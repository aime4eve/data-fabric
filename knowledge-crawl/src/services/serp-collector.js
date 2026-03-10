/**
 * Google SERP 采集模块
 * 使用 Playwright 执行搜索并解析结果
 */

const { detectCaptchaChallenge } = require('./captcha-handler');

// 验证码手动验证超时时间：10 分钟（600000 毫秒）
// 用户需要在浏览器中手动完成验证，超时后将停止采集
const VERIFICATION_TIMEOUT_MS = 600000;

const CAPTCHA_INDICATORS = [
  'g-recaptcha',
  'h-captcha',
  'verify you are human',
  'unusual traffic',
  'automated requests',
  'captcha',
  'sorry...',
  '/sorry/'
];

/**
 * 创建 Google 搜索 URL
 * @param {string} query - 搜索查询
 * @returns {string} 搜索 URL
 */
function createSearchUrl(query) {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/search?q=${encodedQuery}&hl=en`;
}

/**
 * 检测是否遇到验证码/风控页面
 * @param {string} html - 页面 HTML
 * @returns {boolean} 是否检测到验证码
 */
function detectCaptcha(html) {
  const lowerHtml = (html || '').toLowerCase();

  for (const indicator of CAPTCHA_INDICATORS) {
    if (lowerHtml.includes(indicator.toLowerCase())) {
      return true;
    }
  }

  return detectCaptchaChallenge({ html: lowerHtml, url: '' });
}

/**
 * 使用 Playwright DOM 选择器提取搜索结果
 * @param {Object} page - Playwright page 对象
 * @param {string} query - 搜索查询
 * @param {string} runId - 运行 ID
 * @returns {Promise<Object[]>} 搜索结果数组
 */
async function extractSerpResultsWithDOM(page, query, runId) {
  const results = [];

  try {
    // 等待搜索结果加载
    await page.waitForSelector('#search, #rso', { timeout: 10000 });

    // 提取搜索结果
    const searchResults = await page.evaluate(() => {
      const items = [];

      // 多种选择器尝试，适应 Google 页面变化
      const selectors = [
        'div.g',           // 标准选择器
        'div[data-sokoban-container] div.g',
        '#rso > div',
        '.Gx5Zad'
      ];

      let elements = [];
      for (const selector of selectors) {
        elements = document.querySelectorAll(selector);
        if (elements.length > 0) break;
      }

      elements.forEach((el, index) => {
        if (index >= 20) return; // 最多 20 条

        // 提取标题
        const titleEl = el.querySelector('h3, [role="heading"]');
        const title = titleEl ? titleEl.textContent.trim() : '';

        // 提取链接
        const linkEl = el.querySelector('a[href^="http"]');
        const url = linkEl ? linkEl.href : '';

        // 提取摘要
        const snippetEl = el.querySelector('[data-sncf], .VwiC3b, .IsZvec');
        const snippet = snippetEl ? snippetEl.textContent.trim() : '';

        if (url && title && !url.includes('google.com/search')) {
          items.push({ title, url, snippet, rank: index + 1 });
        }
      });

      return items;
    });

    // 转换为标准格式
    for (const item of searchResults) {
      results.push({
        run_id: runId,
        captured_at: new Date().toISOString(),
        query,
        rank: item.rank,
        title: item.title,
        snippet: item.snippet,
        url: item.url,
        normalized_url: null,
        domain: null,
        domain_key: null,
        error_reason: ''
      });
    }

    console.log(`    📊 DOM 提取: ${results.length} 条结果`);
  } catch (error) {
    console.log(`    ⚠️ DOM 提取失败: ${error.message}`);
  }

  return results;
}

/**
 * 解析 SERP 结果（HTML 方式，作为备用）
 * @param {string} html - 页面 HTML
 * @param {string} query - 搜索查询
 * @param {string} runId - 运行 ID
 * @returns {Object[]} 解析后的结果数组
 */
function parseSerpResults(html, query, runId) {
  const results = [];

  // 多种正则模式尝试
  const patterns = [
    // 标准模式
    /<div[^>]*class="[^"]*g[^"]*"[^>]*>([\s\S]*?)<\/div>(?=\s*<div[^>]*class="[^"]*g|\s*<div[^>]*id="foot)/gi,
    // 数据容器模式
    /<div[^>]*data-sokoban-container[^>]*>([\s\S]*?)<\/div>/gi
  ];

  let rank = 1;

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null && rank <= 20) {
      const resultHtml = match[1] || match[0];

      // 提取链接 - 多种模式
      let url = '';
      const urlPatterns = [
        /href="(https?:\/\/[^"]+)"/i,
        /href='(https?:\/\/[^']+)'/i,
        /"url":"(https?:\/\/[^"]+)"/i
      ];
      for (const up of urlPatterns) {
        const m = resultHtml.match(up);
        if (m && !m[1].includes('google.com/search')) {
          url = m[1];
          break;
        }
      }

      // 提取标题
      let title = '';
      const titleMatch = resultHtml.match(/<h3[^>]*>(.*?)<\/h3>/i);
      if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      }

      // 提取摘要
      let snippet = '';
      const snippetMatch = resultHtml.match(/<div[^>]*class="[^"]*(?:VwiC3b|IsZvec)[^"]*"[^>]*>(.*?)<\/div>/i);
      if (snippetMatch) {
        snippet = snippetMatch[1].replace(/<[^>]+>/g, '').trim();
      }

      if (url && title) {
        results.push({
          run_id: runId,
          captured_at: new Date().toISOString(),
          query,
          rank,
          title,
          snippet,
          url,
          normalized_url: null,
          domain: null,
          domain_key: null,
          error_reason: ''
        });
        rank++;
      }
    }

    if (results.length > 0) break;
  }

  return results;
}

/**
 * 等待随机时间（节流）
 * @param {number} minMs - 最小等待时间（毫秒）
 * @param {number} maxMs - 最大等待时间（毫秒）
 * @returns {Promise<void>}
 */
async function randomDelay(minMs = 1000, maxMs = 3000) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 模拟人类滚动行为
 * @param {Object} page - Playwright page 对象
 */
async function humanLikeScroll(page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight / 2);
  });
  await randomDelay(500, 1000);
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
}

/**
 * 检测是否在 sorry/验证页面
 * @param {string} url - 当前页面 URL
 * @returns {boolean} 是否在验证页面
 */
function isSorryPage(url) {
  return url.includes('/sorry/') || url.includes('google.com/sorry');
}

/**
 * 等待用户手动完成验证
 * @param {Object} page - Playwright page 对象
 * @param {number} maxWaitMs - 最大等待时间（毫秒）
 * @returns {Promise<boolean>} 是否成功通过验证
 */
async function waitForManualVerification(page, maxWaitMs = VERIFICATION_TIMEOUT_MS) {
  console.log('\n    ⚠️  检测到 Google 验证页面！');
  console.log('    📝 请在浏览器中手动完成验证...');
  console.log(`    ⏳ 等待中（最长 ${maxWaitMs/60000} 分钟）...\n`);

  const startTime = Date.now();
  const checkInterval = 10000; // 每 10 秒检查一次

  while (Date.now() - startTime < maxWaitMs) {
    await randomDelay(checkInterval, checkInterval + 500);

    const currentUrl = page.url();
    if (!isSorryPage(currentUrl) && !detectCaptcha(await page.content())) {
      console.log('    ✓ 验证已通过，继续采集...\n');
      return true;
    }

    // 显示剩余时间
    const remainingSec = Math.round((maxWaitMs - (Date.now() - startTime)) / 1000);
    process.stdout.write(`    等待中... 剩余 ${remainingSec} 秒\r`);
  }

  console.log('    ✗ 等待超时，跳过此查询\n');
  return false;
}

/**
 * 使用 Playwright 执行单次搜索
 * @param {Object} page - Playwright page 对象
 * @param {string} query - 搜索查询
 * @param {string} runId - 运行 ID
 * @param {Object} options - 选项
 * @returns {Promise<Object[]>} 搜索结果数组
 */
async function searchWithPlaywright(page, query, runId, options = {}) {
  const { waitOnCaptcha = true } = options;
  const url = createSearchUrl(query);

  try {
    // 随机暂停 0.5-2 秒后开始导航
    await randomDelay(500, 2000);

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // 页面加载后随机暂停 1-3 秒
    await randomDelay(1000, 3000);

    // 检查是否被重定向到验证页面
    const currentUrl = page.url();
    if (isSorryPage(currentUrl)) {
      if (waitOnCaptcha) {
        const verified = await waitForManualVerification(page);
        if (!verified) {
          return [{
            run_id: runId,
            captured_at: new Date().toISOString(),
            query,
            rank: 0,
            title: '',
            snippet: '',
            url: '',
            normalized_url: null,
            domain: null,
            domain_key: null,
            error_reason: 'Verification timeout - user did not complete captcha'
          }];
        }
      } else {
        return [{
          run_id: runId,
          captured_at: new Date().toISOString(),
          query,
          rank: 0,
          title: '',
          snippet: '',
          url: '',
          normalized_url: null,
          domain: null,
          domain_key: null,
          error_reason: 'Captcha/sorry page detected'
        }];
      }
    }

    // 模拟人类滚动（内部已有随机暂停）
    await humanLikeScroll(page);

    // 滚动后随机暂停 0.5-2 秒
    await randomDelay(500, 2000);

    const html = await page.content();

    // 检测验证码（页面内容中的）
    if (detectCaptcha(html)) {
      if (waitOnCaptcha) {
        const verified = await waitForManualVerification(page);
        if (!verified) {
          return [{
            run_id: runId,
            captured_at: new Date().toISOString(),
            query,
            rank: 0,
            title: '',
            snippet: '',
            url: '',
            normalized_url: null,
            domain: null,
            domain_key: null,
            error_reason: 'Verification timeout'
          }];
        }
      } else {
        return [{
          run_id: runId,
          captured_at: new Date().toISOString(),
          query,
          rank: 0,
          title: '',
          snippet: '',
          url: '',
          normalized_url: null,
          domain: null,
          domain_key: null,
          error_reason: 'Captcha or unusual traffic detected'
        }];
      }
    }

    // 优先使用 DOM 提取方法
    let results = await extractSerpResultsWithDOM(page, query, runId);

    // 如果 DOM 提取失败，回退到 HTML 解析
    if (results.length === 0) {
      console.log('    📊 回退到 HTML 解析...');
      results = parseSerpResults(await page.content(), query, runId);
    }

    return results;
  } catch (error) {
    return [{
      run_id: runId,
      captured_at: new Date().toISOString(),
      query,
      rank: 0,
      title: '',
      snippet: '',
      url: '',
      normalized_url: null,
      domain: null,
      domain_key: null,
      error_reason: error.message
    }];
  }
}

/**
 * 生成模拟的 SERP 数据（用于测试）
 * @param {string} query - 搜索查询
 * @param {string} runId - 运行 ID
 * @returns {Object[]} 模拟的搜索结果
 */
function generateMockResults(query, runId) {
  const mockDomains = [
    { domain: 'example-valves.com', title: 'Solenoid Valve Manufacturer | Example Valves' },
    { domain: 'agri-controls.com', title: 'Agricultural Irrigation Controllers' },
    { domain: 'lorawan-tech.com', title: 'LoRaWAN Smart Irrigation Solutions' },
    { domain: 'smart-farming.io', title: 'Smart Farming Equipment Supplier' },
    { domain: 'industrial-valves.net', title: 'Industrial Solenoid Valves' },
    { domain: 'green-agriculture.com', title: 'Green Agriculture Technology' },
    { domain: 'wireless-controls.com', title: 'Wireless Valve Controllers' },
    { domain: 'precision-irrigation.com', title: 'Precision Irrigation Systems' },
    { domain: 'farm-automation.com', title: 'Farm Automation Equipment' },
    { domain: 'water-management.com', title: 'Water Management Solutions' }
  ];

  return mockDomains.map((mock, index) => ({
    run_id: runId,
    captured_at: new Date().toISOString(),
    query,
    rank: index + 1,
    title: mock.title,
    snippet: `Professional ${query} solutions for agriculture and industry. Quality products from ${mock.domain}.`,
    url: `https://${mock.domain}/products`,
    normalized_url: null,
    domain: mock.domain,
    domain_key: mock.domain,
    error_reason: ''
  }));
}

/**
 * 收集所有查询的 SERP 结果
 * @param {string[]} queries - 查询词数组
 * @param {Object} context - 运行上下文
 * @param {Object} config - 配置对象
 * @returns {Promise<Object[]>} 所有 SERP 结果
 */
async function collectSerpResults(queries, context, config) {
  const allResults = [];
  let browser = null;
  let page = null;
  let verificationFailed = false;  // 验证失败标志
  // 是否保持浏览器打开（默认 false，即采集完成后关闭）
  const keepBrowser = config.keepBrowser || false;

  // 使用持久化用户数据目录，保持登录状态和 cookies
  const userDataDir = config.userDataDir || './browser-data';
  const fs = require('fs');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  try {
    // 如果配置了使用 Playwright，则启动浏览器
    if (config.headful !== false) {
    try {
      const { chromium } = require('playwright');
      // 使用持久化上下文，不主动关闭浏览器
      browser = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        slowMo: 50,  // 减慢操作速度，更像真人
        viewport: { width: 1280, height: 800 },
        locale: 'en-US',
        timezoneId: 'Asia/Shanghai'
      });

      // 获取或创建页面
      const pages = browser.pages();
      page = pages.length > 0 ? pages[0] : await browser.newPage();

      console.log('  - 浏览器已启动 (持久化模式)');
      console.log(`  💡 提示: ${keepBrowser ? '浏览器将保持打开' : '浏览器将在采集完成后自动关闭'}`);
      console.log('           如遇验证页面，请在浏览器中手动完成验证');
      console.log('           系统会自动等待（最长 10 分钟）\n');
    } catch (error) {
      console.log('  - 警告: 无法启动浏览器，使用模拟数据');
      console.log(`    原因: ${error.message}`);
    }
  }

  for (let i = 0; i < queries.length; i++) {
    // 检查验证是否已失败
    if (verificationFailed) {
      console.log(`  ✗ 验证未通过，停止后续采集`);
      break;
    }

    const query = queries[i];
    console.log(`  - [${i + 1}/${queries.length}] 查询: ${query}`);

    let results;

    if (page) {
      // 使用 Playwright 采集（启用验证等待）
      results = await searchWithPlaywright(page, query, context.runId, { waitOnCaptcha: true });

      // 检查是否有错误
      const hasError = results.length === 1 && results[0].error_reason;
      if (hasError) {
        const errorMsg = results[0].error_reason;
        context.errors.push({ query, error: errorMsg });
        context.stats.failedQueries += 1;

        // 如果是验证超时错误，停止整个采集流程
        if (errorMsg.includes('Verification timeout') || errorMsg.includes('captcha')) {
          console.log(`    ✗ 验证超时未通过: ${errorMsg}`);
          console.log(`    🛑 停止采集，请在浏览器中完成验证后重新运行`);
          verificationFailed = true;
          break;
        }

        console.log(`    ! 错误: ${errorMsg}`);
      } else {
        context.stats.successfulQueries += 1;
        console.log(`    ✓ 获取 ${results.length} 条结果`);
      }

      // 节流：每次查询后随机等待 1-5 秒（防机器人检测）
      const delaySec = 1 + Math.random() * 4;
      console.log(`    ⏳ 等待 ${delaySec.toFixed(1)} 秒后继续...`);
      await randomDelay(1000, 5000);
    } else {
      // 使用模拟数据
      results = generateMockResults(query, context.runId);
      context.stats.successfulQueries += 1;
      console.log(`    ✓ 模拟数据: ${results.length} 条结果`);
    }

    allResults.push(...results);

    // 如果配置了最大域名数，提前结束
    if (config.maxDomains && allResults.length >= config.maxDomains * 2) {
      console.log(`  - 达到最大域名限制，停止采集`);
      break;
    }
  }

  return allResults;
} finally {
  // 根据 keepBrowser 选项决定是否关闭浏览器
  if (browser) {
    if (keepBrowser) {
      console.log('  - 采集完成，浏览器保持打开状态');
      console.log('  💡 可以直接再次运行程序继续采集');
    } else {
      console.log('  - 采集完成，正在关闭浏览器...');
      await browser.close();
      console.log('  ✓ 浏览器已关闭');
    }
  }
}

module.exports = {
  createSearchUrl,
  detectCaptcha,
  isSorryPage,
  waitForManualVerification,
  parseSerpResults,
  extractSerpResultsWithDOM,
  randomDelay,
  humanLikeScroll,
  searchWithPlaywright,
  generateMockResults,
  collectSerpResults,
  CAPTCHA_INDICATORS
};
