# 软件产品开发需求说明文档（PRD）- 厂商门户搜索采集系统

| 项目 | 内容 |
|---|---|
| 文档版本 | v0.1 |
| 编写时间（北京时间） | 2026-03-03 17:03:25 |
| 文档状态 | 需求确认完成，待开发 |
| 目标 | 通过本机浏览器自动化从 Google 搜索并沉淀“厂商门户网站”线索 |
| 数据层 | CSV 文件（按 run_id 分批输出） |
| 演进路径 | Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4（性能优化） |

## 1. 背景与目标

### 1.1 背景
外贸推广场景中，需要根据指定的产品规格书，例如“电磁阀控制器 SVC-100 规格书.md”，在 Google 搜索中快速找到可提供同类设备的厂商门户网站，并形成可复核、可导出、可持续积累的线索库。

### 1.2 产品目标
- 用尽量接近“真人浏览”的方式（Playwright 有头模式）执行搜索，获取结果并结构化沉淀。
- 支持从“指定产品文档”自动抽取关键词与查询词，也支持人工维护关键词文件。
- 先完成可用的域名级线索聚合与评分（Phase 0），再演进到门户证据抓取与联系方式抽取（Phase 1），最终实现智能化的深度挖掘（Phase 2）、离线归档（Phase 3）与全球化触达（Phase 4）。

### 1.3 非目标（本期不做）
- 不做数据库/服务端部署，不做账号体系与权限系统。
- 不做分布式爬取、代理池、自动过验证码（Phase 2 可考虑人工介入接口）。
- 不保证永远绕过 Google 风控；遇到验证码按策略跳过并记录原因。

## 2. 用户与使用场景

### 2.1 目标用户
- 外贸/BD/市场调研人员：希望快速得到“可能是厂商官网门户”的域名清单，并带证据链接、首页截图与联系方式。
- 运营/内容人员：希望长期积累可复用的厂商线索库（CSV），并挖掘关键决策人。

### 2.2 典型流程
1. 用户指定一个产品文档路径（关键词来源）或提供 `keywords.csv`（人工维护）。
2. 系统生成查询词（query）列表（Phase 0+：自动附加排除语法）。
3. 系统用 Playwright 打开 Google，逐个 query 搜索，抓取 Top20 搜索结果。
4. 系统对 URL 归一化、按域名聚合去重并评分，输出 Phase 0 CSV（含首页截图）。
5. 演进到 Phase 1 后，对候选域名抓取门户证据页与联系方式（含 LinkedIn），输出 vendors CSV。
6. 演进到 Phase 2 后，利用 LLM 提取非结构化信息、挖掘 Key Person。

## 3. 版本范围与演进计划

### 3.1 Phase 0（基础采集与提纯）
目标：形成“域名级候选厂商门户线索库”，支持高效人工复核。

范围：
- Google 搜索结果采集（Playwright 有头模式）
- Top20 结果抓取策略：解析第 1 页 + 点击 Next 到第 2 页累计 20 条
- **优化**：Query 自动附加 `-site:` 语法排除常见 B2B/电商平台
- URL 归一化、域名聚合去重
- 基础评分与原因（reason）
- **优化**：采集首页首屏截图（Screenshot），辅助人工快速筛选
- CSV 分批输出（按 run_id）

交付物：
- `serp_results_raw.csv`
- `domains_agg.csv`
- `screenshots/` 目录

### 3.2 Phase 1（证据链与联系方式深挖）
目标：将域名线索升级为“带证据页 + 联系方式”的厂商档案，尽量减少人工打开网页的次数。

范围：
- 候选域名的门户证据页抓取（遵守 robots.txt）
- 证据页路径集合（每域名最多 8 页）：
  - `/`、`/products`、`/product`、`/solutions`、`/downloads`、`/download`、`/contact`、`/about`
  - **优化**：增加厂商特征页检测（`factory-tour`, `certifications`, `exhibitions`）
- 联系方式抽取：company_name、email、phone、address、country（可空）+ social_links（**优化**：优先提取 LinkedIn Company Page）+ contact_form_url
- 去重合并（同一 domain_key 多页证据合并）

交付物：
- `vendors.csv`

### 3.3 Phase 2（智能化与深度挖掘）
目标：引入 LLM 与高级策略，实现非结构化信息提取与关键人挖掘。

范围：
- **LLM 辅助提取**：调用本地/在线 LLM 从 Contact/About 页面提取复杂格式的地址与混淆邮箱。
- **智能意图打分**：利用 LLM 判断目标站点是“工厂”、“贸易商”还是“C端零售”，替代机械评分。
- **Key Person 挖掘**：从 About/Team 页面提取关键决策人（Name, Position）。
- **人工介入接口**：遇到验证码时暂停并弹窗，支持 Human-in-the-loop 手动过验证。

