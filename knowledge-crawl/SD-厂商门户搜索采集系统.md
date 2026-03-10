# 系统设计文档 - 厂商门户搜索采集系统

| 项目 | 内容 |
|---|---|
| 文档版本 | v1.0 |
| 编写日期 | 2026-03-04 |
| 基于 | PRD-厂商门户搜索采集系统.md v0.1 |
| 开发方法 | TDD（测试驱动开发） |

---

## 1. 概述

### 1.1 系统目标

厂商门户搜索采集系统是一个基于 Playwright 浏览器自动化的外贸推广辅助工具，旨在：

1. **Phase 0**：从 Google 搜索结果中采集并聚合"厂商门户网站"域名线索
2. **Phase 1**：对候选域名进行证据页抓取、联系方式抽取，形成完整的厂商档案

### 1.2 技术栈

| 层级 | 技术选型 |
|------|---------|
| 运行时 | Node.js (CommonJS) |
| 浏览器自动化 | Playwright (有头模式) |
| 测试框架 | Node.js 内置 `node:test` |
| 断言库 | Node.js 内置 `node:assert` |
| 数据存储 | CSV 文件 |
| 时间处理 | 北京时间 (UTC+8) |

### 1.3 TDD 开发方法论

本项目采用 **测试驱动开发 (TDD)** 方法，遵循 **Red-Green-Refactor** 循环：

```
┌─────────────────────────────────────────────────────────────┐
│                     TDD 开发循环                              │
│                                                              │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐             │
│   │  Red    │ ───▶ │  Green  │ ───▶ │ Refactor│ ───┐        │
│   │(写测试) │      │(写实现) │      │ (优化)  │    │        │
│   └─────────┘      └─────────┘      └─────────┘    │        │
│        ▲                                           │        │
│        └───────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**测试覆盖目标：**
- 单元测试：覆盖所有服务模块和工具类
- 边界条件：空输入、无效数据、异常场景
- 集成测试：模块间协作、数据流完整性

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLI 入口 (index.js)                            │
│                    解析参数 → 编排流程 → 输出结果                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Phase 0 服务   │     │   Phase 1 服务   │     │     工具类      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ keyword-extractor│     │ domain-reader   │     │ cli             │
│ query-generator  │     │ robots-checker  │     │ context         │
│ serp-collector   │     │ evidence-fetcher│     │ url-normalizer  │
│ domain-aggregator│     │ contact-extractor│    │ csv-writer      │
│ scorer           │     │ vendor-aggregator│    │ manifest-writer │
│                  │     │                 │     │ time            │
└─────────────────┘     └─────────────────┘     └─────────────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    ▼
                    ┌─────────────────────────────┐
                    │        数据层 (CSV)          │
                    │  serp_results_raw.csv       │
                    │  domains_agg.csv            │
                    │  vendors.csv                │
                    │  run_manifest.json          │
                    └─────────────────────────────┘
```

### 2.2 模块职责划分

| 模块类型 | 文件 | 职责 |
|---------|------|------|
| **入口** | index.js | 流程编排、服务协调 |
| **Phase 0 服务** | keyword-extractor.js | 从文档/CSV提取关键词 |
| | query-generator.js | 生成搜索查询词 |
| | serp-collector.js | Playwright采集Google SERP |
| | domain-aggregator.js | 按domain_key聚合去重 |
| | scorer.js | 计算域名评分和原因 |
| **Phase 1 服务** | domain-reader.js | 读取domains_agg.csv构建队列 |
| | robots-checker.js | robots.txt合规检查 |
| | evidence-fetcher.js | 抓取证据页、提取文本 |
| | contact-extractor.js | 抽取邮箱/电话/公司名等 |
| | vendor-aggregator.js | 聚合厂商档案、输出CSV |
| **工具类** | cli.js | CLI参数解析 |
| | context.js | 运行上下文管理 |
| | url-normalizer.js | URL归一化、域名提取 |
| | csv-writer.js | CSV文件写入 |
| | manifest-writer.js | 运行清单JSON写入 |
| | time.js | 北京时间工具 |

---

## 3. TDD 测试策略

### 3.1 测试框架配置

```javascript
// 使用 Node.js 内置测试框架
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
```

### 3.2 测试文件映射

| 服务模块 | 测试文件 | 测试用例数 | 覆盖场景 |
|---------|---------|-----------|---------|
| keyword-extractor.js | keyword-extractor.test.js | 6 | Markdown提取、CSV解析、空输入、不支持的格式 |
| query-generator.js | query-generator.test.js | 6 | 同义词展开、去重、数量限制、供应商意图 |
| serp-collector.js | serp-collector.test.js | 5 | URL生成、验证码检测、模拟数据 |
| domain-aggregator.js | domain-aggregator.test.js | 4 | 聚合逻辑、min_rank追踪、空结果 |
| scorer.js | scorer.test.js | 7 | 排名加分、命中加分、关键词匹配、负向词扣分 |
| domain-reader.js | domain-reader.test.js | 9 | 文件验证、CSV解析、队列构建、maxDomains限制 |
| robots-checker.js | robots-checker.test.js | 11 | 解析、路径匹配、User-Agent规则、通配符 |
| evidence-fetcher.js | evidence-fetcher.test.js | 5 | 文本提取、记录创建、错误处理 |
| contact-extractor.js | contact-extractor.test.js | 12 | 邮箱/电话/地址/社交链接提取、合并 |
| vendor-aggregator.js | vendor-aggregator.test.js | 8 | 证据页合并、厂商聚合、CSV写入 |

