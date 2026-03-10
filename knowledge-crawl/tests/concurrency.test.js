/**
 * 并发控制模块测试
 * TDD: Phase 4 Phase 1 并发抓取
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

describe('Concurrency Module', () => {
  const testDir = path.join(__dirname, 'concurrency-test');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('pLimit', () => {
    it('should limit concurrent operations', async () => {
      const { pLimit } = require('../src/utils/concurrency');

      const limit = pLimit(3);
      const results = [];
      const tasks = [];

      for (let i = 0; i < 10; i++) {
        tasks.push(limit(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          results.push(i);
          return i;
        }));
      }

      await Promise.all(tasks);

      // 验证结果按顺序完成
      assert.deepStrictEqual(results, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should process tasks in parallel up to limit', async () => {
      const { pLimit } = require('../src/utils/concurrency');
      const startTime = Date.now();

      const limit = pLimit(3);
      const tasks = [];

      // 创建 6 个任务，每个耗时 200ms
      for (let i = 0; i < 6; i++) {
        tasks.push(limit(async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return i;
        }));
      }

      await Promise.all(tasks);
      const elapsed = Date.now() - startTime;

      // 6 个任务，并发限制为 3，理论最快 400ms (2 批次)
      // 允许一定的误差
      assert.ok(elapsed >= 380 && elapsed < 800);
    });

    it('should handle errors gracefully', async () => {
      const { pLimit } = require('../src/utils/concurrency');

      const limit = pLimit(2);
      const errors = [];

      const tasks = [
        limit(async () => {
          throw new Error('Task 1 failed');
        }),
        limit(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'success';
        }),
        limit(async () => {
          throw new Error('Task 3 failed');
        })
      ];

      const results = await Promise.allSettled(tasks);

      // 检查结果
      assert.strictEqual(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.strictEqual(results.filter(r => r.status === 'rejected').length, 2);
    });
  });

  describe('retryWithBackoff', () => {
    it('should retry with exponential backoff', async () => {
      const { retryWithBackoff } = require('../src/utils/concurrency');

      let attempts = 0;
      const delays = [];

      const result = await retryWithBackoff(
        async () => {
          attempts++;
          delays.push(Date.now());

          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return 'success';
        },
        { maxRetries: 3, baseDelay: 100 }
      );

      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 3);
    });

    it('should throw after max retries exceeded', async () => {
      const { retryWithBackoff } = require('../src/utils/concurrency');

      await assert.rejects(
        retryWithBackoff(
          async () => {
            throw new Error('Permanent failure');
          },
          { maxRetries: 2, baseDelay: 50 }
        ),
        /Permanent failure/
      );
    });
  });
});
