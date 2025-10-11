// 手动调试脚本 - 检查useForm警告和上传失败问题
console.log('开始手动调试...');

// 1. 检查页面是否加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runDebug);
} else {
  runDebug();
}

function runDebug() {
  console.log('页面已加载，开始调试...');
  
  // 2. 检查Form组件
  const forms = document.querySelectorAll('form');
  console.log('找到的Form元素数量:', forms.length);
  
  forms.forEach((form, index) => {
    console.log(`Form ${index}:`, {
      className: form.className,
      id: form.id,
      hasDataTestId: form.hasAttribute('data-testid'),
      dataTestId: form.getAttribute('data-testid'),
      hasFormInstance: form.hasAttribute('data-form-instance'),
      children: form.children.length
    });
  });
  
  // 3. 检查是否有Ant Design Form组件
  const antForms = document.querySelectorAll('.ant-form');
  console.log('找到的Ant Design Form数量:', antForms.length);
  
  // 4. 检查控制台错误
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = function(...args) {
    console.log('捕获到错误:', args);
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    console.log('捕获到警告:', args);
    if (args[0] && args[0].includes && args[0].includes('useForm')) {
      console.log('发现useForm警告!');
    }
    originalWarn.apply(console, args);
  };
  
  // 5. 检查网络请求
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('发起网络请求:', args[0]);
    return originalFetch.apply(this, args).then(response => {
      console.log('网络请求响应:', response.status, response.statusText);
      return response;
    }).catch(error => {
      console.log('网络请求失败:', error);
      throw error;
    });
  };
  
  console.log('调试脚本已设置完成');
}