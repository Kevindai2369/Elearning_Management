/**
 * Test script for Smart Import logic
 * This script tests the three duplicate handling strategies: skip, update, and suffix
 */

const bulkImportService = require('./src/services/bulkImportService');
const { sequelize } = require('./src/config/database');
const { User, Student } = require('./src/models');

// Test data
const testRecords = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    student_code: 'STU001',
    phone: '1234567890',
    _rowNumber: 1
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    student_code: 'STU002',
    phone: '0987654321',
    _rowNumber: 2
  },
  {
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    student_code: 'STU003',
    phone: '5555555555',
    _rowNumber: 3
  }
];

// Duplicate records (same email as first record)
const duplicateRecords = [
  {
    name: 'John Doe Updated',
    email: 'john.doe@example.com',
    student_code: 'STU001',
    phone: '9999999999',
    _rowNumber: 4
  }
];

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Delete test students
  const testEmails = [
    'john.doe@example.com',
    'jane.smith@example.com',
    'bob.johnson@example.com',
    'john.doe_1@example.com',
    'john.doe_2@example.com'
  ];
  
  const testUsers = await User.findAll({
    where: {
      email: testEmails
    },
    include: [{ model: Student, as: 'student' }]
  });
  
  for (const user of testUsers) {
    if (user.student) {
      await user.student.destroy();
    }
    await user.destroy();
  }
  
  console.log('✅ Cleanup completed');
}

async function testSkipStrategy() {
  console.log('\n📋 Testing SKIP strategy...');
  console.log('=' .repeat(50));
  
  // First import
  console.log('\n1️⃣ First import (should create 3 students)');
  const result1 = await bulkImportService.processBulkImport(testRecords, 'skip');
  console.log(`   Created: ${result1.created}, Skipped: ${result1.skipped}, Failed: ${result1.failed}`);
  
  if (result1.created !== 3) {
    console.error('❌ FAILED: Expected 3 created, got', result1.created);
    return false;
  }
  
  // Second import with duplicate
  console.log('\n2️⃣ Second import with duplicate (should skip 1)');
  const result2 = await bulkImportService.processBulkImport(duplicateRecords, 'skip');
  console.log(`   Created: ${result2.created}, Skipped: ${result2.skipped}, Failed: ${result2.failed}`);
  
  if (result2.skipped !== 1) {
    console.error('❌ FAILED: Expected 1 skipped, got', result2.skipped);
    return false;
  }
  
  console.log('✅ SKIP strategy test passed');
  return true;
}

async function testUpdateStrategy() {
  console.log('\n📋 Testing UPDATE strategy...');
  console.log('=' .repeat(50));
  
  await cleanup();
  
  // First import
  console.log('\n1️⃣ First import (should create 3 students)');
  const result1 = await bulkImportService.processBulkImport(testRecords, 'update');
  console.log(`   Created: ${result1.created}, Updated: ${result1.updated}, Failed: ${result1.failed}`);
  
  if (result1.created !== 3) {
    console.error('❌ FAILED: Expected 3 created, got', result1.created);
    return false;
  }
  
  // Second import with duplicate (should update)
  console.log('\n2️⃣ Second import with duplicate (should update 1)');
  const result2 = await bulkImportService.processBulkImport(duplicateRecords, 'update');
  console.log(`   Created: ${result2.created}, Updated: ${result2.updated}, Failed: ${result2.failed}`);
  
  if (result2.updated !== 1) {
    console.error('❌ FAILED: Expected 1 updated, got', result2.updated);
    return false;
  }
  
  // Verify the update
  const updatedUser = await User.findOne({
    where: { email: 'john.doe@example.com' },
    include: [{ model: Student, as: 'student' }]
  });
  
  if (updatedUser.name !== 'John Doe Updated') {
    console.error('❌ FAILED: Name was not updated');
    return false;
  }
  
  if (updatedUser.student.phone !== '9999999999') {
    console.error('❌ FAILED: Phone was not updated');
    return false;
  }
  
  console.log('✅ UPDATE strategy test passed');
  return true;
}

