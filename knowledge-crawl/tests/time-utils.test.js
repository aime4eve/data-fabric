/**
 * 时间工具测试
 * 使用 Node.js 内置测试模块
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  getBeijingTime,
  formatBeijingTime,
  generateRunId,
  formatTimestamp
} = require('../src/utils/time');

describe('Time Utils', () => {
  test('getBeijingTime should return a Date object', () => {
    const beijingTime = getBeijingTime();
    assert.ok(beijingTime instanceof Date);
  });

  test('formatBeijingTime should format time as yyyy-MM-dd HH:mm:ss', () => {
    const formatted = formatBeijingTime();
    // 只检查格式是否正确
    assert.ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(formatted));
  });

  test('formatBeijingTime should format current time if no date provided', () => {
    const formatted = formatBeijingTime();
    assert.ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(formatted));
  });

  test('generateRunId should generate run_id in format yyyyMMdd-HHmmss', () => {
    const runId = generateRunId();
    assert.ok(/^\d{8}-\d{6}$/.test(runId));
  });

  test('generateRunId should generate valid run_id with custom date', () => {
    const date = new Date('2026-03-03T14:25:30Z');
    const runId = generateRunId(date);
    // 只检查格式
    assert.ok(/^\d{8}-\d{6}$/.test(runId));
  });

  test('formatTimestamp should format timestamp to valid time string', () => {
    const timestamp = Date.now();
    const formatted = formatTimestamp(timestamp);
    // 只检查格式
    assert.ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(formatted));
  });

  test('generateRunId and formatBeijingTime should use consistent time format', () => {
    const runId = generateRunId();
    const formattedTime = formatBeijingTime();

    // 提取 runId 中的日期部分
    const runIdDate = runId.split('-')[0];
    const formattedDate = formattedTime.split(' ')[0].replace(/-/g, '');

    // 两个应该使用相同的日期
    assert.strictEqual(runIdDate, formattedDate);
  });
});
