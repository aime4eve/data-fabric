/**
 * Manifest 写入测试
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { writeManifest, createManifest } = require('../src/utils/manifest-writer');

const testOutputDir = './test-outputs-manifest';

describe('Manifest Writer', () => {
  beforeEach(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
  });

  test('createManifest should create manifest from context', () => {
    const context = {
      runId: '20260303-142530',
      startedAt: '2026-03-03 14:25:30',
      finishedAt: '2026-03-03 14:35:30',
      config: {
        sourceDoc: './test.md',
        keywordsFile: null,
        outputDir: './outputs'
      },
      stats: {
        totalQueries: 10,
        successfulQueries: 8,
        failedQueries: 2,
        totalSerpResults: 160,
        uniqueDomains: 45
      },
      errors: [
        { query: 'test query', error: 'timeout' }
      ]
    };

    const manifest = createManifest(context);

    assert.strictEqual(manifest.run_id, '20260303-142530');
    assert.strictEqual(manifest.started_at, '2026-03-03 14:25:30');
    assert.strictEqual(manifest.finished_at, '2026-03-03 14:35:30');
    assert.strictEqual(manifest.config.source_doc, './test.md');
    assert.strictEqual(manifest.stats.total_queries, 10);
    assert.strictEqual(manifest.errors.length, 1);
  });

  test('writeManifest should write manifest to JSON file', () => {
    const context = {
      runId: '20260303-142530',
      startedAt: '2026-03-03 14:25:30',
      finishedAt: '2026-03-03 14:35:30',
      config: {
        sourceDoc: './test.md',
        keywordsFile: null,
        outputDir: './outputs'
      },
      stats: {
        totalQueries: 5,
        successfulQueries: 5,
        failedQueries: 0,
        totalSerpResults: 100,
        uniqueDomains: 30
      },
      errors: []
    };

    const filePath = path.join(testOutputDir, 'run_manifest.json');
    writeManifest(context, filePath);

    assert.ok(fs.existsSync(filePath));

    const content = fs.readFileSync(filePath, 'utf-8');
    const manifest = JSON.parse(content);

    assert.strictEqual(manifest.run_id, '20260303-142530');
    assert.strictEqual(manifest.stats.total_queries, 5);
  });

  test('writeManifest should format JSON with proper indentation', () => {
    const context = {
      runId: '20260303-142530',
      startedAt: '2026-03-03 14:25:30',
      finishedAt: '2026-03-03 14:35:30',
      config: {},
      stats: {},
      errors: []
    };

    const filePath = path.join(testOutputDir, 'formatted.json');
    writeManifest(context, filePath);

    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes('\n'));
    assert.ok(content.includes('  '));
  });
});
