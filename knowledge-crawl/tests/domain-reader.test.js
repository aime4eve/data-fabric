/**
 * Tests for domain-reader.js
 * 读取 domains_agg.csv 并构建候选域名处理队列
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  validateDomainsFile,
  readDomainsAgg,
  buildDomainQueue
} = require('../src/services/domain-reader');

describe('domain-reader', () => {
  const testDir = path.join(__dirname, 'fixtures', 'domain-reader-test');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('validateDomainsFile', () => {
    test('should return error when file does not exist', () => {
      const result = validateDomainsFile('/nonexistent/path.csv');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('not found'));
    });

    test('should return error when required fields are missing', () => {
      const filePath = path.join(testDir, 'missing-fields.csv');
      fs.writeFileSync(filePath, 'run_id,domain\n20260303-120000,example.com');

      const result = validateDomainsFile(filePath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('Missing required fields'));
    });

    test('should return valid when all required fields present', () => {
      const filePath = path.join(testDir, 'valid.csv');
      const header = 'run_id,domain_key,domain,min_rank,hit_count,queries,score,reason';
      fs.writeFileSync(filePath, `${header}\n20260303-120000,example.com,example.com,1,5,query1,85,Good match`);

      const result = validateDomainsFile(filePath);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error, null);
    });
  });

  describe('readDomainsAgg', () => {
    test('should read and parse domains_agg.csv correctly', () => {
      const filePath = path.join(testDir, 'domains-agg.csv');
      const content = `run_id,domain_key,domain,min_rank,hit_count,queries,score,reason
20260303-120000,example.com,example.com,1,5,"solenoid valve|LoRaWAN",85,Good match
20260303-120000,test.com,test.com,3,2,"solenoid valve",70,Medium match`;
      fs.writeFileSync(filePath, content);

      const result = readDomainsAgg(filePath);

      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].domain_key, 'example.com');
      assert.strictEqual(result[0].min_rank, 1);
      assert.strictEqual(result[0].hit_count, 5);
      assert.strictEqual(result[1].domain_key, 'test.com');
    });

    test('should handle CSV with quoted fields', () => {
      const filePath = path.join(testDir, 'quoted.csv');
      const content = `run_id,domain_key,domain,min_rank,hit_count,queries,score,reason
20260303-120000,example.com,example.com,1,5,"query1|query2|query3",85,"Good match, with comma"`;
      fs.writeFileSync(filePath, content);

      const result = readDomainsAgg(filePath);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].queries, 'query1|query2|query3');
      assert.strictEqual(result[0].reason, 'Good match, with comma');
    });

    test('should skip empty lines', () => {
      const filePath = path.join(testDir, 'empty-lines.csv');
      const content = `run_id,domain_key,domain,min_rank,hit_count,queries,score,reason

20260303-120000,example.com,example.com,1,5,query1,85,Good match

`;
      fs.writeFileSync(filePath, content);

      const result = readDomainsAgg(filePath);
      assert.strictEqual(result.length, 1);
    });

    test('should throw error for invalid file', () => {
      assert.throws(() => {
        readDomainsAgg('/nonexistent/file.csv');
      });
    });
  });

  describe('buildDomainQueue', () => {
    test('should build queue with correct structure', () => {
      const domains = [
        { domain_key: 'example.com', domain: 'example.com', min_rank: 1, hit_count: 5 },
        { domain_key: 'test.com', domain: 'test.com', min_rank: 3, hit_count: 2 }
      ];
      const runId = '20260304-120000';

      const queue = buildDomainQueue(domains, runId);

      assert.strictEqual(queue.length, 2);
      assert.strictEqual(queue[0].domain_key, 'example.com');
      assert.strictEqual(queue[0].run_id, runId);
      assert.ok(queue[0].paths);
      assert.ok(Array.isArray(queue[0].evidence_pages));
    });

    test('should include all 8 evidence paths', () => {
      const domains = [{ domain_key: 'example.com', domain: 'example.com' }];
      const queue = buildDomainQueue(domains, '20260304-120000');

      const expectedPaths = ['/', '/products', '/product', '/solutions', '/downloads', '/download', '/contact', '/about'];
      assert.deepStrictEqual(queue[0].paths, expectedPaths);
    });

    test('should sort by min_rank ascending', () => {
      const domains = [
        { domain_key: 'low.com', domain: 'low.com', min_rank: 10 },
        { domain_key: 'high.com', domain: 'high.com', min_rank: 1 },
        { domain_key: 'mid.com', domain: 'mid.com', min_rank: 5 }
      ];
      const queue = buildDomainQueue(domains, '20260304-120000');

      assert.strictEqual(queue[0].domain_key, 'high.com');
      assert.strictEqual(queue[1].domain_key, 'mid.com');
      assert.strictEqual(queue[2].domain_key, 'low.com');
    });

    test('should handle domains without min_rank (default to 999)', () => {
      const domains = [
        { domain_key: 'no-rank.com', domain: 'no-rank.com' },
        { domain_key: 'ranked.com', domain: 'ranked.com', min_rank: 5 }
      ];
      const queue = buildDomainQueue(domains, '20260304-120000');

      assert.strictEqual(queue[0].domain_key, 'ranked.com');
      assert.strictEqual(queue[1].domain_key, 'no-rank.com');
    });

    test('should respect maxDomains option', () => {
      const domains = [
        { domain_key: 'a.com', domain: 'a.com', min_rank: 1 },
        { domain_key: 'b.com', domain: 'b.com', min_rank: 2 },
        { domain_key: 'c.com', domain: 'c.com', min_rank: 3 }
      ];
      const queue = buildDomainQueue(domains, '20260304-120000', { maxDomains: 2 });

      assert.strictEqual(queue.length, 2);
      assert.strictEqual(queue[0].domain_key, 'a.com');
      assert.strictEqual(queue[1].domain_key, 'b.com');
    });

    test('should generate correct URLs for domain', () => {
      const domains = [{ domain_key: 'example.com', domain: 'www.example.com' }];
      const queue = buildDomainQueue(domains, '20260304-120000');

      assert.strictEqual(queue[0].base_url, 'https://www.example.com');
    });
  });
});
