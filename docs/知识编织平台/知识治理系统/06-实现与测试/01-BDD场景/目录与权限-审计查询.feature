Feature: 目录与权限 - 审计与查询

  Background:
    Given 系统记录所有目录与权限变更审计事件

  Scenario: 查询最近权限变更审计记录
    Given 发生了一次权限覆盖修改
    When 调用 GET /api/audit/events?type=permission&limit=20
    Then 返回状态码 200
    And 列表包含最近的权限变更事件
    And 事件包含 actorId、timestamp、delta、targetDirectoryId

  Scenario: 通过事务ID回放变更
    Given 审计事件包含 transactionId
    When 调用 POST /api/audit/replay 指定 transactionId
    Then 返回状态码 202
    And 系统异步执行回放任务