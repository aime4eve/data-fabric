"""
认证服务单元测试
"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime
from werkzeug.security import generate_password_hash

from application.services.auth_service import AuthService
from domain.entities.user import User
from shared_kernel.exceptions.auth_exceptions import AuthenticationError, AuthorizationError


class TestAuthService:
    """认证服务测试类"""

    @pytest.fixture
    def mock_user_repository(self):
        """模拟用户仓储"""
        return Mock()

    @pytest.fixture
    def auth_service(self, mock_user_repository):
        """认证服务实例"""
        return AuthService(mock_user_repository)

    @pytest.fixture
    def sample_user(self):
        """示例用户"""
        return User(
            id="1",
            username="admin",
            email="admin@test.com",
            password_hash=generate_password_hash("123456"),
            role="admin",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

    @pytest.mark.unit
    class TestAuthenticate:
        """认证测试"""

        def test_authenticate_success_with_username(self, auth_service, mock_user_repository, sample_user):
            """测试使用用户名成功认证"""
            # Arrange
            mock_user_repository.find_by_username.return_value = sample_user
            mock_user_repository.find_by_email.return_value = None

            # Act
            with patch('src.backend.application.services.auth_service.create_access_token') as mock_access_token, \
                 patch('src.backend.application.services.auth_service.create_refresh_token') as mock_refresh_token:
                mock_access_token.return_value = "access_token_123"
                mock_refresh_token.return_value = "refresh_token_123"
                
                result = auth_service.authenticate("admin", "123456")

            # Assert
            assert result['access_token'] == "access_token_123"
            assert result['refresh_token'] == "refresh_token_123"
            assert result['user']['username'] == "admin"
            assert result['user']['email'] == "admin@test.com"
            mock_user_repository.find_by_username.assert_called_once_with("admin")

        def test_authenticate_success_with_email(self, auth_service, mock_user_repository, sample_user):
            """测试使用邮箱成功认证"""
            # Arrange
            mock_user_repository.find_by_username.return_value = None
            mock_user_repository.find_by_email.return_value = sample_user

            # Act
            with patch('src.backend.application.services.auth_service.create_access_token') as mock_access_token, \
                 patch('src.backend.application.services.auth_service.create_refresh_token') as mock_refresh_token:
                mock_access_token.return_value = "access_token_123"
                mock_refresh_token.return_value = "refresh_token_123"
                
                result = auth_service.authenticate("admin@test.com", "123456")

            # Assert
            assert result['access_token'] == "access_token_123"
            assert result['refresh_token'] == "refresh_token_123"
            mock_user_repository.find_by_email.assert_called_once_with("admin@test.com")

        def test_authenticate_user_not_found(self, auth_service, mock_user_repository):
            """测试用户不存在的情况"""
            # Arrange
            mock_user_repository.find_by_username.return_value = None
            mock_user_repository.find_by_email.return_value = None

            # Act & Assert
            with pytest.raises(AuthenticationError) as exc_info:
                auth_service.authenticate("nonexistent", "123456")
            
            assert str(exc_info.value) == "用户名或密码错误"

        def test_authenticate_wrong_password(self, auth_service, mock_user_repository, sample_user):
            """测试密码错误的情况"""
            # Arrange
            mock_user_repository.find_by_username.return_value = sample_user

            # Act & Assert
            with pytest.raises(AuthenticationError) as exc_info:
                auth_service.authenticate("admin", "wrong_password")
            
            assert str(exc_info.value) == "用户名或密码错误"

        def test_authenticate_empty_credentials(self, auth_service, mock_user_repository):
            """测试空凭据的情况"""
            # Act & Assert
            with pytest.raises(AuthenticationError):
                auth_service.authenticate("", "")

            with pytest.raises(AuthenticationError):
                auth_service.authenticate("admin", "")

            with pytest.raises(AuthenticationError):
                auth_service.authenticate("", "password")

        def test_authenticate_sql_injection_attempt(self, auth_service, mock_user_repository):
            """测试SQL注入尝试"""
            # Arrange
            malicious_input = "admin'; DROP TABLE users; --"
            mock_user_repository.find_by_username.return_value = None
            mock_user_repository.find_by_email.return_value = None

            # Act & Assert
            with pytest.raises(AuthenticationError):
                auth_service.authenticate(malicious_input, "password")

        def test_authenticate_special_characters(self, auth_service, mock_user_repository, sample_user):
            """测试特殊字符处理"""
            # Arrange
            special_user = User(
                id="2",
                username="test@user",
                email="test@example.com",
                password_hash=generate_password_hash("pass@123!"),
                role="user",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            mock_user_repository.find_by_username.return_value = special_user

            # Act
            with patch('src.backend.application.services.auth_service.create_access_token') as mock_access_token, \
                 patch('src.backend.application.services.auth_service.create_refresh_token') as mock_refresh_token:
                mock_access_token.return_value = "access_token_123"
                mock_refresh_token.return_value = "refresh_token_123"
                
                result = auth_service.authenticate("test@user", "pass@123!")

            # Assert
            assert result['user']['username'] == "test@user"

    @pytest.mark.unit
    class TestRegister:
        """注册测试"""

        def test_register_success(self, auth_service, mock_user_repository):
            """测试成功注册"""
            # Arrange
            mock_user_repository.exists_by_username.return_value = False
            mock_user_repository.exists_by_email.return_value = False
            mock_user_repository.save.return_value = None

            # Act
            result = auth_service.register("newuser", "newuser@test.com", "123456")

            # Assert
            assert result.username == "newuser"
            assert result.email == "newuser@test.com"
            assert result.role == "user"
            mock_user_repository.save.assert_called_once()

        def test_register_username_exists(self, auth_service, mock_user_repository):
            """测试用户名已存在"""
            # Arrange
            mock_user_repository.exists_by_username.return_value = True

            # Act & Assert
            with pytest.raises(AuthenticationError) as exc_info:
                auth_service.register("existinguser", "new@test.com", "123456")
            
            assert str(exc_info.value) == "用户名已存在"

        def test_register_email_exists(self, auth_service, mock_user_repository):
            """测试邮箱已存在"""
            # Arrange
            mock_user_repository.exists_by_username.return_value = False
            mock_user_repository.exists_by_email.return_value = True

            # Act & Assert
            with pytest.raises(AuthenticationError) as exc_info:
                auth_service.register("newuser", "existing@test.com", "123456")
            
            assert str(exc_info.value) == "邮箱已存在"

        def test_register_invalid_email_format(self, auth_service, mock_user_repository):
            """测试无效邮箱格式"""
            # Arrange
            mock_user_repository.exists_by_username.return_value = False
            mock_user_repository.exists_by_email.return_value = False

            # Act & Assert
            with pytest.raises(AuthenticationError):
                auth_service.register("newuser", "invalid-email", "123456")

        def test_register_weak_password(self, auth_service, mock_user_repository):
            """测试弱密码"""
            # Arrange
            mock_user_repository.exists_by_username.return_value = False
            mock_user_repository.exists_by_email.return_value = False

            # Act & Assert
            with pytest.raises(AuthenticationError):
                auth_service.register("newuser", "user@test.com", "123")  # 密码太短

        def test_register_admin_role(self, auth_service, mock_user_repository):
            """测试注册管理员角色"""
            # Arrange
            mock_user_repository.exists_by_username.return_value = False
            mock_user_repository.exists_by_email.return_value = False
            mock_user_repository.save.return_value = None

            # Act
            result = auth_service.register("admin", "admin@test.com", "123456", "admin")

            # Assert
            assert result.role == "admin"

    @pytest.mark.unit
    class TestRefreshToken:
        """刷新令牌测试"""

        def test_refresh_token_success(self, auth_service, mock_user_repository, sample_user):
            """测试成功刷新令牌"""
            # Arrange
            mock_user_repository.find_by_id.return_value = sample_user

            # Act
            with patch('src.backend.application.services.auth_service.decode_token') as mock_decode, \
                 patch('src.backend.application.services.auth_service.create_access_token') as mock_access_token, \
                 patch('src.backend.application.services.auth_service.create_refresh_token') as mock_refresh_token:
                
                mock_decode.return_value = {'sub': '1'}
                mock_access_token.return_value = "new_access_token"
                mock_refresh_token.return_value = "new_refresh_token"
                
                result = auth_service.refresh_token("valid_refresh_token")

            # Assert
            assert result['access_token'] == "new_access_token"
            assert result['refresh_token'] == "new_refresh_token"

        def test_refresh_token_invalid_token(self, auth_service, mock_user_repository):
            """测试无效刷新令牌"""
            # Act & Assert
            with patch('src.backend.application.services.auth_service.decode_token') as mock_decode:
                mock_decode.side_effect = Exception("Invalid token")
                
                with pytest.raises(AuthenticationError):
                    auth_service.refresh_token("invalid_token")

        def test_refresh_token_user_not_found(self, auth_service, mock_user_repository):
            """测试用户不存在"""
            # Arrange
            mock_user_repository.find_by_id.return_value = None

            # Act & Assert
            with patch('src.backend.application.services.auth_service.decode_token') as mock_decode:
                mock_decode.return_value = {'sub': '999'}
                
                with pytest.raises(AuthenticationError) as exc_info:
                    auth_service.refresh_token("valid_token")
                
                assert str(exc_info.value) == "用户不存在"

    @pytest.mark.unit
    class TestChangePassword:
        """修改密码测试"""

        def test_change_password_success(self, auth_service, mock_user_repository, sample_user):
            """测试成功修改密码"""
            # Arrange
            mock_user_repository.find_by_id.return_value = sample_user
            mock_user_repository.save.return_value = None

            # Act
            result = auth_service.change_password("1", "123456", "new_password")

            # Assert
            assert result is True
            mock_user_repository.save.assert_called_once()

        def test_change_password_user_not_found(self, auth_service, mock_user_repository):
            """测试用户不存在"""
            # Arrange
            mock_user_repository.find_by_id.return_value = None

            # Act & Assert
            with pytest.raises(AuthenticationError) as exc_info:
                auth_service.change_password("999", "old_pass", "new_pass")
            
            assert str(exc_info.value) == "用户不存在"

        def test_change_password_wrong_old_password(self, auth_service, mock_user_repository, sample_user):
            """测试旧密码错误"""
            # Arrange
            mock_user_repository.find_by_id.return_value = sample_user

            # Act & Assert
            with pytest.raises(AuthenticationError) as exc_info:
                auth_service.change_password("1", "wrong_old_password", "new_password")
            
            assert str(exc_info.value) == "旧密码错误"

        def test_change_password_same_as_old(self, auth_service, mock_user_repository, sample_user):
            """测试新密码与旧密码相同"""
            # Arrange
            mock_user_repository.find_by_id.return_value = sample_user

            # Act & Assert
            with pytest.raises(AuthenticationError):
                auth_service.change_password("1", "123456", "123456")

    @pytest.mark.unit
    class TestResetPassword:
        """重置密码测试"""

        def test_reset_password_success(self, auth_service, mock_user_repository, sample_user):
            """测试成功重置密码"""
            # Arrange
            mock_user_repository.find_by_email.return_value = sample_user
            mock_user_repository.save.return_value = None

            # Act
            result = auth_service.reset_password("admin@test.com", "new_password")

            # Assert
            assert result is True
            mock_user_repository.save.assert_called_once()

        def test_reset_password_user_not_found(self, auth_service, mock_user_repository):
            """测试用户不存在"""
            # Arrange
            mock_user_repository.find_by_email.return_value = None

            # Act & Assert
            with pytest.raises(AuthenticationError) as exc_info:
                auth_service.reset_password("nonexistent@test.com", "new_password")
            
            assert str(exc_info.value) == "用户不存在"

    @pytest.mark.unit
    class TestPasswordSecurity:
        """密码安全测试"""

        def test_password_hashing(self, auth_service):
            """测试密码哈希"""
            password = "test_password"
            hashed = auth_service._hash_password(password)
            
            assert hashed != password
            assert len(hashed) > 0
            assert auth_service._verify_password(password, hashed)

        def test_password_verification(self, auth_service):
            """测试密码验证"""
            password = "test_password"
            wrong_password = "wrong_password"
            hashed = auth_service._hash_password(password)
            
            assert auth_service._verify_password(password, hashed)
            assert not auth_service._verify_password(wrong_password, hashed)

        def test_password_salt_uniqueness(self, auth_service):
            """测试密码盐值唯一性"""
            password = "same_password"
            hash1 = auth_service._hash_password(password)
            hash2 = auth_service._hash_password(password)
            
            # 相同密码的哈希值应该不同（因为盐值不同）
            assert hash1 != hash2
            assert auth_service._verify_password(password, hash1)
            assert auth_service._verify_password(password, hash2)

    @pytest.mark.unit
    class TestInputValidation:
        """输入验证测试"""

        def test_validate_empty_inputs(self, auth_service, mock_user_repository):
            """测试空输入验证"""
            with pytest.raises(AuthenticationError):
                auth_service.authenticate("", "password")
            
            with pytest.raises(AuthenticationError):
                auth_service.authenticate("username", "")

        def test_validate_none_inputs(self, auth_service, mock_user_repository):
            """测试None输入验证"""
            with pytest.raises(AuthenticationError):
                auth_service.authenticate(None, "password")
            
            with pytest.raises(AuthenticationError):
                auth_service.authenticate("username", None)

        def test_validate_whitespace_inputs(self, auth_service, mock_user_repository):
            """测试空白字符输入验证"""
            with pytest.raises(AuthenticationError):
                auth_service.authenticate("   ", "password")
            
            with pytest.raises(AuthenticationError):
                auth_service.authenticate("username", "   ")

    @pytest.mark.security
    class TestSecurityFeatures:
        """安全特性测试"""

        def test_timing_attack_resistance(self, auth_service, mock_user_repository):
            """测试时序攻击防护"""
            import time
            
            # 测试用户不存在的情况
            mock_user_repository.find_by_username.return_value = None
            mock_user_repository.find_by_email.return_value = None
            
            start_time = time.time()
            with pytest.raises(AuthenticationError):
                auth_service.authenticate("nonexistent", "password")
            time1 = time.time() - start_time
            
            # 测试密码错误的情况
            sample_user = User(
                id="1",
                username="admin",
                email="admin@test.com",
                password_hash=generate_password_hash("correct_password"),
                role="admin",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            mock_user_repository.find_by_username.return_value = sample_user
            
            start_time = time.time()
            with pytest.raises(AuthenticationError):
                auth_service.authenticate("admin", "wrong_password")
            time2 = time.time() - start_time
            
            # 时间差应该不会太大（防止时序攻击）
            assert abs(time1 - time2) < 0.1

        def test_password_complexity_validation(self, auth_service, mock_user_repository):
            """测试密码复杂度验证"""
            mock_user_repository.exists_by_username.return_value = False
            mock_user_repository.exists_by_email.return_value = False
            
            # 测试各种弱密码
            weak_passwords = [
                "123",          # 太短
                "password",     # 常见密码
                "12345678",     # 纯数字
                "abcdefgh",     # 纯字母
            ]
            
            for weak_password in weak_passwords:
                with pytest.raises(AuthenticationError):
                    auth_service.register("user", "user@test.com", weak_password)

        def test_xss_prevention_in_error_messages(self, auth_service, mock_user_repository):
            """测试错误消息中的XSS防护"""
            xss_payload = "<script>alert('xss')</script>"
            mock_user_repository.find_by_username.return_value = None
            mock_user_repository.find_by_email.return_value = None
            
            with pytest.raises(AuthenticationError) as exc_info:
                auth_service.authenticate(xss_payload, "password")
            
            # 错误消息不应包含脚本标签
            error_message = str(exc_info.value)
            assert "<script>" not in error_message
            assert "alert" not in error_message