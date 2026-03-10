/**
 * Phase 0-3 厂商门户搜索采集系统
 * 主入口文件
 */

const { parseArgsFromProcess, getDefaultConfig } = require('./utils/cli');
const { createContext, initOutputDir, recordError, updateStats, finishContext } = require('./utils/context');
const { formatBeijingTime } = require('./utils/time');
const { extractKeywords } = require('./services/keyword-extractor');
const { generateQueries } = require('./services/query-generator');
const { collectSerpResults } = require('./services/serp-collector');
const { buildDomainQueue } = require('./services/domain-reader');
const { fetchAllEvidencePages } = require('./services/evidence-fetcher');
const { normalizeUrl, extractDomain, generateDomainKey } = require('./utils/url-normalizer');
const { aggregateDomains } = require('./services/domain-aggregator');
const { scoreDomain } = require('./services/scorer');
const { writeSerpResults, writeDomainsAgg } = require('./utils/csv-writer');
const { aggregateAllVendors, writeVendorsCsv, writeVendorsEnrichedCsv } = require('./services/vendor-aggregator');
const { readVendorsCsv, enrichVendorsWithLLM } = require('./services/phase2-enricher');
const { writeManifest } = require('./utils/manifest-writer');
const offlineArchiver = require('./services/offline-archiver');
const indexGenerator = require('./services/index-generator');
const path = require('path');
const { createLogger, setLogContext } = require('./utils/logger');
const { loadConfig, getEffectiveConfig, validateConfig } = require('./utils/config');

async function collectPhase1Evidence(domainQueue, context, config) {
  const evidenceMap = new Map();
  let browser = null;
  let page = null;

  if (config.headful !== false) {
    try {
      const { chromium } = require('playwright');
      browser = await chromium.launch({
        headless: false,
        slowMo: 50,
        args: ['--no-sandbox']
      });
      page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    } catch (error) {
      console.log(`  - 警告: 无法启动 Phase1 浏览器，跳过证据抓取 (${error.message})`);
    }
  }

  for (const domainItem of domainQueue) {
    const robotsInfo = { rules: {}, sitemaps: [] };
    const pages = page
      ? await fetchAllEvidencePages(
          page,
          domainItem.paths,
          domainItem.domain,
          robotsInfo,
          {
            runId: context.runId,
            screenshotDir: path.join(context.outputPath, 'screenshots')
          }
        )
      : [];
    evidenceMap.set(domainItem.domain_key, pages);
  }

  if (browser) {
    await browser.close();
  }

  return evidenceMap;
}

/**
 * 主运行函数
 * @param {Object} config - 配置对象
 * @returns {Promise<Object>} 运行结果
 */
