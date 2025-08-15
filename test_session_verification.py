#!/usr/bin/env python3
"""
Verify test session functionality after fixing the question issue
"""

import requests
import json

BASE_URL = "https://license-cert-system.preview.emergentagent.com/api"

def login_candidate():
    """Login as test candidate"""
    login_data = {
        'username': 'test.candidate@example.com',
        'password': 'candidate123'
    }
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if response.status_code == 200:
        return response.json().get('access_token')
    return None

def login_officer():
    """Login as officer"""
    login_data = {
        'username': 'jane.smith@ita.gov',
        'password': 'officer123'
    }
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if response.status_code == 200:
        return response.json().get('access_token')
    return None

def get_candidate_profile(token):
    """Get candidate profile"""
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/candidates/my-profile", headers=headers)
    if response.status_code == 200:
        return response.json()
    return None

def get_test_configs(token):
    """Get test configurations"""
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/test-configs", headers=headers)
    if response.status_code == 200:
        return response.json()
    return []

def start_test_session(token, test_config_id, candidate_id):
    """Start a test session"""
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    data = {
        "test_config_id": test_config_id,
        "candidate_id": candidate_id
    }
    response = requests.post(f"{BASE_URL}/tests/start", json=data, headers=headers)
    return response.status_code == 200, response.json()

def get_question(token, session_id, question_index):
    """Get a question by index"""
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/tests/session/{session_id}/question/{question_index}", headers=headers)
    return response.status_code == 200, response.json()

def save_answer(token, session_id, question_id, answer_type, answer_value):
    """Save an answer"""
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    if answer_type == 'multiple_choice':
        data = {
            "question_id": question_id,
            "selected_option": answer_value,
            "is_bookmarked": False
        }
    else:
        data = {
            "question_id": question_id,
            "boolean_answer": answer_value,
            "is_bookmarked": False
        }
    
    response = requests.post(f"{BASE_URL}/tests/session/{session_id}/answer", json=data, headers=headers)
    try:
        return response.status_code == 200, response.json()
    except:
        return response.status_code == 200, {"status_code": response.status_code, "text": response.text}

def submit_test(token, session_id, answers):
    """Submit test"""
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    data = {
        "session_id": session_id,
        "answers": answers,
        "is_final_submission": True
    }
    response = requests.post(f"{BASE_URL}/tests/session/{session_id}/submit", json=data, headers=headers)
    return response.status_code == 200, response.json()

def extend_time(token, session_id):
    """Extend test time"""
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    data = {
        "session_id": session_id,
        "additional_minutes": 10,
        "reason": "Testing time extension"
    }
    response = requests.post(f"{BASE_URL}/tests/session/{session_id}/extend-time", json=data, headers=headers)
    return response.status_code == 200, response.json()

def get_test_results(token):
    """Get test results"""
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/tests/results", headers=headers)
    return response.status_code == 200, response.json()

def get_analytics(token):
    """Get test analytics"""
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/tests/analytics", headers=headers)
    return response.status_code == 200, response.json()

def main():
    print("🧪 Testing Phase 4: Test Taking System Functionality")
    print("=" * 60)
    
    # Login
    candidate_token = login_candidate()
    officer_token = login_officer()
    
    if not candidate_token or not officer_token:
        print("❌ Failed to login")
        return
    
    print("✅ Logged in successfully")
    
    # Get candidate profile
    candidate_profile = get_candidate_profile(candidate_token)
    if not candidate_profile:
        print("❌ Failed to get candidate profile")
        return
    
    candidate_id = candidate_profile['id']
    print(f"✅ Got candidate profile: {candidate_profile['full_name']}")
    
    # Get test configurations
    test_configs = get_test_configs(candidate_token)
    if not test_configs:
        print("❌ No test configurations found")
        return
    
    test_config_id = test_configs[0]['id']
    print(f"✅ Using test config: {test_configs[0]['name']}")
    
    # Start test session
    success, session_data = start_test_session(candidate_token, test_config_id, candidate_id)
    if not success:
        print(f"❌ Failed to start test session: {session_data}")
        return
    
    session_id = session_data['id']
    print(f"✅ Started test session: {session_id}")
    
    # Get first few questions and answer them
    answers = []
    for i in range(5):  # Answer first 5 questions
        success, question_data = get_question(candidate_token, session_id, i)
        if success:
            question_id = question_data['id']
            question_type = question_data['question_type']
            
            if question_type == 'multiple_choice':
                # Select first option
                success, _ = save_answer(candidate_token, session_id, question_id, 'multiple_choice', 'A')
                answers.append({
                    "question_id": question_id,
                    "selected_option": "A",
                    "is_bookmarked": False
                })
            else:
                # Answer True for true/false
                success, _ = save_answer(candidate_token, session_id, question_id, 'true_false', True)
                answers.append({
                    "question_id": question_id,
                    "boolean_answer": True,
                    "is_bookmarked": False
                })
            
            if success:
                print(f"✅ Answered question {i+1} ({question_type})")
            else:
                print(f"❌ Failed to answer question {i+1}")
    
    # Test time extension (as officer)
    success, extension_result = extend_time(officer_token, session_id)
    if success:
        print("✅ Extended test time successfully")
    else:
        print(f"❌ Failed to extend time: {extension_result}")
    
    # Submit test
    success, result_data = submit_test(candidate_token, session_id, answers)
    if success:
        score = result_data.get('score_percentage', 0)
        passed = result_data.get('passed', False)
        print(f"✅ Test submitted successfully - Score: {score}%, Passed: {passed}")
    else:
        print(f"❌ Failed to submit test: {result_data}")
    
    # Get test results
    success, results = get_test_results(candidate_token)
    if success:
        print(f"✅ Retrieved {len(results)} test results")
    else:
        print(f"❌ Failed to get results: {results}")
    
    # Get analytics (as officer)
    success, analytics = get_analytics(officer_token)
    if success:
        total_sessions = analytics.get('total_sessions', 0)
        pass_rate = analytics.get('pass_rate', 0)
        print(f"✅ Analytics: {total_sessions} sessions, {pass_rate:.1f}% pass rate")
    else:
        print(f"❌ Failed to get analytics: {analytics}")
    
    print("\n🎉 Phase 4 Test Taking System verification completed!")

if __name__ == "__main__":
    main()