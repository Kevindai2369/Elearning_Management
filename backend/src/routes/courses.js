const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

/**
 * @route   GET /api/courses
 * @desc    Get all courses with search, filter, sort, and pagination
 * @access  Private
 */
router.get('/', authenticate, courseController.getCourses);

/**
 * @route   GET /api/courses/:id
 * @desc    Get course by ID
 * @access  Private
 */
router.get('/:id', authenticate, courseController.getCourseById);

/**
 * @route   POST /api/courses
 * @desc    Create new course
 * @access  Private (Instructor only)
 */
router.post('/', authenticate, authorize('instructor'), courseController.createCourse);

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course
 * @access  Private (Instructor only)
 */
router.put('/:id', authenticate, authorize('instructor'), courseController.updateCourse);

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete course (cascade delete content)
 * @access  Private (Instructor only)
 */
router.delete('/:id', authenticate, authorize('instructor'), courseController.deleteCourse);

module.exports = router;
