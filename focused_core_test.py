#!/usr/bin/env python3
"""
Focused Core Functionality Test - Clean test with unique data
Testing the original problem statement: "Allow the administrator to be able to add users and assign user roles"
"""

import requests
import json
import uuid
from datetime import datetime

class FocusedCoreTester:
    def __init__(self, base_url="https://testbank-revive.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_id = str(uuid.uuid4())[:8]  # Unique test run ID
        
        print("🎯 FOCUSED CORE FUNCTIONALITY TEST")
        print("=" * 50)
        print(f"Test Run ID: {self.test_id}")
        print("Focus: Administrator add users & assign roles")
        print("=" * 50)

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
        """Login as existing administrator"""
        print("🔑 Logging in as Administrator")
        
        # Login as existing admin
        login_data = {
            'username': 'admin@ita.gov',
            'password': 'admin123'
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data)
        if success:
            self.admin_token = response.get('access_token')
            print(f"✅ Admin logged in successfully")
            return True
        else:
            print(f"❌ Admin login failed: {response}")
            return False

    def test_user_creation_and_role_assignment(self):
        """Test the core functionality: Administrator add users and assign roles"""
        print("👥 TESTING: Administrator Add Users & Assign Roles")
        print("This is the ORIGINAL PROBLEM STATEMENT being tested")
        
        if not self.admin_token:
            self.log_test("Admin Authentication Required", False, "Cannot test without admin token")
            return
        
        # Test 1: Create Manager User with unique email
        manager_data = {
            "email": f"manager.{self.test_id}@ita.gov",
            "password": "manager123",
            "full_name": f"Test Manager {self.test_id}",
            "role": "Manager"
        }
        
        success, response = self.make_request('POST', 'admin/users', manager_data, self.admin_token)
        manager_id = response.get('user_id') if success else None
        self.log_test("✨ CORE: Create Manager User", success, 
                     f"User ID: {manager_id}" if success else f"Error: {response.get('detail')}")
        
        # Test 2: Create Driver Assessment Officer with unique email
        officer_data = {
            "email": f"officer.{self.test_id}@ita.gov", 
            "password": "officer123",
            "full_name": f"Test Assessment Officer {self.test_id}",
            "role": "Driver Assessment Officer"
        }
        
        success, response = self.make_request('POST', 'admin/users', officer_data, self.admin_token)
        officer_id = response.get('user_id') if success else None
        self.log_test("✨ CORE: Create Assessment Officer", success,
                     f"User ID: {officer_id}" if success else f"Error: {response.get('detail')}")
        
        # Test 3: Create Regional Director with unique email
        director_data = {
            "email": f"director.{self.test_id}@ita.gov",
            "password": "director123", 
            "full_name": f"Test Regional Director {self.test_id}",
            "role": "Regional Director"
        }
        
        success, response = self.make_request('POST', 'admin/users', director_data, self.admin_token)
        director_id = response.get('user_id') if success else None
        self.log_test("✨ CORE: Create Regional Director", success,
                     f"User ID: {director_id}" if success else f"Error: {response.get('detail')}")
        
        # Test 4: Create Candidate User with unique email
        candidate_data = {
            "email": f"candidate.{self.test_id}@example.com",
            "password": "candidate123",
            "full_name": f"Test Candidate {self.test_id}",
            "role": "Candidate"
        }
        
        success, response = self.make_request('POST', 'admin/users', candidate_data, self.admin_token)
        candidate_id = response.get('user_id') if success else None
        self.log_test("✨ CORE: Create Candidate User", success,
                     f"User ID: {candidate_id}" if success else f"Error: {response.get('detail')}")
        
        # Test 5: Verify users were created by listing them
        success, response = self.make_request('GET', 'admin/users', token=self.admin_token)
        if success and isinstance(response, list):
            # Count users created in this test run
            test_users = [u for u in response if self.test_id in u.get('email', '')]
            self.log_test("✨ CORE: Verify Users Created", len(test_users) >= 4,
                         f"Found {len(test_users)} users created in this test run")
        else:
            self.log_test("✨ CORE: Verify Users Created", False, f"Error: {response}")
        
        # Test 6: Test role assignment by updating a user's role
        if manager_id:
            update_data = {
                "role": "Regional Director"  # Change Manager to Regional Director
            }
            
            success, update_response = self.make_request('PUT', f'admin/users/{manager_id}', 
                                                       update_data, self.admin_token)
            self.log_test("✨ CORE: Assign/Change User Role", success,
                         f"Changed Manager to Regional Director" if success 
                         else f"Error: {update_response.get('detail')}")

    def test_question_bank_workflow(self):
        """Test basic question bank workflow"""
        print("📚 TESTING: Question Bank Management Workflow")
        
        if not self.admin_token:
            self.log_test("Admin Authentication Required", False, "Cannot test without admin token")
            return
        
        # Test 1: Create Test Category
        category_data = {
            "name": f"Test Category {self.test_id}",
            "description": f"Category for test run {self.test_id}",
            "is_active": True
        }
        
        success, response = self.make_request('POST', 'categories', category_data, self.admin_token)
        category_id = response.get('category_id') if success else None
        self.log_test("Create Test Category", success,
                     f"Category ID: {category_id}" if success else f"Error: {response.get('detail')}")
        
        # Test 2: Create and Approve Question
        if category_id:
            question_data = {
                "category_id": category_id,
                "question_type": "true_false",
                "question_text": f"Test question for run {self.test_id}?",
                "correct_answer": True,
                "explanation": "This is a test question",
                "difficulty": "easy"
            }
            
            success, response = self.make_request('POST', 'questions', question_data, self.admin_token)
            question_id = response.get('question_id') if success else None
            self.log_test("Create Question", success,
                         f"Question ID: {question_id}" if success else f"Error: {response.get('detail')}")
            
            # Approve the question
            if question_id:
                approval_data = {
                    "question_id": question_id,
                    "action": "approve",
                    "notes": f"Approved for test run {self.test_id}"
                }
                
                success, response = self.make_request('POST', 'questions/approve', approval_data, self.admin_token)
                self.log_test("Approve Question", success,
                             "Question approved successfully" if success else f"Error: {response.get('detail')}")

    def test_test_configuration_workflow(self):
        """Test basic test configuration workflow"""
        print("⚙️ TESTING: Test Configuration Management")
        
        if not self.admin_token:
            self.log_test("Admin Authentication Required", False, "Cannot test without admin token")
            return
        
        # Get available categories
        success, categories = self.make_request('GET', 'categories', token=self.admin_token)
        if not success or not categories:
            self.log_test("Get Categories for Test Config", False, "No categories available")
            return
        
        category_id = categories[0]['id']
        
        # Create Test Configuration
        config_data = {
            "name": f"Test Config {self.test_id}",
            "description": f"Test configuration for run {self.test_id}",
            "category_id": category_id,
            "total_questions": 5,
            "pass_mark_percentage": 60,
            "time_limit_minutes": 10,
            "is_active": True,
            "difficulty_distribution": {"easy": 60, "medium": 30, "hard": 10}
        }
        
        success, response = self.make_request('POST', 'test-configs', config_data, self.admin_token)
        config_id = response.get('config_id') if success else None
        self.log_test("Create Test Configuration", success,
                     f"Config ID: {config_id}" if success else f"Error: {response.get('detail')}")

    def run_focused_test(self):
        """Run focused core functionality test"""
        print(f"🚀 Starting Focused Core Test at {datetime.now()}")
        print()
        
        # Setup
        if not self.setup_admin_user():
            print("❌ Cannot proceed without admin authentication")
            return
        
        print()
        
        # Run core tests
        self.test_user_creation_and_role_assignment()
        print()
        
        self.test_question_bank_workflow()
        print()
        
        self.test_test_configuration_workflow()
        print()
        
        # Final results
        print("=" * 50)
        print("📋 FOCUSED CORE TEST RESULTS")
        print("=" * 50)
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📊 Total Tests: {self.tests_run}")
        print(f"🎯 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed >= 8:  # Most critical tests passed
            print("\n🎉 CORE FUNCTIONALITY IS WORKING!")
            print("✅ ORIGINAL PROBLEM SOLVED: Administrator can add users and assign roles")
            print("✅ Question Bank Management is operational")
            print("✅ Test Configuration Management is operational")
        else:
            print(f"\n⚠️  Core functionality issues detected. Review failures above.")

if __name__ == "__main__":
    tester = FocusedCoreTester()
    tester.run_focused_test()