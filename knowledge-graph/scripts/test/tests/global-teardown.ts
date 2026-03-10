import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 全局测试环境清理
 * 在所有测试完成后执行
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始全局测试环境清理...');
  
  try {
    // 清理测试数据
    await cleanupTestData();
    
    // 清理认证文件
    await cleanupAuthFiles();
    
    // 生成测试报告摘要
    await generateTestSummary();
    
    console.log('✅ 全局测试环境清理完成');
  } catch (error: unknown) {
    console.error('❌ 全局测试环境清理失败:', error);
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  console.log('🗑️ 清理测试数据...');
  
  try {
    // 清理上传的测试文件
    const uploadPath = process.env.UPLOAD_TEST_FILES_PATH || './test-data/uploads';
    if (fs.existsSync(uploadPath)) {
      fs.rmSync(uploadPath, { recursive: true, force: true });
      console.log('✅ 测试上传文件已清理');
    }
    
    // 这里可以添加其他测试数据清理逻辑
    // 例如：删除测试用户、清理测试文档等
    
  } catch (error: unknown) {
    console.warn('⚠️ 测试数据清理部分失败:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * 清理认证文件
 */
async function cleanupAuthFiles() {
  console.log('🔐 清理认证文件...');
  
  try {
    const authDir = path.join(__dirname, 'auth');
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
      console.log('✅ 认证文件已清理');
    }
  } catch (error: unknown) {
    console.warn('⚠️ 认证文件清理失败:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * 生成测试报告摘要
 */
async function generateTestSummary() {
  console.log('📊 生成测试报告摘要...');
  
  try {
    const reportsDir = process.env.REPORT_OUTPUT_DIR || './reports';
    const resultsFile = path.join(reportsDir, 'results.json');
    
    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      
      const summary = {
        timestamp: new Date().toISOString(),
        total: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        success_rate: results.stats?.total > 0 
          ? Math.round((results.stats.passed / results.stats.total) * 100) 
          : 0
      };
      
      // 保存摘要
      const summaryFile = path.join(reportsDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
      
      // 输出摘要到控制台
      console.log('📈 测试执行摘要:');
      console.log(`   总计: ${summary.total} 个测试`);
      console.log(`   通过: ${summary.passed} 个`);
      console.log(`   失败: ${summary.failed} 个`);
      console.log(`   跳过: ${summary.skipped} 个`);
      console.log(`   成功率: ${summary.success_rate}%`);
      console.log(`   执行时间: ${Math.round(summary.duration / 1000)}秒`);
      
      console.log('✅ 测试报告摘要已生成');
    }
  } catch (error: unknown) {
    console.warn('⚠️ 测试报告摘要生成失败:', error instanceof Error ? error.message : String(error));
  }
}

export default globalTeardown;