async function run(config) {
  // 初始化日志上下文
  const runId = config.runId || require('./utils/time').generateRunId();
  setLogContext({ runId, phase: 'main' });

  const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    context: { runId }
  });

  logger.info('='.repeat(60));
  logger.info('Phase 0: 厂商门户搜索采集系统');
  logger.info('='.repeat(60));

  // 1. 创建运行上下文
  const context = createContext(config);
  logger.info(`[1/6] 初始化运行上下文`);
  logger.info(`Run ID: ${context.runId}`);
  logger.info(`开始时间: ${context.startedAt}`);

  // 2. 初始化输出目录
  initOutputDir(context);
  logger.info(`输出目录: ${context.outputPath}`);

  // 3. 获取关键词
  logger.info(`[2/6] 获取关键词`);
  let keywords = [];

  if (config.sourceDoc) {
    logger.info(`来源文档: ${config.sourceDoc}`);
    keywords = await extractKeywords(config.sourceDoc);
  } else if (config.keywordsFile) {
    logger.info(`关键词文件: ${config.keywordsFile}`);
    keywords = await extractKeywords(config.keywordsFile);
  } else {
    logger.warn('未指定关键词来源');
  }

  logger.info(`提取关键词: ${keywords.length} 个`);

  // 4. 生成查询词
  logger.info(`[3/6] 生成查询词`);
  const queries = generateQueries(keywords, {
    maxQueries: 20,
    excludedSites: config.excludedSites
  });
  logger.info(`生成查询: ${queries.length} 条`);

  updateStats(context, { totalQueries: queries.length });

  // 5. 执行 Google 搜索采集
  logger.info(`[4/6] 执行 Google 搜索采集`);

  // 使用模拟数据进行测试（实际运行时使用 Playwright）
  const allResults = await collectSerpResults(queries, context, config);

  // 6. URL 归一化
  logger.info(`[5/6] URL 归一化与域名聚合`);

  const normalizedResults = allResults.map(result => {
    if (result.error_reason) {
      return result;
    }

    const normalized = normalizeUrl(result.url);
    const domain = extractDomain(result.url);
    const domainKey = generateDomainKey(result.url);

    return {
      ...result,
      normalized_url: normalized,
      domain,
      domain_key: domainKey
    };
  });

  updateStats(context, { totalSerpResults: normalizedResults.length });

  // 7. 域名聚合
  const aggregatedDomains = aggregateDomains(normalizedResults);

  // 8. 评分
  const scoredDomains = aggregatedDomains.map(domain => {
    const scoreResult = scoreDomain(domain);
    return {
      run_id: domain.run_id,
      domain_key: domain.domain_key,
      domain: domain.domain,
      min_rank: domain.min_rank,
      hit_count: domain.hit_count,
      queries: domain.queries,
      score: scoreResult.score,
      reason: scoreResult.reason
    };
  });

  // 按分数排序
  scoredDomains.sort((a, b) => b.score - a.score);

  updateStats(context, { uniqueDomains: scoredDomains.length });

  // 9. 写入 CSV
  logger.info(`[6/6] 写入输出文件`);

  const serpCsvPath = path.join(context.outputPath, 'serp_results_raw.csv');
  const domainsCsvPath = path.join(context.outputPath, 'domains_agg.csv');
  const vendorsCsvPath = path.join(context.outputPath, 'vendors.csv');
  const vendorsEnrichedCsvPath = path.join(context.outputPath, 'vendors_enriched.csv');
  const manifestPath = path.join(context.outputPath, 'run_manifest.json');

  writeSerpResults(normalizedResults, serpCsvPath);
  logger.info(`SERP 结果: ${serpCsvPath}`);

  writeDomainsAgg(scoredDomains, domainsCsvPath);
  logger.info(`域名聚合: ${domainsCsvPath}`);

  let vendors = [];
  if (config.vendorsFile) {
    vendors = readVendorsCsv(config.vendorsFile);
    logger.info(`读取 Phase1 vendors.csv: ${config.vendorsFile}`);
  } else {
    const domainQueue = buildDomainQueue(scoredDomains, context.runId, { maxDomains: config.maxDomains });
    const evidenceMap = await collectPhase1Evidence(domainQueue, context, config);
    vendors = aggregateAllVendors(domainQueue, evidenceMap);
    writeVendorsCsv(vendors, vendorsCsvPath);
    logger.info(`Phase1 厂商档案: ${vendorsCsvPath}`);
  }

  const vendorsEnriched = await enrichVendorsWithLLM(vendors, {
    options: {
      config: {
        baseUrl: config.llmBaseUrl,
        model: config.llmModel,
        apiKey: config.llmApiKey
      }
    }
  });
  writeVendorsEnrichedCsv(vendorsEnriched, vendorsEnrichedCsvPath);
  logger.info(`Phase2 增强档案: ${vendorsEnrichedCsvPath}`);

  updateStats(context, { totalVendors: vendorsEnriched.length });

  // 10. 完成并写入清单
  finishContext(context);
  writeManifest(context, manifestPath);
  logger.info(`运行清单: ${manifestPath}`);

  // 输出统计
  logger.info('='.repeat(60));
  logger.info('运行完成');
  logger.info('='.repeat(60));
  logger.info(`总查询数: ${context.stats.totalQueries}`);
  logger.info(`成功查询: ${context.stats.successfulQueries}`);
  logger.info(`失败查询: ${context.stats.failedQueries}`);
  logger.info(`SERP 结果: ${context.stats.totalSerpResults}`);
  logger.info(`唯一域名: ${context.stats.uniqueDomains}`);
  logger.info(`增强厂商: ${context.stats.totalVendors || 0}`);

  return {
    runId: context.runId,
    stats: context.stats,
    outputPath: context.outputPath
  };
}

/**
 * 运行 Phase 3 离线归档
 * @param {Object} config - 配置对象
 */
