/**
 * 配置集中管理模块
 * Phase 4: 统一管理环境变量和 CLI 参数
 */

const fs = require('fs');
const path = require('path');

// 默认配置值
const DEFAULTS = {
  llmBaseUrl: 'https://api.deepseek.com',
  llmModel: 'deepseek-chat',
  llmApiKey: '',
  concurrencyLimit: 3,
  logLevel: 'info',
  maxDomains: null,
  timeout: 30000,
  maxSize: 10240
};

// 配置验证规则
const CONFIG_RULES = {
  concurrencyLimit: {
    min: 1,
    max: 20
  },
  timeout: {
    min: 5000,
    max: 120000
  },
  maxSize: {
    min: 1024,
    max: 102400
  }
};

/**
 * 从 .env 文件加载环境变量
 * @param {Object} options - 选项
 * @param {string} [options.envPath] - .env 文件路径
 * @returns {Object} 配置对象
 */
function loadEnvFile(envPath) {
  if (!envPath) {
    // 默认查找项目根目录的 .env 文件
    envPath = path.join(process.cwd(), '.env');
  }

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    // 跳过空行和注释
    if (!line || line.startsWith('#')) return;

    const eqIndex = line.indexOf('=');
    if (eqIndex > 0) {
      const key = line.slice(0, eqIndex).trim();
      let value = line.slice(eqIndex + 1).trim();
      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  });

  return env;
}

/**
 * 解析数值配置
 * @param {string|number} value - 配置值
 * @param {number} defaultValue - 默认值
 * @returns {number} 解析后的数值
 */
function parseNumber(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 加载配置
 * @param {Object} options - 选项
 * @param {string} [options.envPath] - .env 文件路径
 * @param {Object} [options.cliArgs] - CLI 参数（覆盖 env）
 * @returns {Object} 配置对象
 */
function loadConfig(options = {}) {
  const { envPath, cliArgs = {} } = options;

  // 1. 加载 .env 文件
  const envFile = loadEnvFile(envPath);

  // 2. 合并配置源（优先级：CLI > process.env > .env > DEFAULTS）
  const config = {
    llmApiKey: cliArgs.llmApiKey || process.env.DEEPSEEK_API_KEY || envFile.DEEPSEEK_API_KEY || DEFAULTS.llmApiKey,
    llmBaseUrl: cliArgs.llmBaseUrl || process.env.LLM_BASE_URL || envFile.LLM_BASE_URL || DEFAULTS.llmBaseUrl,
    llmModel: cliArgs.llmModel || process.env.LLM_MODEL || envFile.LLM_MODEL || DEFAULTS.llmModel,
    concurrencyLimit: parseNumber(
      cliArgs.concurrencyLimit || process.env.CONCURRENCY_LIMIT || envFile.CONCURRENCY_LIMIT,
      DEFAULTS.concurrencyLimit
    ),
    logLevel: cliArgs.logLevel || process.env.LOG_LEVEL || envFile.LOG_LEVEL || DEFAULTS.logLevel,
    maxDomains: parseNumber(
      cliArgs.maxDomains || process.env.MAX_DOMAINS || envFile.MAX_DOMAINS,
      DEFAULTS.maxDomains
    ),
    timeout: parseNumber(
      cliArgs.timeout || process.env.TIMEOUT || envFile.TIMEOUT,
      DEFAULTS.timeout
    ),
    maxSize: parseNumber(
      cliArgs.maxSize || process.env.MAX_SIZE || envFile.MAX_SIZE,
      DEFAULTS.maxSize
    )
  };

  return config;
}

/**
 * 获取有效配置（合并 CLI 参数）
 * @param {Object} cliConfig - CLI 解析的配置
 * @returns {Object} 有效配置
 */
function getEffectiveConfig(cliConfig = {}) {
  const baseConfig = loadConfig();
  return {
    ...baseConfig,
    ...cliConfig,
    // 确保 API Key 始终从环境变量读取（安全）
    llmApiKey: process.env.DEEPSEEK_API_KEY || baseConfig.llmApiKey
  };
}

/**
 * 验证配置
 * @param {Object} config - 配置对象
 * @returns {Object} 验证结果 { valid, errors, warnings }
 */
function validateConfig(config) {
  const errors = [];
  const warnings = [];

  // 检查必需的 API Key（警告而非错误)
  if (!config.llmApiKey) {
    warnings.push('DEEPSEEK_API_KEY');
  }

  // 验证并发限制范围
  const ccRule = CONFIG_RULES.concurrencyLimit;
  if (config.concurrencyLimit < ccRule.min || config.concurrencyLimit > ccRule.max) {
    errors.push(`concurrencyLimit must be between ${ccRule.min} and ${ccRule.max}, got ${config.concurrencyLimit}`);
  }

  // 验证超时范围
  const timeoutRule = CONFIG_RULES.timeout;
  if (config.timeout < timeoutRule.min || config.timeout > timeoutRule.max) {
    errors.push(`timeout must be between ${timeoutRule.min}ms and ${timeoutRule.max}ms, got ${config.timeout}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  loadConfig,
  getEffectiveConfig,
  validateConfig,
  DEFAULTS,
  CONFIG_RULES
};
