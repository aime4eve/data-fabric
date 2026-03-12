# URL Filtering

## Overview

URL 过滤策略，包括语言优先、域名边界控制和通用排除规则。

## ADDED Requirements

### Requirement: 英文优先过滤

系统 SHALL 优先爬取英文页面，排除非英文语言路径和子域名。

#### Scenario: 排除非英文路径前缀
- **WHEN** URL 路径以 `/zh/`、`/de/`、`/fr/`、`/ja/` 等非英文前缀开头
- **THEN** 系统 SHALL 排除该 URL

#### Scenario: 排除非英文子域名
- **WHEN** URL 的子域名为 `zh.`、`de.`、`fr.`、`ja.` 等非英文标识
- **THEN** 系统 SHALL 排除该 URL

#### Scenario: 保留英文路径
- **WHEN** URL 路径以 `/en/` 或 `/english/` 开头
- **THEN** 系统 SHALL 保留该 URL

#### Scenario: 保留英文子域名
- **WHEN** URL 的子域名为 `en.` 或 `english.`
- **THEN** 系统 SHALL 保留该 URL

#### Scenario: 保留无语言标识的 URL
- **WHEN** URL 不包含任何语言标识
- **THEN** 系统 SHALL 默认保留该 URL（视为英文）

### Requirement: 通用排除规则

系统 SHALL 排除常见的非内容页面路径。

#### Scenario: 排除管理后台
- **WHEN** URL 包含 `/admin`、`/administrator`、`/wp-admin`、`/backend` 路径
- **THEN** 系统 SHALL 排除该 URL

#### Scenario: 排除登录注册
- **WHEN** URL 包含 `/login`、`/signin`、`/register`、`/signup`、`/logout` 路径
- **THEN** 系统 SHALL 排除该 URL

#### Scenario: 排除 API 端点
- **WHEN** URL 路径以 `/api/`、`/graphql`、`/rest/` 开头
- **THEN** 系统 SHALL 排除该 URL

#### Scenario: 排除搜索和分页
- **WHEN** URL 包含 `/search?`、`/page/`、`?page=` 参数
- **THEN** 系统 SHALL 排除该 URL

#### Scenario: 排除用户相关路径
- **WHEN** URL 包含 `/user/`、`/account/`、`/profile/`、`/cart/`、`/checkout/` 路径
- **THEN** 系统 SHALL 排除该 URL

#### Scenario: 排除技术路径
- **WHEN** URL 为 `/feed`、`/rss`、`/xmlrpc.php`、`/.env`、`/.git`
- **THEN** 系统 SHALL 排除该 URL

### Requirement: 文件类型过滤

系统 SHALL 排除非 HTML 文件类型的 URL。

#### Scenario: 排除二进制文件
- **WHEN** URL 以 `.pdf`、`.jpg`、`.png`、`.zip`、`.exe` 等扩展名结尾
- **THEN** 系统 SHALL 排除该 URL（不作为页面爬取）

#### Scenario: 保留 HTML 页面
- **WHEN** URL 以 `.html` 结尾或无扩展名
- **THEN** 系统 SHALL 保留该 URL

### Requirement: 可配置过滤规则

系统 SHALL 支持用户自定义包含/排除规则。

#### Scenario: 自定义排除规则
- **WHEN** 用户通过 `-a exclude_patterns="/blog/,/news/"` 参数指定排除规则
- **THEN** 系统 SHALL 排除匹配这些模式的 URL

#### Scenario: 自定义包含规则
- **WHEN** 用户通过 `-a include_patterns="/products/"` 参数指定包含规则
- **THEN** 系统 SHALL 仅爬取匹配这些模式的 URL
