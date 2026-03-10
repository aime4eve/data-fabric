/**
 * 查询生成测试
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  generateQueries,
  deduplicateQueries,
  expandSynonyms,
  applyQueryExclusions
} = require('../src/services/query-generator');

describe('Query Generator', () => {
  test('expandSynonyms should expand keywords with synonyms', () => {
    const keywords = ['solenoid valve', 'controller'];
    const synonymMap = {
      'solenoid valve': ['electromagnetic valve', 'valve'],
      'controller': ['control unit']
    };

    const expanded = expandSynonyms(keywords, synonymMap);

    assert.ok(expanded.includes('solenoid valve'));
    assert.ok(expanded.includes('electromagnetic valve'));
    assert.ok(expanded.includes('controller'));
    assert.ok(expanded.includes('control unit'));
  });

  test('expandSynonyms should handle empty input', () => {
    const expanded = expandSynonyms([], {});
    assert.deepStrictEqual(expanded, []);
  });

  test('deduplicateQueries should remove duplicate queries', () => {
    const queries = [
      'solenoid valve controller',
      'solenoid valve controller',
      'lorawan valve',
      'LoRaWAN Valve'
    ];

    const deduped = deduplicateQueries(queries);

    assert.strictEqual(deduped.length, 2);
  });

  test('generateQueries should generate queries from keywords', () => {
    const keywords = ['solenoid valve', 'controller', 'lorawan'];

    const queries = generateQueries(keywords);

    assert.ok(queries.length > 0);
    assert.ok(queries.some(q => q.includes('solenoid')));
  });

  test('generateQueries should limit query count', () => {
    const keywords = [
      'solenoid valve', 'controller', 'lorawan',
      'irrigation', 'wireless', 'agricultural'
    ];

    const queries = generateQueries(keywords, { maxQueries: 5 });

    assert.ok(queries.length <= 5);
  });

  test('generateQueries should include supplier intent queries', () => {
    const keywords = ['solenoid valve', 'lorawan'];

    const queries = generateQueries(keywords);

    const hasSupplierQuery = queries.some(q =>
      q.includes('supplier') ||
      q.includes('manufacturer') ||
      q.includes('factory') ||
      q.includes('vendor')
    );
    assert.ok(hasSupplierQuery);
  });

  test('generateQueries should handle single keyword', () => {
    const keywords = ['solenoid valve'];

    const queries = generateQueries(keywords);

    assert.ok(queries.length > 0);
    assert.ok(queries[0].includes('solenoid'));
  });

  test('applyQueryExclusions should append -site filters', () => {
    const query = 'solenoid valve supplier';
    const result = applyQueryExclusions(query, ['alibaba.com', 'made-in-china.com']);
    assert.ok(result.includes('-site:alibaba.com'));
    assert.ok(result.includes('-site:made-in-china.com'));
  });

  test('generateQueries should support exclusion sites option', () => {
    const keywords = ['solenoid valve', 'lorawan'];
    const queries = generateQueries(keywords, {
      excludedSites: ['alibaba.com']
    });
    assert.ok(queries.length > 0);
    assert.ok(queries.every(q => q.includes('-site:alibaba.com')));
  });
});
