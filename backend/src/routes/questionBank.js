const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeInstructor } = require('../middleware/authorize');
const {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion
} = require('../controllers/questionBankController');

// All routes require authentication and instructor role

// Create question
router.post('/', authenticate, authorizeInstructor, createQuestion);

// Get questions with search and filter
router.get('/', authenticate, authorizeInstructor, getQuestions);

// Get single question
router.get('/:id', authenticate, authorizeInstructor, getQuestionById);

// Update question
router.put('/:id', authenticate, authorizeInstructor, updateQuestion);

// Delete question
router.delete('/:id', authenticate, authorizeInstructor, deleteQuestion);

module.exports = router;
