#!/usr/bin/env python3
"""
Core Functionality Test for ITA Driver's License Testing System
Focus on the original problem statement: "Allow the administrator to be able to add users and assign user roles"
Plus verification of Question Bank and Test Management core features.
"""

import requests
import json
from datetime import datetime

class CoreFunctionalityTester:
    def __init__(self, base_url="https://testbank-revive.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        
        print("🎯 CORE FUNCTIONALITY TESTING")
        print("=" * 60)
        print("Focus: Administrator add users & assign roles")
        print("Plus: Question Bank & Test Management verification")
        print("=" * 60)

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

    def make_request(self, method: str, endpoint: str, data=None, token=None, expected_status=200):
        """Make HTTP request"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if endpoint == 'auth/login':
                    headers = {'Authorization': f'Bearer {token}'} if token else {}
                    response = requests.post(url, data=data, headers=headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            
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

    def setup_admin_user(self):
        """Create and login as administrator"""
        print("🔑 Setting up Administrator User")
        
        # Create admin user
        admin_data = {
            "email": "admin@ita.gov",
            "password": "admin123",
            "full_name": "System Administrator",
            "role": "Administrator"
        }
        
        success, response = self.make_request('POST', 'auth/register', admin_data)
        if success:
            print(f"✅ Admin user created: {response.get('user_id')}")
        else:
            print(f"ℹ️  Admin user may already exist: {response.get('detail', 'Unknown')}")
        
        # Login as admin
        login_data = {
            'username': admin_data['email'],
            'password': admin_data['password']
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data)
        if success:
            self.admin_token = response.get('access_token')
            print(f"✅ Admin logged in successfully")
            return True
        else:
            print(f"❌ Admin login failed: {response}")
            return False

    def test_core_user_management(self):
        """Test core user management functionality"""
        print("👥 TESTING CORE USER MANAGEMENT")
        print("Original Problem: Allow administrator to add users and assign roles")
        
        if not self.admin_token:
            self.log_test("Admin Authentication Required", False, "Cannot test without admin token")
            return
        
        # Test 1: Create Manager User
        manager_data = {
            "email": "manager.test@ita.gov",
            "password": "manager123",
            "full_name": "Test Manager",
            "role": "Manager"
        }
        
        success, response = self.make_request('POST', 'admin/users', manager_data, self.admin_token)
        self.log_test("Create Manager User", success, 
                     f"User ID: {response.get('user_id')}" if success else f"Error: {response.get('detail')}")
        
        # Test 2: Create Driver Assessment Officer
        officer_data = {
            "email": "officer.test@ita.gov", 
            "password": "officer123",
            "full_name": "Test Assessment Officer",
            "role": "Driver Assessment Officer"
        }
        
        success, response = self.make_request('POST', 'admin/users', officer_data, self.admin_token)
        self.log_test("Create Assessment Officer", success,
                     f"User ID: {response.get('user_id')}" if success else f"Error: {response.get('detail')}")
        
        # Test 3: Create Regional Director
        director_data = {
            "email": "director.test@ita.gov",
            "password": "director123", 
            "full_name": "Test Regional Director",
            "role": "Regional Director"
        }
        
        success, response = self.make_request('POST', 'admin/users', director_data, self.admin_token)
        self.log_test("Create Regional Director", success,
                     f"User ID: {response.get('user_id')}" if success else f"Error: {response.get('detail')}")
        
        # Test 4: Create Candidate User
        candidate_data = {
            "email": "candidate.test@example.com",
            "password": "candidate123",
            "full_name": "Test Candidate",
            "role": "Candidate"
        }
        
        success, response = self.make_request('POST', 'admin/users', candidate_data, self.admin_token)
        self.log_test("Create Candidate User", success,
                     f"User ID: {response.get('user_id')}" if success else f"Error: {response.get('detail')}")
        
        # Test 5: List all users to verify creation
        success, response = self.make_request('GET', 'admin/users', token=self.admin_token)
        user_count = len(response) if isinstance(response, list) else 0
        self.log_test("List All Users", success,
                     f"Found {user_count} users in system" if success else f"Error: {response}")
        
        # Test 6: Test role assignment by updating user role
        if user_count > 0 and isinstance(response, list):
            # Find a user to update (not the admin)
            test_user = None
            for user in response:
                if user.get('email') != 'admin@ita.gov':
                    test_user = user
                    break
            
            if test_user:
                update_data = {
                    "role": "Manager"  # Change role to Manager
                }
                
                success, update_response = self.make_request('PUT', f'admin/users/{test_user["id"]}', 
                                                           update_data, self.admin_token)
                self.log_test("Update User Role (Role Assignment)", success,
                             f"Changed {test_user['full_name']} role to Manager" if success 
                             else f"Error: {update_response.get('detail')}")

    def test_question_bank_core(self):
        """Test core question bank functionality"""
        print("📚 TESTING CORE QUESTION BANK FUNCTIONALITY")
        
        if not self.admin_token:
            self.log_test("Admin Authentication Required", False, "Cannot test without admin token")
            return
        
        # Test 1: Create Test Category
        category_data = {
            "name": "Core Test Category",
            "description": "Category for core functionality testing",
            "is_active": True
        }
        
        success, response = self.make_request('POST', 'categories', category_data, self.admin_token)
        category_id = response.get('category_id') if success else None
        self.log_test("Create Test Category", success,
                     f"Category ID: {category_id}" if success else f"Error: {response.get('detail')}")
        
        # Test 2: Create Question
        if category_id:
            question_data = {
                "category_id": category_id,
                "question_type": "multiple_choice",
                "question_text": "What is the speed limit in residential areas?",
                "options": [
                    {"text": "25 km/h", "is_correct": False},
                    {"text": "40 km/h", "is_correct": True},
                    {"text": "60 km/h", "is_correct": False},
                    {"text": "80 km/h", "is_correct": False}
                ],
                "explanation": "The speed limit in residential areas is 40 km/h",
                "difficulty": "easy"
            }
            
            success, response = self.make_request('POST', 'questions', question_data, self.admin_token)
            question_id = response.get('question_id') if success else None
            self.log_test("Create Question", success,
                         f"Question ID: {question_id}" if success else f"Error: {response.get('detail')}")
            
            # Test 3: Approve Question (as Regional Director role)
            if question_id:
                approval_data = {
                    "question_id": question_id,
                    "action": "approve",
                    "notes": "Approved for core functionality testing"
                }
                
                success, response = self.make_request('POST', 'questions/approve', approval_data, self.admin_token)
                self.log_test("Approve Question", success,
                             "Question approved successfully" if success else f"Error: {response.get('detail')}")
        
        # Test 4: Get Question Statistics
        success, response = self.make_request('GET', 'questions/stats', token=self.admin_token)
        self.log_test("Get Question Statistics", success,
                     f"Total: {response.get('total_questions', 0)}, Approved: {response.get('approved_questions', 0)}" 
                     if success else f"Error: {response}")

    def test_test_configuration_core(self):
        """Test core test configuration functionality"""
        print("⚙️ TESTING CORE TEST CONFIGURATION")
        
        if not self.admin_token:
            self.log_test("Admin Authentication Required", False, "Cannot test without admin token")
            return
        
        # First get a category to use
        success, categories = self.make_request('GET', 'categories', token=self.admin_token)
        if not success or not categories:
            self.log_test("Get Categories for Test Config", False, "No categories available")
            return
        
        category_id = categories[0]['id']
        
        # Test 1: Create Test Configuration
        config_data = {
            "name": "Core Functionality Test",
            "description": "Test configuration for core functionality verification",
            "category_id": category_id,
            "total_questions": 10,
            "pass_mark_percentage": 70,
            "time_limit_minutes": 15,
            "is_active": True,
            "difficulty_distribution": {"easy": 40, "medium": 40, "hard": 20}
        }
        
        success, response = self.make_request('POST', 'test-configs', config_data, self.admin_token)
        config_id = response.get('config_id') if success else None
        self.log_test("Create Test Configuration", success,
                     f"Config ID: {config_id}" if success else f"Error: {response.get('detail')}")
        
        # Test 2: Get Test Configurations
        success, response = self.make_request('GET', 'test-configs', token=self.admin_token)
        config_count = len(response) if isinstance(response, list) else 0
        self.log_test("Get Test Configurations", success,
                     f"Found {config_count} test configurations" if success else f"Error: {response}")

    def test_basic_test_workflow(self):
        """Test basic test taking workflow"""
        print("🎯 TESTING BASIC TEST WORKFLOW")
        
        # This test will verify if the basic test workflow is accessible
        # Note: Full test taking requires identity verification (Phase 5 feature)
        
        # Test 1: Get available test configurations (as candidate)
        success, response = self.make_request('GET', 'test-configs')
        config_count = len(response) if isinstance(response, list) else 0
        self.log_test("Get Available Test Configurations (Public)", success,
                     f"Found {config_count} available test configurations" if success else f"Error: {response}")
        
        # Test 2: Check test analytics (staff only)
        if self.admin_token:
            success, response = self.make_request('GET', 'tests/analytics', token=self.admin_token)
            self.log_test("Get Test Analytics", success,
                         f"Total Sessions: {response.get('total_sessions', 0)}, Pass Rate: {response.get('pass_rate', 0)}%" 
                         if success else f"Error: {response}")

    def run_all_tests(self):
        """Run all core functionality tests"""
        print(f"🚀 Starting Core Functionality Tests at {datetime.now()}")
        print()
        
        # Setup
        if not self.setup_admin_user():
            print("❌ Cannot proceed without admin authentication")
            return
        
        print()
        
        # Run core tests
        self.test_core_user_management()
        print()
        
        self.test_question_bank_core()
        print()
        
        self.test_test_configuration_core()
        print()
        
        self.test_basic_test_workflow()
        print()
        
        # Final results
        print("=" * 60)
        print("📋 CORE FUNCTIONALITY TEST RESULTS")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📊 Total Tests: {self.tests_run}")
        print(f"🎯 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 ALL CORE FUNCTIONALITY TESTS PASSED!")
            print("✅ Administrator can add users and assign roles")
            print("✅ Question Bank Management is working")
            print("✅ Test Configuration Management is working")
        else:
            print(f"\n⚠️  {self.tests_run - self.tests_passed} tests failed. Review issues above.")

if __name__ == "__main__":
    tester = CoreFunctionalityTester()
    tester.run_all_tests()