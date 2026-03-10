/**
 * Ollama 集成测试
 * 使用 qwen3:4b 模型测试 LLM Processor 的实际调用
 *
 * 运行方式: node tests/ollama-integration.test.js
 */

const {
  OllamaClient,
  extractContactInfo,
  extractKeyPeople,
  inferLinkedInCompanyPage,
  CONTACT_EXTRACTION_PROMPT,
  KEY_PEOPLE_EXTRACTION_PROMPT
} = require('../src/services/llm-processor');

const { test, describe } = require('node:test');
const assert = require('node:assert');

// 配置
const LLM_CONFIG = {
  baseUrl: 'http://localhost:11434/v1',
  model: 'qwen3:4b'
};

describe('Ollama Integration Tests (qwen3:4b)', () => {
  // 增加超时时间，因为 LLM 调用较慢
  const TIMEOUT = 60000;

  test('OllamaClient should connect to local Ollama service', async () => {
    const client = new OllamaClient(LLM_CONFIG);
    const result = await client.chat([
      { role: 'user', content: 'Say "hello" in JSON format: {"message":"hello"}' }
    ]);
    console.log('Basic response:', JSON.stringify(result, null, 2));
    assert.ok(result);
  }, { timeout: TIMEOUT });

  test('extractContactInfo should extract contact from German company text', async () => {
    const testText = `
      ACME GmbH
      Musterstraße 1
      12345 Berlin, Germany

      Kontakt:
      E-Mail: info [at] acme-gmbh.de
      Telefon: +49 30 12345678

      Besuchen Sie uns auf LinkedIn: https://www.linkedin.com/company/acme-gmbh
    `;

    const result = await extractContactInfo(testText, { config: LLM_CONFIG });
    console.log('Extracted contact info:', JSON.stringify(result, null, 2));

    // 验证邮箱标准化
    assert.ok(result.email, 'Should extract email');
    assert.ok(result.email.includes('@'), 'Email should contain @');
    assert.ok(!result.email.includes('[at]'), 'Email should be normalized');

    // 验证地址
    assert.ok(result.address, 'Should extract address');

    // 验证电话
    assert.ok(result.phone, 'Should extract phone');
  }, { timeout: TIMEOUT });

  test('extractContactInfo should handle obfuscated emails', async () => {
    const testText = `
      Contact us:
      - Sales: sales (at) example.com
      - Support: support [at] example.com
      - Info: info[at]example.com
    `;

    const result = await extractContactInfo(testText, { config: LLM_CONFIG });
    console.log('Obfuscated emails result:', JSON.stringify(result, null, 2));

    if (result.email) {
      assert.ok(result.email.includes('@'), 'Email should be normalized to @');
      assert.ok(!result.email.includes('[at]'), 'Should not contain [at]');
      assert.ok(!result.email.includes('(at)'), 'Should not contain (at)');
    }
  }, { timeout: TIMEOUT });

  test('extractKeyPeople should extract key personnel', async () => {
    const testText = `
      About Us

      Our Team:
      - Hans Müller, CEO & Founder
      - Anna Schmidt, Head of R&D
      - Peter Weber, CTO

      ACME GmbH has been in business since 2010.
    `;

    const result = await extractKeyPeople(testText, { config: LLM_CONFIG });
    console.log('Key people result:', JSON.stringify(result, null, 2));

    assert.ok(Array.isArray(result.key_people), 'key_people should be an array');

    if (result.key_people.length > 0) {
      const person = result.key_people[0];
      assert.ok(person.name, 'Person should have a name');
      assert.ok(person.position, 'Person should have a position');
    }
  }, { timeout: TIMEOUT });

  test('inferLinkedInCompanyPage should infer LinkedIn URL', async () => {
    const testText = `
      About ACME GmbH

      We are a leading manufacturer of industrial equipment.
      Company Name: ACME GmbH
      Location: Berlin, Germany

      Follow us on social media!
    `;

    const result = await inferLinkedInCompanyPage(testText, { config: LLM_CONFIG });
    console.log('LinkedIn inference result:', result);

    // 结果可能是 URL 或者空字符串（取决于 LLM 是否能推断）
    if (result) {
      assert.ok(result.includes('linkedin.com'), 'Should contain linkedin.com');
    }
  }, { timeout: TIMEOUT });

  test('extractContactInfo with complex address', async () => {
    const testText = `
      Factory Direct Ltd.

      Factory & Headquarters:
      No. 88, Industrial Park Road, Zhangjiang High-Tech Park
      Pudong New District, Shanghai 201203, China

      Tel: +86-21-5080-8888
      Email: export@factorydirect.cn
    `;

    const result = await extractContactInfo(testText, { config: LLM_CONFIG });
    console.log('Complex address result:', JSON.stringify(result, null, 2));

    assert.ok(result.email || result.phone || result.address, 'Should extract at least one contact field');
  }, { timeout: TIMEOUT });
});

// 运行测试
console.log('='.repeat(60));
console.log('Ollama Integration Tests');
console.log('Model: qwen3:4b');
console.log('Base URL: http://localhost:11434/v1');
console.log('='.repeat(60));
