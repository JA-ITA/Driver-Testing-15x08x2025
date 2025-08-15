#!/usr/bin/env python3
"""
Phase 7 Only Testing Script
"""

import requests
import json

def test_phase7_endpoints():
    base_url = "https://testbank-revive.preview.emergentagent.com/api"
    
    # First login as admin
    admin_login = {
        'username': 'admin@ita.gov',
        'password': 'admin123'
    }
    
    response = requests.post(f"{base_url}/auth/login", data=admin_login)
    if response.status_code != 200:
        print(f"❌ Admin login failed: {response.text}")
        return
    
    admin_token = response.json()['access_token']
    headers = {'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'}
    
    print("🔑 Admin login successful")
    
    # Test special test categories endpoint
    print("\n🚗 Testing Special Test Categories API")
    
    category_data = {
        "name": "Public Passenger Vehicle (PPV)",
        "description": "Commercial license for public passenger transport",
        "category_code": "PPV",
        "requirements": [
            "Valid driver's license for at least 2 years",
            "Medical certificate",
            "Clean driving record"
        ],
        "is_active": True
    }
    
    response = requests.post(f"{base_url}/special-test-categories", json=category_data, headers=headers)
    print(f"Create Special Category: {response.status_code} - {response.text}")
    
    # Test get special categories
    response = requests.get(f"{base_url}/special-test-categories", headers=headers)
    print(f"Get Special Categories: {response.status_code} - {response.text}")
    
    # Test resit endpoints
    print("\n🔄 Testing Resit Management APIs")
    response = requests.get(f"{base_url}/resits/all", headers=headers)
    print(f"Get All Resits: {response.status_code} - {response.text}")
    
    # Test failed stages analytics
    print("\n📊 Testing Failed Stages Analytics")
    response = requests.get(f"{base_url}/failed-stages/analytics", headers=headers)
    print(f"Get Failed Stages Analytics: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_phase7_endpoints()