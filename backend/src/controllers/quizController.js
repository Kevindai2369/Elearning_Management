const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Quiz, QuizAttempt, Question, Course, Student, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Validation schema for creating a quiz
 */
const createQuizSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Title is required',
    'string.max': 'Title must not exceed 255 characters',
    'any.required': 'Title is required'
  }),
  description: Joi.string().trim().allow('', null).optional(),
  question_ids: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one question is required',
    'any.required': 'Question IDs are required',
    'string.guid': 'Each question ID must be a valid UUID'
  }),
  time_limit: Joi.number().integer().min(1).allow(null).optional().messages({
    'number.base': 'Time limit must be a number',
    'number.min': 'Time limit must be at least 1 minute'
  }),
  point_value: Joi.number().integer().min(0).required().messages({
    'number.base': 'Point value must be a number',
    'number.min': 'Point value must be at least 0',
    'any.required': 'Point value is required'
  }),
  passing_score: Joi.number().integer().min(0).required().messages({
    'number.base': 'Passing score must be a number',
    'number.min': 'Passing score must be at least 0',
    'any.required': 'Passing score is required'
  }),
  randomize_questions: Joi.boolean().default(false)
});

/**
 * Validation schema for starting a quiz
 */
const startQuizSchema = Joi.object({
  // No body required, just starting the quiz
});

/**
 * Validation schema for submitting a quiz
 */
const submitQuizSchema = Joi.object({
  answers: Joi.object().pattern(
    Joi.string().uuid(),
    Joi.alternatives().try(
      Joi.string(),
      Joi.number(),
      Joi.boolean(),
      Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number()))
    )
  ).required().messages({
    'any.required': 'Answers are required'
  })
});

/**
 * Validation schema for manual grading
 */
const gradeManualSchema = Joi.object({
  question_scores: Joi.object().pattern(
    Joi.string().uuid(),
    Joi.number().min(0)
  ).required().messages({
    'any.required': 'Question scores are required'
  })
});

/**
 * @desc    Create quiz with question selection
 * @route   POST /api/courses/:courseId/quizzes
 * @access  Private (Instructor only)
 */
const createQuiz = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Validate request body
  const { error, value } = createQuizSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Verify instructor owns the course
  if (course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to create quizzes for this course');
  }

  // Validate passing score doesn't exceed point value
  if (value.passing_score > value.point_value) {
    throw new ApiError(400, 'Passing score cannot exceed point value', 'VALIDATION_ERROR');
  }

  // Verify all questions exist and belong to the instructor
  const questions = await Question.findAll({
    where: {
      id: { [Op.in]: value.question_ids },
      instructor_id: req.user.id
    }
  });

  if (questions.length !== value.question_ids.length) {
    throw new ApiError(400, 'One or more question IDs are invalid or do not belong to you', 'VALIDATION_ERROR');
  }

  // Create quiz
  const quiz = await Quiz.create({
    course_id: courseId,
    ...value
  });

  res.status(201).json({
    success: true,
    data: quiz,
    message: 'Quiz created successfully'
  });
});

/**
 * @desc    Get quizzes for a course
 * @route   GET /api/courses/:courseId/quizzes
 * @access  Private
 */
const getQuizzes = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Get quizzes with pagination
  const { count, rows: quizzes } = await Quiz.findAndCountAll({
    where: { course_id: courseId },
    limit,
    offset,
    order: [['published_at', 'DESC']],
    attributes: ['id', 'course_id', 'title', 'description', 'time_limit', 'point_value', 'passing_score', 'randomize_questions', 'published_at', 'created_at']
  });

  res.status(200).json({
    success: true,
    data: {
      quizzes,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    }
  });
});

/**
 * @desc    Get quiz detail with questions
 * @route   GET /api/quizzes/:id
 * @access  Private
 */
const getQuizById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find quiz
  const quiz = await Quiz.findByPk(id);
  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  // Get questions
  const questions = await Question.findAll({
    where: {
      id: { [Op.in]: quiz.question_ids }
    },
    attributes: ['id', 'type', 'question_text', 'options', 'points']
    // Don't include correct_answer for students
  });

  // Randomize questions if enabled
  let orderedQuestions = questions;
  if (quiz.randomize_questions) {
    orderedQuestions = questions.sort(() => Math.random() - 0.5);
  }

  res.status(200).json({
    success: true,
    data: {
      ...quiz.toJSON(),
      questions: orderedQuestions
    }
  });
});

/**
 * @desc    Start quiz (create attempt)
 * @route   POST /api/quizzes/:id/start
 * @access  Private (Student only)
 */
const startQuiz = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if quiz exists
  const quiz = await Quiz.findByPk(id);
  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  // Find student record
  const student = await Student.findOne({
    where: { user_id: req.user.id }
  });

  if (!student) {
    throw ApiError.notFound('Student record not found');
  }

  // Check if student already has an active attempt
  const existingAttempt = await QuizAttempt.findOne({
    where: {
      quiz_id: id,
      student_id: student.id,
      submitted_at: null
    }
  });

  if (existingAttempt) {
    return res.status(200).json({
      success: true,
      data: existingAttempt,
      message: 'Quiz attempt already in progress'
    });
  }

  // Create new attempt
  const attempt = await QuizAttempt.create({
    quiz_id: id,
    student_id: student.id,
    answers: {}
  });

  res.status(201).json({
    success: true,
    data: attempt,
    message: 'Quiz started successfully'
  });
});

