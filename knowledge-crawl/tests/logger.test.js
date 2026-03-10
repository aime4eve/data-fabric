/**
 * logger.js 模块测试
 * TDD: Phase 4 结构化日志
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Logger Module', () => {
  const logDir = path.join(__dirname, 'logs-test');
  const logFile = path.join(logDir, 'app.log');

  beforeEach(() => {
    // 清理测试日志目录
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true });
    }
  });

  afterEach(() => {
    // 清理测试日志目录
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true });
    }
  });

  describe('createLogger', () => {
    it('should create logger with default settings', () => {
      const { createLogger } = require('../src/utils/logger');
      const logger = createLogger();

      assert.ok(logger);
      assert.strictEqual(typeof logger.info, 'function');
      assert.strictEqual(typeof logger.warn, 'function');
      assert.strictEqual(typeof logger.error, 'function');
      assert.strictEqual(typeof logger.debug, 'function');
    });

    it('should create logger with custom log level', () => {
      const { createLogger, setLogLevel } = require('../src/utils/logger');
      const logger = createLogger({ level: 'debug' });

      setLogLevel('debug');
      // debug 级别应该能记录所有级别的日志
      assert.ok(logger);
    });

    it('should write to file when file transport is enabled', () => {
      const { createLogger } = require('../src/utils/logger');
      const logger = createLogger({
        file: logFile,
        level: 'info'
      });

      logger.info('Test log message');

      // 检查文件是否创建
      assert.ok(fs.existsSync(logFile));
      const content = fs.readFileSync(logFile, 'utf-8');
      assert.ok(content.includes('Test log message'));
    });
  });

  describe('Log Levels', () => {
    it('should respect log level hierarchy', () => {
      const { createLogger, setLogLevel } = require('../src/utils/logger');
      const logger = createLogger({
        file: logFile,
        level: 'warn'
      });

      setLogLevel('warn');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const content = fs.readFileSync(logFile, 'utf-8');

      // debug 和 info 不应该被记录
      assert.ok(!content.includes('Debug message'));
      assert.ok(!content.includes('Info message'));
      // warn 和 error 应该被记录
      assert.ok(content.includes('Warn message'));
      assert.ok(content.includes('Error message'));
    });
  });

  describe('Log Format', () => {
    it('should include timestamp and level in log output', () => {
      const { createLogger } = require('../src/utils/logger');
      const logger = createLogger({
        file: logFile,
        level: 'info'
      });

      logger.info('Test message');

      const content = fs.readFileSync(logFile, 'utf-8');

      // 检查格式包含时间戳和级别
      assert.ok(/\d{4}-\d{2}-\d{2}/.test(content)); // 日期
      assert.ok(/\[INFO\]/.test(content)); // 级别
    });

    it('should include context metadata when provided', () => {
      const { createLogger } = require('../src/utils/logger');
      const logger = createLogger({
        file: logFile,
        level: 'info',
        context: { runId: 'test-run-123', phase: 1 }
      });

      logger.info('Test with context');

      const content = fs.readFileSync(logFile, 'utf-8');
      assert.ok(content.includes('test-run-123'));
      assert.ok(content.includes('phase'));
    });
  });
});
