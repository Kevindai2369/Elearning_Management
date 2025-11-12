const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

/**
 * @route   POST /api/students/validate-csv
 * @desc    Validate CSV file for preview
 * @access  Private (Instructor only)
 */
router.post('/validate-csv', authenticate, authorize('instructor'), studentController.validateCSV);

/**
 * @route   POST /api/students/bulk-import
 * @desc    Bulk import students from CSV
 * @access  Private (Instructor only)
 */
router.post('/bulk-import', authenticate, authorize('instructor'), studentController.bulkImport);

/**
 * @route   GET /api/students
 * @desc    Get all students with search, filter, sort, and pagination
 * @access  Private (Instructor only)
 */
router.get('/', authenticate, authorize('instructor'), studentController.getStudents);

/**
 * @route   POST /api/students
 * @desc    Create new student with user account
 * @access  Private (Instructor only)
 */
router.post('/', authenticate, authorize('instructor'), studentController.createStudent);

/**
 * @route   GET /api/students/:id
 * @desc    Get student by ID
 * @access  Private
 */
router.get('/:id', authenticate, studentController.getStudentById);

/**
 * @route   PUT /api/students/:id
 * @desc    Update student
 * @access  Private (Instructor only)
 */
router.put('/:id', authenticate, authorize('instructor'), studentController.updateStudent);

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete student (cascade delete)
 * @access  Private (Instructor only)
 */
router.delete('/:id', authenticate, authorize('instructor'), studentController.deleteStudent);

/**
 * @route   POST /api/students/:id/enroll
 * @desc    Enroll student in courses
 * @access  Private (Instructor only)
 */
router.post('/:id/enroll', authenticate, authorize('instructor'), studentController.enrollStudent);

module.exports = router;
