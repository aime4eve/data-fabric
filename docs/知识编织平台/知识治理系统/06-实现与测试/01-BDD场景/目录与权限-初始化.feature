Feature: 目录与权限 - 初始化与模板应用

  Background:
    Given 系统存在默认目录模板 "DefaultKB"

  Scenario: 初始化根目录使用模板
    Given 管理员准备初始化空知识库
    When 调用接口 POST /api/directories/init 使用模板 "DefaultKB"
    Then 返回状态码 201
    And 根目录已创建且包含预设子目录
    And 返回初始化结果包含 rootId 与 appliedTemplateId

  Scenario: 幂等初始化
    Given 知识库已初始化
    When 重复调用接口 POST /api/directories/init 使用相同模板
    Then 返回状态码 200
    And 不重复创建目录

  Scenario: 初始化失败回滚
    Given 模板引用的子目录存在命名冲突
    When 执行初始化流程
    Then 初始化事务整体回滚
    And 审计记录包含失败原因与模板版本