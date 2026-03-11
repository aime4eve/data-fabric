## ADDED Requirements

### Requirement: Phase 0 首页首屏截图

系统 SHALL 在 Phase 0 域名聚合完成后，对每个候选域名的首页进行首屏截图。

#### Scenario: 成功截取首页首屏
- **WHEN** 域名聚合完成且浏览器实例可用
- **THEN** 系统访问 `https://<domain>/` 并截取首屏
- **AND** 截图保存到 `outputs/<run_id>/screenshots/<domain>_home.png`

#### Scenario: 域名无法访问
- **WHEN** 访问域名首页超时或返回错误
- **THEN** 系统记录错误日志但不中断采集流程
- **AND** 不生成该域名的截图文件

#### Scenario: 截图目录创建
- **WHEN** 开始截图流程
- **THEN** 系统自动创建 `outputs/<run_id>/screenshots/` 目录（如不存在）

### Requirement: 截图参数规范

系统 SHALL 使用以下参数进行首屏截图：
- 格式：PNG
- 范围：仅首屏（fullPage: false）
- 超时：30 秒

#### Scenario: 截图格式
- **WHEN** 执行截图操作
- **THEN** 输出文件为 PNG 格式

#### Scenario: 截图范围
- **WHEN** 执行截图操作
- **THEN** 仅截取可视区域（viewport），不包含滚动区域
