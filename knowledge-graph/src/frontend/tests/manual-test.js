// 手动测试脚本 - 在浏览器控制台中运行
console.log('开始手动测试文档上传功能...');

// 1. 检查useForm警告
console.log('1. 检查useForm相关警告...');
const forms = document.querySelectorAll('form');
console.log('页面中的表单数量:', forms.length);

forms.forEach((form, index) => {
  console.log(`表单 ${index + 1}:`, {
    id: form.id,
    className: form.className,
    testId: form.getAttribute('data-testid'),
    hasFormAttribute: form.hasAttribute('form')
  });
});

// 2. 检查文件上传组件
console.log('2. 检查文件上传组件...');
const fileInputs = document.querySelectorAll('input[type="file"]');
console.log('文件输入框数量:', fileInputs.length);

fileInputs.forEach((input, index) => {
  console.log(`文件输入框 ${index + 1}:`, {
    accept: input.accept,
    multiple: input.multiple,
    disabled: input.disabled
  });
});

// 3. 检查目录树
console.log('3. 检查目录树组件...');
const treeNodes = document.querySelectorAll('.ant-tree-node-content-wrapper');
console.log('目录树节点数量:', treeNodes.length);

// 4. 检查表单字段
console.log('4. 检查表单字段...');
const titleInput = document.querySelector('input[placeholder*="标题"]');
const descInput = document.querySelector('textarea[placeholder*="描述"]');
const submitButton = document.querySelector('button[type="submit"]');

console.log('表单字段状态:', {
  titleInput: !!titleInput,
  descInput: !!descInput,
  submitButton: !!submitButton,
  submitButtonDisabled: submitButton?.disabled
});

// 5. 模拟文件上传测试
console.log('5. 准备模拟文件上传测试...');

// 手动测试脚本 - 在浏览器控制台中运行
console.log('开始手动测试文档上传功能...');

// 1. 检查useForm警告
console.log('1. 检查useForm相关警告...');
const forms = document.querySelectorAll('form');
console.log('页面中的表单数量:', forms.length);

forms.forEach((form, index) => {
  console.log(`表单 ${index + 1}:`, {
    id: form.id,
    className: form.className,
    testId: form.getAttribute('data-testid'),
    hasFormAttribute: form.hasAttribute('form')
  });
});

// 2. 检查文件上传组件
console.log('2. 检查文件上传组件...');
const fileInputs = document.querySelectorAll('input[type="file"]');
console.log('文件输入框数量:', fileInputs.length);

fileInputs.forEach((input, index) => {
  console.log(`文件输入框 ${index + 1}:`, {
    accept: input.accept,
    multiple: input.multiple,
    disabled: input.disabled
  });
});

// 3. 检查目录树
console.log('3. 检查目录树组件...');
const treeNodes = document.querySelectorAll('.ant-tree-node-content-wrapper');
console.log('目录树节点数量:', treeNodes.length);

// 4. 检查表单字段
console.log('4. 检查表单字段...');
const titleInput = document.querySelector('input[placeholder*="标题"]');
const descInput = document.querySelector('textarea[placeholder*="描述"]');
const submitButton = document.querySelector('button[type="submit"]');

console.log('表单字段状态:', {
  titleInput: !!titleInput,
  descInput: !!descInput,
  submitButton: !!submitButton,
  submitButtonDisabled: submitButton?.disabled
});

// 5. 模拟文件上传测试
console.log('5. 准备模拟文件上传测试...');

function simulateFileUpload() {
  console.log('开始模拟文件上传...');
  
  // 创建测试文件
  const testContent = '这是一个测试文档的内容\n测试文档上传功能';
  const testFile = new File([testContent], 'test-document.txt', {
    type: 'text/plain',
    lastModified: Date.now()
  });
  
  console.log('创建的测试文件:', {
    name: testFile.name,
    size: testFile.size,
    type: testFile.type
  });
  
  // 查找文件输入框
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    // 创建文件列表
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(testFile);
    fileInput.files = dataTransfer.files;
    
    // 触发change事件
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);
    
    console.log('文件上传模拟完成');
    
    // 等待一下，然后检查文件是否被识别
    setTimeout(() => {
      const fileList = document.querySelector('.ant-upload-list');
      console.log('文件列表状态:', {
        exists: !!fileList,
        innerHTML: fileList?.innerHTML.substring(0, 200)
      });
    }, 1000);
  } else {
    console.error('未找到文件输入框');
  }
}

// 6. 检查API配置
console.log('6. 检查API配置...');
console.log('当前页面URL:', window.location.href);
console.log('API基础URL:', window.localStorage.getItem('api_base_url') || '未设置');

// 提供手动测试函数
window.testDocumentUpload = simulateFileUpload;
console.log('手动测试脚本加载完成！');
console.log('运行 testDocumentUpload() 来模拟文件上传');