/**
 * Test script for Assignment API endpoints
 * This script tests all assignment-related endpoints
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Test data
let authToken = '';
let courseId = '';
let assignmentId = '';
let submissionId = '';

// Helper function to log test results
function logTest(testName, success, data = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${testName}`);
  console.log(`STATUS: ${success ? '✓ PASSED' : '✗ FAILED'}`);
  if (data) {
    console.log('RESPONSE:', JSON.stringify(data, null, 2));
  }
  console.log('='.repeat(60));
}

// Test 1: Login as instructor
async function testLogin() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin'
    });
    
    authToken = response.data.data.token;
    logTest('Login as Instructor', true, { token: authToken.substring(0, 20) + '...' });
    return true;
  } catch (error) {
    logTest('Login as Instructor', false, error.response?.data || error.message);
    return false;
  }
}

// Test 2: Get courses to find a course ID
async function getCourse() {
  try {
    const response = await axios.get(`${API_BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.data.courses.length > 0) {
      courseId = response.data.data.courses[0].id;
      logTest('Get Course', true, { courseId });
      return true;
    } else {
      logTest('Get Course', false, 'No courses found');
      return false;
    }
  } catch (error) {
    logTest('Get Course', false, error.response?.data || error.message);
    return false;
  }
}

// Test 3: Create assignment
async function testCreateAssignment() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/courses/${courseId}/assignments`,
      {
        title: 'Test Assignment - API Verification',
        description: 'This is a test assignment created by the API test script',
        attachments: [],
        target_groups: [],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        point_value: 100
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    assignmentId = response.data.data.id;
    logTest('Create Assignment', true, response.data.data);
    return true;
  } catch (error) {
    logTest('Create Assignment', false, error.response?.data || error.message);
    return false;
  }
}

// Test 4: Get assignments for course
async function testGetAssignments() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/courses/${courseId}/assignments`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    logTest('Get Assignments', true, {
      total: response.data.data.pagination.total,
      assignments: response.data.data.assignments.length
    });
    return true;
  } catch (error) {
    logTest('Get Assignments', false, error.response?.data || error.message);
    return false;
  }
}

// Test 5: Get assignment submissions (should be empty initially)
async function testGetSubmissions() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/assignments/${assignmentId}/submissions`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    logTest('Get Assignment Submissions', true, {
      total: response.data.data.pagination.total,
      submissions: response.data.data.submissions.length
    });
    return true;
  } catch (error) {
    logTest('Get Assignment Submissions', false, error.response?.data || error.message);
    return false;
  }
}

// Test 6: Submit assignment as student (will fail if no student account)
async function testSubmitAssignment() {
  try {
    // First, login as a student
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'student@example.com',
      password: 'student123'
    });
    
    const studentToken = loginResponse.data.data.token;
    
    const response = await axios.post(
      `${API_BASE_URL}/assignments/${assignmentId}/submit`,
      {
        content: 'This is my test submission',
        attachments: []
      },
      {
        headers: { Authorization: `Bearer ${studentToken}` }
      }
    );
    
    submissionId = response.data.data.id;
    logTest('Submit Assignment (Student)', true, response.data.data);
    return true;
  } catch (error) {
    logTest('Submit Assignment (Student)', false, error.response?.data || error.message);
    console.log('Note: This test requires a student account. Skipping...');
    return false;
  }
}

// Test 7: Grade assignment submission
async function testGradeSubmission() {
  if (!submissionId) {
    console.log('\nSkipping grade test - no submission available');
    return false;
  }
  
  try {
    const response = await axios.put(
      `${API_BASE_URL}/assignments/${submissionId}/grade`,
      {
        grade: 85,
        feedback: 'Good work! Keep it up.'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    logTest('Grade Assignment Submission', true, response.data.data);
    return true;
  } catch (error) {
    logTest('Grade Assignment Submission', false, error.response?.data || error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('ASSIGNMENT API TEST SUITE');
  console.log('='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Run tests sequentially
  if (await testLogin()) results.passed++; else results.failed++;
  if (await getCourse()) results.passed++; else results.failed++;
  if (await testCreateAssignment()) results.passed++; else results.failed++;
  if (await testGetAssignments()) results.passed++; else results.failed++;
  if (await testGetSubmissions()) results.passed++; else results.failed++;
  if (await testSubmitAssignment()) results.passed++; else results.failed++;
  if (await testGradeSubmission()) results.passed++; else results.failed++;
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('='.repeat(60) + '\n');
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_BASE_URL}/health`);
    return true;
  } catch (error) {
    console.error('\n❌ ERROR: Server is not running!');
    console.error('Please start the server with: npm run dev');
    console.error('Then run this test script again.\n');
    return false;
  }
}

// Main execution
(async () => {
  if (await checkServer()) {
    await runTests();
  }
})();
