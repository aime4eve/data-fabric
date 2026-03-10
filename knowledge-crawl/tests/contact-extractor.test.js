/**
 * Tests for contact-extractor.js
 * 联系方式与厂商信息抽取
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  extractEmails,
  extractPhones,
  extractCompanyNames,
  extractAddress,
  extractCountry,
  extractSocialLinks,
  extractContactFormUrl,
  extractAllContacts,
  mergeContactData
} = require('../src/services/contact-extractor');

describe('contact-extractor', () => {
  describe('extractEmails', () => {
    test('should extract single email', () => {
      const text = 'Contact us at sales@abc-manufacturing.com for more info.';
      const result = extractEmails(text);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], 'sales@abc-manufacturing.com');
    });

    test('should extract multiple emails', () => {
      const text = 'Email: sales@company.com or support@company.com';
      const result = extractEmails(text);

      assert.strictEqual(result.length, 2);
      assert.ok(result.includes('sales@company.com'));
      assert.ok(result.includes('support@company.com'));
    });

    test('should deduplicate emails', () => {
      const text = 'Contact sales@abc.com or sales@abc.com again';
      const result = extractEmails(text);

      assert.strictEqual(result.length, 1);
    });

    test('should ignore common placeholder emails', () => {
      const text = 'Email: example@email.com or test@test.com';
      const result = extractEmails(text);

      assert.strictEqual(result.length, 0);
    });

    test('should return empty array for no emails', () => {
      const result = extractEmails('No email here');
      assert.deepStrictEqual(result, []);
    });
  });

  describe('extractPhones', () => {
    test('should extract international phone with +', () => {
      const text = 'Call us at +86 138 1234 5678';
      const result = extractPhones(text);

      assert.ok(result.length > 0);
      assert.ok(result[0].includes('+86'));
    });

    test('should extract US phone format', () => {
      const text = 'Phone: +1 (555) 123-4567';
      const result = extractPhones(text);

      assert.ok(result.length > 0);
    });

    test('should extract plain digits phone', () => {
      const text = 'Tel: 13812345678';
      const result = extractPhones(text);

      assert.ok(result.some(p => p.includes('138') || p.includes('1234')));
    });

    test('should deduplicate phones', () => {
      const text = 'Call +86 138 1234 5678 or +86 138 1234 5678';
      const result = extractPhones(text);

      const uniqueValues = [...new Set(result)];
      assert.strictEqual(result.length, uniqueValues.length);
    });
  });

  describe('extractCompanyNames', () => {
    test('should extract company name from common patterns', () => {
      const text = 'About ABC Manufacturing Co., Ltd.';
      const result = extractCompanyNames(text);

      assert.ok(result.some(n => n.includes('ABC')));
    });

    test('should extract company with Inc', () => {
      const text = 'XYZ Corporation Inc. is a leading manufacturer';
      const result = extractCompanyNames(text);

      assert.ok(result.some(n => n.includes('XYZ')));
    });

    test('should return empty array for no company names', () => {
      const result = extractCompanyNames('Just some text without company names');
      assert.deepStrictEqual(result, []);
    });
  });

  describe('extractAddress', () => {
    test('should extract address with street pattern', () => {
      const text = 'Address: 123 Main Street, New York, NY 10001, USA';
      const result = extractAddress(text);

      assert.ok(result !== null);
      assert.ok(result.includes('Main Street') || result.includes('New York'));
    });

    test('should return null for no address', () => {
      const result = extractAddress('No address information');
      assert.strictEqual(result, null);
    });
  });

  describe('extractCountry', () => {
    test('should extract common country names', () => {
      const text = 'Based in China, we manufacture...';
      const result = extractCountry(text);

      assert.strictEqual(result, 'China');
    });

    test('should extract USA variants', () => {
      const text = 'Located in the USA';
      const result = extractCountry(text);

      assert.ok(result === 'USA' || result === 'United States');
    });

    test('should return null for no country', () => {
      const result = extractCountry('No country mentioned');
      assert.strictEqual(result, null);
    });
  });

  describe('extractSocialLinks', () => {
    test('should extract LinkedIn URLs', () => {
      const text = 'Follow us: https://www.linkedin.com/company/example';
      const result = extractSocialLinks(text);

      assert.ok(result.some(l => l.includes('linkedin.com')));
    });

    test('should extract WhatsApp numbers', () => {
      const text = 'WhatsApp: +86 138 1234 5678';
      const result = extractSocialLinks(text);

      assert.ok(result.some(l => l.includes('WhatsApp') || l.includes('wa.me')));
    });

    test('should extract WeChat IDs', () => {
      const text = 'WeChat: example_wechat';
      const result = extractSocialLinks(text);

      assert.ok(result.some(l => l.includes('WeChat')));
    });

    test('should deduplicate social links', () => {
      const text = 'LinkedIn: https://linkedin.com/company/test and https://linkedin.com/company/test';
      const result = extractSocialLinks(text);

      const uniqueValues = [...new Set(result)];
      assert.strictEqual(result.length, uniqueValues.length);
    });
  });

  describe('extractContactFormUrl', () => {
    test('should extract contact form URL from href', () => {
      const text = '<a href="/contact-us">Contact Form</a>';
      const baseUrl = 'https://example.com';
      const result = extractContactFormUrl(text, baseUrl);

      assert.ok(result !== null);
      assert.ok(result.includes('contact-us'));
    });

    test('should return null for no contact form', () => {
      const result = extractContactFormUrl('No contact form here', 'https://example.com');
      assert.strictEqual(result, null);
    });
  });

  describe('extractAllContacts', () => {
    test('should extract all contact types', () => {
      const text = `
        Company: ABC Manufacturing Co., Ltd.
        Email: info@abc.com
        Phone: +86 138 1234 5678
        Address: 123 Industrial Road, Shanghai, China
        LinkedIn: https://linkedin.com/company/abc
      `;

      const result = extractAllContacts(text, 'https://abc.com');

      assert.ok(result.emails.length > 0);
      assert.ok(result.phones.length > 0);
      assert.ok(result.address !== null);
      assert.ok(result.country !== null);
      assert.ok(result.social_links.length > 0);
    });

    test('should handle empty text', () => {
      const result = extractAllContacts('', 'https://example.com');

      assert.deepStrictEqual(result.emails, []);
      assert.deepStrictEqual(result.phones, []);
    });
  });

  describe('mergeContactData', () => {
    test('should merge data from multiple pages', () => {
      const pageData = [
        {
          emails: ['info@example.com'],
          phones: ['+86 138 1234 5678'],
          company_names: ['ABC Corp'],
          address: '123 Main St',
          country: 'China',
          social_links: ['LinkedIn: https://linkedin.com/company/abc'],
          contact_form_url: null
        },
        {
          emails: ['sales@example.com'],
          phones: ['+1 555 123 4567'],
          company_names: ['ABC Corporation'],
          address: null,
          country: null,
          social_links: ['WhatsApp: +86 138 1234 5678'],
          contact_form_url: 'https://example.com/contact'
        }
      ];

      const result = mergeContactData(pageData);

      // 邮箱应该合并去重
      assert.ok(result.emails.includes('info@example.com'));
      assert.ok(result.emails.includes('sales@example.com'));

      // 电话应该合并去重
      assert.ok(result.phones.length >= 1);

      // 社交链接应该合并
      assert.ok(result.social_links.length >= 1);

      // 联系表单应该保留
      assert.ok(result.contact_form_url !== null);
    });

    test('should prefer first non-null value for single-value fields', () => {
      const pageData = [
        { address: null, country: null, contact_form_url: null },
        { address: '456 Oak Ave', country: 'USA', contact_form_url: 'https://example.com/form' },
        { address: '789 Pine Rd', country: 'Canada', contact_form_url: null }
      ];

      const result = mergeContactData(pageData);

      assert.strictEqual(result.address, '456 Oak Ave');
      assert.strictEqual(result.country, 'USA');
      assert.strictEqual(result.contact_form_url, 'https://example.com/form');
    });

    test('should handle empty input', () => {
      const result = mergeContactData([]);

      assert.deepStrictEqual(result.emails, []);
      assert.deepStrictEqual(result.phones, []);
      assert.strictEqual(result.company_name, null);
    });
  });
});
