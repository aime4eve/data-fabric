# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

外贸推广辅助系统 - 厂商门户搜索采集系统。通过 Playwright 浏览器自动化从 Google 搜索并沉淀"厂商门户网站"线索，数据以 CSV 文件存储。

**四阶段演进：**
- **Phase 0**：域名级候选线索采集（serp_results_raw.csv → domains_agg.csv）
- **Phase 1**：厂商档案增强（robots 合规检查 → 证据页抓取 → 联系方式抽取 → vendors.csv）
- **Phase 2**：LLM 智能增强（AI 标签推断 → 意图评分 → 关键人物提取 → vendors_enriched.csv）
- **Phase 3**：离线归档（本地保存 MHTML/HTML → Chrome 离线浏览）

## 环境配置

创建 `.env` 文件配置环境变量：

```bash
# LLM API 配置（必需，用于 Phase 2）
DEEPSEEK_API_KEY=your_api_key_here
LLM_BASE_URL=https://api.deepseek.com    # 可选，默认 DeepSeek
LLM_MODEL=deepseek-chat                   # 可选，默认 deepseek-chat

# 运行时配置
LOG_LEVEL=info                            # debug/info/warn/error
CONCURRENCY_LIMIT=3                       # 并发限制 (1-20)
MAX_DOMAINS=                              # 限制域名数量（调试用）
TIMEOUT=30000                             # 超时时间 (ms)
MAX_SIZE=10240                            # 最大文件大小 (KB)
```

**配置优先级**：CLI 参数 > 环境变量 > .env 文件 > 默认值

## 常用命令

```bash
# 安装依赖
pnpm install

# 安装 Playwright 浏览器
npx playwright install chromium

# 运行采集（使用关键词文件）
node src/index.js --keywords-file "./keywords.csv" --output-dir "./outputs"

# 运行采集（使用产品文档）
node src/index.js --source-doc "./2602/电磁阀/SVC-100-LoRaWAN-Solenoid-Valve-Controller.md"

# 调试模式（限制域名数量）
node src/index.js --keywords-file "./keywords.csv" --max-domains 5

# 运行所有测试
npm test

# 运行单个测试文件
node --test tests/serp-collector.test.js

# 详细测试输出
node --test --reporter=spec tests/*.test.js
```

## CLI 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--source-doc <path>` | 产品规格文档路径（Markdown） | - |
| `--keywords-file <path>` | 关键词 CSV 文件 | - |
| `--vendors-file <path>` | 已有的 vendors.csv 文件（跳过 Phase 0/1） | - |
| `--output-dir <path>` | 输出目录 | `./outputs` |
| `--max-domains <n>` | 限制域名数量（调试用） | - |
| `--run-id <id>` | 指定运行 ID | 自动生成 |
| `--excluded-sites <sites>` | 排除的站点（逗号分隔） | `alibaba.com` |
| `--llm-base-url <url>` | LLM API 地址 | `https://api.deepseek.com` |
| `--llm-model <model>` | LLM 模型名称 | `deepseek-chat` |
| `--llm-api-key <key>` | LLM API 密钥 | 环境变量 `DEEPSEEK_API_KEY` |
| `--phase3` | 启用 Phase 3 离线归档模式 | `false` |
| `--url-list <path>` | [Phase 3] URL 清单文件（TXT/CSV） | - |
| `--archive-dir <path>` | [Phase 3] 归档目录 | `./offline_archive` |
| `--timeout <ms>` | [Phase 3] 单页面下载超时 | `30000` |
| `--max-size <kb>` | [Phase 3] 单文件最大体积 | `10240` |

## 架构

