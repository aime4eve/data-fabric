import { Page, Locator, expect } from '@playwright/test';

/**
 * 测试辅助工具类
 * 提供通用的测试操作和断言方法
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * 等待页面加载完成
   */
  async waitForPageLoad(timeout: number = 30000) {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * 安全点击元素（等待元素可见后点击）
   */
  async safeClick(selector: string, timeout: number = 10000) {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    await element.waitFor({ state: 'attached', timeout });
    await element.click({ timeout });
  }

  /**
   * 安全填写表单字段
   */
  async safeFill(selector: string, value: string, timeout: number = 10000) {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    await element.waitFor({ state: 'attached', timeout });
    await element.clear({ timeout });
    await element.fill(value, { timeout });
  }

  /**
   * 等待并获取元素文本
   */
  async getTextContent(selector: string, timeout: number = 10000): Promise<string> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return await element.textContent() || '';
  }

  /**
   * 检查元素是否存在
   */
  async isElementVisible(selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.locator(selector).waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 等待URL变化
   */
  async waitForUrlChange(expectedUrl: string | RegExp, timeout: number = 15000) {
    await this.page.waitForURL(expectedUrl, { timeout });
  }

  /**
   * 截图并保存
   */
  async takeScreenshot(name: string, fullPage: boolean = false) {
    await this.page.screenshot({
      path: `reports/screenshots/${name}-${Date.now()}.png`,
      fullPage
    });
  }

  /**
   * 模拟文件上传
   */
  async uploadFile(selector: string, filePath: string) {
    const fileInput = this.page.locator(selector);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * 等待API响应
   */
  async waitForApiResponse(urlPattern: string | RegExp, timeout: number = 10000) {
    return await this.page.waitForResponse(urlPattern, { timeout });
  }

  /**
   * 检查控制台错误
   */
  async checkConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  /**
   * 模拟键盘操作
   */
  async pressKey(key: string) {
    await this.page.keyboard.press(key);
  }

  /**
   * 滚动到元素
   */
  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * 等待元素消失
   */
  async waitForElementToDisappear(selector: string, timeout: number = 10000) {
    await this.page.locator(selector).waitFor({ state: 'hidden', timeout });
  }

  /**
   * 智能等待策略 - 等待元素稳定后再操作
   */
  async waitForElementStable(selector: string, timeout: number = 10000) {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    await element.waitFor({ state: 'attached', timeout });
    // 等待元素位置稳定
    await this.page.waitForTimeout(100);
  }

  /**
   * 重试机制 - 对不稳定的操作进行重试
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await this.page.waitForTimeout(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 获取元素属性值
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.locator(selector).getAttribute(attribute);
  }

  /**
   * 检查元素是否包含特定类名
   */
  async hasClass(selector: string, className: string): Promise<boolean> {
    const element = this.page.locator(selector);
    const classAttribute = await element.getAttribute('class');
    return classAttribute?.includes(className) || false;
  }
}

/**
 * 测试数据生成器
 */
export class TestDataGenerator {
  /**
   * 生成随机字符串
   */
  static randomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成随机邮箱
   */
  static randomEmail(): string {
    return `test_${this.randomString(8)}@example.com`;
  }

  /**
   * 生成随机用户名
   */
  static randomUsername(): string {
    return `user_${this.randomString(6)}`;
  }

  /**
   * 生成测试文档数据
   */
  static generateDocumentData() {
    return {
      title: `测试文档_${this.randomString(6)}`,
      content: `这是一个测试文档内容，包含随机字符串：${this.randomString(20)}`,
      category: '测试分类',
      tags: ['测试', '自动化', this.randomString(4)]
    };
  }

  /**
   * 生成搜索关键词
   */
  static generateSearchKeywords(): string[] {
    return ['测试', '文档', '知识库', '管理', '系统'];
  }
}

/**
 * API测试辅助类
 */
/**
 * API响应接口
 */
interface ApiResponse {
  status: number;
  ok: boolean;
  data: any;
  headers: Headers;
  json(): Promise<any>;
}

export class ApiTestHelpers {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.API_BASE_URL || 'http://localhost:5000/api/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * 发送GET请求
   */
  async get(endpoint: string, headers: Record<string, string> = {}): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
    
    const data = await response.json().catch(() => null);
    
    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: response.headers,
      json: async () => data
    };
  }

  /**
   * 发送POST请求
   */
  async post(endpoint: string, data: any, headers: Record<string, string> = {}): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(data)
    });
    
    const responseData = await response.json().catch(() => null);
    
    return {
      status: response.status,
      ok: response.ok,
      data: responseData,
      headers: response.headers,
      json: async () => responseData
    };
  }

  /**
   * 发送PUT请求
   */
  async put(endpoint: string, data: any, headers: Record<string, string> = {}): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(data)
    });
    
    const responseData = await response.json().catch(() => null);
    
    return {
      status: response.status,
      ok: response.ok,
      data: responseData,
      headers: response.headers,
      json: async () => responseData
    };
  }

  /**
   * 发送DELETE请求
   */
  async delete(endpoint: string, headers: Record<string, string> = {}): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
    
    const responseData = await response.json().catch(() => null);
    
    return {
      status: response.status,
      ok: response.ok,
      data: responseData,
      headers: response.headers,
      json: async () => responseData
    };
  }
}

/**
 * 断言辅助方法
 */
export class AssertionHelpers {
  /**
   * 断言API响应状态
   */
  static async assertApiResponse(response: any, expectedStatus: number, expectedData?: any) {
    expect(response.status).toBe(expectedStatus);
    if (expectedData) {
      expect(response.data).toMatchObject(expectedData);
    }
  }

  /**
   * 断言元素文本内容
   */
  static async assertElementText(locator: Locator, expectedText: string | RegExp) {
    await expect(locator).toHaveText(expectedText);
  }

  /**
   * 断言元素可见性
   */
  static async assertElementVisible(locator: Locator) {
    await expect(locator).toBeVisible();
  }

  /**
   * 断言元素不可见
   */
  static async assertElementHidden(locator: Locator) {
    await expect(locator).toBeHidden();
  }

  /**
   * 断言URL包含特定路径
   */
  static async assertUrlContains(page: Page, expectedPath: string) {
    await expect(page).toHaveURL(new RegExp(expectedPath));
  }
}