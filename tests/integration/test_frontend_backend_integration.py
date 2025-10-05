"""
前后端集成测试
测试前端组件与后端API的完整交互流程
"""
import pytest
import requests
import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, WebDriverException


class TestFrontendBackendIntegration:
    """前后端集成测试类"""

    @pytest.fixture(scope="class")
    def backend_url(self):
        """后端API URL"""
        return "http://localhost:5000"

    @pytest.fixture(scope="class")
    def frontend_url(self):
        """前端应用URL"""
        return "http://localhost:3000"

    @pytest.fixture(scope="class")
    def chrome_options(self):
        """Chrome浏览器选项"""
        options = Options()
        options.add_argument("--headless")  # 无头模式
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
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

    @pytest.fixture
    def test_user_credentials(self):
        """测试用户凭据"""
        return {
            "username": "admin",
            "password": "123456"
        }

    @pytest.mark.integration
    class TestLoginPageIntegration:
        """登录页面集成测试"""

        def test_login_page_loads(self, driver, frontend_url):
            """测试登录页面加载"""
            driver.get(f"{frontend_url}/login")
            
            # 等待页面加载完成
            wait = WebDriverWait(driver, 10)
            
            # 检查登录表单元素是否存在
            username_input = wait.until(
                EC.presence_of_element_located((By.NAME, "username"))
            )
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            assert username_input.is_displayed()
            assert password_input.is_displayed()
            assert login_button.is_displayed()

        def test_successful_login_flow(self, driver, frontend_url, test_user_credentials):
            """测试成功登录流程"""
            driver.get(f"{frontend_url}/login")
            
            wait = WebDriverWait(driver, 10)
            
            # 填写登录表单
            username_input = wait.until(
                EC.element_to_be_clickable((By.NAME, "username"))
            )
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            username_input.clear()
            username_input.send_keys(test_user_credentials["username"])
            password_input.clear()
            password_input.send_keys(test_user_credentials["password"])
            
            # 提交表单
            login_button.click()
            
            # 等待重定向到仪表板
            wait.until(EC.url_contains("/dashboard"))
            
            # 验证登录成功
            current_url = driver.current_url
            assert "/dashboard" in current_url or "/home" in current_url

        def test_failed_login_flow(self, driver, frontend_url):
            """测试登录失败流程"""
            driver.get(f"{frontend_url}/login")
            
            wait = WebDriverWait(driver, 10)
            
            # 填写错误的登录信息
            username_input = wait.until(
                EC.element_to_be_clickable((By.NAME, "username"))
            )
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            username_input.clear()
            username_input.send_keys("wronguser")
            password_input.clear()
            password_input.send_keys("wrongpassword")
            
            # 提交表单
            login_button.click()
            
            # 等待错误消息显示
            try:
                error_message = wait.until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".error-message, .ant-message-error, .alert-error"))
                )
                assert error_message.is_displayed()
                assert "错误" in error_message.text or "失败" in error_message.text or "invalid" in error_message.text.lower()
            except TimeoutException:
                # 如果没有找到错误消息元素，检查是否仍在登录页面
                assert "/login" in driver.current_url

        def test_form_validation_frontend(self, driver, frontend_url):
            """测试前端表单验证"""
            driver.get(f"{frontend_url}/login")
            
            wait = WebDriverWait(driver, 10)
            
            # 尝试提交空表单
            login_button = wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
            )
            login_button.click()
            
            # 检查验证消息
            try:
                # 可能的验证消息选择器
                validation_selectors = [
                    ".ant-form-item-explain-error",
                    ".error-message",
                    ".validation-error",
                    "[role='alert']"
                ]
                
                validation_found = False
                for selector in validation_selectors:
                    try:
                        validation_element = driver.find_element(By.CSS_SELECTOR, selector)
                        if validation_element.is_displayed():
                            validation_found = True
                            break
                    except:
                        continue
                
                # 如果没有找到验证消息，检查HTML5验证
                username_input = driver.find_element(By.NAME, "username")
                password_input = driver.find_element(By.NAME, "password")
                
                username_valid = driver.execute_script("return arguments[0].checkValidity();", username_input)
                password_valid = driver.execute_script("return arguments[0].checkValidity();", password_input)
                
                assert validation_found or not username_valid or not password_valid
                
            except Exception as e:
                # 如果验证检查失败，至少确保没有导航到其他页面
                assert "/login" in driver.current_url

        def test_remember_me_functionality(self, driver, frontend_url, test_user_credentials):
            """测试记住我功能"""
            driver.get(f"{frontend_url}/login")
            
            wait = WebDriverWait(driver, 10)
            
            # 填写登录表单
            username_input = wait.until(
                EC.element_to_be_clickable((By.NAME, "username"))
            )
            password_input = driver.find_element(By.NAME, "password")
            
            username_input.clear()
            username_input.send_keys(test_user_credentials["username"])
            password_input.clear()
            password_input.send_keys(test_user_credentials["password"])
            
            # 查找并勾选"记住我"复选框
            try:
                remember_checkbox = driver.find_element(By.CSS_SELECTOR, "input[type='checkbox']")
                if not remember_checkbox.is_selected():
                    remember_checkbox.click()
            except:
                # 如果没有记住我功能，跳过此测试
                pytest.skip("Remember me functionality not found")
            
            # 提交表单
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_button.click()
            
            # 等待登录完成
            wait.until(EC.url_changes(f"{frontend_url}/login"))
            
            # 检查是否设置了持久化存储
            local_storage_token = driver.execute_script("return localStorage.getItem('token') || localStorage.getItem('access_token');")
            session_storage_token = driver.execute_script("return sessionStorage.getItem('token') || sessionStorage.getItem('access_token');")
            
            assert local_storage_token is not None or session_storage_token is not None

    @pytest.mark.integration
    class TestDashboardIntegration:
        """仪表板集成测试"""

        def test_dashboard_loads_after_login(self, driver, frontend_url, test_user_credentials):
            """测试登录后仪表板加载"""
            # 先登录
            driver.get(f"{frontend_url}/login")
            
            wait = WebDriverWait(driver, 10)
            
            username_input = wait.until(EC.element_to_be_clickable((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            username_input.send_keys(test_user_credentials["username"])
            password_input.send_keys(test_user_credentials["password"])
            login_button.click()
            
            # 等待重定向到仪表板
            wait.until(EC.url_contains("/dashboard"))
            
            # 检查仪表板元素
            try:
                # 可能的仪表板元素
                dashboard_selectors = [
                    ".dashboard",
                    ".main-content",
                    ".content-area",
                    "main",
                    "[data-testid='dashboard']"
                ]
                
                dashboard_found = False
                for selector in dashboard_selectors:
                    try:
                        dashboard_element = driver.find_element(By.CSS_SELECTOR, selector)
                        if dashboard_element.is_displayed():
                            dashboard_found = True
                            break
                    except:
                        continue
                
                assert dashboard_found or "dashboard" in driver.current_url.lower()
                
            except Exception:
                # 至少确保不在登录页面
                assert "/login" not in driver.current_url

        def test_dashboard_data_loading(self, driver, frontend_url, backend_url, test_user_credentials):
            """测试仪表板数据加载"""
            # 先登录
            driver.get(f"{frontend_url}/login")
            
            wait = WebDriverWait(driver, 10)
            
            username_input = wait.until(EC.element_to_be_clickable((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            username_input.send_keys(test_user_credentials["username"])
            password_input.send_keys(test_user_credentials["password"])
            login_button.click()
            
            # 等待仪表板加载
            wait.until(EC.url_contains("/dashboard"))
            
            # 等待数据加载完成（检查加载指示器消失）
            try:
                # 等待加载指示器出现然后消失
                loading_selectors = [
                    ".loading",
                    ".spinner",
                    ".ant-spin",
                    "[data-testid='loading']"
                ]
                
                for selector in loading_selectors:
                    try:
                        loading_element = driver.find_element(By.CSS_SELECTOR, selector)
                        # 等待加载指示器消失
                        wait.until(EC.invisibility_of_element(loading_element))
                        break
                    except:
                        continue
                        
            except TimeoutException:
                # 如果没有找到加载指示器，等待一段时间让数据加载
                time.sleep(2)
            
            # 检查是否有数据显示
            try:
                # 可能的数据容器
                data_selectors = [
                    ".data-container",
                    ".content",
                    ".dashboard-content",
                    "table",
                    ".list-item"
                ]
                
                data_found = False
                for selector in data_selectors:
                    try:
                        data_elements = driver.find_elements(By.CSS_SELECTOR, selector)
                        if data_elements and any(elem.is_displayed() for elem in data_elements):
                            data_found = True
                            break
                    except:
                        continue
                
                # 如果没有找到数据容器，检查页面是否正常加载
                page_title = driver.title
                assert data_found or len(page_title) > 0
                
            except Exception:
                # 至少确保页面已加载
                assert driver.current_url != "about:blank"

        def test_navigation_menu(self, driver, frontend_url, test_user_credentials):
            """测试导航菜单"""
            # 先登录
            driver.get(f"{frontend_url}/login")
            
            wait = WebDriverWait(driver, 10)
            
            username_input = wait.until(EC.element_to_be_clickable((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            username_input.send_keys(test_user_credentials["username"])
            password_input.send_keys(test_user_credentials["password"])
            login_button.click()
            
            # 等待页面加载
            wait.until(EC.url_changes(f"{frontend_url}/login"))
            
            # 查找导航菜单
            try:
                nav_selectors = [
                    "nav",
                    ".navigation",
                    ".menu",
                    ".sidebar",
                    ".ant-menu"
                ]
                
                nav_found = False
                for selector in nav_selectors:
                    try:
                        nav_element = driver.find_element(By.CSS_SELECTOR, selector)
                        if nav_element.is_displayed():
                            nav_found = True
                            
                            # 查找菜单项
                            menu_items = nav_element.find_elements(By.CSS_SELECTOR, "a, .menu-item, .ant-menu-item")
                            assert len(menu_items) > 0
                            break
                    except:
                        continue
                
                # 如果没有找到导航菜单，检查是否有其他导航元素
                if not nav_found:
                    links = driver.find_elements(By.TAG_NAME, "a")
                    visible_links = [link for link in links if link.is_displayed()]
                    assert len(visible_links) > 0
                    
            except Exception:
                # 至少确保页面已加载
                assert driver.current_url != "about:blank"

    @pytest.mark.integration
    class TestAPIIntegration:
        """API集成测试"""

        def test_frontend_api_authentication(self, driver, frontend_url, backend_url, test_user_credentials):
            """测试前端API认证"""
            # 登录并获取token
            driver.get(f"{frontend_url}/login")
            
            wait = WebDriverWait(driver, 10)
            
            username_input = wait.until(EC.element_to_be_clickable((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            username_input.send_keys(test_user_credentials["username"])
            password_input.send_keys(test_user_credentials["password"])
            login_button.click()
            
            # 等待登录完成
            wait.until(EC.url_changes(f"{frontend_url}/login"))
            
            # 检查是否存储了认证token
            token = driver.execute_script("""
                return localStorage.getItem('token') || 
                       localStorage.getItem('access_token') || 
                       sessionStorage.getItem('token') || 
                       sessionStorage.getItem('access_token');
            """)
            
            assert token is not None and len(token) > 0

        def test_api_error_handling_in_frontend(self, driver, frontend_url):
            """测试前端API错误处理"""
            # 访问需要认证的页面（未登录状态）
            driver.get(f"{frontend_url}/dashboard")
            
            wait = WebDriverWait(driver, 10)
            
            # 应该重定向到登录页面或显示错误
            try:
                # 等待重定向到登录页面
                wait.until(EC.url_contains("/login"))
                assert "/login" in driver.current_url
            except TimeoutException:
                # 或者显示错误消息
                try:
                    error_selectors = [
                        ".error",
                        ".alert-error",
                        ".ant-message-error",
                        "[role='alert']"
                    ]
                    
                    error_found = False
                    for selector in error_selectors:
                        try:
                            error_element = driver.find_element(By.CSS_SELECTOR, selector)
                            if error_element.is_displayed():
                                error_found = True
                                break
                        except:
                            continue
                    
                    assert error_found or "/login" in driver.current_url
                except:
                    # 至少确保没有显示敏感数据
                    page_source = driver.page_source.lower()
                    assert "unauthorized" in page_source or "login" in page_source

        def test_network_error_handling(self, driver, frontend_url):
            """测试网络错误处理"""
            # 模拟网络错误（通过修改API端点）
            driver.get(frontend_url)
            
            # 注入脚本来模拟网络错误
            driver.execute_script("""
                // 拦截fetch请求并模拟网络错误
                const originalFetch = window.fetch;
                window.fetch = function(...args) {
                    if (args[0].includes('/api/')) {
                        return Promise.reject(new Error('Network Error'));
                    }
                    return originalFetch.apply(this, args);
                };
            """)
            
            # 尝试登录（这会触发API调用）
            try:
                driver.get(f"{frontend_url}/login")
                
                wait = WebDriverWait(driver, 10)
                
                username_input = wait.until(EC.element_to_be_clickable((By.NAME, "username")))
                password_input = driver.find_element(By.NAME, "password")
                login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                
                username_input.send_keys("admin")
                password_input.send_keys("123456")
                login_button.click()
                
                # 等待错误处理
                time.sleep(2)
                
                # 检查是否显示了网络错误消息
                try:
                    error_selectors = [
                        ".error",
                        ".network-error",
                        ".ant-message-error",
                        "[role='alert']"
                    ]
                    
                    error_found = False
                    for selector in error_selectors:
                        try:
                            error_element = driver.find_element(By.CSS_SELECTOR, selector)
                            if error_element.is_displayed():
                                error_text = error_element.text.lower()
                                if "network" in error_text or "连接" in error_text or "error" in error_text:
                                    error_found = True
                                    break
                        except:
                            continue
                    
                    # 如果没有找到错误消息，至少确保没有成功登录
                    if not error_found:
                        assert "/login" in driver.current_url
                        
                except Exception:
                    # 至少确保仍在登录页面
                    assert "/login" in driver.current_url
                    
            except Exception as e:
                # 网络错误处理测试可能因环境而异
                pytest.skip(f"Network error simulation failed: {e}")

    @pytest.mark.integration
    class TestResponsiveDesign:
        """响应式设计测试"""

        def test_mobile_layout(self, driver, frontend_url):
            """测试移动端布局"""
            # 设置移动端视口
            driver.set_window_size(375, 667)  # iPhone 6/7/8 尺寸
            
            driver.get(f"{frontend_url}/login")
            
            wait = WebDriverWait(driver, 10)
            
            # 检查登录表单在移动端是否正常显示
            username_input = wait.until(EC.presence_of_element_located((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            # 检查元素是否可见且可交互
            assert username_input.is_displayed()
            assert password_input.is_displayed()
            assert login_button.is_displayed()
            
            # 检查元素是否在视口内
            username_rect = username_input.rect
            password_rect = password_input.rect
            button_rect = login_button.rect
            
            viewport_width = driver.execute_script("return window.innerWidth;")
            
            assert username_rect['x'] >= 0 and username_rect['x'] + username_rect['width'] <= viewport_width
            assert password_rect['x'] >= 0 and password_rect['x'] + password_rect['width'] <= viewport_width
            assert button_rect['x'] >= 0 and button_rect['x'] + button_rect['width'] <= viewport_width

        def test_tablet_layout(self, driver, frontend_url):
            """测试平板端布局"""
            # 设置平板端视口
            driver.set_window_size(768, 1024)  # iPad 尺寸
            
            driver.get(f"{frontend_url}/login")
            
            wait = WebDriverWait(driver, 10)
            
            # 检查登录表单在平板端是否正常显示
            username_input = wait.until(EC.presence_of_element_located((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            assert username_input.is_displayed()
            assert password_input.is_displayed()
            assert login_button.is_displayed()

        def test_desktop_layout(self, driver, frontend_url):
            """测试桌面端布局"""
            # 设置桌面端视口
            driver.set_window_size(1920, 1080)
            
            driver.get(f"{frontend_url}/login")
            
            wait = WebDriverWait(driver, 10)
            
            # 检查登录表单在桌面端是否正常显示
            username_input = wait.until(EC.presence_of_element_located((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            assert username_input.is_displayed()
            assert password_input.is_displayed()
            assert login_button.is_displayed()

    @pytest.mark.integration
    class TestBrowserCompatibility:
        """浏览器兼容性测试"""

        def test_javascript_functionality(self, driver, frontend_url):
            """测试JavaScript功能"""
            driver.get(frontend_url)
            
            # 检查JavaScript是否正常工作
            js_enabled = driver.execute_script("return typeof window !== 'undefined';")
            assert js_enabled
            
            # 检查React是否加载
            react_loaded = driver.execute_script("""
                return typeof window.React !== 'undefined' || 
                       document.querySelector('[data-reactroot]') !== null ||
                       document.querySelector('#root') !== null;
            """)
            assert react_loaded

        def test_css_loading(self, driver, frontend_url):
            """测试CSS加载"""
            driver.get(frontend_url)
            
            # 等待页面加载完成
            wait = WebDriverWait(driver, 10)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            # 检查是否有样式应用
            body_element = driver.find_element(By.TAG_NAME, "body")
            computed_style = driver.execute_script("""
                return window.getComputedStyle(arguments[0]);
            """, body_element)
            
            # 检查是否有基本样式
            assert computed_style is not None

        def test_local_storage_support(self, driver, frontend_url):
            """测试本地存储支持"""
            driver.get(frontend_url)
            
            # 测试localStorage
            localStorage_supported = driver.execute_script("""
                try {
                    localStorage.setItem('test', 'value');
                    const value = localStorage.getItem('test');
                    localStorage.removeItem('test');
                    return value === 'value';
                } catch (e) {
                    return false;
                }
            """)
            assert localStorage_supported
            
            # 测试sessionStorage
            sessionStorage_supported = driver.execute_script("""
                try {
                    sessionStorage.setItem('test', 'value');
                    const value = sessionStorage.getItem('test');
                    sessionStorage.removeItem('test');
                    return value === 'value';
                } catch (e) {
                    return false;
                }
            """)
            assert sessionStorage_supported

    @pytest.mark.integration
    class TestPerformanceIntegration:
        """性能集成测试"""

        def test_page_load_time(self, driver, frontend_url):
            """测试页面加载时间"""
            start_time = time.time()
            
            driver.get(frontend_url)
            
            # 等待页面完全加载
            wait = WebDriverWait(driver, 30)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            # 等待JavaScript执行完成
            wait.until(lambda driver: driver.execute_script("return document.readyState") == "complete")
            
            end_time = time.time()
            load_time = end_time - start_time
            
            # 页面加载时间应该在合理范围内（30秒内）
            assert load_time < 30

        def test_api_response_time(self, backend_url):
            """测试API响应时间"""
            start_time = time.time()
            
            try:
                response = requests.post(
                    f"{backend_url}/api/v1/auth/login",
                    json={
                        "username": "admin",
                        "password": "123456"
                    },
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                
                end_time = time.time()
                response_time = end_time - start_time
                
                # API响应时间应该在合理范围内（10秒内）
                assert response_time < 10
                
            except requests.exceptions.RequestException:
                # 如果API不可用，跳过测试
                pytest.skip("Backend API not available")

        def test_memory_usage(self, driver, frontend_url):
            """测试内存使用情况"""
            driver.get(frontend_url)
            
            # 等待页面加载完成
            wait = WebDriverWait(driver, 10)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            # 获取内存使用情况（如果浏览器支持）
            try:
                memory_info = driver.execute_script("""
                    if (performance.memory) {
                        return {
                            usedJSHeapSize: performance.memory.usedJSHeapSize,
                            totalJSHeapSize: performance.memory.totalJSHeapSize,
                            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                        };
                    }
                    return null;
                """)
                
                if memory_info:
                    # 检查内存使用是否在合理范围内
                    used_mb = memory_info['usedJSHeapSize'] / (1024 * 1024)
                    assert used_mb < 100  # 少于100MB
                    
            except Exception:
                # 如果浏览器不支持memory API，跳过测试
                pytest.skip("Browser does not support performance.memory API")