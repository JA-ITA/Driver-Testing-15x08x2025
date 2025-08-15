#!/usr/bin/env python3
"""
Fix test session issue by creating and approving enough questions
"""

import requests
import json

BASE_URL = "https://question-hub-8.preview.emergentagent.com/api"

def login_admin():
    """Login as admin"""
    login_data = {
        'username': 'admin@ita.gov',
        'password': 'admin123'
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

def get_categories(token):
    """Get all categories"""
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{BASE_URL}/categories", headers=headers)
    if response.status_code == 200:
        return response.json()
    return []

def create_questions(officer_token, category_id, count=30):
    """Create multiple questions"""
    headers = {'Authorization': f'Bearer {officer_token}', 'Content-Type': 'application/json'}
    created_questions = []
    
    # Create multiple choice questions
    for i in range(count // 2):
        question_data = {
            "category_id": category_id,
            "question_type": "multiple_choice",
            "question_text": f"Multiple choice question {i+1}: What is the correct driving procedure?",
            "options": [
                {"text": f"Option A for question {i+1}", "is_correct": True},
                {"text": f"Option B for question {i+1}", "is_correct": False},
                {"text": f"Option C for question {i+1}", "is_correct": False},
                {"text": f"Option D for question {i+1}", "is_correct": False}
            ],
            "explanation": f"Explanation for question {i+1}",
            "difficulty": "easy" if i % 3 == 0 else "medium" if i % 3 == 1 else "hard"
        }
        
        response = requests.post(f"{BASE_URL}/questions", json=question_data, headers=headers)
        if response.status_code == 200:
            created_questions.append(response.json().get('question_id'))
            print(f"✅ Created MC question {i+1}")
    
    # Create true/false questions
    for i in range(count // 2):
        question_data = {
            "category_id": category_id,
            "question_type": "true_false",
            "question_text": f"True/False question {i+1}: This driving rule is correct.",
            "correct_answer": True if i % 2 == 0 else False,
            "explanation": f"Explanation for T/F question {i+1}",
            "difficulty": "easy" if i % 3 == 0 else "medium" if i % 3 == 1 else "hard"
        }
        
        response = requests.post(f"{BASE_URL}/questions", json=question_data, headers=headers)
        if response.status_code == 200:
            created_questions.append(response.json().get('question_id'))
            print(f"✅ Created T/F question {i+1}")
    
    return created_questions

def approve_questions(admin_token, question_ids):
    """Approve all questions"""
    headers = {'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'}
    approved_count = 0
    
    for question_id in question_ids:
        approval_data = {
            "question_id": question_id,
            "action": "approve",
            "notes": "Auto-approved for testing"
        }
        
        response = requests.post(f"{BASE_URL}/questions/approve", json=approval_data, headers=headers)
        if response.status_code == 200:
            approved_count += 1
    
    print(f"✅ Approved {approved_count} questions")
    return approved_count

def get_pending_questions(admin_token):
    """Get all pending questions"""
    headers = {'Authorization': f'Bearer {admin_token}'}
    response = requests.get(f"{BASE_URL}/questions/pending", headers=headers)
    if response.status_code == 200:
        return response.json()
    return []

def main():
    print("🔧 Fixing test session issue by creating and approving questions...")
    
    # Login
    admin_token = login_admin()
    officer_token = login_officer()
    
    if not admin_token or not officer_token:
        print("❌ Failed to login")
        return
    
    print("✅ Logged in successfully")
    
    # Get categories
    categories = get_categories(admin_token)
    if not categories:
        print("❌ No categories found")
        return
    
    category_id = categories[0]['id']
    print(f"✅ Using category: {categories[0]['name']}")
    
    # Get existing pending questions
    pending_questions = get_pending_questions(admin_token)
    existing_question_ids = [q['id'] for q in pending_questions]
    
    print(f"📝 Found {len(existing_question_ids)} existing pending questions")
    
    # Create more questions if needed
    total_needed = 30
    if len(existing_question_ids) < total_needed:
        questions_to_create = total_needed - len(existing_question_ids)
        print(f"📝 Creating {questions_to_create} additional questions...")
        new_question_ids = create_questions(officer_token, category_id, questions_to_create)
        existing_question_ids.extend(new_question_ids)
    
    # Approve all questions
    print(f"✅ Approving {len(existing_question_ids)} questions...")
    approved_count = approve_questions(admin_token, existing_question_ids)
    
    print(f"🎉 Successfully approved {approved_count} questions!")
    print("✅ Test sessions should now work properly")

if __name__ == "__main__":
    main()