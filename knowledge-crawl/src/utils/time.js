/**
 * 时间工具模块
 * 所有时间使用北京时间 (UTC+8)
 */

/**
 * 获取当前北京时间
 * @returns {Date} 北京时间的 Date 对象
 */
function getBeijingTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const beijingTime = new Date(utc + (8 * 3600000));
  return beijingTime;
}

/**
 * 格式化日期为北京时间字符串
 * @param {Date} date - 日期对象，默认为当前时间
 * @returns {string} 格式化后的时间字符串 yyyy-MM-dd HH:mm:ss
 */
function formatBeijingTime(date = null) {
  const d = date || getBeijingTime();
  const beijingDate = date ? new Date(date.getTime() + (8 * 3600000)) : d;

  const year = beijingDate.getFullYear();
  const month = String(beijingDate.getMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getDate()).padStart(2, '0');
  const hours = String(beijingDate.getHours()).padStart(2, '0');
  const minutes = String(beijingDate.getMinutes()).padStart(2, '0');
  const seconds = String(beijingDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 生成 run_id
 * @param {Date} date - 日期对象，默认为当前北京时间
 * @returns {string} 格式为 yyyyMMdd-HHmmss 的 run_id
 */
function generateRunId(date = null) {
  const d = date ? new Date(date.getTime() + (8 * 3600000)) : getBeijingTime();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * 格式化时间戳为北京时间字符串
 * @param {number} timestamp - 毫秒时间戳
 * @returns {string} 格式化后的时间字符串 yyyy-MM-dd HH:mm:ss
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  // 直接添加 8 小时偏移，不再调用 formatBeijingTime 避免双重偏移
  const beijingDate = new Date(date.getTime() + (8 * 3600000));

  const year = beijingDate.getFullYear();
  const month = String(beijingDate.getMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getDate()).padStart(2, '0');
  const hours = String(beijingDate.getHours()).padStart(2, '0');
  const minutes = String(beijingDate.getMinutes()).padStart(2, '0');
  const seconds = String(beijingDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
  getBeijingTime,
  formatBeijingTime,
  generateRunId,
  formatTimestamp
};
