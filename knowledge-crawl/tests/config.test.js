/**
 * config.js 模块测试
 * TDD: Phase 4 配置集中管理
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// 测试配置文件路径
const TEST_ENV_PATH = path.join(__dirname, '.env.test');
const SAMPLE_ENV_CONTENT = `
# Test environment variables
DEEPSEEK_API_KEY=test-api-key-12345
LLM_BASE_URL=https://api.test.com
LLM_MODEL=test-model
CONCURRENCY_LIMIT=5
LOG_LEVEL=debug
`;

describe('Config Module', () => {
  let originalEnv;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };
    // 清理测试相关的环境变量
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_MODEL;
    delete process.env.CONCURRENCY_LIMIT;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
    // 清理测试 .env 文件
    if (fs.existsSync(TEST_ENV_PATH)) {
      fs.unlinkSync(TEST_ENV_PATH);
    }
    // 清除模块缓存
    delete require.cache[require.resolve('../src/utils/config')];
  });

  describe('loadConfig', () => {
    it('should load configuration from environment variables', () => {
      process.env.DEEPSEEK_API_KEY = 'env-api-key';
      process.env.LLM_BASE_URL = 'https://env.test.com';
      process.env.CONCURRENCY_LIMIT = '3';

      const { loadConfig } = require('../src/utils/config');
      const config = loadConfig();

      assert.strictEqual(config.llmApiKey, 'env-api-key');
      assert.strictEqual(config.llmBaseUrl, 'https://env.test.com');
      assert.strictEqual(config.concurrencyLimit, 3);
    });

    it('should use default values when env vars not set', () => {
      const { loadConfig } = require('../src/utils/config');
      const config = loadConfig();

      assert.strictEqual(config.llmBaseUrl, 'https://api.deepseek.com');
      assert.strictEqual(config.llmModel, 'deepseek-chat');
      assert.strictEqual(config.concurrencyLimit, 3);
      assert.strictEqual(config.logLevel, 'info');
    });

    it('should load configuration from .env file', () => {
      // 创建测试 .env 文件
      fs.writeFileSync(TEST_ENV_PATH, SAMPLE_ENV_CONTENT.trim());

      const { loadConfig } = require('../src/utils/config');
      const config = loadConfig({ envPath: TEST_ENV_PATH });

      assert.strictEqual(config.llmApiKey, 'test-api-key-12345');
      assert.strictEqual(config.llmBaseUrl, 'https://api.test.com');
      assert.strictEqual(config.llmModel, 'test-model');
      assert.strictEqual(config.concurrencyLimit, 5);
      assert.strictEqual(config.logLevel, 'debug');
    });

    it('should prioritize env vars over .env file', () => {
      fs.writeFileSync(TEST_ENV_PATH, SAMPLE_ENV_CONTENT.trim());
      process.env.DEEPSEEK_API_KEY = 'priority-key';

      const { loadConfig } = require('../src/utils/config');
      const config = loadConfig({ envPath: TEST_ENV_PATH });

      assert.strictEqual(config.llmApiKey, 'priority-key');
    });

    it('should merge CLI args with config', () => {
      process.env.CONCURRENCY_LIMIT = '2';

      const { loadConfig } = require('../src/utils/config');
      const config = loadConfig({ cliArgs: { concurrencyLimit: 10 } });

      // CLI args 应该覆盖 env
      assert.strictEqual(config.concurrencyLimit, 10);
    });
  });

  describe('getEffectiveConfig', () => {
    it('should return merged config with CLI overrides', () => {
      process.env.LLM_BASE_URL = 'https://env.test.com';

      const { loadConfig, getEffectiveConfig } = require('../src/utils/config');
      loadConfig();

      const effective = getEffectiveConfig({
        llmBaseUrl: 'https://cli.override.com',
        maxDomains: 100
      });

      assert.strictEqual(effective.llmBaseUrl, 'https://cli.override.com');
      assert.strictEqual(effective.maxDomains, 100);
    });
  });

  describe('validateConfig', () => {
    it('should validate required fields', () => {
      const { loadConfig, validateConfig } = require('../src/utils/config');
      const config = loadConfig();

      // 没有设置 API Key 时应该发出警告但不抛错
      const result = validateConfig(config);
      assert.strictEqual(result.valid, true);
      assert.ok(result.warnings.includes('DEEPSEEK_API_KEY'));
    });

    it('should validate concurrency limit range', () => {
      const { loadConfig, validateConfig } = require('../src/utils/config');
      const config = loadConfig({ cliArgs: { concurrencyLimit: 20 } });

      const result = validateConfig(config);
      assert.strictEqual(result.valid, true);
      // 20 应该在合理范围内
    });

    it('should reject invalid concurrency limit', () => {
      const { loadConfig, validateConfig } = require('../src/utils/config');
      const config = loadConfig({ cliArgs: { concurrencyLimit: -1 } });

      const result = validateConfig(config);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('concurrency')));
    });
  });
});
