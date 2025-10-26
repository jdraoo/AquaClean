#!/usr/bin/env python3
"""
Backend API Testing for Tank and Sump Hygiene Services Platform
Tests all authentication, address, booking, and payment endpoints
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import random
import string

class TankHygieneAPITester:
    def __init__(self, base_url="https://aquatrack-37.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_email = f"test_{random.randint(1000, 9999)}@example.com"
        self.test_password = "TestPass123!"
        self.test_name = "Test User"
        self.test_phone = "9876543210"

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "details": details
        })

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                try:
                    error_detail = response.json().get('detail', f'Status: {response.status_code}')
                except:
                    error_detail = f'Status: {response.status_code}, Response: {response.text[:200]}'
                return False, error_detail

        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}"

    def test_user_registration(self):
        """Test user registration"""
        success, response = self.make_request('POST', 'auth/register', {
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name,
            "phone": self.test_phone
        })
        
        self.log_test("User Registration", success, 
                     "" if success else response)
        return success

    def test_send_otp(self):
        """Test sending OTP"""
        success, response = self.make_request('POST', 'auth/send-otp', {
            "email": self.test_email
        })
        
        if success and 'otp' in response:
            self.otp = response['otp']  # Store OTP for verification
            
        self.log_test("Send OTP", success, 
                     "" if success else response)
        return success

    def test_verify_otp(self):
        """Test OTP verification"""
        if not hasattr(self, 'otp'):
            self.log_test("Verify OTP", False, "No OTP available")
            return False
            
        success, response = self.make_request('POST', 'auth/verify-otp', {
            "email": self.test_email,
            "otp": self.otp
        })
        
        self.log_test("Verify OTP", success, 
                     "" if success else response)
        return success

    def test_user_login(self):
        """Test user login"""
        success, response = self.make_request('POST', 'auth/login', {
            "email": self.test_email,
            "password": self.test_password
        })
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response['user']
            
        self.log_test("User Login", success, 
                     "" if success else response)
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.make_request('GET', 'auth/me')
        
        self.log_test("Get Current User", success, 
                     "" if success else response)
        return success

    def test_create_address(self):
        """Test creating an address"""
        success, response = self.make_request('POST', 'addresses', {
            "name": "Test Home",
            "address_line": "123 Test Street, Test Area",
            "landmark": "Near Test Mall"
        }, expected_status=200)
        
        if success and 'id' in response:
            self.address_id = response['id']
            
        self.log_test("Create Address", success, 
                     "" if success else response)
        return success

    def test_get_addresses(self):
        """Test getting user addresses"""
        success, response = self.make_request('GET', 'addresses')
        
        self.log_test("Get Addresses", success, 
                     "" if success else response)
        return success

    def test_create_booking(self):
        """Test creating a booking"""
        if not hasattr(self, 'address_id'):
            self.log_test("Create Booking", False, "No address available")
            return False
            
        # Calculate future date
        future_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        
        success, response = self.make_request('POST', 'bookings', {
            "address_id": self.address_id,
            "tank_type": "overhead",
            "tank_capacity": "1000",
            "service_date": future_date,
            "service_time": "09:00",
            "package_type": "manual",
            "add_disinfection": True,
            "add_maintenance": False,
            "add_repair": False,
            "payment_method": "cod"
        }, expected_status=200)
        
        if success and 'id' in response:
            self.booking_id = response['id']
            
        self.log_test("Create Booking", success, 
                     "" if success else response)
        return success

    def test_get_bookings(self):
        """Test getting user bookings"""
        success, response = self.make_request('GET', 'bookings')
        
        self.log_test("Get Bookings", success, 
                     "" if success else response)
        return success

    def test_get_specific_booking(self):
        """Test getting a specific booking"""
        if not hasattr(self, 'booking_id'):
            self.log_test("Get Specific Booking", False, "No booking available")
            return False
            
        success, response = self.make_request('GET', f'bookings/{self.booking_id}')
        
        self.log_test("Get Specific Booking", success, 
                     "" if success else response)
        return success

    def test_create_payment_order_cod(self):
        """Test creating payment order for COD"""
        if not hasattr(self, 'booking_id'):
            self.log_test("Create Payment Order (COD)", False, "No booking available")
            return False
            
        success, response = self.make_request('POST', 'payments/create-order', {
            "booking_id": self.booking_id
        })
        
        self.log_test("Create Payment Order (COD)", success, 
                     "" if success else response)
        return success

    def test_delete_address(self):
        """Test deleting an address (cleanup)"""
        if not hasattr(self, 'address_id'):
            return True  # Nothing to delete
            
        success, response = self.make_request('DELETE', f'addresses/{self.address_id}')
        
        self.log_test("Delete Address", success, 
                     "" if success else response)
        return success

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Tank Hygiene API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print(f"📧 Test email: {self.test_email}")
        print("=" * 60)

        # Authentication flow
        print("\n🔐 Testing Authentication Flow:")
        if not self.test_user_registration():
            print("❌ Registration failed - stopping tests")
            return False
            
        if not self.test_send_otp():
            print("❌ OTP sending failed - stopping tests")
            return False
            
        if not self.test_verify_otp():
            print("❌ OTP verification failed - stopping tests")
            return False
            
        if not self.test_user_login():
            print("❌ Login failed - stopping tests")
            return False
            
        self.test_get_current_user()

        # Address management
        print("\n🏠 Testing Address Management:")
        if not self.test_create_address():
            print("❌ Address creation failed - continuing with other tests")
        else:
            self.test_get_addresses()

        # Booking management
        print("\n📅 Testing Booking Management:")
        if not self.test_create_booking():
            print("❌ Booking creation failed - continuing with other tests")
        else:
            self.test_get_bookings()
            self.test_get_specific_booking()

        # Payment testing
        print("\n💳 Testing Payment Flow:")
        self.test_create_payment_order_cod()

        # Cleanup
        print("\n🧹 Cleanup:")
        self.test_delete_address()

        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if r['status'] == 'FAILED']
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = TankHygieneAPITester()
    
    try:
        tester.run_all_tests()
        success = tester.print_summary()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())