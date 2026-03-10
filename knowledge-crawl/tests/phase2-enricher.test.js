const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  readVendorsCsv,
  enrichVendorsWithLLM
} = require('../src/services/phase2-enricher');

describe('phase2-enricher', () => {
  test('readVendorsCsv should parse quoted csv rows', () => {
    const dir = path.join(__dirname, 'fixtures', 'phase2-enricher');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, 'vendors.csv');
    fs.writeFileSync(
      filePath,
      'run_id,domain_key,company_name,evidence_text\n' +
      '20260305-100000,example.com,"ACME, Inc.","about text"\n',
      'utf-8'
    );

    const rows = readVendorsCsv(filePath);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].company_name, 'ACME, Inc.');

    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('enrichVendorsWithLLM should append phase2 fields', async () => {
    const vendors = [
      { run_id: 'r1', domain_key: 'example.com', evidence_text: 'about text', social_links: '' }
    ];
    const llm = {
      extractContactInfo: async () => ({ address: 'Berlin', email: 'sales [at] example.com', phone: '+49 30 12345678' }),
      extractKeyPeople: async () => ({ key_people: [{ name: 'Hans Muller', position: 'Founder' }] }),
      inferLinkedInCompanyPage: async () => 'https://www.linkedin.com/company/acme-gmbh'
    };

    const enriched = await enrichVendorsWithLLM(vendors, llm);
    assert.strictEqual(enriched.length, 1);
    assert.ok(enriched[0].ai_tags.length > 0);
    assert.ok(enriched[0].intent_score >= 0);
    assert.ok(enriched[0].key_people.includes('Founder'));
    assert.ok(enriched[0].social_links.includes('linkedin.com/company'));
  });
});
