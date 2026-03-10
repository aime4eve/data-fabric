/**
 * 域名聚合测试
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { aggregateDomains, createDomainRecord } = require('../src/services/domain-aggregator');

describe('Domain Aggregator', () => {
  test('createDomainRecord should create a domain record from SERP result', () => {
    const serpResult = {
      run_id: '20260303-142530',
      query: 'solenoid valve controller',
      rank: 1,
      title: 'Example Solenoid Valves',
      snippet: 'Best solenoid valves for irrigation',
      url: 'https://www.example.com/products',
      normalized_url: 'https://www.example.com/products',
      domain: 'www.example.com',
      domain_key: 'example.com'
    };

    const record = createDomainRecord(serpResult);

    assert.strictEqual(record.run_id, '20260303-142530');
    assert.strictEqual(record.domain_key, 'example.com');
    assert.strictEqual(record.domain, 'www.example.com');
    assert.strictEqual(record.min_rank, 1);
    assert.strictEqual(record.hit_count, 1);
    assert.strictEqual(record.queries, 'solenoid valve controller');
  });

  test('aggregateDomains should aggregate results by domain_key', () => {
    const serpResults = [
      {
        run_id: '20260303-142530',
        query: 'solenoid valve',
        rank: 1,
        title: 'Example Valves',
        snippet: 'Solenoid valves',
        url: 'https://www.example.com/',
        normalized_url: 'https://www.example.com',
        domain: 'www.example.com',
        domain_key: 'example.com'
      },
      {
        run_id: '20260303-142530',
        query: 'solenoid valve controller',
        rank: 3,
        title: 'Example Controllers',
        snippet: 'Valve controllers',
        url: 'https://www.example.com/controllers',
        normalized_url: 'https://www.example.com/controllers',
        domain: 'www.example.com',
        domain_key: 'example.com'
      },
      {
        run_id: '20260303-142530',
        query: 'solenoid valve',
        rank: 5,
        title: 'Another Site',
        snippet: 'Another vendor',
        url: 'https://another.com/',
        normalized_url: 'https://another.com',
        domain: 'another.com',
        domain_key: 'another.com'
      }
    ];

    const aggregated = aggregateDomains(serpResults);

    assert.strictEqual(aggregated.length, 2);

    const exampleDomain = aggregated.find(d => d.domain_key === 'example.com');
    assert.strictEqual(exampleDomain.hit_count, 2);
    assert.strictEqual(exampleDomain.min_rank, 1);
    assert.ok(exampleDomain.queries.includes('solenoid valve'));

    const anotherDomain = aggregated.find(d => d.domain_key === 'another.com');
    assert.strictEqual(anotherDomain.hit_count, 1);
    assert.strictEqual(anotherDomain.min_rank, 5);
  });

  test('aggregateDomains should track min_rank correctly', () => {
    const serpResults = [
      { run_id: 'test', query: 'test', rank: 10, url: 'https://example.com/a', domain_key: 'example.com' },
      { run_id: 'test', query: 'test', rank: 3, url: 'https://example.com/b', domain_key: 'example.com' },
      { run_id: 'test', query: 'test', rank: 7, url: 'https://example.com/c', domain_key: 'example.com' }
    ];

    const aggregated = aggregateDomains(serpResults);
    assert.strictEqual(aggregated[0].min_rank, 3);
  });

  test('aggregateDomains should handle empty results', () => {
    const aggregated = aggregateDomains([]);
    assert.deepStrictEqual(aggregated, []);
  });
});
