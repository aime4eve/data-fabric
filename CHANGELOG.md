# Changelog

本项目的所有显著更改都会记录在此文件中。

格式遵循 Keep a Changelog，并尽可能遵循 语义化版本（SemVer）。

## [Unreleased]

## [0.1.0] - 2025-10-15

### 新增
- 前端：`authStore.ts` 增加 `mapRegisterErrorMessage`，根据后端返回的 `code/reason` 映射更明确的注册错误文案，覆盖：
  - 格式类：`invalid_email_format`、`invalid_domain`、`invalid_local_part`、`empty`
  - 可达性类：`domain_not_found`、`dns_unreachable`、`mx_or_a_not_found`
- 测试：后端邮箱校验单元测试新增与完善（`scripts/test/tests/unit/backend/test_auth.py`）：
  - 格式错误验证（`reason=format_error`）
  - 保留/无效 TLD 映射（`reason=format_error`）
  - DNS NXDOMAIN/无 MX 或 A/AAAA/不可达（`reason=deliverability_error`）

### 变更
- 前端：`Register.tsx` 注册失败提示的 `Alert` 组件增加描述信息：`请检查邮箱格式或域名可达性`。
- 后端：`user_controller.py` 手机号校验重构为使用 `validate_phone_ex`，当校验失败时返回结构化错误响应（包含 `success`、`message`、`code`、`reason`）。

### 备注
- 本次改动对应提交哈希：`90118ba`。
- 若需要对版本号进行提升（例如 `0.1.1`），可在实际发布流程中同步更新 `src/backend/pyproject.toml` 的版本字段，并为前端与测试套件按需补充版本标签。