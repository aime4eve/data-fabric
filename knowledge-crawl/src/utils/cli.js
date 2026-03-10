/**
 * CLI 参数解析模块
 */

/**
 * 获取默认配置
 * @returns {Object} 默认配置对象
 *
 * 安全说明：
 * API Key 只能通过环境变量 DEEPSEEK_API_KEY 设置，不支持通过命令行参数传入。
 * 这是为了避免 API Key 在进程列表、shell 历史记录或日志中泄露。
 */
function getDefaultConfig() {
  return {
    sourceDoc: null,
    keywordsFile: null,
    vendorsFile: null,
    outputDir: './outputs',
    topN: 20,          // 固定为 20
    headful: true,     // 固定为 true
    maxDomains: null,  // 可选，调试用
    runId: null,       // 可选，默认自动生成
    excludedSites: ['alibaba.com'],
    llmBaseUrl: 'https://api.deepseek.com',
    llmModel: 'deepseek-chat',
    // 注意：llmApiKey 不包含在配置对象中，使用时直接读取环境变量 DEEPSEEK_API_KEY
    // Phase 3 参数
    phase3: false,         // 启用 Phase 3 离线归档模式
    urlList: null,         // URL 清单文件路径
    archiveDir: './offline_archive',  // 归档目录
    timeout: 30000,        // 单页面下载超时（毫秒）
    maxSize: 10240         // 单文件最大体积（KB）
  };
}

/**
 * 解析命令行参数
 * @param {string[]} args - 命令行参数数组
 * @returns {Object} 解析后的配置对象
 */
function parseArgs(args) {
  const config = getDefaultConfig();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--source-doc':
        config.sourceDoc = args[++i];
        break;
      case '--keywords-file':
        config.keywordsFile = args[++i];
        break;
      case '--vendors-file':
        config.vendorsFile = args[++i];
        break;
      case '--output-dir':
        config.outputDir = args[++i];
        break;
      case '--top-n':
        config.topN = parseInt(args[++i], 10);
        break;
      case '--headful':
        config.headful = args[++i] === 'true';
        break;
      case '--max-domains':
        config.maxDomains = parseInt(args[++i], 10);
        break;
      case '--run-id':
        config.runId = args[++i];
        break;
      case '--excluded-sites':
        config.excludedSites = (args[++i] || '')
          .split(',')
          .map(site => site.trim())
          .filter(Boolean);
        break;
      case '--llm-base-url':
        config.llmBaseUrl = args[++i];
        break;
      case '--llm-model':
        config.llmModel = args[++i];
        break;
      // 注意：不支持 --llm-api-key 参数，API Key 必须通过环境变量 DEEPSEEK_API_KEY 设置
      // Phase 3 参数
      case '--phase3':
        config.phase3 = true;
        break;
      case '--url-list':
        config.urlList = args[++i];
        break;
      case '--archive-dir':
        config.archiveDir = args[++i];
        break;
      case '--timeout':
        config.timeout = parseInt(args[++i], 10);
        break;
      case '--max-size':
        config.maxSize = parseInt(args[++i], 10);
        break;
      default:
        // 忽略未知参数
        break;
    }
  }

  return config;
}

/**
 * 从 process.argv 解析参数
 * @returns {Object} 解析后的配置对象
 */
function parseArgsFromProcess() {
  const args = process.argv.slice(2);
  return parseArgs(args);
}

module.exports = {
  parseArgs,
  parseArgsFromProcess,
  getDefaultConfig
};
