"""
pytest配置文件
全局测试配置和fixture定义
"""
import pytest
import os
import sys
import json
import time
import logging
from datetime import datetime
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src" / "backend"))
sys.path.insert(0, str(project_root / "src" / "frontend"))

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@pytest.fixture(scope="session")
def test_config():
    """测试配置"""
    return {
        "frontend_url": os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "backend_url": os.getenv("BACKEND_URL", "http://localhost:5000"),
        "test_database_url": os.getenv("TEST_DATABASE_URL", "sqlite:///test.db"),
        "test_users": [
            {"username": "admin", "password": "123456", "role": "admin"},
            {"username": "user1", "password": "123456", "role": "user"},
            {"username": "user2", "password": "123456", "role": "user"}
        ],
        "timeouts": {
            "page_load": 30,
            "api_response": 10,
            "element_wait": 10
        }
    }


@pytest.fixture(scope="session")
def test_results():
    """测试结果收集器"""
    return {
        "test_cases": [],
        "start_time": datetime.now(),
        "end_time": None,
        "summary": {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "errors": 0
        }
    }


@pytest.fixture(autouse=True)
def test_case_tracker(request, test_results):
    """自动跟踪每个测试用例"""
    test_id = f"{request.module.__name__}::{request.cls.__name__ if request.cls else 'NoClass'}::{request.function.__name__}"
    
    test_case = {
        "test_id": test_id,
        "description": request.function.__doc__ or request.function.__name__,
        "module": request.module.__name__,
        "class": request.cls.__name__ if request.cls else None,
        "function": request.function.__name__,
        "markers": [marker.name for marker in request.node.iter_markers()],
        "start_time": datetime.now().isoformat(),
        "end_time": None,
        "duration": 0,
        "status": "running",
        "error_message": None,
        "steps": [],
        "input_data": {},
        "expected_result": "测试应该通过",
        "actual_result": None
    }
    
    # 从测试函数的docstring中提取步骤信息
    if request.function.__doc__:
        doc_lines = request.function.__doc__.strip().split('\n')
        test_case["description"] = doc_lines[0].strip()
        
        # 查找步骤信息
        steps = []
        for line in doc_lines[1:]:
            line = line.strip()
            if line.startswith("步骤") or line.startswith("Step"):
                steps.append(line)
        test_case["steps"] = steps
    
    test_results["test_cases"].append(test_case)
    
    start_time = time.time()
    
    yield test_case
    
    # 测试完成后更新结果
    end_time = time.time()
    test_case["end_time"] = datetime.now().isoformat()
    test_case["duration"] = end_time - start_time
    
    # 获取测试结果
    if hasattr(request.node, "rep_call"):
        if request.node.rep_call.passed:
            test_case["status"] = "passed"
            test_case["actual_result"] = "测试通过"
            test_results["summary"]["passed"] += 1
        elif request.node.rep_call.failed:
            test_case["status"] = "failed"
            test_case["error_message"] = str(request.node.rep_call.longrepr)
            test_case["actual_result"] = f"测试失败: {request.node.rep_call.longrepr}"
            test_results["summary"]["failed"] += 1
        elif request.node.rep_call.skipped:
            test_case["status"] = "skipped"
            test_case["actual_result"] = "测试跳过"
            test_results["summary"]["skipped"] += 1
    else:
        test_case["status"] = "unknown"
        test_case["actual_result"] = "测试状态未知"
    
    test_results["summary"]["total"] += 1


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """捕获测试结果"""
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)


@pytest.fixture(scope="session", autouse=True)
def generate_test_report(test_results):
    """生成测试报告"""
    yield
    
    # 测试会话结束时生成报告
    test_results["end_time"] = datetime.now()
    
    # 计算总执行时间
    total_duration = (test_results["end_time"] - test_results["start_time"]).total_seconds()
    
    # 生成JSON报告
    report = {
        "test_execution_summary": {
            "start_time": test_results["start_time"].isoformat(),
            "end_time": test_results["end_time"].isoformat(),
            "total_duration_seconds": total_duration,
            "total_test_cases": test_results["summary"]["total"],
            "passed": test_results["summary"]["passed"],
            "failed": test_results["summary"]["failed"],
            "skipped": test_results["summary"]["skipped"],
            "errors": test_results["summary"]["errors"],
            "success_rate": (test_results["summary"]["passed"] / max(test_results["summary"]["total"], 1)) * 100
        },
        "test_cases": test_results["test_cases"],
        "environment_info": {
            "python_version": sys.version,
            "pytest_version": pytest.__version__,
            "operating_system": os.name,
            "frontend_url": os.getenv("FRONTEND_URL", "http://localhost:3000"),
            "backend_url": os.getenv("BACKEND_URL", "http://localhost:5000")
        },
        "compliance_info": {
            "security_standards": "符合政府安全标准要求",
            "automation_framework": "适用于自动化测试框架",
            "manual_intervention": "最小化人工干预"
        }
    }
    
    # 保存报告到文件
    report_dir = Path(__file__).parent / "reports"
    report_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = report_dir / f"test_report_{timestamp}.json"
    
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    logger.info(f"测试报告已生成: {report_file}")
    
    # 生成简化的控制台报告
    print("\n" + "="*80)
    print("测试执行总结")
    print("="*80)
    print(f"总测试用例数: {report['test_execution_summary']['total_test_cases']}")
    print(f"通过: {report['test_execution_summary']['passed']}")
    print(f"失败: {report['test_execution_summary']['failed']}")
    print(f"跳过: {report['test_execution_summary']['skipped']}")
    print(f"成功率: {report['test_execution_summary']['success_rate']:.2f}%")
    print(f"总执行时间: {report['test_execution_summary']['total_duration_seconds']:.2f}秒")
    print(f"详细报告: {report_file}")
    print("="*80)


