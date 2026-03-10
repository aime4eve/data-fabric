const fs = require('fs');
const { enrichVendorRecord } = require('./vendor-aggregator');
const {
  extractContactInfo,
  extractKeyPeople,
  inferLinkedInCompanyPage
} = require('./llm-processor');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function readVendorsCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (!content) return [];
  const lines = content.split('\n');
  if (lines.length <= 1) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  return rows;
}

function detectLanguage(text) {
  if (!text) return 'unknown';
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
  if (/[äöüß]/i.test(text)) return 'de';
  return 'en';
}

function inferAiTags(vendor) {
  const text = `${vendor.reason || ''} ${vendor.evidence_text || ''}`.toLowerCase();
  const tags = [];
  if (/manufacturer|factory|production|oem/.test(text)) tags.push('Manufacturer');
  if (/distributor|dealer|reseller|trading/.test(text)) tags.push('Distributor');
  if (/oem|odm/.test(text)) tags.push('OEM');
  return tags.length > 0 ? tags : ['Unknown'];
}

function inferIntentScore(vendor) {
  const text = `${vendor.reason || ''} ${vendor.evidence_text || ''}`.toLowerCase();
  let score = Number(vendor.score || 0);
  if (/manufacturer|factory|oem/.test(text)) score += 15;
  if (/distributor|trading/.test(text)) score -= 10;
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return score;
}

async function enrichVendorsWithLLM(vendors, llm = {}) {
  const llmApi = {
    extractContactInfo: llm.extractContactInfo || extractContactInfo,
    extractKeyPeople: llm.extractKeyPeople || extractKeyPeople,
    inferLinkedInCompanyPage: llm.inferLinkedInCompanyPage || inferLinkedInCompanyPage
  };

  const enriched = [];
  const total = vendors.length;

  console.log(`\n${'='.repeat(50)}`);
  console.log(`🤖 LLM 增强处理开始 (共 ${total} 个厂商)`);
  console.log(`${'='.repeat(50)}\n`);

  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i];
    const text = vendor.evidence_text || '';

    // 显示进度信息
    const progress = `[${i + 1}/${total}]`;
    console.log(`\n📦 处理 ${progress}: ${vendor.domain_key || vendor.company_name || '未知厂商'}`);
    console.log(`   ⏳ 调用 LLM 提取联系信息...`);

    const startTime = Date.now();
    const llmContact = await llmApi.extractContactInfo(text, llm.options || {}).catch(() => ({}));
    const contactTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ 联系信息提取完成 (${contactTime}s)`);

    console.log(`   ⏳ 调用 LLM 提取关键人员...`);
    const startTime2 = Date.now();
    const llmPeople = await llmApi.extractKeyPeople(text, llm.options || {}).catch(() => ({ key_people: [] }));
    const peopleTime = ((Date.now() - startTime2) / 1000).toFixed(1);
    console.log(`   ✅ 关键人员提取完成 (${peopleTime}s)`);

    console.log(`   ⏳ 调用 LLM 推断 LinkedIn...`);
    const startTime3 = Date.now();
    const linkedinUrl = await llmApi.inferLinkedInCompanyPage(text, llm.options || {}).catch(() => (''));
    const linkedinTime = ((Date.now() - startTime3) / 1000).toFixed(1);
    console.log(`   ✅ LinkedIn 推断完成 (${linkedinTime}s)`);

    const baseVendor = {
      ...vendor,
      address: vendor.address || llmContact.address || '',
      email: vendor.email || llmContact.email || '',
      phone: vendor.phone || llmContact.phone || '',
      social_links: [vendor.social_links, linkedinUrl].filter(Boolean).join('|')
    };

    const phase2Fields = {
      ai_tags: inferAiTags(baseVendor),
      intent_score: inferIntentScore(baseVendor),
      key_people: llmPeople.key_people || [],
      detected_lang: detectLanguage(text)
    };

    enriched.push(enrichVendorRecord(baseVendor, phase2Fields));
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ LLM 增强处理完成 (共处理 ${enriched.length} 个厂商)`);
  console.log(`${'='.repeat(50)}\n`);

  return enriched;
}

module.exports = {
  parseCSVLine,
  readVendorsCsv,
  detectLanguage,
  enrichVendorsWithLLM
};
