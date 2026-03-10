/**
 * 关键词提取测试
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const {
  extractKeywordsFromMarkdown,
  readKeywordsCSV,
  extractKeywords
} = require('../src/services/keyword-extractor');

describe('Keyword Extractor', () => {
  test('extractKeywordsFromMarkdown should extract keywords from content', () => {
    const content = `
# SVC-100 LoRaWAN Solenoid Valve Controller

## 产品特点
- 支持 LoRaWAN 无线通信
- 远程控制电磁阀开关
- 农业灌溉系统
    `;

    const keywords = extractKeywordsFromMarkdown(content);

    assert.ok(keywords.length > 0);
    assert.ok(keywords.some(k => k.toLowerCase().includes('lorawan')));
    assert.ok(keywords.some(k => k.toLowerCase().includes('solenoid')));
  });

  test('extractKeywordsFromMarkdown should handle empty content', () => {
    const keywords = extractKeywordsFromMarkdown('');
    assert.deepStrictEqual(keywords, []);
  });

  test('readKeywordsCSV should read keywords from CSV file', () => {
    const csvPath = path.join(__dirname, 'fixtures', 'keywords.csv');
    const result = readKeywordsCSV(csvPath);

    assert.ok(result.length > 0);
    assert.ok(result.some(k => k.keyword === '电磁阀'));
    assert.ok(result.some(k => k.category === '产品'));
  });

  test('readKeywordsCSV should parse synonyms correctly', () => {
    const csvPath = path.join(__dirname, 'fixtures', 'keywords.csv');
    const result = readKeywordsCSV(csvPath);

    const valveKeyword = result.find(k => k.keyword === '电磁阀');
    assert.ok(valveKeyword.synonyms.includes('solenoid valve'));
    assert.ok(valveKeyword.synonyms.includes('electromagnetic valve'));
  });

  test('extractKeywords should extract keywords from markdown file', async () => {
    const mdPath = path.join(__dirname, 'fixtures', 'sample-product.md');
    const keywords = await extractKeywords(mdPath);

    assert.ok(keywords.length > 0);
    assert.ok(keywords.some(k => k.toLowerCase().includes('lorawan')));
  });

  test('extractKeywords should throw error for unsupported file type', async () => {
    try {
      await extractKeywords('test.txt');
      assert.fail('Should throw error');
    } catch (error) {
      assert.ok(error.message.includes('Unsupported'));
    }
  });
});
