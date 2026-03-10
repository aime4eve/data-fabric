/**
 * Vendor Aggregator Service
 * 厂商档案聚合与 vendors.csv 输出
 *
 * Phase 1 聚合模块
 */

const fs = require('fs');
const path = require('path');
const { mergeContactData, extractAllContacts } = require('./contact-extractor');

// vendors.csv 表头（严格顺序）
const VENDORS_HEADERS = [
  'run_id',
  'domain_key',
  'company_name',
  'home_url',
  'product_url',
  'contact_url',
  'contact_form_url',
  'email',
  'phone',
  'address',
  'country',
  'social_links',
  'score',
  'reason',
  'evidence_text',
  'evidence_urls',
  'first_seen_at',
  'last_seen_at'
];

const VENDORS_ENRICHED_HEADERS = [
  ...VENDORS_HEADERS,
  'ai_tags',
  'intent_score',
  'key_people',
  'detected_lang'
];

/**
 * 合并证据页数据
 * @param {Object[]} pages - 证据页数组
 * @returns {{ evidence_text: string, evidence_urls: string }}
 */
function mergeEvidencePages(pages) {
  if (!pages || pages.length === 0) {
    return {
      evidence_text: '',
      evidence_urls: ''
    };
  }

  // 只合并成功的页面
  const successPages = pages.filter(p => p.status === 'success');

  // 合并证据文本（每页截取前 500 字符）
  const textParts = successPages
    .map(p => `[${p.path}]\n${(p.text || '').slice(0, 500)}`)
    .filter(t => t);

  // 合并证据 URL（管道符分隔）
  const urlParts = successPages
    .map(p => p.url)
    .filter(u => u);

  return {
    evidence_text: textParts.join('\n\n---\n\n'),
    evidence_urls: urlParts.join('|')
  };
}

/**
 * 聚合单个厂商记录
 * @param {Object} domainItem - 域名队列项
 * @param {Object[]} evidencePages - 证据页数组
 * @returns {Object} 厂商记录
 */
function aggregateVendorRecord(domainItem, evidencePages) {
  // 合并证据页
  const { evidence_text, evidence_urls } = mergeEvidencePages(evidencePages);

  // 从所有页面提取联系方式
  const allContacts = evidencePages
    .filter(p => p.status === 'success' && p.text)
    .map(p => extractAllContacts(p.text, p.url));

  // 合并联系方式
  const mergedContacts = mergeContactData(allContacts);

  // 确定 URL
  const baseUrl = `https://${domainItem.domain}`;
  const homePage = evidencePages.find(p => p.path === '/' && p.status === 'success');
  const contactPage = evidencePages.find(p => p.path === '/contact' && p.status === 'success');
  const productsPage = evidencePages.find(p =>
    (p.path === '/products' || p.path === '/product') && p.status === 'success'
  );

  // 时间戳
  const now = new Date().toISOString();

  return {
    run_id: domainItem.run_id,
    domain_key: domainItem.domain_key,
    company_name: mergedContacts.company_name || '',
    home_url: homePage ? homePage.url : `${baseUrl}/`,
    product_url: productsPage ? productsPage.url : '',
    contact_url: contactPage ? contactPage.url : '',
    contact_form_url: mergedContacts.contact_form_url || '',
    email: (mergedContacts.emails || []).join('|'),
    phone: (mergedContacts.phones || []).join('|'),
    address: mergedContacts.address || '',
    country: mergedContacts.country || '',
    social_links: (mergedContacts.social_links || []).join('|'),
    score: domainItem.phase0_score || 0,
    reason: domainItem.phase0_reason || '',
    evidence_text,
    evidence_urls,
    first_seen_at: now,
    last_seen_at: now
  };
}

/**
 * 聚合所有厂商
 * @param {Object[]} domainQueue - 域名队列
 * @param {Map} evidenceMap - 证据页 Map (domain_key -> pages)
 * @returns {Object[]} 厂商记录数组
 */
function aggregateAllVendors(domainQueue, evidenceMap) {
  if (!domainQueue || domainQueue.length === 0) {
    return [];
  }

  return domainQueue.map(domainItem => {
    const pages = evidenceMap.get(domainItem.domain_key) || [];
    return aggregateVendorRecord(domainItem, pages);
  });
}

/**
 * 转义 CSV 字段值
 * @param {any} value - 字段值
 * @returns {string} 转义后的字符串
 */
function escapeCSV(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const str = String(value);

  // 如果包含逗号、引号或换行符，需要用引号包裹
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // 引号需要转义为两个引号
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * 写入 vendors.csv 文件
 * @param {Object[]} vendors - 厂商记录数组
 * @param {string} filePath - 输出文件路径
 */
function writeVendorsCsv(vendors, filePath) {
  // 确保目录存在
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 构建表头
  const headerLine = VENDORS_HEADERS.join(',');

  // 构建数据行
  const dataLines = vendors.map(vendor => {
    return VENDORS_HEADERS
      .map(header => escapeCSV(vendor[header]))
      .join(',');
  });

  // 合并内容
  const content = [headerLine, ...dataLines].join('\n');

  // 写入文件
  fs.writeFileSync(filePath, content, 'utf-8');
}

function enrichVendorRecord(vendor, llmResult = {}) {
  const aiTags = Array.isArray(llmResult.ai_tags)
    ? llmResult.ai_tags.join('|')
    : (llmResult.ai_tags || '');
  const keyPeople = Array.isArray(llmResult.key_people)
    ? JSON.stringify(llmResult.key_people)
    : (llmResult.key_people || '[]');

  return {
    ...vendor,
    ai_tags: aiTags,
    intent_score: Number.isFinite(llmResult.intent_score) ? llmResult.intent_score : 0,
    key_people: keyPeople,
    detected_lang: llmResult.detected_lang || ''
  };
}

function writeVendorsEnrichedCsv(vendors, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const headerLine = VENDORS_ENRICHED_HEADERS.join(',');
  const dataLines = vendors.map(vendor => {
    return VENDORS_ENRICHED_HEADERS
      .map(header => escapeCSV(vendor[header]))
      .join(',');
  });
  const content = [headerLine, ...dataLines].join('\n');
  fs.writeFileSync(filePath, content, 'utf-8');
}

module.exports = {
  mergeEvidencePages,
  aggregateVendorRecord,
  aggregateAllVendors,
  writeVendorsCsv,
  VENDORS_HEADERS,
  VENDORS_ENRICHED_HEADERS,
  enrichVendorRecord,
  writeVendorsEnrichedCsv
};
