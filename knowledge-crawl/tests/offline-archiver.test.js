/**
 * 离线归档服务测试
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const offlineArchiver = require('../src/services/offline-archiver');

describe('Offline Archiver', () => {
  describe('readUrlList', () => {
    it('应该读取 TXT 格式的 URL 列表', () => {
      const testFile = path.join(__dirname, 'fixtures', 'test-urls.txt');
      const content = 'https://example.com\nhttps://test.com\n# 注释\nhttps://demo.com';
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      fs.writeFileSync(testFile, content);

      const urls = offlineArchiver.readUrlList(testFile);

      assert.strictEqual(urls.length, 3);
      assert.strictEqual(urls[0], 'https://example.com');
      assert.strictEqual(urls[1], 'https://test.com');
      assert.strictEqual(urls[2], 'https://demo.com');

      // 清理
      fs.unlinkSync(testFile);
      fs.rmdirSync(path.dirname(testFile), { recursive: true });
    });

    it('应该读取 CSV 格式的 URL 列表', () => {
      const testFile = path.join(__dirname, 'fixtures', 'test-urls.csv');
      const content = 'url,name\nhttps://example.com,Example\nhttps://test.com,Test';
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      fs.writeFileSync(testFile, content);

      const urls = offlineArchiver.readUrlList(testFile);

      assert.strictEqual(urls.length, 2);
      assert.strictEqual(urls[0], 'https://example.com');
      assert.strictEqual(urls[1], 'https://test.com');

      // 清理
      fs.unlinkSync(testFile);
      fs.rmdirSync(path.dirname(testFile), { recursive: true });
    });

    it('应该处理 home_url 列', () => {
      const testFile = path.join(__dirname, 'fixtures', 'test-home-urls.csv');
      const content = 'home_url,company\nhttps://example.com,Example';
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      fs.writeFileSync(testFile, content);

      const urls = offlineArchiver.readUrlList(testFile);

      assert.strictEqual(urls.length, 1);
      assert.strictEqual(urls[0], 'https://example.com');

      // 清理
      fs.unlinkSync(testFile);
      fs.rmdirSync(path.dirname(testFile), { recursive: true });
    });
  });

  describe('filterNewUrls', () => {
    it('应该过滤已下载的 URL', () => {
      const urls = [
        'https://example.com',
        'https://test.com',
        'https://new.com'
      ];

      const history = [
        { original_url: 'https://example.com', status: 'SUCCESS' },
        { original_url: 'https://test.com', status: 'SUCCESS' },
        { original_url: 'https://failed.com', status: 'FAILED' }
      ];

      const newUrls = offlineArchiver.filterNewUrls(urls, history);

      assert.strictEqual(newUrls.length, 2);
      assert.ok(newUrls.includes('https://new.com'));
      assert.ok(newUrls.includes('https://failed.com')); // 失败的应该重试
    });

    it('应该返回所有 URL 当历史为空', () => {
      const urls = ['https://example.com', 'https://test.com'];
      const newUrls = offlineArchiver.filterNewUrls(urls, []);

      assert.strictEqual(newUrls.length, 2);
    });
  });

  describe('appendHistory', () => {
    it('应该追加记录到历史文件', () => {
      const testDir = path.join(__dirname, 'fixtures', 'history-test');
      fs.mkdirSync(testDir, { recursive: true });

      offlineArchiver.appendHistory(testDir, {
        original_url: 'https://example.com',
        local_path: 'example_com.mhtml',
        status: 'SUCCESS',
        download_time: '2026-03-06 14:00:00',
        file_size_kb: 256,
        error_message: ''
      });

      const historyPath = path.join(testDir, 'download_history.csv');
      assert.ok(fs.existsSync(historyPath));

      const content = fs.readFileSync(historyPath, 'utf-8');
      assert.ok(content.includes('https://example.com'));
      assert.ok(content.includes('SUCCESS'));

      // 清理
      fs.rmSync(testDir, { recursive: true });
    });
  });
});
