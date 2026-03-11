## ADDED Requirements

### Requirement: Playwright 运行时依赖

系统 SHALL 将 `playwright` 包作为 runtime dependency 正确安装，以支持浏览器自动化采集。

#### Scenario: 模块加载成功
- **WHEN** 执行 `require('playwright')`
- **THEN** 模块成功加载，不抛出 MODULE_NOT_FOUND 错误

#### Scenario: 浏览器启动成功
- **WHEN** 调用 `chromium.launchPersistentContext()`
- **THEN** 浏览器成功启动并返回 BrowserContext 对象

#### Scenario: 依赖版本兼容
- **WHEN** 安装 playwright 依赖
- **THEN** 版本与已安装的 chromium 浏览器兼容（^1.58.2）

### Requirement: 真实搜索采集

当 Playwright 正确安装后，系统 SHALL 使用真实 Google 搜索而非模拟数据。

#### Scenario: 使用真实搜索
- **WHEN** 执行 SERP 采集
- **THEN** 系统使用 Playwright 访问 Google 搜索
- **AND** 返回真实的搜索结果（非模拟数据）

#### Scenario: 模拟数据禁用
- **WHEN** 浏览器实例可用
- **THEN** 系统不调用 `generateMockResults()` 函数
