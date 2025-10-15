Feature: 目录与权限 - 模板应用与版本校验

  Background:
    Given 已存在模板 "DefaultKB" version "v1"
    And 目录树已初始化

  Scenario: 对现有目录应用模板片段
    Given 目标目录为 "Root/Projects"
    When 调用 POST /api/directories/apply-template 模板 "DefaultKB" 片段 "project"
    Then 返回状态码 200
    And 目录下新增模板定义的子结构

  Scenario: 模板版本不兼容拒绝
    Given 现有目录标记支持模板版本范围 [v1..v2]
    When 尝试应用模板版本 "v3"
    Then 返回状态码 422
    And 错误码为 template_version_incompatible