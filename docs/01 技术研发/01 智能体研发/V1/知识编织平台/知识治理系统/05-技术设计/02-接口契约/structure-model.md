# 结构模型草案：目录、权限、模板

## 目录（Directory）
- 字段：`id`, `knowledgeBaseId`, `parentId`, `name`, `slug`, `path`, `order`, `depth`, `hasChildren`, `version`, `createdAt`, `updatedAt`。
- 约束：
  - 同父级内 `name` 唯一（大小写敏感策略可配置）。
  - `depth ≤ 6`（可配置）；每层子节点数 `≤ 200`（可配置）。
  - `slug` 由 `name` 规范化生成；`path` 由父链 slug 拼接，移动时重算。
  - 并发：使用乐观锁 `version`（如 UUID/递增版本号）。

## 权限（Permission）
- 模型：结合 RBAC 与目录级 ACL。
- 表结构建议：
  - `permission_configs(directory_id, inherit BOOLEAN, version)`
  - `permission_rules(directory_id, subject_type ENUM(user|group|role), subject_id, actions SET(view, edit, manage))`
- 继承策略：
  - 默认继承父；`inherit=false` 断开继承，仅应用本目录规则。
  - 计算有效权限时按父链合并，再应用当前目录覆盖与否决。

## 模板（Template）
- 字段：`id`, `name`, `version`, `description`, `structure_json`, `default_permissions_json`。
- 语义：
  - `structure_json`：树形结构（节点名称、层级与排序）。
  - `default_permissions_json`：目录层级的默认规则（可按相对路径匹配）。
- 应用规则：幂等；重名冲突策略（跳过/合并）可配置。

## 审计（Audit）
- 记录类型：`create|rename|move|delete|permission`。
- 字段：`id`, `type`, `operator`, `timestamp`, `before`, `after`。

## API 与模型关系
- REST 与 GraphQL 接口均返回 `version` 以支持并发控制。
- `move` 操作需同时更新 `path` 与相关子路径（批量事务或异步修复）。