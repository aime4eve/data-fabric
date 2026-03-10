// System Prompts (按规格要求)
const CONTACT_EXTRACTION_PROMPT = `You are a data extraction specialist. Extract company contact info from the user provided text.
Output JSON format:
{
  "address": "Standardized full address or null",
  "email": "Standardized email (fix [at] to @) or null",
  "phone": "Standardized phone number or null"
}`;

const KEY_PEOPLE_EXTRACTION_PROMPT = `Extract key personnel (C-level, Founder, R&D Head) from the text.
Output JSON format:
{
  "key_people": [
    { "name": "Name", "position": "Position Title" }
  ]
}`;

const LINKEDIN_INFERENCE_PROMPT = `Infer LinkedIn company page URL from the text.
Output JSON format:
{
  "linkedin_company_url": "https://www.linkedin.com/company/..." or null
}`;

function normalizeObfuscatedEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email
    .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
    .replace(/\s*\(\s*at\s*\)\s*/gi, '@')
    .replace(/\s+/g, '')
    .trim();
}

function safeParseJsonObject(content) {
  if (content && typeof content === 'object') return content;
  if (!content || typeof content !== 'string') return {};

  const cleaned = content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch (_error2) {
        return {};
      }
    }
    return {};
  }
}

class LlmClient {
  constructor(config = {}, requester = fetch) {
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com';
    this.model = config.model || 'deepseek-chat';
    this.apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.temperature = config.temperature ?? 0.1;
    this.requester = requester;
    this.verbose = config.verbose ?? true; // 默认显示等待信息
    // 重试配置
    this.retryBaseDelay = config.retryBaseDelay ?? 1000; // 基础延迟 1 秒
    this.retryMaxDelay = config.retryMaxDelay ?? 30000; // 最大延迟 30 秒
  }

  _log(message) {
    if (this.verbose) {
      console.log(`  ⏳ ${message}`);
    }
  }

  _logDone(message) {
    if (this.verbose) {
      console.log(`  ✅ ${message}`);
    }
  }

  /**
   * 计算重试延迟（指数退避 + 随机抖动）
   * @param {number} attempt - 当前重试次数
   * @returns {number} 延迟时间（毫秒）
   */
  _calculateRetryDelay(attempt) {
    // 指数退避: baseDelay * 2^attempt
    let delay = this.retryBaseDelay * Math.pow(2, attempt);
    // 应用最大延迟限制
    delay = Math.min(delay, this.retryMaxDelay);
    // 添加随机抖动（±25%）避免雷群效应
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    delay = delay + jitter;
    return Math.max(0, Math.floor(delay));
  }

  /**
   * 格式化延迟时间用于日志输出
   * @param {number} delayMs - 延迟时间（毫秒）
   * @returns {string} 格式化的延迟时间
   */
  _formatDelay(delayMs) {
    if (delayMs < 1000) {
      return `${delayMs}ms`;
    }
    return `${(delayMs / 1000).toFixed(1)}s`;
  }

  async chat(messages, options = {}) {
    const maxRetries = options.maxRetries ?? 3;
    const body = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature ?? this.temperature,
      response_format: { type: 'json_object' }
    };

    const modelName = body.model;
    const startTime = Date.now();

    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this._calculateRetryDelay(attempt);
          this._log(`重试 LLM 调用 (第 ${attempt + 1}/${maxRetries} 次)...`);
        } else {
          this._log(`正在调用 LLM (${modelName})，请稍候...`);
        }

        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await this.requester(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error(`LLM request failed: ${response.status}`);
        }

        const json = await response.json();
        const content = json?.choices?.[0]?.message?.content ?? '{}';
        const parsed = safeParseJsonObject(content);

        // 如果解析结果为空对象且不是最后一次尝试，继续重试
        if (Object.keys(parsed).length === 0 && attempt < maxRetries - 1) {
          this._log('LLM 返回空结果，准备重试...');
          const delay = this._calculateRetryDelay(attempt + 1);
          this._log(`等待 ${this._formatDelay(delay)} 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        this._logDone(`LLM 调用完成 (${elapsed}s)`);
        return parsed;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          // 计算下次重试的延迟并等待
          const nextAttempt = attempt + 1;
          const delay = this._calculateRetryDelay(nextAttempt);
          this._log(`LLM 调用失败: ${error.message}，等待 ${this._formatDelay(delay)} 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重试失败后返回空对象（降级策略）
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`  ❌ LLM 调用失败 (${elapsed}s，重试 ${maxRetries} 次后):`, lastError?.message);
    return {};
  }
}

async function extractContactInfo(text, options = {}) {
  const client = options.client || new LlmClient(options.config, options.requester);
  const result = await client.chat([
    { role: 'system', content: CONTACT_EXTRACTION_PROMPT },
    { role: 'user', content: text || '' }
  ]);
  return {
    address: result.address || null,
    email: normalizeObfuscatedEmail(result.email || ''),
    phone: result.phone || null
  };
}

async function extractKeyPeople(text, options = {}) {
  const client = options.client || new LlmClient(options.config, options.requester);
  const result = await client.chat([
    { role: 'system', content: KEY_PEOPLE_EXTRACTION_PROMPT },
    { role: 'user', content: text || '' }
  ]);
  return {
    key_people: Array.isArray(result.key_people) ? result.key_people : []
  };
}

async function inferLinkedInCompanyPage(text, options = {}) {
  const client = options.client || new LlmClient(options.config, options.requester);
  const result = await client.chat([
    { role: 'system', content: LINKEDIN_INFERENCE_PROMPT },
    { role: 'user', content: text || '' }
  ]);
  return result.linkedin_company_url || '';
}

// 向后兼容别名
const OllamaClient = LlmClient;

module.exports = {
  LlmClient,
  OllamaClient, // 向后兼容
  normalizeObfuscatedEmail,
  safeParseJsonObject,
  extractContactInfo,
  extractKeyPeople,
  inferLinkedInCompanyPage,
  CONTACT_EXTRACTION_PROMPT,
  KEY_PEOPLE_EXTRACTION_PROMPT,
  LINKEDIN_INFERENCE_PROMPT
};