async function testSuffixStrategy() {
  console.log('\n📋 Testing SUFFIX strategy...');
  console.log('=' .repeat(50));
  
  await cleanup();
  
  // First import
  console.log('\n1️⃣ First import (should create 3 students)');
  const result1 = await bulkImportService.processBulkImport(testRecords, 'suffix');
  console.log(`   Created: ${result1.created}, Skipped: ${result1.skipped}, Failed: ${result1.failed}`);
  
  if (result1.created !== 3) {
    console.error('❌ FAILED: Expected 3 created, got', result1.created);
    return false;
  }
  
  // Second import with duplicate email but different student code
  const suffixRecord = [{
    name: 'John Doe Duplicate',
    email: 'john.doe@example.com',
    student_code: 'STU004', // Different student code
    phone: '1111111111',
    _rowNumber: 5
  }];
  
  console.log('\n2️⃣ Second import with duplicate email (should create with suffix)');
  const result2 = await bulkImportService.processBulkImport(suffixRecord, 'suffix');
  console.log(`   Created: ${result2.created}, Skipped: ${result2.skipped}, Failed: ${result2.failed}`);
  
  if (result2.created !== 1) {
    console.error('❌ FAILED: Expected 1 created, got', result2.created);
    return false;
  }
  
  // Verify the suffix was applied
  const suffixedUser = await User.findOne({
    where: { email: 'john.doe_1@example.com' }
  });
  
  if (!suffixedUser) {
    console.error('❌ FAILED: User with suffix email not found');
    return false;
  }
  
  console.log(`   ✓ Created user with email: ${suffixedUser.email}`);
  console.log('✅ SUFFIX strategy test passed');
  return true;
}

async function testBatchProcessing() {
  console.log('\n📋 Testing BATCH processing (100 records per batch)...');
  console.log('=' .repeat(50));
  
  await cleanup();
  
  // Create 150 records to test batch processing
  const largeRecordSet = [];
  for (let i = 1; i <= 150; i++) {
    largeRecordSet.push({
      name: `Student ${i}`,
      email: `student${i}@example.com`,
      student_code: `STU${String(i).padStart(4, '0')}`,
      phone: `555${String(i).padStart(7, '0')}`,
      _rowNumber: i
    });
  }
  
  console.log(`\n1️⃣ Importing ${largeRecordSet.length} records...`);
  const startTime = Date.now();
  const result = await bulkImportService.processBulkImport(largeRecordSet, 'skip');
  const endTime = Date.now();
  
  console.log(`   Created: ${result.created}, Failed: ${result.failed}`);
  console.log(`   Time taken: ${endTime - startTime}ms`);
  
  if (result.created !== 150) {
    console.error('❌ FAILED: Expected 150 created, got', result.created);
    return false;
  }
  
  // Cleanup large dataset
  const emails = largeRecordSet.map(r => r.email);
  const users = await User.findAll({
    where: { email: emails },
    include: [{ model: Student, as: 'student' }]
  });
  
  for (const user of users) {
    if (user.student) {
      await user.destroy();
    }
    await user.destroy();
  }
  
  console.log('✅ BATCH processing test passed');
  return true;
}

async function runTests() {
  console.log('\n🚀 Starting Smart Import Tests');
  console.log('=' .repeat(50));
  
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Run tests
    const skipPassed = await testSkipStrategy();
    const updatePassed = await testUpdateStrategy();
    const suffixPassed = await testSuffixStrategy();
    const batchPassed = await testBatchProcessing();
    
    // Final cleanup
    await cleanup();
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Summary');
    console.log('=' .repeat(50));
    console.log(`SKIP strategy:   ${skipPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`UPDATE strategy: ${updatePassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`SUFFIX strategy: ${suffixPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`BATCH processing: ${batchPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    const allPassed = skipPassed && updatePassed && suffixPassed && batchPassed;
    
    if (allPassed) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