**总计：16 个测试文件，73+ 个测试用例**

---

## 4. Phase 0 详细设计

### 4.1 关键词提取服务 (keyword-extractor.js)

#### 业务需求（来源 PRD）
> 支持从"指定产品文档"自动抽取关键词与查询词，也支持人工维护关键词文件。

#### 测试用例设计（Red 阶段）

| 用例编号 | describe 块 | it 块描述 | 测试场景 | 关键断言 |
|---------|------------|----------|---------|---------|
| TC-KE-01 | extractKeywordsFromMarkdown | should extract keywords from content | 从Markdown提取关键词 | 包含'lorawan', 'solenoid' |
| TC-KE-02 | extractKeywordsFromMarkdown | should handle empty content | 空内容处理 | 返回空数组 |
| TC-KE-03 | readKeywordsCSV | should read keywords from CSV file | 读取CSV关键词 | 包含指定关键词 |
| TC-KE-04 | readKeywordsCSV | should parse synonyms correctly | 解析同义词 | 同义词数组正确 |
| TC-KE-05 | extractKeywords | should extract from markdown file | 从文件提取 | 返回关键词数组 |
| TC-KE-06 | extractKeywords | should throw error for unsupported file type | 不支持的格式 | 抛出错误 |

#### 实现设计（Green 阶段）

```javascript
// 核心函数签名
function extractKeywordsFromMarkdown(content) // string -> string[]
function readKeywordsCSV(filePath)           // string -> Object[]
async function extractKeywords(filePath)     // string -> Promise<string[]>

// 关键词模式（正则）
const KEYWORD_PATTERNS = [
  /solenoid\s*valve/gi, /lorawan/gi, /irrigation/gi,
  /电磁阀/g, /控制器/g, ...
];
```

#### 测试覆盖分析

| 场景类型 | 覆盖情况 |
|---------|---------|
| 正常场景 | ✅ Markdown提取、CSV读取、同义词解析 |
| 边界条件 | ✅ 空内容、空文件 |
| 异常情况 | ✅ 不支持的文件类型 |

---

### 4.2 查询词生成服务 (query-generator.js)

#### 业务需求（来源 PRD）
> 系统生成查询词（query）列表，添加供应商意图词（supplier/manufacturer/vendor）

#### 测试用例设计（Red 阶段）

| 用例编号 | describe 块 | it 块描述 | 测试场景 | 关键断言 |
|---------|------------|----------|---------|---------|
| TC-QG-01 | expandSynonyms | should expand keywords with synonyms | 同义词展开 | 包含原词和同义词 |
| TC-QG-02 | expandSynonyms | should handle empty input | 空输入 | 返回空数组 |
| TC-QG-03 | deduplicateQueries | should remove duplicate queries | 去重 | 数量正确 |
| TC-QG-04 | generateQueries | should generate queries from keywords | 生成查询 | 包含关键词 |
| TC-QG-05 | generateQueries | should limit query count | 数量限制 | ≤ maxQueries |
| TC-QG-06 | generateQueries | should include supplier intent queries | 供应商意图 | 包含supplier/manufacturer |

#### 实现设计（Green 阶段）

```javascript
// 核心函数签名
function expandSynonyms(keywords, synonymMap)    // string[], Object -> string[]
function deduplicateQueries(queries)             // string[] -> string[]
function generateQueries(keywords, options)      // string[], Object -> string[]

// 供应商意图词
const SUPPLIER_INTENTS = ['supplier', 'manufacturer', 'factory', 'vendor', 'wholesaler'];
```

#### 查询生成策略

```
输入: ['solenoid valve', 'controller', 'lorawan']

输出策略:
1. 核心组合: "solenoid valve controller"
2. 产品+供应商: "solenoid valve supplier", "solenoid valve manufacturer"
3. 技术组合: "solenoid valve lorawan"
4. 应用场景: "solenoid valve irrigation"
5. 单独+供应商: "solenoid valve supplier", "controller supplier"
```

---

### 4.3 SERP 采集服务 (serp-collector.js)

#### 业务需求（来源 PRD）
> 系统用 Playwright 打开 Google，逐个 query 搜索，抓取 Top20 搜索结果

#### 测试用例设计（Red 阶段）

| 用例编号 | describe 块 | it 块描述 | 测试场景 | 关键断言 |
|---------|------------|----------|---------|---------|
| TC-SC-01 | createSearchUrl | should create Google search URL | URL生成 | 包含google.com/search |
| TC-SC-02 | detectCaptcha | should detect captcha page | 验证码检测 | 返回true |
| TC-SC-03 | detectCaptcha | should detect unusual traffic message | 异常流量检测 | 返回true |
| TC-SC-04 | detectCaptcha | should return false for normal page | 正常页面 | 返回false |
| TC-SC-05 | generateMockResults | should generate valid mock data | 模拟数据生成 | 字段完整 |

