import pytest

"""
权限继承与覆盖 - 单元测试骨架
注：仅生成文件，不执行。场景聚焦于：
- 父目录允许 + 子目录未覆盖 => 继承允许
- 父目录允许 + 子目录显式拒绝 => 拒绝优先
- 同一主体存在冲突规则 => 拒绝优先
- 多层级合并 => 自顶向下合并，局部覆盖
"""

pytestmark = pytest.mark.skip(reason="仅生成文件，不执行。")


def test_inherit_allow_without_override():
    """父目录允许在子目录生效"""
    pass


def test_child_deny_overrides_parent_allow():
    """子目录拒绝优先于父目录允许"""
    pass


def test_conflicting_rules_for_same_subject():
    """针对同一主体冲突规则时拒绝优先"""
    pass


def test_multi_level_merge_with_local_overrides():
    """多层合并时局部覆盖生效"""
    pass