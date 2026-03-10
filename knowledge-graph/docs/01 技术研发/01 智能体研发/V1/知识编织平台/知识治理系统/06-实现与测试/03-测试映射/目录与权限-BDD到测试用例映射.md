# BDD 场景到测试用例映射（目录与权限）

## 目录与权限-初始化
- E2E：初始化模板与根目录可视化校验。
- API：`POST /directories` 创建根与子目录；`GET` 验证路径链。
- 单元：目录路径组装与层级计算。

## 权限继承与覆盖
- E2E：继承链展示与覆盖编辑交互。
- API：`GET/PUT /directories/{id}/permissions`，覆盖生效与冲突处理。
- 单元：权限合并与优先级规则。

## CRUD 与排序移动
- E2E：拖拽排序反馈与子树更新展示。
- API：`PUT /directories/{id}`、`PUT /directories/{id}/sort`、`GET /directories/tree`。
- 单元：批量排序更新的校验与重命名路径传播。

## 模板应用
- E2E：模板选择预览与应用进度。
- API：`POST /permissions/templates/apply` 幂等与回滚语义。
- 单元：模板规则到具体目录规则的映射。

## 审计查询
- E2E：审计列表与筛选交互。
- API：`GET /audits/events` 条件过滤与分页。
- 单元：审计事件结构与序列化。