# Asset Downloader

## Overview

资源下载与链接重写能力，确保本地静态 HTML 可离线浏览。

## ADDED Requirements

### Requirement: 资源类型识别

系统 SHALL 识别并下载 HTML 页面中引用的资源文件。

#### Scenario: CSS 资源
- **WHEN** 页面包含 `<link rel="stylesheet" href="...">` 或 `@import url(...)`
- **THEN** 系统 SHALL 下载 CSS 文件到 `_assets/` 目录

#### Scenario: JavaScript 资源
- **WHEN** 页面包含 `<script src="...">`
- **THEN** 系统 SHALL 下载 JS 文件到 `_assets/` 目录

#### Scenario: 图片资源
- **WHEN** 页面包含 `<img src="...">` 或 `background-image: url(...)`
- **THEN** 系统 SHALL 下载图片文件到 `_assets/` 目录

#### Scenario: 字体资源
- **WHEN** 页面包含 `@font-face { src: url(...) }`
- **THEN** 系统 SHALL 下载字体文件到 `_assets/` 目录

#### Scenario: 视频资源
- **WHEN** 页面包含 `<video src="...">` 或 `<source src="...">`
- **THEN** 系统 SHALL 下载视频文件到 `_assets/` 目录

### Requirement: 资源路径保留

系统 SHALL 在 `_assets/` 目录中保留资源的原始路径结构。

#### Scenario: 路径结构保留
- **WHEN** 资源原始 URL 为 `https://example.com/static/css/main.css`
- **THEN** 系统 SHALL 保存到 `_assets/static/css/main.css`

#### Scenario: 查询参数处理
- **WHEN** 资源 URL 包含查询参数 `style.css?v=1.2.3`
- **THEN** 系统 SHALL 将文件名修改为 `style_q{hash}.css` 避免冲突

### Requirement: 链接重写

系统 SHALL 将 HTML 中的资源链接重写为本地相对路径。

#### Scenario: CSS 链接重写
- **WHEN** 原始 HTML 为 `<link href="https://cdn.example.com/css/main.css">`
- **THEN** 重写后 SHALL 为 `<link href="_assets/css/main.css">`（相对于当前页面）

#### Scenario: 图片链接重写
- **WHEN** 原始 HTML 为 `<img src="/images/logo.png">`
- **THEN** 重写后 SHALL 为 `<img src="../_assets/images/logo.png">`（根据页面深度调整）

#### Scenario: srcset 处理
- **WHEN** 原始 HTML 包含 `srcset="img-1x.png 1x, img-2x.png 2x"`
- **THEN** 系统 SHALL 下载所有图片并重写 srcset 属性

### Requirement: 页面链接处理

系统 SHALL 将 HTML 中的页面链接转换为本地 HTML 文件路径。

#### Scenario: 内部页面链接
- **WHEN** 原始 HTML 为 `<a href="/products/item1">`
- **THEN** 重写后 SHALL 为 `<a href="../products/item1.html">`（如果本地文件存在）

#### Scenario: 外部链接保持
- **WHEN** 原始 HTML 为 `<a href="https://external.com/page">`
- **THEN** 系统 SHALL 保持链接不变

#### Scenario: 未爬取页面链接
- **WHEN** 页面链接指向的本地文件不存在
- **THEN** 系统 SHALL 保持原始绝对 URL

### Requirement: 下载失败处理

系统 SHALL 优雅处理资源下载失败的情况。

#### Scenario: 资源不存在
- **WHEN** 资源 URL 返回 404 错误
- **THEN** 系统 SHALL 记录错误日志，保持原始链接不变

#### Scenario: 下载超时
- **WHEN** 资源下载超过 30 秒
- **THEN** 系统 SHALL 取消下载，保持原始链接不变

#### Scenario: 文件过大
- **WHEN** 资源文件超过 10MB
- **THEN** 系统 SHALL 跳过下载，保持原始链接不变

### Requirement: 跨域资源处理

系统 SHALL 下载允许的跨域资源。

#### Scenario: CDN 子域名资源
- **WHEN** 资源来自 `cdn.example.com`
- **THEN** 系统 SHALL 下载该资源（视为同站资源）

#### Scenario: 外部 CDN 资源
- **WHEN** 资源来自 `cdnjs.cloudflare.com` 等外部 CDN
- **THEN** 系统 SHALL 下载该资源到 `_assets/external/` 目录

#### Scenario: 协议相对 URL
- **WHEN** 资源 URL 为 `//cdn.example.com/style.css`
- **THEN** 系统 SHALL 使用 HTTPS 协议下载