#### 实现设计（Green 阶段）

```javascript
// 核心函数签名
function createSearchUrl(query)                          // string -> string
function detectCaptcha(html)                             // string -> boolean
function isSorryPage(url)                                // string -> boolean
async function waitForManualVerification(page, maxWaitMs) // Object, number -> Promise<boolean>
async function searchWithPlaywright(page, query, runId)   // Object, string, string -> Promise<Object[]>
async function collectSerpResults(queries, context, config) // string[], Object, Object -> Promise<Object[]>

// 验证码检测关键词
const CAPTCHA_INDICATORS = [
  'g-recaptcha', 'h-captcha', 'verify you are human',
  'unusual traffic', 'automated requests', 'captcha', 'sorry...', '/sorry/'
];
```

#### 节流策略

```
┌─────────────────────────────────────────────────────────────┐
│                     节流策略设计                              │
├─────────────────────────────────────────────────────────────┤
│ 导航前随机暂停: 0.5 - 2 秒                                   │
│ 页面加载后暂停: 1 - 3 秒                                     │
│ 滚动后随机暂停: 0.5 - 2 秒                                   │
│ 每次查询后等待: 1 - 5 秒                                     │
├─────────────────────────────────────────────────────────────┤
│ 模拟人类滚动:                                                │
│   1. 滚动到页面中部                                          │
│   2. 等待 0.5-1 秒                                          │
│   3. 滚动到页面底部                                          │
└─────────────────────────────────────────────────────────────┘
```

#### 验证处理流程

```
检测到 /sorry/ 页面
        │
        ▼
┌───────────────────────┐
│  暂停采集，等待用户    │
│  手动完成验证         │
│  (最长10分钟)         │
└───────────────────────┘
        │
        ├─── 验证通过 ──▶ 继续采集
        │
        └─── 验证超时 ──▶ 停止整个采集任务
                          记录 error_reason
```

---

### 4.4 域名聚合服务 (domain-aggregator.js)

#### 业务需求（来源 PRD）
> 系统应按 domain_key 聚合，统计 hit_count、min_rank、命中 queries 列表

#### 测试用例设计（Red 阶段）

| 用例编号 | describe 块 | it 块描述 | 测试场景 | 关键断言 |
|---------|------------|----------|---------|---------|
| TC-DA-01 | createDomainRecord | should create a domain record | 创建记录 | 字段正确 |
| TC-DA-02 | aggregateDomains | should aggregate by domain_key | 按key聚合 | 数量正确 |
| TC-DA-03 | aggregateDomains | should track min_rank correctly | min_rank追踪 | 取最小值 |
| TC-DA-04 | aggregateDomains | should handle empty results | 空结果 | 返回空数组 |

#### 实现设计（Green 阶段）

```javascript
// 核心函数签名
function createDomainRecord(serpResult)  // Object -> Object
function aggregateDomains(serpResults)   // Object[] -> Object[]

// 聚合逻辑
// 1. 按 domain_key 分组
// 2. 计算 min_rank (取最小值)
// 3. 计算 hit_count (计数)
// 4. 收集 queries (去重合并，用 | 分隔)
// 5. 收集 titles 和 snippets (用于评分)
```

---

### 4.5 评分服务 (scorer.js)

#### 业务需求（来源 PRD）
> 系统应为每个 domain_key 计算 score 与 reason（可解释）

#### 测试用例设计（Red 阶段）

| 用例编号 | describe 块 | it 块描述 | 测试场景 | 关键断言 |
|---------|------------|----------|---------|---------|
| TC-SC-01 | calculateScore | should give higher score for better rank | 排名靠前高分 | scoreHigh > scoreLow |
| TC-SC-02 | calculateScore | should give higher score for more hits | 命中多高分 | scoreMany > scoreFew |
| TC-SC-03 | calculateScore | should give score between 0 and 100 | 分数范围 | 0 ≤ score ≤ 100 |
| TC-SC-04 | scoreDomain | should score with category keywords | 类目词加分 | score > 0, reason存在 |
| TC-SC-05 | scoreDomain | should penalize negative keywords | 负向词扣分 | forumScore < normalScore |
| TC-SC-06 | scoreDomain | should detect category keywords | 检测关键词 | matchedKeywords非空 |
| TC-SC-07 | getReasonText | should generate readable reason text | 生成原因 | 文本长度 > 10 |

#### 实现设计（Green 阶段）

```javascript
// 核心函数签名
function calculateScore(domain)           // Object -> number
function scoreDomain(domain)              // Object -> Object
function getReasonText(scoreData)         // Object -> string

// 评分维度
const CATEGORY_KEYWORDS = [  // 加分词
  'lorawan', 'valve', 'solenoid', 'controller', 'irrigation',
  'manufacturer', 'supplier', 'factory', ...
];

const NEGATIVE_KEYWORDS = [  // 扣分词
  'forum', 'wiki', 'news', 'blog', 'amazon', 'ebay', ...
];
```

