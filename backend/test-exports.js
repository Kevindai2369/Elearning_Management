// Test what's being exported from contentController
const controller = require('./src/controllers/contentController');

console.log('Exported functions:');
console.log(Object.keys(controller));

console.log('\nChecking specific functions:');
console.log('createAnnouncement:', typeof controller.createAnnouncement);
console.log('createAssignment:', typeof controller.createAssignment);
console.log('getAssignments:', typeof controller.getAssignments);
console.log('submitAssignment:', typeof controller.submitAssignment);
console.log('getAssignmentSubmissions:', typeof controller.getAssignmentSubmissions);
console.log('gradeAssignment:', typeof controller.gradeAssignment);
