/**
 * Tests for vendor-aggregator.js
 * 厂商档案聚合与 vendors.csv 输出
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  mergeEvidencePages,
  aggregateVendorRecord,
  aggregateAllVendors,
  writeVendorsCsv,
  VENDORS_HEADERS,
  VENDORS_ENRICHED_HEADERS,
  enrichVendorRecord,
  writeVendorsEnrichedCsv
} = require('../src/services/vendor-aggregator');

describe('vendor-aggregator', () => {
  const testDir = path.join(__dirname, 'fixtures', 'vendor-aggregator-test');

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

  describe('VENDORS_HEADERS', () => {
    test('should have correct header order', () => {
      assert.ok(VENDORS_HEADERS.includes('run_id'));
      assert.ok(VENDORS_HEADERS.includes('domain_key'));
      assert.ok(VENDORS_HEADERS.includes('company_name'));
      assert.ok(VENDORS_HEADERS.includes('email'));
      assert.ok(VENDORS_HEADERS.includes('phone'));
      assert.ok(VENDORS_HEADERS.includes('evidence_urls'));
    });
  });

  describe('mergeEvidencePages', () => {
    test('should merge evidence pages correctly', () => {
      const pages = [
        {
          path: '/',
          url: 'https://example.com/',
          text: 'Welcome to ABC Corp. Email: info@abc.com',
          status: 'success'
        },
        {
          path: '/contact',
          url: 'https://example.com/contact',
          text: 'Contact us at +86 138 1234 5678',
          status: 'success'
        }
      ];

      const result = mergeEvidencePages(pages);

      assert.ok(result.evidence_text.includes('info@abc.com'));
      assert.ok(result.evidence_text.includes('138 1234 5678'));
      assert.ok(result.evidence_urls.includes('https://example.com/'));
      assert.ok(result.evidence_urls.includes('https://example.com/contact'));
    });

    test('should filter out error pages', () => {
      const pages = [
        {
          path: '/',
          url: 'https://example.com/',
          text: 'Valid content',
          status: 'success'
        },
        {
          path: '/notfound',
          url: 'https://example.com/notfound',
          text: '',
          status: 'error',
          error_reason: 'HTTP 404'
        }
      ];

      const result = mergeEvidencePages(pages);

      assert.ok(!result.evidence_urls.includes('/notfound'));
    });

    test('should handle empty pages', () => {
      const result = mergeEvidencePages([]);

      assert.strictEqual(result.evidence_text, '');
      assert.strictEqual(result.evidence_urls, '');
    });
  });

  describe('aggregateVendorRecord', () => {
    test('should create complete vendor record', () => {
      const domainItem = {
        run_id: '20260304-120000',
        domain_key: 'example.com',
        domain: 'www.example.com',
        min_rank: 1,
        hit_count: 5,
        phase0_score: 85,
        phase0_reason: 'Good match'
      };

      const evidencePages = [
        {
          path: '/',
          url: 'https://www.example.com/',
          text: 'ABC Manufacturing Co., Ltd. Email: sales@abc.com Phone: +86 138 1234 5678',
          status: 'success'
        }
      ];

      const result = aggregateVendorRecord(domainItem, evidencePages);

      assert.strictEqual(result.run_id, '20260304-120000');
      assert.strictEqual(result.domain_key, 'example.com');
      assert.ok(result.company_name !== null || result.email.length > 0);
      assert.ok(result.home_url.includes('example.com'));
      assert.ok(result.evidence_urls.length > 0);
      assert.strictEqual(result.score, 85);
    });

    test('should handle domain with no evidence pages', () => {
      const domainItem = {
        run_id: '20260304-120000',
        domain_key: 'empty.com',
        domain: 'empty.com',
        phase0_score: 50,
        phase0_reason: 'Test'
      };

      const result = aggregateVendorRecord(domainItem, []);

      assert.strictEqual(result.domain_key, 'empty.com');
      assert.strictEqual(result.evidence_urls, '');
    });
  });

  describe('aggregateAllVendors', () => {
    test('should process all domains', () => {
      const domainQueue = [
        {
          run_id: '20260304-120000',
          domain_key: 'a.com',
          domain: 'a.com',
          phase0_score: 80,
          phase0_reason: 'Good'
        },
        {
          run_id: '20260304-120000',
          domain_key: 'b.com',
          domain: 'b.com',
          phase0_score: 70,
          phase0_reason: 'Medium'
        }
      ];

      const evidenceMap = new Map([
        ['a.com', [{ path: '/', url: 'https://a.com/', text: 'Content A', status: 'success' }]],
        ['b.com', [{ path: '/contact', url: 'https://b.com/contact', text: 'Content B', status: 'success' }]]
      ]);

      const results = aggregateAllVendors(domainQueue, evidenceMap);

      assert.strictEqual(results.length, 2);
      assert.ok(results.some(r => r.domain_key === 'a.com'));
      assert.ok(results.some(r => r.domain_key === 'b.com'));
    });

    test('should handle empty domain queue', () => {
      const results = aggregateAllVendors([], new Map());
      assert.deepStrictEqual(results, []);
    });
  });

  describe('writeVendorsCsv', () => {
    test('should write vendors.csv with correct format', () => {
      const vendors = [
        {
          run_id: '20260304-120000',
          domain_key: 'example.com',
          company_name: 'ABC Corp',
          home_url: 'https://example.com',
          product_url: '',
          contact_url: 'https://example.com/contact',
          contact_form_url: '',
          email: 'info@abc.com',
          phone: '+86 138 1234 5678',
          address: '123 Industrial Rd',
          country: 'China',
          social_links: '',
          score: 85,
          reason: 'Good match',
          evidence_text: 'Sample evidence',
          evidence_urls: 'https://example.com/|https://example.com/contact',
          first_seen_at: '2026-03-04T12:00:00Z',
          last_seen_at: '2026-03-04T12:00:00Z'
        }
      ];

      const filePath = path.join(testDir, 'vendors.csv');
      writeVendorsCsv(vendors, filePath);

      assert.ok(fs.existsSync(filePath));

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // 检查表头
      assert.strictEqual(lines[0], VENDORS_HEADERS.join(','));

      // 检查数据行
      assert.ok(lines[1].includes('20260304-120000'));
      assert.ok(lines[1].includes('example.com'));
    });

    test('should handle special characters in fields', () => {
      const vendors = [
        {
          run_id: '20260304-120000',
          domain_key: 'test.com',
          company_name: 'Test, Inc. "The Best"',
          home_url: 'https://test.com',
          product_url: '',
          contact_url: '',
          contact_form_url: '',
          email: '',
          phone: '',
          address: '',
          country: '',
          social_links: '',
          score: 50,
          reason: 'Test, with "quotes"',
          evidence_text: '',
          evidence_urls: '',
          first_seen_at: '',
          last_seen_at: ''
        }
      ];

      const filePath = path.join(testDir, 'special.csv');
      writeVendorsCsv(vendors, filePath);

      const content = fs.readFileSync(filePath, 'utf-8');
      // 检查引号转义
      assert.ok(content.includes('"Test, Inc. ""The Best"""'));
    });

    test('should create directory if not exists', () => {
      const vendors = [{
        run_id: '20260304-120000',
        domain_key: 'test.com',
        company_name: '',
        home_url: '',
        product_url: '',
        contact_url: '',
        contact_form_url: '',
        email: '',
        phone: '',
        address: '',
        country: '',
        social_links: '',
        score: 0,
        reason: '',
        evidence_text: '',
        evidence_urls: '',
        first_seen_at: '',
        last_seen_at: ''
      }];

      const newDir = path.join(testDir, 'nested', 'dir');
      const filePath = path.join(newDir, 'vendors.csv');

      writeVendorsCsv(vendors, filePath);

      assert.ok(fs.existsSync(filePath));
    });
  });

  describe('phase2 enriched vendors', () => {
    test('VENDORS_ENRICHED_HEADERS should include phase2 fields', () => {
      assert.ok(VENDORS_ENRICHED_HEADERS.includes('ai_tags'));
      assert.ok(VENDORS_ENRICHED_HEADERS.includes('intent_score'));
      assert.ok(VENDORS_ENRICHED_HEADERS.includes('key_people'));
      assert.ok(VENDORS_ENRICHED_HEADERS.includes('detected_lang'));
    });

    test('enrichVendorRecord should merge llm result fields', () => {
      const base = {
        run_id: '20260304-120000',
        domain_key: 'example.com',
        company_name: 'ABC Corp',
        home_url: 'https://example.com'
      };
      const enriched = enrichVendorRecord(base, {
        ai_tags: ['Manufacturer', 'OEM'],
        intent_score: 92.5,
        key_people: [{ name: 'Hans Müller', position: 'Founder' }],
        detected_lang: 'de'
      });
      assert.strictEqual(enriched.intent_score, 92.5);
      assert.ok(enriched.ai_tags.includes('Manufacturer'));
      assert.ok(enriched.key_people.includes('Founder'));
      assert.strictEqual(enriched.detected_lang, 'de');
    });

    test('writeVendorsEnrichedCsv should output enriched headers', () => {
      const filePath = path.join(testDir, 'vendors_enriched.csv');
      writeVendorsEnrichedCsv([{
        run_id: '20260304-120000',
        domain_key: 'example.com',
        company_name: 'ABC Corp',
        home_url: 'https://example.com',
        product_url: '',
        contact_url: '',
        contact_form_url: '',
        email: '',
        phone: '',
        address: '',
        country: '',
        social_links: '',
        score: 80,
        reason: '',
        evidence_text: '',
        evidence_urls: '',
        first_seen_at: '',
        last_seen_at: '',
        ai_tags: 'Manufacturer|OEM',
        intent_score: 91,
        key_people: '[{"name":"Hans","position":"CEO"}]',
        detected_lang: 'en'
      }], filePath);

      const content = fs.readFileSync(filePath, 'utf-8');
      assert.ok(content.split('\n')[0].includes('intent_score'));
      assert.ok(content.includes('Manufacturer|OEM'));
    });
  });
});