#### 评分算法

```
┌─────────────────────────────────────────────────────────────┐
│                     评分算法设计                              │
├─────────────────────────────────────────────────────────────┤
│ 基础分: 50                                                   │
├─────────────────────────────────────────────────────────────┤
│ 排名加分:                                                    │
│   min_rank 1-5:   +20                                        │
│   min_rank 6-10:  +10                                        │
│   min_rank 11-15: +5                                         │
├─────────────────────────────────────────────────────────────┤
│ 命中加分:                                                    │
│   hit_count ≥ 4:  +15                                        │
│   hit_count = 3:  +10                                        │
│   hit_count = 2:  +5                                         │
├─────────────────────────────────────────────────────────────┤
│ 关键词加分: 每命中一个类目词 +2，最多 +15                       │
├─────────────────────────────────────────────────────────────┤
│ 负向词扣分: 每命中一个负向词 -5，最多 -30                       │
├─────────────────────────────────────────────────────────────┤
│ 总分范围: 0 - 100                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Phase 1 详细设计

### 5.1 域名读取服务 (domain-reader.js)

#### 业务需求（来源 PRD）
> 从 domains_agg.csv 选取候选域名并抓取证据页

#### 测试用例设计（Red 阶段）

| 用例编号 | describe 块 | it 块描述 | 测试场景 | 关键断言 |
|---------|------------|----------|---------|---------|
| TC-DR-01 | validateDomainsFile | should return error when file does not exist | 文件不存在 | valid=false, error包含'not found' |
| TC-DR-02 | validateDomainsFile | should return error when required fields missing | 缺少字段 | error包含'Missing required fields' |
| TC-DR-03 | validateDomainsFile | should return valid when all required fields present | 字段完整 | valid=true |
| TC-DR-04 | readDomainsAgg | should read and parse correctly | 正确解析 | 记录数正确 |
| TC-DR-05 | readDomainsAgg | should handle quoted fields | 引号字段 | 解析正确 |
| TC-DR-06 | readDomainsAgg | should skip empty lines | 跳过空行 | 忽略空行 |
| TC-DR-07 | buildDomainQueue | should build queue with correct structure | 队列结构 | paths数组存在 |
| TC-DR-08 | buildDomainQueue | should include all 8 evidence paths | 8个路径 | 路径数量=8 |
| TC-DR-09 | buildDomainQueue | should respect maxDomains option | 限制数量 | 队列长度=限制值 |

#### 实现设计（Green 阶段）

```javascript
// 核心函数签名
function validateDomainsFile(filePath)  // string -> { valid, error, fields }
function readDomainsAgg(filePath)       // string -> Object[]
function buildDomainQueue(domains, runId, options)  // Object[], string, Object -> Object[]

// 必需字段
const REQUIRED_FIELDS = ['run_id', 'domain_key', 'domain'];

// 证据页路径（最多8页）
const EVIDENCE_PATHS = [
  '/', '/products', '/product', '/solutions',
  '/downloads', '/download', '/contact', '/about'
];
```

---

### 5.2 robots 合规检查 (robots-checker.js)

#### 业务需求（来源 PRD）
> 系统必须遵守 robots.txt：若 robots 明确禁止抓取目标路径，应跳过并记录原因

#### 测试用例设计（Red 阶段）

| 用例编号 | describe 块 | it 块描述 | 测试场景 | 关键断言 |
|---------|------------|----------|---------|---------|
| TC-RC-01 | parseRobotsTxt | should parse basic robots.txt | 基础解析 | disallow/allow数量正确 |
| TC-RC-02 | parseRobotsTxt | should handle multiple user-agents | 多UA | 规则分开 |
| TC-RC-03 | parseRobotsTxt | should handle empty robots.txt | 空文件 | 返回空规则 |
| TC-RC-04 | parseRobotsTxt | should handle comments | 注释处理 | 忽略注释 |
| TC-RC-05 | isPathAllowed | should allow when no rules | 无规则 | allowed=true |
| TC-RC-06 | isPathAllowed | should allow when not disallowed | 未禁止 | allowed=true |
| TC-RC-07 | isPathAllowed | should disallow when matched | 匹配禁止 | allowed=false |
| TC-RC-08 | isPathAllowed | should allow specific over general | Allow优先 | allowed=true |
| TC-RC-09 | isPathAllowed | should handle wildcard patterns | 通配符 | 正确匹配 |
| TC-RC-10 | checkPathsAgainstRobots | should check all paths | 批量检查 | 结果数量正确 |
| TC-RC-11 | filterAllowedPaths | should return only allowed | 过滤 | 仅返回允许的 |

#### 实现设计（Green 阶段）

```javascript
// 核心函数签名
function parseRobotsTxt(content)                              // string -> Object
function matchPath(pattern, path)                             // string, string -> boolean
function isPathAllowed(robotsInfo, path, userAgent)           // Object, string, string -> { allowed, reason }
function checkPathsAgainstRobots(robotsInfo, paths, userAgent) // Object, string[], string -> Object[]
function filterAllowedPaths(robotsInfo, paths, userAgent)     // Object, string[], string -> { allowed, skipped }
```

---

### 5.3 证据页抓取服务 (evidence-fetcher.js)

#### 业务需求（来源 PRD）
> 每个域名最多抓取 8 页，路径集合：/、/products、/product、/solutions、/downloads、/download、/contact、/about

#### 测试用例设计（Red 阶段）

| 用例编号 | describe 块 | it 块描述 | 测试场景 | 关键断言 |
|---------|------------|----------|---------|---------|
| TC-EF-01 | extractPageText | should extract text from simple HTML | 文本提取 | 包含关键文本 |
| TC-EF-02 | extractPageText | should remove script and style tags | 移除脚本 | 不含script内容 |
| TC-EF-03 | extractPageText | should handle empty HTML | 空HTML | 返回空字符串 |
| TC-EF-04 | createEvidenceRecord | should create success record | 成功记录 | status='success' |
| TC-EF-05 | createEvidenceRecord | should create error record | 错误记录 | status='error' |

#### 实现设计（Green 阶段）

```javascript
// 核心函数签名
function extractPageText(html)                                // string -> string
function createEvidenceRecord(options)                        // Object -> Object
async function fetchEvidencePage(page, domain, path, options) // Object, string, string, Object -> Promise<Object>
async function fetchAllEvidencePages(page, paths, domain, robotsInfo, options) // ... -> Promise<Object[]>
```

#### 文本清洗流程

```
原始 HTML
    │
    ▼
