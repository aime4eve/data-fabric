#!/usr/bin/env python3
"""
快速测试验证脚本
用于验证测试环境和基本功能
"""
import os
import sys
import json
import subprocess
import time
from pathlib import Path
from datetime import datetime

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "src" / "frontend"))
sys.path.insert(0, str(project_root / "src" / "backend"))

def check_python_environment():
    """检查Python环境"""
    print("检查Python环境...")
    print(f"Python版本: {sys.version}")
    print(f"项目根目录: {project_root}")
    
    # 检查必要的包
    required_packages = ["pytest", "requests"]
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✓ {package} 已安装")
        except ImportError:
            missing_packages.append(package)
            print(f"✗ {package} 未安装")
    
    return len(missing_packages) == 0

def run_simple_unit_test():
    """运行简单的单元测试"""
    print("\n运行简单单元测试...")
    
    # 创建临时测试文件
    test_content = '''
import pytest

def test_basic_math():
    """基础数学运算测试"""
    assert 1 + 1 == 2
    assert 2 * 3 == 6
    assert 10 / 2 == 5

def test_string_operations():
    """字符串操作测试"""
    assert "hello".upper() == "HELLO"
    assert "world".capitalize() == "World"
    assert len("test") == 4

def test_list_operations():
    """列表操作测试"""
    test_list = [1, 2, 3]
    assert len(test_list) == 3
    assert test_list[0] == 1
    assert 2 in test_list
'''
    
    temp_test_file = project_root / "tests" / "temp_basic_test.py"
    with open(temp_test_file, "w", encoding="utf-8") as f:
        f.write(test_content)
    
    try:
        # 运行pytest
        cmd = [sys.executable, "-m", "pytest", str(temp_test_file), "-v"]
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(project_root))
        
        print(f"返回码: {result.returncode}")
        if result.stdout:
            print("输出:")
            print(result.stdout)
        if result.stderr:
            print("错误:")
            print(result.stderr)
        
        return result.returncode == 0
    
    finally:
        # 清理临时文件
        if temp_test_file.exists():
            temp_test_file.unlink()

def check_services():
    """检查服务状态"""
    print("\n检查服务状态...")
    
    services = {
        "前端服务": "http://localhost:3000",
        "后端服务": "http://localhost:5000"
    }
    
    service_status = {}
    
    try:
        import requests
        
        for service_name, url in services.items():
            try:
                response = requests.get(url, timeout=3)
                service_status[service_name] = {
                    "available": True,
                    "status_code": response.status_code,
                    "url": url
                }
                print(f"✓ {service_name} 可用 ({url}) - 状态码: {response.status_code}")
            except Exception as e:
                service_status[service_name] = {
                    "available": False,
                    "error": str(e),
                    "url": url
                }
                print(f"✗ {service_name} 不可用 ({url}) - 错误: {e}")
    
    except ImportError:
        print("✗ requests包未安装，无法检查服务状态")
        return {}
    
    return service_status

def generate_quick_report():
    """生成快速测试报告"""
    print("\n生成测试报告...")
    
    # 检查环境
    env_ok = check_python_environment()
    
    # 运行基础测试
    basic_test_ok = run_simple_unit_test()
    
    # 检查服务
    service_status = check_services()
    
    # 生成报告
    report = {
        "test_execution_summary": {
            "execution_id": f"quick_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "test_type": "quick_validation",
            "environment_check": "passed" if env_ok else "failed",
            "basic_tests": "passed" if basic_test_ok else "failed",
            "overall_status": "passed" if (env_ok and basic_test_ok) else "failed"
        },
        "environment_info": {
            "python_version": sys.version,
            "project_root": str(project_root),
            "operating_system": os.name,
            "current_directory": os.getcwd()
        },
        "service_status": service_status,
        "test_results": [
            {
                "test_id": "env_check",
                "description": "Python环境检查",
                "status": "passed" if env_ok else "failed",
                "steps": ["检查Python版本", "验证必要包安装"],
                "expected_result": "环境配置正确",
                "actual_result": "环境检查通过" if env_ok else "环境检查失败"
            },
            {
                "test_id": "basic_unit_test",
                "description": "基础单元测试",
                "status": "passed" if basic_test_ok else "failed",
                "steps": ["运行数学运算测试", "运行字符串操作测试", "运行列表操作测试"],
                "expected_result": "所有基础测试通过",
                "actual_result": "基础测试通过" if basic_test_ok else "基础测试失败"
            }
        ],
        "recommendations": []
    }
    
    # 添加建议
    if not env_ok:
        report["recommendations"].append({
            "type": "environment_issue",
            "priority": "high",
            "message": "请安装缺失的Python包: pip install pytest requests"
        })
    
    if not basic_test_ok:
        report["recommendations"].append({
            "type": "test_failure",
            "priority": "high",
            "message": "基础测试失败，请检查pytest配置"
        })
    
    # 检查服务建议
    for service_name, status in service_status.items():
        if not status.get("available", False):
            report["recommendations"].append({
                "type": "service_issue",
                "priority": "medium",
                "message": f"{service_name}不可用，请启动相应服务"
            })
    
    if not report["recommendations"]:
        report["recommendations"].append({
            "type": "success",
            "priority": "info",
            "message": "快速验证通过，可以运行完整测试套件"
        })
    
    # 保存报告
    reports_dir = project_root / "tests" / "reports"
    reports_dir.mkdir(exist_ok=True)
    
    report_file = reports_dir / f"quick_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"\n快速测试报告已生成: {report_file}")
    
    # 打印总结
    print("\n" + "="*60)
    print("快速测试总结")
    print("="*60)
    print(f"环境检查: {'✓ 通过' if env_ok else '✗ 失败'}")
    print(f"基础测试: {'✓ 通过' if basic_test_ok else '✗ 失败'}")
    print(f"整体状态: {'✓ 通过' if report['test_execution_summary']['overall_status'] == 'passed' else '✗ 失败'}")
    
    if service_status:
        print("\n服务状态:")
        for service, status in service_status.items():
            status_text = "✓ 可用" if status.get("available", False) else "✗ 不可用"
            print(f"  {service}: {status_text}")
    
    if report["recommendations"]:
        print("\n建议:")
        for rec in report["recommendations"]:
            print(f"  [{rec['priority'].upper()}] {rec['message']}")
    
    print("="*60)
    
    return report_file

def main():
    """主函数"""
    print("企业知识库管理系统 - 快速测试验证")
    print("="*60)
    
    try:
        report_file = generate_quick_report()
        return 0 if report_file else 1
    except Exception as e:
        print(f"快速测试执行出错: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())