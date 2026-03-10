/**
 * 结构化日志模块
 * Phase 4: 统一日志管理
 */

const fs = require('fs');
const path = require('path');

// 日志级别定义
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// 当前日志级别（全局）
let currentLogLevel = 'info';

// 默认上下文
let defaultContext = {};

/**
 * 设置全局日志级别
 * @param {string} level - 日志级别 (debug/info/warn/error)
 */
function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = level;
  }
}

/**
 * 设置默认上下文
 * @param {Object} context - 上下文对象
 */
function setLogContext(context) {
  defaultContext = { ...context };
}

/**
 * 格式化时间戳
 * @returns {string} ISO 格式时间戳
 */
function formatTimestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * 创建日志记录器
 * @param {Object} options - 配置选项
 * @param {string} [options.level] - 日志级别
 * @param {string} [options.file] - 日志文件路径
 * @param {Object} [options.context] - 额外上下文
 * @returns {Object} 日志记录器
 */
function createLogger(options = {}) {
  const level = options.level || currentLogLevel;
  const file = options.file;
  const context = { ...defaultContext, ...(options.context || {}) };

  // 确保日志目录存在
  if (file) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 写入日志
   * @param {string} logLevel - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 额外元数据
   */
  function log(logLevel, message, meta = {}) {
    // 检查日志级别
    if (LOG_LEVELS[logLevel] < LOG_LEVELS[level]) {
      return;
    }

    // 构建日志行
    const timestamp = formatTimestamp();
    const levelStr = `[${logLevel.toUpperCase()}]`;
    const contextStr = Object.keys(context).length > 0
      ? ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}]`
      : '';
    const metaStr = Object.keys(meta).length > 0
      ? ` ${JSON.stringify(meta)}`
      : '';

    const logLine = `${timestamp} ${levelStr}${contextStr} ${message}${metaStr}\n`;

    // 输出到控制台
    if (logLevel === 'error') {
      console.error(logLine.trim());
    } else if (logLevel === 'warn') {
      console.warn(logLine.trim());
    } else {
      console.log(logLine.trim());
    }

    // 写入文件
    if (file) {
      fs.appendFileSync(file, logLine);
    }
  }

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    setLevel: (newLevel) => {
      options.level = newLevel;
    }
  };
}

/**
 * 获取日志级别数值
 * @param {string} level - 日志级别
 * @returns {number} 级别数值
 */
function getLogLevelValue(level) {
  return LOG_LEVELS[level] ?? LOG_LEVELS.info;
}

module.exports = {
  createLogger,
  setLogLevel,
  setLogContext,
  getLogLevelValue,
  LOG_LEVELS
};
