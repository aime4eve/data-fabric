/**
 * Contact Extractor Service
 * 联系方式与厂商信息抽取
 *
 * Phase 1 抽取模块
 */

// 常见占位符邮箱
const PLACEHOLDER_EMAILS = [
  'example@email.com', 'test@test.com', 'email@example.com',
  'your@email.com', 'name@example.com', 'info@example.com',
  'test@example.com', 'admin@example.com'
];

// 国家列表
const COUNTRIES = [
  'China', 'USA', 'United States', 'UK', 'United Kingdom', 'Germany',
  'Japan', 'Korea', 'South Korea', 'India', 'France', 'Italy',
  'Spain', 'Canada', 'Australia', 'Brazil', 'Mexico', 'Netherlands',
  'Belgium', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland',
  'Turkey', 'Russia', 'Taiwan', 'Hong Kong', 'Singapore', 'Malaysia',
  'Thailand', 'Vietnam', 'Indonesia', 'Philippines', 'UAE', 'Dubai',
  'Saudi Arabia', 'Israel', 'South Africa'
];

// 正则表达式工厂函数 - 每次调用返回新的 RegExp 实例，避免 lastIndex 问题
function createEmailRegex() {
  return /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
}

function createPhoneRegex() {
  return /(?:\+?(\d{1,3})[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;
}

function createCompanyRegex() {
  return /([A-Z][A-Za-z0-9\s&]+(?:Co\.?|Ltd\.?|Inc\.?|Corp\.?|Corporation|Company|GmbH|S\.?A\.?|B\.?V\.?))/g;
}

function createAddressRegex() {
  return /\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Industrial|Park)[,\s]+[A-Za-z\s]+/gi;
}

function createLinkedInCompanyRegex() {
  return /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9-]+/gi;
}

// 社交媒体模式工厂函数
function createSocialPatterns() {
  return [
    {
      name: 'LinkedIn',
      getRegex: () => /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9-]+/gi
    },
    {
      name: 'WhatsApp',
      getRegex: () => /(?:WhatsApp|Wa)[:\s]*([+]\d{1,3}[\s\d-]{6,})|(?:https?:\/\/)?wa\.me\/(\d+)/gi
    },
    {
      name: 'WeChat',
      getRegex: () => /(?:WeChat|微信)[:\s]*([a-zA-Z0-9_-]{3,})/gi
    },
    {
      name: 'Facebook',
      getRegex: () => /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+/gi
    },
    {
      name: 'Twitter',
      getRegex: () => /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+/gi
    },
    {
      name: 'Instagram',
      getRegex: () => /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+/gi
    }
  ];
}

// 联系表单路径工厂函数
function createContactFormPaths() {
  return [
    /href=["']([^"']*(?:contact[-_]?us|contact[-_]?form|get[-_]?in[-_]?touch)[^"']*)["']/gi,
    /action=["']([^"']*(?:contact|submit|send)[^"']*)["']/gi
  ];
}

/**
 * 提取邮箱地址
 * @param {string} text - 文本内容
 * @returns {string[]} 邮箱列表（去重）
 */
function extractEmails(text) {
  if (!text) return [];

  const emailRegex = createEmailRegex();
  const matches = text.match(emailRegex) || [];
  const emails = matches
    .map(e => e.toLowerCase())
    .filter(e => !PLACEHOLDER_EMAILS.includes(e))
    .filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.gif'));

  return [...new Set(emails)];
}

/**
 * 提取电话号码
 * @param {string} text - 文本内容
 * @returns {string[]} 电话列表（去重）
 */
function extractPhones(text) {
  if (!text) return [];

  const phoneRegex = createPhoneRegex();
  const matches = text.match(phoneRegex) || [];
  const phones = matches
    .map(p => p.trim())
    .filter(p => p.replace(/\D/g, '').length >= 7); // 至少7位数字

  return [...new Set(phones)];
}

/**
 * 提取公司名称
 * @param {string} text - 文本内容
 * @returns {string[]} 公司名称列表
 */
function extractCompanyNames(text) {
  if (!text) return [];

  const companyRegex = createCompanyRegex();
  const matches = text.match(companyRegex) || [];
  const names = matches
    .map(n => n.trim())
    .filter(n => n.length > 3 && n.length < 100);

  return [...new Set(names)];
}

/**
 * 提取地址
 * @param {string} text - 文本内容
 * @returns {string|null} 地址
 */
function extractAddress(text) {
  if (!text) return null;

  const addressRegex = createAddressRegex();
  const match = text.match(addressRegex);
  return match ? match[0].trim() : null;
}

/**
 * 提取国家
 * @param {string} text - 文本内容
 * @returns {string|null} 国家名
 */
