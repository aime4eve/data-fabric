Feature: 目录与权限 - 继承与覆盖

  Background:
    Given 已存在根目录 "Root" 与子目录 "Design"
    And 根目录权限包含 role=editor, action=write

  Scenario: 子目录继承父目录权限
    Given 子目录未设置任何覆盖权限
    When 查询子目录有效权限
    Then 返回包含父目录的 write 权限

  Scenario: 子目录覆盖父目录的拒绝规则优先
    Given 父目录允许 role=viewer, action=read
    And 子目录显式拒绝 role=viewer, action=read
    When 查询子目录有效权限
    Then 返回不包含 viewer 的 read 权限

  Scenario: 同一主体多条规则冲突
    Given 子目录存在两条针对 role=editor 的规则（一允许一拒绝）
    When 计算有效权限
    Then 拒绝规则优先于允许规则
    And 返回的权限集不包含 editor 的对应 action