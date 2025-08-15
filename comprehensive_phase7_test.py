#!/usr/bin/env python3
"""
Comprehensive Phase 7 Testing Script
Tests all Phase 7: Special Tests & Resit Management APIs
"""

import requests
import json
import uuid
from datetime import datetime

class Phase7Tester:
    def __init__(self):
        self.base_url = "https://retry-system.preview.emergentagent.com/api"
        self.tokens = {}
        self.users = {}
        self.categories = []
        self.special_categories = []
        self.tests_run = 0
        self.tests_passed = 0
        
        print("🚀 Starting Phase 7: Special Tests & Resit Management Testing")
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

    def setup_prerequisites(self):
        """Setup required data for Phase 7 testing"""
        print("🔧 Setting up prerequisites...")
        
        # Login as admin
        admin_login = {'username': 'admin@ita.gov', 'password': 'admin123'}
        success, response = self.make_request('POST', 'auth/login', admin_login)
        if success:
            self.tokens['admin'] = response['access_token']
            self.users['admin'] = response['user']
            print("✅ Admin login successful")
        else:
            print("❌ Admin login failed")
            return False
        
        # Create test categories if needed
        category_data = {
            "name": "Driver License Test",
            "description": "Standard driver license test category",
            "is_active": True
        }
        success, response = self.make_request('POST', 'categories', category_data, self.tokens['admin'])
        if success:
            self.categories.append({'id': response['category_id'], **category_data})
            print("✅ Test category created")
        
        # Register and login candidate
        candidate_data = {
            "email": "phase7.candidate@test.com",
            "password": "candidate123",
            "full_name": "Phase 7 Test Candidate",
            "role": "Candidate"
        }
        success, response = self.make_request('POST', 'auth/register', candidate_data)
        if success:
            # Login as candidate
            candidate_login = {'username': candidate_data['email'], 'password': candidate_data['password']}
            success, response = self.make_request('POST', 'auth/login', candidate_login)
            if success:
                self.tokens['candidate'] = response['access_token']
                self.users['candidate'] = response['user']
                print("✅ Candidate registered and logged in")
        
        # Register and login officer
        officer_data = {
            "email": "phase7.officer@ita.gov",
            "password": "officer123",
            "full_name": "Phase 7 Test Officer",
            "role": "Driver Assessment Officer"
        }
        success, response = self.make_request('POST', 'auth/register', officer_data)
        if success:
            # Login as officer
            officer_login = {'username': officer_data['email'], 'password': officer_data['password']}
            success, response = self.make_request('POST', 'auth/login', officer_login)
            if success:
                self.tokens['officer'] = response['access_token']
                self.users['officer'] = response['user']
                print("✅ Officer registered and logged in")
        
        return True

    def test_special_test_categories(self):
        """Test Phase 7: Special Test Categories APIs"""
        print("🚗 Testing Phase 7: Special Test Categories APIs")
        
        # Test creating special test categories
        special_categories = [
            {
                "name": "Public Passenger Vehicle (PPV)",
                "description": "Commercial license for public passenger transport",
                "category_code": "PPV",
                "requirements": [
                    "Valid driver's license for at least 2 years",
                    "Medical certificate",
                    "Clean driving record"
                ],
                "is_active": True
            },
            {
                "name": "Commercial Driver's License (CDL)",
                "description": "License for commercial vehicle operation",
                "category_code": "CDL",
                "requirements": [
                    "Valid driver's license for at least 3 years",
                    "Medical certificate",
                    "Background check",
                    "Minimum age 21"
                ],
                "is_active": True
            },
            {
                "name": "Hazardous Materials (HazMat)",
                "description": "Endorsement for transporting hazardous materials",
                "category_code": "HMT",
                "requirements": [
                    "Valid CDL license",
                    "Background security check",
                    "Hazmat training certificate"
                ],
                "is_active": True
            }
        ]
        
        for category_data in special_categories:
            success, response = self.make_request('POST', 'special-test-categories', category_data,
                                                token=self.tokens['admin'], expected_status=200)
            self.log_test(f"Create Special Test Category: {category_data['name']}", success,
                         f"Category ID: {response.get('category_id', 'N/A')}" if success else f"Error: {response}")
            
            if success:
                self.special_categories.append({**category_data, 'id': response.get('category_id')})
        
        # Test getting special test categories
        success, response = self.make_request('GET', 'special-test-categories', token=self.tokens['admin'])
        self.log_test("Get All Special Test Categories", success,
                     f"Found {len(response) if isinstance(response, list) else 0} special categories" if success else f"Error: {response}")
        
        # Test updating a special test category
        if self.special_categories:
            category_id = self.special_categories[0]['id']
            update_data = {
                "description": "Updated description for PPV license",
                "requirements": [
                    "Valid driver's license for at least 2 years",
                    "Medical certificate",
                    "Clean driving record",
                    "Defensive driving course completion"
                ]
            }
            
            success, response = self.make_request('PUT', f'special-test-categories/{category_id}', update_data,
                                                token=self.tokens['admin'])
            self.log_test("Update Special Test Category", success,
                         f"Category updated successfully" if success else f"Error: {response}")
        
        # Test duplicate category code creation (should fail)
        duplicate_category = {
            "name": "Duplicate PPV",
            "description": "Should fail",
            "category_code": "PPV",
            "requirements": [],
            "is_active": True
        }
        
        success, response = self.make_request('POST', 'special-test-categories', duplicate_category,
                                            token=self.tokens['admin'], expected_status=400)
        self.log_test("Create Duplicate Category Code (Should Fail)", success,
                     f"Correctly rejected: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")
        
        # Test unauthorized access
        if 'officer' in self.tokens:
            success, response = self.make_request('POST', 'special-test-categories', special_categories[0],
                                                token=self.tokens['officer'], expected_status=403)
            self.log_test("Officer Create Special Category (Should Fail)", success,
                         f"Correctly blocked: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")

    def test_special_test_configurations(self):
        """Test Phase 7: Special Test Configurations APIs"""
        print("⚙️ Testing Phase 7: Special Test Configurations APIs")
        
        if not self.categories or not self.special_categories:
            self.log_test("Prerequisites Missing for Special Test Configs", False, 
                         "Categories or special categories missing")
            return
        
        category_id = self.categories[0]['id']
        special_category_id = self.special_categories[0]['id']  # PPV
        
        # Test creating special test configuration
        special_config_data = {
            "category_id": category_id,
            "special_category_id": special_category_id,
            "name": "PPV Driver License Test",
            "description": "Comprehensive test for Public Passenger Vehicle license",
            "written_total_questions": 30,
            "written_pass_mark_percentage": 85,
            "written_time_limit_minutes": 45,
            "written_difficulty_distribution": {"easy": 20, "medium": 50, "hard": 30},
            "yard_pass_mark_percentage": 85,
            "road_pass_mark_percentage": 85,
            "requires_medical_certificate": True,
            "requires_background_check": True,
            "minimum_experience_years": 2,
            "additional_documents": [
                "Medical certificate",
                "Police clearance certificate",
                "Proof of driving experience"
            ],
            "is_active": True,
            "requires_officer_assignment": True
        }
        
        success, response = self.make_request('POST', 'special-test-configs', special_config_data,
                                            token=self.tokens['admin'], expected_status=200)
        self.log_test("Create Special Test Configuration", success,
                     f"Config ID: {response.get('config_id', 'N/A')}" if success else f"Error: {response}")
        
        if success:
            self.special_config_id = response.get('config_id')
        
        # Test getting all special test configurations
        success, response = self.make_request('GET', 'special-test-configs', token=self.tokens['admin'])
        self.log_test("Get All Special Test Configurations", success,
                     f"Found {len(response) if isinstance(response, list) else 0} special configurations" if success else f"Error: {response}")
        
        # Test getting specific special test configuration
        if hasattr(self, 'special_config_id'):
            success, response = self.make_request('GET', f'special-test-configs/{self.special_config_id}',
                                                token=self.tokens['admin'])
            self.log_test("Get Specific Special Test Configuration", success,
                         f"Config Name: {response.get('name', 'N/A')}" if success else f"Error: {response}")
        
        # Test invalid category reference
        invalid_config = {
            "category_id": "invalid-category-id",
            "special_category_id": special_category_id,
            "name": "Invalid Config",
            "written_total_questions": 25,
            "written_pass_mark_percentage": 80,
            "written_time_limit_minutes": 40,
            "is_active": True
        }
        
        success, response = self.make_request('POST', 'special-test-configs', invalid_config,
                                            token=self.tokens['admin'], expected_status=404)
        self.log_test("Create Config with Invalid Category (Should Fail)", success,
                     f"Correctly rejected: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")

    def test_resit_management(self):
        """Test Phase 7: Resit Management APIs"""
        print("🔄 Testing Phase 7: Resit Management APIs")
        
        # Test getting candidate's resits (should be empty initially)
        if 'candidate' in self.tokens:
            success, response = self.make_request('GET', 'resits/my-resits', token=self.tokens['candidate'])
            self.log_test("Get My Resits", success,
                         f"Found {len(response) if isinstance(response, list) else 0} resits" if success else f"Error: {response}")
        
        # Test staff getting all resits
        if 'admin' in self.tokens:
            success, response = self.make_request('GET', 'resits/all', token=self.tokens['admin'])
            self.log_test("Get All Resits (Staff)", success,
                         f"Found {len(response) if isinstance(response, list) else 0} resits" if success else f"Error: {response}")
        
        # Test unauthorized access to all resits
        if 'candidate' in self.tokens:
            success, response = self.make_request('GET', 'resits/all', 
                                                token=self.tokens['candidate'], expected_status=403)
            self.log_test("Candidate Access to All Resits (Should Fail)", success,
                         f"Correctly blocked: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")
        
        # Test requesting a resit with invalid session (should fail)
        if 'candidate' in self.tokens:
            failed_session_id = str(uuid.uuid4())
            resit_request_data = {
                "original_session_id": failed_session_id,
                "failed_stages": ["written", "yard"],
                "requested_appointment_date": "2024-08-15",
                "requested_time_slot": "10:00-11:00",
                "reason": "Failed written test due to time pressure and yard test due to parking error",
                "notes": "Would like to retake both stages"
            }
            
            success, response = self.make_request('POST', 'resits/request', resit_request_data,
                                                token=self.tokens['candidate'], expected_status=404)
            self.log_test("Request Resit with Invalid Session (Should Fail)", success,
                         f"Correctly rejected: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")

    def test_failed_stage_tracking(self):
        """Test Phase 7: Failed Stage Tracking APIs"""
        print("📊 Testing Phase 7: Failed Stage Tracking APIs")
        
        if 'officer' not in self.tokens or 'candidate' not in self.tokens:
            self.log_test("Prerequisites Missing for Failed Stage Tracking", False, "Officer or candidate token missing")
            return
        
        # Create mock failed stage records
        candidate_id = self.users['candidate']['id']
        session_id = str(uuid.uuid4())
        
        failed_stages = [
            {
                "session_id": session_id,
                "candidate_id": candidate_id,
                "stage": "written",
                "score_achieved": 65.0,
                "pass_mark_required": 75.0,
                "failure_reason": "Insufficient knowledge of traffic signs",
                "can_resit": True,
                "resit_count": 0,
                "max_resits_allowed": 3
            },
            {
                "session_id": session_id,
                "candidate_id": candidate_id,
                "stage": "yard",
                "score_achieved": 70.0,
                "pass_mark_required": 80.0,
                "failure_reason": "Failed parallel parking maneuver",
                "can_resit": True,
                "resit_count": 0,
                "max_resits_allowed": 3
            }
        ]
        
        for stage_data in failed_stages:
            success, response = self.make_request('POST', 'failed-stages/record', stage_data,
                                                token=self.tokens['officer'], expected_status=200)
            self.log_test(f"Record Failed Stage: {stage_data['stage']}", success,
                         f"Record ID: {response.get('record_id', 'N/A')}" if success else f"Error: {response}")
        
        # Test getting candidate's failed stages
        success, response = self.make_request('GET', f'failed-stages/candidate/{candidate_id}',
                                            token=self.tokens['officer'])
        self.log_test("Get Candidate Failed Stages", success,
                     f"Found {len(response) if isinstance(response, list) else 0} failed stage records" if success else f"Error: {response}")
        
        # Test candidate accessing their own failed stages
        success, response = self.make_request('GET', f'failed-stages/candidate/{candidate_id}',
                                            token=self.tokens['candidate'])
        self.log_test("Candidate Get Own Failed Stages", success,
                     f"Found {len(response) if isinstance(response, list) else 0} failed stage records" if success else f"Error: {response}")
        
        # Test failed stages analytics
        success, response = self.make_request('GET', 'failed-stages/analytics', token=self.tokens['admin'])
        self.log_test("Get Failed Stages Analytics", success,
                     f"Stage Stats: {len(response.get('stage_failure_stats', []))}, Total Resits: {response.get('total_resit_requests', 0)}" if success else f"Error: {response}")
        
        # Test unauthorized access to analytics
        success, response = self.make_request('GET', 'failed-stages/analytics',
                                            token=self.tokens['candidate'], expected_status=403)
        self.log_test("Candidate Access to Analytics (Should Fail)", success,
                     f"Correctly blocked: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")
        
        # Test unauthorized recording of failed stages
        invalid_stage_data = {
            "session_id": "test-session",
            "candidate_id": "test-candidate",
            "stage": "written",
            "score_achieved": 50.0,
            "pass_mark_required": 75.0,
            "failure_reason": "Should fail"
        }
        
        success, response = self.make_request('POST', 'failed-stages/record', invalid_stage_data,
                                            token=self.tokens['candidate'], expected_status=403)
        self.log_test("Candidate Record Failed Stage (Should Fail)", success,
                     f"Correctly blocked: {response.get('detail', 'N/A')}" if success else f"Unexpected: {response}")

    def run_all_tests(self):
        """Run all Phase 7 tests"""
        if not self.setup_prerequisites():
            print("❌ Failed to setup prerequisites")
            return False
        
        print("\n" + "=" * 80)
        print("🚀 Running Phase 7: Special Tests & Resit Management System Tests")
        print("=" * 80)
        
        try:
            self.test_special_test_categories()
            self.test_special_test_configurations()
            self.test_resit_management()
            self.test_failed_stage_tracking()
        except Exception as e:
            print(f"💥 Error during Phase 7 testing: {str(e)}")
        
        # Print final results
        print("=" * 80)
        print("📋 PHASE 7 TEST RESULTS")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📊 Total Tests: {self.tests_run}")
        print(f"🎯 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        print()
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL PHASE 7 TESTS PASSED!")
            return True
        else:
            print("⚠️  Some Phase 7 tests failed.")
            return False

def main():
    tester = Phase7Tester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())