function extractCountry(text) {
  if (!text) return null;

  const upperText = text.toUpperCase();
  for (const country of COUNTRIES) {
    const regex = new RegExp(`\\b${country.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(text)) {
      return country;
    }
  }
  return null;
}

/**
 * 提取社交链接
 * @param {string} text - 文本内容
 * @returns {string[]} 社交链接列表
 */
function extractSocialLinks(text) {
  if (!text) return [];

  const links = [];
  const patterns = createSocialPatterns();

  for (const pattern of patterns) {
    const regex = pattern.getRegex();
    const matches = text.matchAll(regex);
    for (const match of matches) {
      if (match[0]) {
        // 标准化链接格式
        let link = match[0].trim();
        if (!link.startsWith('http')) {
          link = `${pattern.name}: ${link}`;
        }
        links.push(link);
      }
    }
  }

  return [...new Set(links)];
}

/**
 * 优先提取 LinkedIn Company Page
 * @param {string} text - 文本内容
 * @returns {string|null} LinkedIn Company Page URL 或 null
 */
function extractLinkedInCompanyPage(text) {
  if (!text) return null;

  const linkedinRegex = createLinkedInCompanyRegex();
  const matches = text.match(linkedinRegex);
  if (matches && matches.length > 0) {
    // 返回第一个匹配的 Company Page
    return matches[0].trim();
  }

  return null;
}

/**
 * 提取联系表单 URL
 * @param {string} text - 文本内容
 * @param {string} baseUrl - 基础 URL
 * @returns {string|null} 联系表单 URL
 */
function extractContactFormUrl(text, baseUrl) {
  if (!text) return null;

  const paths = createContactFormPaths();
  for (const pattern of paths) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        let url = match[1];
        // 处理相对路径
        if (url.startsWith('/')) {
          try {
            const base = new URL(baseUrl);
            url = `${base.protocol}//${base.host}${url}`;
          } catch (e) {
            continue;
          }
        }
        if (url.startsWith('http')) {
          return url;
        }
      }
    }
  }

  return null;
}

/**
 * 从文本提取所有联系方式
 * @param {string} text - 文本内容
 * @param {string} baseUrl - 基础 URL（用于解析相对链接）
 * @returns {Object} 联系方式对象
 */
function extractAllContacts(text, baseUrl) {
  return {
    emails: extractEmails(text),
    phones: extractPhones(text),
    company_names: extractCompanyNames(text),
    address: extractAddress(text),
    country: extractCountry(text),
    social_links: extractSocialLinks(text),
    contact_form_url: extractContactFormUrl(text, baseUrl),
    linkedin_company_page: extractLinkedInCompanyPage(text)
  };
}

/**
 * 合并多页联系方式数据
 * @param {Object[]} pageDataList - 多页数据列表
 * @returns {Object} 合并后的联系方式
 */
function mergeContactData(pageDataList) {
  const result = {
    emails: [],
    phones: [],
    company_name: null,
    address: null,
    country: null,
    social_links: [],
    contact_form_url: null,
    linkedin_company_page: null
  };

  if (!pageDataList || pageDataList.length === 0) {
    return result;
  }

  const allEmails = new Set();
  const allPhones = new Set();
  const allSocialLinks = new Set();

  for (const data of pageDataList) {
    // 合并数组类型字段
    if (data.emails) {
      data.emails.forEach(e => allEmails.add(e));
    }
    if (data.phones) {
      data.phones.forEach(p => allPhones.add(p));
    }
    if (data.social_links) {
      data.social_links.forEach(l => allSocialLinks.add(l));
    }

    // 单值字段：优先保留第一个非空值
    if (!result.company_name && data.company_names && data.company_names.length > 0) {
      result.company_name = data.company_names[0];
    }
    if (!result.address && data.address) {
      result.address = data.address;
    }
    if (!result.country && data.country) {
      result.country = data.country;
    }
    if (!result.contact_form_url && data.contact_form_url) {
      result.contact_form_url = data.contact_form_url;
    }
    // LinkedIn Company Page 优先保留第一个非空值
    if (!result.linkedin_company_page && data.linkedin_company_page) {
      result.linkedin_company_page = data.linkedin_company_page;
    }
  }

  result.emails = [...allEmails];
  result.phones = [...allPhones];
  result.social_links = [...allSocialLinks];

  return result;
}

module.exports = {
  extractEmails,
  extractPhones,
  extractCompanyNames,
  extractAddress,
  extractCountry,
  extractSocialLinks,
  extractContactFormUrl,
  extractAllContacts,
  mergeContactData,
  extractLinkedInCompanyPage
};
