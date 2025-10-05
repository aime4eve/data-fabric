import { test, expect } from '@playwright/test';

test.describe('调试测试', () => {
  test('页面元素调试', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 截图查看页面状态
    await page.screenshot({ path: 'debug-page.png', fullPage: true });
    
    // 打印页面HTML结构
    const html = await page.content();
    console.log('页面HTML:', html.substring(0, 2000));
    
    // 查找所有按钮
    const buttons = await page.locator('button').all();
    console.log('找到的按钮数量:', buttons.length);
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await button.textContent();
      const classes = await button.getAttribute('class');
      console.log(`按钮 ${i}: 文本="${text}", 类名="${classes}"`);
    }
    
    // 查找所有输入框
    const inputs = await page.locator('input').all();
    console.log('找到的输入框数量:', inputs.length);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const placeholder = await input.getAttribute('placeholder');
      const type = await input.getAttribute('type');
      const classes = await input.getAttribute('class');
      console.log(`输入框 ${i}: 占位符="${placeholder}", 类型="${type}", 类名="${classes}"`);
    }
  });
});