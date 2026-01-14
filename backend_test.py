import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class AICompanionAPITester:
    def __init__(self, base_url="https://digital-friend-71.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_register(self):
        """Test user registration"""
        test_user = f"testuser_{datetime.now().strftime('%H%M%S')}"
        user_data = {
            "username": test_user,
            "email": f"{test_user}@test.com",
            "password": "TestPass123!"
        }
        
        response = self.run_test("User Registration", "POST", "auth/register", 200, user_data)
        if response:
            self.token = response.get('access_token')
            self.user_id = response.get('user', {}).get('id')
            return True
        return False

    def test_login(self):
        """Test user login with existing credentials"""
        if not self.token:
            return False
            
        # Create a new user for login test
        test_user = f"logintest_{datetime.now().strftime('%H%M%S')}"
        register_data = {
            "username": test_user,
            "email": f"{test_user}@test.com",
            "password": "LoginTest123!"
        }
        
        # Register first
        register_response = self.run_test("Register for Login Test", "POST", "auth/register", 200, register_data)
        if not register_response:
            return False
        
        # Now test login
        login_data = {
            "username": test_user,
            "password": "LoginTest123!"
        }
        
        response = self.run_test("User Login", "POST", "auth/login", 200, login_data)
        return response is not None

    def test_profile(self):
        """Test getting user profile"""
        response = self.run_test("Get Profile", "GET", "profile", 200)
        return response is not None

    def test_personality_quiz(self):
        """Test personality quiz endpoints"""
        # Get quiz questions
        quiz_response = self.run_test("Get Personality Quiz", "GET", "personality/quiz", 200)
        if not quiz_response:
            return False
        
        # Update personality profile
        answers = [
            {
                "question_id": "communication",
                "question": "How do you prefer to communicate?",
                "answer": "Direct and concise"
            },
            {
                "question_id": "motivation", 
                "question": "What motivates you most?",
                "answer": "Achievement and success"
            }
        ]
        
        update_response = self.run_test("Update Personality Profile", "POST", "personality/update", 200, {"answers": answers})
        return update_response is not None

    def test_task_management(self):
        """Test task CRUD operations"""
        # Create task
        task_data = {
            "title": "Test Task",
            "description": "This is a test task",
            "priority": "high"
        }
        
        create_response = self.run_test("Create Task", "POST", "tasks", 200, task_data)
        if not create_response:
            return False
        
        task_id = create_response.get('id')
        if not task_id:
            self.log_test("Create Task - Get ID", False, "No task ID returned")
            return False
        
        # Get all tasks
        tasks_response = self.run_test("Get All Tasks", "GET", "tasks", 200)
        if not tasks_response:
            return False
        
        # Update task
        update_data = {
            "title": "Updated Test Task",
            "completed": True
        }
        
        update_response = self.run_test("Update Task", "PUT", f"tasks/{task_id}", 200, update_data)
        if not update_response:
            return False
        
        # Delete task
        delete_response = self.run_test("Delete Task", "DELETE", f"tasks/{task_id}", 200)
        return delete_response is not None

    def test_chat_functionality(self):
        """Test AI chat functionality"""
        chat_data = {
            "message": "Hello, how are you today?",
            "session_id": str(uuid.uuid4())
        }
        
        # This might take longer due to AI processing
        print("Testing AI chat (this may take a few seconds)...")
        response = self.run_test("AI Chat", "POST", "chat", 200, chat_data)
        
        if response:
            # Test getting chat history
            session_id = response.get('session_id')
            if session_id:
                history_response = self.run_test("Get Chat History", "GET", f"chat/history/{session_id}", 200)
                return history_response is not None
        
        return response is not None

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AI Companion API Tests")
        print("=" * 50)
        
        # Health check first
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
        
        # Authentication tests
        if not self.test_register():
            print("❌ Registration failed - stopping tests")
            return False
        
        if not self.test_login():
            print("❌ Login test failed")
        
        if not self.test_profile():
            print("❌ Profile test failed")
        
        # Feature tests
        if not self.test_personality_quiz():
            print("❌ Personality quiz tests failed")
        
        if not self.test_task_management():
            print("❌ Task management tests failed")
        
        if not self.test_chat_functionality():
            print("❌ Chat functionality tests failed")
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Save detailed results
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump({
                'summary': {
                    'total_tests': self.tests_run,
                    'passed_tests': self.tests_passed,
                    'success_rate': (self.tests_passed/self.tests_run)*100,
                    'timestamp': datetime.now().isoformat()
                },
                'test_results': self.test_results
            }, f, indent=2)
        
        return self.tests_passed == self.tests_run

def main():
    tester = AICompanionAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())