/**
 * @desc    Submit quiz with auto-grading
 * @route   POST /api/quizzes/:id/submit
 * @access  Private (Student only)
 */
const submitQuiz = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = submitQuizSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check if quiz exists
  const quiz = await Quiz.findByPk(id);
  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  // Find student record
  const student = await Student.findOne({
    where: { user_id: req.user.id }
  });

  if (!student) {
    throw ApiError.notFound('Student record not found');
  }

  // Find active attempt
  const attempt = await QuizAttempt.findOne({
    where: {
      quiz_id: id,
      student_id: student.id,
      submitted_at: null
    }
  });

  if (!attempt) {
    throw ApiError.notFound('No active quiz attempt found. Please start the quiz first.');
  }

  // Check time limit if set
  if (quiz.time_limit) {
    const elapsedMinutes = (new Date() - new Date(attempt.started_at)) / (1000 * 60);
    if (elapsedMinutes > quiz.time_limit) {
      throw new ApiError(400, 'Time limit exceeded', 'TIME_LIMIT_EXCEEDED');
    }
  }

  // Get questions with correct answers
  const questions = await Question.findAll({
    where: {
      id: { [Op.in]: quiz.question_ids }
    }
  });

  // Auto-grade objective questions
  let totalScore = 0;
  let hasSubjectiveQuestions = false;

  questions.forEach(question => {
    const studentAnswer = value.answers[question.id];
    
    if (question.type === 'essay' || question.type === 'short_answer') {
      hasSubjectiveQuestions = true;
      return; // Skip auto-grading for subjective questions
    }

    // Auto-grade objective questions
    if (question.correct_answer !== null && question.correct_answer !== undefined) {
      const correctAnswer = question.correct_answer;
      let isCorrect = false;

      if (Array.isArray(correctAnswer)) {
        // Multiple correct answers
        isCorrect = JSON.stringify(studentAnswer?.sort()) === JSON.stringify(correctAnswer.sort());
      } else {
        // Single correct answer
        isCorrect = studentAnswer === correctAnswer;
      }

      if (isCorrect) {
        totalScore += question.points;
      }
    }
  });

  // Update attempt
  await attempt.update({
    answers: value.answers,
    score: hasSubjectiveQuestions ? null : totalScore,
    submitted_at: new Date(),
    graded_at: hasSubjectiveQuestions ? null : new Date()
  });

  res.status(200).json({
    success: true,
    data: attempt,
    message: hasSubjectiveQuestions 
      ? 'Quiz submitted successfully. Waiting for manual grading of subjective questions.'
      : 'Quiz submitted and graded successfully'
  });
});

/**
 * @desc    Manual grading for subjective questions
 * @route   PUT /api/quizzes/:id/grade-manual
 * @access  Private (Instructor only)
 */
const gradeManual = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = gradeManualSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find attempt
  const attempt = await QuizAttempt.findByPk(id, {
    include: [{
      model: Quiz,
      as: 'quiz',
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'instructor_id']
      }]
    }]
  });

  if (!attempt) {
    throw ApiError.notFound('Quiz attempt not found');
  }

  // Verify instructor owns the course
  if (attempt.quiz.course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to grade this quiz');
  }

  // Get questions
  const questions = await Question.findAll({
    where: {
      id: { [Op.in]: attempt.quiz.question_ids }
    }
  });

  // Calculate total score
  let totalScore = attempt.score || 0;

  // Add manual scores for subjective questions
  Object.entries(value.question_scores).forEach(([questionId, score]) => {
    const question = questions.find(q => q.id === questionId);
    if (question && (question.type === 'essay' || question.type === 'short_answer')) {
      totalScore += score;
    }
  });

  // Update attempt with final score
  await attempt.update({
    score: totalScore,
    graded_at: new Date()
  });

  res.status(200).json({
    success: true,
    data: attempt,
    message: 'Quiz graded successfully'
  });
});

/**
 * @desc    Get quiz attempts (Instructor view)
 * @route   GET /api/quizzes/:id/attempts
 * @access  Private (Instructor only)
 */
const getQuizAttempts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Check if quiz exists
  const quiz = await Quiz.findByPk(id, {
    include: [{
      model: Course,
      as: 'course',
      attributes: ['id', 'instructor_id']
    }]
  });

  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  // Verify instructor owns the course
  if (quiz.course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to view attempts for this quiz');
  }

  // Get attempts with pagination
  const { count, rows: attempts } = await QuizAttempt.findAndCountAll({
    where: { quiz_id: id },
    limit,
    offset,
    order: [['started_at', 'DESC']],
    include: [{
      model: Student,
      as: 'student',
      attributes: ['id', 'student_code'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    }]
  });

  res.status(200).json({
    success: true,
    data: {
      attempts,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    }
  });
});

module.exports = {
  createQuiz,
  getQuizzes,
  getQuizById,
  startQuiz,
  submitQuiz,
  gradeManual,
  getQuizAttempts
};
