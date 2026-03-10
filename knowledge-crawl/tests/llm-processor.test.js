const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  OllamaClient,
  normalizeObfuscatedEmail,
  safeParseJsonObject,
  extractContactInfo,
  extractKeyPeople,
  inferLinkedInCompanyPage
} = require('../src/services/llm-processor');

describe('llm-processor', () => {
  test('normalizeObfuscatedEmail should normalize [at] and (at)', () => {
    assert.strictEqual(normalizeObfuscatedEmail('sales [at] example.com'), 'sales@example.com');
    assert.strictEqual(normalizeObfuscatedEmail('info(at)demo.org'), 'info@demo.org');
  });

  test('safeParseJsonObject should parse json in markdown code block', () => {
    const content = '```json\n{"email":"a@b.com","address":null}\n```';
    const parsed = safeParseJsonObject(content);
    assert.strictEqual(parsed.email, 'a@b.com');
  });

  test('OllamaClient should send JSON mode payload', async () => {
    let capturedBody = null;
    const requester = async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        async json() {
          return {
            choices: [{ message: { content: '{"ok":true}' } }]
          };
        }
      };
    };
    const client = new OllamaClient({ baseUrl: 'http://localhost:11434/v1', model: 'llama3.2' }, requester);
    await client.chat([{ role: 'user', content: 'hello' }]);
    assert.deepStrictEqual(capturedBody.response_format, { type: 'json_object' });
    assert.strictEqual(capturedBody.temperature, 0.1);
    assert.strictEqual(capturedBody.model, 'llama3.2');
  });

  test('extractContactInfo should return normalized contact data', async () => {
    const fakeClient = {
      async chat() {
        return {
          address: 'Musterstraße 1, 12345 Berlin, Germany',
          email: 'sales [at] example.com',
          phone: '+49 30 12345678'
        };
      }
    };
    const result = await extractContactInfo('dummy text', { client: fakeClient });
    assert.strictEqual(result.email, 'sales@example.com');
    assert.ok(result.address.includes('Berlin'));
  });

  test('extractKeyPeople should parse key_people list', async () => {
    const fakeClient = {
      async chat() {
        return {
          key_people: [{ name: 'Hans Müller', position: 'Founder' }]
        };
      }
    };
    const result = await extractKeyPeople('about text', { client: fakeClient });
    assert.strictEqual(result.key_people.length, 1);
    assert.strictEqual(result.key_people[0].name, 'Hans Müller');
  });

  test('inferLinkedInCompanyPage should return first linkedin company url', async () => {
    const fakeClient = {
      async chat() {
        return {
          linkedin_company_url: 'https://www.linkedin.com/company/acme-gmbh'
        };
      }
    };
    const result = await inferLinkedInCompanyPage('about text', { client: fakeClient });
    assert.ok(result.includes('linkedin.com/company'));
  });
});