```
src/
├── index.js                    # 主入口，编排整个采集流程
├── services/
│   ├── keyword-extractor.js    # 关键词提取（支持 Markdown/CSV）
│   ├── query-generator.js      # 查询词生成（添加供应商意图词）
│   ├── serp-collector.js       # Google SERP 采集（Playwright）
│   ├── domain-aggregator.js    # 域名聚合（按 domain_key 去重）
│   ├── scorer.js               # 评分服务（排名+命中+关键词）
│   ├── domain-reader.js        # [Phase 1] 读取 domains_agg.csv，构建候选队列
│   ├── robots-checker.js       # [Phase 1] robots.txt 合规检查
│   ├── evidence-fetcher.js     # [Phase 1] 证据页抓取与文本清洗
│   ├── contact-extractor.js    # [Phase 1] 联系方式抽取（邮箱、电话、公司名等）
│   ├── vendor-aggregator.js    # [Phase 1] 厂商档案聚合与 vendors.csv 输出
│   ├── captcha-handler.js      # 验证码检测与处理
│   ├── llm-processor.js        # [Phase 2] LLM API 客户端（DeepSeek/OpenAI 兼容）
│   ├── phase2-enricher.js      # [Phase 2] LLM 增强处理（AI 标签、关键人物）
│   ├── offline-archiver.js     # [Phase 3] 离线归档（MHTML 下载）
│   └── index-generator.js      # [Phase 3] 离线索引页生成（HTML）
└── utils/
    ├── cli.js                  # CLI 参数解析
    ├── config.js               # [Phase 4] 配置集中管理（环境变量 + CLI + .env）
    ├── context.js              # 运行上下文管理
    ├── concurrency.js          # [Phase 4] 并发控制（带指数退避的重试）
    ├── logger.js               # [Phase 4] 结构化日志
    ├── time.js                 # 北京时间工具
    ├── url-normalizer.js       # URL 归一化
    ├── csv-writer.js           # CSV 写入
    └── manifest-writer.js      # 运行清单写入
```

### 数据流

**Phase 0:**
```
关键词输入 → 查询词生成 → Google SERP 采集 → URL 归一化 → 域名聚合 → 评分 → CSV 输出
```

**Phase 1:**
```
domains_agg.csv → 候选域名队列 → robots 合规检查 → 证据页抓取（含截图） → 联系方式抽取 → 厂商档案聚合 → vendors.csv
```

**Phase 2:**
```
vendors.csv → LLM 联系方式增强 → AI 标签推断 → 意向评分 → 关键人物提取 → 语言检测 → vendors_enriched.csv
```

**Phase 3:**
```
URL 清单 → 离线资源下载 (MHTML) → download_history.csv (增量) → 索引页生成 → offline_archive/ & offline_index.html
```

## 关键约束

- **有头模式**：Playwright 以 `headless: false` 运行，便于处理 Google 验证
- **浏览器持久化**：使用 `launchPersistentContext` 启动浏览器，用户数据存储在 `./browser-data/`
  - 浏览器**不会自动关闭**，可多次运行采集任务
  - Cookies 和登录状态保持，减少验证频率
- **验证等待**：检测到 `/sorry/` 验证页面时暂停，等待用户手动完成验证（最长 10 分钟）
  - 验证通过：继续采集
  - 验证超时：**停止整个采集任务**（不会跳过继续）
- **时间格式**：所有时间使用北京时间 (UTC+8)，run_id 格式 `yyyyMMdd-HHmmss`
- **节流策略**：模拟人类行为，避免机器人检测
  - 导航前随机暂停 0.5-2 秒
  - 页面加载后随机暂停 1-3 秒
  - 滚动后随机暂停 0.5-2 秒
  - 每次查询后随机等待 1-5 秒
- **SERP 提取**：优先使用 DOM 提取（`page.evaluate`），失败时回退到 HTML 正则解析
- **robots.txt 合规**：Phase 1 抓取前检查 robots.txt，禁止路径跳过并记录原因
- **证据页路径**：每个域名最多抓取 8 个约定路径（/、/products、/product、/solutions、/downloads、/download、/contact、/about）

## 关键词文件格式

支持两种格式：

