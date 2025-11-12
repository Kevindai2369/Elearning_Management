const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createThread,
  getThreads,
  getThreadById,
  createReply,
  updateThread,
  deleteThread,
  updateReply,
  deleteReply
} = require('../controllers/forumController');

// Create forum thread
router.post('/courses/:courseId/forum', authenticate, createThread);

// Get forum threads with pagination and search
router.get('/courses/:courseId/forum', authenticate, getThreads);

// Get thread detail with nested replies
router.get('/forum/:threadId', authenticate, getThreadById);

// Add reply to thread
router.post('/forum/:threadId/reply', authenticate, createReply);

// Update thread (Author only)
router.put('/forum/:threadId', authenticate, updateThread);

// Delete thread (Author or Instructor only)
router.delete('/forum/:threadId', authenticate, deleteThread);

// Update reply (Author only)
router.put('/forum/reply/:replyId', authenticate, updateReply);

// Delete reply (Author or Instructor only)
router.delete('/forum/reply/:replyId', authenticate, deleteReply);

module.exports = router;