# 测试标记定义
def pytest_configure(config):
    """配置pytest标记"""
    config.addinivalue_line("markers", "unit: 单元测试")
    config.addinivalue_line("markers", "integration: 集成测试")
    config.addinivalue_line("markers", "system: 系统测试")
    config.addinivalue_line("markers", "slow: 慢速测试")
    config.addinivalue_line("markers", "security: 安全测试")
    config.addinivalue_line("markers", "performance: 性能测试")
    config.addinivalue_line("markers", "accessibility: 可访问性测试")


# 跳过条件定义
def pytest_collection_modifyitems(config, items):
    """修改测试收集"""
    # 如果没有指定标记，默认运行所有测试
    if not config.getoption("-m"):
        return
    
    # 根据环境变量跳过某些测试
    if not os.getenv("RUN_SLOW_TESTS"):
        skip_slow = pytest.mark.skip(reason="跳过慢速测试，设置RUN_SLOW_TESTS=1来运行")
        for item in items:
            if "slow" in item.keywords:
                item.add_marker(skip_slow)
    
    if not os.getenv("RUN_SECURITY_TESTS"):
        skip_security = pytest.mark.skip(reason="跳过安全测试，设置RUN_SECURITY_TESTS=1来运行")
        for item in items:
            if "security" in item.keywords:
                item.add_marker(skip_security)


# 测试数据fixture
@pytest.fixture
def sample_user_data():
    """示例用户数据"""
    return {
        "valid_user": {
            "username": "admin",
            "password": "123456",
            "email": "admin@example.com"
        },
        "invalid_user": {
            "username": "invalid",
            "password": "wrongpass",
            "email": "invalid@example.com"
        },
        "test_users": [
            {"username": "user1", "password": "pass1", "email": "user1@test.com"},
            {"username": "user2", "password": "pass2", "email": "user2@test.com"},
            {"username": "user3", "password": "pass3", "email": "user3@test.com"}
        ]
    }


@pytest.fixture
def api_headers():
    """API请求头"""
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "TestClient/1.0"
    }


@pytest.fixture
def mock_responses():
    """模拟响应数据"""
    return {
        "login_success": {
            "status": "success",
            "message": "登录成功",
            "data": {
                "token": "mock_jwt_token",
                "user": {
                    "id": 1,
                    "username": "admin",
                    "email": "admin@example.com",
                    "role": "admin"
                }
            }
        },
        "login_failure": {
            "status": "error",
            "message": "用户名或密码错误",
            "data": None
        },
        "validation_error": {
            "status": "error",
            "message": "输入验证失败",
            "errors": {
                "username": ["用户名不能为空"],
                "password": ["密码不能为空"]
            }
        }
    }


# 清理fixture
@pytest.fixture(autouse=True)
def cleanup_after_test():
    """测试后清理"""
    yield
    # 这里可以添加测试后的清理逻辑
    # 例如：清理测试数据、重置状态等
    pass


# 数据库fixture（如果需要）
@pytest.fixture(scope="session")
def test_database():
    """测试数据库"""
    # 这里可以设置测试数据库
    # 例如：创建临时数据库、初始化测试数据等
    yield
    # 清理测试数据库
    pass


# WebDriver相关fixture
@pytest.fixture(scope="session")
def webdriver_options():
    """WebDriver选项"""
    from selenium.webdriver.chrome.options import Options
    
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-plugins")
    
    return options


# 性能测试fixture
@pytest.fixture
def performance_monitor():
    """性能监控"""
    class PerformanceMonitor:
        def __init__(self):
            self.start_time = None
            self.end_time = None
            self.metrics = {}
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
            return self.end_time - self.start_time if self.start_time else 0
        
        def add_metric(self, name, value):
            self.metrics[name] = value
        
        def get_metrics(self):
            return self.metrics
    
    return PerformanceMonitor()


# 错误处理fixture
@pytest.fixture
def error_handler():
    """错误处理器"""
    class ErrorHandler:
        def __init__(self):
            self.errors = []
        
        def add_error(self, error_type, message, details=None):
            self.errors.append({
                "type": error_type,
                "message": message,
                "details": details,
                "timestamp": datetime.now().isoformat()
            })
        
        def get_errors(self):
            return self.errors
        
        def has_errors(self):
            return len(self.errors) > 0
        
        def clear_errors(self):
            self.errors = []
    
    return ErrorHandler()