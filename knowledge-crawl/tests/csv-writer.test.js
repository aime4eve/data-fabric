/**
 * CSV 写入测试
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { writeSerpResults, writeDomainsAgg, escapeCSV } = require('../src/utils/csv-writer');

const testOutputDir = './test-outputs-csv';

describe('CSV Writer', () => {
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

  test('escapeCSV should escape values with commas', () => {
    const result = escapeCSV('hello, world');
    assert.strictEqual(result, '"hello, world"');
  });

  test('escapeCSV should escape values with quotes', () => {
    const result = escapeCSV('say "hello"');
    assert.strictEqual(result, '"say ""hello"""');
  });

  test('escapeCSV should handle empty values', () => {
    const result = escapeCSV('');
    assert.strictEqual(result, '');
  });

  test('escapeCSV should handle null values', () => {
    const result = escapeCSV(null);
    assert.strictEqual(result, '');
  });

  test('writeSerpResults should write SERP results to CSV with correct headers', () => {
    const results = [
      {
        run_id: '20260303-142530',
        captured_at: '2026-03-03 14:25:30',
        query: 'solenoid valve',
        rank: 1,
        title: 'Example Title',
        snippet: 'Example snippet',
        url: 'https://example.com/',
        normalized_url: 'https://example.com',
        domain: 'example.com',
        domain_key: 'example.com',
        error_reason: ''
      }
    ];

    const filePath = path.join(testOutputDir, 'serp_results_raw.csv');
    writeSerpResults(results, filePath);

    assert.ok(fs.existsSync(filePath));

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    assert.ok(lines[0].includes('run_id'));
    assert.ok(lines[0].includes('query'));
    assert.ok(lines[0].includes('rank'));
    assert.ok(lines[0].includes('url'));
    assert.ok(lines[0].includes('domain_key'));
  });

  test('writeDomainsAgg should write domain aggregation results to CSV', () => {
    const domains = [
      {
        run_id: '20260303-142530',
        domain_key: 'example.com',
        domain: 'example.com',
        min_rank: 1,
        hit_count: 3,
        queries: 'query1|query2|query3',
        score: 85,
        reason: '排名靠前; 多次命中'
      }
    ];

    const filePath = path.join(testOutputDir, 'domains_agg.csv');
    writeDomainsAgg(domains, filePath);

    assert.ok(fs.existsSync(filePath));

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    assert.ok(lines[0].includes('domain_key'));
    assert.ok(lines[0].includes('min_rank'));
    assert.ok(lines[0].includes('hit_count'));
    assert.ok(lines[0].includes('score'));
    assert.ok(lines[0].includes('reason'));
  });
});
