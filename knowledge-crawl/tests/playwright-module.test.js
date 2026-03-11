/**
 * Playwright 模块加载测试
 * 验证 playwright 包正确安装并可被加载
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Playwright Module', () => {
  test('should successfully load playwright module', () => {
    // 这个测试验证 playwright 包已正确安装
    let playwright;
    let error = null;

    try {
      playwright = require('playwright');
    } catch (e) {
      error = e;
    }

    assert.strictEqual(error, null, `Failed to load playwright: ${error?.message}`);
    assert.ok(playwright, 'playwright module should be defined');
  });

  test('should expose chromium browser type', () => {
    const { chromium } = require('playwright');

    assert.ok(chromium, 'chromium should be defined');
    assert.strictEqual(typeof chromium.launch, 'function', 'chromium.launch should be a function');
    assert.strictEqual(typeof chromium.launchPersistentContext, 'function', 'chromium.launchPersistentContext should be a function');
  });

  test('should expose firefox browser type', () => {
    const { firefox } = require('playwright');

    assert.ok(firefox, 'firefox should be defined');
    assert.strictEqual(typeof firefox.launch, 'function', 'firefox.launch should be a function');
  });

  test('should expose webkit browser type', () => {
    const { webkit } = require('playwright');

    assert.ok(webkit, 'webkit should be defined');
    assert.strictEqual(typeof webkit.launch, 'function', 'webkit.launch should be a function');
  });
});
