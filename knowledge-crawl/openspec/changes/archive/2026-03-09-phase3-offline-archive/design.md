# Phase 3 技术设计

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Phase 3 数据流                                    │
└─────────────────────────────────────────────────────────────────────────┘

  输入                         处理                        输出
  ────                         ────                        ────

┌──────────────┐      ┌────────────────────────────────┐
│ --url-list   │─────▶│  1. 读取 URL 清单              │
│ (TXT/CSV)    │      │  2. 加载 download_history.csv  │
└──────────────┘      │  3. 去重（跳过已下载）          │
                      │                                │
┌──────────────┐      │  4. Playwright 打开页面        │      ┌────────────────┐
│ vendors_     │─────▶│  5. 滚动触发懒加载             │─────▶│ offline_archive│
│ enriched.csv │      │  6. SingleFile 保存            │      │ /<domain>.html │
└──────────────┘      │  7. 追加到 download_history    │      └────────────────┘
                      │                                │
                      │  8. 生成 offline_index.html    │      ┌────────────────┐
                      └────────────────────────────────┘      │download_history│
                                                              │.csv            │
                                                              └────────────────┘
```

## 模块设计

### 1. offline-archiver.js

离线归档核心服务模块。

```javascript
/**
 * 离线归档服务
 */
module.exports = {
  // 读取 URL 清单（TXT/CSV）
  readUrlList(filePath),

  // 加载下载历史
  loadDownloadHistory(archiveDir),

  // 过滤已下载的 URL
  filterNewUrls(urls, history),

  // 下载单个页面（含重试）
  async downloadPage(page, url, options),

  // 滚动页面触发懒加载
  async scrollPage(page),

  // 使用 SingleFile 保存
  async saveWithSingleFile(page),

  // 追加下载记录
  appendHistory(archiveDir, record),

  // 批量下载
  async downloadAll(urls, options)
};
```

### 2. index-generator.js

索引页生成服务模块。

```javascript
/**
 * 索引页生成服务
 */
module.exports = {
  // 从 vendors_enriched.csv 加载厂商数据
  loadVendorsData(csvPath),

  // 从 download_history.csv 加载下载历史
  loadHistoryData(archiveDir),

  // 聚合数据（只保留成功下载）
  mergeData(vendors, history),

  // 生成 HTML（内联 CSS/JS）
  generateHtml(data),

  // 写入索引页
  writeIndex(archiveDir, html)
};
```

## CLI 参数

### 新增参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--phase3` | boolean | false | 启用 Phase 3 离线归档模式 |
| `--url-list` | string | - | URL 清单文件路径（TXT/CSV） |
| `--archive-dir` | string | `./offline_archive` | 归档目录 |
| `--timeout` | number | 30000 | 单页面下载超时（毫秒） |
| `--max-size` | number | 10240 | 单文件最大体积（KB） |

### 使用示例

```bash
# 只运行 Phase 3（从已有数据）
node src/index.js --phase3 \
  --vendors-file "./outputs/20260303-142530/vendors_enriched.csv"

# Phase 3 + 自定义 URL 清单
node src/index.js --phase3 \
  --url-list "./my-urls.txt" \
  --archive-dir "./my-archive"

# Phase 3 + 自定义超时和大小限制
node src/index.js --phase3 \
  --vendors-file "./outputs/latest/vendors_enriched.csv" \
  --timeout 60000 \
  --max-size 20480
```

## SingleFile 集成

### 依赖安装

```bash
npm install single-file
```

### 使用方式

```javascript
const { singlefile } = require('single-file');

async function saveWithSingleFile(page) {
  // 1. 注入 SingleFile 脚本
  await page.addScriptTag({
    path: require.resolve('single-file/lib/single-file.bundle.js')
  });

  // 2. 执行保存
  const html = await page.evaluate(() => {
    return singlefile.getPageData({
      removeHiddenElements: true,
      removeUnusedStyles: true,
      removeUnusedFonts: true,
      compressHTML: true
    });
  });

  return html;
}
```

## 懒加载处理

```javascript
async function scrollPage(page) {
  await page.evaluate(async () => {
    // 滚动到底部
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });

    // 滚动回顶部
    window.scrollTo(0, 0);
  });

  // 等待图片加载
  await page.waitForTimeout(2000);
}
```

## 失败重试策略

```javascript
async function downloadWithRetry(page, url, options = {}) {
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await downloadPage(page, url, options);
      return { success: true, data: result };
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // 指数退避
        console.log(`  重试 ${attempt}/${maxRetries}，等待 ${delay}ms...`);
        await sleep(delay);
      } else {
        return { success: false, error: error.message };
      }
    }
  }
}
```

## 输出文件格式

### download_history.csv

```csv
original_url,local_path,status,download_time,file_size_kb,error_message
https://example.com,example_com.html,SUCCESS,2026-03-06 14:30:00,256,
https://failed.com,failed_com.html,FAILED,2026-03-06 14:31:00,0,Timeout
```

### offline_index.html

单文件 HTML，内联所有 CSS/JS，包含：
- 厂商列表表格
- 搜索框（按公司名模糊匹配）
- 下拉筛选（按国家/标签）
- 排序功能（按分数/名称）
- 点击打开本地离线页面

## 浏览器复用

复用现有 `browser-data/` 目录，保持登录状态：

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launchPersistentContext('./browser-data', {
  headless: false,
  viewport: { width: 1280, height: 800 }
});
```
