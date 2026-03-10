const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  detectCaptchaChallenge,
  getCaptchaType
} = require('../src/services/captcha-handler');

describe('captcha-handler', () => {
  test('detectCaptchaChallenge should detect google sorry page by url', () => {
    const detected = detectCaptchaChallenge({
      url: 'https://www.google.com/sorry/index?continue=abc',
      html: '<html></html>'
    });
    assert.strictEqual(detected, true);
  });

  test('detectCaptchaChallenge should detect cloudflare challenge by html', () => {
    const detected = detectCaptchaChallenge({
      url: 'https://example.com',
      html: '<html><title>Just a moment...</title><body>cf-challenge</body></html>'
    });
    assert.strictEqual(detected, true);
  });

  test('getCaptchaType should return recaptcha', () => {
    const type = getCaptchaType('<div class="g-recaptcha"></div>', 'https://example.com');
    assert.strictEqual(type, 'recaptcha');
  });

  test('getCaptchaType should return cloudflare', () => {
    const type = getCaptchaType('<div>cloudflare challenge</div>', 'https://example.com');
    assert.strictEqual(type, 'cloudflare');
  });
});
