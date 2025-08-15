#!/usr/bin/env python3
"""
Focused User Management API Testing for Island Traffic Authority Driver's License Testing System
Tests the User Management APIs that administrators use to add users and assign roles.
"""

import requests
import sys
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

class UserManagementTester:
    def __init__(self, base_url="https://cert-license-admin.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.test_users = []
        self.tests_run = 0
        self.tests_passed = 0
        
        print(f"🚀 Starting User Management API Testing")
        print(f"📍 Base URL: {base_url}")
        print("=" * 80)

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   {details}")
        print()

    def make_request(self, method: str, endpoint: str, data: Any = None, 
                    token: str = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if endpoint == 'auth/login':
                    # Special handling for login endpoint (form data)
                    headers = {'Authorization': f'Bearer {token}'} if token else {}
                    response = requests.post(url, data=data, headers=headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            if not success:
                response_data["actual_status"] = response.status_code
                response_data["expected_status"] = expected_status
            
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def setup_admin_login(self):
        """Login as admin to get authentication token"""
        print("🔑 Setting up Admin Authentication")
        
        admin_login = {
            'username': 'admin@ita.gov',
            'password': 'admin123'
        }
        
        success, response = self.make_request('POST', 'auth/login', admin_login, expected_status=200)
        self.log_test("Admin Login", success,
                     f"Token received, Role: {response.get('user', {}).get('role', 'N/A')}" if success else f"Error: {response}")
        
        if success:
            self.admin_token = response.get('access_token')
            return True
        return False

    def test_user_creation_api(self):
        """Test User Creation API (POST /api/admin/users)"""
        print("👥 Testing User Creation API")
        
        if not self.admin_token:
            self.log_test("Admin Token Required", False, "Admin authentication failed")
            return
        
        # Generate unique timestamp for email addresses
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Test creating users with different roles
        test_users = [
            {
                "email": f"admin.test.{timestamp}@ita.gov",
                "password": "admin123",
                "full_name": "Test Administrator",
                "role": "Administrator",
                "is_active": True
            },
            {
                "email": f"manager.test.{timestamp}@ita.gov",
                "password": "manager123",
                "full_name": "Test Manager",
                "role": "Manager",
                "is_active": True
            },
            {
                "email": f"officer.test.{timestamp}@ita.gov", 
                "password": "officer123",
                "full_name": "Test Assessment Officer",
                "role": "Driver Assessment Officer",
                "is_active": True
            },
            {
                "email": f"director.test.{timestamp}@ita.gov",
                "password": "director123", 
                "full_name": "Test Regional Director",
                "role": "Regional Director",
                "is_active": True
            },
            {
                "email": f"candidate.test.{timestamp}@example.com",
                "password": "candidate123",
                "full_name": "Test Candidate User",
                "role": "Candidate",
                "is_active": True
            }
        ]
        
        for user_data in test_users:
            success, response = self.make_request('POST', 'admin/users', user_data,
                                                token=self.admin_token, expected_status=200)
            self.log_test(f"Create User: {user_data['role']}", success,
                         f"User ID: {response.get('user_id', 'N/A')}" if success else f"Error: {response}")
            
            if success:
                self.test_users.append({**user_data, 'id': response.get('user_id')})
        
        # Test email validation - duplicate email
        if self.test_users:
            duplicate_user = {
                "email": self.test_users[0]['email'],  # Same as first user
                "password": "duplicate123",
                "full_name": "Duplicate User",
                "role": "Manager",
                "is_active": True
            }
            
            success, response = self.make_request('POST', 'admin/users', duplicate_user,
                                                token=self.admin_token, expected_status=400)
            self.log_test("Create Duplicate Email User (Should Fail)", success,
                         f"Correctly rejected: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")
        
        # Test invalid role validation
        invalid_role_user = {
            "email": f"invalid.role.{timestamp}@test.com",
            "password": "invalid123",
            "full_name": "Invalid Role User",
            "role": "InvalidRole",
            "is_active": True
        }
        
        success, response = self.make_request('POST', 'admin/users', invalid_role_user,
                                            token=self.admin_token, expected_status=400)
        self.log_test("Create Invalid Role User (Should Fail)", success,
                     f"Correctly rejected: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")
        
        # Test required field validation - missing email
        missing_email_user = {
            "password": "test123",
            "full_name": "Missing Email User",
            "role": "Manager",
            "is_active": True
        }
        
        success, response = self.make_request('POST', 'admin/users', missing_email_user,
                                            token=self.admin_token, expected_status=422)
        self.log_test("Create User Missing Email (Should Fail)", success,
                     f"Correctly rejected validation error" if success else f"Unexpected: {response}")

    def test_user_listing_api(self):
        """Test User Listing API (GET /api/admin/users)"""
        print("📋 Testing User Listing API")
        
        if not self.admin_token:
            self.log_test("Admin Token Required", False, "Admin authentication failed")
            return
        
        # Test getting all users (default behavior)
        success, response = self.make_request('GET', 'admin/users', token=self.admin_token)
        self.log_test("Get All Users", success,
                     f"Found {len(response) if isinstance(response, list) else 0} users" if success else f"Error: {response}")
        
        if success and isinstance(response, list):
            # Verify no sensitive data is returned
            for user in response:
                if 'hashed_password' in user:
                    self.log_test("Password Security Check", False, "Hashed password exposed in user listing")
                    break
            else:
                self.log_test("Password Security Check", True, "No sensitive password data exposed")
        
        # Test including deleted users
        success, response = self.make_request('GET', 'admin/users?include_deleted=true', 
                                            token=self.admin_token)
        self.log_test("Get All Users Including Deleted", success,
                     f"Found {len(response) if isinstance(response, list) else 0} users (including deleted)" if success else f"Error: {response}")

    def test_user_update_api(self):
        """Test User Update API (PUT /api/admin/users/{user_id})"""
        print("✏️ Testing User Update API")
        
        if not self.admin_token or not self.test_users:
            self.log_test("Prerequisites Missing", False, "Admin token or test users missing")
            return
        
        test_user = self.test_users[0]  # Use first created user
        user_id = test_user['id']
        
        # Test updating user profile information
        update_data = {
            "full_name": "Updated Test User",
            "is_active": False
        }
        
        success, response = self.make_request('PUT', f'admin/users/{user_id}', update_data,
                                            token=self.admin_token)
        self.log_test("Update User Profile", success,
                     f"User updated successfully" if success else f"Error: {response}")
        
        # Test password update
        password_update = {
            "password": "newpassword123"
        }
        
        success, response = self.make_request('PUT', f'admin/users/{user_id}', password_update,
                                            token=self.admin_token)
        self.log_test("Update User Password", success,
                     f"Password updated successfully" if success else f"Error: {response}")
        
        # Test role change between different roles
        role_update = {
            "role": "Regional Director"
        }
        
        success, response = self.make_request('PUT', f'admin/users/{user_id}', role_update,
                                            token=self.admin_token)
        self.log_test("Update User Role", success,
                     f"Role updated successfully" if success else f"Error: {response}")
        
        # Test updating non-existent user
        fake_user_id = str(uuid.uuid4())
        update_data = {
            "full_name": "Non-existent User"
        }
        
        success, response = self.make_request('PUT', f'admin/users/{fake_user_id}', update_data,
                                            token=self.admin_token, expected_status=404)
        self.log_test("Update Non-existent User (Should Fail)", success,
                     f"Correctly rejected: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")

    def test_user_deletion_and_restoration_apis(self):
        """Test User Deletion and Restoration APIs"""
        print("🗑️ Testing User Deletion and Restoration APIs")
        
        if not self.admin_token or len(self.test_users) < 2:
            self.log_test("Prerequisites Missing", False, "Admin token or insufficient test users")
            return
        
        # Use second test user for deletion
        test_user = self.test_users[1]
        user_id = test_user['id']
        
        # Test soft deletion
        success, response = self.make_request('DELETE', f'admin/users/{user_id}',
                                            token=self.admin_token)
        self.log_test("Soft Delete User", success,
                     f"User deleted successfully" if success else f"Error: {response}")
        
        # Verify user is soft deleted (should appear in deleted users list)
        success, response = self.make_request('GET', 'admin/users?include_deleted=true',
                                            token=self.admin_token)
        if success and isinstance(response, list):
            deleted_user = next((u for u in response if u.get('id') == user_id and u.get('is_deleted')), None)
            self.log_test("Verify User Soft Deleted", deleted_user is not None,
                         f"User found in deleted users list" if deleted_user else "User not found in deleted list")
        
        # Test user restoration
        success, response = self.make_request('POST', f'admin/users/{user_id}/restore',
                                            token=self.admin_token)
        self.log_test("Restore Deleted User", success,
                     f"User restored successfully" if success else f"Error: {response}")
        
        # Verify user is restored (should appear in active users list)
        success, response = self.make_request('GET', 'admin/users', token=self.admin_token)
        if success and isinstance(response, list):
            restored_user = next((u for u in response if u.get('id') == user_id and not u.get('is_deleted')), None)
            self.log_test("Verify User Restored", restored_user is not None,
                         f"User found in active users list" if restored_user else "User not found in active list")
        
        # Test deleting non-existent user
        fake_user_id = str(uuid.uuid4())
        success, response = self.make_request('DELETE', f'admin/users/{fake_user_id}',
                                            token=self.admin_token, expected_status=404)
        self.log_test("Delete Non-existent User (Should Fail)", success,
                     f"Correctly rejected: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")

    def test_authorization_testing(self):
        """Test that other roles (Manager, Officer, Candidate) are blocked"""
        print("🔒 Testing Authorization Controls")
        
        # Create test users with different roles for authorization testing
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_roles = ["Manager", "Driver Assessment Officer", "Candidate"]
        role_tokens = {}
        
        if self.admin_token:
            for role in test_roles:
                user_data = {
                    "email": f"auth.test.{role.lower().replace(' ', '.')}@test.{timestamp}.com",
                    "password": "authtest123",
                    "full_name": f"Auth Test {role}",
                    "role": role,
                    "is_active": True
                }
                
                # Create user
                success, response = self.make_request('POST', 'admin/users', user_data,
                                                    token=self.admin_token)
                if success:
                    # Login as the new user
                    login_data = {
                        'username': user_data['email'],
                        'password': user_data['password']
                    }
                    
                    login_success, login_response = self.make_request('POST', 'auth/login', login_data)
                    if login_success:
                        role_tokens[role] = login_response.get('access_token')
        
        # Test each role's access to User Management APIs
        test_endpoints = [
            ('POST', 'admin/users', {"email": "test@test.com", "password": "test123", "full_name": "Test", "role": "Candidate"}),
            ('GET', 'admin/users', None),
            ('PUT', 'admin/users/fake-id', {"full_name": "Updated"}),
            ('DELETE', 'admin/users/fake-id', None),
            ('POST', 'admin/users/fake-id/restore', None)
        ]
        
        for role, token in role_tokens.items():
            for method, endpoint, data in test_endpoints:
                success, response = self.make_request(method, endpoint, data, token=token, expected_status=403)
                self.log_test(f"{role} Access to {method} {endpoint} (Should Fail)", success,
                             f"Correctly blocked: {response.get('detail', 'N/A')}" if success else f"Unexpected access granted")
        
        # Test without authentication
        for method, endpoint, data in test_endpoints:
            success, response = self.make_request(method, endpoint, data, expected_status=401)
            self.log_test(f"Unauthenticated Access to {method} {endpoint} (Should Fail)", success,
                         f"Correctly blocked: {response.get('detail', 'N/A')}" if success else f"Unexpected access granted")

    def test_self_deletion_prevention(self):
        """Test that users cannot delete themselves"""
        print("🚫 Testing Self-Deletion Prevention")
        
        if not self.admin_token:
            self.log_test("Admin Token Required", False, "Admin authentication failed")
            return
        
        # Get current admin user info
        success, response = self.make_request('GET', 'auth/me', token=self.admin_token)
        if success:
            admin_user_id = response.get('id')
            if admin_user_id:
                success, response = self.make_request('DELETE', f'admin/users/{admin_user_id}',
                                                    token=self.admin_token, expected_status=400)
                self.log_test("Admin Delete Self (Should Fail)", success,
                             f"Correctly blocked: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")

    def run_all_tests(self):
        """Run all User Management API tests"""
        print("🧪 Starting Comprehensive User Management API Testing")
        print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        try:
            # Setup
            if not self.setup_admin_login():
                print("❌ Failed to authenticate as admin. Cannot proceed with tests.")
                return False
            
            # Run tests
            self.test_user_creation_api()
            self.test_user_listing_api()
            self.test_user_update_api()
            self.test_user_deletion_and_restoration_apis()
            self.test_authorization_testing()
            self.test_self_deletion_prevention()
            
        except Exception as e:
            print(f"💥 Critical error during testing: {str(e)}")
            return False
        
        # Print final results
        print("=" * 80)
        print("📋 USER MANAGEMENT API TEST RESULTS")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📊 Total Tests: {self.tests_run}")
        print(f"🎯 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        print()
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL USER MANAGEMENT TESTS PASSED! APIs are working correctly.")
            return True
        else:
            print("⚠️  Some tests failed. Please review the issues above.")
            return False

def main():
    """Main function to run the tests"""
    tester = UserManagementTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())