┌─────────────────┐
│ 移除 script 标签 │
│ 移除 style 标签  │
│ 移除 nav 标签    │
│ 移除 footer 标签 │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 移除所有 HTML 标签│
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 解码 HTML 实体   │
│ &nbsp; -> 空格   │
│ &amp; -> &       │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 规范化空白       │
│ 截取前5000字符   │
└─────────────────┘
    │
    ▼
  纯文本
```

---

### 5.4 联系方式抽取服务 (contact-extractor.js)

#### 业务需求（来源 PRD）
> 抽取 company_name、email、phone、address、country、social_links、contact_form_url

#### 测试用例设计（Red 阶段）

| 用例编号 | describe 块 | it 块描述 | 测试场景 | 关键断言 |
|---------|------------|----------|---------|---------|
| TC-CE-01 | extractEmails | should extract email addresses | 邮箱提取 | 包含正确邮箱 |
| TC-CE-02 | extractEmails | should deduplicate emails | 邮箱去重 | 无重复 |
| TC-CE-03 | extractPhones | should extract phone numbers | 电话提取 | 格式正确 |
| TC-CE-04 | extractCompanyNames | should extract company names | 公司名称 | 包含关键词 |
| TC-CE-05 | extractAddress | should extract address | 地址提取 | 包含街道 |
| TC-CE-06 | extractCountry | should extract country | 国家提取 | 正确国家 |
| TC-CE-07 | extractSocialLinks | should extract LinkedIn | LinkedIn | 包含linkedin.com |
| TC-CE-08 | extractSocialLinks | should extract WhatsApp | WhatsApp | 包含WhatsApp |
| TC-CE-09 | extractContactFormUrl | should extract form URL | 表单URL | URL正确 |
| TC-CE-10 | extractAllContacts | should extract all types | 全部类型 | 所有字段存在 |
| TC-CE-11 | mergeContactData | should merge from multiple pages | 多页合并 | 数据完整 |
| TC-CE-12 | mergeContactData | should handle empty list | 空列表 | 返回默认值 |

#### 实现设计（Green 阶段）

```javascript
// 正则表达式
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_REGEX = /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3,4})[-. ]*(\d{4})/g;
const COMPANY_REGEX = /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s+(?:Co\.|Inc\.|Corp\.|Ltd\.|LLC|GmbH))/g;

