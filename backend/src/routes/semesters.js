const express = require('express');
const router = express.Router();
const semesterController = require('../controllers/semesterController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

/**
 * @route   GET /api/semesters
 * @desc    Get all semesters with pagination
 * @access  Private
 */
router.get('/', authenticate, semesterController.getSemesters);

/**
 * @route   GET /api/semesters/:id
 * @desc    Get semester by ID
 * @access  Private
 */
router.get('/:id', authenticate, semesterController.getSemesterById);

/**
 * @route   POST /api/semesters
 * @desc    Create new semester
 * @access  Private (Instructor only)
 */
router.post('/', authenticate, authorize('instructor'), semesterController.createSemester);

/**
 * @route   PUT /api/semesters/:id
 * @desc    Update semester
 * @access  Private (Instructor only)
 */
router.put('/:id', authenticate, authorize('instructor'), semesterController.updateSemester);

/**
 * @route   DELETE /api/semesters/:id
 * @desc    Delete semester (cascade delete courses)
 * @access  Private (Instructor only)
 */
router.delete('/:id', authenticate, authorize('instructor'), semesterController.deleteSemester);

module.exports = router;