交付物：
- `vendors_enriched.csv`（包含 key_people, ai_tags, intent_score）

### 3.4 Phase 3（离线浏览与深度归档）
目标：支持用户提供“待下载网页清单文件”，将指定的网页批量完整保存到本地，并记录下载历史（增量无重复），形成可离线浏览的知识库。

范围：
- **清单驱动下载**：系统读取用户指定的 URL 清单文件（CSV/TXT），批量执行离线保存。
- **下载记录追踪与去重**：系统生成下载历史记录（`download_history.csv`），支持增量添加，若 URL 已下载且成功则自动跳过。
- **完整资源抓取**：不仅仅是 HTML，还包括图片、CSS、JS，确保离线浏览体验与在线一致（推荐 MHTML 或 SingleFile 格式）。
- **本地索引页**：生成 `offline_index.html`，作为离线导航入口，点击即可打开本地保存的页面。
- **Chrome 兼容性**：确保保存的文件可直接双击通过 Chrome 打开，无跨域/CORS 报错。

交付物：
- `offline_archive/` 目录（含所有离线网页文件）
- `download_history.csv`（下载记录明细）
- `offline_index.html`（离线导航入口）

### 3.5 Phase 4（高性能与工程化完善）
目标：解决串行采集的性能瓶颈，提升系统的健壮性、可观测性与可维护性，为大规模采集做准备。

范围：
- **高并发采集引擎**：
  - 引入并发控制机制（如 `p-limit`），实现 Phase 1（证据抓取）与 Phase 3（离线下载）的多页面并行处理。
  - 目标：在保持防风控能力的前提下，将非 Google 域名的采集速度提升 5-10 倍。
- **系统可观测性（Logging）**：
  - 引入结构化日志库（如 `winston`），替代 `console.log`。
  - 实现日志分级（Info/Warn/Error）与文件轮转持久化（`logs/` 目录）。
- **配置管理规范化**：
  - 引入 `dotenv` 管理敏感信息（如 API Key）。
  - 统一配置入口，支持配置文件覆盖默认值。
- **数据健壮性**：
  - 增强 CSV 读写的数据校验与容错处理，防止数据损坏。

交付物：
- 重构后的 `src/services/` 模块（支持并发）
- `logs/` 目录与日志文件
- 更新的配置文件结构

## 4. 输入与配置

### 4.1 关键词库来源（优先级）
优先级：指定文档（`--source-doc`）优先，其次人工维护（`--keywords-file`）。

- 指定文档：从指定 Markdown/PDF/Docx 等文档文本中抽取关键词与同义词，生成查询词列表。
- 人工维护：使用 `keywords.csv` 作为结构化关键词库，系统按组合规则生成查询词。

### 4.2 运行方式
方式：命令行参数 + 可选配置文件。

建议 CLI 参数（可在开发时微调，但需保持向后兼容）：
- `--source-doc <path>`：关键词来源文档路径（优先）
- `--keywords-file <path>`：人工维护关键词库 CSV
- `--output-dir <path>`：输出目录（默认 `./outputs`）
- `--top-n 20`：每个 query 抓取结果数（固定为 20）
- `--headful true`：有头模式（固定 true）
- `--max-domains <n>`：可选，限制处理域名数量（调试用）
- `--run-id <id>`：可选，默认自动生成
- `--url-list <path>`：[Phase 3] 待下载网页清单文件（TXT/CSV），每行一个 URL。
- `--archive-dir <path>`：[Phase 3] 离线归档保存目录（默认 `./offline_archive`）。

### 4.3 run_id 与时间规范
- run_id：北京时间 `yyyyMMdd-HHmmss`（例如 `20260303-142530`）
- CSV 中所有时间字段：北京时间，格式 `yyyy-MM-dd HH:mm:ss`

## 5. 数据输出（CSV 作为数据层）

### 5.1 输出目录结构
按 run_id 分批输出，避免覆盖与便于追溯：

```
outputs/
  <run_id>/
    serp_results_raw.csv
    domains_agg.csv
    vendors.csv            (Phase 1 才会生成)
    run_manifest.json      (可选：记录本次配置与统计信息)
```

### 5.2 Phase 0：serp_results_raw.csv
用途：保留 Google SERP 原始抓取结果，便于追溯与调试。