**1. 标准 CSV 格式（推荐）**
```csv
category,keyword,synonyms
产品,solenoid valve,"electromagnetic valve, water valve"
技术,LoRaWAN,"lorawan, lora wireless"
```

**2. 简单列表格式**
```
solenoid valve
LoRaWAN controller
irrigation system
```

## 输出文件

每次运行生成 `outputs/<run_id>/` 目录：

### serp_results_raw.csv
原始 SERP 采集结果

### domains_agg.csv
按域名聚合的结果，字段：run_id, domain_key, domain, min_rank, hit_count, queries, score, reason

### vendors.csv (Phase 1)
厂商档案，字段：run_id, domain_key, company_name, home_url, product_url, contact_url, contact_form_url, email, phone, address, country, social_links, score, reason, evidence_text, evidence_urls, first_seen_at, last_seen_at

### vendors_enriched.csv (Phase 2)
LLM 增强厂商档案，额外字段：ai_tags, intent_score, key_people, detected_lang
- `ai_tags`: AI 推断标签（Manufacturer|Distributor|OEM|Unknown）
- `intent_score`: 意向评分（0-100，Manufacturer +15，Distributor -10）
- `key_people`: 关键人物 JSON 数组
- `detected_lang`: 检测语言（zh/en/de/unknown）

### offline_archive/ (Phase 3)
离线网页归档目录，含 offline_index.html 索引与 download_history.csv 记录

### screenshots/
证据页截图目录，命名格式：`<domain>_<path>.png`，全页截图

### run_manifest.json
运行统计信息

## 测试

使用 Node.js 内置测试框架（`node:test`），位于 `tests/` 目录：

```bash
# 运行所有测试
npm test

# 运行单个测试
node --test tests/scorer.test.js

# 详细输出
npm run test:verbose
```

## OpenSpec 工作流

项目使用 OpenSpec 进行规格驱动开发，相关命令：

| 命令 | 说明 |
|------|------|
| `/openspec:explore` | 探索需求，澄清问题 |
| `/openspec:propose` | 创建变更提案 |
| `/openspec:apply <name>` | 应用变更实现 |
| `/openspec:archive <name>` | 归档已完成变更 |

规格文档位于 `openspec/` 目录，详见 [OpenSpec-使用指南.md](docs/OpenSpec-使用指南.md)。

## 目录结构

```
├── src/                    # 源代码
│   ├── index.js            # 主入口
│   ├── services/           # 业务服务
│   └── utils/              # 工具函数
├── tests/                  # 测试文件（25 个测试文件）
├── openspec/               # OpenSpec 规格与变更
│   ├── specs/              # 功能规格
│   └── changes/            # 变更提案
├── 2602/                   # 产品规格文档（按产品分类）
├── outputs/                # 采集输出（按 run_id 分批）
│   └── <run_id>/           # 单次运行输出
├── browser-data/           # Playwright 持久化用户数据
└── keywords.csv            # 示例关键词文件
```

## 规格文档

详细需求见 [PRD-厂商门户搜索采集系统.md](PRD-厂商门户搜索采集系统.md)
- Phase 0 规格: [.trae/specs/design-phase0-vendor-portal-collector/](.trae/specs/design-phase0-vendor-portal-collector/)
- Phase 1 规格: [.trae/specs/design-phase1-vendor-evidence-enrichment/](.trae/specs/design-phase1-vendor-evidence-enrichment/)
- Phase 2 规格: [.trae/specs/design-phase2-intelligence-enrichment/](.trae/specs/design-phase2-intelligence-enrichment/)
- Phase 3 规格: [openspec/changes/archive/2026-03-09-phase3-offline-archive/](openspec/changes/archive/2026-03-09-phase3-offline-archive/)
- Phase 4 规格: [openspec/changes/archive/2026-03-10-phase4-performance-engineering/](openspec/changes/archive/2026-03-10-phase4-performance-engineering/)
