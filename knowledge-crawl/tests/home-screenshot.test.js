/**
 * Phase 0 首页截图功能测试
 * 测试 captureHomeScreenshots 函数
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 测试目录
const TEST_DIR = path.join(os.tmpdir(), 'home-screenshot-test-' + Date.now());

describe('Home Screenshot Directory', () => {
  beforeEach(() => {
    // 创建测试目录
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // 清理测试目录
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should create screenshots directory if not exists', () => {
    const screenshotDir = path.join(TEST_DIR, 'screenshots');

    // 验证初始状态：目录不存在
    assert.strictEqual(fs.existsSync(screenshotDir), false);

    // 创建目录
    fs.mkdirSync(screenshotDir, { recursive: true });

    // 验证目录已创建
    assert.strictEqual(fs.existsSync(screenshotDir), true);
  });

  test('should not throw if screenshots directory already exists', () => {
    const screenshotDir = path.join(TEST_DIR, 'screenshots');

    // 创建目录
    fs.mkdirSync(screenshotDir, { recursive: true });

    // 再次创建不应抛出错误
    assert.doesNotThrow(() => {
      fs.mkdirSync(screenshotDir, { recursive: true });
    });
  });
});

describe('captureHomeScreenshots function', () => {
  test('should be exported from serp-collector module', () => {
    const { captureHomeScreenshots } = require('../src/services/serp-collector');
    assert.ok(captureHomeScreenshots, 'captureHomeScreenshots should be exported');
    assert.strictEqual(typeof captureHomeScreenshots, 'function', 'captureHomeScreenshots should be a function');
  });

  test('should return array of screenshot results', async () => {
    const { captureHomeScreenshots } = require('../src/services/serp-collector');

    const domains = ['example.com'];
    const screenshotDir = path.join(TEST_DIR, 'screenshots');
    fs.mkdirSync(screenshotDir, { recursive: true });

    // 使用空 page 模拟（实际测试需要 mock）
    const results = await captureHomeScreenshots(null, domains, screenshotDir, 'test-run-id');

    // 应该返回结果数组（即使是空的或错误结果）
    assert.ok(Array.isArray(results), 'should return an array');
  });

  test('should handle empty domains array', async () => {
    const { captureHomeScreenshots } = require('../src/services/serp-collector');

    const results = await captureHomeScreenshots(null, [], TEST_DIR, 'test-run-id');

    assert.ok(Array.isArray(results), 'should return an array');
    assert.strictEqual(results.length, 0, 'should return empty array for empty domains');
  });

  test('should handle null page gracefully', async () => {
    const { captureHomeScreenshots } = require('../src/services/serp-collector');

    const domains = ['example.com'];
    const screenshotDir = path.join(TEST_DIR, 'screenshots');
    fs.mkdirSync(screenshotDir, { recursive: true });

    // null page 应该返回错误结果而不是抛出异常
    const results = await captureHomeScreenshots(null, domains, screenshotDir, 'test-run-id');

    assert.ok(Array.isArray(results), 'should return an array');
    assert.strictEqual(results.length, 1, 'should return one result');
    assert.strictEqual(results[0].status, 'error', 'should have error status');
    assert.ok(results[0].error_reason, 'should have error reason');
  });
});