字段（建议顺序）：
- `run_id`
- `captured_at`（北京时间）
- `query`
- `rank`（1..20）
- `title`
- `snippet`
- `url`
- `normalized_url`
- `domain`
- `domain_key`
- `error_reason`（若该 query 失败/跳过则填写）

### 5.3 Phase 0：domains_agg.csv
用途：域名聚合去重后的候选厂商门户清单。

字段（建议顺序）：
- `run_id`
- `domain_key`（用于去重的稳定键）
- `domain`
- `min_rank`（该域名出现的最好排名）
- `hit_count`（出现次数）
- `queries`（命中的 query 列表，建议用分隔符拼接）
- `score`
- `reason`（评分原因摘要）

### 5.4 Phase 1：vendors.csv
用途：厂商档案（门户证据 + 联系方式），用于直接触达。

字段（建议顺序）：
- `run_id`
- `domain_key`
- `company_name`
- `home_url`
- `product_url`
- `contact_url`
- `contact_form_url`
- `email`
- `phone`
- `address`
- `country`
- `social_links`（多个链接可用分隔符拼接）
- `score`
- `reason`
- `evidence_text`（抽取到的关键证据片段）
- `evidence_urls`（多个链接可用分隔符拼接）
- `first_seen_at`
- `last_seen_at`

### 5.5 Phase 3：offline_index.html
用途：离线导航入口，汇总展示所有已下载的厂商页面。

功能与结构：
- **静态单文件**：内联所有 CSS/JS，无外部网络请求。
- **厂商列表**：
  - **Company**：链接至 `offline_archive/<domain_key>.mhtml`。
  - **Tags**：显示 AI 推断的标签（如 Manufacturer）。
  - **Score**：显示意向评分。
  - **Country**：厂商所在国家。
  - **Original**：链接至原始外网 URL。
- **交互**：前端 JS 实现的搜索框（Search）与下拉筛选（Filter by Country/Tags）。

### 5.6 Phase 3：download_history.csv
用途：记录每次下载任务的详细日志，便于追溯与失败重试。

字段：
- `original_url`
- `local_path`
- `status` (SUCCESS/FAILED/SKIPPED)
- `download_time`
- `file_size_kb`
- `error_message`

## 6. 核心功能需求

### 6.1 Google 搜索采集（Phase 0）
- 系统应支持逐条 query 访问 Google 并执行搜索。
- 系统应抓取 Top20：
  - 解析第 1 页搜索结果；
  - 点击 Next 进入第 2 页继续解析；
  - 累计到 20 条或无更多结果为止。
- 系统应提取每条结果的：title、snippet、url、rank。
- 系统应实现节流策略（随机等待/滚动/最大请求频率限制），降低风控触发概率。
- 验证码/风控策略（已确认）：
  - 若检测到验证码或 “unusual traffic”，应跳过当前 query，并在 `serp_results_raw.csv` 中记录 `error_reason`。

### 6.2 URL 归一化与域名聚合（Phase 0）
- 系统应对 URL 做归一化（去跟踪参数、统一协议、去尾部斜杠等），输出 `normalized_url`。
- 系统应抽取并计算 `domain` 与 `domain_key`（domain_key 用于稳定去重）。
- 系统应按 domain_key 聚合，统计 `hit_count`、`min_rank`、命中 queries 列表。

### 6.3 基础评分（Phase 0）
系统应为每个 domain_key 计算 `score` 与 `reason`（可解释）。

推荐评分维度（可调整权重）：
- 域名出现的最小 rank 越小分越高
- 命中次数（hit_count）越多分越高
- title/snippet 中命中类目词（LoRaWAN / valve / solenoid / controller / irrigation 等）加分
- 负向关键词（forum/wiki/news/repost 等）扣分（可选）

### 6.4 门户证据抓取（Phase 1）
- 系统应从 `domains_agg.csv` 选取候选域名并抓取证据页。
- 系统必须遵守 robots.txt：
  - 若 robots 明确禁止抓取目标路径，应跳过并记录原因。
- 每个域名最多抓取 8 页（已确认），路径集合见 3.2。

### 6.5 联系方式抽取与合并（Phase 1）
- 系统应从证据页中抽取：
  - company_name、email、phone、address、country（可空）
  - social_links（LinkedIn/WhatsApp/WeChat 等）
  - contact_form_url
- 系统应将同一 domain_key 的多页证据合并，输出 vendors.csv 单行。

### 6.6 指定网页离线保存（Phase 3）
- **输入来源**：
  - 系统应优先读取 CLI 参数 `--url-list <path>` 指定的文件（CSV 或 TXT 格式，每行一个 URL）。
  - 若未指定 `--url-list`，则默认从 `vendors_enriched.csv` 的 `home_url` 列提取 URL。
