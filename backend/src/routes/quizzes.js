const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeInstructor } = require('../middleware/authorize');
const {
  createQuiz,
  getQuizzes,
  getQuizById,
  startQuiz,
  submitQuiz,
  gradeManual,
  getQuizAttempts
} = require('../controllers/quizController');

// Create quiz (Instructor only)
router.post('/courses/:courseId/quizzes', authenticate, authorizeInstructor, createQuiz);

// Get quizzes for a course
router.get('/courses/:courseId/quizzes', authenticate, getQuizzes);

// Get quiz detail with questions
router.get('/quizzes/:id', authenticate, getQuizById);

// Start quiz (Student only)
router.post('/quizzes/:id/start', authenticate, startQuiz);

// Submit quiz with auto-grading (Student only)
router.post('/quizzes/:id/submit', authenticate, submitQuiz);

// Manual grading for subjective questions (Instructor only)
router.put('/quizzes/:id/grade-manual', authenticate, authorizeInstructor, gradeManual);

// Get quiz attempts (Instructor only)
router.get('/quizzes/:id/attempts', authenticate, authorizeInstructor, getQuizAttempts);

module.exports = router;
