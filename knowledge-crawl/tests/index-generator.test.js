/**
 * 索引页生成服务测试
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const indexGenerator = require('../src/services/index-generator');

describe('Index Generator', () => {
  describe('loadVendorsData', () => {
    it('应该返回空数组当文件不存在', () => {
      const result = indexGenerator.loadVendorsData('/nonexistent/path.csv');
      assert.strictEqual(result.length, 0);
    });
  });

  describe('loadHistoryData', () => {
    it('应该返回空数组当目录不存在', () => {
      const result = indexGenerator.loadHistoryData('/nonexistent/dir');
      assert.strictEqual(result.length, 0);
    });
  });

  describe('mergeData', () => {
    it('应该只保留成功的下载记录', () => {
      const vendors = [
        { company_name: 'Company A', home_url: 'https://a.com', intent_score: '80' },
        { company_name: 'Company B', home_url: 'https://b.com', intent_score: '60' }
      ];

      const history = [
        { original_url: 'https://a.com', local_path: 'a_com.mhtml', status: 'SUCCESS', file_size_kb: '100' },
        { original_url: 'https://b.com', local_path: 'b_com.mhtml', status: 'FAILED', file_size_kb: '0' },
        { original_url: 'https://c.com', local_path: 'c_com.mhtml', status: 'SUCCESS', file_size_kb: '200' }
      ];

      const merged = indexGenerator.mergeData(vendors, history);

      // 只应该有 2 条成功的记录
      assert.strictEqual(merged.length, 2);

      // Company A 应该有分数
      const companyA = merged.find(m => m.company === 'Company A');
      assert.ok(companyA);
      assert.strictEqual(companyA.score, 80);

      // Company C (没有厂商信息) 应该用域名作为公司名
      const companyC = merged.find(m => m.originalUrl === 'https://c.com');
      assert.ok(companyC);
      assert.ok(companyC.company.includes('c.com'));
    });
  });

  describe('generateHtml', () => {
    it('应该生成有效的 HTML', () => {
      const data = [
        {
          company: 'Test Company',
          localPath: 'test.mhtml',
          tags: 'Manufacturer',
          score: 85,
          country: 'USA',
          originalUrl: 'https://test.com',
          fileSizeKb: 100,
          downloadTime: '2026-03-06 14:00:00'
        }
      ];

      const html = indexGenerator.generateHtml(data);

      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes('Test Company'));
      assert.ok(html.includes('Manufacturer'));
      assert.ok(html.includes('85'));
      assert.ok(html.includes('USA'));
    });

    it('应该处理空数据', () => {
      const html = indexGenerator.generateHtml([]);

      assert.ok(html.includes('0'));
      assert.ok(html.includes('暂无数据') || html.includes('no-results'));
    });
  });

  describe('writeIndex', () => {
    it('应该写入索引文件', () => {
      const testDir = path.join(__dirname, 'fixtures', 'index-test');
      fs.mkdirSync(testDir, { recursive: true });

      const html = '<!DOCTYPE html><html><body>Test</body></html>';
      indexGenerator.writeIndex(testDir, html);

      const indexPath = path.join(testDir, 'offline_index.html');
      assert.ok(fs.existsSync(indexPath));

      const content = fs.readFileSync(indexPath, 'utf-8');
      assert.strictEqual(content, html);

      // 清理
      fs.rmSync(testDir, { recursive: true });
    });
  });
});
