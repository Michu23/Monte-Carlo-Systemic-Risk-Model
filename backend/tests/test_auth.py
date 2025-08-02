"""
Tests for authentication API
"""

import unittest
import json
from backend.app import create_app, db
from backend.models.user import User
from werkzeug.security import generate_password_hash

class AuthTestCase(unittest.TestCase):
    """Test case for authentication API"""
    
    def setUp(self):
        """Set up test environment"""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
        # Create test user
        test_user = User(
            username='testuser',
            email='test@example.com',
            password_hash=generate_password_hash('Test123!'),
            role='viewer'
        )
        db.session.add(test_user)
        db.session.commit()
    
    def tearDown(self):
        """Clean up test environment"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
    
    def test_register_user(self):
        """Test user registration"""
        # Test successful registration
        response = self.client.post(
            '/api/auth/register',
            data=json.dumps({
                'username': 'newuser',
                'email': 'new@example.com',
                'password': 'NewPass123'
            }),
            content_type='application/json'
        )
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(data['message'], 'User registered successfully')
        self.assertEqual(data['user']['username'], 'newuser')
        
        # Test duplicate username
        response = self.client.post(
            '/api/auth/register',
            data=json.dumps({
                'username': 'newuser',
                'email': 'another@example.com',
                'password': 'AnotherPass123'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 409)
        
        # Test invalid email
        response = self.client.post(
            '/api/auth/register',
            data=json.dumps({
                'username': 'invaliduser',
                'email': 'invalid-email',
                'password': 'Pass123'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        
        # Test weak password
        response = self.client.post(
            '/api/auth/register',
            data=json.dumps({
                'username': 'weakuser',
                'email': 'weak@example.com',
                'password': 'weak'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
    
    def test_login(self):
        """Test user login"""
        # Test successful login
        response = self.client.post(
            '/api/auth/login',
            data=json.dumps({
                'username': 'testuser',
                'password': 'Test123!'
            }),
            content_type='application/json'
        )
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertTrue('access_token' in data)
        self.assertTrue('refresh_token' in data)
        self.assertEqual(data['user']['username'], 'testuser')
        
        # Test invalid credentials
        response = self.client.post(
            '/api/auth/login',
            data=json.dumps({
                'username': 'testuser',
                'password': 'wrongpassword'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
    
    def test_get_user_info(self):
        """Test getting user information"""
        # Login first to get token
        login_response = self.client.post(
            '/api/auth/login',
            data=json.dumps({
                'username': 'testuser',
                'password': 'Test123!'
            }),
            content_type='application/json'
        )
        login_data = json.loads(login_response.data)
        token = login_data['access_token']
        
        # Test with valid token
        response = self.client.get(
            '/api/auth/me',
            headers={'Authorization': f'Bearer {token}'}
        )
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['user']['username'], 'testuser')
        
        # Test with invalid token
        response = self.client.get(
            '/api/auth/me',
            headers={'Authorization': 'Bearer invalid-token'}
        )
        self.assertEqual(response.status_code, 422)
    
    def test_change_password(self):
        """Test changing password"""
        # Login first to get token
        login_response = self.client.post(
            '/api/auth/login',
            data=json.dumps({
                'username': 'testuser',
                'password': 'Test123!'
            }),
            content_type='application/json'
        )
        login_data = json.loads(login_response.data)
        token = login_data['access_token']
        
        # Test with valid data
        response = self.client.post(
            '/api/auth/change-password',
            data=json.dumps({
                'current_password': 'Test123!',
                'new_password': 'NewTest456!'
            }),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        
        # Test login with new password
        response = self.client.post(
            '/api/auth/login',
            data=json.dumps({
                'username': 'testuser',
                'password': 'NewTest456!'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        
        # Test login with old password (should fail)
        response = self.client.post(
            '/api/auth/login',
            data=json.dumps({
                'username': 'testuser',
                'password': 'Test123!'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)

if __name__ == '__main__':
    unittest.main()