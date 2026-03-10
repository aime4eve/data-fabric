/**
 * CLI 参数解析测试
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { parseArgs, getDefaultConfig } = require('../src/utils/cli');

describe('CLI Utils', () => {
  test('parseArgs should parse source-doc argument', () => {
    const args = ['--source-doc', './test.md'];
    const config = parseArgs(args);
    assert.strictEqual(config.sourceDoc, './test.md');
  });

  test('parseArgs should parse keywords-file argument', () => {
    const args = ['--keywords-file', './keywords.csv'];
    const config = parseArgs(args);
    assert.strictEqual(config.keywordsFile, './keywords.csv');
  });

  test('parseArgs should parse output-dir argument', () => {
    const args = ['--output-dir', './custom-outputs'];
    const config = parseArgs(args);
    assert.strictEqual(config.outputDir, './custom-outputs');
  });

  test('parseArgs should parse max-domains argument', () => {
    const args = ['--max-domains', '10'];
    const config = parseArgs(args);
    assert.strictEqual(config.maxDomains, 10);
  });

  test('parseArgs should parse run-id argument', () => {
    const args = ['--run-id', '20260303-142530'];
    const config = parseArgs(args);
    assert.strictEqual(config.runId, '20260303-142530');
  });

  test('parseArgs should return default values for missing arguments', () => {
    const config = parseArgs([]);
    assert.strictEqual(config.outputDir, './outputs');
    assert.strictEqual(config.topN, 20);
    assert.strictEqual(config.headful, true);
  });

  test('parseArgs should handle multiple arguments', () => {
    const args = [
      '--source-doc', './test.md',
      '--output-dir', './custom',
      '--max-domains', '5',
      '--run-id', '20260303-142530'
    ];
    const config = parseArgs(args);
    assert.strictEqual(config.sourceDoc, './test.md');
    assert.strictEqual(config.outputDir, './custom');
    assert.strictEqual(config.maxDomains, 5);
    assert.strictEqual(config.runId, '20260303-142530');
  });

  test('getDefaultConfig should return default configuration', () => {
    const defaults = getDefaultConfig();
    assert.strictEqual(defaults.outputDir, './outputs');
    assert.strictEqual(defaults.topN, 20);
    assert.strictEqual(defaults.headful, true);
    assert.strictEqual(defaults.maxDomains, null);
    assert.strictEqual(defaults.runId, null);
    assert.strictEqual(defaults.sourceDoc, null);
    assert.strictEqual(defaults.keywordsFile, null);
  });
});
