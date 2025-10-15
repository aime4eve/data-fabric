Feature: 目录与权限 - CRUD 与排序/移动

  Background:
    Given 已存在根目录 "Root" 和子目录集合

  Scenario: 同级目录名称唯一性校验
    Given 在 "Root" 下已经存在子目录 "Specs"
    When 尝试创建同名子目录 "Specs"
    Then 返回状态码 409
    And 错误码为 name_conflict

  Scenario: 目录移动维持层级合法性
    Given 目录 "Specs" 下有子目录 "API"
    When 尝试将 "Specs" 移动到其子目录 "API" 下
    Then 返回状态码 400
    And 错误码为 invalid_move_cycle

  Scenario: 目录排序更新持久化
    Given "Root" 下存在三个子目录 "A", "B", "C"
    When 调用 PATCH /api/directories/order 更新为 [C,B,A]
    Then 返回状态码 200
    And 再次查询列表顺序为 [C,B,A]