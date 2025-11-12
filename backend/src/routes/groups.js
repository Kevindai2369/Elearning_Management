const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

/**
 * @route   GET /api/courses/:courseId/groups
 * @desc    Get all groups for a course
 * @access  Private
 */
router.get('/courses/:courseId/groups', authenticate, groupController.getGroupsByCourse);

/**
 * @route   POST /api/courses/:courseId/groups
 * @desc    Create new group in a course
 * @access  Private (Instructor only)
 */
router.post('/courses/:courseId/groups', authenticate, authorize('instructor'), groupController.createGroup);

/**
 * @route   GET /api/groups/:id
 * @desc    Get group by ID with member count
 * @access  Private
 */
router.get('/:id', authenticate, groupController.getGroupById);

/**
 * @route   PUT /api/groups/:id
 * @desc    Update group
 * @access  Private (Instructor only)
 */
router.put('/:id', authenticate, authorize('instructor'), groupController.updateGroup);

/**
 * @route   DELETE /api/groups/:id
 * @desc    Delete group
 * @access  Private (Instructor only)
 */
router.delete('/:id', authenticate, authorize('instructor'), groupController.deleteGroup);

/**
 * @route   GET /api/groups/:id/members
 * @desc    Get group members
 * @access  Private
 */
router.get('/:id/members', authenticate, groupController.getGroupMembers);

/**
 * @route   POST /api/groups/:id/members
 * @desc    Add students to group
 * @access  Private (Instructor only)
 */
router.post('/:id/members', authenticate, authorize('instructor'), groupController.addGroupMembers);

/**
 * @route   DELETE /api/groups/:id/members/:studentId
 * @desc    Remove student from group
 * @access  Private (Instructor only)
 */
router.delete('/:id/members/:studentId', authenticate, authorize('instructor'), groupController.removeGroupMember);

module.exports = router;