// 核心函数签名
function extractEmails(text)                       // string -> string[]
function extractPhones(text)                       // string -> string[]
function extractCompanyNames(text)                 // string -> string[]
function extractAddress(text)                      // string -> string|null
function extractCountry(text)                      // string -> string|null
function extractSocialLinks(text)                  // string -> string[]
function extractContactFormUrl(text, baseUrl)      // string, string -> string|null
function extractAllContacts(text, baseUrl)         // string, string -> Object
function mergeContactData(pageDataList)            // Object[] -> Object
```

---

### 5.5 厂商档案聚合 (vendor-aggregator.js)

#### 业务需求（来源 PRD）
> 输出 vendors.csv，字段包括 run_id, domain_key, company_name, home_url, product_url, contact_url, contact_form_url, email, phone, address, country, social_links, score, reason, evidence_text, evidence_urls, first_seen_at, last_seen_at

#### 测试用例设计（Red 阶段）

| 用例编号 | describe 块 | it 块描述 | 测试场景 | 关键断言 |
|---------|------------|----------|---------|---------|
| TC-VA-01 | VENDORS_HEADERS | should have correct header order | 表头顺序 | 包含所有必需字段 |
| TC-VA-02 | mergeEvidencePages | should merge pages correctly | 页面合并 | 文本和URL正确 |
| TC-VA-03 | mergeEvidencePages | should filter error pages | 过滤错误页 | 不含错误页 |
| TC-VA-04 | mergeEvidencePages | should handle empty pages | 空页面 | 返回空字符串 |
| TC-VA-05 | aggregateVendorRecord | should create complete record | 完整记录 | 所有字段存在 |
| TC-VA-06 | aggregateAllVendors | should process all domains | 处理全部 | 数量正确 |
| TC-VA-07 | writeVendorsCsv | should write correct format | 格式正确 | 包含表头和数据 |
| TC-VA-08 | writeVendorsCsv | should handle special characters | 特殊字符 | 引号转义正确 |

#### 实现设计（Green 阶段）

```javascript
// 核心函数签名
function mergeEvidencePages(pages)                  // Object[] -> { evidence_text, evidence_urls }
function aggregateVendorRecord(domainItem, evidencePages) // Object, Object[] -> Object
function aggregateAllVendors(domainQueue, evidenceMap)    // Object[], Map -> Object[]
function writeVendorsCsv(vendors, filePath)               // Object[], string -> void

// CSV 表头
const VENDORS_HEADERS = [
  'run_id', 'domain_key', 'company_name', 'home_url', 'product_url',
  'contact_url', 'contact_form_url', 'email', 'phone', 'address',
  'country', 'social_links', 'score', 'reason', 'evidence_text',
  'evidence_urls', 'first_seen_at', 'last_seen_at'
];
```

---

## 6. 工具类设计

### 6.1 CLI 参数解析 (cli.js)

#### 测试用例

| 用例编号 | describe 块 | it 块描述 | 测试场景 |
|---------|------------|----------|---------|
| TC-CLI-01 | parseArgs | should parse --source-doc | 解析源文档参数 |
| TC-CLI-02 | parseArgs | should parse --keywords-file | 解析关键词文件参数 |
| TC-CLI-03 | parseArgs | should use defaults for missing args | 缺失参数使用默认值 |

#### 实现设计

```javascript
function getDefaultConfig()     // -> { sourceDoc, keywordsFile, outputDir, topN, headful, maxDomains, runId }
function parseArgs(args)        // string[] -> Object
function parseArgsFromProcess() // -> Object

// 默认配置
{
  sourceDoc: null,
  keywordsFile: null,
  outputDir: './outputs',
  topN: 20,          // 固定为20
  headful: true,     // 固定为true
  maxDomains: null,
  runId: null
}
```

### 6.2 URL 归一化 (url-normalizer.js)

#### 测试用例

| 用例编号 | describe 块 | it 块描述 | 测试场景 |
|---------|------------|----------|---------|
| TC-UN-01 | normalizeUrl | should upgrade http to https | 协议升级 |
| TC-UN-02 | normalizeUrl | should remove trailing slash | 移除尾部斜杠 |
| TC-UN-03 | extractDomain | should extract hostname | 提取域名 |
| TC-UN-04 | generateDomainKey | should remove www prefix | 移除www前缀 |

#### 实现设计

```javascript
function removeTrackingParams(urlString)  // string -> string
function normalizeUrl(urlString, options) // string, Object -> string|null
function extractDomain(urlString)         // string -> string|null
function generateDomainKey(urlString)     // string -> string|null

// 跟踪参数列表
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'ref', 'source', '_ga'
];
```

### 6.3 运行上下文 (context.js)

#### 实现设计

```javascript
function createContext(config)    // Object -> Object
function initOutputDir(context)   // Object -> string
function recordError(context, query, error)  // Object, string, string -> void
function updateStats(context, updates)       // Object, Object -> void
function finishContext(context)              // Object -> void

// 上下文结构
{
  runId: '20260304-142530',
  config: { sourceDoc, keywordsFile, outputDir, topN, headful, maxDomains },
  startedAt: '2026-03-04 14:25:30',
  finishedAt: null,
  outputPath: null,
  stats: { totalQueries, successfulQueries, failedQueries, totalSerpResults, uniqueDomains },
  errors: []
}
```

### 6.4 时间工具 (time.js)

#### 实现设计

```javascript
function getBeijingTime()             // -> Date
function formatBeijingTime(date)      // Date? -> string 'yyyy-MM-dd HH:mm:ss'
function generateRunId(date)          // Date? -> string 'yyyyMMdd-HHmmss'
function formatTimestamp(timestamp)   // number -> string 'yyyy-MM-dd HH:mm:ss'
```

### 6.5 CSV 写入 (csv-writer.js)

#### 实现设计

```javascript
function escapeCSV(value)             // any -> string
function toCSVRows(data, headers)     // Object[], string[] -> string[]
function writeSerpResults(results, filePath)    // Object[], string -> void
function writeDomainsAgg(domains, filePath)     // Object[], string -> void

