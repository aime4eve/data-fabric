# 厂商门户搜索采集系统

> 通过 Playwright 浏览器自动化从 Google 搜索并沉淀"厂商门户网站"线索

## 功能特点

- 🔍 **智能搜索**：自动从产品文档提取关键词，生成 Google 搜索查询
- 🌐 **域名聚合**：自动去重、归一化 URL，按域名聚合候选线索
- 📊 **评分排序**：根据排名、命中次数、关键词匹配度自动评分
- 📧 **联系方式提取**：自动抓取厂商门户的证据页面，提取邮箱、电话、地址等
- 🤖 **LLM 增强**：利用 AI 推断厂商类型（制造商/贸易商）、提取关键人物
- 💾 **离线归档**：批量下载网页到本地，支持离线浏览

## 快速开始

### 1. 安装依赖

```bash
# 安装 Node.js 依赖
pnpm install

# 安装 Playwright 浏览器
npx playwright install chromium
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# LLM API 配置（用于 Phase 2 AI 增强）
DEEPSEEK_API_KEY=your_api_key_here

# 可选配置
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
LOG_LEVEL=info
```

### 3. 准备关键词

创建 `keywords.csv` 文件：

```csv
category,keyword,synonyms
产品,solenoid valve,"electromagnetic valve, water valve"
技术,LoRaWAN,"lorawan, lora wireless"
```

或使用简单列表格式（每行一个关键词）。

### 4. 运行采集

```bash
# 使用关键词文件运行
node src/index.js --keywords-file "./keywords.csv"

# 或使用产品规格文档（自动提取关键词）
node src/index.js --source-doc "./产品规格书.md"

# 调试模式（限制域名数量）
node src/index.js --keywords-file "./keywords.csv" --max-domains 5
```

## 使用场景

### 场景 1：从产品文档搜索厂商

当你有一个产品规格文档（如 `SVC-100-电磁阀控制器.md`），想找到能生产类似产品的厂商：

```bash
node src/index.js --source-doc "./2602/电磁阀/SVC-100-LoRaWAN-Solenoid-Valve-Controller.md"
```

系统会自动：
1. 从文档中提取关键词
2. 生成带有"供应商"意图的搜索查询
3. 执行 Google 搜索并采集结果
4. 按域名聚合、评分排序
5. 抓取候选厂商的证据页面
6. 提取联系方式
7. 调用 LLM 进行智能增强

### 场景 2：使用自定义关键词列表

当你已经明确知道要搜索的关键词：

```bash
node src/index.js --keywords-file "./keywords.csv"
```

### 场景 3：离线归档厂商网页

当你已经有一批候选厂商 URL，想要离线保存：

```bash
# 准备 url-list.txt，每行一个 URL
node src/index.js --phase3 --url-list "./url-list.txt"
```

## 输出文件

每次运行会在 `outputs/<run_id>/` 目录生成以下文件：

| 文件 | 说明 |
|------|------|
| `serp_results_raw.csv` | 原始搜索结果 |
| `domains_agg.csv` | 按域名聚合的候选线索 |
| `vendors.csv` | 带联系方式的厂商档案 |
| `vendors_enriched.csv` | LLM 增强后的厂商档案 |
| `run_manifest.json` | 运行统计信息 |
| `screenshots/` | 证据页截图 |

### 字段说明

**domains_agg.csv** - 域名聚合结果
- `domain_key`: 域名唯一标识
- `domain`: 域名
- `min_rank`: 最低排名
- `hit_count`: 命中次数
- `score`: 综合评分
- `reason`: 评分原因

**vendors_enriched.csv** - 增强厂商档案
- `company_name`: 公司名称
- `email`: 邮箱
- `phone`: 电话
- `address`: 地址
- `country`: 国家
- `social_links`: 社交媒体链接
- `ai_tags`: AI 标签（Manufacturer/Distributor/OEM/Unknown）
- `intent_score`: 意向评分（0-100）
- `key_people`: 关键人物

## CLI 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--source-doc <path>` | 产品规格文档路径 | - |
| `--keywords-file <path>` | 关键词 CSV 文件 | - |
| `--output-dir <path>` | 输出目录 | `./outputs` |
| `--max-domains <n>` | 限制域名数量 | - |
| `--excluded-sites <sites>` | 排除的站点 | `alibaba.com` |
| `--llm-base-url <url>` | LLM API 地址 | `https://api.deepseek.com` |
| `--llm-model <model>` | LLM 模型 | `deepseek-chat` |
| `--phase3` | 启用离线归档模式 | `false` |

## 注意事项

### 浏览器行为

- 系统以**有头模式**运行浏览器（可见窗口），便于处理 Google 验证
- 浏览器数据持久化在 `./browser-data/`，Cookies 和登录状态会保持
- 遇到验证码时会**暂停等待**，需要手动完成验证后继续

### 节流策略

为避免被 Google 检测为机器人，系统会：
- 导航前随机暂停 0.5-2 秒
- 页面加载后随机暂停 1-3 秒
- 每次查询后随机等待 1-5 秒

### robots.txt 合规

Phase 1 抓取厂商门户前会检查 `robots.txt`，禁止的路径会跳过并记录原因。

## 故障排除

### 问题：搜索结果为空

1. 检查网络连接
2. 打开浏览器手动访问 Google，确认无验证码
3. 检查关键词是否过于生僻

### 问题：验证码频繁出现

1. 减少查询频率（增加等待时间）
2. 在浏览器中手动登录 Google 账号
3. 清理 `./browser-data/` 目录后重试

### 问题：LLM 增强失败

1. 检查 `DEEPSEEK_API_KEY` 是否正确
2. 检查 API 额度是否充足
3. 检查网络是否能访问 LLM API

## 开发

```bash
# 运行测试
npm test

# 详细测试输出
npm run test:verbose
```

## 许可证

MIT
