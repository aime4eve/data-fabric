/**
 * 运行上下文模块
 * 管理单次运行的上下文信息
 */

const fs = require('fs');
const path = require('path');
const { generateRunId, formatBeijingTime } = require('./time');

/**
 * 创建运行上下文
 * @param {Object} config - CLI 配置
 * @returns {Object} 运行上下文对象
 */
function createContext(config) {
  const runId = config.runId || generateRunId();

  return {
    runId,
    config: {
      sourceDoc: config.sourceDoc || null,
      keywordsFile: config.keywordsFile || null,
      outputDir: config.outputDir || './outputs',
      topN: config.topN || 20,
      headful: config.headful !== false,
      maxDomains: config.maxDomains || null
    },
    startedAt: formatBeijingTime(),
    finishedAt: null,
    outputPath: null,
    stats: {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      totalSerpResults: 0,
      uniqueDomains: 0
    },
    errors: []
  };
}

/**
 * 初始化输出目录
 * @param {Object} context - 运行上下文
 * @returns {string} 输出目录路径
 */
function initOutputDir(context) {
  const outputPath = path.resolve(path.join(context.config.outputDir, context.runId));

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  context.outputPath = outputPath;
  return outputPath;
}

/**
 * 记录错误到上下文
 * @param {Object} context - 运行上下文
 * @param {string} query - 查询词
 * @param {string} error - 错误信息
 */
function recordError(context, query, error) {
  context.errors.push({
    query,
    error: error.message || error,
    timestamp: formatBeijingTime()
  });
}

/**
 * 更新统计信息
 * @param {Object} context - 运行上下文
 * @param {Object} updates - 要更新的统计字段
 */
function updateStats(context, updates) {
  Object.assign(context.stats, updates);
}

/**
 * 完成运行上下文
 * @param {Object} context - 运行上下文
 */
function finishContext(context) {
  context.finishedAt = formatBeijingTime();
}

module.exports = {
  createContext,
  initOutputDir,
  recordError,
  updateStats,
  finishContext
};