async function runPhase3(config) {
  // 初始化日志上下文
  setLogContext({ phase: 'phase3' });
  const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    context: { phase: 'phase3' }
  });

  logger.info('='.repeat(60));
  logger.info('Phase 3: 离线归档与索引');
  logger.info('='.repeat(60));

  const archiveDir = config.archiveDir || './offline_archive';
  logger.info(`归档目录: ${archiveDir}`);

  // 1. 获取 URL 列表
  logger.info(`[1/4] 获取 URL 列表`);
  let urls = [];

  if (config.urlList) {
    logger.info(`从文件读取: ${config.urlList}`);
    urls = offlineArchiver.readUrlList(config.urlList);
  } else if (config.vendorsFile) {
    logger.info(`从厂商文件读取: ${config.vendorsFile}`);
    urls = offlineArchiver.readUrlList(config.vendorsFile);
  } else {
    // 尝试从最新的输出目录读取
    const outputDir = config.outputDir || './outputs';
    const latestRun = findLatestRun(outputDir);
    if (latestRun) {
      const vendorsPath = path.join(outputDir, latestRun, 'vendors_enriched.csv');
      if (require('fs').existsSync(vendorsPath)) {
        logger.info(`从最新运行读取: ${vendorsPath}`);
        urls = offlineArchiver.readUrlList(vendorsPath);
      }
    }
  }

  if (urls.length === 0) {
    logger.error('未找到任何 URL');
    return { success: false, error: 'No URLs found' };
  }

  logger.info(`共 ${urls.length} 个 URL`);

  // 2. 加载下载历史，过滤已下载
  logger.info(`[2/4] 检查下载历史`);
  const history = offlineArchiver.loadDownloadHistory(archiveDir);
  logger.info(`历史记录: ${history.length} 条`);

  const newUrls = offlineArchiver.filterNewUrls(urls, history);
  logger.info(`待下载: ${newUrls.length} 个`);

  if (newUrls.length === 0) {
    logger.info('所有 URL 已下载，无需重复');
  }

  // 3. 执行下载
  logger.info(`[3/4] 执行离线下载`);
  let stats = { total: newUrls.length, success: 0, failed: 0, skipped: urls.length - newUrls.length };

  if (newUrls.length > 0) {
    const { chromium } = require('playwright');
    const browser = await chromium.launchPersistentContext('./browser-data', {
      headless: false,
      viewport: { width: 1280, height: 800 }
    });

    stats = await offlineArchiver.downloadAll(newUrls, {
      browser,
      archiveDir,
      timeout: config.timeout || 30000,
      maxSize: config.maxSize || 10240
    });

    await browser.close();
  }

  // 4. 生成索引页
  logger.info(`[4/4] 生成索引页`);
  const vendorsPath = config.vendorsFile || path.join(config.outputDir || './outputs', findLatestRun(config.outputDir || './outputs') || '', 'vendors_enriched.csv');
  indexGenerator.generateIndex(archiveDir, vendorsPath);

  // 输出统计
  logger.info('='.repeat(60));
  logger.info('Phase 3 完成');
  logger.info('='.repeat(60));
  logger.info(`总 URL 数: ${urls.length}`);
  logger.info(`本次下载: ${newUrls.length}`);
  logger.info(`成功: ${stats.success}`);
  logger.info(`失败: ${stats.failed}`);
  logger.info(`跳过: ${stats.skipped}`);

  return {
    success: true,
    stats: {
      total: urls.length,
      downloaded: newUrls.length,
      success: stats.success,
      failed: stats.failed,
      skipped: stats.skipped
    },
    archiveDir
  };
}

/**
 * 查找最新的运行目录
 * @param {string} outputDir - 输出目录
 * @returns {string|null} 最新运行 ID
 */
function findLatestRun(outputDir) {
  const fs = require('fs');
  if (!fs.existsSync(outputDir)) return null;

  const dirs = fs.readdirSync(outputDir)
    .filter(d => /^\d{8}-\d{6}$/.test(d))
    .sort()
    .reverse();

  return dirs[0] || null;
}

/**
 * CLI 入口
 */
async function main() {
  const cliConfig = parseArgsFromProcess();

  // 加载配置（从环境变量和 .env 文件）
  const fileConfig = loadConfig();
  const config = getEffectiveConfig(fileConfig, cliConfig);

  // 验证配置
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error('配置验证失败:', validation.errors.join(', '));
    process.exit(1);
  }

  // 显示警告（如缺少 API Key）
  if (validation.warnings.length > 0) {
    console.warn('警告:', validation.warnings.join(', '));
  }

  // 初始化日志级别
  if (config.logLevel) {
    setLogLevel(config.logLevel);
  }

  // Phase 3 模式
  if (config.phase3) {
    try {
      const result = await runPhase3(config);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('Phase 3 运行失败:', error.message);
      process.exit(1);
    }
    return;
  }

  try {
    const result = await run(config);
    process.exit(0);
  } catch (error) {
    console.error('运行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

module.exports = { run, main };