// 表头定义
const SERP_HEADERS = ['run_id', 'captured_at', 'query', 'rank', 'title', 'snippet', 'url', 'normalized_url', 'domain', 'domain_key', 'error_reason'];
const DOMAINS_HEADERS = ['run_id', 'domain_key', 'domain', 'min_rank', 'hit_count', 'queries', 'score', 'reason'];
```

---

## 7. 数据流与状态机

### 7.1 Phase 0 数据流

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Phase 0 数据流                                      │
└─────────────────────────────────────────────────────────────────────────────┘

关键词输入                     查询生成                      SERP采集
┌──────────┐                 ┌──────────┐                 ┌──────────┐
│ 产品文档  │ ──────────────▶ │关键词提取 │ ──────────────▶ │查询词生成 │
│ (Markdown)│                 │          │                 │+供应商意图│
└──────────┘                 └──────────┘                 └──────────┘
     │                                                        │
     │  或                                                    ▼
     ▼                                              ┌──────────────────┐
┌──────────┐                                      │ Google Search    │
│ keywords │                                      │ (Playwright)     │
│   .csv   │                                      │ Top20 结果       │
└──────────┘                                      └──────────────────┘
                                                          │
                                                          ▼
                                                 ┌──────────────────┐
                                                 │ serp_results_raw │
                                                 │     .csv         │
                                                 └──────────────────┘
                                                          │
                                                          ▼
处理与聚合                                              URL归一化
┌──────────────────┐                                 ┌──────────────────┐
│ 域名聚合         │ ◀─────────────────────────────── │ 移除跟踪参数     │
│ (按domain_key)   │                                 │ 统一https        │
│ min_rank统计     │                                 │ 去www前缀        │
│ hit_count统计    │                                 └──────────────────┘
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ 评分服务         │
│ 排名+命中+关键词  │
│ score: 0-100     │
│ reason: 可解释   │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ domains_agg.csv  │
│ (候选厂商门户)   │
└──────────────────┘
```

### 7.2 Phase 1 数据流

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Phase 1 数据流                                      │
└─────────────────────────────────────────────────────────────────────────────┘

输入                              合规检查
┌──────────────────┐             ┌──────────────────┐
│ domains_agg.csv  │ ──────────▶ │ 读取域名队列     │
│ (Phase 0输出)    │             │ 按min_rank排序   │
└──────────────────┘             └──────────────────┘
        │                                 │
        │                                 ▼
        │                        ┌──────────────────┐
        │                        │ robots.txt检查   │
        │                        │ 过滤禁止路径     │
        │                        └──────────────────┘
        │                                 │
        ▼                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           证据页抓取                                       │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│  │   /   │ │/products│ │/product│ │/solutions│ │/downloads│ │/contact│ │/about│ │ ... │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
│                              (最多8页)                                      │
└──────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────┐             ┌──────────────────┐
│ 文本清洗         │ ──────────▶ │ 联系方式抽取     │
│ 移除HTML标签     │             │ email/phone      │
│ 解码实体         │             │ company/address  │
│ 截取5000字符     │             │ social_links     │
└──────────────────┘             └──────────────────┘
        │                                 │
        └────────────────┬────────────────┘
                         ▼
                ┌──────────────────┐
                │ 厂商档案聚合     │
                │ 多页合并为一行   │
                │ 去重合并联系方式 │
                └──────────────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ vendors.csv      │
                │ (完整厂商档案)   │
                └──────────────────┘
```

---

## 8. 关键约束与策略

### 8.1 节流策略

| 时机 | 等待时间 | 目的 |
|------|---------|------|
| 导航前 | 0.5 - 2 秒 | 模拟人类思考时间 |
| 页面加载后 | 1 - 3 秒 | 等待动态内容 |
| 滚动后 | 0.5 - 2 秒 | 模拟阅读时间 |
| 查询间隔 | 1 - 5 秒 | 避免触发风控 |

### 8.2 验证码处理策略

```
┌─────────────────────────────────────────────────────────────┐
│                    验证码处理流程                            │
├─────────────────────────────────────────────────────────────┤
│  1. 检测到 /sorry/ 或验证码指示词                            │
│  2. 暂停自动采集                                            │
│  3. 提示用户手动完成验证                                     │
│  4. 最长等待 10 分钟                                         │
│  5. 验证通过 → 继续采集                                      │
│  6. 验证超时 → 停止整个采集任务（不跳过）                      │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 容错机制

| 错误类型 | 处理方式 |
|---------|---------|
| 单个查询超时 | 记录 error_reason，继续下一个查询 |
| 网络错误 | 记录错误，返回空结果 |
| 页面结构变化 | DOM 提取失败时回退到 HTML 正则解析 |
| robots.txt 禁止 | 跳过该路径，记录原因 |
| HTTP 4xx/5xx | 标记错误状态，不中断流程 |

---

## 9. 输出文件规范

### 9.1 目录结构

```
outputs/
  <run_id>/
    serp_results_raw.csv    # Phase 0: 原始SERP结果
    domains_agg.csv         # Phase 0: 域名聚合结果
    vendors.csv             # Phase 1: 厂商档案
    run_manifest.json       # 运行清单
```

