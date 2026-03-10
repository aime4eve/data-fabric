import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

/**
 * 全局测试环境设置
 * 在所有测试开始前执行
 */
async function globalSetup(config: FullConfig) {
  // 加载环境变量
  dotenv.config();
  
  console.log('🚀 开始全局测试环境设置...');
  
  try {
    // 检查测试环境可用性
    await checkTestEnvironment();
    
    // 准备测试数据
    await prepareTestData();
    
    // 创建认证状态（如果需要）
    await setupAuthentication();
    
    console.log('✅ 全局测试环境设置完成');
  } catch (error: unknown) {
    console.error('❌ 全局测试环境设置失败:', error);
    throw error;
  }
}

/**
 * 检查测试环境可用性
 */
async function checkTestEnvironment() {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const apiURL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
  
  console.log('🔍 检查测试环境可用性...');
  
  try {
    // 检查前端服务
    const frontendResponse = await fetch(baseURL);
    if (!frontendResponse.ok) {
      throw new Error(`前端服务不可用: ${baseURL}`);
    }
    
    // 检查后端API
    const apiResponse = await fetch(`${apiURL}/health`);
    if (!apiResponse.ok) {
      console.warn(`⚠️ 后端健康检查失败，将跳过API相关测试`);
    }
    
    console.log('✅ 测试环境检查通过');
  } catch (error: unknown) {
    console.error('❌ 测试环境检查失败:', error);
    throw error;
  }
}

/**
 * 准备测试数据
 */
async function prepareTestData() {
  console.log('📋 准备测试数据...');
  
  // 这里可以添加测试数据准备逻辑
  // 例如：创建测试用户、上传测试文档等
  
  console.log('✅ 测试数据准备完成');
}

/**
 * 设置认证状态
 */
async function setupAuthentication() {
  console.log('🔐 设置认证状态...');
  
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const username = process.env.TEST_USERNAME || 'testuser';
  const password = process.env.TEST_PASSWORD || 'testpass123';
  
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 执行登录流程
    await page.goto(`${baseURL}/login`);
    
    // 检查登录页面是否存在
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible()) {
      await page.fill('input[name="username"], input[type="email"]', username);
      await page.fill('input[name="password"], input[type="password"]', password);
      await page.click('button[type="submit"], .login-button');
      
      // 等待登录完成
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // 保存认证状态
      await context.storageState({ path: 'tests/auth/user-auth.json' });
      console.log('✅ 用户认证状态已保存');
    }
    
    await browser.close();
  } catch (error: unknown) {
    console.warn('⚠️ 认证设置失败，将使用匿名访问:', error instanceof Error ? error.message : String(error));
  }
}

export default globalSetup;