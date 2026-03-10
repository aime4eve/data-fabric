/**
 * 运行上下文测试
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createContext, initOutputDir } = require('../src/utils/context');

const testOutputDir = './test-outputs';

describe('Context Utils', () => {
  beforeEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
  });

  test('createContext should create context with provided config', () => {
    const config = {
      sourceDoc: './test.md',
      outputDir: testOutputDir,
      runId: '20260303-142530'
    };

    const context = createContext(config);

    assert.strictEqual(context.runId, '20260303-142530');
    assert.strictEqual(context.config.sourceDoc, './test.md');
    assert.strictEqual(context.config.outputDir, testOutputDir);
    assert.ok(context.startedAt);
    assert.ok(context.stats);
  });

  test('createContext should auto-generate runId if not provided', () => {
    const config = { outputDir: testOutputDir };
    const context = createContext(config);

    assert.ok(context.runId);
    assert.ok(/^\d{8}-\d{6}$/.test(context.runId));
  });

  test('createContext should initialize stats object', () => {
    const config = { outputDir: testOutputDir };
    const context = createContext(config);

    assert.deepStrictEqual(context.stats, {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      totalSerpResults: 0,
      uniqueDomains: 0
    });
  });

  test('initOutputDir should create output directory structure', () => {
    const config = {
      outputDir: testOutputDir,
      runId: '20260303-142530'
    };

    const context = createContext(config);
    initOutputDir(context);

    const expectedPath = path.join(testOutputDir, '20260303-142530');
    assert.ok(fs.existsSync(expectedPath));

    // 清理
    fs.rmSync(testOutputDir, { recursive: true });
  });

  test('initOutputDir should set output path in context', () => {
    const config = {
      outputDir: testOutputDir,
      runId: '20260303-142530'
    };

    const context = createContext(config);
    initOutputDir(context);

    const expectedPath = path.resolve(path.join(testOutputDir, '20260303-142530'));
    assert.strictEqual(context.outputPath, expectedPath);

    // 清理
    fs.rmSync(testOutputDir, { recursive: true });
  });
});