### 9.2 文件字段定义

#### serp_results_raw.csv

| 字段 | 类型 | 说明 |
|------|------|------|
| run_id | string | 运行ID (yyyyMMdd-HHmmss) |
| captured_at | string | 采集时间 (北京时间) |
| query | string | 搜索查询词 |
| rank | number | 排名 (1-20) |
| title | string | 搜索结果标题 |
| snippet | string | 摘要文本 |
| url | string | 原始URL |
| normalized_url | string | 归一化URL |
| domain | string | 域名 |
| domain_key | string | 域名键（去www） |
| error_reason | string | 错误原因（如有） |

#### domains_agg.csv

| 字段 | 类型 | 说明 |
|------|------|------|
| run_id | string | 运行ID |
| domain_key | string | 域名键 |
| domain | string | 原始域名 |
| min_rank | number | 最小排名 |
| hit_count | number | 命中次数 |
| queries | string | 命中的查询词（\|分隔） |
| score | number | 评分 (0-100) |
| reason | string | 评分原因 |

#### vendors.csv

| 字段 | 类型 | 说明 |
|------|------|------|
| run_id | string | 运行ID |
| domain_key | string | 域名键 |
| company_name | string | 公司名称 |
| home_url | string | 首页URL |
| product_url | string | 产品页URL |
| contact_url | string | 联系页URL |
| contact_form_url | string | 联系表单URL |
| email | string | 邮箱（\|分隔多个） |
| phone | string | 电话（\|分隔多个） |
| address | string | 地址 |
| country | string | 国家 |
| social_links | string | 社交链接（\|分隔） |
| score | number | 评分 |
| reason | string | 评分原因 |
| evidence_text | string | 证据文本 |
| evidence_urls | string | 证据URL（\|分隔） |
| first_seen_at | string | 首次发现时间 |
| last_seen_at | string | 最后发现时间 |

---

## 10. 扩展性设计

### 10.1 模块化架构

```
┌─────────────────────────────────────────────────────────────┐
│                      扩展点设计                              │
├─────────────────────────────────────────────────────────────┤
│  关键词来源: 可扩展支持 PDF、Word 等格式                      │
│  证据页路径: 可配置化，支持自定义路径列表                      │
│  评分算法:   可替换评分策略，支持自定义权重                    │
│  输出格式:   可扩展支持 JSON、数据库存储                      │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 未来演进路径

| 阶段 | 功能 | 状态 |
|------|------|------|
| Phase 0 | 域名级线索采集 | ✅ 已实现 |
| Phase 1 | 厂商档案增强 | ✅ 已实现 |
| Phase 2 | 产品匹配度分析 | 🔜 规划中 |
| Phase 3 | 自动化邮件触达 | 🔜 规划中 |

---

## 附录 A: 测试用例完整清单

| 模块 | 测试文件 | 测试用例数 |
|------|---------|-----------|
| keyword-extractor | tests/keyword-extractor.test.js | 6 |
| query-generator | tests/query-generator.test.js | 6 |
| serp-collector | tests/serp-collector.test.js | 5 |
| domain-aggregator | tests/domain-aggregator.test.js | 4 |
| scorer | tests/scorer.test.js | 7 |
| domain-reader | tests/domain-reader.test.js | 9 |
| robots-checker | tests/robots-checker.test.js | 11 |
| evidence-fetcher | tests/evidence-fetcher.test.js | 5 |
| contact-extractor | tests/contact-extractor.test.js | 12 |
| vendor-aggregator | tests/vendor-aggregator.test.js | 8 |
| cli | tests/cli.test.js | 3 |
| context | tests/context.test.js | 4 |
| url-normalizer | tests/url-normalizer.test.js | 5 |
| csv-writer | tests/csv-writer.test.js | 4 |
| manifest-writer | tests/manifest-writer.test.js | 3 |
| time-utils | tests/time-utils.test.js | 4 |
| **总计** | **16 个测试文件** | **96 个测试用例** |

---

## 附录 B: CLI 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| --source-doc | string | null | 产品规格文档路径（优先） |
| --keywords-file | string | null | 关键词CSV文件路径 |
| --output-dir | string | ./outputs | 输出目录 |
| --top-n | number | 20 | 每个查询抓取结果数（固定20） |
| --headful | boolean | true | 有头模式（固定true） |
| --max-domains | number | null | 最大域名数（调试用） |
| --run-id | string | 自动生成 | 运行ID |

---

## 附录 C: 运行示例

```bash
# 安装依赖
pnpm install

# 安装 Playwright 浏览器
npx playwright install chromium

# 使用关键词文件运行
node src/index.js --keywords-file "./keywords.csv" --output-dir "./outputs"

# 使用产品文档运行
node src/index.js --source-doc "./2602/电磁阀/SVC-100-LoRaWAN-Solenoid-Valve-Controller.md"

# 调试模式（限制域名数量）
node src/index.js --keywords-file "./keywords.csv" --max-domains 5

# 运行所有测试
npm test
```

---

*文档结束*
