const CAPTCHA_RULES = [
  { type: 'recaptcha', indicators: ['g-recaptcha', 'recaptcha'] },
  { type: 'hcaptcha', indicators: ['h-captcha', 'hcaptcha'] },
  { type: 'cloudflare', indicators: ['cloudflare challenge', 'cf-challenge', 'just a moment'] },
  { type: 'google_sorry', indicators: ['unusual traffic', 'automated requests', '/sorry/'] }
];

const DEFAULT_CAPTCHA_TIMEOUT_MS = 60000; // 60 秒超时

function getCaptchaType(html = '', url = '') {
  const text = `${html || ''}\n${url || ''}`.toLowerCase();
  const matched = CAPTCHA_RULES.find(rule => rule.indicators.some(indicator => text.includes(indicator)));
  return matched ? matched.type : 'none';
}

function detectCaptchaChallenge({ html = '', url = '' } = {}) {
  return getCaptchaType(html, url) !== 'none';
}

/**
 * 处理验证码暂停（Human-in-the-loop）
 * @param {Object} options - 选项
 * @param {string} options.captchaType - 验证码类型
 * @param {number} options.timeoutMs - 超时时间（毫秒）
 * @param {Function} options.inputCallback - 输入回调函数（用于测试）
 * @param {Object} options.page - Playwright page 对象（可选）
 * @returns {Promise<boolean>} 用户是否已完成验证
 */
async function handleCaptchaPause(options = {}) {
  const {
    captchaType,
    timeoutMs = DEFAULT_CAPTCHA_TIMEOUT_MS,
    inputCallback,
    page
  } = options;

  const captchaName = getCaptchaDisplayName(captchaType);
  console.log('\n' + '='.repeat(60));
  console.log(`⚠️  检测到 ${captchaName} 验证码`);
  console.log('请手动完成验证，然后按 Enter 继续...');
  console.log(`⏱️  等待时间: ${timeoutMs / 1000} 秒`);
  console.log('='.repeat(60) + '\n');

  // 如果有 Playwright page，调用 pause()
  if (page && typeof page.pause === 'function') {
    try {
      await page.pause({ timeout: timeoutMs });
      return true;
    } catch (_error) {
      // pause 超时会抛出错误
      console.log('⏰ 验证码等待超时，跳过当前查询');
      return false;
    }
  }

  // 使用控制台输入或自定义回调，带超时竞争
  const inputFn = inputCallback || createConsoleInput(timeoutMs);

  // 创建超时 Promise
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    // 使用 Promise.race 实现超时
    const result = await Promise.race([inputFn(), timeoutPromise]);
    if (result === null) {
      console.log('⏰ 验证码等待超时，跳过当前查询');
    }
    return result !== null;
  } catch (error) {
    console.log('⏰ 验证码等待超时，跳过当前查询');
    return false;
  }
}

function getCaptchaDisplayName(type) {
  const names = {
    recaptcha: 'reCAPTCHA',
    hcaptcha: 'hCaptcha',
    cloudflare: 'Cloudflare',
    google_sorry: 'Google 验证'
  };
  return names[type] || '未知';
}

function createConsoleInput(timeoutMs) {
  return () => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        process.stdin.pause();
        resolve(null);
      }, timeoutMs);

      process.stdin.resume();
      process.stdin.once('data', () => {
        clearTimeout(timer);
        process.stdin.pause();
        resolve('continue');
      });
    });
  };
}

module.exports = {
  CAPTCHA_RULES,
  getCaptchaType,
  detectCaptchaChallenge,
  handleCaptchaPause,
  DEFAULT_CAPTCHA_TIMEOUT_MS
};
