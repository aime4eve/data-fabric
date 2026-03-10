# 目录与权限管理 REST 接口草案

## 概述
覆盖目录树初始化、CRUD、排序/移动、权限继承与覆盖、模板应用、审计查询。所有接口需鉴权，支持幂等与并发控制（If-Match 版本号）。

## 版本与通用约定
- `Content-Type: application/json`
- 幂等操作：`POST /init-from-template`、`PUT`/`PATCH` 更新。
- 并发控制：资源包含 `version` 字段；更新需携带 `If-Match: <version>`。

## 目录
### 初始化
- `POST /api/directories/init-from-template`
  - body: `{ "knowledgeBaseId": string, "templateId": string, "options": { "preview": boolean } }`
  - 201/200: `{ rootId, appliedVersion, createdNodes, skippedNodes }`
  - 幂等：重复应用只补缺失节点。

### 查询树
- `GET /api/directories/tree?knowledgeBaseId=<id>&rootId=<id>&depth=<n>`
  - 200: `[{ id, name, slug, path, order, depth, hasChildren }]`

### 创建目录
- `POST /api/directories`
  - body: `{ knowledgeBaseId, parentId, name, order? }`
  - 201: `{ id, version }`

### 更新目录
- `PATCH /api/directories/:id`
  - headers: `If-Match: <version>`
  - body: `{ name?, order? }`
  - 200: `{ id, version }`

### 删除目录
- `DELETE /api/directories/:id`
  - query: `soft=true|false`
  - 204

### 移动目录
- `POST /api/directories/:id/move`
  - headers: `If-Match: <version>`
  - body: `{ newParentId, position? }`
  - 200: `{ id, path, version }`

## 权限
### 查询权限
- `GET /api/permissions?directoryId=<id>`
  - 200: `{ inherit: boolean, rules: [{ subjectType, subjectId, actions }] }`

### 设置继承
- `POST /api/permissions/:directoryId/inheritance`
  - body: `{ inherit: boolean }`
  - 200: `{ inherit }`

### 覆盖规则
- `PUT /api/permissions/:directoryId/rules`
  - headers: `If-Match: <version>`
  - body: `{ rules: [{ subjectType: 'user'|'group'|'role', subjectId, actions: ['view'|'edit'|'manage'] }] }`
  - 200: `{ version }`

## 模板
### 列出模板
- `GET /api/templates?scope=directory`
  - 200: `[{ id, name, version, description }]`

### 预览模板
- `GET /api/templates/:id/preview`
  - 200: `{ structure: Tree[], defaultPermissions: Rule[] }`

## 审计
- `GET /api/audit?directoryId=<id>&types=create|rename|move|delete|permission`
  - 200: `[{ id, type, operator, timestamp, before?, after? }]`

## 错误码
- 400 参数错误；401 未鉴权；403 无权限；404 资源不存在；409 版本冲突；422 业务校验失败（重名、越权）。