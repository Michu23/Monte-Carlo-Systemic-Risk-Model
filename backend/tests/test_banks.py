"""
Tests for bank management API
"""

import unittest
import json
import io
from backend.app import create_app, db
from backend.models.user import User
from backend.models.bank import Bank
from werkzeug.security import generate_password_hash

class BanksTestCase(unittest.TestCase):
    """Test case for bank management API"""
    
    def setUp(self):
        """Set up test environment"""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
        # Create admin user
        admin_user = User(
            username='admin',
            email='admin@example.com',
            password_hash=generate_password_hash('Admin123!'),
            role='admin'
        )
        db.session.add(admin_user)
        
        # Create regular user
        regular_user = User(
            username='user',
            email='user@example.com',
            password_hash=generate_password_hash('User123!'),
            role='viewer'
        )
        db.session.add(regular_user)
        
        # Create test bank
        test_bank = Bank(
            name='Test Bank',
            cet1_ratio=12.5,
            total_assets=1000.0,
            interbank_assets=50.0,
            interbank_liabilities=75.0,
            capital_buffer=125.0
        )
        db.session.add(test_bank)
        
        db.session.commit()
        
        # Get admin token
        response = self.client.post(
            '/api/auth/login',
            data=json.dumps({
                'username': 'admin',
                'password': 'Admin123!'
            }),
            content_type='application/json'
        )
        data = json.loads(response.data)
        self.admin_token = data['access_token']
        
        # Get regular user token
        response = self.client.post(
            '/api/auth/login',
            data=json.dumps({
                'username': 'user',
                'password': 'User123!'
            }),
            content_type='application/json'
        )
        data = json.loads(response.data)
        self.user_token = data['access_token']
    
    def tearDown(self):
        """Clean up test environment"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
    
    def test_get_banks(self):
        """Test getting list of banks"""
        # Test with admin token
        response = self.client.get(
            '/api/banks',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['banks']), 1)
        self.assertEqual(data['banks'][0]['name'], 'Test Bank')
        
        # Test with regular user token
        response = self.client.get(
            '/api/banks',
            headers={'Authorization': f'Bearer {self.user_token}'}
        )
        self.assertEqual(response.status_code, 200)
    
    def test_get_bank(self):
        """Test getting a specific bank"""
        # Get bank ID
        bank = Bank.query.filter_by(name='Test Bank').first()
        
        # Test with valid ID
        response = self.client.get(
            f'/api/banks/{bank.id}',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['bank']['name'], 'Test Bank')
        
        # Test with invalid ID
        response = self.client.get(
            '/api/banks/invalid-id',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(response.status_code, 404)
    
    def test_create_bank(self):
        """Test creating a new bank"""
        # Test with admin token
        response = self.client.post(
            '/api/banks',
            data=json.dumps({
                'name': 'New Bank',
                'cet1_ratio': 14.2,
                'total_assets': 1500.0,
                'interbank_assets': 75.0,
                'interbank_liabilities': 100.0
            }),
            headers={'Authorization': f'Bearer {self.admin_token}'},
            content_type='application/json'
        )
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(data['bank']['name'], 'New Bank')
        self.assertAlmostEqual(data['bank']['capital_buffer'], 14.2 * 1500.0 * 0.01)
        
        # Test with regular user token (should fail)
        response = self.client.post(
            '/api/banks',
            data=json.dumps({
                'name': 'Another Bank',
                'cet1_ratio': 13.0,
                'total_assets': 1200.0,
                'interbank_assets': 60.0,
                'interbank_liabilities': 80.0
            }),
            headers={'Authorization': f'Bearer {self.user_token}'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 403)
        
        # Test with invalid data
        response = self.client.post(
            '/api/banks',
            data=json.dumps({
                'name': 'Invalid Bank',
                'cet1_ratio': -5.0,  # Negative value
                'total_assets': 1000.0,
                'interbank_assets': 50.0,
                'interbank_liabilities': 75.0
            }),
            headers={'Authorization': f'Bearer {self.admin_token}'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        
        # Test with duplicate name
        response = self.client.post(
            '/api/banks',
            data=json.dumps({
                'name': 'Test Bank',  # Already exists
                'cet1_ratio': 15.0,
                'total_assets': 2000.0,
                'interbank_assets': 100.0,
                'interbank_liabilities': 150.0
            }),
            headers={'Authorization': f'Bearer {self.admin_token}'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 409)
    
    def test_update_bank(self):
        """Test updating a bank"""
        # Get bank ID
        bank = Bank.query.filter_by(name='Test Bank').first()
        
        # Test with admin token
        response = self.client.put(
            f'/api/banks/{bank.id}',
            data=json.dumps({
                'cet1_ratio': 13.5,
                'total_assets': 1100.0
            }),
            headers={'Authorization': f'Bearer {self.admin_token}'},
            content_type='application/json'
        )
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['bank']['cet1_ratio'], 13.5)
        self.assertEqual(data['bank']['total_assets'], 1100.0)
        self.assertAlmostEqual(data['bank']['capital_buffer'], 13.5 * 1100.0 * 0.01)
        
        # Test with regular user token (should fail)
        response = self.client.put(
            f'/api/banks/{bank.id}',
            data=json.dumps({
                'cet1_ratio': 14.0
            }),
            headers={'Authorization': f'Bearer {self.user_token}'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 403)
        
        # Test with invalid data
        response = self.client.put(
            f'/api/banks/{bank.id}',
            data=json.dumps({
                'interbank_assets': 1200.0  # Greater than total assets
            }),
            headers={'Authorization': f'Bearer {self.admin_token}'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
    
    def test_delete_bank(self):
        """Test deleting a bank"""
        # Create a bank to delete
        new_bank = Bank(
            name='Bank to Delete',
            cet1_ratio=11.0,
            total_assets=800.0,
            interbank_assets=40.0,
            interbank_liabilities=60.0,
            capital_buffer=88.0
        )
        db.session.add(new_bank)
        db.session.commit()
        
        # Test with regular user token (should fail)
        response = self.client.delete(
            f'/api/banks/{new_bank.id}',
            headers={'Authorization': f'Bearer {self.user_token}'}
        )
        self.assertEqual(response.status_code, 403)
        
        # Test with admin token
        response = self.client.delete(
            f'/api/banks/{new_bank.id}',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(response.status_code, 200)
        
        # Verify bank is deleted
        bank = Bank.query.get(new_bank.id)
        self.assertIsNone(bank)
    
    def test_exposure_matrix(self):
        """Test getting exposure matrix"""
        # Add another bank for a more interesting matrix
        another_bank = Bank(
            name='Another Bank',
            cet1_ratio=13.0,
            total_assets=1200.0,
            interbank_assets=60.0,
            interbank_liabilities=80.0,
            capital_buffer=156.0
        )
        db.session.add(another_bank)
        db.session.commit()
        
        # Test getting exposure matrix
        response = self.client.get(
            '/api/banks/exposure-matrix',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['bank_names']), 2)
        self.assertEqual(len(data['exposure_matrix']), 2)
        self.assertEqual(len(data['exposure_matrix'][0]), 2)

if __name__ == '__main__':
    unittest.main()