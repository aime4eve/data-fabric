/**
 * 并发控制模块
 * Phase 4: 实现 Phase 1 和 Phase 3 的并发处理
 */

const pLimit = require('p-limit');

/**
 * 带指数退避的重试函数
 * @param {Function} fn - 要重试的函数
 * @param {Object} options - 配置选项
 * @param {number} [options.maxRetries=3] - 最大重试次数
 * @param {number} [options.baseDelay=1000] - 基础延迟(毫秒)
 * @returns {Promise<any>} 函数执行结果
 */
async function retryWithBackoff(fn, options = {}) {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelay ?? 1000;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        // 指数退避延迟
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * 并行执行任务数组
 * @param {Array} tasks - 任务数组
 * @param {number} concurrency - 并发限制
 * @returns {Promise<Array>} 结果数组
 */
async function parallel(tasks, concurrency = 3) {
  const limit = pLimit(concurrency);
  return Promise.all(tasks.map(task => limit(task)));
}

module.exports = {
  pLimit,
  retryWithBackoff,
  parallel
};