- **记录下载历史（增量无重复）**：
  - 系统应在 `--archive-dir` 根目录下维护一个全局的 `download_history.csv`。
  - **启动时去重**：任务开始前，系统应读取该文件，加载所有状态为 `SUCCESS` 的 `original_url`。
  - **增量处理**：对于输入列表中的 URL，若已在历史记录中且成功下载，则跳过；否则执行下载。
  - **追加写入**：新任务的下载结果（无论成功失败）应追加写入该文件，不覆盖旧数据。
  - 记录字段：`original_url`, `local_path` (相对路径), `status` (success/failed), `download_time` (北京时间), `file_size_kb`, `error_msg` (若失败)。
- **保存格式**：
  - 系统应使用 Chrome DevTools Protocol (CDP) 保存为 MHTML 格式，或集成 SingleFile 库保存为单文件 HTML。
  - 必须确保离线状态下图片、样式表、脚本（不含追踪代码）正常加载，页面布局不崩坏。
- **资源限制**：
  - 系统应限制单个页面的最大下载体积（如 10MB），避免卡死。
  - 系统应设置超时时间（如 30s），超时则仅保存当前已获取的 HTML。

### 6.7 离线索引页（offline_index.html）
- **生成时机**：每次离线下载任务完成后，读取**全量** `download_history.csv` 重新生成。
- **文件位置**：`--archive-dir` 目录下的 `offline_index.html`。
- **数据源**：聚合 `download_history.csv` 中所有状态为 `SUCCESS` 的记录。
- **界面结构**：
  - **头部**：显示“离线厂商库”、生成时间、总收录数。
  - **主体列表**：表格展示已下载厂商，列包含：
    - 厂商名称（点击跳转本地 .mhtml/.html 文件）
    - 意向评分（可视化展示）
    - 关键标签（如 Manufacturer, OEM）
    - 国家/地区
    - 原始链接（Icon 链接到外网）
- **交互功能**：
  - **搜索/过滤**：支持按厂商名搜索，按国家或标签筛选（纯前端 JS 实现）。
  - **排序**：支持按评分高低排序。
- **技术约束**：必须是单文件 HTML（内联 CSS/JS），确保无依赖、双击即开。

## 7. 质量与约束（非功能需求）

### 7.1 可用性与可追溯
- 每次运行必须有 run_id，所有输出文件必须带 run_id 信息。
- 输出必须可复核：至少提供能回到原网页的 url / evidence_urls。

### 7.2 稳定性与容错
- 单个 query 超时不应导致整个任务中断，应继续后续 query。
- 对网络错误/页面结构变化应有降级策略（记录 error_reason）。

### 7.3 合规与风险控制
- 系统用途限定为内部线索收集与人工复核辅助。
- 遇到 Google 风控/验证码不做自动绕过，按已确认策略跳过并记录。
- Phase 1 抓取必须遵守 robots.txt。

## 8. 验收标准

### 8.1 Phase 0 验收
- 给定一份指定文档或 `keywords.csv`，系统能生成 query 列表并完成搜索采集。
- 每个 query 至少尝试抓取 Top20；若触发风控则跳过并写入 error_reason。
- 能输出 `outputs/<run_id>/serp_results_raw.csv` 与 `outputs/<run_id>/domains_agg.csv`，字段齐全且数据可用。
- domains_agg.csv 中 domain_key 去重正确，score 与 reason 非空（允许 reason 简短）。

### 8.2 Phase 1 验收
- 基于 Phase 0 的 domains_agg.csv，系统能为候选域名抓取证据页并生成 vendors.csv。
- vendors.csv 中至少能产出 home_url/contact_url/evidence_urls（若目标站点存在对应页面）。
- 能抽取并填充 email/phone/social_links 中至少一种（若页面存在），并能对同域名多页证据合并为一行。

### 8.3 Phase 3 验收
- 给定 URL 列表，系统能批量下载并生成离线网页文件（.mhtml 或 .html）。
- 断网环境下，双击生成的 `index.html` 能正常跳转到厂商离线页面。
- 离线页面在 Chrome 中打开时，图片、布局应与在线版基本一致。
- 遇到下载超时或失败的页面，应在 `error.log` 或 `index.html` 中体现。

## 9. 依赖与实现建议（供开发参考）
- 浏览器自动化：Playwright（建议 Node.js 版本，仓库已存在 `@playwright/test` 依赖）。
- 输出与处理：CSV 读写、URL 解析与归一化、robots.txt 解析。
- 日志：控制台 + 可选 `run_manifest.json`（记录参数与统计）。

