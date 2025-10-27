#!/usr/bin/env python3
"""
Script to create staff users (Field Team and Admin) for AquaClean platform
"""

import requests
import json

API_URL = "https://sump-solution.preview.emergentagent.com/api"

def create_field_team(name, email, phone, employee_id, password):
    """Create a field team member"""
    data = {
        "name": name,
        "email": email,
        "phone": phone,
        "employee_id": employee_id,
        "password": password
    }
    
    response = requests.post(f"{API_URL}/field/register", json=data)
    
    if response.status_code == 200:
        print(f"✓ Field team member created: {name} ({email})")
        return True
    else:
        print(f"✗ Failed to create field team member: {response.json().get('detail', 'Unknown error')}")
        return False

def create_admin(name, email, password, role="admin"):
    """Create an admin user"""
    data = {
        "name": name,
        "email": email,
        "password": password,
        "role": role
    }
    
    response = requests.post(f"{API_URL}/admin/register", json=data)
    
    if response.status_code == 200:
        print(f"✓ Admin user created: {name} ({email})")
        return True
    else:
        print(f"✗ Failed to create admin: {response.json().get('detail', 'Unknown error')}")
        return False

def main():
    print("=== AquaClean Staff User Creation ===\n")
    
    while True:
        print("\nSelect user type to create:")
        print("1. Field Team Member")
        print("2. Admin User")
        print("3. Exit")
        
        choice = input("\nEnter choice (1-3): ").strip()
        
        if choice == "1":
            print("\n--- Create Field Team Member ---")
            name = input("Full Name: ").strip()
            email = input("Email: ").strip()
            phone = input("Phone: ").strip()
            employee_id = input("Employee ID: ").strip()
            password = input("Password: ").strip()
            
            if name and email and phone and employee_id and password:
                create_field_team(name, email, phone, employee_id, password)
            else:
                print("✗ All fields are required")
                
        elif choice == "2":
            print("\n--- Create Admin User ---")
            name = input("Full Name: ").strip()
            email = input("Email: ").strip()
            password = input("Password: ").strip()
            
            if name and email and password:
                create_admin(name, email, password)
            else:
                print("✗ All fields are required")
                
        elif choice == "3":
            print("\nExiting...")
            break
        else:
            print("✗ Invalid choice")

if __name__ == "__main__":
    main()
