import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

# Assuming Flask app structure
from api.app import create_app
from api.models.user import User
from api.utils.auth import generate_token, verify_token, hash_password, verify_password


@pytest.fixture
def app():
    """Create and configure a test Flask app."""
    app = create_app(testing=True)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'test-secret-key'
    app.config['DATABASE_URL'] = 'sqlite:///:memory:'
    return app


@pytest.fixture
def client(app):
    """Create a test client for the Flask app."""
    return app.test_client()


@pytest.fixture
def auth_headers():
    """Generate authentication headers for testing."""
    token = generate_token({'user_id': 1, 'username': 'testuser'})
    return {'Authorization': f'Bearer {token}'}


class TestAuthEndpoints:
    """Test authentication endpoints."""

    def test_register_success(self, client):
        """Test successful user registration."""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'password123'
        }
        
        response = client.post('/api/auth/register', 
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'user' in response_data
        assert 'token' in response_data
        assert response_data['user']['username'] == 'newuser'
        assert response_data['user']['email'] == 'newuser@example.com'

    def test_register_duplicate_username(self, client):
        """Test registration with duplicate username."""
        # First registration
        data = {
            'username': 'testuser',
            'email': 'test1@example.com',
            'password': 'password123'
        }
        client.post('/api/auth/register', 
                   data=json.dumps(data),
                   content_type='application/json')
        
        # Second registration with same username
        data['email'] = 'test2@example.com'
        response = client.post('/api/auth/register', 
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '用户名已存在' in response_data['message']

    def test_register_duplicate_email(self, client):
        """Test registration with duplicate email."""
        # First registration
        data = {
            'username': 'testuser1',
            'email': 'test@example.com',
            'password': 'password123'
        }
        client.post('/api/auth/register', 
                   data=json.dumps(data),
                   content_type='application/json')
        
        # Second registration with same email
        data['username'] = 'testuser2'
        response = client.post('/api/auth/register', 
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '邮箱已存在' in response_data['message']

    def test_register_invalid_data(self, client):
        """Test registration with invalid data."""
        test_cases = [
            # Missing username
            {'email': 'test@example.com', 'password': 'password123'},
            # Missing email
            {'username': 'testuser', 'password': 'password123'},
            # Missing password
            {'username': 'testuser', 'email': 'test@example.com'},
            # Invalid email format
            {'username': 'testuser', 'email': 'invalid-email', 'password': 'password123'},
            # Short password
            {'username': 'testuser', 'email': 'test@example.com', 'password': '123'},
        ]
        
        for data in test_cases:
            response = client.post('/api/auth/register', 
                                 data=json.dumps(data),
                                 content_type='application/json')
            
            assert response.status_code == 400
            response_data = json.loads(response.data)
            assert response_data['success'] is False

    def test_login_success(self, client):
        """Test successful login."""
        # Register user first
        register_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'password123'
        }
        client.post('/api/auth/register', 
                   data=json.dumps(register_data),
                   content_type='application/json')
        
        # Login
        login_data = {
            'username': 'testuser',
            'password': 'password123'
        }
        response = client.post('/api/auth/login', 
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'user' in response_data
        assert 'token' in response_data
        assert response_data['user']['username'] == 'testuser'

    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        # Register user first
        register_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'password123'
        }
        client.post('/api/auth/register', 
                   data=json.dumps(register_data),
                   content_type='application/json')
        
        # Login with wrong password
        login_data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = client.post('/api/auth/login', 
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '用户名或密码错误' in response_data['message']

    def test_login_nonexistent_user(self, client):
        """Test login with nonexistent user."""
        login_data = {
            'username': 'nonexistent',
            'password': 'password123'
        }
        response = client.post('/api/auth/login', 
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '用户名或密码错误' in response_data['message']

    def test_logout_success(self, client, auth_headers):
        """Test successful logout."""
        response = client.post('/api/auth/logout', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['message'] == '登出成功'

    def test_logout_without_token(self, client):
        """Test logout without authentication token."""
        response = client.post('/api/auth/logout')
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '未授权' in response_data['message']

    def test_get_current_user(self, client, auth_headers):
        """Test getting current user information."""
        response = client.get('/api/auth/me', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'user' in response_data
        assert response_data['user']['username'] == 'testuser'

    def test_update_profile_success(self, client, auth_headers):
        """Test successful profile update."""
        update_data = {
            'email': 'updated@example.com',
            'full_name': '张三'
        }
        
        response = client.put('/api/auth/profile', 
                            data=json.dumps(update_data),
                            content_type='application/json',
                            headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['user']['email'] == 'updated@example.com'
        assert response_data['user']['full_name'] == '张三'

    def test_change_password_success(self, client, auth_headers):
        """Test successful password change."""
        password_data = {
            'current_password': 'password123',
            'new_password': 'newpassword123'
        }
        
        response = client.put('/api/auth/password', 
                            data=json.dumps(password_data),
                            content_type='application/json',
                            headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['message'] == '密码修改成功'

    def test_change_password_wrong_current(self, client, auth_headers):
        """Test password change with wrong current password."""
        password_data = {
            'current_password': 'wrongpassword',
            'new_password': 'newpassword123'
        }
        
        response = client.put('/api/auth/password', 
                            data=json.dumps(password_data),
                            content_type='application/json',
                            headers=auth_headers)
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '当前密码错误' in response_data['message']

    def test_refresh_token_success(self, client, auth_headers):
        """Test successful token refresh."""
        response = client.post('/api/auth/refresh', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'token' in response_data

    def test_refresh_token_invalid(self, client):
        """Test token refresh with invalid token."""
        headers = {'Authorization': 'Bearer invalid-token'}
        response = client.post('/api/auth/refresh', headers=headers)
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert response_data['success'] is False


class TestAuthUtils:
    """Test authentication utility functions."""

    def test_hash_password(self):
        """Test password hashing."""
        password = 'testpassword123'
        hashed = hash_password(password)
        
        assert hashed != password
        assert len(hashed) > 50  # Bcrypt hashes are typically long
        assert hashed.startswith('$2b$')  # Bcrypt prefix

    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        password = 'testpassword123'
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password."""
        password = 'testpassword123'
        wrong_password = 'wrongpassword'
        hashed = hash_password(password)
        
        assert verify_password(wrong_password, hashed) is False

    def test_generate_token(self):
        """Test JWT token generation."""
        payload = {'user_id': 1, 'username': 'testuser'}
        token = generate_token(payload)
        
        assert isinstance(token, str)
        assert len(token) > 50  # JWT tokens are typically long
        assert token.count('.') == 2  # JWT has 3 parts separated by dots

    def test_verify_token_valid(self):
        """Test JWT token verification with valid token."""
        payload = {'user_id': 1, 'username': 'testuser'}
        token = generate_token(payload)
        
        decoded = verify_token(token)
        assert decoded is not None
        assert decoded['user_id'] == 1
        assert decoded['username'] == 'testuser'

    def test_verify_token_invalid(self):
        """Test JWT token verification with invalid token."""
        invalid_token = 'invalid.jwt.token'
        
        decoded = verify_token(invalid_token)
        assert decoded is None

    def test_verify_token_expired(self):
        """Test JWT token verification with expired token."""
        # Mock expired token
        with patch('api.utils.auth.jwt.decode') as mock_decode:
            from jwt.exceptions import ExpiredSignatureError
            mock_decode.side_effect = ExpiredSignatureError()
            
            token = 'expired.jwt.token'
            decoded = verify_token(token)
            assert decoded is None

    def test_generate_token_with_expiration(self):
        """Test JWT token generation with custom expiration."""
        payload = {'user_id': 1, 'username': 'testuser'}
        expires_in = timedelta(hours=1)
        token = generate_token(payload, expires_in)
        
        decoded = verify_token(token)
        assert decoded is not None
        assert 'exp' in decoded
        
        # Check expiration time is approximately 1 hour from now
        exp_time = datetime.fromtimestamp(decoded['exp'])
        expected_time = datetime.utcnow() + expires_in
        time_diff = abs((exp_time - expected_time).total_seconds())
        assert time_diff < 60  # Allow 1 minute tolerance


class TestAuthMiddleware:
    """Test authentication middleware."""

    def test_protected_route_with_valid_token(self, client, auth_headers):
        """Test accessing protected route with valid token."""
        response = client.get('/api/documents', headers=auth_headers)
        
        # Should not return 401 (assuming documents endpoint exists and is protected)
        assert response.status_code != 401

    def test_protected_route_without_token(self, client):
        """Test accessing protected route without token."""
        response = client.get('/api/documents')
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '未授权' in response_data['message']

    def test_protected_route_with_invalid_token(self, client):
        """Test accessing protected route with invalid token."""
        headers = {'Authorization': 'Bearer invalid-token'}
        response = client.get('/api/documents', headers=headers)
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert response_data['success'] is False

    def test_protected_route_with_malformed_header(self, client):
        """Test accessing protected route with malformed auth header."""
        test_cases = [
            {'Authorization': 'invalid-format'},
            {'Authorization': 'Bearer'},  # Missing token
            {'Authorization': 'Basic token'},  # Wrong auth type
        ]
        
        for headers in test_cases:
            response = client.get('/api/documents', headers=headers)
            assert response.status_code == 401

    @patch('api.utils.auth.verify_token')
    def test_token_verification_failure(self, mock_verify, client):
        """Test token verification failure in middleware."""
        mock_verify.return_value = None
        
        headers = {'Authorization': 'Bearer some-token'}
        response = client.get('/api/documents', headers=headers)
        
        assert response.status_code == 401
        mock_verify.assert_called_once_with('some-token')


class TestUserModel:
    """Test User model methods."""

    def test_user_creation(self):
        """Test user model creation."""
        user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'password123'
        }
        
        user = User(**user_data)
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.password == 'password123'

    def test_user_to_dict(self):
        """Test user model to_dict method."""
        user = User(
            id=1,
            username='testuser',
            email='test@example.com',
            full_name='Test User',
            role='user',
            created_at=datetime.utcnow()
        )
        
        user_dict = user.to_dict()
        assert user_dict['id'] == 1
        assert user_dict['username'] == 'testuser'
        assert user_dict['email'] == 'test@example.com'
        assert user_dict['full_name'] == 'Test User'
        assert user_dict['role'] == 'user'
        assert 'password' not in user_dict  # Password should not be included
        assert 'created_at' in user_dict

    def test_user_check_password(self):
        """Test user password checking method."""
        password = 'testpassword123'
        hashed_password = generate_password_hash(password)
        
        user = User(
            username='testuser',
            email='test@example.com',
            password=hashed_password
        )
        
        assert user.check_password(password) is True
        assert user.check_password('wrongpassword') is False

    def test_user_set_password(self):
        """Test user password setting method."""
        user = User(
            username='testuser',
            email='test@example.com'
        )
        
        password = 'newpassword123'
        user.set_password(password)
        
        assert user.password != password  # Should be hashed
        assert user.check_password(password) is True

    def test_user_is_admin(self):
        """Test user admin role checking."""
        admin_user = User(username='admin', email='admin@example.com', role='admin')
        regular_user = User(username='user', email='user@example.com', role='user')
        
        assert admin_user.is_admin() is True
        assert regular_user.is_admin() is False

    def test_user_has_role(self):
        """Test user role checking method."""
        user = User(username='moderator', email='mod@example.com', role='moderator')
        
        assert user.has_role('moderator') is True
        assert user.has_role('admin') is False
        assert user.has_role('user') is False

    def test_user_update_last_login(self):
        """Test updating user last login time."""
        user = User(username='testuser', email='test@example.com')
        
        assert user.last_login is None
        
        user.update_last_login()
        assert user.last_login is not None
        assert isinstance(user.last_login, datetime)
        
        # Check that the time is recent (within last minute)
        time_diff = datetime.utcnow() - user.last_login
        assert time_diff.total_seconds() < 60


class TestAuthValidation:
    """Test authentication validation functions."""

    def test_validate_email_format(self):
        """Test email format validation."""
        from shared_kernel.utils.validators import validate_email_ex
        
        valid_emails = [
            'test@example.com',
            'user.name@domain.co.uk',
            'user+tag@example.org'
        ]
        
        invalid_emails = [
            'invalid-email',
            'test@',
            '@example.com',
            'test..test@example.com',
            ''
        ]
        
        for email in valid_emails:
            res = validate_email_ex(email, allow_empty=False, check_deliverability=False)
            assert res['ok'] is True
            assert res['code'] is None
            assert res['reason'] is None
        
        for email in invalid_emails:
            res = validate_email_ex(email, allow_empty=False, check_deliverability=False)
            assert res['ok'] is False
            assert res['reason'] == 'format_error'

    def test_validate_email_reserved_tld(self):
        """Test email with reserved/invalid domain format mapping (format_error)."""
        from shared_kernel.utils.validators import validate_email_ex
        # domain without valid TLD (simulates reserved or invalid TLD)
        res = validate_email_ex('user@example.invalid', allow_empty=False, check_deliverability=False)
        # email-validator may treat as invalid domain (format error)
        assert res['ok'] is False
        assert res['reason'] == 'format_error'
        assert res['code'] in {'invalid_domain', 'invalid_email_format'}

    def test_validate_email_nxdomain(self):
        """Test deliverability NXDOMAIN mapping when check_deliverability enabled."""
        from shared_kernel.utils.validators import validate_email_ex
        # Use a domain that should not exist to trigger NXDOMAIN
        email = 'user@nonexistent-domain-example-test-xyz-12345.com'
        res = validate_email_ex(email, allow_empty=False, check_deliverability=True)
        assert res['ok'] is False
        assert res['reason'] == 'deliverability_error'
        assert res['code'] in {'domain_not_found', 'mx_or_a_not_found', 'dns_unreachable'}

    def test_validate_password_strength(self):
        """Test password strength validation."""
        from api.utils.validation import validate_password
        
        strong_passwords = [
            'Password123!',
            'MyStr0ngP@ss',
            'C0mpl3x!P@ssw0rd'
        ]
        
        weak_passwords = [
            '123456',
            'password',
            'PASSWORD',
            'Pass123',  # No special character
            'Aa1!',     # Too short
            ''
        ]
        
        for password in strong_passwords:
            assert validate_password(password) is True
        
        for password in weak_passwords:
            assert validate_password(password) is False

    def test_validate_username_format(self):
        """Test username format validation."""
        from api.utils.validation import validate_username
        
        valid_usernames = [
            'testuser',
            'user123',
            'test_user',
            'user-name'
        ]
        
        invalid_usernames = [
            '',
            'ab',  # Too short
            'a' * 51,  # Too long
            'user@name',  # Invalid character
            'user name',  # Space not allowed
            '123user'  # Cannot start with number
        ]
        
        for username in valid_usernames:
            assert validate_username(username) is True
        
        for username in invalid_usernames:
            assert validate_username(username) is False