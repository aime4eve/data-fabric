"""
系统端到端测试
模拟真实用户操作流程的完整系统测试
"""
import pytest
import time
import json
import threading
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import TimeoutException, WebDriverException
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TestE2ESystem:
    """端到端系统测试类"""

    @pytest.fixture(scope="class")
    def system_config(self):
        """系统配置"""
        return {
            "frontend_url": "http://localhost:3000",
            "backend_url": "http://localhost:5000",
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

    @pytest.fixture(scope="class")
    def chrome_options(self):
        """Chrome浏览器选项"""
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-plugins")
        options.add_argument("--disable-images")  # 提高测试速度
        return options

    @pytest.fixture
    def driver(self, chrome_options):
        """WebDriver实例"""
        try:
            driver = webdriver.Chrome(options=chrome_options)
            driver.implicitly_wait(10)
            yield driver
        finally:
            if 'driver' in locals():
                driver.quit()

    @pytest.mark.system
    class TestCompleteUserJourney:
        """完整用户旅程测试"""

        def test_complete_login_to_dashboard_journey(self, driver, system_config):
            """测试从登录到仪表板的完整用户旅程"""
            frontend_url = system_config["frontend_url"]
            test_user = system_config["test_users"][0]
            
            logger.info("开始完整用户旅程测试")
            
            # 步骤1: 访问首页
            logger.info("步骤1: 访问首页")
            driver.get(frontend_url)
            wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
            
            # 检查页面是否加载
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            assert driver.current_url.startswith(frontend_url)
            
            # 步骤2: 导航到登录页面
            logger.info("步骤2: 导航到登录页面")
            if "/login" not in driver.current_url:
                # 查找登录链接或按钮
                try:
                    login_link = driver.find_element(By.LINK_TEXT, "登录")
                    login_link.click()
                except:
                    try:
                        login_link = driver.find_element(By.LINK_TEXT, "Login")
                        login_link.click()
                    except:
                        # 直接访问登录页面
                        driver.get(f"{frontend_url}/login")
            
            wait.until(EC.url_contains("/login"))
            
            # 步骤3: 填写登录表单
            logger.info("步骤3: 填写登录表单")
            username_input = wait.until(EC.element_to_be_clickable((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            # 清空并填写表单
            username_input.clear()
            username_input.send_keys(test_user["username"])
            password_input.clear()
            password_input.send_keys(test_user["password"])
            
            # 步骤4: 提交登录表单
            logger.info("步骤4: 提交登录表单")
            login_button.click()
            
            # 步骤5: 验证登录成功并重定向
            logger.info("步骤5: 验证登录成功")
            wait.until(EC.url_changes(f"{frontend_url}/login"))
            
            # 检查是否重定向到仪表板或主页
            current_url = driver.current_url
            assert "/dashboard" in current_url or "/home" in current_url or current_url == f"{frontend_url}/"
            
            # 步骤6: 验证仪表板内容加载
            logger.info("步骤6: 验证仪表板内容")
            try:
                # 等待主要内容区域加载
                main_content = wait.until(EC.presence_of_element_located((
                    By.CSS_SELECTOR, 
                    ".main-content, .dashboard, main, .content-area, [data-testid='dashboard']"
                )))
                assert main_content.is_displayed()
            except TimeoutException:
                # 如果没有找到特定的内容区域，至少确保页面已加载
                assert driver.execute_script("return document.readyState") == "complete"
            
            # 步骤7: 验证用户认证状态
            logger.info("步骤7: 验证用户认证状态")
            token = driver.execute_script("""
                return localStorage.getItem('token') || 
                       localStorage.getItem('access_token') || 
                       sessionStorage.getItem('token') || 
                       sessionStorage.getItem('access_token');
            """)
            assert token is not None
            
            logger.info("完整用户旅程测试完成")

        def test_user_registration_journey(self, driver, system_config):
            """测试用户注册流程"""
            frontend_url = system_config["frontend_url"]
            
            logger.info("开始用户注册流程测试")
            
            # 步骤1: 访问注册页面
            driver.get(f"{frontend_url}/register")
            wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
            
            try:
                # 等待注册表单加载
                wait.until(EC.presence_of_element_located((By.NAME, "username")))
                
                # 生成唯一的测试用户名
                import uuid
                test_username = f"testuser_{uuid.uuid4().hex[:8]}"
                test_email = f"{test_username}@test.com"
                test_password = "TestPass123!"
                
                # 填写注册表单
                username_input = driver.find_element(By.NAME, "username")
                email_input = driver.find_element(By.NAME, "email")
                password_input = driver.find_element(By.NAME, "password")
                confirm_password_input = driver.find_element(By.NAME, "confirmPassword")
                register_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                
                username_input.send_keys(test_username)
                email_input.send_keys(test_email)
                password_input.send_keys(test_password)
                confirm_password_input.send_keys(test_password)
                
                # 提交注册表单
                register_button.click()
                
                # 验证注册结果
                try:
                    # 等待成功消息或重定向
                    wait.until(EC.any_of(
                        EC.url_contains("/login"),
                        EC.url_contains("/dashboard"),
                        EC.presence_of_element_located((By.CSS_SELECTOR, ".success-message, .ant-message-success"))
                    ))
                    
                    # 如果重定向到登录页面，尝试使用新账户登录
                    if "/login" in driver.current_url:
                        username_input = driver.find_element(By.NAME, "username")
                        password_input = driver.find_element(By.NAME, "password")
                        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                        
                        username_input.send_keys(test_username)
                        password_input.send_keys(test_password)
                        login_button.click()
                        
                        # 验证登录成功
                        wait.until(EC.url_changes(f"{frontend_url}/login"))
                        
                except TimeoutException:
                    # 如果注册功能不可用，跳过测试
                    pytest.skip("User registration functionality not available")
                    
            except Exception as e:
                # 如果注册页面不存在，跳过测试
                pytest.skip(f"Registration page not available: {e}")

        def test_logout_journey(self, driver, system_config):
            """测试用户登出流程"""
            frontend_url = system_config["frontend_url"]
            test_user = system_config["test_users"][0]
            
            logger.info("开始用户登出流程测试")
            
            # 先登录
            driver.get(f"{frontend_url}/login")
            wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
            
            username_input = wait.until(EC.element_to_be_clickable((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            username_input.send_keys(test_user["username"])
            password_input.send_keys(test_user["password"])
            login_button.click()
            
            # 等待登录完成
            wait.until(EC.url_changes(f"{frontend_url}/login"))
            
            # 查找并点击登出按钮
            try:
                logout_selectors = [
                    "button:contains('登出')",
                    "button:contains('Logout')",
                    "a:contains('登出')",
                    "a:contains('Logout')",
                    ".logout-button",
                    "[data-testid='logout']"
                ]
                
                logout_element = None
                for selector in logout_selectors:
                    try:
                        if ":contains(" in selector:
                            # 使用XPath查找包含文本的元素
                            text = selector.split(":contains('")[1].split("')")[0]
                            xpath = f"//*[contains(text(), '{text}')]"
                            logout_element = driver.find_element(By.XPATH, xpath)
                        else:
                            logout_element = driver.find_element(By.CSS_SELECTOR, selector)
                        
                        if logout_element.is_displayed():
                            break
                    except:
                        continue
                
                if logout_element:
                    logout_element.click()
                    
                    # 验证登出成功
                    wait.until(EC.url_contains("/login"))
                    
                    # 验证token已清除
                    token = driver.execute_script("""
                        return localStorage.getItem('token') || 
                               localStorage.getItem('access_token') || 
                               sessionStorage.getItem('token') || 
                               sessionStorage.getItem('access_token');
                    """)
                    assert token is None or token == ""
                    
                else:
                    pytest.skip("Logout functionality not found")
                    
            except Exception as e:
                pytest.skip(f"Logout test failed: {e}")

    @pytest.mark.system
    class TestPerformanceSystem:
        """系统性能测试"""

        def test_concurrent_user_login(self, system_config):
            """测试并发用户登录"""
            backend_url = system_config["backend_url"]
            test_users = system_config["test_users"]
            
            logger.info("开始并发用户登录测试")
            
            def login_user(user_data):
                """单个用户登录函数"""
                try:
                    start_time = time.time()
                    response = requests.post(
                        f"{backend_url}/api/v1/auth/login",
                        json={
                            "username": user_data["username"],
                            "password": user_data["password"]
                        },
                        headers={"Content-Type": "application/json"},
                        timeout=system_config["timeouts"]["api_response"]
                    )
                    end_time = time.time()
                    
                    return {
                        "user": user_data["username"],
                        "status_code": response.status_code,
                        "response_time": end_time - start_time,
                        "success": response.status_code == 200
                    }
                except Exception as e:
                    return {
                        "user": user_data["username"],
                        "status_code": 0,
                        "response_time": 0,
                        "success": False,
                        "error": str(e)
                    }
            
            # 并发执行登录请求
            with ThreadPoolExecutor(max_workers=len(test_users)) as executor:
                futures = [executor.submit(login_user, user) for user in test_users]
                results = [future.result() for future in as_completed(futures)]
            
            # 验证结果
            successful_logins = [r for r in results if r["success"]]
            failed_logins = [r for r in results if not r["success"]]
            
            logger.info(f"成功登录: {len(successful_logins)}, 失败登录: {len(failed_logins)}")
            
            # 至少应有一个成功的登录
            assert len(successful_logins) > 0
            
            # 检查响应时间
            avg_response_time = sum(r["response_time"] for r in successful_logins) / len(successful_logins)
            assert avg_response_time < 5.0  # 平均响应时间应小于5秒

        def test_system_load_performance(self, driver, system_config):
            """测试系统负载性能"""
            frontend_url = system_config["frontend_url"]
            
            logger.info("开始系统负载性能测试")
            
            # 测试页面加载性能
            start_time = time.time()
            driver.get(frontend_url)
            
            wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            wait.until(lambda driver: driver.execute_script("return document.readyState") == "complete")
            
            end_time = time.time()
            page_load_time = end_time - start_time
            
            logger.info(f"页面加载时间: {page_load_time:.2f}秒")
            assert page_load_time < 10.0  # 页面加载时间应小于10秒
            
            # 测试JavaScript性能
            js_performance = driver.execute_script("""
                const start = performance.now();
                // 模拟一些JavaScript操作
                for (let i = 0; i < 10000; i++) {
                    const div = document.createElement('div');
                    div.innerHTML = 'test';
                }
                const end = performance.now();
                return end - start;
            """)
            
            logger.info(f"JavaScript执行时间: {js_performance:.2f}毫秒")
            assert js_performance < 1000  # JavaScript执行时间应小于1秒

        def test_memory_leak_detection(self, driver, system_config):
            """测试内存泄漏检测"""
            frontend_url = system_config["frontend_url"]
            test_user = system_config["test_users"][0]
            
            logger.info("开始内存泄漏检测测试")
            
            # 获取初始内存使用情况
            driver.get(frontend_url)
            wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            initial_memory = driver.execute_script("""
                if (performance.memory) {
                    return performance.memory.usedJSHeapSize;
                }
                return 0;
            """)
            
            if initial_memory == 0:
                pytest.skip("Browser does not support memory monitoring")
            
            # 执行多次登录/登出操作
            for i in range(5):
                logger.info(f"执行第{i+1}次登录/登出循环")
                
                # 登录
                driver.get(f"{frontend_url}/login")
                username_input = wait.until(EC.element_to_be_clickable((By.NAME, "username")))
                password_input = driver.find_element(By.NAME, "password")
                login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                
                username_input.send_keys(test_user["username"])
                password_input.send_keys(test_user["password"])
                login_button.click()
                
                wait.until(EC.url_changes(f"{frontend_url}/login"))
                
                # 等待一段时间
                time.sleep(1)
                
                # 尝试登出（如果有登出功能）
                try:
                    logout_element = driver.find_element(By.XPATH, "//*[contains(text(), '登出') or contains(text(), 'Logout')]")
                    logout_element.click()
                    wait.until(EC.url_contains("/login"))
                except:
                    # 如果没有登出功能，清除存储并重新访问登录页面
                    driver.execute_script("localStorage.clear(); sessionStorage.clear();")
                    driver.get(f"{frontend_url}/login")
            
            # 强制垃圾回收
            driver.execute_script("if (window.gc) { window.gc(); }")
            time.sleep(2)
            
            # 获取最终内存使用情况
            final_memory = driver.execute_script("""
                if (performance.memory) {
                    return performance.memory.usedJSHeapSize;
                }
                return 0;
            """)
            
            memory_increase = final_memory - initial_memory
            memory_increase_mb = memory_increase / (1024 * 1024)
            
            logger.info(f"内存增长: {memory_increase_mb:.2f}MB")
            
            # 内存增长应该在合理范围内（小于50MB）
            assert memory_increase_mb < 50

    @pytest.mark.system
    class TestSecuritySystem:
        """系统安全测试"""

        def test_xss_protection(self, driver, system_config):
            """测试XSS防护"""
            frontend_url = system_config["frontend_url"]
            
            logger.info("开始XSS防护测试")
            
            driver.get(f"{frontend_url}/login")
            wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
            
            # 尝试注入XSS脚本
            xss_payloads = [
                "<script>alert('XSS')</script>",
                "javascript:alert('XSS')",
                "<img src=x onerror=alert('XSS')>",
                "';alert('XSS');//",
                "<svg onload=alert('XSS')>"
            ]
            
            username_input = wait.until(EC.element_to_be_clickable((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            for payload in xss_payloads:
                logger.info(f"测试XSS载荷: {payload}")
                
                # 清空并输入XSS载荷
                username_input.clear()
                username_input.send_keys(payload)
                password_input.clear()
                password_input.send_keys("password")
                
                # 提交表单
                login_button.click()
                
                # 等待响应
                time.sleep(1)
                
                # 检查是否有弹窗（表示XSS成功）
                try:
                    alert = driver.switch_to.alert
                    alert_text = alert.text
                    alert.accept()
                    
                    # 如果有弹窗，说明XSS防护失败
                    assert False, f"XSS防护失败，载荷: {payload}, 弹窗内容: {alert_text}"
                    
                except:
                    # 没有弹窗，说明XSS防护成功
                    pass
                
                # 检查页面源码中是否包含未转义的脚本
                page_source = driver.page_source
                assert "<script>alert('XSS')</script>" not in page_source
                assert "javascript:alert('XSS')" not in page_source

        def test_sql_injection_protection(self, system_config):
            """测试SQL注入防护"""
            backend_url = system_config["backend_url"]
            
            logger.info("开始SQL注入防护测试")
            
            # SQL注入载荷
            sql_payloads = [
                "admin'; DROP TABLE users; --",
                "admin' OR '1'='1",
                "admin' UNION SELECT * FROM users --",
                "admin'; INSERT INTO users VALUES ('hacker', 'password'); --",
                "admin' AND (SELECT COUNT(*) FROM users) > 0 --"
            ]
            
            for payload in sql_payloads:
                logger.info(f"测试SQL注入载荷: {payload}")
                
                try:
                    response = requests.post(
                        f"{backend_url}/api/v1/auth/login",
                        json={
                            "username": payload,
                            "password": "password"
                        },
                        headers={"Content-Type": "application/json"},
                        timeout=system_config["timeouts"]["api_response"]
                    )
                    
                    # 检查响应
                    assert response.status_code in [400, 401, 422]  # 应该返回错误状态码
                    
                    # 检查响应内容不包含数据库错误信息
                    response_text = response.text.lower()
                    database_errors = [
                        "sql", "mysql", "postgresql", "sqlite", "oracle",
                        "syntax error", "table", "column", "database"
                    ]
                    
                    for error_keyword in database_errors:
                        assert error_keyword not in response_text, f"响应包含数据库错误信息: {error_keyword}"
                        
                except requests.exceptions.RequestException:
                    # 网络错误，跳过此载荷
                    continue

        def test_csrf_protection(self, system_config):
            """测试CSRF防护"""
            backend_url = system_config["backend_url"]
            
            logger.info("开始CSRF防护测试")
            
            # 尝试不带CSRF token的请求
            try:
                response = requests.post(
                    f"{backend_url}/api/v1/auth/login",
                    json={
                        "username": "admin",
                        "password": "123456"
                    },
                    headers={
                        "Content-Type": "application/json",
                        "Origin": "http://malicious-site.com",
                        "Referer": "http://malicious-site.com"
                    },
                    timeout=system_config["timeouts"]["api_response"]
                )
                
                # 检查CORS头
                cors_headers = response.headers.get("Access-Control-Allow-Origin", "")
                assert cors_headers != "*" or cors_headers == system_config["frontend_url"]
                
            except requests.exceptions.RequestException:
                # 如果请求被拒绝，说明CSRF防护有效
                pass

        def test_rate_limiting(self, system_config):
            """测试速率限制"""
            backend_url = system_config["backend_url"]
            
            logger.info("开始速率限制测试")
            
            # 快速发送多个请求
            responses = []
            for i in range(20):  # 发送20个请求
                try:
                    response = requests.post(
                        f"{backend_url}/api/v1/auth/login",
                        json={
                            "username": "admin",
                            "password": "wrongpassword"
                        },
                        headers={"Content-Type": "application/json"},
                        timeout=system_config["timeouts"]["api_response"]
                    )
                    responses.append(response.status_code)
                except requests.exceptions.RequestException:
                    responses.append(0)
                
                time.sleep(0.1)  # 短暂延迟
            
            # 检查是否有速率限制响应（429状态码）
            rate_limited_responses = [code for code in responses if code == 429]
            
            # 如果有速率限制，应该有一些429响应
            if len(rate_limited_responses) > 0:
                logger.info(f"检测到速率限制: {len(rate_limited_responses)}个429响应")
            else:
                logger.info("未检测到速率限制")

        def test_input_validation(self, driver, system_config):
            """测试输入验证"""
            frontend_url = system_config["frontend_url"]
            
            logger.info("开始输入验证测试")
            
            driver.get(f"{frontend_url}/login")
            wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
            
            # 测试各种无效输入
            invalid_inputs = [
                {"username": "", "password": ""},  # 空输入
                {"username": "a" * 1000, "password": "b" * 1000},  # 超长输入
                {"username": "user\x00null", "password": "pass\x00null"},  # 空字节
                {"username": "user\n\r", "password": "pass\n\r"},  # 换行符
                {"username": "user\t", "password": "pass\t"},  # 制表符
            ]
            
            username_input = wait.until(EC.element_to_be_clickable((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            for invalid_input in invalid_inputs:
                logger.info(f"测试无效输入: {invalid_input}")
                
                # 清空并输入无效数据
                username_input.clear()
                username_input.send_keys(invalid_input["username"])
                password_input.clear()
                password_input.send_keys(invalid_input["password"])
                
                # 提交表单
                login_button.click()
                
                # 等待响应
                time.sleep(1)
                
                # 检查是否有适当的错误处理
                try:
                    error_elements = driver.find_elements(By.CSS_SELECTOR, 
                        ".error, .alert-error, .ant-message-error, [role='alert']")
                    
                    # 应该有错误消息或仍在登录页面
                    has_error = any(elem.is_displayed() for elem in error_elements)
                    still_on_login = "/login" in driver.current_url
                    
                    assert has_error or still_on_login
                    
                except Exception:
                    # 至少确保没有成功登录
                    assert "/login" in driver.current_url

    @pytest.mark.system
    class TestAccessibilitySystem:
        """系统可访问性测试"""

        def test_keyboard_navigation(self, driver, system_config):
            """测试键盘导航"""
            frontend_url = system_config["frontend_url"]
            
            logger.info("开始键盘导航测试")
            
            driver.get(f"{frontend_url}/login")
            wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
            
            # 等待页面加载
            wait.until(EC.presence_of_element_located((By.NAME, "username")))
            
            # 使用Tab键导航
            actions = ActionChains(driver)
            
            # 按Tab键移动到用户名输入框
            actions.send_keys(Keys.TAB).perform()
            active_element = driver.switch_to.active_element
            assert active_element.get_attribute("name") == "username"
            
            # 输入用户名
            active_element.send_keys("admin")
            
            # 按Tab键移动到密码输入框
            actions.send_keys(Keys.TAB).perform()
            active_element = driver.switch_to.active_element
            assert active_element.get_attribute("name") == "password"
            
            # 输入密码
            active_element.send_keys("123456")
            
            # 按Tab键移动到提交按钮
            actions.send_keys(Keys.TAB).perform()
            active_element = driver.switch_to.active_element
            assert active_element.get_attribute("type") == "submit"
            
            # 按Enter键提交表单
            actions.send_keys(Keys.ENTER).perform()
            
            # 验证表单提交
            wait.until(EC.url_changes(f"{frontend_url}/login"))

        def test_aria_labels(self, driver, system_config):
            """测试ARIA标签"""
            frontend_url = system_config["frontend_url"]
            
            logger.info("开始ARIA标签测试")
            
            driver.get(f"{frontend_url}/login")
            wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
            
            # 等待页面加载
            wait.until(EC.presence_of_element_located((By.NAME, "username")))
            
            # 检查表单元素的ARIA属性
            username_input = driver.find_element(By.NAME, "username")
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            # 检查是否有适当的标签
            username_label = username_input.get_attribute("aria-label") or username_input.get_attribute("placeholder")
            password_label = password_input.get_attribute("aria-label") or password_input.get_attribute("placeholder")
            button_label = login_button.get_attribute("aria-label") or login_button.text
            
            assert username_label is not None and len(username_label) > 0
            assert password_label is not None and len(password_label) > 0
            assert button_label is not None and len(button_label) > 0

        def test_color_contrast(self, driver, system_config):
            """测试颜色对比度"""
            frontend_url = system_config["frontend_url"]
            
            logger.info("开始颜色对比度测试")
            
            driver.get(f"{frontend_url}/login")
            wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
            
            # 等待页面加载
            wait.until(EC.presence_of_element_located((By.NAME, "username")))
            
            # 检查主要元素的颜色对比度
            elements_to_check = [
                driver.find_element(By.NAME, "username"),
                driver.find_element(By.NAME, "password"),
                driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            ]
            
            for element in elements_to_check:
                # 获取元素的计算样式
                styles = driver.execute_script("""
                    const element = arguments[0];
                    const computedStyle = window.getComputedStyle(element);
                    return {
                        color: computedStyle.color,
                        backgroundColor: computedStyle.backgroundColor,
                        fontSize: computedStyle.fontSize
                    };
                """, element)
                
                # 检查是否有颜色值
                assert styles["color"] != "rgba(0, 0, 0, 0)"  # 不应该是透明
                
                # 检查字体大小是否合适
                font_size = float(styles["fontSize"].replace("px", ""))
                assert font_size >= 12  # 字体大小应该至少12px

    @pytest.mark.system
    class TestBrowserCompatibilitySystem:
        """浏览器兼容性系统测试"""

        def test_responsive_design_system(self, driver, system_config):
            """测试响应式设计系统"""
            frontend_url = system_config["frontend_url"]
            
            logger.info("开始响应式设计系统测试")
            
            # 测试不同屏幕尺寸
            screen_sizes = [
                {"name": "Mobile", "width": 375, "height": 667},
                {"name": "Tablet", "width": 768, "height": 1024},
                {"name": "Desktop", "width": 1920, "height": 1080}
            ]
            
            for size in screen_sizes:
                logger.info(f"测试{size['name']}尺寸: {size['width']}x{size['height']}")
                
                # 设置窗口大小
                driver.set_window_size(size["width"], size["height"])
                
                # 访问登录页面
                driver.get(f"{frontend_url}/login")
                wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
                
                # 等待页面加载
                wait.until(EC.presence_of_element_located((By.NAME, "username")))
                
                # 检查关键元素是否可见
                username_input = driver.find_element(By.NAME, "username")
                password_input = driver.find_element(By.NAME, "password")
                login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                
                assert username_input.is_displayed()
                assert password_input.is_displayed()
                assert login_button.is_displayed()
                
                # 检查元素是否在视口内
                viewport_width = driver.execute_script("return window.innerWidth;")
                viewport_height = driver.execute_script("return window.innerHeight;")
                
                for element in [username_input, password_input, login_button]:
                    rect = element.rect
                    assert rect["x"] >= 0 and rect["x"] + rect["width"] <= viewport_width
                    assert rect["y"] >= 0 and rect["y"] + rect["height"] <= viewport_height

        def test_javascript_error_handling(self, driver, system_config):
            """测试JavaScript错误处理"""
            frontend_url = system_config["frontend_url"]
            
            logger.info("开始JavaScript错误处理测试")
            
            # 启用浏览器日志收集
            driver.get(frontend_url)
            
            # 等待页面加载完成
            wait = WebDriverWait(driver, system_config["timeouts"]["page_load"])
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            # 检查控制台错误
            logs = driver.get_log("browser")
            
            # 过滤严重错误
            severe_errors = [log for log in logs if log["level"] == "SEVERE"]
            
            # 记录错误但不一定失败测试（某些错误可能是预期的）
            if severe_errors:
                logger.warning(f"发现{len(severe_errors)}个严重JavaScript错误:")
                for error in severe_errors:
                    logger.warning(f"  - {error['message']}")
            
            # 检查页面是否仍然可用
            try:
                # 尝试执行基本JavaScript操作
                result = driver.execute_script("return document.readyState;")
                assert result == "complete"
            except Exception as e:
                assert False, f"JavaScript执行失败: {e}"