/**
 * Manifest 写入模块
 * 生成运行清单 JSON 文件
 */

const fs = require('fs');
const path = require('path');

/**
 * 创建运行清单对象
 * @param {Object} context - 运行上下文
 * @returns {Object} 清单对象
 */
function createManifest(context) {
  return {
    run_id: context.runId,
    started_at: context.startedAt,
    finished_at: context.finishedAt,
    config: {
      source_doc: context.config.sourceDoc || null,
      keywords_file: context.config.keywordsFile || null,
      output_dir: context.config.outputDir,
      top_n: context.config.topN,
      max_domains: context.config.maxDomains
    },
    stats: {
      total_queries: context.stats.totalQueries,
      successful_queries: context.stats.successfulQueries,
      failed_queries: context.stats.failedQueries,
      total_serp_results: context.stats.totalSerpResults,
      unique_domains: context.stats.uniqueDomains
    },
    errors: context.errors
  };
}

/**
 * 写入运行清单到 JSON 文件
 * @param {Object} context - 运行上下文
 * @param {string} filePath - 输出文件路径
 */
function writeManifest(context, filePath) {
  const manifest = createManifest(context);
  const content = JSON.stringify(manifest, null, 2);

  // 确保目录存在
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

module.exports = {
  writeManifest,
  createManifest
};
